import type { CardModel } from "../../app/models/card.model.ts";

export interface GameState {
  playerHands: { [playerId: string]: CardModel[] };
  currentCard: CardModel | null;
  currentPlayerIndex: number;
  colorToPlay: string | null;
  players: string[];
  deck: CardModel[];
  gameDirection: number;
}
