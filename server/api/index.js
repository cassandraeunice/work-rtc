const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;

const HTTPS_PORT = 8443;

try {
  const wss = new WebSocketServer({ port: HTTPS_PORT });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      console.log(`received: ${message}`);
      wss.broadcast(message);
    });
  });

  wss.broadcast = function (data) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: false });
      }
    });
  };

  console.log(`WebSocket server running at ws://localhost:${HTTPS_PORT}`);
} catch (error) {
  console.error(error);
}
