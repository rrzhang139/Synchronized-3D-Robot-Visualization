export class TerminalLogger {
  private static viteWs: WebSocket | null = null;

  public static init(): void {
    const wsUrl = import.meta.env.DEV 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/__vite_hmr`
      : null;
    
    if (wsUrl) {
      this.viteWs = new WebSocket(wsUrl);
      
      this.viteWs.onopen = () => console.log('Terminal logger connected');
      this.viteWs.onerror = (e) => console.error('Terminal logger error:', e);
    }
  }

  public static log(message: string, ...data: any[]): void {
    if (this.viteWs && this.viteWs.readyState === WebSocket.OPEN) {
      this.viteWs.send(JSON.stringify({
        type: 'custom:log',
        data: [message, ...data]
      }));
    }
  }

  public static error(error: Error | string): void {
    if (this.viteWs && this.viteWs.readyState === WebSocket.OPEN) {
      this.viteWs.send(JSON.stringify({
        type: 'error',
        err: error instanceof Error ? error.stack || error.message : error
      }));
    }
  }
} 