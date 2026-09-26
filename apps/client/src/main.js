import { Client } from "colyseus.js";
import { GamePhase, PlayerRole, PlayerState, GAME_CONFIG, MESSAGE_TYPES, COLORS, STARFALL_MAP, } from "@starfall/shared";
import { getAvailableActions, PlayerInputController, } from "./input/InputController";
import { DesktopInputAdapter, } from "./input/DesktopInputAdapter";
import { TouchInputAdapter } from "./input/TouchInputAdapter";
import { AccountClient } from "./account/AccountClient";
// Game client class
class GameClient {
    client;
    room = null;
    canvas;
    ctx;
    connectionStatus;
    lobbyUI;
    joinBtn;
    playerNameInput;
    profileFeedback;
    accountClient = new AccountClient();
    accountProfile = null;
    playersContainer;
    playersList;
    mySessionId = null;
    myColor = "#FF0000";
    myReady = false;
    myRole = null;
    animationFrameId = null;
    colorPickerUI = null;
    readyBtn = null;
    startEligibilityEl = null;
    roleRevealUI = null;
    startMatchBtn = null;
    phaseUI = null;
    phaseTimer = null;
    ventUI = null;
    ventFeedback = null;
    actionControls = null;
    touchJoystick = null;
    isVenting = false;
    currentVentNodeId = null;
    connectedVentNodeIds = [];
    // Debug mode
    debugMode = false;
    // Input state
    inputController = new PlayerInputController();
    desktopInput = new DesktopInputAdapter(this.inputController, {
        onAction: (action) => this.handleDesktopAction(action),
    });
    touchInput = new TouchInputAdapter(this.inputController);
    lastSentInput = { x: 0, y: 0 };
    inputSendInterval = null;
    reconnecting = false;
    INPUT_SEND_RATE = 60; // Hz - match server tick rate
    constructor() {
        this.client = new Client("ws://localhost:2567");
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.connectionStatus = document.getElementById("connection-status");
        this.lobbyUI = document.getElementById("lobby-ui");
        this.joinBtn = document.getElementById("join-btn");
        this.playerNameInput = document.getElementById("player-name");
        this.profileFeedback = document.getElementById("profile-feedback");
        this.playersContainer = document.getElementById("players-container");
        this.playersList = document.getElementById("players-list");
        this.setupCanvas();
        this.setupEventListeners();
        void this.initializeAccount();
    }
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);
    }
    setupEventListeners() {
        this.playerNameInput.addEventListener("input", () => {
            this.joinBtn.disabled = this.playerNameInput.value.trim().length === 0;
        });
        this.joinBtn.addEventListener("click", () => {
            void this.saveProfileAndJoin();
        });
        this.playerNameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !this.joinBtn.disabled) {
                this.joinBtn.click();
            }
        });
        this.desktopInput.attach();
        this.createTouchControls();
        // Debug mode toggle (F3 key)
        window.addEventListener("keydown", (e) => {
            if (e.key === "F3") {
                this.debugMode = !this.debugMode;
                console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
            }
        });
    }
    async initializeAccount() {
        try {
            this.setProfileFeedback("Loading account…");
            this.accountProfile = await this.accountClient.loadProfile();
            this.playerNameInput.value = this.accountProfile.displayName;
            this.joinBtn.disabled = false;
            this.setProfileFeedback("Profile loaded. Choose a display name, then join.");
            await this.connect();
        }
        catch (error) {
            this.setProfileFeedback(error instanceof Error
                ? error.message
                : "Unable to initialize account.");
            this.updateConnectionStatus("Account setup failed", "status-error");
        }
    }
    async saveProfileAndJoin() {
        const displayName = this.playerNameInput.value.trim();
        if (!displayName || !this.room)
            return;
        this.joinBtn.disabled = true;
        this.setProfileFeedback("Saving profile…");
        try {
            this.accountProfile = await this.accountClient.updateProfile({
                displayName,
            });
            this.playerNameInput.value = this.accountProfile.displayName;
            this.room.send(MESSAGE_TYPES.JOIN, {});
            this.playerNameInput.disabled = true;
            this.setProfileFeedback("Profile saved.");
        }
        catch (error) {
            this.joinBtn.disabled = false;
            this.setProfileFeedback(error instanceof Error ? error.message : "Unable to save profile.");
        }
    }
    setProfileFeedback(message) {
        this.profileFeedback.textContent = message;
    }
    createColorPickerUI() {
        if (this.colorPickerUI)
            return;
        this.colorPickerUI = document.createElement("div");
        this.colorPickerUI.id = "color-picker";
        this.colorPickerUI.style.cssText = `
      margin-top: 24px;
      padding: 16px;
      background: #1f2937;
      border-radius: 8px;
      border: 1px solid #374151;
    `;
        const colors = COLORS;
        const colorButtons = colors.map((color) => {
            const btn = document.createElement("button");
            btn.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid transparent;
        background: ${color};
        cursor: pointer;
        margin: 4px;
        transition: transform 0.1s, border-color 0.1s;
      `;
            btn.dataset.color = color;
            btn.title = color;
            btn.addEventListener("click", () => this.requestColorChange(color));
            btn.addEventListener("mouseenter", () => {
                btn.style.transform = "scale(1.1)";
            });
            btn.addEventListener("mouseleave", () => {
                btn.style.transform = "scale(1)";
            });
            return btn;
        });
        this.colorPickerUI.innerHTML = `
      <h3 style="margin-bottom: 12px; font-size: 14px; color: #9ca3af;">Choose Color</h3>
      <div id="color-buttons" style="display: flex; flex-wrap: wrap; justify-content: center;"></div>
    `;
        const colorButtonsContainer = this.colorPickerUI.querySelector("#color-buttons");
        colorButtons.forEach((btn) => colorButtonsContainer.appendChild(btn));
        // Insert after players list
        this.playersList.appendChild(this.colorPickerUI);
    }
    updateColorPickerUI(availableColors) {
        if (!this.colorPickerUI)
            return;
        const buttons = this.colorPickerUI.querySelectorAll("button[data-color]");
        buttons.forEach((btn) => {
            const color = btn.dataset.color;
            const availability = availableColors.get(color);
            const isMyColor = color === this.myColor;
            if (availability?.available || isMyColor) {
                btn.style.borderColor = isMyColor ? "#3b82f6" : "transparent";
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                btn.disabled = false;
            }
            else {
                btn.style.borderColor = "#ef4444";
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
                btn.disabled = true;
            }
            // Highlight my color
            if (isMyColor) {
                btn.style.boxShadow = "0 0 0 2px #3b82f6";
            }
            else {
                btn.style.boxShadow = "none";
            }
        });
    }
    createReadyButton() {
        if (this.readyBtn)
            return;
        this.readyBtn = document.createElement("button");
        this.readyBtn.id = "ready-btn";
        this.readyBtn.textContent = "Ready";
        this.readyBtn.style.cssText = `
      width: 100%;
      padding: 12px 24px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    `;
        this.readyBtn.addEventListener("click", () => this.toggleReady());
        this.readyBtn.addEventListener("mouseenter", () => {
            this.readyBtn.style.background = this.myReady ? "#ef4444" : "#059669";
        });
        this.readyBtn.addEventListener("mouseleave", () => {
            this.readyBtn.style.background = this.myReady ? "#dc2626" : "#10b981";
        });
        this.startEligibilityEl = document.createElement("div");
        this.startEligibilityEl.id = "start-eligibility";
        this.startEligibilityEl.style.cssText = `
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
    `;
        this.playersList.appendChild(this.readyBtn);
        this.playersList.appendChild(this.startEligibilityEl);
    }
    createStartMatchButton() {
        if (this.startMatchBtn)
            return;
        this.startMatchBtn = document.createElement("button");
        this.startMatchBtn.id = "start-match-btn";
        this.startMatchBtn.textContent = "Start Match";
        this.startMatchBtn.style.cssText = `
      width: 100%;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
      display: none;
    `;
        this.startMatchBtn.addEventListener("click", () => this.requestMatchStart());
        this.startMatchBtn.addEventListener("mouseenter", () => {
            this.startMatchBtn.style.background = "#2563eb";
        });
        this.startMatchBtn.addEventListener("mouseleave", () => {
            this.startMatchBtn.style.background = "#3b82f6";
        });
        this.playersList.appendChild(this.startMatchBtn);
    }
    updateReadyButton(ready, canStart) {
        this.myReady = ready;
        if (!this.readyBtn || !this.startEligibilityEl)
            return;
        this.readyBtn.textContent = ready ? "Unready" : "Ready";
        this.readyBtn.style.background = ready ? "#dc2626" : "#10b981";
        if (canStart) {
            this.startEligibilityEl.textContent =
                "All players ready - Game can start!";
            this.startEligibilityEl.style.background = "rgba(16, 185, 129, 0.2)";
            this.startEligibilityEl.style.color = "#10b981";
            // Show start match button
            if (this.startMatchBtn) {
                this.startMatchBtn.style.display = "block";
            }
        }
        else {
            this.startEligibilityEl.textContent =
                "Waiting for all players to ready up...";
            this.startEligibilityEl.style.background = "rgba(245, 158, 11, 0.2)";
            this.startEligibilityEl.style.color = "#f59e0b";
            // Hide start match button
            if (this.startMatchBtn) {
                this.startMatchBtn.style.display = "none";
            }
        }
    }
    requestColorChange(color) {
        if (!this.room)
            return;
        const message = { color };
        this.room.send(MESSAGE_TYPES.COLOR_CHANGE, message);
    }
    toggleReady() {
        if (!this.room)
            return;
        const message = { ready: !this.myReady };
        this.room.send(MESSAGE_TYPES.READY, message);
    }
    requestMatchStart() {
        if (!this.room)
            return;
        this.room.send(MESSAGE_TYPES.MATCH_START, {});
    }
    showRoleReveal(role) {
        // Remove existing role reveal UI if any
        if (this.roleRevealUI) {
            this.roleRevealUI.remove();
        }
        this.roleRevealUI = document.createElement("div");
        this.roleRevealUI.id = "role-reveal";
        this.roleRevealUI.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.5s ease-out;
    `;
        const isKiller = role === PlayerRole.Killer;
        const roleColor = isKiller ? "#ef4444" : "#10b981";
        const roleText = isKiller ? "KILLER" : "CREWMATE";
        const roleDescription = isKiller
            ? "Eliminate all crewmates without getting caught!"
            : "Complete tasks and find the killer!";
        this.roleRevealUI.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
      <div style="
        text-align: center;
        animation: pulse 2s ease-in-out infinite;
      ">
        <h1 style="
          font-size: 48px;
          font-weight: 800;
          color: ${roleColor};
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 4px;
        ">${roleText}</h1>
        <p style="
          font-size: 20px;
          color: #9ca3af;
          max-width: 600px;
        ">${roleDescription}</p>
      </div>
      <button id="role-reveal-continue" style="
        margin-top: 48px;
        padding: 16px 48px;
        background: ${roleColor};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      ">Continue</button>
    `;
        document.body.appendChild(this.roleRevealUI);
        const continueBtn = document.getElementById("role-reveal-continue");
        continueBtn?.addEventListener("click", () => this.hideRoleReveal());
        continueBtn?.addEventListener("mouseenter", () => {
            if (continueBtn)
                continueBtn.style.background = isKiller ? "#dc2626" : "#059669";
            if (continueBtn)
                continueBtn.style.transform = "scale(1.02)";
        });
        continueBtn?.addEventListener("mouseleave", () => {
            if (continueBtn)
                continueBtn.style.background = roleColor;
            if (continueBtn)
                continueBtn.style.transform = "scale(1)";
        });
    }
    hideRoleReveal() {
        if (this.roleRevealUI) {
            this.roleRevealUI.style.animation = "fadeOut 0.3s ease-in forwards";
            setTimeout(() => {
                if (this.roleRevealUI) {
                    this.roleRevealUI.remove();
                    this.roleRevealUI = null;
                }
            }, 300);
        }
        // Hide lobby UI and start game
        this.lobbyUI.classList.add("hidden");
        this.startInputSending();
    }
    showPhaseUI(content) {
        this.hidePhaseUI();
        const panel = document.createElement("div");
        panel.id = "match-phase-ui";
        panel.style.cssText = `
      position: fixed; inset: 0; z-index: 900; display: flex;
      align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.92);
      pointer-events: auto; padding: 24px;
    `;
        panel.innerHTML = `<div style="width: min(560px, 100%); max-height: 90vh; overflow: auto; background: #1f2937; border: 1px solid #475569; border-radius: 12px; padding: 28px; text-align: center; color: #f8fafc;">${content}</div>`;
        document.body.appendChild(panel);
        this.phaseUI = panel;
        return panel;
    }
    hidePhaseUI() {
        if (this.phaseTimer !== null) {
            clearInterval(this.phaseTimer);
            this.phaseTimer = null;
        }
        this.phaseUI?.remove();
        this.phaseUI = null;
    }
    startDeadlineTimer(element, deadline, prefix) {
        const render = () => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            element.textContent = `${prefix}: ${remaining}s`;
        };
        render();
        this.phaseTimer = window.setInterval(render, 250);
    }
    showDiscussion(deadline) {
        const panel = this.showPhaseUI(`<h1 style="margin-bottom: 12px;">Emergency Meeting</h1><p id="phase-timer" style="font-size: 24px; color: #93c5fd;"></p><p style="margin-top: 16px; color: #cbd5e1;">Discuss the evidence. Voting begins when the server timer ends.</p>`);
        this.startDeadlineTimer(panel.querySelector("#phase-timer"), deadline, "Discussion ends in");
    }
    showVoting(deadline) {
        const livingPlayers = [...(this.room?.state.players.values() ?? [])].filter((player) => player.state === PlayerState.Alive);
        const candidates = livingPlayers
            .map((player) => `<button data-vote-target="${player.sessionId}" style="margin: 6px;">Vote ${player.name}</button>`)
            .join("");
        const panel = this.showPhaseUI(`<h1 style="margin-bottom: 12px;">Vote</h1><p id="phase-timer" style="font-size: 24px; color: #93c5fd;"></p><p id="vote-feedback" style="min-height: 24px; margin: 16px 0; color: #cbd5e1;">Choose a living player or abstain. You may change your vote.</p><div>${candidates}</div><button data-vote-target="" style="margin-top: 14px;">Abstain</button>`);
        this.startDeadlineTimer(panel.querySelector("#phase-timer"), deadline, "Voting ends in");
        panel
            .querySelectorAll("button[data-vote-target]")
            .forEach((button) => {
            button.addEventListener("click", () => {
                const rawTarget = button.dataset.voteTarget ?? "";
                this.submitVote(rawTarget || null);
            });
        });
    }
    submitVote(targetSessionId) {
        if (!this.room)
            return;
        const message = { targetSessionId };
        this.room.send(MESSAGE_TYPES.VOTE, message);
    }
    showVoteResults(message) {
        const playerName = (sessionId) => this.room?.state.players.get(sessionId)?.name ?? sessionId;
        const totals = Object.entries(message.totals)
            .map(([sessionId, total]) => `<li>${playerName(sessionId)}: ${total}</li>`)
            .join("") || "<li>No player votes</li>";
        const ejection = message.ejectedSessionId
            ? `<p style="margin-top: 16px; color: #fca5a5;"><strong>${playerName(message.ejectedSessionId)}</strong> was ejected. Role: <strong>${message.ejectedRole}</strong>.</p>`
            : '<p style="margin-top: 16px; color: #cbd5e1;">No player was ejected.</p>';
        const panel = this.showPhaseUI(`<h1>Vote Results</h1><ul style="list-style: none; margin: 16px 0;">${totals}</ul><p>Abstentions: ${message.abstainVotes}</p>${ejection}<p id="phase-timer" style="margin-top: 20px; color: #93c5fd;"></p>`);
        this.startDeadlineTimer(panel.querySelector("#phase-timer"), message.resultsEndTime, "Returning to play in");
    }
    showGameOver(winner, reason) {
        this.showPhaseUI(`<h1 style="color: ${winner === PlayerRole.Killer ? "#f87171" : "#86efac"};">${winner === PlayerRole.Killer ? "Killer Victory" : "Crewmate Victory"}</h1><p style="margin-top: 16px; color: #cbd5e1;">${reason}</p>`);
    }
    updateVentUI(message) {
        const canUseVents = this.myRole === PlayerRole.Killer &&
            this.room?.state.phase === GamePhase.Playing;
        if (!canUseVents) {
            this.ventUI?.remove();
            this.ventUI = null;
            this.ventFeedback = null;
            return;
        }
        if (!this.ventUI) {
            this.ventUI = document.createElement("div");
            this.ventUI.id = "vent-controls";
            this.ventUI.style.cssText =
                "position:fixed;right:20px;bottom:20px;z-index:800;width:min(270px,calc(100vw - 40px));padding:14px;background:rgba(31,41,55,.94);border:1px solid #ef4444;border-radius:10px;color:#f8fafc;text-align:center;";
            document.body.appendChild(this.ventUI);
        }
        const localPlayer = this.mySessionId
            ? this.room?.state.players.get(this.mySessionId)
            : undefined;
        const nearbyNode = !this.isVenting && localPlayer
            ? STARFALL_MAP.ventNodes.find((node) => Math.hypot(localPlayer.x - node.x, localPlayer.y - node.y) <=
                node.radius)
            : undefined;
        const destinations = this.connectedVentNodeIds
            .map((nodeId) => STARFALL_MAP.ventNodes.find((node) => node.id === nodeId))
            .filter((node) => Boolean(node));
        this.ventUI.innerHTML = this.isVenting
            ? `<strong style="color:#fca5a5;">Inside vent: ${this.currentVentNodeId}</strong><div style="margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${destinations.map((node) => `<button data-vent-travel="${node.id}">Travel to ${node.roomId}</button>`).join("")}</div><button data-vent-exit style="margin-top:10px;">Exit vent</button><p id="vent-feedback" style="min-height:18px;margin:8px 0 0;color:#cbd5e1;"></p>`
            : `<strong>Vent</strong><p style="margin:8px 0;color:#cbd5e1;">${nearbyNode ? `At ${nearbyNode.roomId} vent.` : "Approach a vent to enter."}</p>${nearbyNode ? `<button data-vent-enter="${nearbyNode.id}">Enter vent</button>` : ""}<p id="vent-feedback" style="min-height:18px;margin:8px 0 0;color:#cbd5e1;"></p>`;
        this.ventFeedback = this.ventUI.querySelector("#vent-feedback");
        if (message?.reason && this.ventFeedback)
            this.ventFeedback.textContent = message.reason;
        this.ventUI
            .querySelector("[data-vent-enter]")
            ?.addEventListener("click", (event) => {
            const nodeId = event.currentTarget.dataset
                .ventEnter;
            this.room?.send(MESSAGE_TYPES.VENT_ENTER, {
                nodeId,
            });
        });
        this.ventUI
            .querySelectorAll("[data-vent-travel]")
            .forEach((button) => {
            button.addEventListener("click", () => {
                this.room?.send(MESSAGE_TYPES.VENT_TRAVEL, {
                    destinationNodeId: button.dataset.ventTravel,
                });
            });
        });
        this.ventUI
            .querySelector("[data-vent-exit]")
            ?.addEventListener("click", () => {
            this.room?.send(MESSAGE_TYPES.VENT_EXIT, {});
        });
    }
    createTouchControls() {
        this.touchJoystick = document.createElement("div");
        this.touchJoystick.id = "touch-joystick";
        this.touchJoystick.setAttribute("aria-label", "Movement joystick");
        this.touchJoystick.style.cssText = `
      position: fixed; left: max(20px, env(safe-area-inset-left));
      bottom: max(20px, env(safe-area-inset-bottom)); width: 132px; height: 132px;
      border-radius: 50%; border: 2px solid rgba(191, 219, 254, .72);
      background: rgba(15, 23, 42, .62); z-index: 800; touch-action: none;
      display: none;
    `;
        const thumb = document.createElement("div");
        thumb.style.cssText = `position:absolute;left:50%;top:50%;width:48px;height:48px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(147,197,253,.72);pointer-events:none;`;
        this.touchJoystick.appendChild(thumb);
        document.body.appendChild(this.touchJoystick);
        this.touchInput.attach(this.touchJoystick);
    }
    getLocalPlayer() {
        return this.mySessionId
            ? this.room?.state.players.get(this.mySessionId)
            : undefined;
    }
    findNearbyKillTarget() {
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer || !this.room)
            return undefined;
        let closest;
        let closestDistance = GAME_CONFIG.KILL_RANGE;
        this.room.state.players.forEach((player) => {
            if (player.sessionId === localPlayer.sessionId ||
                player.state !== PlayerState.Alive)
                return;
            const distance = Math.hypot(player.x - localPlayer.x, player.y - localPlayer.y);
            if (distance <= closestDistance) {
                closest = player;
                closestDistance = distance;
            }
        });
        return closest;
    }
    getActionContext() {
        const localPlayer = this.getLocalPlayer();
        return {
            phase: this.room?.state.phase ?? null,
            role: this.myRole,
            isAlive: localPlayer?.state === PlayerState.Alive,
            isVenting: this.isVenting,
            hasNearbyKillTarget: Boolean(this.findNearbyKillTarget()),
        };
    }
    updateActionControls() {
        if (!this.touchJoystick)
            return;
        const actions = getAvailableActions(this.getActionContext());
        const shouldShow = actions.canKill || actions.canCallMeeting;
        this.touchJoystick.style.display = shouldShow ? "block" : "none";
        if (!shouldShow) {
            this.actionControls?.remove();
            this.actionControls = null;
            return;
        }
        if (!this.actionControls) {
            this.actionControls = document.createElement("div");
            this.actionControls.id = "action-controls";
            this.actionControls.style.cssText = `
        position:fixed;right:max(20px, env(safe-area-inset-right));
        bottom:max(20px, env(safe-area-inset-bottom));z-index:800;display:flex;
        flex-direction:column;align-items:stretch;gap:10px;width:min(150px,35vw);
      `;
            document.body.appendChild(this.actionControls);
        }
        this.actionControls.innerHTML = `
      ${actions.canKill ? '<button type="button" data-game-action="kill">Kill</button>' : ""}
      ${actions.canCallMeeting ? '<button type="button" data-game-action="meeting">Meeting</button>' : ""}
    `;
        this.actionControls
            .querySelectorAll("button[data-game-action]")
            .forEach((button) => {
            button.style.cssText =
                "min-height:56px;border:2px solid #f8fafc;border-radius:999px;background:#1d4ed8;color:#fff;font-size:16px;font-weight:700;touch-action:manipulation;";
            button.addEventListener("click", () => {
                this.handleAction(button.dataset.gameAction);
            });
        });
    }
    handleDesktopAction(action) {
        this.handleAction(action);
    }
    handleAction(action) {
        const availableActions = getAvailableActions(this.getActionContext());
        if (action === "kill" && availableActions.canKill) {
            const target = this.findNearbyKillTarget();
            if (target && this.room) {
                const message = { targetSessionId: target.sessionId };
                this.room.send(MESSAGE_TYPES.KILL, message);
            }
        }
        else if (action === "meeting" &&
            availableActions.canCallMeeting &&
            this.room) {
            const message = {};
            this.room.send(MESSAGE_TYPES.CALL_MEETING, message);
        }
    }
    async connect() {
        try {
            this.updateConnectionStatus("Connecting...", "status-connecting");
            this.room = await this.client.joinOrCreate("game", {});
            this.setupRoomListeners();
            this.updateConnectionStatus("Connected", "status-connected");
        }
        catch (error) {
            console.error("Connection failed:", error);
            this.updateConnectionStatus("Connection Failed", "status-error");
        }
    }
    async reconnect(disconnectedRoom) {
        if (this.reconnecting || this.room !== disconnectedRoom)
            return;
        this.reconnecting = true;
        this.stopInputSending();
        this.lastSentInput = { x: 0, y: 0 };
        this.inputController.setKeyboardMovement({ x: 0, y: 0 });
        this.inputController.clearTouchMovement();
        this.updateConnectionStatus("Reconnecting...", "status-connecting");
        try {
            const restoredRoom = await this.client.reconnect(disconnectedRoom.reconnectionToken);
            if (this.room !== disconnectedRoom)
                return;
            this.room = restoredRoom;
            this.setupRoomListeners();
            this.mySessionId = restoredRoom.sessionId;
            this.updateConnectionStatus("Reconnected", "status-connected");
            if (restoredRoom.state.phase === GamePhase.Playing) {
                this.lobbyUI.classList.add("hidden");
                this.startInputSending();
            }
        }
        catch (error) {
            console.error("Reconnection failed:", error);
            if (this.room === disconnectedRoom) {
                this.room = null;
                this.myRole = null;
                this.updateConnectionStatus("Disconnected", "status-disconnected");
                this.lobbyUI.classList.remove("hidden");
            }
        }
        finally {
            this.reconnecting = false;
        }
    }
    setupRoomListeners() {
        if (!this.room)
            return;
        this.room.onStateChange((state) => {
            this.renderPlayersList(state.players);
            this.updateVentUI();
            this.updateActionControls();
        });
        this.room.onMessage(MESSAGE_TYPES.WELCOME, (message) => {
            this.mySessionId = message.sessionId;
            this.myColor = message.color;
            console.log("Welcome:", message);
            // Show lobby UI for lobby phase
            if (message.phase === GamePhase.Lobby) {
                this.lobbyUI.classList.remove("hidden");
                this.createColorPickerUI();
                this.createReadyButton();
                this.createStartMatchButton();
            }
            else if (message.phase === GamePhase.Playing) {
                this.lobbyUI.classList.add("hidden");
                this.startInputSending();
            }
        });
        this.room.onMessage(MESSAGE_TYPES.PLAYER_JOINED, (message) => {
            console.log("Player joined:", message);
        });
        this.room.onMessage(MESSAGE_TYPES.PLAYER_LEFT, (message) => {
            console.log("Player left:", message);
        });
        this.room.onMessage(MESSAGE_TYPES.LOBBY_STATE, (message) => {
            console.log("Lobby state:", message);
            // Update color picker with availability
            const availability = new Map();
            message.players.forEach((p) => {
                availability.set(p.color, { available: false, owner: p.sessionId });
            });
            // Mark colors not in use as available
            COLORS.forEach((color) => {
                if (!availability.has(color)) {
                    availability.set(color, { available: true });
                }
            });
            this.updateColorPickerUI(availability);
            // Update ready button
            const myPlayer = message.players.find((p) => p.sessionId === this.mySessionId);
            if (myPlayer) {
                this.updateReadyButton(myPlayer.ready, message.canStart);
            }
        });
        this.room.onMessage(MESSAGE_TYPES.COLOR_CHANGE, (message) => {
            console.log("Color changed:", message);
            if (message.sessionId === this.mySessionId) {
                this.myColor = message.color;
            }
            // The LOBBY_STATE message will follow with updated availability
        });
        this.room.onMessage(MESSAGE_TYPES.READY, (message) => {
            console.log("Ready changed:", message);
            // The LOBBY_STATE message will follow with updated ready status
        });
        this.room.onMessage(MESSAGE_TYPES.MATCH_START, (message) => {
            console.log("Match started:", message);
            // Match is starting, roles will be assigned
        });
        this.room.onMessage(MESSAGE_TYPES.ROLE_ASSIGNMENT, (message) => {
            console.log("Role assigned:", message);
            this.myRole = message.role;
            this.showRoleReveal(message.role);
            this.updateVentUI();
            this.updateActionControls();
        });
        this.room.onMessage(MESSAGE_TYPES.RECONNECTION_STATE, (message) => {
            this.myRole = message.role;
            this.lastSentInput = { x: 0, y: 0 };
            this.updateVentUI();
            this.updateActionControls();
        });
        this.room.onMessage(MESSAGE_TYPES.VENT_STATE, (message) => {
            this.isVenting = message.isVenting;
            this.currentVentNodeId = message.currentNodeId;
            this.connectedVentNodeIds = message.connectedNodeIds;
            this.lastSentInput = { x: 0, y: 0 };
            this.updateVentUI(message);
            this.updateActionControls();
        });
        this.room.onMessage(MESSAGE_TYPES.MEETING_STARTED, (message) => {
            this.lastSentInput = { x: 0, y: 0 };
            this.showDiscussion(message.discussionEndTime);
        });
        this.room.onMessage(MESSAGE_TYPES.MEETING_STATE, (message) => {
            if (message.phase === "discussion" &&
                message.discussionEndTime &&
                !this.phaseUI) {
                this.showDiscussion(message.discussionEndTime);
            }
        });
        this.room.onMessage(MESSAGE_TYPES.VOTING_STARTED, (message) => {
            this.showVoting(message.votingDeadline);
        });
        this.room.onMessage(MESSAGE_TYPES.VOTE_SUBMITTED, (message) => {
            const feedback = this.phaseUI?.querySelector("#vote-feedback");
            if (feedback) {
                feedback.textContent = message.success
                    ? "Vote submitted. You may still change it."
                    : (message.reason ?? "Vote rejected.");
            }
        });
        this.room.onMessage(MESSAGE_TYPES.VOTING_RESULTS, (message) => {
            this.showVoteResults(message);
        });
        this.room.onMessage(MESSAGE_TYPES.GAME_OVER, (message) => {
            this.showGameOver(message.winner, message.reason);
            this.stopInputSending();
        });
        this.room.onStateChange((state) => {
            this.renderPlayersList(state.players);
            if (state.phase === GamePhase.Playing && this.phaseUI) {
                this.hidePhaseUI();
            }
        });
        this.room.onMessage(MESSAGE_TYPES.ERROR, (message) => {
            console.error("Server error:", message);
            this.updateConnectionStatus(`Error: ${message.message}`, "status-error");
            this.joinBtn.disabled = false;
            this.playerNameInput.disabled = false;
            this.setProfileFeedback(message.message);
        });
        const subscribedRoom = this.room;
        this.room.onLeave((code) => {
            console.log("Left room:", code);
            if (subscribedRoom) {
                void this.reconnect(subscribedRoom);
            }
        });
        this.room.onError((code, message) => {
            console.error("Room error:", code, message);
            this.updateConnectionStatus(`Error: ${message}`, "status-error");
        });
    }
    startInputSending() {
        if (this.inputSendInterval)
            return;
        this.inputSendInterval = window.setInterval(() => {
            this.sendMovementInput();
        }, 1000 / this.INPUT_SEND_RATE);
    }
    stopInputSending() {
        if (this.inputSendInterval) {
            clearInterval(this.inputSendInterval);
            this.inputSendInterval = null;
        }
    }
    sendMovementInput() {
        if (!this.room || !this.mySessionId || this.isVenting)
            return;
        const direction = this.inputController.getMovement();
        // Only send if input changed (optimization)
        if (direction.x === this.lastSentInput.x &&
            direction.y === this.lastSentInput.y) {
            return;
        }
        this.lastSentInput = direction;
        const message = {
            direction,
            timestamp: Date.now(),
        };
        this.room.send(MESSAGE_TYPES.MOVE, message);
    }
    updateConnectionStatus(text, className) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = className;
    }
    renderPlayersList(players) {
        this.playersContainer.innerHTML = "";
        let count = 0;
        players.forEach((player, sessionId) => {
            count++;
            const div = document.createElement("div");
            div.className = "player-item";
            div.innerHTML = `
        <div class="player-color" style="background: ${player.color}"></div>
        <span class="player-name">${player.name}</span>
        ${sessionId === this.mySessionId ? '<span class="player-you">You</span>' : ""}
        ${player.ready ? '<span class="player-ready" style="font-size: 12px; color: #10b981; background: rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px;">Ready</span>' : ""}
      `;
            this.playersContainer.appendChild(div);
        });
        const playersListHeader = this.playersList.querySelector("h3");
        if (playersListHeader) {
            playersListHeader.textContent = `Players (${count}/${GAME_CONFIG.MAX_PLAYERS})`;
        }
    }
    gameLoop = () => {
        this.render();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };
    render() {
        // Clear canvas
        this.ctx.fillStyle = "#0f0f1a";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw map (walls, doors, rooms)
        this.drawMap();
        // Draw players if in game
        if (this.room?.state) {
            this.room.state.players.forEach((player) => {
                this.drawPlayer(player);
            });
        }
    }
    drawMap() {
        const scaleX = this.canvas.width / GAME_CONFIG.MAP_WIDTH;
        const scaleY = this.canvas.height / GAME_CONFIG.MAP_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (this.canvas.width - GAME_CONFIG.MAP_WIDTH * scale) / 2;
        const offsetY = (this.canvas.height - GAME_CONFIG.MAP_HEIGHT * scale) / 2;
        // Draw walls
        this.ctx.strokeStyle = "#374151";
        this.ctx.lineWidth = 2 * scale;
        this.ctx.fillStyle = "#1f2937";
        for (const wall of STARFALL_MAP.walls) {
            const x = offsetX + wall.x * scale;
            const y = offsetY + wall.y * scale;
            const w = wall.width * scale;
            const h = wall.height * scale;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeRect(x, y, w, h);
        }
        // Draw doors as openings (lighter color)
        this.ctx.fillStyle = "#4b5563";
        this.ctx.strokeStyle = "#6b7280";
        this.ctx.lineWidth = 1 * scale;
        for (const door of STARFALL_MAP.doors) {
            if (!door.isOpen)
                continue;
            const x = offsetX + door.x * scale;
            const y = offsetY + door.y * scale;
            const w = door.width * scale;
            const h = door.height * scale;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeRect(x, y, w, h);
        }
        // Draw room labels (optional, for debugging)
        this.ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
        this.ctx.font = `${Math.max(10, 12 * scale)}px sans-serif`;
        this.ctx.textAlign = "center";
        for (const room of STARFALL_MAP.rooms) {
            const x = offsetX + (room.bounds.x + room.bounds.width / 2) * scale;
            const y = offsetY + (room.bounds.y + room.bounds.height / 2) * scale;
            this.ctx.fillText(room.name, x, y);
        }
        // Draw meeting room indicator
        const meetingRoom = STARFALL_MAP.rooms.find((r) => r.id === STARFALL_MAP.meetingRoomId);
        if (meetingRoom) {
            const x = offsetX + (meetingRoom.bounds.x + meetingRoom.bounds.width / 2) * scale;
            const y = offsetY +
                (meetingRoom.bounds.y + meetingRoom.bounds.height / 2) * scale;
            this.ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.max(50, 80 * scale), 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#3b82f6";
            this.ctx.lineWidth = 2 * scale;
            this.ctx.stroke();
        }
        // Debug mode: draw collision boundaries
        if (this.debugMode) {
            this.drawDebugCollision(scale, offsetX, offsetY);
        }
    }
    drawDebugCollision(scale, offsetX, offsetY) {
        // Draw player collision radius indicator for local player
        if (this.mySessionId && this.room?.state) {
            const myPlayer = this.room.state.players.get(this.mySessionId);
            if (myPlayer && myPlayer.state === PlayerState.Alive) {
                const screenX = offsetX + myPlayer.x * scale;
                const screenY = offsetY + myPlayer.y * scale;
                const radius = GAME_CONFIG.PLAYER_RADIUS * scale;
                this.ctx.strokeStyle = "#10b981";
                this.ctx.lineWidth = 2 * scale;
                this.ctx.setLineDash([5 * scale, 5 * scale]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        // Draw spawn points
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.5)";
        this.ctx.strokeStyle = "#10b981";
        this.ctx.lineWidth = 1 * scale;
        for (const spawn of STARFALL_MAP.spawnPoints) {
            const x = offsetX + spawn.x * scale;
            const y = offsetY + spawn.y * scale;
            const r = 8 * scale;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        // Draw vent nodes (for future vent system)
        this.ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
        this.ctx.strokeStyle = "#ef4444";
        this.ctx.lineWidth = 1 * scale;
        for (const vent of STARFALL_MAP.ventNodes) {
            const x = offsetX + vent.x * scale;
            const y = offsetY + vent.y * scale;
            const r = vent.radius * scale;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        // Draw vent connections
        this.ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        this.ctx.lineWidth = 1 * scale;
        this.ctx.setLineDash([10 * scale, 5 * scale]);
        for (const conn of STARFALL_MAP.ventConnections) {
            const from = STARFALL_MAP.ventNodes.find((v) => v.id === conn.from);
            const to = STARFALL_MAP.ventNodes.find((v) => v.id === conn.to);
            if (from && to) {
                const x1 = offsetX + from.x * scale;
                const y1 = offsetY + from.y * scale;
                const x2 = offsetX + to.x * scale;
                const y2 = offsetY + to.y * scale;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        this.ctx.setLineDash([]);
    }
    drawPlayer(player) {
        if (player.state !== PlayerState.Alive)
            return;
        const scaleX = this.canvas.width / GAME_CONFIG.MAP_WIDTH;
        const scaleY = this.canvas.height / GAME_CONFIG.MAP_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (this.canvas.width - GAME_CONFIG.MAP_WIDTH * scale) / 2;
        const offsetY = (this.canvas.height - GAME_CONFIG.MAP_HEIGHT * scale) / 2;
        const screenX = offsetX + player.x * scale;
        const screenY = offsetY + player.y * scale;
        const radius = GAME_CONFIG.PLAYER_RADIUS * scale;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = player.color;
        this.ctx.fill();
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 2 * scale;
        this.ctx.stroke();
        // Draw name
        this.ctx.fillStyle = "#fff";
        this.ctx.font = `${Math.max(10, 12 * scale)}px sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(player.name, screenX, screenY - radius - 8 * scale);
    }
    start() {
        this.gameLoop();
    }
}
// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const game = new GameClient();
    game.start();
});
