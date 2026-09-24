"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_transport_1 = require("@colyseus/ws-transport");
const colyseus_1 = require("colyseus");
const monitor_1 = require("@colyseus/monitor");
const GameRoom_1 = require("./rooms/GameRoom");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = Number(process.env.PORT) || 2567;
const app = (0, express_1.default)();
app.use(express_1.default.json());
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: (0, http_1.createServer)(app),
    }),
});
gameServer.define("game", GameRoom_1.GameRoom);
app.use("/colyseus", (0, monitor_1.monitor)());
gameServer.listen(PORT);
console.log(`Server listening on ws://localhost:${PORT}`);
