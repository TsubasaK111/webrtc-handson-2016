"use strict";

const WebSocketServer = require('ws').Server;
const port = process.env.PORT || 3001;
const wsServer = new WebSocketServer({ port: port });

wsServer.on('connection', (ws) => {
  console.log('-- websocket connected --');
  ws.on('message', (message) => {
    wsServer.clients.forEach(function each(client) {
      if (isSame(ws, client)) {
        console.log('- skip sender -');
      }
      else {
        client.send(message);
      }
    });
  });
});

const isSame = (ws1, ws2) => {
  // -- compare object --
  return (ws1 === ws2);
}

console.log('websocket server start. port=' + port);
