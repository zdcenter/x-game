import { Component, inject, signal, ViewChild, ElementRef, computed, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { I18nService, SUPPORTED_LANGS } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthStore } from '../auth/auth.store';
import { PwaService } from '../services/pwa.service';
import { ShareModalComponent } from '../../shared/components/share-modal/share-modal.component';
import { FooterComponent } from './footer/footer.component';

import { LayoutService } from '../services/layout.service';
import { LiveRoomService } from '../services/live-room.service';
import { ZenModeService } from '../services/zen-mode.service';
import { CoinService } from '../services/coin.service';
import { CoinGuideService } from '../services/coin-guide.service';
import { CoinGuideModalComponent } from '../../shared/components/coin-guide-modal/coin-guide-modal.component';
import { CoinIconComponent } from '../../shared/components/coin-icon/coin-icon.component';
import { FriendService } from '../services/friend.service';
import { DeviceService } from '../services/device.service';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { NotificationService, NotificationItem } from '../services/notification.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ShareModalComponent, FooterComponent, CoinGuideModalComponent, CoinIconComponent, OfflineBannerComponent],
  template: `
    <div class="h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 overflow-hidden">

      <!-- Global Navbar (自动在移动端/平板设备游戏沉浸或 ZenMode 时完全隐藏) -->
      @if (!isFullImmersion()) {
        <header class="flex-shrink-0 relative z-50 backdrop-blur-md border-b" style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">

          <!-- Left: Logo + Nav links -->
          <div class="flex items-center gap-1 sm:gap-3 xl:gap-5 min-w-0">
            <a [routerLink]="['/', i18n.currentLang()]" class="flex items-center cursor-pointer group shrink-0">
              <span class="text-xl sm:text-2xl lg:text-3xl font-black tracking-widest bg-clip-text text-transparent transition-transform group-hover:scale-105"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                Puzzle PK
              </span>
            </a>

            <!-- ⚔️ 多人竞技场 (全局导航高亮直达) -->
            <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']" 
               routerLinkActive="border-amber-500 bg-amber-500/20 text-amber-500 font-black shadow-xs ring-2 ring-amber-500/20"
               class="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-black whitespace-nowrap shrink-0 rounded-xl transition-all border border-amber-500/35 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 hover:from-amber-500/25 hover:to-orange-500/25 hover:scale-105 active:scale-95 shadow-xs">
              <span class="text-base animate-pulse">⚔️</span>
              <span>{{ i18n.t('nav.arena')() || '多人竞技场' }}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white tracking-wider">LIVE</span>
            </a>

            <a [routerLink]="['/', i18n.currentLang(), 'leaderboard']" 
               routerLinkActive="bg-[var(--color-bg-main)] text-[var(--color-accent-from)] font-black border border-[var(--color-border-card)] shadow-xs"
               class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold whitespace-nowrap shrink-0 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              🏆 {{ i18n.t('leaderboard.title')() || 'Leaderboard' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'daily']" 
               routerLinkActive="bg-[var(--color-bg-main)] text-[var(--color-accent-from)] font-black border border-[var(--color-border-card)] shadow-xs"
               class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold whitespace-nowrap shrink-0 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              📅 {{ i18n.t('daily.title')() || 'Daily' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'blog']" 
               routerLinkActive="bg-[var(--color-bg-main)] text-[var(--color-accent-from)] font-black border border-[var(--color-border-card)] shadow-xs"
               class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold whitespace-nowrap shrink-0 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              📝 {{ i18n.t('nav.blog')() || 'Blog' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'docs']" 
               routerLinkActive="bg-[var(--color-bg-main)] text-[var(--color-accent-from)] font-black border border-[var(--color-border-card)] shadow-xs"
               class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold whitespace-nowrap shrink-0 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              📖 {{ i18n.t('nav.docs')() || 'Docs' }}
            </a>
          </div>

          <!-- Right: Controls -->
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">

            <!-- Theme Toggle -->
            <button (click)="theme.cycleTheme()"
                    class="hidden sm:flex p-2 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]"
                    title="Toggle Theme">
              <span class="text-lg leading-none block">{{ theme.currentTheme() === 'dark' ? '☀️' : '🌙' }}</span>
            </button>

            <!-- Language Dropdown -->
            <div class="relative hidden sm:block">
              <button (click)="isLangMenuOpen.set(!isLangMenuOpen())"
                      class="p-2 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]"
                      title="Select Language">
                <span class="text-lg leading-none block">{{ currentLangFlag() }}</span>
              </button>
              
              @if (isLangMenuOpen()) {
                <!-- Invisible backdrop to close dropdown when clicking outside -->
                <div class="fixed inset-0 z-[90]" (click)="isLangMenuOpen.set(false)"></div>
                
                <div class="absolute right-0 mt-2 w-40 rounded-xl shadow-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] py-2 z-[100] animate-fade-in-down" (click)="isLangMenuOpen.set(false)">
                  @for (lang of supportedLangs; track lang.code) {
                    <button (click)="i18n.setLang(lang.code)" 
                            class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] flex items-center gap-3 transition-colors"
                            [class.text-emerald-400]="i18n.currentLang() === lang.code">
                      <span class="text-lg">{{ lang.flag }}</span>
                      <span class="font-medium">{{ lang.name }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Divider -->
            <div class="hidden sm:block w-px h-6 mx-1" style="background-color: var(--color-border-card)"></div>

            <!-- Authenticated -->
            @if (authStore.isAuthenticated()) {

              <!-- Coins Pill (Click to open Coin Economy Guide) -->
              <button (click)="coinGuideService.open()"
                      class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 dark:border-amber-500/25 text-amber-700 dark:text-amber-300 font-black text-xs shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      [title]="i18n.t('game.coins_balance')() + ': ' + coinService.coins() + ' (' + (i18n.t('coins.guide_title')() || '规则指南') + ')'">
                <app-coin-icon size="sm" />
                <span class="font-mono font-black">{{ coinService.coins() }}</span>
              </button>

              <!-- Friends Pill (Clean Navbar Entry) -->
              <button (click)="friendService.togglePanel()"
                      class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      [title]="i18n.t('game.friends')() || '好友'">
                <span class="text-sm">👥</span>
                <span class="hidden md:inline font-bold text-xs">{{ i18n.t('game.friends')() || '好友' }}</span>
                @if (pendingFriendRequests() > 0) {
                  <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white">
                    {{ pendingFriendRequests() }}
                  </span>
                }
              </button>

              <!-- Notifications Bell & Dropdown (Protected) -->
              <div class="relative notification-dropdown-container">
                <button (click)="toggleNotificationDropdown($event)"
                        class="relative flex items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        [title]="i18n.t('notification.title')() || '通知与复仇战帖'">
                  <span class="text-sm">🔔</span>
                  @if (notificationService.unreadCount() > 0) {
                    <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-white animate-pulse">
                      {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
                    </span>
                  }
                </button>

                <!-- Dropdown Card -->
                @if (isNotificationDropdownOpen()) {
                  <div class="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl z-50 overflow-hidden flex flex-col animate-scale-up backdrop-blur-xl"
                       (click)="$event.stopPropagation()">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-card)] bg-[var(--color-bg-main)]/50">
                      <div class="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[var(--color-text-main)]">
                        <span>🔔</span>
                        <span>{{ i18n.t('notification.title')() || '通知中心' }}</span>
                        @if (notificationService.unreadCount() > 0) {
                          <span class="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-mono border border-rose-500/20">
                            {{ notificationService.unreadCount() }} 未读
                          </span>
                        }
                      </div>
                      @if (notificationService.unreadCount() > 0) {
                        <button (click)="notificationService.markAllAsRead()"
                                class="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] font-bold transition-colors cursor-pointer">
                          {{ i18n.t('notification.mark_all_read')() || '全部已读' }}
                        </button>
                      }
                    </div>

                    <!-- Notification List -->
                    <div class="max-h-80 overflow-y-auto divide-y divide-[var(--color-border-card)]/40">
                      @if (notificationService.notifications().length === 0) {
                        <div class="py-8 px-4 flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-muted)]">
                          <span class="text-3xl opacity-40">👑</span>
                          <p class="text-xs font-bold">{{ i18n.t('notification.empty')() || '暂无新通知，你的王座固若金汤！' }}</p>
                        </div>
                      } @else {
                        @for (item of notificationService.notifications(); track item.id) {
                          <div class="p-3 sm:p-3.5 flex flex-col gap-2 transition-colors hover:bg-[var(--color-bg-main)]/60"
                               [class.bg-rose-500/5]="!item.is_read">
                            <div class="flex items-start justify-between gap-2">
                              <div class="flex items-center gap-2 min-w-0">
                                <span class="text-base shrink-0">⚔️</span>
                                <div class="min-w-0 leading-tight">
                                  <p class="text-xs font-black text-[var(--color-text-main)] truncate">
                                    {{ item.sender_name }} 刷新了纪录！
                                  </p>
                                  <p class="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate">
                                    {{ item.title }} · {{ item.created_at | date:'MM-dd HH:mm' }}
                                  </p>
                                </div>
                              </div>
                              @if (!item.is_read) {
                                <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                              }
                            </div>

                            <!-- VS Details -->
                            <div class="p-2 rounded-xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)] flex items-center justify-between text-xs font-mono">
                              <div class="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                <span>原纪录:</span>
                                <span class="line-through">{{ formatRecord(item.old_record, item.rank_type) }}</span>
                              </div>
                              <div class="flex items-center gap-1 text-amber-500 font-bold">
                                <span>新纪录:</span>
                                <span>{{ formatRecord(item.new_record, item.rank_type) }}</span>
                              </div>
                            </div>

                            <!-- Action CTA -->
                            <div class="flex items-center justify-end gap-2 pt-0.5">
                              @if (!item.is_read) {
                                <button (click)="notificationService.markAsRead(item.id)"
                                        class="px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-semibold cursor-pointer">
                                  标为已读
                                </button>
                              }
                              <button (click)="openRevengeFromDropdown(item)"
                                      class="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-black flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer">
                                <span>🔥</span>
                                <span>立即复仇</span>
                              </button>
                            </div>
                          </div>
                        }
                      }
                    </div>

                  </div>
                }
              </div>

              <!-- User Profile & Account Dropdown (Unified modern popover menu) -->
              <div class="relative user-dropdown-container">
                <button (click)="toggleUserMenu($event)"
                        class="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-xl transition-all hover:bg-[var(--color-bg-main)] border border-transparent hover:border-[var(--color-border-card)] cursor-pointer select-none"
                        [class.border-[var(--color-border-card)]]="isUserMenuOpen()"
                        [class.bg-[var(--color-bg-main)]]="isUserMenuOpen()"
                        [title]="authStore.currentUser()?.username || '用户资料'">
                  <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs"
                        style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                    {{ (authStore.currentUser()?.username || '?')[0].toUpperCase() }}
                  </span>
                  <span class="hidden md:block text-xs sm:text-sm font-bold max-w-[80px] lg:max-w-[110px] truncate" style="color: var(--color-accent-from)">
                    {{ authStore.currentUser()?.username }}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="hidden sm:block h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform duration-200"
                       [class.rotate-180]="isUserMenuOpen()"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                @if (isUserMenuOpen()) {
                  <div class="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl p-2 z-[100] flex flex-col gap-1 backdrop-blur-xl animate-scale-up"
                       (click)="$event.stopPropagation()">
                    
                    <!-- User Header Info -->
                    <div class="px-3 py-2 rounded-xl bg-[var(--color-bg-main)]/70 border border-[var(--color-border-card)]/50 flex items-center gap-2.5">
                      <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs"
                            style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                        {{ (authStore.currentUser()?.username || '?')[0].toUpperCase() }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-black text-[var(--color-text-main)] truncate">
                          {{ authStore.currentUser()?.username }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          @if (authStore.isAdmin()) {
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                              ADMIN
                            </span>
                          } @else if (authStore.currentUser()?.role === 'guest') {
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                              {{ i18n.t('nav.guest')() }}
                            </span>
                          } @else {
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                              VIP 玩家
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Menu List -->
                    <div class="pt-1 flex flex-col gap-0.5">
                      <!-- 个人中心 (Profile) -->
                      <a [routerLink]="['/', i18n.currentLang(), 'profile']"
                         (click)="isUserMenuOpen.set(false)"
                         class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer">
                        <span class="text-sm">👤</span>
                        <span>{{ i18n.t('nav.profile')() || '个人中心' }}</span>
                      </a>

                      <!-- 管理员后台 (Admin Dashboard) -->
                      @if (authStore.isAdmin()) {
                        <a routerLink="/admin"
                           (click)="isUserMenuOpen.set(false)"
                           class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer">
                          <span class="text-sm">🛡️</span>
                          <span>{{ i18n.t('nav.admin')() || '管理后台' }}</span>
                        </a>
                      }

                      <!-- 金币明细/规则 (Coin Economy Guide) -->
                      <button (click)="coinGuideService.open(); isUserMenuOpen.set(false)"
                              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer text-left">
                        <span class="flex items-center gap-2.5">
                          <app-coin-icon size="xs" />
                          <span>{{ i18n.t('game.coins_balance')() || '脑力金币' }}</span>
                        </span>
                        <span class="font-mono font-bold text-amber-500">{{ coinService.coins() }}</span>
                      </button>

                      <div class="my-1 border-t border-[var(--color-border-card)]"></div>

                      <!-- 退出登录 (Logout) -->
                      <button (click)="logout(); isUserMenuOpen.set(false)"
                              class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-left">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>{{ authStore.currentUser()?.role === 'guest' ? i18n.t('auth.login.submit')() : i18n.t('auth.logout')() }}</span>
                      </button>
                    </div>

                  </div>
                }
              </div>

            } @else {
              <a [routerLink]="['/', i18n.currentLang(), 'login']"
                 class="hidden sm:inline-block px-3 py-1.5 text-sm font-bold rounded-lg transition-all hover:scale-105 border"
                 style="background-color: var(--color-bg-main); border-color: var(--color-border-card); color: var(--color-text-main)">
                {{ i18n.t('nav.signin')() }}
              </a>
            }

            <!-- Mobile Menu Toggle (xl-) -->
            <button (click)="isMobileMenuOpen.set(!isMobileMenuOpen())"
                    [attr.aria-label]="isMobileMenuOpen() ? (i18n.t('nav.close_menu')() || 'Close navigation menu') : (i18n.t('nav.open_menu')() || 'Open navigation menu')"
                    [attr.aria-expanded]="isMobileMenuOpen()"
                    class="xl:hidden p-2 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                @if (isMobileMenuOpen()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </header>
      }

      <!-- Mobile/iPad Navigation Drawer (xl-) -->
      @if (isMobileMenuOpen()) {
        <!-- Backdrop: click outside to dismiss -->
        <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs xl:hidden transition-opacity"
             (click)="isMobileMenuOpen.set(false)"></div>

        <!-- Right-Aligned Sliding Drawer -->
        <div class="fixed top-0 right-0 h-full w-[300px] sm:w-[340px] max-w-[85vw] z-50 bg-[var(--color-bg-card)] border-l border-[var(--color-border-card)] shadow-2xl flex flex-col xl:hidden animate-slide-in-right overflow-y-auto"
             (click)="$event.stopPropagation()">
          
          <!-- Drawer Header with Logo & Close Button -->
          <div class="flex items-center justify-between px-5 h-14 sm:h-16 border-b border-[var(--color-border-card)] shrink-0">
            <span class="text-xl font-black tracking-widest bg-clip-text text-transparent"
                  style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              Puzzle PK
            </span>
            <button (click)="isMobileMenuOpen.set(false)"
                    class="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer"
                    title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav class="p-4 space-y-2 flex-1 overflow-y-auto">
            <!-- Mobile User Profile & Auth Deck (< sm) -->
            @if (authStore.currentUser()) {
              <div class="sm:hidden mb-3 p-3 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-sm flex items-center justify-between gap-3">
                <a [routerLink]="['/', i18n.currentLang(), 'profile']" (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-2.5 min-w-0">
                  <span class="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-white shrink-0 shadow-md"
                        style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                    {{ (authStore.currentUser()?.username || '?')[0].toUpperCase() }}
                  </span>
                  <div class="min-w-0">
                    <div class="text-sm font-bold truncate text-[var(--color-text-main)]">
                      {{ authStore.currentUser()?.username }}
                    </div>
                    <div class="text-[11px] text-[var(--color-text-muted)] font-medium">
                      {{ authStore.currentUser()?.role === 'guest' ? i18n.t('nav.guest')() : (i18n.t('user.profile')() || '个人主页') }}
                    </div>
                  </div>
                </a>
                <button (click)="logout(); isMobileMenuOpen.set(false)"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 active:scale-95 transition-all shrink-0">
                  {{ authStore.currentUser()?.role === 'guest' ? i18n.t('auth.login.submit')() : i18n.t('auth.logout')() }}
                </button>
              </div>
            } @else {
              <div class="sm:hidden mb-3 p-3 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-sm flex items-center justify-between gap-2">
                <a [routerLink]="['/', i18n.currentLang(), 'login']" (click)="isMobileMenuOpen.set(false)"
                   class="flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-sm">
                  {{ i18n.t('nav.signin')() }}
                </a>
                <a [routerLink]="['/', i18n.currentLang(), 'register']" (click)="isMobileMenuOpen.set(false)"
                   class="flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)]">
                  {{ i18n.t('nav.register')() || '注册' }}
                </a>
              </div>
            }

            @if (authStore.isAuthenticated()) {
              <button (click)="friendService.togglePanel(true); isMobileMenuOpen.set(false)"
                      class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] transition-colors text-left cursor-pointer">
                <span class="text-xl">👥</span>
                <span>{{ i18n.t('game.friends')() || '好友列表' }}</span>
                @if (pendingFriendRequests() > 0) {
                  <span class="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {{ pendingFriendRequests() }}
                  </span>
                }
              </button>
            }

            <!-- ⚔️ 多人竞技场 (Mobile Drawer Entry) -->
            <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']" 
               routerLinkActive="bg-amber-500/20 text-amber-500 font-black border border-amber-500/40"
               (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-extrabold text-base text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors">
              <span class="text-xl">⚔️</span>
              <span>{{ i18n.t('nav.arena')() || '多人竞技场' }}</span>
              <span class="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white tracking-wider">LIVE</span>
            </a>

            <a [routerLink]="['/', i18n.currentLang(), 'leaderboard']" 
               routerLinkActive="bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] font-black border border-[var(--color-accent-from)]/30"
               (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] transition-colors">
              <span class="text-xl">🏆</span> {{ i18n.t('leaderboard.title')() || 'Leaderboard' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'daily']" 
               routerLinkActive="bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] font-black border border-[var(--color-accent-from)]/30"
               (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] transition-colors">
              <span class="text-xl">📅</span> {{ i18n.t('daily.title')() || 'Daily' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'blog']" 
               routerLinkActive="bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] font-black border border-[var(--color-accent-from)]/30"
               (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] transition-colors">
              <span class="text-xl">📝</span> {{ i18n.t('nav.blog')() || 'Blog' }}
            </a>
            <a [routerLink]="['/', i18n.currentLang(), 'docs']" 
               routerLinkActive="bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] font-black border border-[var(--color-accent-from)]/30"
               (click)="isMobileMenuOpen.set(false)" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] transition-colors">
              <span class="text-xl">📖</span> {{ i18n.t('nav.docs')() || 'Docs' }}
            </a>

            <!-- 📱 移动端与平板抽屉菜单常驻安装兜底入口 (加横杠分割，绝不丢失) -->
            @if (!pwa.isStandalone()) {
              <div class="my-2.5 border-t border-[var(--color-border-card)]"></div>
              <button (click)="pwa.triggerInstall(); isMobileMenuOpen.set(false)"
                      class="flex items-center justify-between w-full px-3.5 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 transition-all active:scale-[0.98] cursor-pointer shadow-xs group select-none">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform">
                    <span class="text-xl">📱</span>
                  </div>
                  <div class="text-left min-w-0">
                    <div class="font-black text-sm text-[var(--color-text-main)] flex items-center gap-1.5">
                      <span class="truncate">{{ i18n.t('pwa.install_desktop')() || '安装到手机/桌面' }}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded font-black bg-emerald-500 text-white shrink-0">PRO</span>
                    </div>
                    <div class="text-[11px] font-normal text-[var(--color-text-secondary)] truncate">
                      {{ i18n.t('pwa.install_desc')() || '极速秒开 · 离线畅玩' }}
                    </div>
                  </div>
                </div>
                <span class="text-xs font-bold px-2.5 py-1 rounded-xl text-white bg-emerald-500 group-hover:bg-emerald-600 transition-colors shadow-xs shrink-0 ml-2">
                  {{ i18n.t('pwa.install_action')() || '安装' }}
                </span>
              </button>
            }

            <!-- Mobile Quick Settings: Theme & Language (sm-) -->
            <div class="pt-4 mt-3 border-t border-[var(--color-border-card)] flex items-center justify-between gap-3 sm:hidden">
              <button (click)="theme.cycleTheme()"
                      class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-bold text-xs text-[var(--color-text-main)] shadow-sm active:scale-95 transition-all">
                <span>{{ theme.currentTheme() === 'dark' ? '☀️' : '🌙' }}</span>
                <span>{{ theme.currentTheme() === 'dark' ? (i18n.currentLang() === 'zh' ? '浅色' : 'Light') : (i18n.currentLang() === 'zh' ? '深色' : 'Dark') }}</span>
              </button>
              
              <div class="relative flex-1">
                <button (click)="isLangMenuOpen.set(!isLangMenuOpen())"
                        class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-bold text-xs text-[var(--color-text-main)] shadow-sm active:scale-95 transition-all">
                  <span>{{ currentLangFlag() }}</span>
                  <span>{{ i18n.currentLang().toUpperCase() }}</span>
                </button>
                @if (isLangMenuOpen()) {
                  <div class="absolute right-0 bottom-full mb-2 w-48 rounded-xl shadow-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] py-2 z-[100] max-h-56 overflow-y-auto">
                    @for (lang of supportedLangs; track lang.code) {
                      <button (click)="i18n.setLang(lang.code); isLangMenuOpen.set(false); isMobileMenuOpen.set(false)" 
                              class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] flex items-center gap-3"
                              [class.text-emerald-400]="i18n.currentLang() === lang.code">
                        <span>{{ lang.flag }}</span>
                        <span>{{ lang.name }}</span>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          </nav>
        </div>
      }

      <!-- Scroll Viewport Container -->
      <div #mainScroll
           class="flex-1 block custom-scrollbar relative min-h-0 flex flex-col"
           [class.overflow-y-auto]="!zenService.isZenMode() && !isArenaRoute()"
           [class.overflow-hidden]="zenService.isZenMode() || isArenaRoute()"
           style="overflow-anchor: none;">
        <app-offline-banner></app-offline-banner>
        <!-- Main Content Landmark (Unique per page, strictly conforms to W3C HTML5 single <main> standard) -->
        <main class="flex-1 flex flex-col pb-12 sm:pb-16" [class.pb-0]="zenService.isZenMode() || isFullImmersion() || isArenaRoute()">
          <router-outlet></router-outlet>
        </main>
        @if (!zenService.isZenMode() && !isArenaRoute()) {
          <app-footer class="mt-auto"></app-footer>
        }
        <app-share-modal></app-share-modal>
      </div>

      <!-- Global PWA Install Floating Prompt (彻底避开右下角【🎁 推荐本站】按钮，已安装则自动隐匿) -->
      @if (!zenService.isZenMode() && !pwa.isStandalone() && !pwa.isAppInstalledOnDevice() && !pwa.isPromptDismissed()) {
        <!-- 
          避让策略：
          1. 移动手机端 (<sm): bottom-20 left-3 right-3 (悬浮在 bottom-6 的【🎁 推荐本站】上方，错开物理空间，完全不遮挡彼此)
          2. 平板/桌面端 (sm+): 停靠在左下角 sm:left-6 sm:right-auto sm:bottom-6 sm:w-92 (右下角归【推荐本站】，左下角归【安装应用】，对仗分明)
        -->
        <div class="fixed bottom-20 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto sm:w-92 z-[100] transition-all duration-500 ease-out transform translate-y-0 opacity-100 shadow-2xl rounded-2xl animate-fade-in-up"
             style="background-color: var(--color-bg-card); border: 1px solid var(--color-border-card)">
          <div class="p-3.5 sm:p-4 flex items-center gap-3.5">
            
            <!-- Icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md select-none"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              <span class="text-xl">📱</span>
            </div>

            <!-- Text -->
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-bold truncate" style="color: var(--color-text-main)">
                {{ i18n.t('pwa.install_title')() || (i18n.currentLang() === 'zh' ? '添加至桌面以快速访问' : 'Add to Home Screen') }}
              </p>
              <p class="text-[11px] sm:text-xs mt-0.5 truncate" style="color: var(--color-text-secondary)">
                {{ i18n.t('pwa.install_desc')() || (i18n.currentLang() === 'zh' ? '享受原生级流畅与离线体验' : 'Enjoy native app experience') }}
              </p>
            </div>

            <!-- Install Button -->
            <button (click)="pwa.triggerInstall()"
                    class="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white rounded-xl shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to));">
              {{ i18n.t('pwa.install_action')() || (i18n.currentLang() === 'zh' ? '安装' : 'Install') }}
            </button>

            <!-- Close Button -->
            <button (click)="pwa.dismissPrompt()" class="p-1 -mr-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer" title="Close">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- iOS Install Guide — bottom sheet on mobile, centered modal on sm+ -->
      @if (pwa.showIosGuide()) {
        <div class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
             (click)="pwa.closeIosGuide()">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] z-10"
               (click)="$event.stopPropagation()">
            <!-- Drag handle (mobile) -->
            <div class="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden" style="background-color: var(--color-border-card)"></div>

            <h3 class="text-lg font-black text-center mb-6" style="color: var(--color-text-main)">
              {{ i18n.t('nav.installGuideTitle')() || '添加到手机主屏幕' }}
            </h3>

            <div class="space-y-4 mb-6">
              <!-- Step 1 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">1</span>
                <div class="flex-1">
                  <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep1')() }}</p>
                  <span class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                    Share
                  </span>
                </div>
              </div>
              <!-- Step 2 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">2</span>
                <div class="flex-1">
                  <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep2')() }}</p>
                  <span class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-[var(--color-bg-main)] border border-[var(--color-border-card)]" style="color: var(--color-text-secondary)">
                    ➕ {{ i18n.currentLang() === 'zh' ? '添加到主屏幕' : 'Add to Home Screen' }}
                  </span>
                </div>
              </div>
              <!-- Step 3 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">3</span>
                <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep3')() }}</p>
              </div>
            </div>

            <p class="text-center text-xs mb-5" style="color: var(--color-text-secondary)">
              🎮 {{ i18n.t('nav.installGuideTip')() }}
            </p>

            <button (click)="pwa.closeIosGuide()"
                    class="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
                    style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              {{ i18n.t('nav.installGuideDone')() || '我知道了' }}
            </button>
          </div>
        </div>
      }

      <!-- 通用桌面 / 安卓浏览器安装向导 -->
      @if (pwa.showGeneralGuide()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
             (click)="pwa.closeGeneralGuide()">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-sm rounded-3xl p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl flex flex-col gap-4 text-center z-10"
               (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-black text-[var(--color-text-main)] flex items-center gap-2">
                <span>💻</span>
                <span>{{ i18n.t('pwa.install_desktop')() || '安装桌面应用' }}</span>
              </h3>
              <button (click)="pwa.closeGeneralGuide()" class="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            <div class="flex flex-col gap-2.5 text-xs sm:text-sm text-left text-[var(--color-text-secondary)]">
              <div class="bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
                <p class="font-bold text-[var(--color-text-main)] mb-1">桌面 Chrome / Edge 浏览器：</p>
                <p>点击网址栏右侧的【<strong class="text-emerald-500">⊕ 安装</strong>】图标，或点击右上角菜单 (⋮) 选择【安装应用】。</p>
              </div>
              <div class="bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
                <p class="font-bold text-[var(--color-text-main)] mb-1">手机浏览器：</p>
                <p>点击浏览器菜单 (⋮) -> 选择【添加到主屏幕 / 安装到手机】。</p>
              </div>
            </div>
            <button (click)="pwa.closeGeneralGuide()" class="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer">
              我知道了 (Got it)
            </button>
          </div>
        </div>
      }
      <!-- Coin Economy Rules & Guide Modal -->
      <app-coin-guide-modal />
    </div>
  `
})
export class MainLayoutComponent {
  zenService = inject(ZenModeService);
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  authStore = inject(AuthStore);
  router = inject(Router);
  pwa = inject(PwaService);
  layout = inject(LayoutService);
  liveRoom = inject(LiveRoomService);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  friendService = inject(FriendService);
  deviceService = inject(DeviceService);
  notificationService = inject(NotificationService);

  isNotificationDropdownOpen = signal(false);
  isUserMenuOpen = signal(false);

  toggleNotificationDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isNotificationDropdownOpen.update(v => !v);
    if (this.isNotificationDropdownOpen()) {
      this.isUserMenuOpen.set(false);
    }
  }

  toggleUserMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isUserMenuOpen.update(v => !v);
    if (this.isUserMenuOpen()) {
      this.isNotificationDropdownOpen.set(false);
    }
  }

  openRevengeFromDropdown(item: NotificationItem): void {
    this.isNotificationDropdownOpen.set(false);
    this.notificationService.openRevenge(item);
  }

  formatRecord(val: number, type: 'time' | 'score'): string {
    if (type === 'time') {
      const mins = Math.floor(val / 60);
      const secs = val % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${val.toLocaleString()} 分`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isNotificationDropdownOpen() && !target.closest('.notification-dropdown-container')) {
      this.isNotificationDropdownOpen.set(false);
    }
    if (this.isUserMenuOpen() && !target.closest('.user-dropdown-container')) {
      this.isUserMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isNotificationDropdownOpen()) {
      this.isNotificationDropdownOpen.set(false);
    }
    if (this.isUserMenuOpen()) {
      this.isUserMenuOpen.set(false);
    }
  }

  /**
   * 全屏沉浸判定：
   * 1. 显式开启 ZenMode（任何设备）；
   * 2. 只有手持移动设备（手机、平板）且处于沉浸请求或游戏路由时才自动满屏；
   * 3. PC 桌面端默认保持标准网页流（展示全站导航、可向下滚动查看深度攻略玩法规则与 AdSense 广告位），保障 SEO 与变现！
   */
  readonly isFullImmersion = computed(() => {
    if (this.zenService.isZenMode()) return true;
    const isHandheld = this.deviceService.isHandheld();
    return isHandheld && (this.layout.isImmersiveGame() || this.zenService.isGameRoute());
  });

  readonly isArenaRoute = computed(() => {
    return this.router.url.includes('/pk-arena');
  });

  pendingFriendRequests = computed(() => {
    return this.friendService.friends().filter(f => f.status === 'pending_received').length;
  });

  isSettingsOpen = signal(false);
  isMobileMenuOpen = signal(false);
  isLangMenuOpen = signal(false);

  supportedLangs = SUPPORTED_LANGS;
  currentLangFlag = computed(() => {
    const code = this.i18n.currentLang();
    return this.supportedLangs.find(l => l.code === code)?.flag || '🌍';
  });

  @ViewChild('mainScroll') mainScroll?: ElementRef<HTMLElement>;

  private resetScroll() {
    if (typeof window === 'undefined') return;
    
    // Immediate reset
    window.scrollTo(0, 0);
    if (this.mainScroll?.nativeElement) {
      this.mainScroll.nativeElement.scrollTop = 0;
    }
    // Delayed resets to catch post-render scroll jumps on mobile
    setTimeout(() => {
      window.scrollTo(0, 0);
      if (this.mainScroll?.nativeElement) {
        this.mainScroll.nativeElement.scrollTop = 0;
      }
    }, 10);
    setTimeout(() => {
      window.scrollTo(0, 0);
      if (this.mainScroll?.nativeElement) {
        this.mainScroll.nativeElement.scrollTop = 0;
      }
    }, 100);
  }

  constructor() {
    this.liveRoom.ensureLobbyConnected();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.isMobileMenuOpen.set(false);
      this.resetScroll();
      this.liveRoom.ensureLobbyConnected();
    });

    this.layout.scrollToTop$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => this.resetScroll());
  }

  logout() {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
