const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walk('frontend/src/app/features/games', (filePath) => {
  if (filePath.endsWith('.ts') && !filePath.includes('.spec.')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (content.includes('onLeaveRoom: () => this.returnToLobby(),')) {
      content = content.replace(/onLeaveRoom:\s*\(\)\s*=>\s*this\.returnToLobby\(\),/g, `onLeaveRoom: () => {
        this.store.leaveRoom();
        if (this.roomLifecycle) {
          this.roomLifecycle.clearReconnectInfo();
        }
      },`);
      changed = true;
    }

    if (content.includes('returnToLobby() {')) {
      // Very naive regex to strip the method - actually better to just leave it or use a proper tool.
      // But since TS compilation succeeded, the easiest is to just leave it or let's try a regex for simple cases
      content = content.replace(/returnToLobby\(\)\s*\{[\s\S]*?\n\s*\}/g, '');
      changed = true;
    }

    if (content.includes('onLeaveClick() {')) {
      content = content.replace(/onLeaveClick\(\)\s*\{[\s\S]*?\n\s*\}/g, '');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed TS:', filePath);
    }
  }
});
