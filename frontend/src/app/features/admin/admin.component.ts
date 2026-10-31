import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { CoinIconComponent } from '../../shared/components/coin-icon/coin-icon.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CoinIconComponent],
  providers: [DatePipe],
  template: `
    <div class="w-full flex flex-col gap-6 transition-colors duration-300">
      
      <!-- Top Title and Asset Statistics Summary -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-text-main)] flex items-center gap-3">
            <span class="p-2 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">👥</span>
            <span>{{ i18n.t('admin.users.title')() }}</span>
          </h2>
          <p class="opacity-70 text-xs sm:text-sm mt-1 text-[var(--color-text-secondary)]">
            {{ i18n.t('admin.users.subtitle')() }}
          </p>
        </div>

        <div class="flex items-center gap-3 self-start md:self-auto">
          <!-- Total Registered Users Capsule -->
          <div class="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-sm">
            <span class="text-xs opacity-70 font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{{ i18n.t('admin.users.total')() }}</span>
            <span class="text-xl font-mono text-[var(--color-accent-from)] font-black">{{ totalUsers() }}</span>
          </div>

          <!-- Refresh Button -->
          <button (click)="fetchUsers()" [disabled]="isLoading()"
                  class="p-2.5 rounded-2xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] shadow-sm hover:scale-105 active:scale-95 transition-all text-[var(--color-text-main)] disabled:opacity-50 cursor-pointer"
                  title="刷新数据">
            <span class="inline-block text-base" [class.animate-spin]="isLoading()">🔄</span>
          </button>
        </div>
      </div>

      <!-- Search & Filters Bar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-[var(--color-bg-card)]/80 backdrop-blur-md rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keydown.enter)="onSearch()"
            [placeholder]="i18n.t('admin.users.search_placeholder')()"
            class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-inner"
          />
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-50 pointer-events-none">🔍</span>
          @if (searchQuery()) {
            <button (click)="clearSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer">
              ✕
            </button>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Search Submit Button -->
          <button (click)="onSearch()" [disabled]="isLoading()"
                  class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
            {{ i18n.t('admin.users.search_btn')() }}
          </button>

          <!-- Sort Select Dropdown -->
          <div class="flex items-center gap-1.5 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-2.5 py-1 text-xs">
            <span class="opacity-60 text-xs">⚡</span>
            <select [ngModel]="sortDropdownValue()" (ngModelChange)="onSortDropdownChange($event)"
                    class="bg-transparent border-0 text-[var(--color-text-main)] text-xs font-semibold focus:outline-none cursor-pointer py-1.5 pr-2">
              <option value="created_at:desc">{{ i18n.t('admin.users.sort.created_at_desc')() }}</option>
              <option value="created_at:asc">{{ i18n.t('admin.users.sort.created_at_asc')() }}</option>
              <option value="brain_coins:desc">{{ i18n.t('admin.users.sort.brain_coins_desc')() }}</option>
              <option value="brain_coins:asc">{{ i18n.t('admin.users.sort.brain_coins_asc')() }}</option>
              <option value="level:desc">{{ i18n.t('admin.users.sort.level_desc')() }}</option>
              <option value="level:asc">{{ i18n.t('admin.users.sort.level_asc')() }}</option>
              <option value="xp:desc">{{ i18n.t('admin.users.sort.xp_desc')() }}</option>
              <option value="xp:asc">{{ i18n.t('admin.users.sort.xp_asc')() }}</option>
              <option value="username:asc">{{ i18n.t('admin.users.sort.username_asc')() }}</option>
              <option value="username:desc">{{ i18n.t('admin.users.sort.username_desc')() }}</option>
              <option value="id:desc">{{ i18n.t('admin.users.sort.id_desc')() }}</option>
              <option value="id:asc">{{ i18n.t('admin.users.sort.id_asc')() }}</option>
            </select>
          </div>

          <!-- Page Size Selector -->
          <select [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)"
                  class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer">
            <option [value]="10">10 {{ i18n.t('admin.users.pagination.per_page')() }}</option>
            <option [value]="15">15 {{ i18n.t('admin.users.pagination.per_page')() }}</option>
            <option [value]="25">25 {{ i18n.t('admin.users.pagination.per_page')() }}</option>
            <option [value]="50">50 {{ i18n.t('admin.users.pagination.per_page')() }}</option>
          </select>
        </div>
      </div>

      <!-- Quick Sort Action Pills -->
      <div class="flex flex-wrap items-center gap-2 px-1">
        <span class="text-xs font-bold text-[var(--color-text-secondary)] opacity-80 flex items-center gap-1 mr-1">
          <span>⚡</span>
          <span>{{ i18n.t('admin.users.sort.quick_sort')() }}:</span>
        </span>

        <!-- Registered Time -->
        <button type="button" (click)="toggleSort('created_at')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                [ngClass]="sortBy() === 'created_at' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-indigo-500/10' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border-card)] hover:bg-[var(--color-bg-sub)]'">
          <span>🕒 {{ i18n.t('admin.users.sort.quick_time')() }}</span>
          @if (sortBy() === 'created_at') {
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 font-bold">
              {{ sortOrder() === 'asc' ? '↑ 最早' : '↓ 最新' }}
            </span>
          }
        </button>

        <!-- Brain Coins / Brain Power -->
        <button type="button" (click)="toggleSort('brain_coins')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                [ngClass]="sortBy() === 'brain_coins' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/10' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border-card)] hover:bg-[var(--color-bg-sub)]'">
          <app-coin-icon size="xs" />
          <span>{{ i18n.t('admin.users.sort.quick_coins')() }}</span>
          @if (sortBy() === 'brain_coins') {
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 font-bold">
              {{ sortOrder() === 'asc' ? '↑ 低→高' : '↓ 高→低' }}
            </span>
          }
        </button>

        <!-- Level -->
        <button type="button" (click)="toggleSort('level')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                [ngClass]="sortBy() === 'level' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-cyan-500/10' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border-card)] hover:bg-[var(--color-bg-sub)]'">
          <span>👑 {{ i18n.t('admin.users.sort.quick_level')() }}</span>
          @if (sortBy() === 'level') {
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 font-bold">
              {{ sortOrder() === 'asc' ? '↑ 低→高' : '↓ 高→低' }}
            </span>
          }
        </button>

        <!-- XP -->
        <button type="button" (click)="toggleSort('xp')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                [ngClass]="sortBy() === 'xp' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-purple-500/10' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border-card)] hover:bg-[var(--color-bg-sub)]'">
          <span>⭐ {{ i18n.t('admin.users.sort.quick_xp')() }}</span>
          @if (sortBy() === 'xp') {
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 font-bold">
              {{ sortOrder() === 'asc' ? '↑ 低→高' : '↓ 高→低' }}
            </span>
          }
        </button>
      </div>

      @if (errorMsg()) {
        <div class="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{{ errorMsg() }}</span>
          <button (click)="errorMsg.set('')" class="hover:text-white cursor-pointer">✕</button>
        </div>
      }

      <!-- Main Data Table Container -->
      <div class="overflow-x-auto rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[var(--color-bg-main)] opacity-90 text-xs uppercase tracking-wider border-b border-[var(--color-border-card)] text-[var(--color-text-secondary)]">
              <!-- ID Column (Click to sort) -->
              <th (click)="toggleSort('id')"
                  class="px-5 py-4 font-bold cursor-pointer select-none hover:text-[var(--color-text-main)] transition-colors">
                <div class="flex items-center gap-1.5">
                  <span>{{ i18n.t('admin.users.col.id')() }}</span>
                  <span class="text-[10px] font-mono" [class.text-[var(--color-accent-from)]]="sortBy() === 'id'" [class.opacity-30]="sortBy() !== 'id'">
                    {{ sortBy() === 'id' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Username Column (Click to sort) -->
              <th (click)="toggleSort('username')"
                  class="px-5 py-4 font-bold cursor-pointer select-none hover:text-[var(--color-text-main)] transition-colors">
                <div class="flex items-center gap-1.5">
                  <span>{{ i18n.t('admin.users.col.username')() }}</span>
                  <span class="text-[10px] font-mono" [class.text-[var(--color-accent-from)]]="sortBy() === 'username'" [class.opacity-30]="sortBy() !== 'username'">
                    {{ sortBy() === 'username' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <th class="px-5 py-4 font-bold">{{ i18n.t('admin.users.col.role')() }}</th>

              <!-- Brain Coins Column (Click to sort) -->
              <th (click)="toggleSort('brain_coins')"
                  class="px-5 py-4 font-bold cursor-pointer select-none transition-colors"
                  [ngClass]="sortBy() === 'brain_coins' ? 'text-amber-400 bg-amber-500/10' : 'hover:text-[var(--color-text-main)] text-amber-500'">
                <div class="flex items-center gap-1.5">
                  <app-coin-icon size="xs" />
                  <span>{{ i18n.t('admin.users.col.coins')() }}</span>
                  <span class="text-[10px] font-mono font-bold" [class.opacity-100]="sortBy() === 'brain_coins'" [class.opacity-35]="sortBy() !== 'brain_coins'">
                    {{ sortBy() === 'brain_coins' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Level & XP Column Header (Click either to sort) -->
              <th class="px-5 py-4 font-bold select-none text-[var(--color-text-secondary)]">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <!-- Sort by Level -->
                  <button type="button" (click)="toggleSort('level')"
                          class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border"
                          [ngClass]="sortBy() === 'level' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-sub)] hover:text-[var(--color-text-main)] opacity-75 hover:opacity-100'">
                    <span>{{ i18n.t('admin.users.col.level')() }}</span>
                    <span class="text-[10px] font-mono font-bold">{{ sortBy() === 'level' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}</span>
                  </button>
                  <span class="opacity-30">/</span>
                  <!-- Sort by XP -->
                  <button type="button" (click)="toggleSort('xp')"
                          class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border"
                          [ngClass]="sortBy() === 'xp' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-sub)] hover:text-[var(--color-text-main)] opacity-75 hover:opacity-100'">
                    <span>{{ i18n.t('admin.users.col.xp')() }}</span>
                    <span class="text-[10px] font-mono font-bold">{{ sortBy() === 'xp' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}</span>
                  </button>
                </div>
              </th>

              <th class="px-5 py-4 font-bold">{{ i18n.t('admin.users.col.status')() }}</th>

              <!-- Created At Column (Click to sort) -->
              <th (click)="toggleSort('created_at')"
                  class="px-5 py-4 font-bold cursor-pointer select-none transition-colors"
                  [ngClass]="sortBy() === 'created_at' ? 'text-indigo-400 bg-indigo-500/10' : 'hover:text-[var(--color-text-main)]'">
                <div class="flex items-center gap-1.5">
                  <span>{{ i18n.t('admin.users.col.created_at')() }}</span>
                  <span class="text-[10px] font-mono font-bold" [class.text-indigo-400]="sortBy() === 'created_at'" [class.opacity-30]="sortBy() !== 'created_at'">
                    {{ sortBy() === 'created_at' ? (sortOrder() === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <th class="px-5 py-4 font-bold text-right">{{ i18n.t('admin.users.col.actions')() }}</th>
            </tr>
          </thead>
          <tbody class="text-inherit divide-y divide-[var(--color-border-card)] text-xs sm:text-sm">
            @if (isLoading()) {
              <tr>
                <td colspan="8" class="px-6 py-16 text-center opacity-70 animate-pulse">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-2xl animate-spin">🔄</span>
                    <span class="font-medium">{{ i18n.t('admin.users.loading')() }}</span>
                  </div>
                </td>
              </tr>
            } @else if (users().length === 0) {
              <tr>
                <td colspan="8" class="px-6 py-16 text-center opacity-70 text-[var(--color-text-muted)]">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-3xl">🔍</span>
                    <span>{{ i18n.t('admin.users.empty')() }}</span>
                  </div>
                </td>
              </tr>
            } @else {
              @for (user of users(); track user.id) {
                <tr class="hover:bg-[var(--color-bg-main)]/60 transition-colors">
                  <!-- User ID -->
                  <td class="px-5 py-4 font-mono font-bold opacity-60">#{{ user.id }}</td>
                  
                  <!-- Username and Avatar -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-[var(--color-border-card)] flex items-center justify-center text-xs font-black uppercase text-indigo-400 shrink-0 overflow-hidden">
                        @if (user.avatar) {
                          <img [src]="user.avatar" class="w-full h-full object-cover" [alt]="user.username" />
                        } @else {
                          {{ (user.username || '?').charAt(0) }}
                        }
                      </div>
                      <span class="font-bold text-inherit truncate max-w-[140px] sm:max-w-[180px]">{{ user.username }}</span>
                    </div>
                  </td>

                  <!-- Role Badge -->
                  <td class="px-5 py-4">
                    <span class="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider inline-block"
                          [ngClass]="{'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30': user.role === 'admin', 'bg-[var(--color-bg-sub)] text-[var(--color-text-muted)] border border-[var(--color-border-card)]': user.role !== 'admin'}">
                      {{ user.role }}
                    </span>
                  </td>

                  <!-- Brain Coins Asset Balance -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-1.5 font-mono font-black text-amber-500 dark:text-amber-400">
                      <app-coin-icon size="xs" />
                      <span>{{ (user.brain_coins ?? 0) | number }}</span>
                    </div>
                  </td>

                  <!-- Level and XP -->
                  <td class="px-5 py-4">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span class="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 text-[10px] font-black leading-tight w-fit">
                        LV.{{ user.level || 1 }}
                      </span>
                      <span class="font-mono text-xs opacity-75 font-semibold text-[var(--color-text-secondary)]">
                        {{ user.xp | number }} XP
                      </span>
                    </div>
                  </td>

                  <!-- Account Status -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full"
                           [ngClass]="{'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]': user.status === 'active', 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]': user.status === 'banned'}">
                      </div>
                      <span [ngClass]="{'text-emerald-500 dark:text-emerald-400': user.status === 'active', 'text-red-500': user.status === 'banned'}" class="font-black text-xs uppercase">
                        {{ user.status }}
                      </span>
                    </div>
                  </td>

                  <!-- Created At -->
                  <td class="px-5 py-4 font-mono text-xs opacity-70 whitespace-nowrap text-[var(--color-text-secondary)]">
                    {{ user.created_at ? (user.created_at | date:'yyyy-MM-dd HH:mm') : '—' }}
                  </td>

                  <!-- Action Buttons -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    @if (user.role !== 'admin') {
                      @if (user.status === 'active') {
                        <button (click)="toggleStatus(user, 'banned')" [disabled]="isUpdating()"
                                class="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                          {{ i18n.t('admin.users.action.ban')() }}
                        </button>
                      } @else {
                        <button (click)="toggleStatus(user, 'active')" [disabled]="isUpdating()"
                                class="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                          {{ i18n.t('admin.users.action.unban')() }}
                        </button>
                      }
                    } @else {
                      <span class="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[var(--color-bg-sub)]">
                        {{ i18n.t('admin.users.protected')() }}
                      </span>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <!-- Pagination Controls Footer -->
        <div class="px-5 py-4 bg-[var(--color-bg-main)]/50 border-t border-[var(--color-border-card)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <!-- Total info -->
          <div class="text-[var(--color-text-secondary)] opacity-80">
            @if (totalUsers() > 0) {
              <span>
                {{ i18n.t('admin.users.pagination.showing')() }} <strong class="text-[var(--color-text-main)] font-mono">{{ (currentPage() - 1) * pageSize() + 1 }}</strong>
                {{ i18n.t('admin.users.pagination.to')() }} <strong class="text-[var(--color-text-main)] font-mono">{{ Math.min(currentPage() * pageSize(), totalUsers()) }}</strong>
                {{ i18n.t('admin.users.pagination.of')() }} <strong class="text-[var(--color-accent-from)] font-mono">{{ totalUsers() }}</strong>
                {{ i18n.t('admin.users.pagination.records')() }}
              </span>
            } @else {
              <span>0 {{ i18n.t('admin.users.pagination.records')() }}</span>
            }
          </div>

          <!-- Page Buttons -->
          <div class="flex items-center gap-1.5">
            <button
              (click)="onPageChange(currentPage() - 1)"
              [disabled]="currentPage() <= 1 || isLoading()"
              class="px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1">
              <span>←</span>
              <span>{{ i18n.t('admin.users.pagination.prev')() }}</span>
            </button>

            <div class="px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] font-mono font-bold text-xs text-[var(--color-text-main)]">
              {{ currentPage() }} / {{ totalPages() }} {{ i18n.t('admin.users.pagination.page')() }}
            </div>

            <button
              (click)="onPageChange(currentPage() + 1)"
              [disabled]="currentPage() >= totalPages() || isLoading()"
              class="px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1">
              <span>{{ i18n.t('admin.users.pagination.next')() }}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);
  i18n = inject(I18nService);
  Math = Math;

  users = signal<User[]>([]);
  totalUsers = signal(0);
  currentPage = signal(1);
  pageSize = signal(15);
  searchQuery = signal('');

  sortBy = signal<string>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');
  sortDropdownValue = computed(() => `${this.sortBy()}:${this.sortOrder()}`);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalUsers() / this.pageSize())));

  isLoading = signal(true);
  isUpdating = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.isLoading.set(true);
    this.errorMsg.set('');
    this.adminService.getUsers(
      this.currentPage(),
      this.pageSize(),
      this.searchQuery(),
      this.sortBy(),
      this.sortOrder()
    ).subscribe({
      next: (res) => {
        if (res.users) {
          this.users.set(res.users);
          this.totalUsers.set(res.total ?? res.users.length);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to load users: ' + (err.error?.error || err.message));
        this.isLoading.set(false);
      }
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.fetchUsers();
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.fetchUsers();
  }

  toggleSort(field: string) {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      // default username to asc, all others to desc
      this.sortOrder.set(field === 'username' ? 'asc' : 'desc');
    }
    this.currentPage.set(1);
    this.fetchUsers();
  }

  onSortDropdownChange(val: string) {
    const parts = val.split(':');
    if (parts.length === 2) {
      const field = parts[0];
      const order = parts[1] as 'asc' | 'desc';
      this.sortBy.set(field);
      this.sortOrder.set(order);
      this.currentPage.set(1);
      this.fetchUsers();
    }
  }

  onPageChange(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.currentPage.set(newPage);
    this.fetchUsers();
  }

  onPageSizeChange(newSize: number | string) {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    if (size > 0) {
      this.pageSize.set(size);
      this.currentPage.set(1);
      this.fetchUsers();
    }
  }

  toggleStatus(user: User, newStatus: 'active' | 'banned') {
    this.isUpdating.set(true);
    this.adminService.toggleUserStatus(user.id, newStatus).subscribe({
      next: (res) => {
        if (res.message) {
          const updated = this.users().map(u => u.id === user.id ? { ...u, status: newStatus } : u);
          this.users.set(updated);
        }
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Update failed: ' + (err.error?.error || err.message));
        this.isUpdating.set(false);
      }
    });
  }
}
