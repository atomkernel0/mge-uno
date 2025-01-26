export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "reverse"
  | "skip"
  | "plusone"
  | "wild"
  | "shuffle";

export type CardColor = "blue" | "red" | "yellow" | "green" | "wild";

export class CardModel {
  constructor(public color: CardColor, public value: CardValue) {}
}
