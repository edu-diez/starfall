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
    sessionId = "";
    /** Safe public identifier only; credentials and account records remain private. */
    accountId = "";
    name = "";
    color = "#FF0000";
    state = shared_1.PlayerState.Alive;
    x = 0;
    y = 0;
    lastInputTimestamp = 0;
    ready = false;
    meetingsUsed = 0;
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
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastInputTimestamp", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "ready", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "meetingsUsed", void 0);
class GameRoomState extends schema_1.Schema {
    players = new schema_1.MapSchema();
    phase = shared_1.GamePhase.Lobby;
    matchStartTime = 0;
    meetingEndTime = 0;
    voteDeadline = 0;
    voteResultsEndTime = 0;
    voteSubmitted = new schema_1.MapSchema();
    voteTotals = new schema_1.MapSchema();
    abstainVotes = 0;
    ejectedPlayerId = null;
    ejectedPlayerRole = null;
    winner = null;
    endReason = null;
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
