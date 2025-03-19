
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private url: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatusElement: HTMLElement | null;

  constructor(url: string) {
    this.url = url;
    this.connectionStatusElement = document.getElementById('connection-status');
    this.connect();
  }

  private connect(): void {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.updateConnectionStatus('Connected');
        console.log('WebSocket connection established');
        
        if (this.reconnectTimer !== null) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'message';
          if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach((callback) => {
              callback(data);
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected - Reconnecting...');
        console.log('WebSocket connection closed. Attempting to reconnect...');
        
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.socket?.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.updateConnectionStatus('Connection Failed');
      
      this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
    }
  }

  private updateConnectionStatus(status: string): void {
    if (this.connectionStatusElement) {
      this.connectionStatusElement.textContent = `WebSocket: ${status}`;
    }
  }

  public on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
  }

  public send(data: any): void {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
