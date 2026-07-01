const fs = require('fs');

function updateJson(file, addKeys) {
  let content = fs.readFileSync(file, 'utf8');
  let obj = JSON.parse(content);
  for (let key in addKeys) {
    obj[key] = addKeys[key];
  }
  // To keep formatting, it's better to just stringify
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Updated', file);
}

updateJson('frontend/src/assets/i18n/zh.json', {
  "game.wait_others": "请等待其他玩家完成",
  "game.spectating": "观战中..."
});

updateJson('frontend/src/assets/i18n/en.json', {
  "game.live_scores": "Live Scores",
  "game.playing": "Playing",
  "game.finished": "Finished",
  "game.wait_others": "Please wait for other players to finish.",
  "game.spectating": "Spectating..."
});

