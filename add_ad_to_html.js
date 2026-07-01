const fs = require('fs');

const adHtml = `
            <div class="mt-8 w-11/12 max-w-md bg-black/20 rounded-xl overflow-hidden min-h-[50px] flex flex-col items-center justify-center p-2 backdrop-blur-md border border-white/10">
              <span class="text-[10px] text-white/50 mb-1">Sponsored</span>
              <app-adsense [adFormat]="'auto'" [fullWidthResponsive]="true" class="w-full"></app-adsense>
            </div>
`;

function addAdAfterSpectating(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Match the inner div containing the spectating text, and insert the ad right after it, before the closing </div> of the overlay.
  // E.g. </div> \n </div> -> insert before the last </div>
  if (content.includes("i18n.t('game.spectating')()")) {
    content = content.replace(/(i18n\.t\('game\.spectating'\)\(\)\s*(?:\|\|[^<]+)?(?:<\/[a-z]+>)?\s*)(<\/div>)/i, (match, p1, p2) => {
      return p1 + p2 + adHtml;
    });
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added ad banner to', file);
  }
}

addAdAfterSpectating('frontend/src/app/features/games/tetris/tetris.component.html');
addAdAfterSpectating('frontend/src/app/features/games/block/block.component.html');
addAdAfterSpectating('frontend/src/app/features/games/drop2048/drop2048.component.html');
addAdAfterSpectating('frontend/src/app/features/games/sokoban/sokoban.component.ts');
