import type { Server } from "socket.io";
import type { PlayCardResult } from "../../shared/interfaces/playcardresult.interface.ts";
import { cardList } from "../constants/cardList.ts";
import { CardModel } from "../models/card.model.ts";
import { CardRuleManager } from "../rules/cardRules.ts";
import { logger } from "../utils/logger.ts";

interface CreatePlayCardResultParams {
  success: boolean;
  message: string;
  playerId: string;
  currentPlayer?: string;
}

export class GameService {
  private deck: CardModel[] = [];
  private playerHands: { [playerId: string]: CardModel[] } = {};
  private currentCard: CardModel | null = null;
  private currentPlayerIndex: number = 0;
  private colorToPlay: string | null = null;
  private players: string[] = [];
  private gameDirection: number = 1;
  private playerHasSkippedTurn: { [playerId: string]: boolean } = {};
  public hasDrawnCard: { [playerId: string]: boolean } = {};
  private cardRuleManager: CardRuleManager;
  private hasWinner: boolean = false;
  private lastTurnSkipped: boolean = false;
  private gameEnding: boolean = false;
  private discardPile: CardModel[] = [];
  private gameInProgress: boolean = false;

  constructor(private io: Server) {
    this.initializeDeck();
    this.cardRuleManager = new CardRuleManager({
      playerHands: this.playerHands,
      currentCard: this.currentCard,
      currentPlayerIndex: this.currentPlayerIndex,
      colorToPlay: this.colorToPlay,
      players: this.players,
      deck: this.deck,
      gameDirection: this.gameDirection,
    });
  }

  private initializeDeck(): void {
    this.deck = cardList.map((card) => new CardModel(card.color, card.value));
    this.shuffleDeck();
  }

  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public initializeGame(players: string[]): void {
    if (!players.length) {
      throw new Error("Cannot initialize game with empty players array");
    }

    this.gameInProgress = true;
    this.hasWinner = false;
    this.playerHands = {};
    this.players = [...players];
    this.hasDrawnCard = {};
    this.playerHasSkippedTurn = {};

    players.forEach((playerId) => {
      this.playerHands[playerId] = [];
      this.hasDrawnCard[playerId] = false;
      this.playerHasSkippedTurn[playerId] = false;

      for (let i = 0; i < 7; i++) {
        const card = this.drawCard();
        if (card) {
          this.playerHands[playerId].push(card);
        }
      }
    });

    let firstCard = this.drawCard();
    while (firstCard.color === "wild") {
      this.deck.push(firstCard);
      this.shuffleDeck();
      firstCard = this.drawCard();
    }

    this.currentCard = firstCard;
    this.currentPlayerIndex = 0;
    this.colorToPlay = firstCard.color;
    this.gameDirection = 1;

    logger.info("Game initialized with players:", {
      players: this.players,
      currentPlayer: this.getCurrentPlayer(),
      playerHandSizes: Object.fromEntries(
        Object.entries(this.playerHands).map(([id, hand]) => [id, hand.length])
      ),
    });
  }

  public drawCard(): CardModel {
    if (this.deck.length === 0) {
      if (this.discardPile.length === 0) {
        throw new Error(
          "No more cards available in both deck and discard pile"
        );
      }

      const lastPlayedCard = this.discardPile.pop();

      this.deck = [...this.discardPile];
      this.discardPile = lastPlayedCard ? [lastPlayedCard] : [];

      this.shuffleDeck();

      logger.info("Deck reshuffled with discard pile", {
        newDeckSize: this.deck.length,
        lastPlayedCard: lastPlayedCard,
      });
    }

    const card = this.deck.pop();
    if (!card) {
      throw new Error("Failed to draw card");
    }
    return card;
  }

  private createPlayCardResult({
    success,
    message,
    playerId,
    currentPlayer,
  }: CreatePlayCardResultParams): PlayCardResult {
    if (this.currentCard == null) {
      throw new Error(
        "Current card cannot be null when creating play card result"
      );
    }

    return {
      success,
      currentCard: this.currentCard,
      message,
      currentPlayer: currentPlayer || this.players[this.currentPlayerIndex],
      playerHand: this.playerHands[playerId],
    };
  }

  public playCard(
    playerId: string,
    card: CardModel,
    selectedColor?: string
  ): PlayCardResult {
    if (this.hasWinner) {
      return this.createPlayCardResult({
        success: false,
        message: "Game is already over",
        playerId,
      });
    }

    if (!this.isValidPlay(this.currentCard, card)) {
      return this.createPlayCardResult({
        success: false,
        message: "Invalid play",
        playerId,
      });
    }

    const cardIndex = this.findCardIndex(playerId, card);
    if (cardIndex === -1) {
      return this.createPlayCardResult({
        success: false,
        message: "Card not in player's hand",
        playerId,
      });
    }

    if (this.currentCard) {
      this.discardPile.push(this.currentCard);
    }

    this.currentCard = card;
    this.playerHands[playerId].splice(cardIndex, 1);

    if (card.color === "wild" && selectedColor) {
      this.colorToPlay = selectedColor;
    } else {
      this.colorToPlay = card.color;
    }

    if (this.playerHands[playerId].length === 0) {
      this.hasWinner = true;
      return this.createPlayCardResult({
        success: true,
        message: "Victory!",
        playerId,
        currentPlayer: playerId,
      });
    }

    this.cardRuleManager = new CardRuleManager({
      playerHands: this.playerHands,
      currentCard: this.currentCard,
      currentPlayerIndex: this.currentPlayerIndex,
      colorToPlay: this.colorToPlay,
      players: this.players,
      deck: this.deck,
      gameDirection: this.gameDirection,
    });

    const ruleResult = this.cardRuleManager.applyCardRule(card.value);

    if (ruleResult.gameDirection !== undefined) {
      this.gameDirection = ruleResult.gameDirection;
    }
    this.playerHands = ruleResult.playerHands;
    this.currentPlayerIndex = this.players.indexOf(ruleResult.currentPlayer);

    const currentPlayer = this.players[this.currentPlayerIndex];
    this.resetTurnState(currentPlayer);

    this.players.forEach((pid) => {
      this.io.to(pid).emit("playerHandUpdate", {
        playerHand: this.playerHands[pid],
      });
    });

    return this.createPlayCardResult({
      success: true,
      message: this.getCardPlayMessage(card.value),
      playerId,
      currentPlayer: this.players[this.currentPlayerIndex],
    });
  }

  public getDeckState(): { deckSize: number; discardPileSize: number } {
    return {
      deckSize: this.deck.length,
      discardPileSize: this.discardPile.length,
    };
  }

  public setGameOver(value: boolean): void {
    this.hasWinner = value;
  }

  public getOtherPlayersCards(): { [playerId: string]: number } {
    const otherPlayersCards: { [playerId: string]: number } = {};

    this.players.forEach((playerId) => {
      if (this.playerHands[playerId]) {
        otherPlayersCards[playerId] = this.playerHands[playerId].length;
      }
    });

    return otherPlayersCards;
  }

  private findCardIndex(playerId: string, card: CardModel): number {
    return this.playerHands[playerId].findIndex(
      (c) => c.color === card.color && c.value === card.value
    );
  }

  private resetTurnState(playerId: string): void {
    this.resetDrawState(playerId);
    this.resetSkippedTurn(playerId);
    this.hasDrawnCard[playerId] = false;
    this.lastTurnSkipped = false;
  }

  private getCardPlayMessage(cardValue: string): string {
    const messages: { [key: string]: string } = {
      plusone: "Plus One : Tous les autres joueurs piochent une carte !",
      shuffle: "Les cartes ont été mélangées !",
      skip: "Tour passé !",
      reverse: "Direction inversée !",
      wild: "Changement de couleur !",
    };
    return messages[cardValue] || "Card played successfully";
  }

  public nextPlayer(): void {
    const previousPlayer = this.getCurrentPlayer();

    this.currentPlayerIndex =
      (((this.currentPlayerIndex + this.gameDirection) % this.players.length) +
        this.players.length) %
      this.players.length;

    const newPlayer = this.getCurrentPlayer();

    this.initializePlayerTurnState(newPlayer);

    logger.info(`Turn passed from ${previousPlayer} to ${newPlayer}`);
    logger.info(
      `Draw states after turn change: ${JSON.stringify(this.hasDrawnCard)}`
    );
  }

  private initializePlayerTurnState(playerId: string): void {
    this.hasDrawnCard = {};
    this.players.forEach((pid) => {
      this.hasDrawnCard[pid] = false;
    });
    this.playerHasSkippedTurn[playerId] = false;
    this.lastTurnSkipped = false;

    logger.info(`Initialized turn state for player ${playerId}`);
  }

  public isValidPlay(
    currentCard: CardModel | null,
    playedCard: CardModel
  ): boolean {
    if (currentCard === null) {
      return playedCard.color !== "wild";
    }

    if (currentCard.color === "wild" && currentCard.value === "wild") {
      return (
        playedCard.color === this.colorToPlay || playedCard.color === "wild"
      );
    }

    return (
      currentCard.color === playedCard.color ||
      currentCard.value === playedCard.value ||
      playedCard.color === "wild" ||
      currentCard.color === "wild"
    );
  }

  public getPlayerHand(playerId: string): CardModel[] {
    return this.playerHands[playerId];
  }

  public getCurrentCard(): CardModel | null {
    return this.currentCard;
  }

  public getColorToPlay(): string | null {
    return this.colorToPlay;
  }

  public getCurrentPlayer(): string {
    return this.players[this.currentPlayerIndex];
  }

  public getPlayers(): string[] {
    return this.players;
  }

  public isGameInProgress(): boolean {
    return this.gameInProgress;
  }

  public drawCardForPlayer(playerId: string): CardModel | null {
    logger.info(`Attempting to draw card for player ${playerId}`);

    if (playerId !== this.getCurrentPlayer()) {
      logger.warn(`Not ${playerId}'s turn to draw`);
      return null;
    }

    if (this.hasDrawnCard[playerId]) {
      logger.warn(`Player ${playerId} has already drawn a card`);
      return null;
    }

    const drawnCard = this.drawCard();
    this.playerHands[playerId].push(drawnCard);
    this.hasDrawnCard[playerId] = true;

    const hasPlayableCardAfterDraw = this.hasPlayableCard(playerId);

    if (!hasPlayableCardAfterDraw) {
      logger.info(
        `Player ${playerId} has no playable cards after drawing, auto-skipping turn`
      );
      this.nextPlayer();

      this.io.to(playerId).emit("gameStateUpdate", {
        canDraw: false,
        canSkipTurn: false,
        hasDrawnCard: true,
        autoSkipped: true,
        playerHand: this.playerHands[playerId],
        message: "Aucune carte jouable, tour passé automatiquement",
      });
    } else {
      this.io.to(playerId).emit("gameStateUpdate", {
        canDraw: false,
        canSkipTurn: false,
        hasDrawnCard: true,
        playerHand: this.playerHands[playerId],
      });
    }

    return drawnCard;
  }

  public resetDrawState(playerId: string): void {
    logger.info(`Resetting draw state for player ${playerId}`);
    this.hasDrawnCard[playerId] = false;
  }

  public canSkipTurn(playerId: string): boolean {
    return (
      playerId === this.getCurrentPlayer() &&
      this.hasDrawnCard[playerId] &&
      this.hasPlayableCard(playerId) &&
      !this.playerHasSkippedTurn[playerId] &&
      !this.lastTurnSkipped
    );
  }

  public passTurn(playerId: string): void {
    if (playerId === this.getCurrentPlayer() && this.hasDrawnCard[playerId]) {
      this.setHasSkippedTurn(playerId, true);
      this.nextPlayer();
    }
  }

  public resetSkippedTurn(playerId: string): void {
    this.playerHasSkippedTurn[playerId] = false;
  }

  public hasPlayableCard(playerId: string): boolean {
    const playerHand = this.playerHands[playerId];
    return playerHand.some((card) => {
      if (card.color === "wild") return true;

      return this.isValidPlay(this.currentCard, card);
    });
  }

  public setHasSkippedTurn(playerId: string, value: boolean): void {
    this.playerHasSkippedTurn[playerId] = value;
  }

  public hasSkippedTurn(playerId: string): boolean {
    return this.playerHasSkippedTurn[playerId] || false;
  }

  public reset(): void {
    this.hasWinner = false;
    this.currentPlayerIndex = 0;
    this.playerHands = {};
    this.players = [];
    this.currentCard = null;
    this.hasDrawnCard = {};
    this.players.forEach((playerId) => {
      this.hasDrawnCard[playerId] = false;
    });
    this.playerHasSkippedTurn = {};
    this.colorToPlay = null;
    this.gameDirection = 1;
    this.lastTurnSkipped = false;
    this.gameEnding = false;
    this.gameInProgress = false;

    this.deck = [];
    this.initializeDeck();

    this.cardRuleManager = new CardRuleManager({
      playerHands: this.playerHands,
      currentCard: this.currentCard,
      currentPlayerIndex: this.currentPlayerIndex,
      colorToPlay: this.colorToPlay,
      players: this.players,
      deck: this.deck,
      gameDirection: this.gameDirection,
    });
  }

  public isGameActive(): boolean {
    return (
      this.players.length > 0 &&
      this.currentCard !== null &&
      !this.hasWinner &&
      !this.gameEnding
    );
  }

  public setGameEnding(value: boolean): void {
    this.gameEnding = value;
  }

  public isGameOver(): boolean {
    return this.hasWinner;
  }

  public getGameDirection(): number {
    return this.gameDirection;
  }

  public updatePlayerId(oldId: string, newId: string): void {
    if (this.playerHands[oldId]) {
      this.playerHands[newId] = this.playerHands[oldId];
      delete this.playerHands[oldId];
    }
    if (this.hasDrawnCard[oldId] !== undefined) {
      this.hasDrawnCard[newId] = this.hasDrawnCard[oldId];
      delete this.hasDrawnCard[oldId];
    }
    if (this.playerHasSkippedTurn[oldId] !== undefined) {
      this.playerHasSkippedTurn[newId] = this.playerHasSkippedTurn[oldId];
      delete this.playerHasSkippedTurn[oldId];
    }
    if (this.getCurrentPlayer() === oldId) {
      this.currentPlayerIndex = this.players.indexOf(newId);
    }
  }

  public isPlayerInitialized(playerId: string): boolean {
    return Boolean(this.playerHands[playerId]);
  }

  public initializePlayer(playerId: string): void {
    if (!this.playerHands[playerId]) {
      this.playerHands[playerId] = [];
      this.hasDrawnCard[playerId] = false;
      this.playerHasSkippedTurn[playerId] = false;
    }
  }
}
