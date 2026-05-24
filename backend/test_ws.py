import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:3001/api/v1/ws/join/test_room?playerId=demo&mode=pk_steal"
    async with websockets.connect(uri) as websocket:
        # Wait for initial state
        msg = await websocket.recv()
        print("Initial state:", msg[:200])
        
        # Send a reveal action
        action = {"type": "reveal", "x": 0, "y": 0}
        await websocket.send(json.dumps(action))
        print("Sent action")
        
        # Receive response
        msg = await websocket.recv()
        print("Response:", msg[:200])

asyncio.get_event_loop().run_until_complete(test())
