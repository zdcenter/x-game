import { Injectable } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

export interface ProfileCardData {
  username: string;
  level: number;
  totalGames: number;
  topStats: { gameEmoji: string; gameName: string; value: string }[];
  siteDomain: string;
}

export interface ShareCardData {
  gameName: string;
  gameEmoji?: string;
  isWin: boolean;
  winText: string;
  loseText: string;
  stats?: { icon?: string; label?: string; value: string | number }[];
  siteDomain: string;
}

@Injectable({ providedIn: 'root' })
export class ShareImageService {

  async generateCard(data: ShareCardData): Promise<Blob | null> {
    if (!isBrowser()) return null;
    try {
      const W = 800, H = 420;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      this.drawBackground(ctx, W, H, data.isWin);
      this.drawContent(ctx, W, H, data);

      return new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
    } catch (e) {
      console.error('Share image generation failed', e);
      return null;
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, isWin: boolean) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0c1524');
    bg.addColorStop(1, '#162032');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
    glow.addColorStop(0, isWin ? 'rgba(245,158,11,0.20)' : 'rgba(239,68,68,0.14)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = isWin ? 'rgba(245,158,11,0.45)' : 'rgba(239,68,68,0.30)';
    ctx.lineWidth = 2;
    this.rrect(ctx, 10, 10, W - 20, H - 20, 22);
    ctx.stroke();
  }

  private drawContent(ctx: CanvasRenderingContext2D, W: number, H: number, data: ShareCardData) {
    ctx.textAlign = 'center';

    // Emoji
    if (data.gameEmoji) {
      ctx.font = '72px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
      ctx.fillText(data.gameEmoji, W / 2, 72);
    }

    // Game name
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fillText(data.gameName.toUpperCase(), W / 2, 148);

    // Result line
    const resultLabel = data.isWin
      ? `🏆  ${data.winText}  🏆`
      : `😅  ${data.loseText}`;
    ctx.font = 'bold 46px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
    ctx.fillStyle = data.isWin ? '#f59e0b' : '#ef4444';
    ctx.fillText(resultLabel, W / 2, 200);

    // Stats
    const stats = (data.stats || []).slice(0, 4);
    if (stats.length > 0) {
      this.drawStats(ctx, stats, W, 268);
    }

    // Branding
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillText(data.siteDomain, W / 2, H - 28);
  }

  private drawStats(
    ctx: CanvasRenderingContext2D,
    stats: { icon?: string; label?: string; value: string | number }[],
    W: number,
    y: number,
  ) {
    const gap = 14;
    const boxH = 72;
    const boxW = Math.min(175, Math.floor((W - 80 - (stats.length - 1) * gap) / stats.length));
    const totalW = stats.length * boxW + (stats.length - 1) * gap;
    let x = Math.round((W - totalW) / 2);

    for (const stat of stats) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      this.rrect(ctx, x, y, boxW, boxH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const mid = y + boxH / 2;
      const valueLabel = `${stat.icon ?? ''}${stat.icon ? ' ' : ''}${stat.value}`;

      if (stat.label) {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'center';
        ctx.fillText(stat.label.toUpperCase(), x + boxW / 2, mid - 14);

        ctx.font = 'bold 22px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        ctx.fillText(String(stat.value), x + boxW / 2, mid + 14);
      } else {
        ctx.font = 'bold 24px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        ctx.fillText(valueLabel, x + boxW / 2, mid + 8);
      }

      x += boxW + gap;
    }
  }

  async generateProfileCard(data: ProfileCardData): Promise<Blob | null> {
    if (!isBrowser()) return null;
    try {
      const W = 800, H = 420;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0c1524');
      bg.addColorStop(1, '#1a1040');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 300);
      glow.addColorStop(0, 'rgba(99,102,241,0.18)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(99,102,241,0.40)'; ctx.lineWidth = 2;
      this.rrect(ctx, 10, 10, W-20, H-20, 22); ctx.stroke();

      ctx.fillStyle = 'rgba(99,102,241,0.3)';
      ctx.beginPath(); ctx.arc(W/2, 80, 40, 0, Math.PI*2); ctx.fill();
      ctx.font = '36px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText('👤', W/2, 94);

      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(data.username, W/2, 148);
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(167,139,250,0.9)';
      ctx.fillText(`Lv.${data.level}  ·  ${data.totalGames} games played`, W/2, 176);

      const stats = data.topStats.slice(0, 3);
      if (stats.length > 0) {
        const gap = 16, boxH = 80, boxW = 200;
        const totalW = stats.length * boxW + (stats.length-1) * gap;
        let x = Math.round((W - totalW) / 2);
        for (const s of stats) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          this.rrect(ctx, x, 205, boxW, boxH, 12); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.font = '22px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText(s.gameEmoji, x+boxW/2, 230);
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.40)';
          ctx.fillText(s.gameName.toUpperCase(), x+boxW/2, 252);
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(167,139,250,0.95)';
          ctx.fillText(s.value, x+boxW/2, 274);
          x += boxW + gap;
        }
      }

      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillText(data.siteDomain, W/2, H-28);

      return new Promise<Blob|null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
    } catch(e) { console.error('Profile card generation failed', e); return null; }
  }

  private rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
