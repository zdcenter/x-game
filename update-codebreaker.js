const fs = require('fs');
const path = 'frontend/src/app/features/games/codebreaker/codebreaker.component.html';
let content = fs.readFileSync(path, 'utf8');

const regex = /    <!-- Header -->\n    <header class="w-full max-w-5xl px-4 py-4 md:py-6 flex justify-between items-center z-10 shrink-0">([\s\S]*?)    <\/header>/;
const match = content.match(regex);

if (match) {
  const rightContentMatch = match[1].match(/      <div class="flex items-center gap-2">\n([\s\S]*?)      <\/div>/);
  const rightContent = rightContentMatch ? rightContentMatch[1] : '';

  // The rules button in the original had a custom rules modal, wait, let's look at it.
  // Actually, I can just use app-game-header and put the remaining right buttons in header-right!
  // Wait, there is already a rules button in app-game-header!
  // Let's filter out the rules button from rightContent.
  
  let newRightContent = rightContent.replace(/        <button \(click\)="showRules\.set\(true\)"[\s\S]*?<\/button>\n/, '');

  let newHeader = `    <!-- Header -->
    <div class="w-full max-w-5xl">
      <app-game-header
        [title]="i18n.t('lobby.codebreaker')() || 'Codebreaker'"
        [subtitle]="currentRoomMode() === 'single' ? i18n.t('gomoku.mode.single')() + (currentDifficulty() ? ' - ' + (currentDifficulty() === 'easy' ? i18n.t('game.diff_easy')() : (currentDifficulty() === 'hard' ? i18n.t('game.diff_hard')() : i18n.t('game.diff_medium')())) : '') : i18n.t('codebreaker.game_mode_pk')()"
        iconGradientClass="from-teal-500 to-emerald-500"
        titleGradientClass="from-teal-400 to-emerald-400"
        shadowClass="shadow-emerald-500/20"
        headerBgClass="bg-transparent"
        (back)="returnToLobby()"
        (rules)="showRules.set(true)">
        
        <span game-icon class="text-2xl sm:text-3xl">🕵️</span>

        <ng-container header-right>
${newRightContent}        </ng-container>
      </app-game-header>
    </div>`;

  content = content.replace(regex, newHeader);
  fs.writeFileSync(path, content);
  console.log("Updated codebreaker");
} else {
  console.log("Could not find header");
}
