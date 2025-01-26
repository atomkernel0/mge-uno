import type { CardModel } from "../../app/models/card.model.ts";

export interface PlayCardResult {
  success: boolean;
  currentCard: CardModel | null;
  message: string;
  currentPlayer: string;
  playerHand: CardModel[];
  colorToPlay?: string;
}
