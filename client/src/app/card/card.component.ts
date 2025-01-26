import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CardModel } from '../models/card.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class CardComponent {
  @Input() card!: CardModel;
  @Input() selected: boolean = false;
  @Output() cardClick = new EventEmitter<CardModel>();

  onCardClick(): void {
    this.cardClick.emit(this.card);
  }

  getCardImage(): string {
    return `/assets/cards/${this.card.color}/${this.card.value}.webp`;
  }
}
