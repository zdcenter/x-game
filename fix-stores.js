const fs = require('fs');
const glob = require('glob');

const files = glob.sync('frontend/src/app/features/games/**/*.store.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // check if gameState already exists
  if (!content.includes('gameState = computed(() => this.ws.gameState());') && !content.includes('gameState = computed(() => this.wsService.gameState());')) {
    // some use ws, some use wsService
    if (content.includes('private ws = inject(WebSocketService);')) {
      content = content.replace(
        /private ws = inject\(WebSocketService\);/,
        'private ws = inject(WebSocketService);\n  gameState = computed(() => this.ws.gameState());'
      );
    } else if (content.includes('private wsService = inject(WebSocketService);')) {
      content = content.replace(
        /private wsService = inject\(WebSocketService\);/,
        'private wsService = inject(WebSocketService);\n  gameState = computed(() => this.wsService.gameState());'
      );
    }
    fs.writeFileSync(file, content);
    console.log('Updated store: ' + file);
  }
}
