import express from "express";
import http from "node:http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { corsConfig } from "../config/cors.config.ts";
import { GameService } from "./services/game.service.ts";
import type { CardColor, CardModel } from "./models/card.model.ts";
import { logger } from "./utils/logger.ts";
import { PlayerManager } from "./managers/player.manager.ts";
import { GameEventHandler } from "./handlers/game.event.handler.ts";

const CONFIG = {
  KICK_TIMEOUT: 5 * 60 * 1000,
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
  MAX_NICKNAME_LENGTH: 20,
  PORT: 3000,
} as const;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: corsConfig });

app.use(cors(corsConfig));

export interface LobbyState {
  players: string[];
  spectators: string[];
  playerCount: number;
  spectatorCount: number;
  isGameStarted: boolean;
}

const lobbyState: LobbyState = {
  players: [],
  spectators: [],
  playerCount: 0,
  spectatorCount: 0,
  isGameStarted: false,
};

const gameService = new GameService(io);
const playerManager = new PlayerManager();
const gameEventHandler = new GameEventHandler(
  io,
  gameService,
  playerManager,
  lobbyState
);

let gameEndTimeout: ReturnType<typeof setTimeout> | null = null;

io.on("connection", (socket: Socket) => {
  logger.info("Client connected", { socketId: socket.id });

  const gameInProgress =
    lobbyState.isGameStarted || gameService.isGameInProgress();

  if (gameInProgress) {
    logger.info("Game in progress, adding player as spectator", {
      socketId: socket.id,
    });

    if (lobbyState.players.includes(socket.id)) {
      lobbyState.players = lobbyState.players.filter((id) => id !== socket.id);
      lobbyState.playerCount = Math.max(0, lobbyState.playerCount - 1);
    }

    if (!lobbyState.spectators.includes(socket.id)) {
      lobbyState.spectators.push(socket.id);
      lobbyState.spectatorCount++;

      const spectatorProfile = {
        nickname: `Spectateur ${lobbyState.spectatorCount}`,
        avatar: "",
        musicId: "",
        isSpectator: true,
      };

      playerManager.addPlayer(socket.id, spectatorProfile);

      const spectatorGameState = {
        currentCard: gameService.getCurrentCard(),
        currentPlayer: gameService.getCurrentPlayer(),
        otherPlayersCards: gameService.getOtherPlayersCards(),
        colorToPlay: gameService.getColorToPlay(),
        players: gameService.getPlayers(),
        nicknames: playerManager.getPlayerNicknames(),
        avatars: playerManager.getPlayerAvatars(),
        gameDirection: gameService.getGameDirection(),
        isSpectator: true,
        playerHand: [],
      };

      socket.emit("spectatorJoined", { gameState: spectatorGameState });
    }
  } else {
    logger.info("No game in progress, adding as player", {
      socketId: socket.id,
    });

    const spectatorIndex = lobbyState.spectators.indexOf(socket.id);
    if (spectatorIndex !== -1) {
      lobbyState.spectators.splice(spectatorIndex, 1);
      lobbyState.spectatorCount = Math.max(0, lobbyState.spectatorCount - 1);
    }

    if (!lobbyState.players.includes(socket.id)) {
      lobbyState.players.push(socket.id);
      lobbyState.playerCount++;

      playerManager.addPlayer(socket.id, {
        nickname: `Joueur ${lobbyState.playerCount}`,
        avatar: "",
        musicId: "",
        isSpectator: false,
      });

      playerManager.startPlayerTimer(socket.id, socket, CONFIG.KICK_TIMEOUT);
    } else {
      playerManager.updatePlayerProfile(socket.id, {
        isSpectator: false,
      });
    }
  }

  emitLobbyUpdate();

  socket.on("updateNickname", (nickname: string) => {
    if (isValidNickname(nickname)) {
      playerManager.updatePlayerProfile(socket.id, {
        nickname: nickname.trim(),
      });
      playerManager.startPlayerTimer(socket.id, socket, CONFIG.KICK_TIMEOUT);
      emitLobbyUpdate();
    }
  });

  socket.on(
    "updateAvatar",
    (data: { playerId: string; avatarPath: string }) => {
      if (data.playerId === socket.id) {
        playerManager.updatePlayerProfile(data.playerId, {
          avatar: data.avatarPath,
        });
        playerManager.startPlayerTimer(socket.id, socket, CONFIG.KICK_TIMEOUT);
        emitLobbyUpdate();
      }
    }
  );

  socket.on("updateMusic", (data: { playerId: string; musicId: string }) => {
    if (data.playerId === socket.id) {
      playerManager.updatePlayerProfile(data.playerId, {
        musicId: data.musicId,
      });
      playerManager.startPlayerTimer(socket.id, socket, CONFIG.KICK_TIMEOUT);
      emitLobbyUpdate();
    }
  });

  socket.on("rejoinLobby", () => {
    logger.info("Player rejoining lobby", { socketId: socket.id });

    const spectatorIndex = lobbyState.spectators.indexOf(socket.id);
    if (spectatorIndex !== -1) {
      lobbyState.spectators.splice(spectatorIndex, 1);
      lobbyState.spectatorCount = Math.max(0, lobbyState.spectatorCount - 1);
    }

    if (!lobbyState.players.includes(socket.id)) {
      lobbyState.players.push(socket.id);
      lobbyState.playerCount++;

      if (playerManager.playerExists(socket.id)) {
        playerManager.updatePlayerProfile(socket.id, {
          isSpectator: false,
        });
      } else {
        playerManager.addPlayer(socket.id, {
          nickname: `Joueur ${lobbyState.playerCount}`,
          avatar: "",
          musicId: "",
          isSpectator: false,
        });
      }

      if (!gameService.isPlayerInitialized(socket.id)) {
        gameService.initializePlayer(socket.id);
      }
    }

    emitLobbyUpdate();
  });

  socket.on("startGame", (data: { playerId: string }) => {
    gameEventHandler.handleStartGame(socket, data, lobbyState);
  });

  socket.on("drawCard", () => {
    gameEventHandler.handleDrawCard(socket);
  });

  socket.on("passTurn", () => {
    gameEventHandler.handlePassTurn(socket);
  });

  socket.on(
    "playCard",
    (data: { card: CardModel; selectedColor?: CardColor }) => {
      gameEventHandler.handlePlayCard(socket, data);
    }
  );

  socket.on("gameEnded", () => {
    if (gameEndTimeout) {
      clearTimeout(gameEndTimeout);
    }

    lobbyState.spectators.forEach((spectatorId) => {
      convertSpectatorToPlayer(spectatorId);
    });

    lobbyState.spectators = [];
    lobbyState.spectatorCount = 0;
    lobbyState.isGameStarted = false;

    emitLobbyUpdate();
  });

  socket.on("leaveLobby", () => {
    handlePlayerLeave(socket);
  });

  socket.on("disconnect", () => {
    handlePlayerLeave(socket);
    logger.info("Client disconnected", { socketId: socket.id });
  });
});

function handlePlayerLeave(socket: Socket) {
  const spectatorIndex = lobbyState.spectators.indexOf(socket.id);
  if (spectatorIndex !== -1) {
    lobbyState.spectators.splice(spectatorIndex, 1);
    lobbyState.spectatorCount--;
    playerManager.removePlayer(socket.id);
    emitLobbyUpdate();
    return;
  }

  const playerIndex = lobbyState.players.indexOf(socket.id);
  if (playerIndex !== -1) {
    lobbyState.players.splice(playerIndex, 1);
    lobbyState.playerCount--;

    if (lobbyState.isGameStarted && lobbyState.playerCount <= 1) {
      resetGame();
      io.emit("gameEnded", { reason: "not_enough_players" });
    }

    playerManager.removePlayer(socket.id);
    emitLobbyUpdate();
  }
}

function isValidNickname(nickname: string): boolean {
  return Boolean(
    nickname &&
      nickname.trim().length > 0 &&
      nickname.length <= CONFIG.MAX_NICKNAME_LENGTH
  );
}

function emitLobbyUpdate() {
  const players = playerManager.getPlayersInfo();
  io.emit("lobbyUpdate", {
    players: players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      musicId: player.musicId,
      isSpectator: lobbyState.spectators.includes(player.id),
    })),
    playerCount: lobbyState.playerCount,
    spectatorCount: lobbyState.spectatorCount,
    isGameStarted: lobbyState.isGameStarted,
  });
}

function resetGame() {
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
    gameEndTimeout = null;
  }

  [...lobbyState.spectators].forEach((spectatorId) => {
    const spectatorIndex = lobbyState.spectators.indexOf(spectatorId);
    if (spectatorIndex !== -1) {
      lobbyState.spectators.splice(spectatorIndex, 1);
      lobbyState.spectatorCount--;

      if (!lobbyState.players.includes(spectatorId)) {
        lobbyState.players.push(spectatorId);
        lobbyState.playerCount++;
      }

      playerManager.updatePlayerProfile(spectatorId, {
        isSpectator: false,
      });
    }
  });

  lobbyState.isGameStarted = false;
  gameService.reset();

  io.emit("gameReset", {
    message: "La partie a été réinitialisée",
  });

  emitLobbyUpdate();
}

function convertSpectatorToPlayer(socketId: string) {
  const spectatorIndex = lobbyState.spectators.indexOf(socketId);
  if (spectatorIndex !== -1) {
    lobbyState.spectators.splice(spectatorIndex, 1);
    lobbyState.spectatorCount--;
  }

  if (!lobbyState.players.includes(socketId)) {
    lobbyState.players.push(socketId);
    lobbyState.playerCount++;
  }

  playerManager.updatePlayerProfile(socketId, {
    isSpectator: false,
  });

  emitLobbyUpdate();
}

server.listen(CONFIG.PORT, () => {
  logger.info(`Server running on port ${CONFIG.PORT}`);
});
