import { Injectable } from '@angular/core';
import { CardModel } from '../models/card.model';

@Injectable({
  providedIn: 'root',
})
export class GlowService {
  public getGlowColor(
    card: CardModel,
    colorToPlay: string | null,
    isCurrentPlayer: boolean
  ): string {
    if (!isCurrentPlayer) return 'none';

    if (card.value === 'shuffle') {
      return '0 0 20px 5px rgba(255, 255, 255, 0.7)';
    }

    const colorMap: { [key: string]: string } = {
      red: 'rgba(171, 8, 23, 0.7)',
      blue: 'rgba(38, 73, 188, 0.7)',
      green: 'rgba(34, 131, 32, 0.7)',
      yellow: 'rgba(237, 174, 38, 0.7)',
    };

    if (card.value === 'wild') {
      return colorToPlay ? `0 0 20px 5px ${colorMap[colorToPlay]}` : 'none';
    }

    return `0 0 20px 5px ${colorMap[card.color]}`;
  }
}
