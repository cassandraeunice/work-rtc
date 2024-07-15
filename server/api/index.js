const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;

const express = require("express");
const path = require("path");

const HTTPS_PORT = 8443;

const serverConfig = {
  key: fs.readFileSync("../key.pem"),
  cert: fs.readFileSync("../cert.pem"),
};

// Create an instance of express
const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Start the HTTPS Server
try {
  const server = https.createServer(serverConfig, app);

  server.listen(HTTPS_PORT, "0.0.0.0");
  console.log(`Server running. Visit https://localhost:${HTTPS_PORT} in Firefox/Chrome/Safari.\n`);

  // Start the WebSocket Server
  const wss = new WebSocketServer({ server: server });

  // Handle meeting id requests
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
} catch (error) {
  console.error(error);
}

module.exports = app;
