import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameService, GameConfig as BackendGameConfig, getLocalizedField } from '../../core/services/game.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthStore } from '../../core/auth/auth.store';
import { CrossGameJoinService } from '../../core/services/cross-game-join.service';
import { GameConfig as RegistryGameConfig } from '../../core/services/game-registry.service';
import { GameLobbyPanelComponent } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/version';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, GameLobbyPanelComponent],
  template: `
    <div class="flex flex-col lg:flex-row h-[calc(100vh-64px)] w-full overflow-hidden bg-[var(--color-bg-main)]">
      
      <!-- LEFT: Main Games Content -->
      <div class="flex-grow flex flex-col items-center p-4 lg:p-8 overflow-y-auto custom-scrollbar">
        <!-- Welcome Header -->
        <div class="flex flex-col items-center justify-center w-full mb-8 lg:mb-16 mt-4 lg:mt-8 relative max-w-6xl">
          <div class="text-center">
        <h1 class="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent"
            style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
          {{ i18n.t('lobby.title')() }}
        </h1>
        <p class="text-lg opacity-80 max-w-2xl mx-auto">
          {{ i18n.t('lobby.subtitle')() }}
        </p>
          </div>
          <!-- Toggle Lobby Button (Mobile Only) -->
          <button (click)="isGlobalLobbyOpen.set(true)" class="absolute right-0 top-0 p-2 sm:p-3 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg text-emerald-400 shadow-sm active:scale-95 transition-all lg:hidden hover:bg-[var(--color-bg-main)] z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>

        <!-- Games Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full pb-10">
        @for (game of games(); track game.id) {
          <!-- Dynamic Game Card -->
          <a [routerLink]="['/games', game.id]" class="group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
            <!-- Card Image Gradient Banner -->
            <div class="h-48 w-full opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-6xl relative"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              
              @if (game.id === 'minesweeper') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <rect x="10" y="10" width="80" height="80" rx="12" fill="#94a3b8" />
                  <path d="M10 10 h 40 v 40 h -40 Z" fill="#cbd5e1" rx="12" />
                  <g fill="rgba(255,255,255,0.6)">
                    <rect x="52" y="12" width="17" height="17" rx="3" />
                    <rect x="71" y="12" width="17" height="17" rx="3" />
                    <rect x="52" y="31" width="17" height="17" rx="3" />
                    <rect x="71" y="31" width="17" height="17" rx="3" />
                    <rect x="12" y="52" width="17" height="17" rx="3" />
                    <rect x="31" y="52" width="17" height="17" rx="3" />
                    <rect x="52" y="52" width="17" height="17" rx="3" />
                    <rect x="71" y="52" width="17" height="17" rx="3" />
                    <rect x="12" y="71" width="17" height="17" rx="3" />
                    <rect x="31" y="71" width="17" height="17" rx="3" />
                    <rect x="52" y="71" width="17" height="17" rx="3" />
                    <rect x="71" y="71" width="17" height="17" rx="3" />
                  </g>
                  <g transform="translate(60.5, 60.5)">
                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
                    <polygon points="0,-8 -10,-3 0,2" fill="#ef4444" />
                    <line x1="-4" y1="8" x2="4" y2="8" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
                  </g>
                  <g transform="translate(30, 30)">
                    <circle cx="0" cy="0" r="9" fill="#1e293b" />
                    <circle cx="-2.5" cy="-2.5" r="2.5" fill="white" opacity="0.4" />
                    <path d="M0 -9 l0 -4 M0 9 l0 4 M-9 0 l-4 0 M9 0 l4 0 M-7 -7 l-3 -3 M7 7 l3 3 M-7 7 l-3 -3 M7 -7 l-3 -3" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" />
                  </g>
                </svg>
              } @else if (game.id === 'sudoku') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <rect x="10" y="10" width="80" height="80" rx="8" fill="rgba(255,255,255,0.95)" />
                  <g stroke="rgba(0,0,0,0.8)" stroke-width="3" stroke-linecap="round">
                    <line x1="10" y1="36.6" x2="90" y2="36.6" />
                    <line x1="10" y1="63.3" x2="90" y2="63.3" />
                    <line x1="36.6" y1="10" x2="36.6" y2="90" />
                    <line x1="63.3" y1="10" x2="63.3" y2="90" />
                  </g>
                  <g stroke="rgba(0,0,0,0.25)" stroke-width="1.5">
                    <line x1="10" y1="18.8" x2="90" y2="18.8" />
                    <line x1="10" y1="27.7" x2="90" y2="27.7" />
                    <line x1="10" y1="45.5" x2="90" y2="45.5" />
                    <line x1="10" y1="54.4" x2="90" y2="54.4" />
                    <line x1="10" y1="72.2" x2="90" y2="72.2" />
                    <line x1="10" y1="81.1" x2="90" y2="81.1" />
                    <line x1="18.8" y1="10" x2="18.8" y2="90" />
                    <line x1="27.7" y1="10" x2="27.7" y2="90" />
                    <line x1="45.5" y1="10" x2="45.5" y2="90" />
                    <line x1="54.4" y1="10" x2="54.4" y2="90" />
                    <line x1="72.2" y1="10" x2="72.2" y2="90" />
                    <line x1="81.1" y1="10" x2="81.1" y2="90" />
                  </g>
                  <rect x="10" y="10" width="26.6" height="26.6" fill="#34d399" opacity="0.6" rx="6" />
                  <rect x="63.3" y="36.6" width="26.6" height="26.6" fill="#60a5fa" opacity="0.6" />
                  <text x="23.3" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#064e3b" text-anchor="middle">5</text>
                  <text x="76.6" y="53.6" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e3a8a" text-anchor="middle">9</text>
                </svg>
              } @else if (game.id === 'sliding') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <g fill="rgba(255,255,255,0.95)" stroke="rgba(0,0,0,0.15)" stroke-width="2">
                    <rect x="10" y="10" width="24" height="24" rx="6" />
                    <rect x="38" y="10" width="24" height="24" rx="6" />
                    <rect x="66" y="10" width="24" height="24" rx="6" />
                    <rect x="10" y="38" width="24" height="24" rx="6" />
                    <rect x="38" y="38" width="24" height="24" rx="6" />
                    <rect x="10" y="66" width="24" height="24" rx="6" />
                    <rect x="38" y="66" width="24" height="24" rx="6" />
                  </g>
                  <rect x="66" y="66" width="24" height="24" rx="6" fill="rgba(0,0,0,0.15)" />
                  <rect x="66" y="38" width="24" height="24" rx="6" fill="rgba(0,0,0,0.15)" />
                  <rect x="66" y="47" width="24" height="24" rx="6" fill="#60a5fa" />
                  <text x="22" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">1</text>
                  <text x="50" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">2</text>
                  <text x="78" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">3</text>
                  <text x="22" y="55" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">4</text>
                  <text x="50" y="55" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">5</text>
                  <text x="78" y="64" font-family="sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">6</text>
                  <text x="22" y="83" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">7</text>
                  <text x="50" y="83" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">8</text>
                </svg>
              } @else if (game.id === 'hexa') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <defs>
                    <linearGradient id="h-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#334155" />
                      <stop offset="100%" stop-color="#1e293b" />
                    </linearGradient>
                    <linearGradient id="h-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#60a5fa" /><stop offset="100%" stop-color="#2563eb" />
                    </linearGradient>
                    <linearGradient id="h-red" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#f87171" /><stop offset="100%" stop-color="#dc2626" />
                    </linearGradient>
                    <linearGradient id="h-yellow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#fde047" /><stop offset="100%" stop-color="#ca8a04" />
                    </linearGradient>
                    <linearGradient id="h-green" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#4ade80" /><stop offset="100%" stop-color="#16a34a" />
                    </linearGradient>
                    
                    <polygon id="hx-cell" points="0,-8 6.9,-4 6.9,4 0,8 -6.9,4 -6.9,-4" />
                    <polygon id="hx-piece" points="0,-7.5 6.5,-3.75 6.5,3.75 0,7.5 -6.5,3.75 -6.5,-3.75" />
                    <filter id="h-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
                    </filter>
                  </defs>
                  
                  <g fill="url(#h-bg)" stroke="#0f172a" stroke-width="1.5">
                    <use href="#hx-cell" x="50" y="50" />
                    <use href="#hx-cell" x="63.9" y="50" />
                    <use href="#hx-cell" x="56.9" y="62" />
                    <use href="#hx-cell" x="43.1" y="62" />
                    <use href="#hx-cell" x="36.1" y="50" />
                    <use href="#hx-cell" x="43.1" y="38" />
                    <use href="#hx-cell" x="56.9" y="38" />
                    
                    <use href="#hx-cell" x="77.7" y="50" />
                    <use href="#hx-cell" x="70.8" y="62" />
                    <use href="#hx-cell" x="56.9" y="74" />
                    <use href="#hx-cell" x="43.1" y="74" />
                    <use href="#hx-cell" x="29.2" y="74" />
                    <use href="#hx-cell" x="22.3" y="62" />
                    <use href="#hx-cell" x="22.3" y="50" />
                    <use href="#hx-cell" x="29.2" y="38" />
                    <use href="#hx-cell" x="43.1" y="26" />
                    <use href="#hx-cell" x="56.9" y="26" />
                    <use href="#hx-cell" x="70.8" y="26" />
                    <use href="#hx-cell" x="77.7" y="38" />
                  </g>
                  
                  <g filter="url(#h-shadow)">
                    <!-- Blue Triangle -->
                    <g fill="url(#h-blue)" stroke="rgba(255,255,255,0.3)" stroke-width="1">
                      <use href="#hx-piece" x="43.1" y="38" />
                      <use href="#hx-piece" x="29.2" y="38" />
                      <use href="#hx-piece" x="43.1" y="26" />
                    </g>
                    <!-- Red Zigzag -->
                    <g fill="url(#h-red)" stroke="rgba(255,255,255,0.3)" stroke-width="1">
                      <use href="#hx-piece" x="70.8" y="26" />
                      <use href="#hx-piece" x="77.7" y="38" />
                      <use href="#hx-piece" x="77.7" y="50" />
                      <use href="#hx-piece" x="70.8" y="62" />
                    </g>
                    <!-- Green Diamond -->
                    <g fill="url(#h-green)" stroke="rgba(255,255,255,0.3)" stroke-width="1">
                      <use href="#hx-piece" x="50" y="50" />
                      <use href="#hx-piece" x="36.1" y="50" />
                      <use href="#hx-piece" x="43.1" y="62" />
                      <use href="#hx-piece" x="56.9" y="62" />
                    </g>
                    <!-- Floating Yellow Piece -->
                    <g fill="url(#h-yellow)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" transform="scale(1.1) translate(-3, 1)">
                      <use href="#hx-piece" x="43.1" y="74" />
                      <use href="#hx-piece" x="56.9" y="74" />
                    </g>
                  </g>
                </svg>
              } @else if (game.id === 'tetris') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <defs>
                    <linearGradient id="t-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>
                    <linearGradient id="t-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
                    <linearGradient id="t-yellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient>
                    <linearGradient id="t-cyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/></linearGradient>
                    <linearGradient id="t-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>
                    <linearGradient id="t-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#9333ea"/></linearGradient>
                    <linearGradient id="t-orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fb923c"/><stop offset="100%" stop-color="#ea580c"/></linearGradient>
                    <rect id="tb" width="4.5" height="4.5" rx="0.5" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
                    <filter id="t-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="1" flood-color="#000" flood-opacity="0.6"/>
                    </filter>
                  </defs>
                  
                  <rect x="25" y="10" width="50" height="80" rx="3" fill="#0f172a" stroke="#334155" stroke-width="2" />
                  
                  <g stroke="#334155" stroke-width="0.5" opacity="0.4">
                    <line x1="30" y1="10" x2="30" y2="90" /><line x1="35" y1="10" x2="35" y2="90" /><line x1="40" y1="10" x2="40" y2="90" /><line x1="45" y1="10" x2="45" y2="90" /><line x1="50" y1="10" x2="50" y2="90" /><line x1="55" y1="10" x2="55" y2="90" /><line x1="60" y1="10" x2="60" y2="90" /><line x1="65" y1="10" x2="65" y2="90" /><line x1="70" y1="10" x2="70" y2="90" />
                    <line x1="25" y1="15" x2="75" y2="15" /><line x1="25" y1="20" x2="75" y2="20" /><line x1="25" y1="25" x2="75" y2="25" /><line x1="25" y1="30" x2="75" y2="30" /><line x1="25" y1="35" x2="75" y2="35" /><line x1="25" y1="40" x2="75" y2="40" /><line x1="25" y1="45" x2="75" y2="45" /><line x1="25" y1="50" x2="75" y2="50" /><line x1="25" y1="55" x2="75" y2="55" /><line x1="25" y1="60" x2="75" y2="60" /><line x1="25" y1="65" x2="75" y2="65" /><line x1="25" y1="70" x2="75" y2="70" /><line x1="25" y1="75" x2="75" y2="75" /><line x1="25" y1="80" x2="75" y2="80" /><line x1="25" y1="85" x2="75" y2="85" />
                  </g>
                  
                  <g filter="url(#t-shadow)">
                    <!-- Stacked -->
                    <g fill="url(#t-blue)"><use href="#tb" x="25" y="85" /><use href="#tb" x="30" y="85" /><use href="#tb" x="35" y="85" /><use href="#tb" x="25" y="80" /></g>
                    <g fill="url(#t-orange)"><use href="#tb" x="40" y="85" /><use href="#tb" x="45" y="85" /><use href="#tb" x="50" y="85" /><use href="#tb" x="50" y="80" /></g>
                    <g fill="url(#t-yellow)"><use href="#tb" x="55" y="85" /><use href="#tb" x="60" y="85" /><use href="#tb" x="55" y="80" /><use href="#tb" x="60" y="80" /></g>
                    <g fill="url(#t-red)"><use href="#tb" x="30" y="80" /><use href="#tb" x="35" y="80" /><use href="#tb" x="35" y="75" /><use href="#tb" x="40" y="75" /></g>
                    <g fill="url(#t-green)"><use href="#tb" x="65" y="85" /><use href="#tb" x="70" y="85" /><use href="#tb" x="60" y="75" /><use href="#tb" x="65" y="75" /></g>
                    
                    <!-- Falling -->
                    <g fill="url(#t-cyan)"><use href="#tb" x="45" y="25" /><use href="#tb" x="45" y="30" /><use href="#tb" x="45" y="35" /><use href="#tb" x="45" y="40" /></g>
                    <g fill="url(#t-purple)"><use href="#tb" x="30" y="45" /><use href="#tb" x="35" y="45" /><use href="#tb" x="40" y="45" /><use href="#tb" x="35" y="50" /></g>
                  </g>
                </svg>
              } @else if (game.id === 'codebreaker') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <rect x="10" y="10" width="80" height="80" rx="12" fill="#1e293b" />
                  
                  <!-- Cyber Security Cipher Lock Design -->
                  <!-- Lock Shackle (U-bar) -->
                  <path d="M 32 35 V 24 A 18 18 0 0 1 68 24 V 35" fill="none" stroke="#60a5fa" stroke-width="7" stroke-linecap="round" />
                  
                  <!-- Lock Body -->
                  <rect x="15" y="32" width="70" height="52" rx="10" fill="#0f172a" stroke="#34d399" stroke-width="3" />
                  
                  <!-- Huge 1A2B Text -->
                  <text x="50" y="58" font-family="monospace" font-size="22" font-weight="900" text-anchor="middle" letter-spacing="1">
                    <tspan fill="#10b981">1</tspan>
                    <tspan fill="#ef4444">A</tspan>
                    <tspan fill="#3b82f6">2</tspan>
                    <tspan fill="#eab308">B</tspan>
                  </text>
                  
                  <!-- Small Keyhole at bottom -->
                  <circle cx="50" cy="72" r="4" fill="#34d399" />
                  <path d="M 48 74 L 47 80 L 53 80 L 52 74 Z" fill="#34d399" />
                </svg>
              } @else if (game.id === 'math24') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <!-- Math Operators in Background -->
                  <g fill="rgba(255,255,255,0.25)" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">
                    <text x="20" y="32">+</text>
                    <text x="80" y="38">-</text>
                    <text x="25" y="85">×</text>
                    <text x="80" y="80">÷</text>
                  </g>

                  <!-- Left Card (Black Suit) -->
                  <g transform="translate(35, 55) rotate(-15) translate(-35, -55)">
                    <rect x="15" y="25" width="40" height="60" rx="6" fill="#f8fafc" stroke="rgba(0,0,0,0.1)" stroke-width="2" />
                    <text x="22" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">3</text>
                    <text x="22" y="56" font-family="sans-serif" font-size="14" fill="#0f172a">♠</text>
                    <text x="35" y="65" font-family="sans-serif" font-size="24" fill="#0f172a" text-anchor="middle">♠</text>
                  </g>
                  
                  <!-- Right Card (Red Suit) -->
                  <g transform="translate(65, 50) rotate(12) translate(-65, -50)">
                    <rect x="45" y="20" width="40" height="60" rx="6" fill="#ffffff" stroke="rgba(0,0,0,0.15)" stroke-width="2" />
                    <text x="52" y="37" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ef4444">8</text>
                    <text x="52" y="51" font-family="sans-serif" font-size="14" fill="#ef4444">♥</text>
                    <text x="65" y="60" font-family="sans-serif" font-size="24" fill="#ef4444" text-anchor="middle">♥</text>
                  </g>

                  <!-- Math24 Badge -->
                  <g transform="translate(50, 75)">
                    <rect x="-24" y="-16" width="48" height="30" rx="15" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
                    <text x="0" y="5" font-family="sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">24</text>
                  </g>
                </svg>
              } @else if (game.id === 'drop2048') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <defs>
                    <g id="hi">
                      <rect width="14" height="3" rx="1.5" fill="#ffffff" opacity="0.3" pointer-events="none" />
                      <rect y="11" width="14" height="3" rx="1.5" fill="#000000" opacity="0.2" pointer-events="none" />
                    </g>
                  </defs>
                  
                  <!-- Board Background -->
                  <rect x="8" y="10" width="84" height="80" rx="6" fill="#0f172a" />
                  
                  <!-- Highlighted Column -->
                  <rect x="42" y="10" width="16" height="80" fill="#ffffff" opacity="0.05" />

                  <!-- Block 0,0 (128 - orange) -->
                  <g transform="translate(11, 74)">
                    <rect width="14" height="14" rx="3" fill="#f97316" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle">128</text>
                  </g>
                  
                  <!-- Block 1,0 (32 - purple) -->
                  <g transform="translate(27, 74)">
                    <rect width="14" height="14" rx="3" fill="#a855f7" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle">32</text>
                  </g>

                  <!-- Block 2,0 (128 - orange) -->
                  <g transform="translate(43, 74)">
                    <rect width="14" height="14" rx="3" fill="#f97316" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle">128</text>
                  </g>

                  <!-- Block 3,0 (32 - purple) -->
                  <g transform="translate(59, 74)">
                    <rect width="14" height="14" rx="3" fill="#a855f7" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle">32</text>
                  </g>

                  <!-- Block 4,0 (8 - yellow) -->
                  <g transform="translate(75, 74)">
                    <rect width="14" height="14" rx="3" fill="#eab308" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">8</text>
                  </g>

                  <!-- Row 1 (y=58) -->
                  <g transform="translate(11, 58)">
                    <rect width="14" height="14" rx="3" fill="#ec4899" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle">64</text>
                  </g>
                  <g transform="translate(27, 58)">
                    <rect width="14" height="14" rx="3" fill="#22c55e" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">4</text>
                  </g>
                  <g transform="translate(43, 58)">
                    <rect width="14" height="14" rx="3" fill="#ec4899" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle">64</text>
                  </g>
                  <g transform="translate(75, 58)">
                    <rect width="14" height="14" rx="3" fill="#22c55e" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">4</text>
                  </g>

                  <!-- Row 2 (y=42) -->
                  <g transform="translate(11, 42)">
                    <rect width="14" height="14" rx="3" fill="#eab308" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">8</text>
                  </g>
                  <g transform="translate(27, 42)">
                    <rect width="14" height="14" rx="3" fill="#ef4444" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">2</text>
                  </g>
                  <g transform="translate(43, 42)">
                    <rect width="14" height="14" rx="3" fill="#22c55e" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">4</text>
                  </g>
                  <g transform="translate(75, 42)">
                    <rect width="14" height="14" rx="3" fill="#b91c1c" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">2</text>
                  </g>

                  <!-- Motion Trails for falling block -->
                  <g stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" opacity="0.6">
                    <line x1="47" y1="12" x2="47" y2="16" />
                    <line x1="50" y1="11" x2="50" y2="16" />
                    <line x1="53" y1="13" x2="53" y2="16" />
                  </g>

                  <!-- Falling Block (2 - red) at y=18 -->
                  <g transform="translate(43, 18)">
                    <!-- Glow behind -->
                    <rect x="-3" y="-3" width="20" height="20" rx="5" fill="#ef4444" opacity="0.3" />
                    <rect width="14" height="14" rx="3" fill="#ef4444" />
                    <use href="#hi" />
                    <text x="7" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">2</text>
                  </g>
                </svg>
              } @else {                <span class="text-6xl">{{ getGameEmoji(game.id) }}</span>
              }
            </div>
            <!-- Card Content -->
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-2">{{ getLocalized(game.name) }}</h2>
              <p class="opacity-70 text-sm line-clamp-2">
                {{ getLocalized(game.overview) }}
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="px-2 py-1 text-xs font-semibold rounded bg-[var(--color-bg-main)] shadow-sm border border-[var(--color-border-card)] text-emerald-500">{{ i18n.t('lobby.ready')() }}</span>
                @for (mode of getGameModes(game.id); track mode) {
                  <span class="px-2 py-1 text-xs font-semibold rounded bg-[var(--color-bg-main)] shadow-sm border border-[var(--color-border-card)] text-[var(--color-accent-from)]">{{ mode }}</span>
                }
              </div>
            </div>
          </a>
        }
        </div>

        <!-- Copyright & Version Footer -->
        <div class="w-full mt-auto pt-16 pb-8 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-sm opacity-60">
          <p>© 2026 X-Game. All rights reserved.</p>
          <div class="flex items-center gap-4 mt-2 font-mono text-xs">
            <span>Frontend: {{ frontendVersion }}</span>
            <span class="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
            <span>Backend: {{ backendVersion }}</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Global Arena Lobby (Sidebar on Desktop, Drawer on Mobile) -->
      @if (isGlobalLobbyOpen()) {
        <!-- Overlay Background for Mobile -->
        <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden transition-opacity"
             (click)="isGlobalLobbyOpen.set(false)"></div>
      }

      <!-- Sidebar Container -->
      <div class="fixed lg:static top-[64px] lg:top-0 right-0 h-[calc(100vh-64px)] lg:h-full w-[300px] sm:w-[350px] lg:w-[350px] xl:w-[400px] z-50 lg:z-auto transition-transform duration-300 ease-in-out shrink-0 flex flex-col p-0 lg:p-4 bg-[var(--color-bg-main)] lg:bg-transparent border-l border-[var(--color-border-card)] lg:border-none"
           [class.translate-x-0]="isGlobalLobbyOpen()"
           [class.translate-x-full]="!isGlobalLobbyOpen()"
           [class.lg:translate-x-0]="true">

        <app-game-lobby-panel
          class="flex-grow flex w-full h-full min-h-0 lg:h-full lg:bg-transparent"
          [isGlobal]="true"
          (createRoom)="handleGlobalCreateRoom($event)">
        </app-game-lobby-panel>
      </div>

    </div>
  `
})
export class LobbyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  gameService = inject(GameService);
  private wsService = inject(WebSocketService);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  private http = inject(HttpClient);
  router = inject(Router);
  
  games = signal<BackendGameConfig[]>([]);
  isGlobalLobbyOpen = signal(false);
  frontendVersion = environment.version;
  backendVersion = 'loading...';

  ngOnInit() {
    this.http.get<{version: string}>(`${environment.apiUrl}/version`).subscribe({
      next: (res) => this.backendVersion = res.version,
      error: () => this.backendVersion = 'unknown'
    });

    this.gameService.getGames().subscribe({
      next: (data) => {
        this.games.set(data);
      },
      error: (err) => {
        console.error('Failed to load games', err);
      }
    });

    const player = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.wsService.connectLobby(player, player);
  }

  ngOnDestroy() {
    this.wsService.disconnectLobby();
  }

  handleGlobalCreateRoom(event: {name: string, gameId: string, mode: string, difficulty: string}) {
    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.crossGameJoin.setPendingJoin({
      game: event.gameId,
      roomId: event.name,
      mode: event.mode,
      difficulty: event.difficulty,
      host: playerId
    });
    this.router.navigate([`/games/${event.gameId}`]);
  }

  getGameEmoji(id: string): string {
    switch (id) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      case 'hexa': return '🔶';
      case 'gomoku': return '⚫⚪';
      case 'codebreaker': return '🔐';
      case 'drop2048': return '🧊';
      default: return '🎮';
    }
  }

  getGameModes(id: string): string[] {
    const isZh = this.i18n.currentLang() === 'zh';
    switch (id) {
      case 'minesweeper': return isZh ? ['⚡ 同盘抢雷', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sudoku': return isZh ? ['⚡ 同盘填数', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sliding': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'hexa': return isZh ? ['⏱️ 异盘竞分'] : ['⏱️ PK Score'];
      case 'gomoku': return isZh ? ['⚔️ 经典对战'] : ['⚔️ PK Classic'];
      case 'math24': return isZh ? ['⚡ 同盘抢分', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'codebreaker': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'drop2048': return isZh ? ['⏱️ 积分赛'] : ['⏱️ PK Score'];
      default: return [];
    }
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }
}
