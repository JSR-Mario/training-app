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
        path: 'programs/:programId/days/:dayId',
        loadComponent: () => import('./features/programs/pages/day-detail/day-detail.component').then(m => m.DayDetailComponent)
      },
      {
        path: 'workout',
        loadComponent: () => import('./features/workout/pages/workout-dashboard/workout-dashboard.component').then(m => m.WorkoutDashboardComponent)
      },
      {
        path: 'workout/start',
        loadComponent: () => import('./features/workout/pages/start-session/start-session.component').then(m => m.StartSessionComponent)
      },
      {
        path: 'workout/:id',
        loadComponent: () => import('./features/workout/pages/active-workout/active-workout.component').then(m => m.ActiveWorkoutComponent)
      },
      {
        path: 'workout/:id/summary',
        loadComponent: () => import('./features/workout/pages/workout-summary/workout-summary.component').then(m => m.WorkoutSummaryComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/pages/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent)
      },
      {
        path: 'body-weight',
        loadComponent: () => import('./features/analytics/pages/body-weight-dashboard/body-weight-dashboard.component').then(m => m.BodyWeightDashboardComponent)
      },
      {
        path: 'cardio',
        loadComponent: () => import('./features/analytics/pages/cardio-dashboard/cardio-dashboard.component').then(m => m.CardioDashboardComponent)
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
