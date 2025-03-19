import { RobotVisualization } from './robotVisualization';
import { WebSocketClient } from './webSocketClient';
import { TerminalLogger } from './utils/terminalLogger';

TerminalLogger.init();

TerminalLogger.log('Application starting...');

window.addEventListener('error', (event) => {
  TerminalLogger.error(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  TerminalLogger.error(event.reason);
});

try {
  const wsClient = new WebSocketClient('wss://0.0.0.0:8000/ws');
  
  const visualization = new RobotVisualization(
    document.getElementById('app') as HTMLElement,
    wsClient
  );

  visualization.start();
  
  TerminalLogger.log('Application initialized successfully');
} catch (error) {
  TerminalLogger.error(error as Error);
}
