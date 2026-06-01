const fs = require('fs');
const path = 'frontend/src/app/features/games/minesweeper/minesweeper.component.html';
let content = fs.readFileSync(path, 'utf8');

const targetHeaderStart = `          <!-- Header -->
          <div class="flex flex-col mb-4 lg:mb-6 pb-4 border-b relative" style="border-color: var(--color-border-card)">
            <div class="flex items-center justify-between w-full">
              <!-- Left: Title & Mode -->
              <div class="flex items-center space-x-2 lg:space-x-4 flex-1">`;
              
const targetHeaderEndRegex = /              <\/div>\n            <\/div>\n\n            <!-- Global Progress Bar -->/;

let newHeader = `          <!-- Header -->
          <app-game-header
            [title]="i18n.t('app.title')() || 'Minesweeper'"
            [subtitle]="currentRoomMode() === 'pk_steal' ? i18n.t('game.pk_steal_label')() : (currentRoomMode() === 'pk_speed' ? i18n.t('game.pk_speed_label')() : i18n.t('game.single_label')())"
            iconGradientClass="from-rose-500 to-orange-500"
            titleGradientClass="from-rose-400 to-orange-400"
            shadowClass="shadow-orange-500/20"
            headerBgClass="bg-gradient-to-r from-rose-900/20 to-orange-900/20 rounded-t-2xl lg:rounded-t-3xl -mt-4 lg:-mt-6 -mx-4 lg:-mx-6 px-4 lg:px-6 mb-4 lg:mb-6"
            (back)="goBack()"
            (rules)="showRules.set(true)">
            
            <span game-icon class="text-2xl sm:text-3xl">💣</span>

            <ng-container header-center>
              <!-- Center: PK Scoreboard OR Single Player Difficulty -->
`;

// Extract center and right
const centerMatch = content.match(/              <!-- Center: PK Scoreboard OR Single Player Difficulty -->\n([\s\S]*?)              <!-- Right: Timer & Mines -->/);
const rightMatch = content.match(/              <!-- Right: Timer & Mines -->\n([\s\S]*?)            <\/div>\n\n            <!-- Global Progress Bar -->/);

if (centerMatch && rightMatch) {
  let centerContent = centerMatch[1].replace(/<div class="flex justify-center gap-2 lg:gap-4 flex-1 items-center z-10">\n/, '').replace(/              <\/div>\n\n$/, '');
  let rightContent = rightMatch[1].replace(/<div class="flex space-x-2 lg:space-x-6 flex-1 justify-end items-center z-10">\n/, '').replace(/              <\/div>\n$/, '');

  newHeader += `              <div class="flex justify-center gap-2 lg:gap-4 flex-1 items-center z-10">\n` + centerContent + `              </div>\n            </ng-container>\n\n            <ng-container header-right>\n              <div class="flex space-x-2 lg:space-x-6 flex-1 justify-end items-center z-10">\n` + rightContent + `              </div>\n            </ng-container>\n          </app-game-header>\n\n          <!-- Global Progress Bar -->`;

  const regex = new RegExp(`          <!-- Header -->\\n          <div class="flex flex-col mb-4 lg:mb-6 pb-4 border-b relative" style="border-color: var(--color-border-card)">\\n            <div class="flex items-center justify-between w-full">\\n              <!-- Left: Title & Mode -->[\\s\\S]*?<!-- Global Progress Bar -->`);
  content = content.replace(regex, newHeader);
  fs.writeFileSync(path, content);
  console.log("Updated minesweeper");
} else {
  console.log("Could not find center or right sections");
}
