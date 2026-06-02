const fs = require('fs');
const file = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("      });\n      super();\n      effect(() => {", "      });\n      effect(() => {");
content = content.replace("      });\n    super();\n    effect(() => {", "      });\n    effect(() => {");
fs.writeFileSync(file, content);
