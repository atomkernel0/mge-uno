import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { CardModel } from '../models/card.model';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;

    // Initialiser une carte par défaut
    component.card = new CardModel('red', '7');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Card Click Events', () => {
    it('should emit card on click', () => {
      const card = new CardModel('blue', '5');
      component.card = card;

      spyOn(component.cardClick, 'emit');
      component.onCardClick();

      expect(component.cardClick.emit).toHaveBeenCalledWith(card);
    });
  });

  describe('Card Image Generation', () => {
    it('should generate correct image path', () => {
      const testCases = [
        { color: 'red', value: '7', expected: '/assets/cards/red/7.webp' },
        {
          color: 'blue',
          value: 'skip',
          expected: '/assets/cards/blue/skip.webp',
        },
        {
          color: 'wild',
          value: 'wild',
          expected: '/assets/cards/wild/wild.webp',
        },
      ];

      testCases.forEach((test) => {
        component.card = new CardModel(
          test.color as 'wild' | 'blue' | 'red' | 'yellow' | 'green',
          test.value as
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
        );
        expect(component.getCardImage()).toBe(test.expected);
      });
    });
  });

  describe('Component Input Properties', () => {
    it('should handle selected property', () => {
      component.selected = true;
      expect(component.selected).toBeTrue();

      component.selected = false;
      expect(component.selected).toBeFalse();
    });

    it('should handle card property updates', () => {
      const newCard = new CardModel('blue', '4');
      component.card = newCard;
      expect(component.card).toEqual(newCard);
    });
  });
});
