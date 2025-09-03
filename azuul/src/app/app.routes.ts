import { Routes } from '@angular/router';
import { AteliersComponent} from './pages/atelier/atelier';
import { PauseCafe } from './pages/mes-coach/mes-coach';
import { Galerie } from './pages/galerie/galerie';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', component: AteliersComponent },
  { path: 'atelier', loadComponent: () => import('./pages/atelier/atelier').then(m => m.AteliersComponent), canActivate: [authGuard] },
  { path: 'mes-coach', component: PauseCafe, canActivate: [authGuard] },
  { path: 'galerie', component: Galerie, canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./pages/dashbord-admin/dashbord-admin').then(m => m.DashbordAdmin), canActivate: [authGuard, adminGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Register }
  
];
