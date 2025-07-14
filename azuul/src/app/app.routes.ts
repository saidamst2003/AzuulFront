import { Routes } from '@angular/router';
import { Atelier } from './pages/atelier/atelier';
import { PauseCafe } from './pages/pause-cafee/pause-cafee';
import { Galerie } from './pages/galerie/galerie';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Atelier },
  { path: 'atelier', component: Atelier, canActivate: [authGuard] },
  { path: 'pause-cafee', component: PauseCafe, canActivate: [authGuard] },
  { path: 'galerie', component: Galerie, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Register }
];
