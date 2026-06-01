const fs = require('fs');
const path = 'frontend/src/app/features/games/gomoku/gomoku.component.html';
let content = fs.readFileSync(path, 'utf8');

const regex = /  <!-- Header -->\n  <header class="w-full max-w-4xl px-4 py-4 md:py-6 flex justify-between items-center z-10 shrink-0">([\s\S]*?)  <\/header>/;
const match = content.match(regex);

if (match) {
  const rightContentMatch = match[1].match(/    <div class="flex items-center gap-2">\n([\s\S]*?)    <\/div>/);
  const rightContent = rightContentMatch ? rightContentMatch[1] : '';

  let newRightContent = rightContent.replace(/      <button \(click\)="showRules\.set\(true\)"[\s\S]*?<\/button>\n/, '');

  let newHeader = `  <!-- Header -->
  <div class="w-full max-w-4xl">
    <app-game-header
      [title]="i18n.t('game.gomoku')() || 'Gomoku'"
      [subtitle]="currentRoomMode() === 'single' ? i18n.t('gomoku.mode.single')() + (currentDifficulty() ? ' - ' + (currentDifficulty() === 'easy' ? i18n.t('gomoku.diff.easy')() : (currentDifficulty() === 'hard' ? i18n.t('gomoku.diff.hard')() : i18n.t('gomoku.diff.medium')())) : '') : i18n.t('gomoku.mode.pk_classic')()"
      iconGradientClass="from-slate-700 to-slate-900"
      titleGradientClass="from-slate-600 to-slate-900 dark:from-slate-300 dark:to-white"
      shadowClass="shadow-slate-500/20"
      headerBgClass="bg-transparent"
      (back)="returnToLobby()"
      (rules)="showRules.set(true)">
      
      <span game-icon class="text-2xl sm:text-3xl">⚫⚪</span>

      <ng-container header-right>
${newRightContent}      </ng-container>
    </app-game-header>
  </div>`;

  content = content.replace(regex, newHeader);
  fs.writeFileSync(path, content);
  console.log("Updated gomoku");
} else {
  console.log("Could not find header");
}
