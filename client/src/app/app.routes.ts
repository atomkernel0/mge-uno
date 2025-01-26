import { Routes } from '@angular/router';
import { GameComponent } from './game/game.component';
import { LobbyComponent } from './lobby/lobby.component';

export const routes: Routes = [
  { path: '', component: LobbyComponent },
  {
    path: 'game',
    component: GameComponent,
  },
];
