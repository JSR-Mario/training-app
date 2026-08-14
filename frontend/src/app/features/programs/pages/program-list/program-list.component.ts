import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrainingProgram } from '../../../../core/types/training.types';

export type ProgramSortOption = 'RATING_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'DURATION_DESC' | 'DURATION_ASC' | 'NEWEST';

@Component({
  standalone: true,
  selector: 'app-program-list',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-black dark:text-white">Programs</h1>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Build custom training schedules or explore and inspect public templates.
          </p>
        </div>
        <button
          (click)="openForm()"
          class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn shrink-0"
        >
          + Create Program
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-800">
        <button
          (click)="activeTab.set('my')"
          class="px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2"
          [class.border-accent-pos]="activeTab() === 'my'"
          [class.text-accent-pos]="activeTab() === 'my'"
          [class.border-transparent]="activeTab() !== 'my'"
          [class.text-gray-500]="activeTab() !== 'my'"
          [class.dark:text-gray-400]="activeTab() !== 'my'"
        >
          My Programs
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
            {{ programs().length }}
          </span>
        </button>
        <button
          (click)="activeTab.set('public')"
          class="px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2"
          [class.border-accent-pos]="activeTab() === 'public'"
          [class.text-accent-pos]="activeTab() === 'public'"
          [class.border-transparent]="activeTab() !== 'public'"
          [class.text-gray-500]="activeTab() !== 'public'"
          [class.dark:text-gray-400]="activeTab() !== 'public'"
        >
          Public Programs
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
            {{ publicPrograms().length }}
          </span>
        </button>
      </div>

      <!-- Search & Filters Control Bar -->
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <!-- Search Bar -->
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Search programs by name or description..."
            class="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-black dark:text-white focus:ring-2 focus:ring-accent-pos outline-none transition-all shadow-sm solid-input"
          />
          @if (searchQuery().length > 0) {
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

        <!-- Controls: Goal Filter & Sort Dropdown -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Goal Filter -->
          <div class="relative">
            <select
              aria-label="Goal filter"
              [ngModel]="goalFilter()"
              (ngModelChange)="goalFilter.set($event)"
              class="px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-accent-pos outline-none cursor-pointer transition-all pr-8 appearance-none shadow-sm"
            >
              <option value="ALL">All Goals</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CUT">Cut</option>
              <option value="BULK">Bulk</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <!-- Sort Selector -->
          <div class="relative">
            <select
              aria-label="Sort options"
              [ngModel]="sortBy()"
              (ngModelChange)="sortBy.set($event)"
              class="px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-accent-pos outline-none cursor-pointer transition-all pr-8 appearance-none shadow-sm"
            >
              <option value="RATING_DESC">Top Rated Stars</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NAME_DESC">Name (Z-A)</option>
              <option value="DURATION_DESC">Duration (Longest)</option>
              <option value="DURATION_ASC">Duration (Shortest)</option>
              <option value="NEWEST">Newest Created</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>
    
      <!-- Create Program Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl solid-card p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-black dark:text-white">New Program</h2>
              <button
                (click)="closeForm()"
                class="text-gray-400 hover:text-black dark:hover:text-white text-xl transition-colors p-1"
                title="Close"
              >
                ✕
              </button>
            </div>
            
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label for="nameInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Program Name</label>
                <input
                  id="nameInput"
                  type="text"
                  formControlName="name"
                  class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                  placeholder="e.g., Push Pull Legs Hypertrophy"
                >
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                  <div class="text-accent-neg text-xs mt-1">
                    Name is required (max 100 chars).
                  </div>
                }
              </div>

              <div>
                <label for="descriptionInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  id="descriptionInput"
                  formControlName="description"
                  rows="3"
                  class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input resize-none"
                  placeholder="Explain program goals, split details, target training level, etc."
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="durationInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Duration (Weeks)</label>
                  <input
                    id="durationInput"
                    type="number"
                    min="1"
                    max="52"
                    formControlName="durationWeeks"
                    class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                  >
                </div>
                <div>
                  <label for="goalInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Goal</label>
                  <select
                    id="goalInput"
                    formControlName="goal"
                    class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="CUT">Cut (Lose Weight)</option>
                    <option value="BULK">Bulk (Gain Weight)</option>
                  </select>
                </div>
              </div>

              @if (authService.isAdmin) {
                <div class="flex items-center gap-3 pt-2">
                  <input
                    id="isPublicInput"
                    type="checkbox"
                    formControlName="isPublic"
                    class="w-4 h-4 text-accent-pos rounded focus:ring-accent-pos"
                  >
                  <label for="isPublicInput" class="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Make this program public (available to all users as a template)
                  </label>
                </div>
              }

              <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  (click)="closeForm()"
                  class="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="form.invalid || isLoading()"
                  class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors solid-btn text-sm"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400">Loading programs...</p>
        </div>
      }
    
      <!-- TAB 1: My Programs List View -->
      @if (!isLoading() && activeTab() === 'my') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (filteredMyPrograms().length === 0) {
            @if (programs().length === 0) {
              <!-- Guided Empty State -->
              <div class="col-span-full text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
                <div class="w-16 h-16 bg-accent-pos/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-black dark:text-white mb-2">Create your first program</h3>
                <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                  A program organizes your training into weeks and days. Create custom training blocks or copy a ready-made template.
                </p>
                <div class="flex flex-wrap justify-center gap-3">
                  <button
                    (click)="openForm()"
                    class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all solid-btn"
                  >
                    + Create Program
                  </button>
                  @if (publicPrograms().length > 0) {
                    <button
                      (click)="activeTab.set('public')"
                      class="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-semibold rounded-xl transition-all"
                    >
                      Browse Public Templates ({{ publicPrograms().length }})
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- Search No Results State -->
              <div class="col-span-full text-center py-12 solid-card border border-dashed border-gray-300 dark:border-gray-700">
                <p class="text-gray-500 dark:text-gray-400 mb-4">No programs match your search or filter criteria.</p>
                <button
                  (click)="searchQuery.set(''); goalFilter.set('ALL')"
                  class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            }
          }

          @for (program of filteredMyPrograms(); track program.id) {
            <div
              [routerLink]="['/programs', program.id]"
              class="solid-card p-6 flex flex-col h-full hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer group"
              [class.border-accent-pos]="program.isActive"
            >
              <div class="flex justify-between items-start mb-3">
                <div class="space-y-1">
                  <!-- Title and Rating Badge inline -->
                  <div class="flex items-center flex-wrap gap-2">
                    <h3 class="text-xl font-bold text-black dark:text-white group-hover:text-accent-pos transition-colors">{{ program.name }}</h3>
                    @if (program.averageRating !== undefined && program.averageRating !== null) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        <span>★</span>
                        <span>{{ program.averageRating | number:'1.1-1' }}</span>
                        @if ((program.ratingsCount ?? 0) > 0) {
                          <span class="text-[10px] text-gray-400">({{ program.ratingsCount }})</span>
                        }
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400">
                        Unrated
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Goal: {{ program.goal }}</span>
                    @if (program.isPublic) {
                      <span class="px-2 py-0.5 bg-accent-pos/20 text-accent-pos text-[10px] rounded-md font-semibold">Public</span>
                    }
                  </div>
                </div>

                @if (program.isActive) {
                  <button
                    (click)="finishProgramEarly(program, $event)"
                    class="px-2.5 py-1 bg-accent-pos/20 hover:bg-accent-pos/30 text-accent-pos text-xs rounded-lg border border-accent-pos/30 font-semibold tracking-wide flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="Click to finish/deactivate program"
                  >
                    ✓ Active
                  </button>
                }
              </div>

              <!-- Description -->
              @if (program.description) {
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {{ program.description }}
                </p>
              }

              <div class="flex-1 space-y-1.5 mb-6 text-sm text-gray-500 dark:text-gray-400">
                <p>Duration: <span class="text-black dark:text-white font-medium">{{ program.durationWeeks }} weeks</span></p>
                <p>Created: <span class="text-black dark:text-white font-medium">{{ program.createdAt | date:'mediumDate' }}</span></p>
              </div>
              
              <div class="space-y-3 pt-4 border-t border-gray-300 dark:border-gray-700/50">
                <div class="flex justify-between items-center">
                  <button
                    (click)="deleteProgram(program.id, $event)"
                    class="text-accent-neg hover:opacity-80 transition-opacity text-sm font-medium"
                  >
                    Delete
                  </button>

                  <span class="text-xs text-gray-400 group-hover:text-accent-pos transition-colors flex items-center gap-1">
                    Edit & Build &rarr;
                  </span>
                </div>

                <!-- Program Lifecycle Controls -->
                @if (!program.isActive) {
                  <div class="pt-1">
                    <button
                      (click)="setProgramActive(program, $event)"
                      [disabled]="actionLoadingId() === program.id"
                      class="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-accent-pos/10 hover:text-accent-pos text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      @if (actionLoadingId() === program.id) {
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting Active...
                      } @else {
                        Set Active
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 2: Public Programs Templates List View -->
      @if (!isLoading() && activeTab() === 'public') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (filteredPublicPrograms().length === 0) {
            @if (publicPrograms().length === 0) {
              <div class="col-span-full text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
                <div class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-black dark:text-white mb-2">No public templates available</h3>
                <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  No public program templates have been published yet. Create your own custom program!
                </p>
              </div>
            } @else {
              <div class="col-span-full text-center py-12 solid-card border border-dashed border-gray-300 dark:border-gray-700">
                <p class="text-gray-500 dark:text-gray-400 mb-4">No public programs match your search or filter criteria.</p>
                <button
                  (click)="searchQuery.set(''); goalFilter.set('ALL')"
                  class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            }
          }

          @for (program of filteredPublicPrograms(); track program.id) {
            <div
              [routerLink]="['/programs', program.id]"
              class="solid-card p-6 flex flex-col h-full hover:border-gray-400 dark:hover:border-gray-600 transition-all border border-accent-pos/30 cursor-pointer group"
            >
              <div class="flex justify-between items-start mb-3">
                <div class="space-y-1">
                  <!-- Title and Rating Badge inline -->
                  <div class="flex items-center flex-wrap gap-2">
                    <h3 class="text-xl font-bold text-black dark:text-white group-hover:text-accent-pos transition-colors">{{ program.name }}</h3>
                    @if (program.averageRating !== undefined && program.averageRating !== null) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        <span>★</span>
                        <span>{{ program.averageRating | number:'1.1-1' }}</span>
                        @if ((program.ratingsCount ?? 0) > 0) {
                          <span class="text-[10px] text-gray-400">({{ program.ratingsCount }})</span>
                        }
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400">
                        Unrated
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Goal: {{ program.goal }}</span>
                    <span class="px-2 py-0.5 bg-accent-pos/20 text-accent-pos text-[10px] rounded-md font-semibold">Public Template</span>
                  </div>
                </div>
              </div>

              <!-- Description -->
              @if (program.description) {
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {{ program.description }}
                </p>
              }

              <div class="flex-1 space-y-1.5 mb-6 text-sm text-gray-500 dark:text-gray-400">
                <p>Duration: <span class="text-black dark:text-white font-medium">{{ program.durationWeeks }} weeks</span></p>
                <p class="text-xs text-gray-400">Click card to inspect weeks, days & exercises</p>
              </div>

              <div class="pt-4 border-t border-gray-300 dark:border-gray-700/50 space-y-2">
                <button
                  (click)="usePublicProgram(program, $event)"
                  [disabled]="actionLoadingId() === program.id"
                  class="w-full py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn flex items-center justify-center gap-2 text-sm"
                >
                  @if (actionLoadingId() === program.id) {
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  } @else {
                    Use Program
                  }
                </button>
              </div>
            </div>
          }
        </div>
      }
    
      </div>
    `
})
export class ProgramListComponent implements OnInit {
  private programService = inject(ProgramService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  programs = signal<TrainingProgram[]>([]);
  publicPrograms = signal<TrainingProgram[]>([]);
  activeTab = signal<'my' | 'public'>('my');

  searchQuery = signal<string>('');
  sortBy = signal<ProgramSortOption>('RATING_DESC');
  goalFilter = signal<string>('ALL');

  filteredMyPrograms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const goal = this.goalFilter();
    const sort = this.sortBy();

    const list = this.programs().filter(p => {
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.goal.toLowerCase().includes(query);
      const matchesGoal = goal === 'ALL' || p.goal === goal;
      return matchesSearch && matchesGoal;
    });

    return list.sort((a, b) => {
      // Active program always first in My Programs
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return this.comparePrograms(a, b, sort);
    });
  });

  filteredPublicPrograms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const goal = this.goalFilter();
    const sort = this.sortBy();

    const list = this.publicPrograms().filter(p => {
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.goal.toLowerCase().includes(query);
      const matchesGoal = goal === 'ALL' || p.goal === goal;
      return matchesSearch && matchesGoal;
    });

    return list.sort((a, b) => this.comparePrograms(a, b, sort));
  });

  isLoading = signal<boolean>(true);
  showForm = signal<boolean>(false);
  actionLoadingId = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    durationWeeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]],
    goal: ['MAINTENANCE', Validators.required],
    isPublic: [false]
  });

  ngOnInit() {
    this.loadData();
  }

  private comparePrograms(a: TrainingProgram, b: TrainingProgram, sort: ProgramSortOption): number {
    switch (sort) {
      case 'RATING_DESC': {
        const ratingA = a.averageRating ?? -1;
        const ratingB = b.averageRating ?? -1;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0);
      }
      case 'NAME_ASC':
        return a.name.localeCompare(b.name);
      case 'NAME_DESC':
        return b.name.localeCompare(a.name);
      case 'DURATION_DESC':
        return b.durationWeeks - a.durationWeeks;
      case 'DURATION_ASC':
        return a.durationWeeks - b.durationWeeks;
      case 'NEWEST':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  }

  loadData() {
    this.isLoading.set(true);
    this.programService.getPrograms().subscribe({
      next: (myProgs) => {
        this.programs.set(myProgs);
        this.programService.getPublicPrograms().subscribe({
          next: (pubProgs) => {
            this.publicPrograms.set(pubProgs);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading public programs', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading programs', err);
        this.isLoading.set(false);
      }
    });
  }

  openForm() {
    this.form.reset({ durationWeeks: 4, goal: 'MAINTENANCE', isPublic: false, description: '' });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading.set(true);
      const { name, durationWeeks, goal, isPublic, description } = this.form.value;
      this.programService.createProgram(name, durationWeeks, goal, isPublic, description).subscribe({
        next: () => {
          this.loadData();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error creating program', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteProgram(id: string, event?: Event) {
    event?.stopPropagation();
    if (confirm('Are you sure you want to delete this program?')) {
      this.programService.deleteProgram(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => console.error('Error deleting program', err)
      });
    }
  }

  setProgramActive(program: TrainingProgram, event?: Event) {
    event?.stopPropagation();
    if (confirm(`Set "${program.name}" as your active program?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.updateProgram(program.id, program.name, program.durationWeeks, true, program.goal, program.isPublic || false, program.description).subscribe({
        next: () => {
          this.loadData();
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error setting program as active', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }

  finishProgramEarly(program: TrainingProgram, event?: Event) {
    event?.stopPropagation();
    if (confirm(`Finishing "${program.name}" will set it as inactive. You can set it as active again at any time. Continue?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.deactivateProgram(program.id).subscribe({
        next: () => {
          this.loadData();
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error deactivating program', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }

  usePublicProgram(program: TrainingProgram, event?: Event) {
    event?.stopPropagation();
    if (confirm(`Import "${program.name}" as your active program?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.copyPublicProgram(program.id).subscribe({
        next: () => {
          this.loadData();
          this.activeTab.set('my');
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error copying public program', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }
}
