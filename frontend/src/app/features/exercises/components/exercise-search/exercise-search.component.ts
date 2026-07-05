import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Exercise } from '../../../../core/types/training.types';
import { ExerciseService } from '../../services/exercise.service';
import { debounceTime } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-exercise-search',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full flex flex-col">
    <form [formGroup]="searchForm" class="shrink-0 mb-4">
      <!-- Text Search -->
      <div class="relative">
        <input
          type="text"
          formControlName="query"
          placeholder="Search exercise by name..."
          class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white pl-11 shadow-inner transition-all"
        >
        <span class="absolute left-4 top-3.5 text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </span>
      </div>
    </form>
  
    <!-- Results List -->
    <div class="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
      @if (loading()) {
        <div class="flex justify-center py-10">
          <div class="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      }
      @if (!loading() && filteredExercises().length === 0) {
        <div class="text-center text-sm text-slate-500 py-10 flex flex-col items-center">
          <svg class="w-12 h-12 mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p>No exercises found.</p>
        </div>
      }

      <!-- Flat list of exercises -->
      @for (ex of filteredExercises(); track ex.id) {
        <button 
          type="button"
          [disabled]="excludeIds().includes(ex.id)"
          (click)="exerciseSelected.emit(ex)"
          class="w-full text-left bg-slate-900/40 hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700/50 rounded-xl p-3 transition-all flex items-center justify-between group"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-200 group-hover:text-white transition-colors">{{ ex.name }}</span>
              @if (ex.unilateral) {
                <span class="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 rounded-md font-semibold border border-amber-500/30">UNI</span>
              }
            </div>
            
            <div class="text-[11px] text-slate-400 flex items-center gap-3 mt-1.5 font-medium">
              @if (ex.targets && ex.targets.length > 0) {
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  {{ formatTargetName(ex.targets[0].bodyPart) }}
                </span>
              }
              
              @if (ex.equipmentBrand) {
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {{ ex.equipmentBrand }}
                </span>
              }
              
              @if (ex.spinalLoading) {
                <span class="text-rose-400 font-bold tracking-wide">SPINAL</span>
              }
              
              @if (ex.averageRating) {
                <span class="text-amber-400 flex items-center gap-0.5">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  {{ ex.averageRating | number:'1.1-1' }}
                </span>
              }
            </div>
          </div>
          
          <!-- Actions / Status -->
          <div class="flex-shrink-0 ml-4">
            @if (!excludeIds().includes(ex.id)) {
              <div class="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
            } @else {
              <div class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md tracking-wider">
                ADDED
              </div>
            }
          </div>
        </button>
      }
    </div>
  </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.4); 
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(71, 85, 105, 0.6); 
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.8); 
    }
  `]
})
export class ExerciseSearchComponent implements OnInit {
  readonly excludeIds = input<string[]>([]);
  readonly exerciseSelected = output<Exercise>();

  private fb = inject(FormBuilder);
  private exerciseService = inject(ExerciseService);

  loading = signal<boolean>(false);
  allExercises: Exercise[] = [];
  filteredExercises = signal<Exercise[]>([]);

  searchForm = this.fb.group({
    query: ['']
  });

  ngOnInit() {
    this.loading.set(true);
    this.exerciseService.getExercises().subscribe(data => {
      // Sort alphabetically by default
      this.allExercises = data.sort((a, b) => a.name.localeCompare(b.name));
      this.filteredExercises.set(this.allExercises);
      this.loading.set(false);
    });

    this.searchForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(formValue => {
      this.applyFilters(formValue.query || '');
    });
  }

  formatTargetName(partCode: string): string {
    if (!partCode) return '';
    return partCode.replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private applyFilters(query: string) {
    query = query.toLowerCase().trim();
    if (!query) {
      this.filteredExercises.set(this.allExercises);
      return;
    }

    const result = this.allExercises.filter(ex => 
      ex.name.toLowerCase().includes(query) || 
      (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(query)) ||
      (ex.targets && ex.targets.some(t => this.formatTargetName(t.bodyPart).toLowerCase().includes(query)))
    );

    this.filteredExercises.set(result);
  }
}
