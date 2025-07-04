import { Routes } from '@angular/router';
import { Atelier } from './pages/atelier/atelier';
import { PauseCafe } from './pages/pause-cafee/pause-cafee';

export const routes: Routes = [
  { path: '', component: Atelier },
  { path: 'atelier', component: Atelier },
  { path: 'pause-cafee', component: PauseCafe }
];
