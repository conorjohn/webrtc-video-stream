const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

let idGlobal = 1;
const clientMapGlobal = {};
wss.on('connection', function connection(ws, req) {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.req === 'register') {
      clientMapGlobal[idGlobal] = {id: idGlobal, ws};
      ws.send(JSON.stringify({req: 'register', id: idGlobal}));
      idGlobal ++;
    }
    else if (data.to && clientMapGlobal[data.to]) {
      clientMapGlobal[data.to].ws.send(message);
    }
  });
  ws.on('close', () => {
    const idLocal = Object.keys(clientMapGlobal).find(v => {
      return clientMapGlobal[v].ws === ws;
    });
    if (idLocal) delete clientMapGlobal[idLocal];
  });
});
server.listen(8080);