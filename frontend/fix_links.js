const fs = require('fs');

const filesToUpdate = [
  {
    path: 'src/app/shared/components/daily-challenge-banner/daily-challenge-banner.component.ts',
    replacements: [
      { from: `['/games', ch.game_id]`, to: `['/', i18n.currentLang(), 'games', ch.game_id]` }
    ]
  },
  {
    path: 'src/app/core/layouts/main-layout.component.ts',
    replacements: [
      { from: `['/blog']`, to: `['/', i18n.currentLang(), 'blog']` }
    ]
  },
  {
    path: 'src/app/core/layouts/footer/footer.component.ts',
    replacements: [
      { from: `['/blog']`, to: `['/', i18n.currentLang(), 'blog']` },
      { from: `['/pages/about']`, to: `['/', i18n.currentLang(), 'pages', 'about']` },
      { from: `['/pages/privacy']`, to: `['/', i18n.currentLang(), 'pages', 'privacy']` },
      { from: `['/pages/terms']`, to: `['/', i18n.currentLang(), 'pages', 'terms']` },
      { from: `['/pages/contact']`, to: `['/', i18n.currentLang(), 'pages', 'contact']` }
    ]
  },
  {
    path: 'src/app/features/blog/blog-list/blog-list.component.ts',
    replacements: [
      { from: `['/blog', post.id]`, to: `['/', i18n.currentLang(), 'blog', post.id]` }
    ]
  },
  {
    path: 'src/app/features/lobby/lobby.component.html',
    replacements: [
      { from: `['/blog']`, to: `['/', i18n.currentLang(), 'blog']` },
      { from: `['/blog', post.id]`, to: `['/', i18n.currentLang(), 'blog', post.id]` },
      { from: `['/games', game.id]`, to: `['/', i18n.currentLang(), 'games', game.id]` }
    ]
  },
  {
    path: 'src/app/features/lobby/lobby.component.ts',
    replacements: [
      { from: `\`/games/\${event.gameId}\``, to: `\`/\${this.i18n.currentLang()}/games/\${event.gameId}\`` }
    ]
  },
  {
    path: 'src/app/features/profile/profile.component.ts',
    replacements: [
      { from: `['/games', game.id]`, to: `['/', i18n.currentLang(), 'games', game.id]` }
    ]
  },
  {
    path: 'src/app/features/docs/docs.component.ts',
    replacements: [
      { from: `['/docs', game.id]`, to: `['/', i18n.currentLang(), 'docs', game.id]` }
    ]
  },
  {
    path: 'src/app/features/daily/daily.component.ts',
    replacements: [
      { from: `['/games', ch.game_id]`, to: `['/', i18n.currentLang(), 'games', ch.game_id]` }
    ]
  }
];

filesToUpdate.forEach(fileDef => {
  const fullPath = '/home/zd/x-game/frontend/' + fileDef.path;
  if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  fileDef.replacements.forEach(repl => {
    // Replace all occurrences
    content = content.split(repl.from).join(repl.to);
  });
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated', fileDef.path);
  } else {
    console.log('No changes in', fileDef.path);
  }
});
