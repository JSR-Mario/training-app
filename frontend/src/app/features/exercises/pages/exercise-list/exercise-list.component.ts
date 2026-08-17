import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ExerciseService } from '../../services/exercise.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Exercise } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';

export type ScopeFilter = 'ALL' | 'MY' | 'PUBLIC';
export type BooleanFilter = 'ALL' | 'YES' | 'NO';
export type SortOption = 'RATING_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'TARGETS_DESC';
export type ViewMode = 'LIST' | 'GRID';

@Component({
  standalone: true,
  selector: 'app-exercise-list',
  imports: [CommonModule, ExerciseFormComponent, FormsModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">

      <!-- Header & Primary Action -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-tight">Exercises</h1>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Explore, filter, and manage your exercise catalog</p>
        </div>
        <button
          (click)="openForm()"
          class="w-full sm:w-auto px-6 py-3 bg-accent-pos hover:opacity-90 text-white font-bold rounded-xl transition-all transform hover:-translate-y-0.5 shadow-lg shadow-accent-pos/20 flex items-center justify-center gap-2 solid-btn"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span>Add Exercise</span>
        </button>
      </div>

      <!-- Add / Edit Exercise Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <app-exercise-form
              [exercise]="selectedExercise()"
              (saveExercise)="onSaveExercise($event)"
              (cancelForm)="closeForm()"
            ></app-exercise-form>
          </div>
        </div>
      }

      <!-- Main Controls Toolbar -->
      <div class="solid-card p-4 sm:p-5 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-sm space-y-4">
        <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          <!-- Main Search Bar (Searches by Name, Brand, or Target Muscle) -->
          <div class="relative flex-1 group">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent-pos transition-colors">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search exercises by name, brand or muscle target..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              class="w-full !pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-accent-pos text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all text-sm solid-input"
            >
            @if (searchQuery()) {
              <button
                type="button"
                (click)="searchQuery.set('')"
                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Clear search"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>

          <!-- Actions Group (Filter Toggle, Sort, View Mode) -->
          <div class="flex flex-wrap items-center gap-2.5">
            
            <!-- Toggle Filters Drawer Button (Visible ONLY on mobile/small screens < lg) -->
            <button
              type="button"
              (click)="showFilters.set(!showFilters())"
              class="lg:hidden px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all"
              [class.bg-accent-pos/10]="showFilters() || activeFilterCount() > 0"
              [class.border-accent-pos]="showFilters() || activeFilterCount() > 0"
              [class.text-accent-pos]="showFilters() || activeFilterCount() > 0"
              [class.bg-white]="!showFilters() && activeFilterCount() === 0"
              [class.dark:bg-gray-900]="!showFilters() && activeFilterCount() === 0"
              [class.border-gray-300]="!showFilters() && activeFilterCount() === 0"
              [class.dark:border-gray-700]="!showFilters() && activeFilterCount() === 0"
              [class.text-gray-700]="!showFilters() && activeFilterCount() === 0"
              [class.dark:text-gray-300]="!showFilters() && activeFilterCount() === 0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              <span>Filters</span>
              @if (activeFilterCount() > 0) {
                <span class="w-5 h-5 rounded-full bg-accent-pos text-white text-xs flex items-center justify-center font-bold">
                  {{ activeFilterCount() }}
                </span>
              }
            </button>

            <!-- Sort By Selector -->
            <div class="relative">
              <select
                aria-label="Sort options"
                [ngModel]="sortBy()"
                (ngModelChange)="sortBy.set($event)"
                class="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-accent-pos outline-none cursor-pointer transition-all pr-8 appearance-none"
              >
                <option value="RATING_DESC">⭐ Top Rated Stars</option>
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="NAME_DESC">Name (Z-A)</option>
                <option value="TARGETS_DESC">Most Muscle Targets</option>
              </select>
              <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <!-- View Mode Switcher: Default = LIST, Alternative = GRID -->
            <div class="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-300 dark:border-gray-700">
              <button
                type="button"
                (click)="viewMode.set('LIST')"
                class="p-2 rounded-lg transition-colors"
                [class.bg-white]="viewMode() === 'LIST'"
                [class.dark:bg-gray-800]="viewMode() === 'LIST'"
                [class.text-accent-pos]="viewMode() === 'LIST'"
                [class.shadow-sm]="viewMode() === 'LIST'"
                [class.text-gray-400]="viewMode() !== 'LIST'"
                title="Compact List View (Default)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <button
                type="button"
                (click)="viewMode.set('GRID')"
                class="p-2 rounded-lg transition-colors"
                [class.bg-white]="viewMode() === 'GRID'"
                [class.dark:bg-gray-800]="viewMode() === 'GRID'"
                [class.text-accent-pos]="viewMode() === 'GRID'"
                [class.shadow-sm]="viewMode() === 'GRID'"
                [class.text-gray-400]="viewMode() !== 'GRID'"
                title="Grid Card View"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              </button>
            </div>

          </div>
        </div>

        <!-- Advanced Filters Drawer (Open by default on Desktop lg:, collapsible on Mobile < lg) -->
        <div
          class="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4 transition-all duration-200 lg:!block"
          [class.hidden]="!showFilters()"
        >
            
            <!-- Equipment Brand Dropdown -->
            <div class="max-w-md">
              <label for="brandFilterSelect" class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Equipment Brand</label>
              <select
                id="brandFilterSelect"
                [ngModel]="brandFilter()"
                (ngModelChange)="brandFilter.set($event)"
                class="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-accent-pos"
              >
                <option value="">All Brands</option>
                @for (brand of availableBrands(); track brand) {
                  <option [value]="brand">{{ brand }}</option>
                }
              </select>
            </div>

            <!-- Single-Click Carousel Toggle Buttons for Ownership & Mechanics -->
            <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
              
              <div class="flex flex-wrap items-center gap-3">
                
                <!-- Ownership Carousel Toggle -->
                <button
                  type="button"
                  (click)="cycleScopeFilter()"
                  class="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                  [class.bg-accent-pos/15]="scopeFilter() === 'MY'"
                  [class.border-accent-pos/40]="scopeFilter() === 'MY'"
                  [class.text-accent-pos]="scopeFilter() === 'MY'"
                  [class.bg-purple-500/15]="scopeFilter() === 'PUBLIC'"
                  [class.border-purple-500/40]="scopeFilter() === 'PUBLIC'"
                  [class.text-purple-600]="scopeFilter() === 'PUBLIC'"
                  [class.dark:text-purple-400]="scopeFilter() === 'PUBLIC'"
                  [class.bg-white]="scopeFilter() === 'ALL'"
                  [class.dark:bg-gray-900]="scopeFilter() === 'ALL'"
                  [class.border-gray-300]="scopeFilter() === 'ALL'"
                  [class.dark:border-gray-700]="scopeFilter() === 'ALL'"
                  [class.text-gray-700]="scopeFilter() === 'ALL'"
                  [class.dark:text-gray-300]="scopeFilter() === 'ALL'"
                  title="Click to cycle: ALL -> MY -> PUBLIC"
                >
                  <span>Ownership:</span>
                  <span class="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wide"
                    [class.bg-accent-pos]="scopeFilter() === 'MY'"
                    [class.bg-purple-500]="scopeFilter() === 'PUBLIC'"
                    [class.text-white]="scopeFilter() !== 'ALL'"
                    [class.bg-gray-200]="scopeFilter() === 'ALL'"
                    [class.dark:bg-gray-700]="scopeFilter() === 'ALL'"
                  >
                    {{ scopeFilter() === 'MY' ? 'My Custom' : scopeFilter() }}
                  </span>
                </button>

                <!-- Unilateral Carousel Toggle -->
                <button
                  type="button"
                  (click)="cycleUnilateralFilter()"
                  class="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                  [class.bg-amber-500/15]="unilateralFilter() === 'YES'"
                  [class.border-amber-500/40]="unilateralFilter() === 'YES'"
                  [class.text-amber-600]="unilateralFilter() === 'YES'"
                  [class.dark:text-amber-400]="unilateralFilter() === 'YES'"
                  [class.bg-gray-100]="unilateralFilter() === 'NO'"
                  [class.dark:bg-gray-800]="unilateralFilter() === 'NO'"
                  [class.border-gray-300]="unilateralFilter() === 'NO'"
                  [class.dark:border-gray-700]="unilateralFilter() === 'NO'"
                  [class.text-gray-500]="unilateralFilter() === 'NO'"
                  [class.bg-white]="unilateralFilter() === 'ALL'"
                  [class.dark:bg-gray-900]="unilateralFilter() === 'ALL'"
                  [class.border-gray-300]="unilateralFilter() === 'ALL'"
                  [class.dark:border-gray-700]="unilateralFilter() === 'ALL'"
                  [class.text-gray-700]="unilateralFilter() === 'ALL'"
                  [class.dark:text-gray-300]="unilateralFilter() === 'ALL'"
                  title="Click to cycle: ALL -> YES -> NO"
                >
                  <span>Unilateral:</span>
                  <span class="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wide"
                    [class.bg-amber-500]="unilateralFilter() === 'YES'"
                    [class.text-white]="unilateralFilter() === 'YES'"
                    [class.bg-gray-200]="unilateralFilter() !== 'YES'"
                    [class.dark:bg-gray-700]="unilateralFilter() !== 'YES'"
                  >
                    {{ unilateralFilter() }}
                  </span>
                </button>

                <!-- Spinal Load Carousel Toggle -->
                <button
                  type="button"
                  (click)="cycleSpinalLoadingFilter()"
                  class="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                  [class.bg-red-500/15]="spinalLoadingFilter() === 'YES'"
                  [class.border-red-500/40]="spinalLoadingFilter() === 'YES'"
                  [class.text-red-600]="spinalLoadingFilter() === 'YES'"
                  [class.dark:text-red-400]="spinalLoadingFilter() === 'YES'"
                  [class.bg-gray-100]="spinalLoadingFilter() === 'NO'"
                  [class.dark:bg-gray-800]="spinalLoadingFilter() === 'NO'"
                  [class.border-gray-300]="spinalLoadingFilter() === 'NO'"
                  [class.dark:border-gray-700]="spinalLoadingFilter() === 'NO'"
                  [class.text-gray-500]="spinalLoadingFilter() === 'NO'"
                  [class.bg-white]="spinalLoadingFilter() === 'ALL'"
                  [class.dark:bg-gray-900]="spinalLoadingFilter() === 'ALL'"
                  [class.border-gray-300]="spinalLoadingFilter() === 'ALL'"
                  [class.dark:border-gray-700]="spinalLoadingFilter() === 'ALL'"
                  [class.text-gray-700]="spinalLoadingFilter() === 'ALL'"
                  [class.dark:text-gray-300]="spinalLoadingFilter() === 'ALL'"
                  title="Click to cycle: ALL -> YES -> NO"
                >
                  <span>Spinal Load:</span>
                  <span class="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wide"
                    [class.bg-red-500]="spinalLoadingFilter() === 'YES'"
                    [class.text-white]="spinalLoadingFilter() === 'YES'"
                    [class.bg-gray-200]="spinalLoadingFilter() !== 'YES'"
                    [class.dark:bg-gray-700]="spinalLoadingFilter() !== 'YES'"
                  >
                    {{ spinalLoadingFilter() }}
                  </span>
                </button>

                <!-- Bodyweight Carousel Toggle -->
                <button
                  type="button"
                  (click)="cycleBodyweightFilter()"
                  class="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                  [class.bg-blue-500/15]="bodyweightFilter() === 'YES'"
                  [class.border-blue-500/40]="bodyweightFilter() === 'YES'"
                  [class.text-blue-600]="bodyweightFilter() === 'YES'"
                  [class.dark:text-blue-400]="bodyweightFilter() === 'YES'"
                  [class.bg-gray-100]="bodyweightFilter() === 'NO'"
                  [class.dark:bg-gray-800]="bodyweightFilter() === 'NO'"
                  [class.border-gray-300]="bodyweightFilter() === 'NO'"
                  [class.dark:border-gray-700]="bodyweightFilter() === 'NO'"
                  [class.text-gray-500]="bodyweightFilter() === 'NO'"
                  [class.bg-white]="bodyweightFilter() === 'ALL'"
                  [class.dark:bg-gray-900]="bodyweightFilter() === 'ALL'"
                  [class.border-gray-300]="bodyweightFilter() === 'ALL'"
                  [class.dark:border-gray-700]="bodyweightFilter() === 'ALL'"
                  [class.text-gray-700]="bodyweightFilter() === 'ALL'"
                  [class.dark:text-gray-300]="bodyweightFilter() === 'ALL'"
                  title="Click to cycle: ALL -> YES -> NO"
                >
                  <span>Bodyweight:</span>
                  <span class="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wide"
                    [class.bg-blue-500]="bodyweightFilter() === 'YES'"
                    [class.text-white]="bodyweightFilter() === 'YES'"
                    [class.bg-gray-200]="bodyweightFilter() !== 'YES'"
                    [class.dark:bg-gray-700]="bodyweightFilter() !== 'YES'"
                  >
                    {{ bodyweightFilter() }}
                  </span>
                </button>

              </div>

              <!-- Reset All Filters -->
              @if (activeFilterCount() > 0) {
                <button
                  type="button"
                  (click)="resetFilters()"
                  class="text-xs font-bold text-accent-neg hover:underline flex items-center gap-1"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Reset All Filters
                </button>
              }

            </div>

        </div>

        <!-- Active Filter Pills Bar -->
        @if (activeFilterCount() > 0 && !showFilters()) {
          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800 text-xs">
            <span class="text-gray-400 font-semibold">Active:</span>
            
            @if (scopeFilter() !== 'ALL') {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-pos/10 text-accent-pos font-bold">
                Scope: {{ scopeFilter() }}
                <button (click)="scopeFilter.set('ALL')" class="hover:text-black dark:hover:text-white">&times;</button>
              </span>
            }
            @if (brandFilter()) {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-pos/10 text-accent-pos font-bold">
                Brand: {{ brandFilter() }}
                <button (click)="brandFilter.set('')" class="hover:text-black dark:hover:text-white">&times;</button>
              </span>
            }
            @if (unilateralFilter() !== 'ALL') {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                Uni: {{ unilateralFilter() }}
                <button (click)="unilateralFilter.set('ALL')" class="hover:text-black dark:hover:text-white">&times;</button>
              </span>
            }
            @if (spinalLoadingFilter() !== 'ALL') {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 font-bold">
                Spinal: {{ spinalLoadingFilter() }}
                <button (click)="spinalLoadingFilter.set('ALL')" class="hover:text-black dark:hover:text-white">&times;</button>
              </span>
            }
            @if (bodyweightFilter() !== 'ALL') {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 font-bold">
                Bodyweight: {{ bodyweightFilter() }}
                <button (click)="bodyweightFilter.set('ALL')" class="hover:text-black dark:hover:text-white">&times;</button>
              </span>
            }

            <button
              (click)="resetFilters()"
              class="ml-auto text-accent-neg hover:underline font-bold"
            >Clear all</button>
          </div>
        }

      </div>

      <!-- Results Count & Active View Bar -->
      <div class="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">
        <span>Showing {{ filteredExercises().length }} of {{ exercises().length }} exercises</span>
        @if (sortBy() === 'RATING_DESC') {
          <span class="flex items-center gap-1 text-amber-500 font-bold">
            <svg class="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Sorted by Top Rated Stars
          </span>
        }
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="w-10 h-10 border-4 border-accent-pos/30 border-t-accent-pos rounded-full animate-spin"></div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">Loading exercises catalog...</p>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && filteredExercises().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700 rounded-2xl border-dashed">
          <div class="w-16 h-16 bg-accent-pos/10 rounded-full flex items-center justify-center mb-4 text-accent-pos">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-black dark:text-white mb-2">No exercises found</h3>
          <p class="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            Try adjusting your search terms or clearing your filters to see more results.
          </p>
          <button
            (click)="resetFilters(); searchQuery.set('')"
            class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-bold rounded-xl transition-all solid-btn"
          >
            Reset Search & Filters
          </button>
        </div>
      }

      <!-- DEFAULT: COMPACT LIST VIEW -->
      @if (!isLoading() && filteredExercises().length > 0 && viewMode() === 'LIST') {
        <div class="solid-card rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
                <tr>
                  <th class="py-3 px-4">Rating</th>
                  <th class="py-3 px-4">Exercise Name</th>
                  <th class="py-3 px-4">Brand</th>
                  <th class="py-3 px-4">Targets</th>
                  <th class="py-3 px-4">Tags</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                @for (ex of filteredExercises(); track ex.id) {
                  <tr
                    (click)="editExercise(ex)"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                  >
                    <!-- Rating -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-xs bg-amber-500/10 text-amber-500">
                        <svg class="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span>{{ (ex.averageRating ?? 5.0) | number:'1.1-1' }}</span>
                      </div>
                    </td>

                    <!-- Name -->
                    <td class="py-3 px-4 font-bold text-gray-900 dark:text-gray-100 group-hover:text-accent-pos transition-colors">
                      <div class="inline-flex items-center gap-1.5">
                        @if (ex.isPublic) {
                          <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        }
                        <span>{{ ex.name }}</span>
                      </div>
                    </td>

                    <!-- Brand -->
                    <td class="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {{ ex.equipmentBrand || '-' }}
                    </td>

                    <!-- Targets -->
                    <td class="py-3 px-4">
                      @if (ex.targets && ex.targets.length > 0) {
                        <div class="flex flex-wrap gap-1">
                          @for (t of ex.targets; track t.bodyPart) {
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-accent-pos/10 text-accent-pos">
                              {{ formatPartName(t.bodyPart) }}
                            </span>
                          }
                        </div>
                      } @else {
                        <span class="text-xs text-gray-400 italic">-</span>
                      }
                    </td>

                    <!-- Tags -->
                    <td class="py-3 px-4">
                      <div class="flex flex-wrap gap-1">
                        @if (ex.unilateral) { <span class="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-500 rounded">UNI</span> }
                        @if (ex.isPublic) { <span class="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-500 rounded">PUBLIC</span> }
                        @if (ex.spinalLoading) { <span class="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-500 rounded">SPINAL</span> }
                        @if (ex.isBodyweight) { <span class="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-500 rounded">BW</span> }
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-3 text-xs font-semibold">
                        <a
                          [routerLink]="['/analytics']" [queryParams]="{ exerciseId: ex.id }"
                          (click)="$event.stopPropagation()"
                          class="text-accent-pos hover:underline"
                        >Analytics</a>

                        @if (canEdit(ex)) {
                          <button
                            (click)="editExercise(ex); $event.stopPropagation()"
                            class="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                          >Edit</button>
                          <button
                            (click)="deleteExercise(ex.id); $event.stopPropagation()"
                            class="text-accent-neg hover:underline"
                          >Delete</button>
                        } @else {
                          <button
                            (click)="editExercise(ex); $event.stopPropagation()"
                            class="text-gray-400 hover:text-black dark:hover:text-white"
                          >Details</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ALTERNATIVE: GRID CARD VIEW -->
      @if (!isLoading() && filteredExercises().length > 0 && viewMode() === 'GRID') {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          @for (ex of filteredExercises(); track ex.id) {
            <div
              tabindex="0"
              (keydown.enter)="editExercise(ex)"
              (click)="editExercise(ex)"
              class="solid-card border border-gray-300 dark:border-gray-700 hover:border-accent-pos rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden"
            >
              
              <!-- Header Row (Name & Star Rating) -->
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <h3 class="font-bold text-gray-900 dark:text-gray-100 group-hover:text-accent-pos transition-colors text-base leading-snug truncate inline-flex items-center gap-1.5" [title]="ex.name">
                    @if (ex.isPublic) {
                      <svg class="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    }
                    <span class="truncate">{{ ex.name }}</span>
                  </h3>
                  
                  <!-- Rating Badge -->
                  <div
                    class="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 font-extrabold text-xs shadow-sm"
                    [class.bg-amber-500/15]="(ex.averageRating ?? 5) >= 7"
                    [class.text-amber-500]="(ex.averageRating ?? 5) >= 7"
                    [class.bg-blue-500/15]="(ex.averageRating ?? 5) < 7 && (ex.averageRating ?? 5) >= 5"
                    [class.text-blue-500]="(ex.averageRating ?? 5) < 7 && (ex.averageRating ?? 5) >= 5"
                    [class.bg-gray-500/15]="(ex.averageRating ?? 5) < 5"
                    [class.text-gray-400]="(ex.averageRating ?? 5) < 5"
                    title="Average Star Rating (1-10)"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>{{ (ex.averageRating ?? 5.0) | number:'1.1-1' }}</span>
                  </div>
                </div>

                <!-- Brand & Property Pills -->
                <div class="flex flex-wrap gap-1.5 mb-3">
                  @if (ex.equipmentBrand) {
                    <span class="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-700 truncate max-w-[130px]">
                      {{ ex.equipmentBrand }}
                    </span>
                  }
                  @if (ex.unilateral) {
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 rounded-md border border-amber-500/30">
                      UNI
                    </span>
                  }
                  @if (ex.isPublic) {
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-md border border-purple-500/30">
                      PUBLIC
                    </span>
                  }
                  @if (ex.spinalLoading) {
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-500 dark:text-red-400 rounded-md border border-red-500/30">
                      SPINAL
                    </span>
                  }
                  @if (ex.isBodyweight) {
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-md border border-blue-500/30">
                      BW
                    </span>
                  }
                </div>

                <!-- Muscle Targets Chips -->
                @if (ex.targets && ex.targets.length > 0) {
                  <div class="flex flex-wrap gap-1 mb-3">
                    @for (target of ex.targets; track target.bodyPart) {
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent-pos/10 text-accent-pos border border-accent-pos/20">
                        {{ formatPartName(target.bodyPart) }}
                      </span>
                    }
                  </div>
                } @else {
                  <div class="text-[11px] text-gray-400 italic mb-3">Uncategorized</div>
                }

                <!-- PR Record Badge Preview -->
                @if (ex.personalRecords && ex.personalRecords.length > 0) {
                  <div class="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between">
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                      Best PR
                    </span>
                    <span>{{ ex.personalRecords[0].weightKg }}kg &times; {{ ex.personalRecords[0].reps }}</span>
                  </div>
                }
              </div>

              <!-- Footer Row Actions -->
              <div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800 text-xs font-semibold">
                <a
                  [routerLink]="['/analytics']" [queryParams]="{ exerciseId: ex.id }"
                  (click)="$event.stopPropagation()"
                  class="flex items-center gap-1 text-accent-pos hover:opacity-80 transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  Analytics
                </a>

                <div class="flex items-center gap-2">
                  @if (canEdit(ex)) {
                    <button
                      (click)="editExercise(ex); $event.stopPropagation()"
                      class="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                      title="Edit Exercise"
                    >
                      Edit
                    </button>
                    <button
                      (click)="deleteExercise(ex.id); $event.stopPropagation()"
                      class="text-accent-neg hover:opacity-80 transition-colors"
                      title="Delete Exercise"
                    >
                      Delete
                    </button>
                  } @else {
                    <button
                      (click)="editExercise(ex); $event.stopPropagation()"
                      class="text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Details
                    </button>
                  }
                </div>
              </div>

            </div>
          }
        </div>
      }

    </div>
  `
})
export class ExerciseListComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  authService = inject(AuthService);

  exercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  
  showForm = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  // Filters State
  searchQuery = signal<string>('');
  scopeFilter = signal<ScopeFilter>('ALL');

  brandFilter = signal<string>('');
  unilateralFilter = signal<BooleanFilter>('ALL');
  spinalLoadingFilter = signal<BooleanFilter>('ALL');
  bodyweightFilter = signal<BooleanFilter>('ALL');
  
  sortBy = signal<SortOption>('RATING_DESC');
  viewMode = signal<ViewMode>('LIST');
  showFilters = signal<boolean>(false);

  myExercisesCount = computed(() => this.exercises().filter(ex => !ex.isPublic).length);
  publicExercisesCount = computed(() => this.exercises().filter(ex => ex.isPublic).length);

  availableBrands = computed(() => {
    const set = new Set<string>();
    for (const ex of this.exercises()) {
      if (ex.equipmentBrand && ex.equipmentBrand.trim()) {
        set.add(ex.equipmentBrand.trim());
      }
    }
    return Array.from(set).sort();
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.scopeFilter() !== 'ALL') count++;
    if (this.brandFilter()) count++;
    if (this.unilateralFilter() !== 'ALL') count++;
    if (this.spinalLoadingFilter() !== 'ALL') count++;
    if (this.bodyweightFilter() !== 'ALL') count++;
    return count;
  });

  filteredExercises = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const scope = this.scopeFilter();
    const brand = this.brandFilter();
    const unilateral = this.unilateralFilter();
    const spinal = this.spinalLoadingFilter();
    const bodyweight = this.bodyweightFilter();
    const sort = this.sortBy();

    const list = this.exercises().filter(ex => {
      // Main search query filter (matches Name, Brand, or Muscle Target)
      if (query) {
        const matchName = ex.name.toLowerCase().includes(query);
        const matchBrand = ex.equipmentBrand ? ex.equipmentBrand.toLowerCase().includes(query) : false;
        const matchTarget = ex.targets ? ex.targets.some(t => this.formatPartName(t.bodyPart).toLowerCase().includes(query)) : false;
        if (!matchName && !matchBrand && !matchTarget) return false;
      }

      // Scope filter
      if (scope === 'MY' && ex.isPublic) return false;
      if (scope === 'PUBLIC' && !ex.isPublic) return false;

      // Brand filter
      if (brand && ex.equipmentBrand !== brand) {
        return false;
      }

      // Unilateral filter
      if (unilateral === 'YES' && !ex.unilateral) return false;
      if (unilateral === 'NO' && ex.unilateral) return false;

      // Spinal loading filter
      if (spinal === 'YES' && !ex.spinalLoading) return false;
      if (spinal === 'NO' && ex.spinalLoading) return false;

      // Bodyweight filter
      if (bodyweight === 'YES' && !ex.isBodyweight) return false;
      if (bodyweight === 'NO' && ex.isBodyweight) return false;

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sort === 'RATING_DESC') {
        const ratingA = a.averageRating ?? 5.0;
        const ratingB = b.averageRating ?? 5.0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return a.name.localeCompare(b.name);
      }
      if (sort === 'NAME_ASC') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'NAME_DESC') {
        return b.name.localeCompare(a.name);
      }
      if (sort === 'TARGETS_DESC') {
        const targetsA = a.targets?.length ?? 0;
        const targetsB = b.targets?.length ?? 0;
        if (targetsB !== targetsA) return targetsB - targetsA;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  });

  ngOnInit() {
    this.loadExercises();
  }

  loadExercises() {
    this.isLoading.set(true);
    this.exerciseService.getExercises().subscribe({
      next: (data) => {
        this.exercises.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load exercises', err);
        this.isLoading.set(false);
      }
    });
  }

  cycleScopeFilter() {
    const current = this.scopeFilter();
    if (current === 'ALL') this.scopeFilter.set('MY');
    else if (current === 'MY') this.scopeFilter.set('PUBLIC');
    else this.scopeFilter.set('ALL');
  }

  cycleUnilateralFilter() {
    const current = this.unilateralFilter();
    if (current === 'ALL') this.unilateralFilter.set('YES');
    else if (current === 'YES') this.unilateralFilter.set('NO');
    else this.unilateralFilter.set('ALL');
  }

  cycleSpinalLoadingFilter() {
    const current = this.spinalLoadingFilter();
    if (current === 'ALL') this.spinalLoadingFilter.set('YES');
    else if (current === 'YES') this.spinalLoadingFilter.set('NO');
    else this.spinalLoadingFilter.set('ALL');
  }

  cycleBodyweightFilter() {
    const current = this.bodyweightFilter();
    if (current === 'ALL') this.bodyweightFilter.set('YES');
    else if (current === 'YES') this.bodyweightFilter.set('NO');
    else this.bodyweightFilter.set('ALL');
  }

  resetFilters() {
    this.scopeFilter.set('ALL');
    this.brandFilter.set('');
    this.unilateralFilter.set('ALL');
    this.spinalLoadingFilter.set('ALL');
    this.bodyweightFilter.set('ALL');
  }

  formatPartName(partCode: string): string {
    if (!partCode) return '';
    return partCode.replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  openForm() {
    this.selectedExercise.set(null);
    this.showForm.set(true);
  }

  editExercise(exercise: Exercise) {
    this.selectedExercise.set(exercise);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedExercise.set(null);
  }

  canEdit(exercise: Exercise): boolean {
    return !exercise.isPublic || this.authService.isAdmin;
  }

  onSaveExercise(formData: { name: string; equipmentBrand: string; unilateral: boolean; spinalLoading?: boolean; isBodyweight?: boolean; isPublic: boolean; targets: { id?: string; bodyPart: string; targetValue: number }[] }) {
    this.isLoading.set(true);
    const exercise = this.selectedExercise();
    
    const exercisePayload = {
      name: formData.name,
      equipmentBrand: formData.equipmentBrand || undefined,
      unilateral: formData.unilateral,
      spinalLoading: formData.spinalLoading || false,
      isBodyweight: formData.isBodyweight || false,
      isPublic: formData.isPublic || false
    };

    if (exercise) {
      // Update existing
      this.exerciseService.updateExercise(exercise.id, exercisePayload).subscribe({
        next: (updatedExercise) => {
          this.syncTargets(updatedExercise.id, exercise.targets, formData.targets);
        },
        error: (err) => {
          console.error('Error updating exercise', err);
          alert(err.error?.detail || err.error?.message || 'Failed to update exercise.');
          this.isLoading.set(false);
        }
      });
    } else {
      // Create new
      this.exerciseService.createExercise(exercisePayload).subscribe({
        next: (newExercise) => {
          this.syncTargets(newExercise.id, [], formData.targets);
        },
        error: (err) => {
          console.error('Error creating exercise', err);
          alert(err.error?.detail || err.error?.message || 'Failed to create exercise.');
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteExercise(id: string) {
    if (confirm('Are you sure you want to delete this exercise?')) {
      this.exerciseService.deleteExercise(id).subscribe({
        next: () => {
          this.loadExercises();
        },
        error: (err) => console.error('Error deleting exercise', err)
      });
    }
  }

  private syncTargets(exerciseId: string, oldTargets: { id?: string; bodyPart: string; targetValue: number }[], newTargets: { id?: string; bodyPart: string; targetValue: number }[]) {
    const targetsToDelete = oldTargets.filter(ot => !newTargets.find(nt => nt.id === ot.id));
    const targetsToAdd = newTargets.filter(nt => !nt.id);
    
    targetsToDelete.forEach(t => {
      if (t.id) {
        this.exerciseService.deleteTarget(exerciseId, t.id).subscribe();
      }
    });
    targetsToAdd.forEach(t => this.exerciseService.addTarget(exerciseId, { bodyPart: t.bodyPart, targetValue: t.targetValue }).subscribe());

    setTimeout(() => {
      this.loadExercises();
      this.closeForm();
    }, 500);
  }
}
