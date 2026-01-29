from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import json
import random
import os
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    response.headers["X-Backend"] = "FastAPI"
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.4f}s")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.games: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)
        
        if game_id in self.games and len(self.active_connections[game_id]) >= 2:
            self.games[game_id]['playerJoined'] = True
            await self.broadcast({
                "type": "STATE_UPDATE",
                "payload": self.games[game_id]
            }, game_id)

    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast(self, message: dict, game_id: str):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {e}")

manager = ConnectionManager()

# --- Game Logic Helpers ---

def calculate_winner(board):
    lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ]
    for a, b, c in lines:
        if board[a] and board[a] == board[b] and board[a] == board[c]:
            return board[a], [a, b, c]
    if all(cell is not None for cell in board):
        return "draw", None
    return None, None

def create_initial_game_state():
    return {
        "board": [None] * 9,
        "currentPlayer": "X",
        "winner": None,
        "winningLine": None,
        "playerJoined": False,
        "scores": {"X": 0, "O": 0},
        "rematchRequests": {"X": False, "O": False}
    }

# --- API Router ---
api_router = APIRouter(prefix="/api")

class CreateGameResponse(BaseModel):
    gameId: str

@api_router.post("/create", response_model=CreateGameResponse)
async def create_game():
    game_id = str(uuid.uuid4())[:5].upper()
    manager.games[game_id] = create_initial_game_state()
    logger.info(f"Game created: {game_id}")
    return {"gameId": game_id}

@api_router.get("/game/{game_id}")
async def get_game(game_id: str):
    logger.info(f"Fetching game: {game_id}")
    if game_id in manager.games:
        return manager.games[game_id]
    return {"error": "Game not found"}

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "backend": "FastAPI"}

app.include_router(api_router)

# --- WebSocket ---
@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(websocket, game_id)
    
    if game_id not in manager.games:
         manager.games[game_id] = create_initial_game_state()
    
    if len(manager.active_connections.get(game_id, [])) >= 2:
        manager.games[game_id]['playerJoined'] = True

    game = manager.games[game_id]
    
    await websocket.send_json({
        "type": "STATE_UPDATE",
        "payload": game
    })

    try:
        while True:
            data = await websocket.receive_json()
            
            if data['type'] == 'MAKE_MOVE':
                index = data['index']
                player = data['player']
                
                if game['winner']:
                    continue
                if game['currentPlayer'] != player:
                    continue
                if game['board'][index] is not None:
                     continue
                    
                game['board'][index] = player
                winner, line = calculate_winner(game['board'])
                
                game['winner'] = winner
                game['winningLine'] = line
                
                if winner and winner != 'draw':
                    game['scores'][winner] += 1
                
                if not winner:
                    game['currentPlayer'] = 'O' if player == 'X' else 'X'
                
                await manager.broadcast({
                    "type": "STATE_UPDATE",
                    "payload": game
                }, game_id)
            
            elif data['type'] == 'REQUEST_REMATCH':
                player = data['player']
                game['rematchRequests'][player] = True
                await manager.broadcast({ "type": "STATE_UPDATE", "payload": game }, game_id)
                if game['rematchRequests']['X'] and game['rematchRequests']['O']:
                    game['board'] = [None] * 9
                    game['currentPlayer'] = 'X'
                    game['winner'] = None
                    game['winningLine'] = None
                    game['rematchRequests'] = {'X': False, 'O': False}
                    await manager.broadcast({ "type": "STATE_UPDATE", "payload": game }, game_id)

            elif data['type'] == 'DECLINE_REMATCH':
                 await manager.broadcast({ "type": "REMATCH_DECLINED", "payload": {} }, game_id)
                 
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

# --- Static Files ---
if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(request: Request, full_path: str):
    # Skip API and WS paths
    if full_path.startswith("api") or full_path.startswith("ws"):
        return {"error": "Not Found"}

    static_file = os.path.join("static", full_path)
    if os.path.isfile(static_file):
        return FileResponse(static_file)
    
    index_file = os.path.join("static", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    return {"error": "Not Found"}
