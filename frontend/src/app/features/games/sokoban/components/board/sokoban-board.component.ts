import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, HostListener, computed, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SokobanStore } from '../../store/sokoban.store';

@Component({
  selector: 'app-sokoban-board',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    /* ─── Player Wrapper ─── */
    .player-wrapper { /* no transition on transform — instant direction flip */ }
    .player-wrapper.facing-left { transform: scaleX(-1); }

    /* Hide inactive views */
    .view-down, .view-up, .view-side { display: none; }
    .dir-down .view-down { display: block; }
    .dir-up .view-up   { display: block; }
    .dir-left .view-side, .dir-right .view-side { display: block; }

    /* ─── Limb transition for idle return ─── */
    .leg-l, .leg-r, .arm-l, .arm-r, .body-core, .head {
      transition: transform 0.12s ease-out;
    }

    /* ═══════════════════════════════════════════
       WALK — Down / Up  (vertical bounce legs)
       ═══════════════════════════════════════════ */
    @keyframes walk-bounce-l {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-7px); }
    }
    @keyframes walk-bounce-r {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-7px); }
    }
    .action-walk.dir-down .leg-l, .action-walk.dir-up .leg-l {
      animation: walk-bounce-l 0.25s ease-in-out infinite;
    }
    .action-walk.dir-down .leg-r, .action-walk.dir-up .leg-r {
      animation: walk-bounce-r 0.25s ease-in-out infinite 0.12s;
    }
    .action-walk.dir-down .arm-l, .action-walk.dir-up .arm-l {
      animation: walk-bounce-r 0.25s ease-in-out infinite;
    }
    .action-walk.dir-down .arm-r, .action-walk.dir-up .arm-r {
      animation: walk-bounce-l 0.25s ease-in-out infinite 0.12s;
    }

    /* ═══════════════════════════════════════════
       WALK — Side  (rotate legs like scissors)
       ═══════════════════════════════════════════ */
    @keyframes walk-rot-fwd {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(30deg); }
      75% { transform: rotate(-30deg); }
    }
    @keyframes walk-rot-back {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-30deg); }
      75% { transform: rotate(30deg); }
    }
    .action-walk.dir-left .leg-l, .action-walk.dir-right .leg-l {
      animation: walk-rot-fwd 0.28s ease-in-out infinite;
    }
    .action-walk.dir-left .leg-r, .action-walk.dir-right .leg-r {
      animation: walk-rot-back 0.28s ease-in-out infinite;
    }
    .action-walk.dir-left .arm-l, .action-walk.dir-right .arm-l {
      animation: walk-rot-back 0.28s ease-in-out infinite;
    }
    .action-walk.dir-left .arm-r, .action-walk.dir-right .arm-r {
      animation: walk-rot-fwd 0.28s ease-in-out infinite;
    }

    /* ═══════════════════════════════════════════
       PUSH — Down  (arms reach down, body leans)
       ═══════════════════════════════════════════ */
    @keyframes push-down-arm {
      0%, 100% { transform: translateY(4px) scaleY(1.05); }
      50%      { transform: translateY(6px) scaleY(1.08); }
    }
    @keyframes push-down-body {
      0%, 100% { transform: translateY(2px); }
      50%      { transform: translateY(4px); }
    }
    .action-push.dir-down .arm-l, .action-push.dir-down .arm-r {
      animation: push-down-arm 0.35s ease-in-out infinite;
    }
    .action-push.dir-down .body-core, .action-push.dir-down .head {
      animation: push-down-body 0.35s ease-in-out infinite;
    }
    .action-push.dir-down .leg-l { animation: walk-bounce-l 0.35s ease-in-out infinite; }
    .action-push.dir-down .leg-r { animation: walk-bounce-r 0.35s ease-in-out infinite 0.17s; }

    /* ═══════════════════════════════════════════
       PUSH — Up  (arms reach up / overhead)
       ═══════════════════════════════════════════ */
    @keyframes push-up-arm {
      0%, 100% { transform: translateY(-4px) scaleY(1.05); }
      50%      { transform: translateY(-6px) scaleY(1.08); }
    }
    @keyframes push-up-body {
      0%, 100% { transform: translateY(-2px); }
      50%      { transform: translateY(-4px); }
    }
    .action-push.dir-up .arm-l, .action-push.dir-up .arm-r {
      animation: push-up-arm 0.35s ease-in-out infinite;
    }
    .action-push.dir-up .body-core, .action-push.dir-up .head {
      animation: push-up-body 0.35s ease-in-out infinite;
    }
    .action-push.dir-up .leg-l { animation: walk-bounce-l 0.35s ease-in-out infinite; }
    .action-push.dir-up .leg-r { animation: walk-bounce-r 0.35s ease-in-out infinite 0.17s; }

    /* ═══════════════════════════════════════════
       PUSH — Side (lean forward, arms straight)
       ═══════════════════════════════════════════ */
    @keyframes push-side-arm {
      0%, 100% { transform: rotate(-60deg); }
      50%      { transform: rotate(-70deg); }
    }
    @keyframes push-side-body {
      0%, 100% { transform: rotate(8deg) translateX(2px); }
      50%      { transform: rotate(12deg) translateX(4px); }
    }
    .action-push.dir-left .arm-l, .action-push.dir-left .arm-r,
    .action-push.dir-right .arm-l, .action-push.dir-right .arm-r {
      animation: push-side-arm 0.35s ease-in-out infinite;
    }
    .action-push.dir-left .body-core, .action-push.dir-left .head,
    .action-push.dir-right .body-core, .action-push.dir-right .head {
      animation: push-side-body 0.35s ease-in-out infinite;
    }
    .action-push.dir-left .leg-l, .action-push.dir-right .leg-l {
      animation: walk-rot-fwd 0.35s ease-in-out infinite;
    }
    .action-push.dir-left .leg-r, .action-push.dir-right .leg-r {
      animation: walk-rot-back 0.35s ease-in-out infinite;
    }
  `],
  template: `
    <div class="relative w-full h-full bg-sky-200 rounded-xl border-[4px] border-slate-700 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-center touch-none select-none"
         style="-webkit-touch-callout: none;"
         (contextmenu)="$event.preventDefault()"
         (touchstart)="onTouchStart($event)"
         (touchend)="onTouchEnd($event)">
      
      <div class="grid relative bg-[#3b82f6]"
           style="box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.2); background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\' width=\\'60\\' height=\\'60\\'%3E%3Cline x1=\\'0\\' y1=\\'25\\' x2=\\'100\\' y2=\\'25\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'0\\' y1=\\'50\\' x2=\\'100\\' y2=\\'50\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'0\\' y1=\\'75\\' x2=\\'100\\' y2=\\'75\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'50\\' y1=\\'0\\' x2=\\'50\\' y2=\\'25\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'25\\' y1=\\'25\\' x2=\\'25\\' y2=\\'50\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'75\\' y1=\\'25\\' x2=\\'75\\' y2=\\'50\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'50\\' y1=\\'50\\' x2=\\'50\\' y2=\\'75\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'25\\' y1=\\'75\\' x2=\\'25\\' y2=\\'100\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3Cline x1=\\'75\\' y1=\\'75\\' x2=\\'75\\' y2=\\'100\\' stroke=\\'%231e3a8a\\' stroke-width=\\'3\\'/%3E%3C/svg%3E');"
           [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
           [style.grid-template-rows]="'repeat(' + rows() + ', minmax(0, 1fr))'"
           [style.width]="boardWidth()"
           [style.height]="boardHeight()">
        
        @for (row of activeBoard(); track $index; let r = $index) {
          @for (cell of row; track $index; let c = $index) {
            <div class="flex items-center justify-center w-full h-full relative overflow-hidden cursor-pointer"
                 [ngClass]="getFloorClass(r, c)"
                 (click)="onCellClick(r, c)">
              
              @if (cell === '#') {
                <!-- Grey/White Brick Wall -->
                <div class="absolute inset-0 bg-[#cbd5e1] z-10"
                     [ngStyle]="getWallStyle(r, c)">
                  <svg class="w-full h-full opacity-40 absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" stroke-width="3"/>
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" stroke-width="3"/>
                    
                    <line x1="50" y1="0" x2="50" y2="25" stroke="#334155" stroke-width="3"/>
                    <line x1="25" y1="25" x2="25" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="75" y1="25" x2="75" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="50" y1="50" x2="50" y2="75" stroke="#334155" stroke-width="3"/>
                    <line x1="25" y1="75" x2="25" y2="100" stroke="#334155" stroke-width="3"/>
                    <line x1="75" y1="75" x2="75" y2="100" stroke="#334155" stroke-width="3"/>
                  </svg>
                </div>
              }

              @if (cell === '.' || cell === '*' || cell === '+') {
                <!-- Target Orb -->
                <div class="absolute inset-0 flex items-center justify-center z-10">
                  <div class="w-[35%] h-[35%] rounded-full bg-gradient-to-br from-[#fef08a] to-[#eab308] shadow-[0_0_15px_rgba(250,204,21,1)] border border-[#ca8a04]"></div>
                </div>
              }

              @if (cell === '$' || cell === '*') {
                <!-- Box -->
                <div class="w-[85%] h-[85%] relative flex items-center justify-center z-20 transition-all duration-300"
                     [ngStyle]="getBoxStyle(cell)">
                  <!-- Inner Border and X -->
                  <div class="absolute inset-0 m-[3px] border-[3px] flex items-center justify-center transition-colors duration-300"
                       [ngClass]="cell === '*' ? 'border-white' : 'border-[#166534]'">
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      <line x1="0" y1="0" x2="100" y2="100" stroke-width="15" [attr.stroke]="cell === '*' ? 'white' : '#166534'" class="transition-colors duration-300"/>
                      <line x1="100" y1="0" x2="0" y2="100" stroke-width="15" [attr.stroke]="cell === '*' ? 'white' : '#166534'" class="transition-colors duration-300"/>
                    </svg>
                  </div>
                  <!-- Corner Dots -->
                  <div class="absolute top-[2px] left-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute top-[2px] right-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute bottom-[2px] left-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute bottom-[2px] right-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                </div>
              }

              @if (cell === '@' || cell === '+') {
                <!-- Player -->
                <div class="w-[90%] h-[90%] z-30 relative flex items-center justify-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] player-wrapper"
                     [ngClass]="[
                       'dir-' + playerDir(),
                       playerDir() === 'left' ? 'facing-left' : '',
                       'action-' + playerAction()
                     ]">
                    <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-lg">
                      <defs>
                        <radialGradient id="skinHead" cx="35%" cy="35%" r="65%">
                          <stop offset="0%" stop-color="#fde68a"/>
                          <stop offset="60%" stop-color="#f59e0b"/>
                          <stop offset="100%" stop-color="#b45309"/>
                        </radialGradient>
                        <linearGradient id="skinBody" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#b45309"/>
                          <stop offset="25%" stop-color="#f59e0b"/>
                          <stop offset="50%" stop-color="#fde68a"/>
                          <stop offset="75%" stop-color="#f59e0b"/>
                          <stop offset="100%" stop-color="#b45309"/>
                        </linearGradient>
                        <linearGradient id="skinArm" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#92400e"/>
                          <stop offset="50%" stop-color="#f59e0b"/>
                          <stop offset="100%" stop-color="#92400e"/>
                        </linearGradient>
                        <radialGradient id="skinFist" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stop-color="#fde68a"/>
                          <stop offset="60%" stop-color="#f59e0b"/>
                          <stop offset="100%" stop-color="#92400e"/>
                        </radialGradient>
                        <linearGradient id="pants" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#1e3a8a"/>
                          <stop offset="50%" stop-color="#2563eb"/>
                          <stop offset="100%" stop-color="#1e3a8a"/>
                        </linearGradient>
                        <linearGradient id="belt" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stop-color="#44403c"/>
                          <stop offset="100%" stop-color="#0c0a09"/>
                        </linearGradient>
                        <radialGradient id="buckle" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stop-color="#fef08a"/>
                          <stop offset="50%" stop-color="#eab308"/>
                          <stop offset="100%" stop-color="#854d0e"/>
                        </radialGradient>
                        <linearGradient id="shoe" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stop-color="#57534e"/>
                          <stop offset="100%" stop-color="#1c1917"/>
                        </linearGradient>
                        <radialGradient id="hair" cx="40%" cy="20%" r="80%">
                          <stop offset="0%" stop-color="#44403c"/>
                          <stop offset="50%" stop-color="#1c1917"/>
                          <stop offset="100%" stop-color="#000"/>
                        </radialGradient>
                      </defs>

                      <!-- ══════════ VIEW DOWN (front-facing) ══════════ -->
                      <g class="view-down">
                        <!-- Back arms (behind body) -->
                        <g class="arm-l" style="transform-origin: 28px 42px;">
                          <path d="M 28 42 Q 12 50 18 72" fill="none" stroke="url(#skinArm)" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="18" cy="72" r="7" fill="url(#skinFist)"/>
                        </g>
                        <g class="arm-r" style="transform-origin: 72px 42px;">
                          <path d="M 72 42 Q 88 50 82 72" fill="none" stroke="url(#skinArm)" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="82" cy="72" r="7" fill="url(#skinFist)"/>
                        </g>
                        <!-- Legs -->
                        <g class="leg-l" style="transform-origin: 40px 78px;">
                          <path d="M 40 78 L 38 94" fill="none" stroke="url(#skinArm)" stroke-width="11" stroke-linecap="round"/>
                          <rect x="32" y="90" width="13" height="8" rx="3" fill="url(#shoe)"/>
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 78px;">
                          <path d="M 60 78 L 62 94" fill="none" stroke="url(#skinArm)" stroke-width="11" stroke-linecap="round"/>
                          <rect x="55" y="90" width="13" height="8" rx="3" fill="url(#shoe)"/>
                        </g>
                        <!-- Body — muscular V-shape torso -->
                        <g class="body-core" style="transform-origin: 50px 58px;">
                          <path d="M 24 38 Q 50 24 76 38 L 66 72 L 34 72 Z" fill="url(#skinBody)"/>
                          <!-- pec line -->
                          <path d="M 36 52 Q 44 58 50 52 Q 56 58 64 52" fill="none" stroke="#92400e" stroke-width="1.8" opacity="0.7"/>
                          <!-- ab line -->
                          <line x1="50" y1="56" x2="50" y2="68" stroke="#92400e" stroke-width="1.5" opacity="0.6"/>
                          <line x1="43" y1="62" x2="57" y2="62" stroke="#92400e" stroke-width="1.5" opacity="0.5"/>
                          <!-- Belt + pants -->
                          <rect x="32" y="70" width="36" height="6" rx="2" fill="url(#belt)"/>
                          <rect x="43" y="68" width="14" height="10" rx="3" fill="url(#buckle)"/>
                          <path d="M 34 76 L 66 76 L 64 86 L 54 86 L 50 80 L 46 86 L 36 86 Z" fill="url(#pants)"/>
                        </g>
                        <!-- Head -->
                        <g class="head" style="transform-origin: 50px 24px;">
                          <circle cx="50" cy="24" r="15" fill="url(#skinHead)"/>
                          <!-- Hair — pompadour -->
                          <path d="M 35 24 Q 32 6 50 4 Q 68 6 65 24 Q 58 14 50 14 Q 42 14 35 24 Z" fill="url(#hair)"/>
                          <!-- Thick eyebrows -->
                          <line x1="38" y1="19" x2="46" y2="21" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round"/>
                          <line x1="62" y1="19" x2="54" y2="21" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round"/>
                          <!-- Eyes -->
                          <circle cx="43" cy="24" r="2.2" fill="#000"/>
                          <circle cx="57" cy="24" r="2.2" fill="#000"/>
                          <!-- Confident grin -->
                          <path d="M 44 31 Q 50 35 56 31" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
                          <!-- Goatee -->
                          <path d="M 46 34 Q 50 40 54 34 Z" fill="url(#hair)"/>
                        </g>
                      </g>

                      <!-- ══════════ VIEW UP (back-facing) ══════════ -->
                      <g class="view-up">
                        <!-- Arms behind back -->
                        <g class="arm-l" style="transform-origin: 28px 42px;">
                          <path d="M 28 42 Q 12 50 18 72" fill="none" stroke="url(#skinArm)" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="18" cy="72" r="7" fill="url(#skinFist)"/>
                        </g>
                        <g class="arm-r" style="transform-origin: 72px 42px;">
                          <path d="M 72 42 Q 88 50 82 72" fill="none" stroke="url(#skinArm)" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="82" cy="72" r="7" fill="url(#skinFist)"/>
                        </g>
                        <!-- Legs -->
                        <g class="leg-l" style="transform-origin: 40px 78px;">
                          <path d="M 40 78 L 38 94" fill="none" stroke="url(#skinArm)" stroke-width="11" stroke-linecap="round"/>
                          <rect x="32" y="90" width="13" height="8" rx="3" fill="url(#shoe)"/>
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 78px;">
                          <path d="M 60 78 L 62 94" fill="none" stroke="url(#skinArm)" stroke-width="11" stroke-linecap="round"/>
                          <rect x="55" y="90" width="13" height="8" rx="3" fill="url(#shoe)"/>
                        </g>
                        <!-- Back body — wide lat muscles -->
                        <g class="body-core" style="transform-origin: 50px 58px;">
                          <path d="M 24 38 Q 50 24 76 38 L 66 72 L 34 72 Z" fill="url(#skinBody)"/>
                          <!-- spine line -->
                          <line x1="50" y1="40" x2="50" y2="68" stroke="#92400e" stroke-width="1.5" opacity="0.5"/>
                          <!-- back muscle lines -->
                          <path d="M 38 42 Q 44 55 44 68" fill="none" stroke="#92400e" stroke-width="1.2" opacity="0.4"/>
                          <path d="M 62 42 Q 56 55 56 68" fill="none" stroke="#92400e" stroke-width="1.2" opacity="0.4"/>
                          <!-- Belt + pants -->
                          <rect x="32" y="70" width="36" height="6" rx="2" fill="url(#belt)"/>
                          <path d="M 34 76 L 66 76 L 64 86 L 54 86 L 50 80 L 46 86 L 36 86 Z" fill="url(#pants)"/>
                        </g>
                        <!-- Head — back of head -->
                        <g class="head" style="transform-origin: 50px 24px;">
                          <circle cx="50" cy="24" r="15" fill="url(#skinHead)"/>
                          <!-- Full hair covering back of head -->
                          <path d="M 35 26 Q 32 4 50 2 Q 68 4 65 26 L 60 32 Q 50 36 40 32 Z" fill="url(#hair)"/>
                          <!-- Red headband -->
                          <path d="M 35 20 Q 50 14 65 20 L 65 23 Q 50 17 35 23 Z" fill="#dc2626"/>
                          <!-- Headband knot tails -->
                          <path d="M 35 20 L 28 16 M 35 23 L 30 22" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
                        </g>
                      </g>

                      <!-- ══════════ VIEW SIDE (right-facing; left is scaleX(-1)) ══════════ -->
                      <g class="view-side">
                        <!-- Back arm -->
                        <g class="arm-l" style="transform-origin: 42px 42px;">
                          <path d="M 42 42 L 42 72" fill="none" stroke="#92400e" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="42" cy="72" r="7" fill="#92400e"/>
                        </g>
                        <!-- Back leg -->
                        <g class="leg-l" style="transform-origin: 44px 78px;">
                          <path d="M 44 78 L 44 94" fill="none" stroke="#92400e" stroke-width="11" stroke-linecap="round"/>
                          <rect x="38" y="90" width="14" height="8" rx="3" fill="#1c1917"/>
                        </g>
                        <!-- Body -->
                        <g class="body-core" style="transform-origin: 50px 58px;">
                          <path d="M 34 38 Q 66 30 68 52 L 58 72 L 38 72 Z" fill="url(#skinBody)"/>
                          <!-- side pec -->
                          <path d="M 64 48 Q 58 52 54 46" fill="none" stroke="#92400e" stroke-width="1.5" opacity="0.6"/>
                          <!-- Belt + pants -->
                          <rect x="36" y="70" width="24" height="6" rx="2" fill="url(#belt)"/>
                          <rect x="54" y="68" width="8" height="10" rx="2" fill="url(#buckle)"/>
                          <path d="M 38 76 L 58 76 L 56 86 L 40 86 Z" fill="url(#pants)"/>
                        </g>
                        <!-- Front leg -->
                        <g class="leg-r" style="transform-origin: 54px 78px;">
                          <path d="M 54 78 L 54 94" fill="none" stroke="url(#skinArm)" stroke-width="11" stroke-linecap="round"/>
                          <rect x="47" y="90" width="14" height="8" rx="3" fill="url(#shoe)"/>
                        </g>
                        <!-- Head -->
                        <g class="head" style="transform-origin: 50px 24px;">
                          <circle cx="50" cy="24" r="15" fill="url(#skinHead)"/>
                          <!-- Nose -->
                          <path d="M 62 22 Q 70 24 64 28 Z" fill="url(#skinHead)"/>
                          <!-- Hair -->
                          <path d="M 36 26 Q 34 6 52 4 Q 66 6 64 18 Q 54 12 36 26 Z" fill="url(#hair)"/>
                          <!-- Sideburn -->
                          <path d="M 38 20 Q 42 20 42 30 L 38 28 Z" fill="url(#hair)"/>
                          <!-- Eye -->
                          <circle cx="58" cy="22" r="2.2" fill="#000"/>
                          <!-- Eyebrow -->
                          <line x1="54" y1="18" x2="62" y2="19" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round"/>
                          <!-- Goatee on side -->
                          <path d="M 62 32 Q 64 36 58 36 Q 58 34 60 32 Z" fill="url(#hair)"/>
                          <!-- Grin -->
                          <path d="M 58 28 Q 64 30 62 32" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
                        </g>
                        <!-- Front arm -->
                        <g class="arm-r" style="transform-origin: 50px 42px;">
                          <path d="M 50 42 L 50 72" fill="none" stroke="url(#skinArm)" stroke-width="13" stroke-linecap="round"/>
                          <circle cx="50" cy="72" r="7" fill="url(#skinFist)"/>
                        </g>
                      </g>
                    </svg>
                </div>
              }

            </div>
          }
        }

      </div>
    </div>
  `
})
export class SokobanBoardComponent {
  GameStatus = GameStatus;
  @Input() boardData: string[][] | undefined;
  @Input() readonly: boolean = false;

  activeBoard = computed(() => {
    if (this.boardData && this.boardData.length > 0) return this.boardData;
    return this.store.myBoard();
  });

  playerDir = signal<'up' | 'down' | 'left' | 'right'>('down');
  playerAction = signal<'idle' | 'walk' | 'push'>('idle');
  private actionTimeout: any;
  private pathfindingInterval: any;

  clearPathfinding() {
    if (this.pathfindingInterval) {
      clearInterval(this.pathfindingInterval);
      this.pathfindingInterval = null;
    }
  }

  triggerMove(dir: 'up' | 'down' | 'left' | 'right', isAuto = false) {
    if (this.readonly) return;
    if (!isAuto) this.clearPathfinding();
    
    // Always set direction for ALL four directions
    this.playerDir.set(dir);
    
    const board = this.activeBoard();
    let pr = -1, pc = -1;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === '@' || board[r][c] === '+') { pr = r; pc = c; break; }
      }
      if (pr !== -1) break;
    }
    
    let nextCell = '';
    if (pr !== -1) {
      if (dir === 'up' && pr > 0) nextCell = board[pr-1][pc];
      if (dir === 'down' && pr < board.length-1) nextCell = board[pr+1][pc];
      if (dir === 'left' && pc > 0) nextCell = board[pr][pc-1];
      if (dir === 'right' && pc < board[pr].length-1) nextCell = board[pr][pc+1];
    }

    const isBox = nextCell === '$' || nextCell === '*';
    const state = this.store.myPlayerState();
    const preMoves = state ? state.moves : 0;
    
    this.store.move(dir);
    
    const newState = this.store.myPlayerState();
    const postMoves = newState ? newState.moves : 0;
    
    if (postMoves > preMoves) {
      this.playerAction.set(isBox ? 'push' : 'walk');
      if (this.actionTimeout) clearTimeout(this.actionTimeout);
      this.actionTimeout = setTimeout(() => {
        this.playerAction.set('idle');
      }, 300);
    }
  }

  store = inject(SokobanStore);

  rows = computed(() => this.activeBoard().length || 1);
  cols = computed(() => {
    const b = this.activeBoard();
    return b.length > 0 ? b[0].length : 1;
  });

  boardRatio = computed(() => this.cols() / this.rows());

  boardWidth = computed(() => {
    if (this.boardRatio() > 1) return '100%';
    return `calc(100% * ${this.boardRatio()})`;
  });

  boardHeight = computed(() => {
    if (this.boardRatio() <= 1) return '100%';
    return `calc(100% / ${this.boardRatio()})`;
  });

  private touchStartX = 0;
  private touchStartY = 0;

  getFloorClass(r: number, c: number): string {
    return (r + c) % 2 === 0 ? 'bg-white/5' : 'bg-black/10';
  }

  getWallStyle(r: number, c: number) {
    const board = this.activeBoard();
    const rowStr = board[r] || '';
    const topStr = board[r - 1] || '';
    const bottomStr = board[r + 1] || '';

    const isTopOuter = r === 0 || topStr[c] !== '#';
    const isBottomOuter = r === board.length - 1 || bottomStr[c] !== '#';
    const isLeftOuter = c === 0 || rowStr[c - 1] !== '#';
    const isRightOuter = c === rowStr.length - 1 || rowStr[c + 1] !== '#';
    
    const shadows = [];
    
    if (isTopOuter) shadows.push('inset 0 4px 0px rgba(255,255,255,0.9)');
    if (isLeftOuter) shadows.push('inset 4px 0 0px rgba(255,255,255,0.9)');
    if (isBottomOuter) shadows.push('inset 0 -4px 0px rgba(71,85,105,0.9)');
    if (isRightOuter) shadows.push('inset -4px 0 0px rgba(71,85,105,0.9)');
    
    if (isBottomOuter || isRightOuter) {
      shadows.push('4px 4px 6px rgba(0,0,0,0.6)');
    }

    return {
      'box-shadow': shadows.join(', ')
    };
  }

  getBoxStyle(cell: string) {
    if (cell === '*') {
      // Box on target: Bright Green box, intense green glow
      return {
        'background-color': '#22c55e', // green-500
        'box-shadow': 'inset 3px 3px 0px rgba(255,255,255,0.8), inset -3px -3px 0px rgba(20,83,45,0.8), 0 0 20px 5px rgba(34,197,94,0.9)'
      };
    } else {
      // Normal box: Yellow box, normal drop shadow
      return {
        'background-color': '#fef08a', // yellow-200
        'box-shadow': 'inset 3px 3px 0px rgba(255,255,255,0.9), inset -3px -3px 0px rgba(202,138,4,0.9), 3px 3px 6px rgba(0,0,0,0.6)'
      };
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.readonly) return;
    if (this.store.status() !== GameStatus.Playing || this.store.isDead()) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.triggerMove('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.triggerMove('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.triggerMove('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.triggerMove('right');
        event.preventDefault();
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          this.store.undo();
          event.preventDefault();
        }
        break;
    }
  }

  onTouchStart(event: TouchEvent) {
    if (this.readonly) return;
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (this.readonly) return;
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
          this.triggerMove(dx > 0 ? 'right' : 'left');
          event.preventDefault();
        }
      } else {
        if (Math.abs(dy) > 30) {
          this.triggerMove(dy > 0 ? 'down' : 'up');
          event.preventDefault();
        }
      }
    }
  }

  onCellClick(targetR: number, targetC: number) {
    if (this.readonly) return;
    if (this.store.status() !== GameStatus.Playing || this.store.isDead()) return;

    this.clearPathfinding();

    const board = this.activeBoard();
    if (targetR < 0 || targetR >= board.length || targetC < 0 || targetC >= board[targetR].length) return;
    
    const targetCell = board[targetR][targetC];
    // Cannot move directly if target is wall or box
    if (targetCell === '#' || targetCell === '$' || targetCell === '*') return;

    let pr = -1, pc = -1;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === '@' || board[r][c] === '+') { pr = r; pc = c; break; }
      }
      if (pr !== -1) break;
    }
    if (pr === -1) return;
    if (pr === targetR && pc === targetC) return;

    // BFS
    const queue: {r: number, c: number, path: ('up'|'down'|'left'|'right')[]}[] = [];
    queue.push({ r: pr, c: pc, path: [] });
    
    const visited = new Set<string>();
    visited.add(`${pr},${pc}`);
    
    let finalPath: ('up'|'down'|'left'|'right')[] | null = null;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.r === targetR && curr.c === targetC) {
        finalPath = curr.path;
        break;
      }

      const dirs: {dr: number, dc: number, dir: 'up'|'down'|'left'|'right'}[] = [
        {dr: -1, dc: 0, dir: 'up'},
        {dr: 1, dc: 0, dir: 'down'},
        {dr: 0, dc: -1, dir: 'left'},
        {dr: 0, dc: 1, dir: 'right'},
      ];

      for (const d of dirs) {
        const nr = curr.r + d.dr;
        const nc = curr.c + d.dc;
        
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[nr].length) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            const cell = board[nr][nc];
            // Can only walk on empty floor, target orb, or starting positions. No boxes or walls.
            if (cell === ' ' || cell === '.' || cell === '@' || cell === '+') {
              visited.add(key);
              queue.push({ r: nr, c: nc, path: [...curr.path, d.dir] });
            }
          }
        }
      }
    }

    if (finalPath && finalPath.length > 0) {
      let step = 0;
      // Start auto walking
      this.pathfindingInterval = setInterval(() => {
        if (step >= finalPath!.length || this.store.status() !== GameStatus.Playing) {
          this.clearPathfinding();
          return;
        }
        this.triggerMove(finalPath![step], true);
        step++;
      }, 80); // Move every 80ms
    }
  }
}
