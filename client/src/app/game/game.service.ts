// src/app/services/game.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SocketService } from '../socket/socket.service';
import { CardModel } from '../models/card.model';
import { GameState } from '../models/gamestate.interface';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private gameStateSubject = new BehaviorSubject<GameState>({
    playerHand: [],
    currentCard: { color: 'wild', value: 'wild' },
    players: [],
    message: '',
    colorToPlay: null,
    currentPlayer: '',
    nicknames: {},
    canPassTurn: false,
    hasSkippedTurn: false,
    otherPlayersCards: {},
    winner: '',
    hasDrawnCard: false,
    canDrawCard: false,
    winnerMusic: '',
    avatars: {},
    gameEnding: false,
    gameDirection: 1,
  });
  private isSpectator: boolean = false;

  private gameInitializedSubject = new Subject<void>();

  constructor(private socketService: SocketService) {
    this.initializeGameListeners();
  }

  getGameState(): Observable<GameState> {
    return this.gameStateSubject.asObservable();
  }

  updateGameState(newState: GameState) {
    this.gameStateSubject.next(newState);
  }

  getGameInitialized(): Observable<void> {
    return this.gameInitializedSubject.asObservable();
  }

  initializeGame(): void {
    this.socketService.emit('startGame');
  }

  drawCard(): void {
    if (this.isSpectator) return;
    const currentState = this.gameStateSubject.getValue();
    const isCurrentPlayer =
      currentState.currentPlayer === this.socketService.getSocketId();

    if (isCurrentPlayer && !currentState.hasDrawnCard) {
      this.socketService.emit('drawCard');
    }
  }

  passTurn(): void {
    if (this.isSpectator) return;
    this.socketService.emit('passTurn');
  }

  playCard(card: CardModel, selectedColor?: string): void {
    if (this.isSpectator) {
      console.warn('Spectators cannot play cards');
      return;
    }
    this.socketService.emit('playCard', { card, selectedColor });
  }

  private resetGameState(): GameState {
    return {
      playerHand: [],
      currentCard: { color: 'wild', value: 'wild' },
      players: [],
      message: '',
      colorToPlay: null,
      currentPlayer: '',
      nicknames: {},
      canPassTurn: false,
      hasSkippedTurn: false,
      otherPlayersCards: {},
      winner: '',
      hasDrawnCard: false,
      canDrawCard: false,
      winnerMusic: '',
      avatars: {},
      gameEnding: false,
      gameDirection: 1,
    };
  }

  private handleGameEnd(): void {
    const currentState = this.gameStateSubject.getValue();
    if (currentState.gameEnding) {
      setTimeout(() => {
        const freshState = this.resetGameState();
        this.gameStateSubject.next(freshState);
      }, 1000);
    }
  }

  public shouldHighlightDrawCard(): boolean {
    const currentState = this.gameStateSubject.getValue();
    return (
      currentState.currentPlayer === this.socketService.getSocketId() &&
      !currentState.hasDrawnCard &&
      !this.hasPlayableCard()
    );
  }

  private hasPlayableCard(): boolean {
    const currentState = this.gameStateSubject.getValue();
    return currentState.playerHand.some((card) => {
      // Pour les cartes spéciales, toujours considérer comme jouables
      if (card.color === 'wild') return true;

      // Pour les autres cartes, vérifier selon les règles normales
      return this.isValidPlay(currentState.currentCard, card);
    });
  }

  private isValidPlay(currentCard: CardModel, playedCard: CardModel): boolean {
    // Si la carte courante est une Wild classique, on doit respecter la couleur choisie
    if (currentCard.color === 'wild' && currentCard.value === 'wild') {
      const currentState = this.gameStateSubject.getValue();
      return (
        playedCard.color === currentState.colorToPlay ||
        playedCard.color === 'wild'
      );
    }

    // Pour les autres cas (y compris Shuffle)
    return (
      currentCard.color === playedCard.color ||
      currentCard.value === playedCard.value ||
      playedCard.color === 'wild' ||
      currentCard.color === 'wild'
    );
  }

  public cleanupGame(): void {
    this.gameStateSubject.next(this.resetGameState());
  }

  public isInSpectatorMode(): boolean {
    return this.isSpectator;
  }

  private initializeGameListeners(): void {
    this.socketService.on('gameInitialized').subscribe((data: GameState) => {
      console.log('Received game initialized data:', data);
      const freshState = this.resetGameState();
      this.isSpectator = data.isSpectator || false;
      this.gameStateSubject.next({
        ...freshState,
        ...data,
      });
      this.gameInitializedSubject.next();
    });

    this.socketService.on('spectatorJoined').subscribe((data: any) => {
      console.log('Spectator joined data:', data);
      this.isSpectator = true;
      const currentState = this.gameStateSubject.getValue();
      this.gameStateSubject.next({
        ...currentState,
        ...data.gameState,
        isSpectator: true,
        playerHand: [],
      });
    });

    this.socketService
      .on('playerHandUpdate')
      .subscribe((data: { playerHand: CardModel[] }) => {
        console.log('Received player hand update:', data);
        const currentState = this.gameStateSubject.getValue();
        this.gameStateSubject.next({
          ...currentState,
          playerHand: data.playerHand,
        });
      });

    this.socketService
      .on('gameUpdate')
      .subscribe((data: Partial<GameState>) => {
        console.log('Received game update:', data);
        const currentState = this.gameStateSubject.getValue();

        const isNewTurn = currentState.currentPlayer !== data.currentPlayer;
        const newHasDrawnCard = isNewTurn ? false : currentState.hasDrawnCard;

        if (data.gameEnding) {
          this.handleGameEnd();
        }

        this.gameStateSubject.next({
          ...currentState,
          ...data,
          hasDrawnCard: newHasDrawnCard,
          message: data.message || currentState.message,
        });
      });

    this.socketService.on('playerStatusUpdate').subscribe((status: any) => {
      console.log('Player status update:', status);
      this.isSpectator = status.isSpectator;
      if (!status.isSpectator) {
        const currentState = this.gameStateSubject.getValue();
        this.gameStateSubject.next({
          ...currentState,
          isSpectator: false,
        });
      }
    });

    this.socketService.on('cardDrawn').subscribe((drawnCard: CardModel) => {
      const currentState = this.gameStateSubject.getValue();
      const newState = {
        ...currentState,
        playerHand: [...currentState.playerHand, drawnCard],
        hasDrawnCard: true, // Marquer que le joueur a pioché
      };
      console.log('Card drawn, new state:', newState);
      this.gameStateSubject.next(newState);
    });
  }
}
