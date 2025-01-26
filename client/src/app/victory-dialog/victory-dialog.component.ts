// victory-dialog.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-victory-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="victory-overlay">
      <div class="victory-dialog">
        <div class="confetti"></div>
        <h1>🎉 VICTOIRE ! 🎉</h1>
        <div class="winner-info">
          <img
            [src]="winnerAvatar || 'assets/profile_picture/default.png'"
            alt="Winner Avatar"
            class="winner-avatar"
          />
          <h2>{{ winnerMessage }}</h2>
        </div>
        <p class="congratulations">Félicitations !</p>
      </div>
    </div>
  `,
  styles: [
    `
      .victory-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.5s ease-in;
      }

      .victory-dialog {
        background: linear-gradient(135deg, #ffd700, #ffa500);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        max-width: 500px;
        width: 90%;
        position: relative;
        overflow: hidden;
      }

      .confetti {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('/assets/tf2.png');
        opacity: 0.6;
        animation: confettiFall 10s linear infinite;
      }

      h1 {
        color: #fff;
        font-size: 3em;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        position: relative;
      }

      .winner-info {
        background: rgba(255, 255, 255, 0.9);
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }

      .winner-avatar {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid #ffd700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        animation: trophyBounce 1s ease infinite;
      }

      h2 {
        color: #333;
        font-size: 1.5em;
        margin: 10px 0;
      }

      .congratulations {
        color: #fff;
        font-size: 1.2em;
        margin-top: 20px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes confettiFall {
        from {
          background-position: 0 0;
        }
        to {
          background-position: 0 1000px;
        }
      }

      @keyframes trophyBounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
    `,
  ],
})
export class VictoryDialogComponent {
  @Input() winnerMessage: string = '';
  @Input() winnerAvatar: string = '';
}
