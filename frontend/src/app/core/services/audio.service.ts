import { Injectable, signal } from '@angular/core';
import { playUISound } from './audio/ui.sound';
import { playMinesweeperSound } from './audio/minesweeper.sound';
import { playSokobanSound } from './audio/sokoban.sound';
import { playWaterSortSound } from './audio/watersort.sound';
import { playGomokuSound } from './audio/gomoku.sound';
import { playDrop2048Sound } from './audio/drop2048.sound';
import { playTetrisSound } from './audio/tetris.sound';
import { playMath24Sound } from './audio/math24.sound';
import { playBlockSound } from './audio/block.sound';
import { playSudokuSound } from './audio/sudoku.sound';
import { playPuzzleSound } from './audio/puzzle.sound';
import { playIdiomSound } from './audio/idiom.sound';
import { storageGet, storageSet, createAudioContext } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  isMuted = signal<boolean>(false);
  volume = 0.6;
  
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    const saved = storageGet('xgame_muted');
    if (saved === 'true') {
      this.isMuted.set(true);
      this.volume = 0;
    }
  }

  toggleMute() {
    const newMuted = !this.isMuted();
    this.isMuted.set(newMuted);
    storageSet('xgame_muted', String(newMuted));
    
    this.volume = newMuted ? 0 : 0.6;
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  async initAudio(): Promise<void> {
    await this.initWebAudio();
  }
  
  private async initWebAudio(): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = createAudioContext();
      if (!this.audioCtx) return;
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  // --- UI Sounds ---
  async playUI(name: 'click' | 'victory' | 'gameover' | 'error' | 'countdown') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playUISound(this.audioCtx, this.masterGain, name);
    }
  }

  playClick() { this.playUI('click'); }
  playWin() { this.playUI('victory'); }
  playLose() { this.playUI('gameover'); }
  playDrop() { this.playUI('click'); }
  playClear() { this.playUI('click'); }
  playCountdown() { this.playUI('countdown'); }

  // --- Minesweeper Sounds ---
  async playMinesweeper(name: 'dig' | 'flag' | 'explosion' | 'win') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playMinesweeperSound(this.audioCtx, this.masterGain, name);
    }
  }

  playExplosion() { this.playMinesweeper('explosion'); }
  playFlag() { this.playMinesweeper('flag'); }

  // --- Sokoban Sounds ---
  async playSokoban(name: 'move' | 'push' | 'bump' | 'target') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playSokobanSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- WaterSort Sounds ---
  async playWaterSort(name: 'clink' | 'pour' | 'bottle_full') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playWaterSortSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Gomoku Sounds ---
  async playGomoku(name: 'stoneDrop' | 'stoneWin') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playGomokuSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Drop2048 Sounds ---
  async playDrop2048(name: 'move' | 'drop' | 'merge', combo: number = 0) {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playDrop2048Sound(this.audioCtx, this.masterGain, name, combo);
    }
  }

  // --- Tetris Sounds ---
  async playTetris(name: 'move' | 'rotate' | 'land' | 'clear') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playTetrisSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Math24 Sounds ---
  async playMath24(name: 'flip' | 'correct' | 'error') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playMath24Sound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Block/Hexa Sounds ---
  async playBlock(name: 'place' | 'clear' | 'error') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playBlockSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Sudoku Sounds ---
  async playSudoku(name: 'input' | 'clear' | 'success' | 'error') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playSudokuSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Puzzle Sounds (Sliding, Codebreaker, LightsOut) ---
  async playPuzzle(name: 'move' | 'toggle' | 'guess' | 'success' | 'error') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playPuzzleSound(this.audioCtx, this.masterGain, name);
    }
  }

  // --- Idiom Sounds ---
  async playIdiom(name: 'fill' | 'erase' | 'correct' | 'wrong' | 'mastered' | 'correcting_done' | 'next') {
    if (this.isMuted()) return;
    await this.initWebAudio();
    if (this.audioCtx && this.masterGain) {
      playIdiomSound(this.audioCtx, this.masterGain, name);
    }
  }
}
