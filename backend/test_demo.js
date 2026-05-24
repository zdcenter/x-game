const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/api/v1/ws/join/PK-TEST?playerId=demo&mode=pk_steal');

ws.on('open', () => {
    console.log('Connected as demo');
    // Wait a bit for initialization
    setTimeout(() => {
        const payload = JSON.stringify({ type: 'reveal', x: 2, y: 2 });
        console.log('Sending:', payload);
        ws.send(payload);
    }, 1000);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'gameState') {
        console.log('Received gameState, board status:', msg.state.board.status);
    } else {
        console.log('Received:', data.toString());
    }
});

ws.on('error', (err) => console.error(err));
