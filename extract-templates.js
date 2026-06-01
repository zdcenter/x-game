const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/app/features/games/hexa/components/hexa-board/hexa-board.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-pk-steal/sudoku-pk-steal.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-room/sudoku-room.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-pk-speed/sudoku-pk-speed.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-numpad/sudoku-numpad.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-tools/sudoku-tools.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-board/sudoku-board.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-lobby/sudoku-lobby.component.ts',
  'frontend/src/app/features/games/sudoku/sudoku.component.ts',
  'frontend/src/app/features/games/minesweeper/components/cell/cell.component.ts'
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract template
  const templateMatch = content.match(/template:\s*`([\s\S]*?)`\s*(,?)/);
  if (templateMatch) {
    const templateContent = templateMatch[1];
    const htmlPath = filePath.replace('.ts', '.html');
    const cssPath = filePath.replace('.ts', '.css');
    const baseName = path.basename(filePath, '.ts');
    
    fs.writeFileSync(htmlPath, templateContent);
    if (!fs.existsSync(cssPath)) {
      fs.writeFileSync(cssPath, ''); // Create empty css file
    }
    
    // Replace template with templateUrl
    let replacement = `templateUrl: './${baseName}.html'`;
    
    // Check if there's an existing styles or styleUrl
    const hasStyleUrl = content.includes('styleUrl:');
    const hasStyleUrls = content.includes('styleUrls:');
    const stylesMatch = content.match(/styles:\s*\[([\s\S]*?)\]\s*(,?)/);
    
    if (stylesMatch) {
      // Remove styles array and add styleUrl
      content = content.replace(stylesMatch[0], '');
      replacement += `,\n  styleUrl: './${baseName}.css'${templateMatch[2] ? ',' : ''}`;
    } else if (!hasStyleUrl && !hasStyleUrls) {
      replacement += `,\n  styleUrl: './${baseName}.css'${templateMatch[2] ? ',' : ''}`;
    } else {
      replacement += `${templateMatch[2] ? ',' : ''}`;
    }
    
    content = content.replace(templateMatch[0], replacement);
    fs.writeFileSync(filePath, content);
    console.log(`Extracted template for ${filePath}`);
  }
}
