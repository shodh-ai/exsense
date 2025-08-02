// VNC Connection Test Script (Plain JavaScript)
// This script tests the VNC connection independently of the LiveKit service

class VNCTester {
  constructor() {
    this.websocket = null;
    this.statusElement = document.getElementById('status');
    this.setupEventListeners();
    console.log('[VNC Test] VNCTester initialized');
  }

  setupEventListeners() {
    console.log('[VNC Test] Setting up event listeners');
    
    const connectBtn = document.getElementById('connect-btn');
    const navigateBtn = document.getElementById('navigate-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        console.log('[VNC Test] Connect button clicked');
        this.connectToVNC();
      });
    } else {
      console.error('[VNC Test] Connect button not found');
    }

    if (navigateBtn) {
      navigateBtn.addEventListener('click', () => {
        console.log('[VNC Test] Navigate button clicked');
        this.sendNavigateCommand();
      });
    } else {
      console.error('[VNC Test] Navigate button not found');
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        console.log('[VNC Test] Disconnect button clicked');
        this.disconnectFromVNC();
      });
    } else {
      console.error('[VNC Test] Disconnect button not found');
    }
  }

  updateStatus(message) {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `${timestamp}: ${message}`;
    console.log(`[VNC Test] ${fullMessage}`);
    
    if (this.statusElement) {
      this.statusElement.innerHTML += `<p>${fullMessage}</p>`;
      this.statusElement.scrollTop = this.statusElement.scrollHeight;
    } else {
      console.error('[VNC Test] Status element not found');
    }
  }

  connectToVNC() {
    console.log('[VNC Test] connectToVNC() called');
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.updateStatus('Already connected to VNC');
      return;
    }

    this.updateStatus('Attempting to connect to VNC at ws://localhost:8765...');
    console.log('[VNC Test] Creating WebSocket connection to ws://localhost:8765');

    try {
      this.websocket = new WebSocket('ws://localhost:8765');
      console.log('[VNC Test] WebSocket object created:', this.websocket);

      this.websocket.onopen = (event) => {
        console.log('[VNC Test] WebSocket onopen event:', event);
        this.updateStatus('✅ Successfully connected to VNC WebSocket');
      };

      this.websocket.onclose = (event) => {
        console.log('[VNC Test] WebSocket onclose event:', event);
        this.updateStatus(`❌ VNC WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.websocket = null;
      };

      this.websocket.onerror = (error) => {
        console.error('[VNC Test] WebSocket onerror event:', error);
        this.updateStatus(`❌ VNC WebSocket error: ${error}`);
      };

      this.websocket.onmessage = (event) => {
        console.log('[VNC Test] WebSocket onmessage event:', event);
        try {
          const response = JSON.parse(event.data);
          console.log('[VNC Test] Parsed response:', response);
          this.updateStatus(`📨 Received VNC response: ${JSON.stringify(response)}`);
        } catch (error) {
          console.log('[VNC Test] Raw message (not JSON):', event.data);
          this.updateStatus(`📨 Received VNC message (raw): ${event.data}`);
        }
      };

    } catch (error) {
      console.error('[VNC Test] Exception creating WebSocket:', error);
      this.updateStatus(`❌ Failed to create WebSocket connection: ${error}`);
    }
  }

  sendNavigateCommand() {
    console.log('[VNC Test] sendNavigateCommand() called');
    
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('[VNC Test] WebSocket not ready. State:', this.websocket ? this.websocket.readyState : 'null');
      this.updateStatus('❌ Cannot send command: VNC not connected');
      return;
    }

    const message = {
      action: 'navigate',
      url: 'https://jupyter.org/try-jupyter/lab/',
      timestamp: Date.now()
    };

    console.log('[VNC Test] Sending message:', message);

    try {
      const messageStr = JSON.stringify(message);
      console.log('[VNC Test] Message string:', messageStr);
      this.websocket.send(messageStr);
      this.updateStatus(`📤 Sent navigate command: ${messageStr}`);
    } catch (error) {
      console.error('[VNC Test] Exception sending message:', error);
      this.updateStatus(`❌ Failed to send navigate command: ${error}`);
    }
  }

  disconnectFromVNC() {
    console.log('[VNC Test] disconnectFromVNC() called');
    
    if (this.websocket) {
      console.log('[VNC Test] Closing WebSocket connection');
      this.websocket.close();
      this.websocket = null;
      this.updateStatus('🔌 Disconnected from VNC');
    } else {
      console.log('[VNC Test] No WebSocket to disconnect');
      this.updateStatus('Already disconnected from VNC');
    }
  }
}

// Initialize the tester when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('[VNC Test] DOM loaded, initializing VNCTester');
  window.vncTester = new VNCTester();
});

// Also try to initialize immediately in case DOM is already loaded
if (document.readyState === 'loading') {
  console.log('[VNC Test] Document still loading, waiting for DOMContentLoaded');
} else {
  console.log('[VNC Test] Document already loaded, initializing VNCTester immediately');
  window.vncTester = new VNCTester();
}
