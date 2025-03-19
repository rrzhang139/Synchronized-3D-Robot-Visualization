import type { Plugin } from 'vite';

export default function errorLoggerPlugin(): Plugin {
  return {
    name: 'error-logger',
    configureServer(server) {
      server.ws.on('connection', (socket) => {
        socket.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'error') {
              console.error('\x1b[31m%s\x1b[0m', '🔴 Browser Error:');
              console.error(message.err);
            }
            if (message.type === 'custom:log') {
              console.log('\x1b[36m%s\x1b[0m', '🔵 Browser Log:', message.data);
            }
          } catch (e) {
            console.log(e)
          }
        });
      });
    }
  };
} 