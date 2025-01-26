import { Server, Socket } from "socket.io";
import { GameService } from "../services/game.service.ts";
import { PlayerManager } from "../managers/player.manager.ts";
import { logger } from "../utils/logger.ts";
import { CardColor, CardModel } from "../models/card.model.ts";
import type { LobbyState } from "../main.ts";

export class GameEventHandler {
  constructor(
    private io: Server,
    private gameService: GameService,
    private playerManager: PlayerManager,
    private lobbyState: LobbyState
  ) {}

  public handleStartGame(
    socket: Socket,
    data: { playerId: string },
    lobbyState: LobbyState
  ): void {
    try {
      if (!lobbyState.players.includes(data.playerId)) {
        socket.emit("gameError", "Player not found");
        return;
      }

      if (this.gameService.isGameOver()) {
        lobbyState.isGameStarted = false;
      }

      const activePlayers = lobbyState.players.filter(
        (id) =>
          !this.playerManager.isSpectator(id) &&
          this.playerManager.isPlayerConnected(id)
      );

      logger.info("Active players for game start:", {
        activePlayers,
        allPlayers: lobbyState.players,
        spectators: lobbyState.spectators,
      });

      const allPlayersReady =
        this.playerManager.areAllPlayersReady(activePlayers);

      if (
        allPlayersReady &&
        activePlayers.length >= 2 &&
        !lobbyState.isGameStarted
      ) {
        logger.info("Starting game with players:", { activePlayers });

        activePlayers.forEach((playerId) => {
          if (!this.gameService.isPlayerInitialized(playerId)) {
            logger.info("Initializing player for game:", { playerId });
            this.gameService.initializePlayer(playerId);
          }
        });

        this.initializeGame({
          ...lobbyState,
          players: activePlayers,
          isGameStarted: true,
        });
      } else {
        const reason = !allPlayersReady
          ? "Tous les joueurs doivent avoir complété leur profil"
          : activePlayers.length < 2
          ? "Il n'y a pas assez de joueurs"
          : "Une partie est déjà en cours";

        logger.info("Cannot start game:", {
          reason,
          activePlayers,
          allPlayersReady,
          isGameStarted: lobbyState.isGameStarted,
        });

        socket.emit("gameError", reason);
      }
    } catch (error) {
      logger.error("Error handling start game", { error, socketId: socket.id });
      socket.emit("gameError", "Une erreur est survenue");
    }
  }

  public handlePassTurn(socket: Socket): void {
    try {
      if (socket.id === this.gameService.getCurrentPlayer()) {
        this.gameService.passTurn(socket.id);
        const playerNickname = this.playerManager.getPlayerNickname(socket.id);

        this.io.emit("gameUpdate", {
          currentPlayer: this.gameService.getCurrentPlayer(),
          canPassTurn: false,
          hasSkippedTurn: true,
          hasDrawnCard: false,
          message: `${playerNickname} a passé son tour`,
          avatars: this.playerManager.getPlayerAvatars(),
          nicknames: this.playerManager.getPlayerNicknames(),
        });
      } else {
        socket.emit(
          "gameError",
          "Vous ne pouvez pas passer votre tour maintenant"
        );
      }
    } catch (error) {
      logger.error("Error handling pass turn", { error, socketId: socket.id });
      socket.emit("gameError", "Une erreur est survenue");
    }
  }

  private initializeGame(lobbyState: LobbyState): void {
    logger.info("Game initialization started");
    this.gameService.initializeGame(lobbyState.players);
    lobbyState.isGameStarted = true;

    this.io.emit("gameStarted");

    setTimeout(() => {
      for (const player of lobbyState.players) {
        const initialState = {
          playerHand: this.gameService.getPlayerHand(player),
          currentCard: this.gameService.getCurrentCard(),
          players: lobbyState.players,
          currentPlayer: this.gameService.getCurrentPlayer(),
          otherPlayersCards: this.getOtherPlayersCards(),
          nicknames: this.playerManager.getPlayerNicknames(),
          avatars: this.playerManager.getPlayerAvatars(),
          winner: "",
          winnerMusic: "",
          message: "",
          colorToPlay: this.gameService.getCurrentCard()?.color || null,
          canPassTurn: false,
          hasSkippedTurn: false,
          hasDrawnCard: false,
          canDrawCard: true,
          gameDirection: 1,
        };

        this.io.to(player).emit("gameInitialized", initialState);
      }
    }, 500);
  }

  handlePlayCard(
    socket: Socket,
    data: { card: CardModel; selectedColor?: CardColor }
  ): void {
    try {
      if (socket.id !== this.gameService.getCurrentPlayer()) {
        socket.emit("gameError", "Ce n'est pas votre tour");
        return;
      }

      const result = this.gameService.playCard(
        socket.id,
        data.card,
        data.selectedColor
      );
      if (result.success) {
        const playerHand = this.gameService.getPlayerHand(socket.id);
        const gameUpdate = {
          currentCard: result.currentCard,
          message: result.message,
          currentPlayer: result.currentPlayer,
          otherPlayersCards: this.getOtherPlayersCards(),
          colorToPlay: data.selectedColor || data.card.color,
          nicknames: this.playerManager.getPlayerNicknames(),
          avatars: this.playerManager.getPlayerAvatars(),
          gameDirection: this.gameService.getGameDirection(),
        };

        if (playerHand.length === 0) {
          const victoryMessage = this.getVictoryMessage(data.card);
          const winnerMusic = this.playerManager.getPlayerMusics()[socket.id];

          this.gameService.setGameEnding(true);
          this.gameService.setGameOver(true);

          this.io.emit("gameUpdate", {
            ...gameUpdate,
            message: `${this.playerManager.getPlayerNickname(
              socket.id
            )} ${victoryMessage}`,
            winner: socket.id,
            winnerMusic,
            gameEnding: true,
          });

          setTimeout(() => {
            this.resetGame();
          }, 10000);

          return;
        }

        socket.emit("playerHandUpdate", { playerHand });
        this.io.emit("gameUpdate", gameUpdate);
      } else {
        socket.emit("gameError", result.message);
      }
    } catch (error) {
      logger.error("Error handling play card", { error, socketId: socket.id });
      socket.emit("gameError", "Une erreur est survenue");
    }
  }

  private getVictoryMessage(card: CardModel): string {
    switch (card.value) {
      //   case "shuffle":
      //     return "a gagné avec un Shuffle !";
      //   case "wild":
      //     return "a gagné avec une Wild !";
      default:
        return "a gagné !";
    }
  }

  private resetGame(): void {
    this.gameService.reset();

    this.lobbyState.isGameStarted = false;

    this.io.emit("gameEnded", {
      message: "La partie est terminée. Vous pouvez en démarrer une nouvelle.",
      canStartNewGame: true,
    });

    this.io.emit("lobbyUpdate", {
      players: this.playerManager.getPlayersInfo(),
      playerCount: this.lobbyState.playerCount,
      isGameStarted: false,
    });

    logger.info("Game has been reset completely");
  }

  handleDrawCard(socket: Socket): void {
    if (socket.id !== this.gameService.getCurrentPlayer()) {
      socket.emit("gameError", "Ce n'est pas votre tour");
      return;
    }

    const drawnCard = this.gameService.drawCardForPlayer(socket.id);
    if (drawnCard) {
      socket.emit("cardDrawn", drawnCard);
      logger.info(`Player ${socket.id} drew a card`);

      const gameUpdate = {
        currentPlayer: this.gameService.getCurrentPlayer(),
        otherPlayersCards: this.getOtherPlayersCards(),
        canPassTurn: this.gameService.hasPlayableCard(socket.id),
        hasSkippedTurn: false,
        hasDrawnCard: true,
        avatars: this.playerManager.getPlayerAvatars(),
        nicknames: this.playerManager.getPlayerNicknames(),
        gameDirection: this.gameService.getGameDirection(),
      };

      socket.emit("gameUpdate", {
        ...gameUpdate,
        playerHand: this.gameService.getPlayerHand(socket.id),
        canDrawCard: false,
      });

      socket.broadcast.emit("gameUpdate", gameUpdate);
    } else {
      socket.emit("gameError", "Vous avez déjà pioché une carte");
    }
  }

  private getOtherPlayersCards(): { [playerId: string]: number } {
    const otherPlayersCards: { [playerId: string]: number } = {};
    for (const playerId of this.gameService.getPlayers()) {
      otherPlayersCards[playerId] =
        this.gameService.getPlayerHand(playerId).length;
    }
    return otherPlayersCards;
  }

  private broadcastGameState(socket: Socket): void {
    const gameState = {
      currentPlayer: this.gameService.getCurrentPlayer(),
      otherPlayersCards: this.getOtherPlayersCards(),
      canPassTurn: this.gameService.hasPlayableCard(socket.id),
      hasSkippedTurn: false,
      hasDrawnCard: true,
      gameDirection: this.gameService.getGameDirection(),
    };

    this.io.emit("gameUpdate", gameState);
  }
}
