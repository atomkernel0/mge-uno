import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CardModel } from '../models/card.model';
import { GameService } from './game.service';
import { SocketService } from '../socket/socket.service';
import { GameState } from '../models/gamestate.interface';
import { AsyncPipe, CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { ColorPickerDialogComponent } from '../color-picker-dialog/color-picker-dialog.component';
import { VictoryDialogComponent } from '../victory-dialog/victory-dialog.component';
import { Router } from '@angular/router';
import { GlowService } from '../glow/glow.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    ColorPickerDialogComponent,
    VictoryDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
  gameState!: GameState;
  selectedCard: CardModel | null = null;
  isCurrentPlayer: boolean = false;
  showColorPicker = false;
  pendingWildCard: CardModel | null = null;
  showVictoryDialog = false;
  winnerMessage = '';
  drawnCardAnimation = false;
  deckPosition: { x: number; y: number } | null = null;
  lastTurnSkipped: boolean = false;
  shouldHighlightDrawCard: boolean = false;

  isShuffleAnimation: boolean = false;
  isSpectator: boolean = false;

  private readonly hoverSound = new Audio('assets/sounds/card-hover.mp3');
  private readonly selectSound = new Audio('assets/sounds/card-select.mp3');
  private readonly shuffleSound = new Audio('assets/sounds/shuffle.mp3');
  private victorySound: HTMLAudioElement | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    public gameService: GameService,
    private glowService: GlowService,
    public socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    // Écouter l'initialisation du jeu
    this.socketService
      .on('gameInitialized')
      .subscribe((initialState: GameState) => {
        console.log('Game initialized with state:', initialState);
        this.stopVictoryMusic();
        this.gameState = initialState;
        this.showVictoryDialog = false;
        this.winnerMessage = '';
        this.cdr.detectChanges();
      });

    this.socketService.on('spectatorJoined').subscribe(() => {
      this.isSpectator = true;
      this.cdr.detectChanges();
    });

    // Écouter la fin de partie
    this.socketService.on('gameEnded').subscribe(() => {
      this.showVictoryDialog = false;
      this.router.navigate(['/']);
    });
  }

  ngOnInit(): void {
    this.gameState = {
      ...this.gameState,
      gameDirection: 1,
    };
    this.subscribeToGameStateUpdates();
    this.subscribeToGameInitialization();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.stopVictoryMusic();
    this.gameService.cleanupGame();
  }

  ngAfterViewInit() {
    this.updateCardPositions();
  }

  public updateCardPositions() {
    requestAnimationFrame(() => {
      const cards = Array.from(
        document.querySelectorAll('.player-hand app-card')
      );
      const totalCards = cards.length;

      if (totalCards <= 1) return;

      const angleStep = 60 / (totalCards - 1);
      const startAngle = -30;

      cards.forEach((card, index) => {
        const angle = startAngle + index * angleStep;
        (card as HTMLElement).style.setProperty('--angle', `${angle}deg`);
      });
    });
  }

  drawCard(): void {
    if (this.isSpectator) return;
    if (!this.isCurrentPlayer) {
      console.warn("It's not your turn");
      return;
    }

    if (this.gameState.hasDrawnCard) {
      console.warn('You have already drawn a card this turn');
      return;
    }

    this.drawnCardAnimation = true;

    setTimeout(() => {
      this.gameService.drawCard();
      this.drawnCardAnimation = false;
      this.cdr.detectChanges();
    }, 400);
  }

  passTurn(): void {
    if (this.isSpectator) return;
    if (this.canSkipTurn()) {
      this.gameService.passTurn();
      // Mettre à jour l'état local immédiatement
      this.gameState = {
        ...this.gameState,
        hasSkippedTurn: true,
        currentPlayer: this.getNextPlayer(), // Si vous avez accès au prochain joueur
      };
      this.cdr.detectChanges(); // Forcer la mise à jour de la vue
    }
  }

  public playVictoryMusic() {
    this.stopVictoryMusic();

    if (this.gameState?.winnerMusic) {
      this.victorySound = new Audio(
        `assets/winning_music/winning_music_${this.gameState.winnerMusic}.mp3`
      );
      this.victorySound.volume = 1;
      this.victorySound
        .play()
        .catch((err) => console.error('Error playing victory music:', err));
    }
  }

  private stopVictoryMusic() {
    if (this.victorySound) {
      this.victorySound.pause();
      this.victorySound.currentTime = 0;
      this.victorySound = null;
    }
  }

  private getNextPlayer(): string {
    const currentIndex = this.gameState.players.indexOf(
      this.gameState.currentPlayer
    );
    return this.gameState.players[
      (currentIndex + 1) % this.gameState.players.length
    ];
  }

  toggleCardSelection(card?: CardModel): void {
    this.selectSound.volume = 0.2;
    this.selectSound.currentTime = 0;
    this.selectSound.play().catch(() => {});

    this.selectedCard = card || null;
    this.updateCardPositions();
  }

  playSelectedCard(): void {
    if (this.isSpectator) return;
    if (!this.selectedCard) return;

    if (!this.isValidCard(this.selectedCard)) {
      console.warn('Cette carte ne peut pas être jouée maintenant');
      this.toggleCardSelection();
      return;
    }

    if (this.selectedCard.value.includes('Wild')) {
      this.pendingWildCard = this.selectedCard;
      this.showColorPicker = true;
    } else {
      this.gameService.playCard(this.selectedCard);
      this.gameState.currentCard = this.selectedCard;
      this.gameState.hasDrawnCard = false;
      this.gameState.hasSkippedTurn = false;
      this.gameState.lastTurnSkipped = this.selectedCard.value === 'skip';
      this.selectedCard = null;
      this.cdr.detectChanges();
    }
  }

  handleCardClick(event: CardModel): void {
    if (this.isSpectator) return;
    if (!this.isCurrentPlayer) {
      console.warn("Ce n'est pas votre tour");
      return;
    }

    const clickedCard = event;

    if (clickedCard === this.selectedCard) {
      if (this.isValidCard(clickedCard)) {
        if (clickedCard.value.includes('wild')) {
          this.pendingWildCard = clickedCard;
          this.showColorPicker = true;
          this.cdr.detectChanges();
        } else {
          this.playSelectedCard();
        }
      } else {
        console.warn('Cette carte ne peut pas être jouée maintenant');
        this.toggleCardSelection();
      }
    } else {
      if (this.isValidCard(clickedCard)) {
        this.toggleCardSelection(clickedCard);
      } else {
        console.warn('Cette carte ne peut pas être jouée maintenant');
      }
    }
  }

  isValidCard(card: CardModel): boolean {
    if (!this.gameState.currentCard) return true;

    if (
      this.gameState.currentCard.color === 'wild' &&
      this.gameState.currentCard.value === 'wild'
    ) {
      return card.color === this.gameState.colorToPlay || card.color === 'wild';
    }

    return (
      card.color === this.gameState.currentCard.color ||
      card.value === this.gameState.currentCard.value ||
      card.color === 'wild' ||
      this.gameState.currentCard.color === 'wild'
    );
  }

  onCardHover() {
    if (!this.hoverSound.onplaying) {
      this.hoverSound.volume = 0.1;
      this.hoverSound.currentTime = 0;
      this.hoverSound.play().catch(() => {});
    }
  }

  onColorSelected(color: string): void {
    if (this.pendingWildCard) {
      this.gameService.playCard(this.pendingWildCard, color);
      this.gameState.currentCard = this.pendingWildCard;
      this.gameState.hasDrawnCard = false;
      this.gameState.hasSkippedTurn = false;
      this.gameState.lastTurnSkipped = false;
      this.pendingWildCard = null;
      this.showColorPicker = false;
      this.cdr.detectChanges();
    }
  }

  getWinnerAvatar(): string {
    if (this.gameState?.winner) {
      return (
        this.gameState.avatars[this.gameState.winner] ||
        'assets/profile_picture/default.png'
      );
    }
    return 'assets/profile_picture/default.png';
  }

  private subscribeToGameStateUpdates(): void {
    const subscription = this.gameService.getGameState().subscribe((state) => {
      this.updateGameState(state);
    });
    this.subscriptions.push(subscription);
  }

  private subscribeToGameInitialization(): void {
    const subscription = this.gameService.getGameInitialized().subscribe(() => {
      this.showVictoryDialog = false;
    });
    this.subscriptions.push(subscription);
  }

  getPlayerAvatar(playerId: string): string {
    return (
      this.gameState?.avatars?.[playerId] ||
      'assets/profile_picture/default.png'
    );
  }

  getPlayerStatus(playerId: string): string {
    if (this.isSpectator && playerId === this.socketService.getSocketId()) {
      return '(Spectateur)';
    }
    return '';
  }

  shouldShowControls(): boolean {
    return !this.isSpectator;
  }

  public updateGameState(state: GameState): void {
    if (!state.players || state.players.length === 0) {
      return;
    }

    const isNewShuffleCard =
      state.currentCard &&
      state.currentCard.value === 'shuffle' &&
      (!this.gameState?.currentCard ||
        this.gameState.currentCard.value !== 'shuffle' ||
        this.gameState.currentCard !== state.currentCard);

    this.gameState = state;

    const currentSocketId = this.socketService.getSocketId();
    this.isCurrentPlayer = state.currentPlayer === currentSocketId;

    // Ne jouer le son que si c'est une nouvelle carte shuffle
    if (isNewShuffleCard) {
      this.isShuffleAnimation = true;
      this.shuffleSound.play().catch(() => {});
      setTimeout(() => {
        this.isShuffleAnimation = false;
        this.cdr.detectChanges();
      }, 2000);
    }

    this.shouldHighlightDrawCard = this.gameService.shouldHighlightDrawCard();

    setTimeout(() => this.updateCardPositions(), 0);

    if (state.winner && !this.showVictoryDialog) {
      this.showVictoryDialog = true;
      this.winnerMessage = `${
        state.winner === this.socketService.getSocketId()
          ? 'Vous avez'
          : this.getPlayerName(state.winner) + ' a'
      } gagné !`;

      if (state.winnerMusic) {
        this.playVictoryMusic();
      }
    }

    this.cdr.detectChanges();
  }

  canSkipTurn(): boolean {
    return (
      this.isCurrentPlayer &&
      this.gameState.hasDrawnCard &&
      !this.gameState.hasSkippedTurn &&
      !this.gameState.lastTurnSkipped
    );
  }

  getOtherPlayers(): string[] {
    if (!this.gameState?.players) return [];
    return this.gameState.players.filter(
      (id) => id !== this.socketService.getSocketId()
    );
  }

  getCardBacksArray(playerId: string): number[] {
    return Array.from(
      { length: this.gameState.otherPlayersCards[playerId] || 0 },
      (_, i) => i
    );
  }

  // Dans game.component.ts
  getCardTransform(index: number, playerId: string): string {
    const position = this.getPlayerPositionClass(playerId);
    const totalCards = this.gameState.otherPlayersCards[playerId] || 0;

    // Paramètres de base pour l'éventail
    const maxAngle = 30; // Angle total de l'éventail
    const spacing = 20; // Espacement entre les cartes

    // Calcul de l'angle pour chaque carte
    const anglePerCard = maxAngle / Math.max(totalCards - 1, 1);
    const startAngle = -maxAngle / 2;
    const currentAngle = startAngle + index * anglePerCard;

    if (position.includes('top')) {
      // Position en haut - éventail horizontal inversé
      return `
      translate(${index * spacing - (totalCards * spacing) / 2}px, -20px)
      rotate(${180 + currentAngle}deg)
    `;
    } else if (position.includes('left')) {
      // Position à gauche - éventail vertical
      return `
      translate(-20px, ${index * spacing - (totalCards * spacing) / 2}px)
      rotate(${90 + currentAngle}deg)
    `;
    } else if (position.includes('right')) {
      // Position à droite - éventail vertical
      return `
      translate(20px, ${index * spacing - (totalCards * spacing) / 2}px)
      rotate(${-90 + currentAngle}deg)
    `;
    }

    // Position par défaut
    return `translate(${index * spacing - (totalCards * spacing) / 2}px, 0)`;
  }

  getPlayerPositionClass(playerId: string): string {
    const otherPlayers = this.getOtherPlayers();
    const playerIndex = otherPlayers.indexOf(playerId);
    const totalPlayers = otherPlayers.length;

    // Pour 1 joueur
    if (totalPlayers === 1) {
      return 'opponent-top';
    }

    // Pour 2 joueurs
    if (totalPlayers === 2) {
      if (playerIndex === 0) {
        return 'opponent-top-left two-players';
      }
      return 'opponent-top-right two-players';
    }

    // Pour 3 joueurs - Modification ici
    if (totalPlayers === 3) {
      if (playerIndex === 0) return 'opponent-top-left';
      if (playerIndex === 1) return 'opponent-top';
      return 'opponent-top-right';
    }

    // Pour 4 joueurs
    if (totalPlayers === 4) {
      if (playerIndex === 0) return 'opponent-left';
      if (playerIndex === 1) return 'opponent-top-left';
      if (playerIndex === 2) return 'opponent-top-right';
      return 'opponent-right';
    }

    // Pour 5 joueurs
    if (totalPlayers === 5) {
      if (playerIndex === 0) return 'opponent-left';
      if (playerIndex === 1) return 'opponent-top-left';
      if (playerIndex === 2) return 'opponent-top';
      if (playerIndex === 3) return 'opponent-top-right';
      return 'opponent-right';
    }

    // Pour 6 joueurs
    if (playerIndex === 0) return 'opponent-bottom-left';
    if (playerIndex === 1) return 'opponent-left';
    if (playerIndex === 2) return 'opponent-top-left';
    if (playerIndex === 3) return 'opponent-top-right';
    if (playerIndex === 4) return 'opponent-right';
    return 'opponent-bottom-right';
  }

  canDrawCard(): boolean {
    return this.isCurrentPlayer && !this.gameState.hasDrawnCard;
  }

  getPlayerName(playerId: string): string {
    return this.gameState?.nicknames?.[playerId] || playerId;
  }

  onDeckClick(): void {
    if (this.canDrawCard()) {
      const deckElement = document.querySelector('.deck');
      if (deckElement) {
        const rect = deckElement.getBoundingClientRect();
        this.deckPosition = {
          x: rect.left,
          y: rect.top,
        };
      }
      this.drawnCardAnimation = true;

      const drawSound = new Audio('assets/sounds/card-draw.mp3');
      drawSound.volume = 0.2;
      drawSound.play().catch(() => {});

      setTimeout(() => {
        this.gameService.drawCard();
        this.drawnCardAnimation = false;
        this.cdr.detectChanges();
      }, 400);
    }
  }

  getCardGlow(): string {
    if (!this.gameState?.currentCard) return 'none';

    return this.glowService.getGlowColor(
      this.gameState.currentCard,
      this.gameState.colorToPlay,
      this.isCurrentPlayer
    );
  }
}
