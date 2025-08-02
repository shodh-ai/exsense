document.addEventListener('DOMContentLoaded', () => {
    const vncUrl = 'ws://localhost:8000';
    let ws = null;

    console.log('Attempting to connect to VNC listener at:', vncUrl);

    ws = new WebSocket(vncUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket connection established.');
    };

    ws.onmessage = (event) => {
        console.log('✅ Received response:', JSON.parse(event.data));
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed.');
    };

    const testButton = document.getElementById('test-rpc-button');
    if (testButton) {
        testButton.addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('Simulating BROWSER_NAVIGATE RPC call...');
                const message = {
                    action: 'navigate',
                    url: 'https://www.google.com',
                    timestamp: Date.now()
                };
                ws.send(JSON.stringify(message));
                console.log('Sent message:', message);
            } else {
                console.error('❌ Cannot send message, WebSocket is not open.');
            }
        });
    }
});
