import { Injectable, inject } from '@angular/core';
import QRCode from 'qrcode';
import { I18nService } from '../i18n/i18n.service';
import { isBrowser } from '../utils/browser.util';

export interface PixelPosterStatItem {
  label: string;
  value: string | number;
  icon?: string;
}

export interface PixelPosterOptions {
  gameId: string;
  gameTitle: string;
  gameEmoji?: string;
  isWin: boolean;
  isNewRecord?: boolean;
  playerName?: string;
  stats: PixelPosterStatItem[];
  gameUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class PosterService {
  private i18n = inject(I18nService);

  /**
   * Generates a 720x1280 retro pixel-art achievement share poster entirely on client-side Canvas.
   * Zero server IO, pure browser memory execution.
   */
  async generatePixelPoster(options: PixelPosterOptions): Promise<string> {
    if (!isBrowser() || typeof document === 'undefined') {
      return '';
    }

    const canvas = document.createElement('canvas');
    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Arcade Starfield & Scanline Background
    this.drawArcadeBackground(ctx, width, height);

    // 2. Draw Golden Double Pixel Borders & Corner Accents
    this.drawPixelBorders(ctx, width, height);

    // 3. Draw Header Title and Game Info
    this.drawHeader(ctx, width, options);

    // 4. Draw Victory/Record Banner Badge
    this.drawVictoryBadge(ctx, width, options);

    // 5. Draw Game Stats Grid Box
    this.drawStatsGrid(ctx, width, options.stats);

    // 6. Draw Bottom QR Code and Player Verification
    await this.drawFooterWithQRCode(ctx, width, height, options);

    return canvas.toDataURL('image/png');
  }

  /**
   * Save poster dataUrl as PNG download file.
   */
  downloadPoster(dataUrl: string, filename: string = 'xgame-battle-record.png'): void {
    if (!isBrowser()) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Copy poster image directly to system clipboard as image/png.
   */
  async copyImageToClipboard(dataUrl: string): Promise<boolean> {
    if (!isBrowser() || !navigator?.clipboard?.write) {
      return false;
    }

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch {
      return false;
    }
  }

  private drawArcadeBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Gradient dark cosmic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d1a');
    bgGrad.addColorStop(0.35, '#12162e');
    bgGrad.addColorStop(0.75, '#181233');
    bgGrad.addColorStop(1, '#080a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle pixel grid dot matrix
    ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    const dotSpacing = 24;
    for (let x = 16; x < width; x += dotSpacing) {
      for (let y = 16; y < height; y += dotSpacing) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Retro 8-bit Cross Stars (fixed coordinates for consistent deterministic beauty)
    const stars = [
      { x: 90, y: 110, size: 8, color: '#fbbf24' },
      { x: 630, y: 150, size: 10, color: '#38bdf8' },
      { x: 140, y: 440, size: 6, color: '#a78bfa' },
      { x: 590, y: 520, size: 8, color: '#34d399' },
      { x: 80, y: 780, size: 8, color: '#fbbf24' },
      { x: 640, y: 860, size: 6, color: '#f472b6' },
      { x: 120, y: 1080, size: 8, color: '#60a5fa' },
      { x: 580, y: 1190, size: 6, color: '#fcd34d' }
    ];

    for (const star of stars) {
      ctx.fillStyle = star.color;
      const hs = Math.floor(star.size / 2);
      // Pixel cross
      ctx.fillRect(star.x - hs, star.y - 1, star.size, 3);
      ctx.fillRect(star.x - 1, star.y - hs, 3, star.size);
      ctx.fillRect(star.x - 1, star.y - 1, 3, 3);
    }
  }

  private drawPixelBorders(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pad = 28;
    const w = width - pad * 2;
    const h = height - pad * 2;

    // Outer pixel frame (Gold-Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(pad, pad, w, h);

    // Inner thin accent frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + 10, pad + 10, w - 20, h - 20);

    // 4 Corner 8-bit decorative blocks
    const corners = [
      { x: pad - 6, y: pad - 6 },
      { x: width - pad - 6, y: pad - 6 },
      { x: pad - 6, y: height - pad - 6 },
      { x: width - pad - 6, y: height - pad - 6 }
    ];

    ctx.fillStyle = '#fbbf24';
    for (const c of corners) {
      ctx.fillRect(c.x, c.y, 12, 12);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(c.x + 3, c.y + 3, 6, 6);
      ctx.fillStyle = '#fbbf24';
    }
  }

  private drawHeader(ctx: CanvasRenderingContext2D, width: number, options: PixelPosterOptions): void {
    const cx = width / 2;

    // Mini Arcade Pill Badge
    const badgeText = '★ RETRO ARCADE BATTLE RECORD ★';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(badgeText);
    const pillW = textMetrics.width + 36;
    const pillH = 30;
    const pillY = 72;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    this.drawRoundedRect(ctx, cx - pillW / 2, pillY - pillH / 2, pillW, pillH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.fillText(badgeText, cx, pillY);

    // Game Emoji
    const emoji = options.gameEmoji || '🎮';
    ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(emoji, cx, 155);

    // Game Title with 3D Pixel Drop Shadow
    const title = options.gameTitle;
    ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    // Shadow
    ctx.fillStyle = '#0f172a';
    ctx.fillText(title, cx + 3, 227);
    ctx.fillStyle = '#b45309';
    ctx.fillText(title, cx + 1, 225);
    // Main text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, 224);

    // App Subtitle Tagline
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    const tagline = this.i18n.t('poster.tagline')() || 'puzzlepk.com · 全网专业在线逻辑益智平台';
    ctx.fillText(tagline, cx, 260);
  }

  private drawVictoryBadge(ctx: CanvasRenderingContext2D, width: number, options: PixelPosterOptions): void {
    const cx = width / 2;
    const centerY = 365;

    // Glow circle background
    const radialGrad = ctx.createRadialGradient(cx, centerY, 10, cx, centerY, 140);
    if (options.isWin) {
      radialGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      radialGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      radialGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = radialGrad;
    ctx.fillRect(cx - 150, centerY - 80, 300, 160);

    // Big Status Badge Ribbon
    const statusText = options.isWin
      ? (this.i18n.t('poster.victory')() || 'VICTORY!')
      : (this.i18n.t('poster.game_over')() || 'GAME OVER');

    const bannerW = 440;
    const bannerH = 74;
    const bannerX = cx - bannerW / 2;
    const bannerY = centerY - bannerH / 2;

    // Retro Pixelated Ribbon / Banner
    ctx.fillStyle = options.isWin ? '#065f46' : '#1e1b4b';
    ctx.strokeStyle = options.isWin ? '#34d399' : '#818cf8';
    ctx.lineWidth = 3;
    this.drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 12);
    ctx.fill();
    ctx.stroke();

    // Banner Text
    ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.isWin ? '#6ee7b7' : '#c7d2fe';
    ctx.fillText(statusText, cx, centerY);

    // New Record Stamp Badge (if applicable)
    if (options.isNewRecord) {
      const stampText = `🏆 ${this.i18n.t('poster.new_record')() || 'NEW RECORD'}`;
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, monospace';
      const stampW = ctx.measureText(stampText).width + 28;
      const stampH = 30;
      const stampX = cx - stampW / 2;
      const stampY = bannerY + bannerH + 16;

      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, stampX, stampY, stampW, stampH, 15);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.fillText(stampText, cx, stampY + stampH / 2);
    }
  }

  private drawStatsGrid(ctx: CanvasRenderingContext2D, width: number, stats: PixelPosterStatItem[]): void {
    const cardX = 60;
    const cardY = 485;
    const cardW = width - 120;
    const cardH = 390;

    // Dark Frosted Glass Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Stats Grid Layout (Up to 4 main stats in a 2x2 grid)
    const displayStats = stats.slice(0, 4);
    const cols = displayStats.length > 2 ? 2 : 1;
    const rows = Math.ceil(displayStats.length / cols);
    const cellW = (cardW - 32) / cols;
    const cellH = (cardH - 32) / (rows || 1);

    displayStats.forEach((stat, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cellX = cardX + 16 + c * cellW;
      const cellY = cardY + 16 + r * cellH;

      // Inner cell border
      ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, cellX + 6, cellY + 6, cellW - 12, cellH - 12, 10);
      ctx.fill();
      ctx.stroke();

      const itemCx = cellX + cellW / 2;
      const itemCy = cellY + cellH / 2;

      // Label with Icon
      const labelText = `${stat.icon || ''} ${stat.label}`.trim();
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, itemCx, itemCy - 20);

      // Value (Big Arcade Font)
      ctx.font = '900 36px "SF Pro Display", -apple-system, BlinkMacSystemFont, monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(String(stat.value), itemCx, itemCy + 22);
    });
  }

  private async drawFooterWithQRCode(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: PixelPosterOptions
  ): Promise<void> {
    const footerY = 925;
    const footerH = 265;
    const cardX = 60;
    const cardW = width - 120;

    // Container box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.lineWidth = 1.5;
    this.drawRoundedRect(ctx, cardX, footerY, cardW, footerH, 16);
    ctx.fill();
    ctx.stroke();

    // Generate QR Code via qrcode library
    const qrSize = 170;
    const qrX = cardX + cardW - qrSize - 22;
    const qrY = footerY + (footerH - qrSize) / 2;

    try {
      const qrDataUrl = await QRCode.toDataURL(options.gameUrl, {
        width: qrSize,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      const qrImg = await this.loadImage(qrDataUrl);

      // Draw white card background for QR
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      // Fallback placeholder if QR fails
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX, qrY, qrSize, qrSize);
    }

    // Left info details
    const infoX = cardX + 24;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Player name
    const playerLabel = this.i18n.t('poster.player')() || '挑战者';
    const playerName = options.playerName || 'PixelGamer';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`👤 ${playerLabel}: ${playerName}`, infoX, footerY + 28);

    // Date
    const today = new Date().toISOString().split('T')[0];
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.fillText(`📅 ${today} · #XG-${hash}`, infoX, footerY + 68);

    // Call to action
    const scanTip = this.i18n.t('poster.scan_to_play')() || '扫码即玩 · 挑战同局纪录';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`👉 ${scanTip}`, infoX, footerY + 118);

    // Verification Footer note
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText('⚡ 纯前端极速对战 · 零服务器延迟', infoX, footerY + 158);
    ctx.fillText('🎮 puzzlepk.com · 益智游戏PK网', infoX, footerY + 182);
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}
