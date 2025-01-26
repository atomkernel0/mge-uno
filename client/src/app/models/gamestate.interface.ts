import { CardModel } from './card.model';

export interface GameState {
  playerHand: CardModel[];
  currentCard: CardModel;
  players: string[];
  nicknames: { [key: string]: string };
  avatars: { [playerId: string]: string };
  message: string;
  colorToPlay: string | null;
  currentPlayer: string;
  canPassTurn: boolean;
  hasSkippedTurn: boolean;
  otherPlayersCards: { [key: string]: number };
  winner: string;
  hasDrawnCard: boolean;
  canDrawCard: boolean;
  winnerMusic: string;
  gameEnding: boolean;
  gameDirection: number;
  lastTurnSkipped?: boolean;
  isSpectator?: boolean;
}
