import express from "express";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";
import {
  AccountNotFoundError,
  AccountValidationError,
  LocalAccountService,
} from "./services/AccountService";
import { JsonFilePersistenceService } from "./services/PersistenceService";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 2567;
const accountService = new LocalAccountService(
  new JsonFilePersistenceService(
    process.env.ACCOUNT_STORE_PATH || ".starfall/accounts.json",
  ),
);
GameRoom.configureAccountService(accountService);
const app = express();

app.use(express.json());

app.get("/api/account", async (request, response, next) => {
  try {
    const result = await accountService.resolveAccount(
      readCookie(request.headers.cookie, "starfall_account"),
    );
    if (result.credential) {
      response.cookie("starfall_account", result.credential, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    response.json({ profile: result.account });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/account", async (request, response, next) => {
  try {
    const credential = readCookie(request.headers.cookie, "starfall_account");
    const resolved = await accountService.resolveAccount(credential);
    if (resolved.credential) {
      response.status(401).json({ message: "Account credential is required" });
      return;
    }
    const profile = await accountService.updateProfile(
      resolved.account.id,
      request.body,
    );
    response.json({ profile });
  } catch (error) {
    if (error instanceof AccountValidationError) {
      response.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof AccountNotFoundError) {
      response.status(404).json({ message: "Account not found" });
      return;
    }
    next(error);
  }
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app),
  }),
});

gameServer.define("game", GameRoom);

app.use("/colyseus", monitor());

gameServer.listen(PORT);
console.log(`Server listening on ws://localhost:${PORT}`);

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
