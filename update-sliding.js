const fs = require('fs');
const path = 'frontend/src/app/features/games/sliding/sliding.component.html';
let content = fs.readFileSync(path, 'utf8');

const regex = /        <!-- Header -->\n        <div class="flex flex-col mb-4 lg:mb-6 pb-4 border-b relative" style="border-color: var(--color-border-card)">\n          <div class="flex items-center justify-between w-full">\n            <div class="flex items-center space-x-2 lg:space-x-4 flex-1">\n([\s\S]*?)            <\/div>\n            \n            <!-- Mobile & Desktop Menu Toggle -->\n            <div class="flex items-center gap-2 z-10">\n([\s\S]*?)            <\/div>\n          <\/div>\n        <\/div>/;

const match = content.match(regex);

if (match) {
  let rightContent = match[2];
  let newHeader = `        <!-- Header -->
        <app-game-header
          [title]="t('sliding.title')() || 'Sliding Puzzle'"
          [subtitle]="currentRoomMode() === 'pk_speed' ? t('sliding.mode.pk_speed')() : t('sliding.mode.single')()"
          iconGradientClass="from-purple-500 to-pink-500"
          titleGradientClass="from-purple-400 to-pink-400"
          shadowClass="shadow-pink-500/20"
          headerBgClass="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-t-2xl lg:rounded-t-3xl -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 mb-4 lg:mb-6"
          (back)="goBack()"
          (rules)="showRules.set(true)">
          
          <span game-icon class="text-2xl sm:text-3xl">🧩</span>

          <ng-container header-right>
${rightContent}          </ng-container>
        </app-game-header>`;

  content = content.replace(regex, newHeader);
  fs.writeFileSync(path, content);
  console.log("Updated sliding");
} else {
  console.log("Could not find header");
}
