import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LobbyComponent } from './lobby.component';
import { SocketService } from '../socket/socket.service';
import { of } from 'rxjs';
import { provideLocationMocks } from '@angular/common/testing';

const mockPlayerProfile = {
  id: '123',
  nickname: 'TestPlayer',
  avatar: 'test-avatar.png',
  musicId: 'test-music-1',
  isReady: true,
};

describe('LobbyComponent', () => {
  let component: LobbyComponent;
  let fixture: ComponentFixture<LobbyComponent>;
  let socketServiceMock: jasmine.SpyObj<SocketService>;
  let router: Router;

  const routes = [
    { path: 'game', component: {} as any },
    { path: '', component: {} as any },
  ];

  beforeEach(async () => {
    socketServiceMock = jasmine.createSpyObj('SocketService', [
      'emit',
      'on',
      'getSocketId',
    ]);

    socketServiceMock.on.and.callFake((event: string) => {
      switch (event) {
        case 'gameStarted':
          return of({});
        case 'lobbyUpdate':
          return of({
            players: [],
            playerCount: 0,
            isGameStarted: false,
          });
        case 'gameError':
          return of('error message');
        default:
          return of({});
      }
    });

    socketServiceMock.getSocketId.and.returnValue('123');

    await TestBed.configureTestingModule({
      imports: [LobbyComponent],
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: SocketService, useValue: socketServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Base Tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.players).toEqual([]);
      expect(component.playerCount).toBe(0);
      expect(component.nickname).toBe('');
      expect(component.selectedMusic).toBe('');
    });

    it('should emit rejoinLobby on init', () => {
      component.ngOnInit();
      expect(socketServiceMock.emit).toHaveBeenCalledWith('rejoinLobby');
    });
  });

  describe('Socket Tests', () => {
    it('should handle lobby updates', fakeAsync(() => {
      const mockLobbyData = {
        players: [mockPlayerProfile],
        playerCount: 1,
        isGameStarted: false,
      };

      socketServiceMock.on.and.returnValue(of(mockLobbyData));
      component.ngOnInit();
      tick();

      expect(component.players.length).toBe(1);
      expect(component.playerCount).toBe(1);
    }));

    it('should handle game started event', fakeAsync(() => {
      const navigateSpy = spyOn(router, 'navigate');
      socketServiceMock.on.withArgs('gameStarted').and.returnValue(of({}));

      component.ngOnInit();
      tick();

      expect(navigateSpy).toHaveBeenCalledWith(['/game']);
    }));
  });

  describe('Music Tests', () => {
    beforeEach(() => {
      component.victoryMusics = [
        {
          id: 'test-music-1',
          name: 'Test Music',
          path: '/test/music.mp3',
        },
      ];
    });

    it('should handle music preview', () => {
      const mockAudio = {
        play: jasmine.createSpy('play'),
        addEventListener: jasmine.createSpy('addEventListener'),
        pause: jasmine.createSpy('pause'),
        currentTime: 0,
        volume: 0,
        duration: 0,
        ended: false,
        error: null,
        readyState: 0,
        src: '',
        load: jasmine.createSpy('load'),
        canPlayType: jasmine.createSpy('canPlayType'),
        fastSeek: jasmine.createSpy('fastSeek'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
      } as unknown as HTMLAudioElement;

      spyOn(window, 'Audio').and.returnValue(mockAudio);

      component.selectedMusic = 'test-music-1';
      component.previewSelectedMusic();

      expect(window.Audio).toHaveBeenCalledWith('/test/music.mp3');
      expect(mockAudio.volume).toBe(0.3);
      expect(mockAudio.play).toHaveBeenCalled();
      expect(component.isPlaying).toBeTrue();
    });

    it('should stop music preview', () => {
      const mockAudio = {
        pause: jasmine.createSpy('pause'),
        currentTime: 0,
      } as unknown as HTMLAudioElement;

      component['currentAudio'] = mockAudio;
      component.stopPreview();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect(component.isPlaying).toBeFalse();
    });
  });
});
