const fs = require('fs');

const htmlFiles = [
  'frontend/src/app/features/games/classic2048/classic2048.component.html',
  'frontend/src/app/features/games/tetris/tetris.component.html',
  'frontend/src/app/features/games/block/block.component.html',
  'frontend/src/app/features/games/drop2048/drop2048.component.html'
];

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Look for <app-adsense [adFormat]="'auto'" [fullWidthResponsive]="true"></app-adsense> or similar
  content = content.replace(/<div[^>]*>\s*<span[^>]*>Sponsored<\/span>\s*<app-adsense[^>]*><\/app-adsense>\s*<\/div>/g, match => {
    return `
    @if (adService.getBannerSlotId('result_bottom')) {
      ${match.replace('<app-adsense', '<app-adsense [adSlot]="adService.getBannerSlotId(\'result_bottom\')!"')}
    }`;
  });
  
  // For classic2048 which has a different format
  content = content.replace(/<!-- AD BANNER -->\s*<div[^>]*>\s*<app-adsense[^>]*><\/app-adsense>\s*<\/div>/g, match => {
    return `
    <!-- AD BANNER -->
    @if (adService.getBannerSlotId('result_bottom')) {
      <div class="w-full mt-2 bg-black/5 rounded-xl overflow-hidden flex items-center justify-center min-h-[50px]">
        <app-adsense [adSlot]="adService.getBannerSlotId('result_bottom')!" [adFormat]="'auto'" [fullWidthResponsive]="true"></app-adsense>
      </div>
    }`;
  });
  
  fs.writeFileSync(file, content, 'utf8');
});

const tsFiles = [
  'frontend/src/app/features/games/classic2048/classic2048.component.ts',
  'frontend/src/app/features/games/tetris/tetris.component.ts',
  'frontend/src/app/features/games/block/block.component.ts',
  'frontend/src/app/features/games/drop2048/drop2048.component.ts',
  'frontend/src/app/features/games/sokoban/sokoban.component.ts'
];

tsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // For sokoban inline template
  if (file.includes('sokoban')) {
    content = content.replace(/<div[^>]*>\s*<span[^>]*>Sponsored<\/span>\s*<app-adsense[^>]*><\/app-adsense>\s*<\/div>/g, match => {
      return `
      @if (adService.getBannerSlotId('result_bottom')) {
        ${match.replace('<app-adsense', '<app-adsense [adSlot]="adService.getBannerSlotId(\'result_bottom\')!"')}
      }`;
    });
  }
  
  // Add import
  if (!content.includes('import { AdService }')) {
    content = "import { AdService } from '../../../core/services/ad.service';\n" + content;
  }
  
  // Add injection
  if (!content.includes('adService = inject(AdService)')) {
    content = content.replace(/(export class \w+.*?\{)/, "$1\n  adService = inject(AdService);");
  }
  
  fs.writeFileSync(file, content, 'utf8');
});

