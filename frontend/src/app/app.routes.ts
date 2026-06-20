import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { BaseLayoutComponent } from './layout/components/base-layout/base-layout.component';
import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    component: LoginComponent
  },
  {
    path: '',
    component: BaseLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'exercises',
        loadComponent: () => import('./features/exercises/pages/exercise-list/exercise-list.component').then(m => m.ExerciseListComponent)
      },
      {
        path: 'programs',
        loadComponent: () => import('./features/programs/pages/program-list/program-list.component').then(m => m.ProgramListComponent)
      },
      {
        path: 'programs/:id',
        loadComponent: () => import('./features/programs/pages/program-detail/program-detail.component').then(m => m.ProgramDetailComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
