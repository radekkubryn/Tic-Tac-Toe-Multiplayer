from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import json
import random
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... (rest of code) ...

class ConnectionManager:
    def __init__(self):
        # game_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # game_id -> GameState
        self.games: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)

    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
                # Optional: Clean up game state if no one is connected
                # del self.games[game_id]

    async def broadcast(self, message: dict, game_id: str):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                await connection.send_json(message)

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
        "players": {}, # socket -> role? Or just rely on client side role?
                       # Better: Store Player X and Player O availability
        "x_taken": False,
        "o_taken": False
    }

# --- Routes ---

class CreateGameResponse(BaseModel):
    gameId: str

@app.post("/create", response_model=CreateGameResponse)
async def create_game():
    game_id = str(uuid.uuid4())[:5].upper()
    manager.games[game_id] = create_initial_game_state()
    print(f"Game created: {game_id}")
    return {"gameId": game_id}

@app.get("/game/{game_id}")
async def get_game(game_id: str):
    if game_id in manager.games:
        return manager.games[game_id]
    return {"error": "Game not found"}

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(websocket, game_id)
    
    # Initialize game if not exists (handling edge case of direct join without create, though frontend prevents it)
    if game_id not in manager.games:
         manager.games[game_id] = create_initial_game_state()
    
    game = manager.games[game_id]
    
    # Assign Role logic (Simple version: First come X, second O)
    # real robust logic involves session tokens, but for now:
    # Use queries or just let client claim.
    # Let's simple handle: Send current state on connect.
    
    await websocket.send_json({
        "type": "STATE_UPDATE",
        "payload": game
    })

    try:
        while True:
            data = await websocket.receive_json()
            # data = { "type": "MAKE_MOVE", "index": 0, "player": "X" }
            
            if data['type'] == 'MAKE_MOVE':
                index = data['index']
                player = data['player']
                
                # server-side validation
                if game['winner']:
                    continue
                if game['currentPlayer'] != player:
                    continue
                if game['board'][index] is not None:
                    continue
                    
                # Update State
                game['board'][index] = player
                winner, line = calculate_winner(game['board'])
                
                game['winner'] = winner
                game['winningLine'] = line
                if not winner:
                    game['currentPlayer'] = 'O' if player == 'X' else 'X'
                
                # Broadcast
                await manager.broadcast({
                    "type": "STATE_UPDATE",
                    "payload": game
                }, game_id)
            
            elif data['type'] == 'RESET_GAME':
                game['board'] = [None] * 9
                game['currentPlayer'] = 'X'
                game['winner'] = None
                game['winningLine'] = None
                await manager.broadcast({
                    "type": "STATE_UPDATE",
                    "payload": game
                }, game_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)
        # Notify others?

# Serve React App
# Mount static files if directory exists (in Docker it will)
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
