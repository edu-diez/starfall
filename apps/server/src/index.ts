import express from "express";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 2567;
const app = express();

app.use(express.json());

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app),
  }),
});

gameServer.define("game", GameRoom);

app.use("/colyseus", monitor());

gameServer.listen(PORT);
console.log(`Server listening on ws://localhost:${PORT}`);