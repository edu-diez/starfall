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
const AccountService_1 = require("./services/AccountService");
const PersistenceService_1 = require("./services/PersistenceService");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configuredPort = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
}
const PORT = configuredPort;
const isProduction = process.env.NODE_ENV === "production";
const accountService = new AccountService_1.LocalAccountService(new PersistenceService_1.JsonFilePersistenceService(process.env.ACCOUNT_STORE_PATH || ".starfall/accounts.json"));
GameRoom_1.GameRoom.configureAccountService(accountService);
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use(express_1.default.json({ limit: "4kb" }));
app.get("/api/account", async (request, response, next) => {
    try {
        const result = await accountService.resolveAccount(readCookie(request.headers.cookie, "starfall_account"));
        if (result.credential) {
            response.cookie("starfall_account", result.credential, {
                httpOnly: true,
                sameSite: "lax",
                secure: isProduction,
                path: "/",
            });
        }
        response.json({ profile: result.account });
    }
    catch (error) {
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
        const profile = await accountService.updateProfile(resolved.account.id, request.body);
        response.json({ profile });
    }
    catch (error) {
        if (error instanceof AccountService_1.AccountValidationError) {
            response.status(400).json({ message: error.message });
            return;
        }
        if (error instanceof AccountService_1.AccountNotFoundError) {
            response.status(404).json({ message: "Account not found" });
            return;
        }
        next(error);
    }
});
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: (0, http_1.createServer)(app),
    }),
});
gameServer.define("game", GameRoom_1.GameRoom);
if (!isProduction || process.env.ENABLE_COLYSEUS_MONITOR === "true") {
    app.use("/colyseus", (0, monitor_1.monitor)());
}
app.use((error, _request, response, _next) => {
    console.error("Request failed", error instanceof Error ? error.message : "unknown error");
    response.status(500).json({ message: "Internal server error" });
});
gameServer.listen(PORT);
console.log(`Server listening on ws://localhost:${PORT}`);
function readCookie(cookieHeader, name) {
    if (!cookieHeader)
        return undefined;
    return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${name}=`))
        ?.slice(name.length + 1);
}
