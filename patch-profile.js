const fs = require('fs');
const path = 'frontend/src/app/features/profile/profile.component.ts';
let content = fs.readFileSync(path, 'utf-8');

const replacement = `  formatModeAndDiff(stat: UserGameStat): string {
    let modeStr = stat.Mode === 'single' ? (this.i18n.t('game.single_mode')() || 'Single') : stat.Mode;
    let diffStr = stat.Difficulty;
    if (!diffStr) return modeStr;

    const possibleKey = 'game.diff_' + diffStr.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const translatedDiff = this.i18n.t(possibleKey)();
    
    // if translation exists, use it, else fallback to diffStr but we also check common map
    if (translatedDiff && translatedDiff !== possibleKey) {
        diffStr = translatedDiff;
    } else if (this.i18n.currentLang() === 'zh') {
        const zhMap: Record<string, string> = {
            'easy': '简单', 'medium': '中等', 'hard': '困难', 'expert': '专家',
            'beginner': '初级', 'intermediate': '中级',
            '3x3': '3x3', '4x4': '4x4', '5x5': '5x5', '6x6': '6x6'
        };
        diffStr = zhMap[diffStr] || diffStr;
    }
    return \`\${modeStr} - \${diffStr}\`;
  }`;

content = content.replace(/  formatModeAndDiff\(stat: UserGameStat\): string \{[\s\S]*?\n  \}/, replacement);

fs.writeFileSync(path, content);
console.log("Patched profile.component.ts");
