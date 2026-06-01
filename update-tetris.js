const fs = require('fs');
const path = 'frontend/src/app/features/games/tetris/tetris.component.html';
let content = fs.readFileSync(path, 'utf8');

const regex = /        <!-- Header -->\n        <div class="flex flex-col pb-2 lg:pb-3 border-b relative shrink-0" style="border-color: var(--color-border-card)">\n          <div class="flex items-center justify-between w-full">\n            <div class="flex items-center space-x-2 lg:space-x-4 flex-1">\n([\s\S]*?)            <\/div>\n            \n            <div class="flex items-center gap-2">\n([\s\S]*?)            <\/div>\n          <\/div>\n        <\/div>/;

const match = content.match(regex);

if (match) {
  let rightContent = match[2];
  let newHeader = `        <!-- Header -->
        <app-game-header
          [title]="i18n.t('tetris.title')() || 'Tetris'"
          [subtitle]="currentRoomMode() === 'pk_attack' ? i18n.t('tetris.mode.pk_attack')() : i18n.t('tetris.mode.single')()"
          iconGradientClass="from-indigo-500 to-cyan-500"
          titleGradientClass="from-indigo-400 to-cyan-400"
          shadowClass="shadow-cyan-500/20"
          headerBgClass="bg-gradient-to-r from-indigo-900/20 to-cyan-900/20 rounded-t-2xl lg:rounded-t-3xl -mx-3 lg:-mx-5 -mt-3 lg:-mt-5 px-3 lg:px-5 mb-2 lg:mb-3"
          (back)="goBack()"
          (rules)="showRules.set(true)">
          
          <span game-icon class="text-2xl sm:text-3xl">🧱</span>

          <ng-container header-right>
${rightContent}          </ng-container>
        </app-game-header>`;

  content = content.replace(regex, newHeader);
  fs.writeFileSync(path, content);
  console.log("Updated tetris");
} else {
  console.log("Could not find header");
}
