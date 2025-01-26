interface VictoryMusic {
  readonly id: string;
  readonly name: string;
  readonly path: string;
}

export const victoryMusics: VictoryMusic[] = [
  {
    id: '01',
    name: 'HEAVY POWER',
    path: 'assets/winning_music/winning_music_01.mp3',
  },
  {
    id: '02',
    name: 'BACHI BACHI',
    path: 'assets/winning_music/winning_music_02.mp3',
  },
  {
    id: '03',
    name: 'MGEBOREA',
    path: 'assets/winning_music/winning_music_03.mp3',
  },
  {
    id: '04',
    name: 'TRON (SLOWED)',
    path: 'assets/winning_music/winning_music_04.mp3',
  },
  {
    id: '05',
    name: 'CSGO',
    path: 'assets/winning_music/winning_music_05.mp3',
  },
  {
    id: '06',
    name: 'TOTALITARIANISM II',
    path: 'assets/winning_music/winning_music_06.mp3',
  },
  {
    id: '07',
    name: 'PMC WAGNER',
    path: 'assets/winning_music/winning_music_07.mp3',
  },
  {
    id: '08',
    name: 'MGE STALIN',
    path: 'assets/winning_music/winning_music_08.mp3',
  },
  {
    id: '09',
    name: 'ASS WE CAN',
    path: 'assets/winning_music/winning_music_09.mp3',
  },
  {
    id: '10',
    name: 'VUHAHA',
    path: 'assets/winning_music/winning_music_10.mp3',
  },
] as const;
