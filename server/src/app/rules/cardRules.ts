import type { CardModel, CardValue } from "../models/card.model.ts";
import type { GameState } from "../../shared/interfaces/gamestate.interface.ts";
import { logger } from "../utils/logger.ts";

export interface CardRuleResult {
  currentPlayer: string;
  playerHands: { [playerId: string]: CardModel[] };
  gameDirection?: number;
}

export class CardRuleManager {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  public applyCardRule(cardValue: CardValue): CardRuleResult {
    switch (cardValue) {
      case "reverse":
        return this.reverseDirection();
      case "skip":
        return this.skipTurn();
      case "plusone":
        return this.plusOne();
      case "wild":
        return this.wild();
      case "shuffle":
        return this.shuffle();
      default:
        this.nextPlayer();
        return {
          currentPlayer:
            this.gameState.players[this.gameState.currentPlayerIndex],
          playerHands: this.gameState.playerHands,
        };
    }
  }

  private reverseDirection(): CardRuleResult {
    this.gameState.gameDirection *= -1;
    this.nextPlayer();
    logger.info("Direction reversed");

    return {
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      playerHands: this.gameState.playerHands,
      gameDirection: this.gameState.gameDirection,
    };
  }

  private skipTurn(): CardRuleResult {
    const nextPlayerIndex = this.getNextPlayerIndex(this.getNextPlayerIndex());
    const nextPlayer = this.gameState.players[nextPlayerIndex];
    logger.info("Skip action executed");

    return {
      currentPlayer: nextPlayer,
      playerHands: this.gameState.playerHands,
    };
  }

  private getNextPlayerIndex(
    currentIndex: number = this.gameState.currentPlayerIndex
  ): number {
    const playerCount = this.gameState.players.length;
    const rawIndex = currentIndex + this.gameState.gameDirection;
    return ((rawIndex % playerCount) + playerCount) % playerCount;
  }

  private plusOne(): CardRuleResult {
    logger.info("Plus One action executed");

    if (this.gameState.deck.length === 0) {
      logger.warn("Deck is empty, cannot execute Plus One action");
      this.nextPlayer();
      return {
        currentPlayer:
          this.gameState.players[this.gameState.currentPlayerIndex],
        playerHands: this.gameState.playerHands,
      };
    }

    for (let i = 0; i < this.gameState.players.length; i++) {
      if (i !== this.gameState.currentPlayerIndex) {
        const playerId = this.gameState.players[i];
        if (this.gameState.deck.length > 0) {
          const drawnCard = this.gameState.deck.pop()!;
          this.gameState.playerHands[playerId].push(drawnCard);
          logger.info(
            `Player ${playerId} automatically received card: ${drawnCard.color} ${drawnCard.value}`
          );
        }
      }
    }

    this.nextPlayer();

    return {
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      playerHands: this.gameState.playerHands,
    };
  }

  private wild(): CardRuleResult {
    const colors = ["red", "green", "blue", "yellow"];
    this.gameState.colorToPlay =
      colors[Math.floor(Math.random() * colors.length)];
    this.nextPlayer();

    return {
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      playerHands: this.gameState.playerHands,
    };
  }

  private shuffle(): CardRuleResult {
    logger.info("Shuffle action executed");

    if (this.gameState.players.length < 2) {
      logger.warn("Cannot shuffle with less than 2 players");
      this.nextPlayer();
      return {
        currentPlayer:
          this.gameState.players[this.gameState.currentPlayerIndex],
        playerHands: this.gameState.playerHands,
      };
    }

    const currentPlayerId =
      this.gameState.players[this.gameState.currentPlayerIndex];
    const nextPlayerIndex = this.getNextPlayerIndex();
    const nextPlayerId = this.gameState.players[nextPlayerIndex];

    if (!currentPlayerId || !nextPlayerId) {
      logger.error("Invalid player IDs for shuffle");
      this.nextPlayer();
      return {
        currentPlayer:
          this.gameState.players[this.gameState.currentPlayerIndex],
        playerHands: this.gameState.playerHands,
      };
    }

    if (
      this.gameState.playerHands[currentPlayerId] &&
      this.gameState.playerHands[nextPlayerId]
    ) {
      [
        this.gameState.playerHands[currentPlayerId],
        this.gameState.playerHands[nextPlayerId],
      ] = [
        this.gameState.playerHands[nextPlayerId],
        this.gameState.playerHands[currentPlayerId],
      ];

      logger.info(
        `Shuffled hands between player ${currentPlayerId} and ${nextPlayerId}`
      );
    }

    this.nextPlayer();

    return {
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      playerHands: this.gameState.playerHands,
    };
  }

  private nextPlayer(): void {
    this.gameState.currentPlayerIndex =
      (((this.gameState.currentPlayerIndex + this.gameState.gameDirection) %
        this.gameState.players.length) +
        this.gameState.players.length) %
      this.gameState.players.length;
  }
}
