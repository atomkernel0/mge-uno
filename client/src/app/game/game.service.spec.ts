import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameService } from './game.service';
import { SocketService } from '../socket/socket.service';
import { CardModel } from '../models/card.model';
import { GameState } from '../models/gamestate.interface';
import { Subject } from 'rxjs';

describe('GameService', () => {
  let service: GameService;
  let socketServiceSpy: jasmine.SpyObj<SocketService>;
  let gameInitializedSubject: Subject<GameState>;
  let playerHandUpdateSubject: Subject<{ playerHand: CardModel[] }>;
  let gameUpdateSubject: Subject<Partial<GameState>>;
  let cardDrawnSubject: Subject<CardModel>;

  const mockInitialState: GameState = {
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

  beforeEach(() => {
    gameInitializedSubject = new Subject<GameState>();
    playerHandUpdateSubject = new Subject<{ playerHand: CardModel[] }>();
    gameUpdateSubject = new Subject<Partial<GameState>>();
    cardDrawnSubject = new Subject<CardModel>();

    socketServiceSpy = jasmine.createSpyObj('SocketService', [
      'emit',
      'on',
      'getSocketId',
    ]);

    socketServiceSpy.on.and.callFake((event: string) => {
      switch (event) {
        case 'gameInitialized':
          return gameInitializedSubject.asObservable();
        case 'playerHandUpdate':
          return playerHandUpdateSubject.asObservable();
        case 'gameUpdate':
          return gameUpdateSubject.asObservable();
        case 'cardDrawn':
          return cardDrawnSubject.asObservable();
        default:
          return new Subject().asObservable();
      }
    });

    socketServiceSpy.getSocketId.and.returnValue('player1');

    TestBed.configureTestingModule({
      providers: [
        GameService,
        { provide: SocketService, useValue: socketServiceSpy },
      ],
    });

    service = TestBed.inject(GameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Game State Management', () => {
    it('should initialize with default state', (done) => {
      service.getGameState().subscribe((state) => {
        expect(state).toEqual(mockInitialState);
        done();
      });
    });

    it('should update game state when receiving gameInitialized event', (done) => {
      const mockGameState: GameState = {
        ...mockInitialState,
        players: ['player1', 'player2'],
        currentPlayer: 'player1',
      };

      service.getGameState().subscribe((state) => {
        if (state.players.length > 0) {
          expect(state).toEqual(mockGameState);
          done();
        }
      });

      gameInitializedSubject.next(mockGameState);
    });

    it('should update player hand when receiving playerHandUpdate', (done) => {
      const mockHand = [new CardModel('red', '7')];

      service.getGameState().subscribe((state) => {
        if (state.playerHand.length > 0) {
          expect(state.playerHand).toEqual(mockHand);
          done();
        }
      });

      playerHandUpdateSubject.next({ playerHand: mockHand });
    });
  });

  describe('Game Actions', () => {
    it('should emit startGame event when initializing game', () => {
      service.initializeGame();
      expect(socketServiceSpy.emit).toHaveBeenCalledWith('startGame');
    });

    it('should emit drawCard event when conditions are met', () => {
      service.updateGameState({
        ...mockInitialState,
        currentPlayer: 'player1',
        hasDrawnCard: false,
      });

      service.drawCard();
      expect(socketServiceSpy.emit).toHaveBeenCalledWith('drawCard');
    });

    it('should not emit drawCard event when player has already drawn', () => {
      service.updateGameState({
        ...mockInitialState,
        currentPlayer: 'player1',
        hasDrawnCard: true,
      });

      service.drawCard();
      expect(socketServiceSpy.emit).not.toHaveBeenCalledWith('drawCard');
    });

    it('should emit passTurn event', () => {
      service.passTurn();
      expect(socketServiceSpy.emit).toHaveBeenCalledWith('passTurn');
    });

    it('should emit playCard event with correct parameters', () => {
      const card = new CardModel('red', '7');
      const color = 'blue';

      service.playCard(card, color);
      expect(socketServiceSpy.emit).toHaveBeenCalledWith('playCard', {
        card,
        selectedColor: color,
      });
    });
  });

  describe('Game Updates', () => {
    it('should handle new turn correctly', (done) => {
      const initialState = {
        ...mockInitialState,
        currentPlayer: 'player1',
        hasDrawnCard: true,
      };

      const updateState = {
        currentPlayer: 'player2',
        message: 'New turn',
      };

      service.updateGameState(initialState);

      service.getGameState().subscribe((state) => {
        if (state.currentPlayer === 'player2') {
          expect(state.hasDrawnCard).toBeFalse();
          expect(state.message).toBe('New turn');
          done();
        }
      });

      gameUpdateSubject.next(updateState);
    });

    it('should handle drawn card correctly', (done) => {
      const drawnCard = new CardModel('blue', '4');

      service.getGameState().subscribe((state) => {
        if (state.hasDrawnCard) {
          expect(state.playerHand).toContain(drawnCard);
          expect(state.hasDrawnCard).toBeTrue();
          done();
        }
      });

      cardDrawnSubject.next(drawnCard);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid game updates gracefully', fakeAsync(() => {
      const invalidUpdate = {} as Partial<GameState>;
      let stateUpdated = false;

      service.getGameState().subscribe((state) => {
        expect(state).toBeTruthy();
        stateUpdated = true;
      });

      gameUpdateSubject.next(invalidUpdate);
      tick();

      expect(stateUpdated).toBeTrue();
    }));
  });
});
