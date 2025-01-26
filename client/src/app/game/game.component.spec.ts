import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameComponent } from './game.component';
import { GameService } from './game.service';
import { SocketService } from '../socket/socket.service';
import { GlowService } from '../glow/glow.service';
import { CardModel } from '../models/card.model';
import { GameState } from '../models/gamestate.interface';
import { EMPTY, of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let gameServiceMock: jasmine.SpyObj<GameService>;
  let socketServiceMock: jasmine.SpyObj<SocketService>;
  let glowServiceMock: jasmine.SpyObj<GlowService>;

  const mockCard: CardModel = new CardModel('red', '7');

  const mockGameState: GameState = {
    players: ['player1', 'player2'],
    currentPlayer: 'player1',
    playerHand: [mockCard],
    currentCard: mockCard,
    otherPlayersCards: { player2: 3 },
    hasDrawnCard: false,
    hasSkippedTurn: false,
    canDrawCard: true,
    canPassTurn: false,
    nicknames: { player1: 'Player One', player2: 'Player Two' },
    avatars: { player1: 'avatar1.png', player2: 'avatar2.png' },
    colorToPlay: 'red',
    message: '',
    winner: '',
    winnerMusic: '',
    gameEnding: false,
    gameDirection: 1,
  };

  beforeEach(async () => {
    gameServiceMock = jasmine.createSpyObj('GameService', [
      'drawCard',
      'playCard',
      'passTurn',
      'getGameState',
      'getGameInitialized',
    ]);
    socketServiceMock = jasmine.createSpyObj('SocketService', [
      'on',
      'getSocketId',
    ]);
    glowServiceMock = jasmine.createSpyObj('GlowService', ['getGlowColor']);

    gameServiceMock.getGameState.and.returnValue(of(mockGameState));
    gameServiceMock.getGameInitialized.and.returnValue(EMPTY);
    socketServiceMock.on.and.callFake((event: string) => {
      switch (event) {
        case 'gameInitialized':
          return of(mockGameState);
        case 'gameEnded':
          return of(undefined);
        default:
          return of({});
      }
    });
    socketServiceMock.getSocketId.and.returnValue('player1');
    glowServiceMock.getGlowColor.and.returnValue('0 0 10px red');

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
        { provide: GlowService, useValue: glowServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    component.gameState = mockGameState;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct game state', () => {
      expect(component.gameState).toEqual(mockGameState);
      expect(component.isCurrentPlayer).toBeTrue();
    });
  });

  describe('Game Actions', () => {
    it('should handle card selection', () => {
      component.toggleCardSelection(mockCard);
      expect(component.selectedCard).toEqual(mockCard);
    });

    it('should handle wild card selection', () => {
      const wildCard = new CardModel('wild', 'wild');

      component.isCurrentPlayer = true;

      component.gameState = {
        ...mockGameState,
        currentPlayer: socketServiceMock.getSocketId(),
        playerHand: [wildCard],
        currentCard: new CardModel('red', '7'),
      };

      component.toggleCardSelection(wildCard);
      fixture.detectChanges();

      component.handleCardClick(wildCard);
      fixture.detectChanges();

      expect(component.showColorPicker).toBeTrue();
      expect(component.pendingWildCard).toBeTruthy();
      expect(component.pendingWildCard).toEqual(wildCard);
    });

    it('should handle color selection after wild card', () => {
      const wildCard = new CardModel('wild', 'wild');
      component.pendingWildCard = wildCard;
      component.showColorPicker = true;

      component.onColorSelected('blue');
      fixture.detectChanges();

      expect(gameServiceMock.playCard).toHaveBeenCalledWith(wildCard, 'blue');
      expect(component.showColorPicker).toBeFalse();
      expect(component.pendingWildCard).toBeNull();
    });

    it('should not show color picker if not current player', () => {
      const wildCard = new CardModel('wild', 'wild');
      component.isCurrentPlayer = false;

      component.handleCardClick(wildCard);
      fixture.detectChanges();

      expect(component.showColorPicker).toBeFalse();
    });

    it('should handle color selection for wild card', () => {
      const wildCard = new CardModel('wild', 'wild');
      component.pendingWildCard = wildCard;
      component.showColorPicker = true;

      component.onColorSelected('blue');
      fixture.detectChanges();

      expect(gameServiceMock.playCard).toHaveBeenCalledWith(wildCard, 'blue');
      expect(component.showColorPicker).toBeFalse();
      expect(component.pendingWildCard).toBeNull();
    });

    it('should handle card drawing', fakeAsync(() => {
      component.isCurrentPlayer = true;
      component.gameState.hasDrawnCard = false;

      component.drawCard();
      tick(400);

      expect(gameServiceMock.drawCard).toHaveBeenCalled();
      expect(component.drawnCardAnimation).toBeFalse();
    }));
  });

  describe('Player Interactions', () => {
    it('should validate card play correctly', () => {
      const validCard = new CardModel('red', '8');
      expect(component.isValidCard(validCard)).toBeTrue();
    });

    it('should handle color selection for wild card', () => {
      const wildCard = new CardModel('wild', 'wild');
      component.pendingWildCard = wildCard;
      component.onColorSelected('blue');
      expect(gameServiceMock.playCard).toHaveBeenCalledWith(wildCard, 'blue');
    });
  });

  describe('UI Elements', () => {
    it('should render player hand', () => {
      const cards = fixture.debugElement.queryAll(
        By.css('.player-hand app-card')
      );
      expect(cards.length).toBe(component.gameState.playerHand.length);
    });

    it('should render opponent hands', () => {
      const opponents = fixture.debugElement.queryAll(By.css('.opponent-hand'));
      expect(opponents.length).toBe(component.getOtherPlayers().length);
    });
  });

  describe('Game State Updates', () => {
    it('should handle victory condition', () => {
      const winState: GameState = {
        ...mockGameState,
        winner: 'player1',
        gameEnding: true,
      };
      component.updateGameState(winState);
      expect(component.showVictoryDialog).toBeTrue();
    });

    it('should update player positions correctly', () => {
      const position = component.getPlayerPositionClass('player2');
      expect(position).toBeTruthy();
    });
  });
});
