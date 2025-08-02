// VNC Connection Test Script
// This script tests the VNC connection independently of the LiveKit service

interface VNCMessage {
  action: string;
  selector?: string;
  text?: string;
  url?: string;
  x?: number;
  y?: number;
  key?: string;
  waitTime?: number;
  timestamp: number;
}

class VNCTester {
  private websocket: WebSocket | null = null;
  private statusElement: HTMLElement;

  constructor() {
    this.statusElement = document.getElementById('status')!;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    document.getElementById('connect-btn')!.addEventListener('click', () => {
      this.connectToVNC();
    });

    document.getElementById('navigate-btn')!.addEventListener('click', () => {
      this.sendNavigateCommand();
    });

    document.getElementById('disconnect-btn')!.addEventListener('click', () => {
      this.disconnectFromVNC();
    });
  }

  private updateStatus(message: string) {
    console.log(`[VNC Test] ${message}`);
    this.statusElement.innerHTML += `<p>${new Date().toLocaleTimeString()}: ${message}</p>`;
  }

  private connectToVNC() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.updateStatus('Already connected to VNC');
      return;
    }

    this.updateStatus('Attempting to connect to VNC at ws://localhost:8765...');

    try {
      this.websocket = new WebSocket('ws://localhost:8765');

      this.websocket.onopen = () => {
        this.updateStatus('✅ Successfully connected to VNC WebSocket');
      };

      this.websocket.onclose = (event) => {
        this.updateStatus(`❌ VNC WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.websocket = null;
      };

      this.websocket.onerror = (error) => {
        this.updateStatus(`❌ VNC WebSocket error: ${error}`);
        console.error('VNC WebSocket error:', error);
      };

      this.websocket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          this.updateStatus(`📨 Received VNC response: ${JSON.stringify(response)}`);
        } catch (error) {
          this.updateStatus(`📨 Received VNC message (raw): ${event.data}`);
        }
      };

    } catch (error) {
      this.updateStatus(`❌ Failed to create WebSocket connection: ${error}`);
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private sendNavigateCommand() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.updateStatus('❌ Cannot send command: VNC not connected');
      return;
    }

    const message: VNCMessage = {
      action: 'navigate',
      url: 'https://jupyter.org/try-jupyter/lab/',
      timestamp: Date.now()
    };

    try {
      this.websocket.send(JSON.stringify(message));
      this.updateStatus(`📤 Sent navigate command: ${JSON.stringify(message)}`);
    } catch (error) {
      this.updateStatus(`❌ Failed to send navigate command: ${error}`);
      console.error('Failed to send navigate command:', error);
    }
  }

  private disconnectFromVNC() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.updateStatus('🔌 Disconnected from VNC');
    } else {
      this.updateStatus('Already disconnected from VNC');
    }
  }
}

// Initialize the tester when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VNCTester();
});
