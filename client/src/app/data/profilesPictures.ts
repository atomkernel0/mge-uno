export interface ProfilePicture {
  readonly id: string;
  readonly name: string;
  readonly path: string;
}

export const profilePictures: ProfilePicture[] = [
  {
    id: '01',
    name: '1',
    path: 'assets/profile_picture/profile_picture_01.png',
  },
  {
    id: '02',
    name: '2',
    path: 'assets/profile_picture/profile_picture_02.webp',
  },
  {
    id: '03',
    name: '3',
    path: 'assets/profile_picture/profile_picture_03.webp',
  },
  {
    id: '04',
    name: '4',
    path: 'assets/profile_picture/profile_picture_04.webp',
  },
  {
    id: '05',
    name: '5',
    path: 'assets/profile_picture/profile_picture_05.webp',
  },
  {
    id: '06',
    name: '6',
    path: 'assets/profile_picture/profile_picture_06.webp',
  },
  {
    id: '07',
    name: '7',
    path: 'assets/profile_picture/profile_picture_07.webp',
  },
] as const;
