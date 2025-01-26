export class CardModel {
  constructor(
    public color: 'blue' | 'red' | 'yellow' | 'green' | 'wild',
    public value:
      | '0'
      | '1'
      | '2'
      | '3'
      | '4'
      | '5'
      | '6'
      | '7'
      | '8'
      | 'reverse'
      | 'skip'
      | 'plusone'
      | 'wild'
      | 'shuffle'
  ) {}
}
