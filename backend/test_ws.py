import asyncio
import websockets
import json
import uuid

async def test_game():
    uri = "ws://localhost:8000/ws"
    
    # 1. Create Game to get ID
    # We can't create via WS, need HTTP. But let's assume valid ID generation or just use a fixed one if server allows.
    # The server creates game on POST /create. 
    # Actually, main.py allows "Initialize game if not exists" in websocket_endpoint?
    # Let's check main.py again.
    # Yes: if game_id not in manager.games: manager.games[game_id] = create_initial_game_state()
    
    game_id = "TEST1"
    ws_url = f"{uri}/{game_id}"
    
    print(f"Connecting Player 1 to {ws_url}")
    async with websockets.connect(ws_url) as ws1:
        msg1 = json.loads(await ws1.recv())
        print(f"P1 Initial State: {msg1}")
        
        print(f"Connecting Player 2 to {ws_url}")
        async with websockets.connect(ws_url) as ws2:
            msg2 = json.loads(await ws2.recv())
            print(f"P2 Initial State: {msg2}")
            
            # P1 receives update about P2 joining?
            update_p1 = json.loads(await ws1.recv())
            print(f"P1 Update (Join): {update_p1}")
            
            # Try to make a move as X (assuming P1 is X? The server doesn't assign roles tightly but frontend assumes it)
            # Frontend Logic: Player checks if currentPlayer == playerRole.
            # But wait, how does frontend know its role?
            # App.tsx: const [playerRole, setPlayerRole] = useState<Player>('X');
            # It seems role is determined by who creates? Or url param?
            # HomeScreen.tsx: sends playerRole via prop or route?
            # If I join, I am O?
            
            # Let's simulate P1 moving as X
            print("P1 moving at index 0 as X")
            await ws1.send(json.dumps({
                "type": "MAKE_MOVE",
                "index": 0,
                "player": "X"
            }))
            
            resp1 = json.loads(await ws1.recv())
            print(f"P1 Move Response: {resp1}")
            
            resp2 = json.loads(await ws2.recv())
            print(f"P2 Move Response: {resp2}")
            
            # P2 moving as O
            print("P2 moving at index 1 as O")
            await ws2.send(json.dumps({
                "type": "MAKE_MOVE",
                "index": 1,
                "player": "O"
            }))
            
            resp1_2 = json.loads(await ws1.recv())
            print(f"P1 Move 2 Response: {resp1_2}")
            resp2_2 = json.loads(await ws2.recv())
            print(f"P2 Move 2 Response: {resp2_2}")

asyncio.run(test_game())
