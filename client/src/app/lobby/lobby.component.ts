import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { SocketService } from '../socket/socket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { profilePictures } from '../data/profilesPictures';
import { victoryMusics } from '../data/victoryMusics';

interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string;
  musicId: string;
  isReady?: boolean;
}

interface LobbyUpdateData {
  players: PlayerProfile[];
  playerCount: number;
  isGameStarted: boolean;
}

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LobbyComponent implements OnInit, OnDestroy {
  private currentAudio: HTMLAudioElement | null = null;
  private lastErrorTime: number = 0;
  private subscriptions: Subscription[] | undefined;

  public isPlaying = false;
  public nickname: string = '';
  public notReadyPlayers: string[] = [];
  public playerCount: number = 0;
  public players: PlayerProfile[] = [];
  public profilePictures = profilePictures;
  public selectedMusic: string = '';
  public victoryMusics = victoryMusics;

  constructor(private socketService: SocketService, private router: Router) {}

  public ngOnInit(): void {
    this.socketService.emit('rejoinLobby');

    const gameStartedSubscription = this.socketService
      .on('gameStarted')
      .subscribe(() => {
        this.router.navigate(['/game']);
      });

    this.subscriptions?.push(gameStartedSubscription);

    const gameErrorSubscription = this.socketService
      .on('gameError')
      .subscribe((error: string) => {
        console.error('Game error:', error);

        const currentTime = Date.now();
        if (currentTime - this.lastErrorTime > 1000) {
          alert(error);
          this.lastErrorTime = currentTime;
        }
      });

    this.subscriptions?.push(gameErrorSubscription);

    const lobbyUpdateSubscription = this.socketService
      .on('lobbyUpdate')
      .subscribe((data: LobbyUpdateData) => {
        this.players = data.players.map((player) => ({
          id: player.id,
          nickname: player.nickname || player.id,
          avatar: player.avatar || '',
          musicId: player.musicId || '',
          isReady: Boolean(player.nickname && player.avatar && player.musicId),
        }));

        this.playerCount = data.playerCount;

        const currentPlayer = this.players.find(
          (p) => p.id === this.socketService.getSocketId()
        );
        if (currentPlayer) {
          this.nickname = currentPlayer.nickname;
          this.selectedMusic = currentPlayer.musicId || '';
        }

        const { notReadyPlayers } = this.checkAllPlayersReady();
        this.notReadyPlayers = notReadyPlayers;
      });

    this.subscriptions?.push(lobbyUpdateSubscription);
  }

  public ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
    }
    this.stopPreview();
  }

  public startGame(): void {
    const { ready } = this.checkAllPlayersReady();
    if (!ready) {
      return;
    }

    const playerData = {
      playerId: this.socketService.getSocketId(),
    };

    this.socketService.emit('startGame', playerData);
  }

  public leaveLobby(): void {
    this.socketService.emit('leaveLobby');
    this.router.navigate(['/']);
  }

  public getPlayerId(): string {
    return this.socketService.getSocketId();
  }

  public previewSelectedMusic() {
    const selectedMusicObj = this.victoryMusics.find(
      (m) => m.id === this.selectedMusic
    );
    if (selectedMusicObj) {
      this.stopPreview();
      this.currentAudio = new Audio(selectedMusicObj.path);
      this.currentAudio.volume = 0.3;
      this.isPlaying = true;

      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false;
      });

      this.currentAudio.play();
    }
  }

  public stopPreview(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isPlaying = false;
    }
  }

  public onMusicSelect(musicId: string): void {
    this.selectedMusic = musicId;

    const musicData = {
      playerId: this.socketService.getSocketId(),
      musicId: musicId,
    };
    this.socketService.emit('updateMusic', musicData);
  }

  public chooseAvatar(avatarId: string): void {
    const chosenAvatar = this.profilePictures.find((a) => a.id === avatarId);
    if (chosenAvatar) {
      const avatarData = {
        playerId: this.socketService.getSocketId(),
        avatarPath: chosenAvatar.path,
      };
      this.socketService.emit('updateAvatar', avatarData);
    }
  }

  public onNicknameSubmit(event: Event, nickname: string): void {
    event.preventDefault();
    if (nickname.trim()) {
      this.nickname = nickname.trim();
      this.socketService.emit('updateNickname', nickname.trim());
    }
  }

  public isAvatarSelected(avatarPath: string): boolean {
    const currentPlayer = this.players.find(
      (p) => p.id === this.socketService.getSocketId()
    );
    return currentPlayer?.avatar === avatarPath;
  }

  public checkAllPlayersReady(): { ready: boolean; notReadyPlayers: string[] } {
    const notReady: string[] = [];

    for (const player of this.players) {
      const isReady = Boolean(
        player.nickname?.trim() && player.avatar && player.musicId
      );

      if (!isReady) {
        notReady.push(player.nickname || 'Joueur sans nom');
      }
    }

    return {
      ready: notReady.length === 0,
      notReadyPlayers: notReady,
    };
  }
}
