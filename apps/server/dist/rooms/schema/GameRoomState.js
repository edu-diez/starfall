"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomState = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
const shared_1 = require("@starfall/shared");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        /** Safe public identifier only; credentials and account records remain private. */
        this.accountId = "";
        this.name = "";
        this.color = "#FF0000";
        this.state = shared_1.PlayerState.Alive;
        this.x = 0;
        this.y = 0;
        this.ready = false;
        /** False only while the authenticated owner is within a reconnect grace window. */
        this.isConnected = true;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "accountId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "state", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "ready", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isConnected", void 0);
class GameRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.phase = shared_1.GamePhase.Lobby;
        this.matchStartTime = 0;
        this.meetingEndTime = 0;
        this.voteDeadline = 0;
        this.voteResultsEndTime = 0;
        this.voteSubmitted = new schema_1.MapSchema();
        this.voteTotals = new schema_1.MapSchema();
        this.abstainVotes = 0;
        this.ejectedPlayerId = null;
        this.ejectedPlayerRole = null;
        this.winner = null;
        this.endReason = null;
    }
    createPlayer(sessionId, accountId, name, color) {
        const player = new Player();
        player.sessionId = sessionId;
        player.accountId = accountId;
        player.name = name;
        player.color = color;
        player.x = 960; // Center of map
        player.y = 540;
        player.state = shared_1.PlayerState.Alive;
        player.ready = false;
        player.isConnected = true;
        return player;
    }
}
exports.GameRoomState = GameRoomState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], GameRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameRoomState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "matchStartTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "meetingEndTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "voteDeadline", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "voteResultsEndTime", void 0);
__decorate([
    (0, schema_1.type)({ map: "boolean" }),
    __metadata("design:type", Object)
], GameRoomState.prototype, "voteSubmitted", void 0);
__decorate([
    (0, schema_1.type)({ map: "number" }),
    __metadata("design:type", Object)
], GameRoomState.prototype, "voteTotals", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "abstainVotes", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], GameRoomState.prototype, "ejectedPlayerId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], GameRoomState.prototype, "ejectedPlayerRole", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], GameRoomState.prototype, "winner", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], GameRoomState.prototype, "endReason", void 0);
