import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitService } from '../../services/habit.service';
import { Habit, HabitRequest } from '../../models/habit.model';
import { HabitCardComponent } from '../../components/habit-card/habit-card.component';
import { HabitFormComponent } from '../../components/habit-form/habit-form.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [CommonModule, HabitCardComponent, HabitFormComponent],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 pb-20">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Habits</h1>
        </div>
        <button (click)="openForm()" class="solid-btn bg-accent-pos text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:opacity-90 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Habit
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pos"></div>
        </div>
      } @else if (habits().length === 0) {
        <div class="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">No habits yet</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">Create a habit to start tracking your streak.</p>
          <button (click)="openForm()" class="text-accent-pos font-bold hover:underline">Create first habit</button>
        </div>
      } @else {
        <!-- Daily Habits Section -->
        @if (dailyHabits().length > 0) {
          <section class="space-y-3">
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800 pb-2">Daily</h2>
            <div class="flex flex-col gap-3.5">
              @for (habit of dailyHabits(); track habit.id) {
                <app-habit-card
                  [habit]="habit"
                  [isCompletedToday]="isCompletedToday(habit)"
                  [isExpanded]="expandedHabitId() === habit.id"
                  (toggleExpand)="toggleExpand(habit.id)"
                  (toggleAction)="toggleHabit($event)"
                  (editAction)="openForm($event)"
                  (deleteAction)="deleteHabit($event)">
                </app-habit-card>
              }
            </div>
          </section>
        }

        <!-- Weekly Habits Section -->
        @if (weeklyHabits().length > 0) {
          <section class="space-y-3">
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800 pb-2">Weekly</h2>
            <div class="flex flex-col gap-3.5">
              @for (habit of weeklyHabits(); track habit.id) {
                <app-habit-card
                  [habit]="habit"
                  [isCompletedToday]="isCompletedToday(habit)"
                  [isExpanded]="expandedHabitId() === habit.id"
                  (toggleExpand)="toggleExpand(habit.id)"
                  (toggleAction)="toggleHabit($event)"
                  (editAction)="openForm($event)"
                  (deleteAction)="deleteHabit($event)">
                </app-habit-card>
              }
            </div>
          </section>
        }

        <!-- Monthly Habits Section -->
        @if (monthlyHabits().length > 0) {
          <section class="space-y-3">
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800 pb-2">Monthly</h2>
            <div class="flex flex-col gap-3.5">
              @for (habit of monthlyHabits(); track habit.id) {
                <app-habit-card
                  [habit]="habit"
                  [isCompletedToday]="isCompletedToday(habit)"
                  [isExpanded]="expandedHabitId() === habit.id"
                  (toggleExpand)="toggleExpand(habit.id)"
                  (toggleAction)="toggleHabit($event)"
                  (editAction)="openForm($event)"
                  (deleteAction)="deleteHabit($event)">
                </app-habit-card>
              }
            </div>
          </section>
        }
      }
    </div>

    @if (showForm()) {
      <app-habit-form
        [habit]="editingHabit()"
        (saveAction)="saveHabit($event)"
        (cancelAction)="closeForm()">
      </app-habit-form>
    }
  `
})
export class HabitListComponent implements OnInit {
  private habitService = inject(HabitService);
  private titleService = inject(Title);

  habits = signal<Habit[]>([]);
  loading = signal(true);
  
  showForm = signal(false);
  editingHabit = signal<Habit | null>(null);

  dailyHabits = computed(() => this.habits().filter(h => h.frequency === 'DAILY'));
  weeklyHabits = computed(() => this.habits().filter(h => h.frequency === 'WEEKLY'));
  monthlyHabits = computed(() => this.habits().filter(h => h.frequency === 'MONTHLY'));

  expandedHabitId = signal<string | null>(null);

  toggleExpand(habitId: string) {
    this.expandedHabitId.update(current => current === habitId ? null : habitId);
  }

  private getTodayString(): string {
    const d = new Date();
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  ngOnInit() {
    this.titleService.setTitle('Habits | Yes');
    this.loadHabits();
  }

  loadHabits() {
    this.loading.set(true);
    this.habitService.getHabits(this.getTodayString()).subscribe({
      next: (data) => {
        this.habits.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  isCompletedToday(habit: Habit): boolean {
    const today = this.getTodayString();
    return habit.completedDates.includes(today);
  }

  toggleHabit(habit: Habit) {
    const today = this.getTodayString();
    this.habitService.toggleLog(habit.id, today, today).subscribe({
      next: (updatedHabit) => {
        this.habits.update(list => list.map(h => h.id === habit.id ? updatedHabit : h));
      }
    });
  }

  openForm(habit?: Habit) {
    this.editingHabit.set(habit || null);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingHabit.set(null);
  }

  saveHabit(request: HabitRequest) {
    const current = this.editingHabit();
    const saveObs = current 
      ? this.habitService.updateHabit(current.id, request)
      : this.habitService.createHabit(request);

    saveObs.subscribe({
      next: () => {
        this.loadHabits();
        this.closeForm();
      }
    });
  }

  deleteHabit(habit: Habit) {
    if (confirm(`Are you sure you want to delete '${habit.title}'?`)) {
      this.habitService.deleteHabit(habit.id).subscribe({
        next: () => {
          this.habits.update(list => list.filter(h => h.id !== habit.id));
        }
      });
    }
  }
}
