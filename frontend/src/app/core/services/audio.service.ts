import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioCtx: AudioContext | null = null;
  
  // 全局静音状态，使用 Signal 方便与 UI 绑定
  readonly isMuted = signal(false);

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // 恢复被浏览器自动挂起的音频上下文
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted.update(v => !v);
  }

  // 播放简单的“滴”声 (例如点击方块)
  playClick() {
    this.synthesizeBeep(400, 'sine', 0.05);
  }

  // 播放“插旗”音效 (升调短音)
  playFlag() {
    this.synthesizeBeep(800, 'triangle', 0.1);
  }

  // 播放“爆炸”音效 (低沉长音噪音，这里用低频锯齿波模拟)
  playExplosion() {
    this.synthesizeBeep(100, 'sawtooth', 0.5, 0.3);
  }

  // 播放“放置”音效
  playDrop() {
    this.synthesizeBeep(150, 'square', 0.08, 0.05);
  }

  // 播放“消除”音效
  playClear() {
    this.initAudio();
    if (this.isMuted() || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.2);
  }

  // 播放“胜利”音效 (连续升调)
  playWin() {
    this.initAudio();
    if (this.isMuted() || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'sine';
    // 频率随时间升高
    osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }

  // 播放“失败”音效 (连续降调)
  playLose() {
    this.initAudio();
    if (this.isMuted() || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    // 频率随时间降低
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.6);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.6);
  }

  // 核心的合成器方法（无需外部声音文件）
  private synthesizeBeep(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.initAudio();
    if (this.isMuted() || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    // 设置淡出效果避免爆音
    gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }
}
