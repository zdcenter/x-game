const fs = require('fs');
const path = 'frontend/public/assets/games-docs.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const idx = data.findIndex(g => g.id === 'sliding');
if (idx !== -1) {
  let rules = JSON.parse(data[idx].rules);
  rules.en = rules.en.replace('[demo:sliding]\n\n', '');
  rules.zh = rules.zh.replace('[demo:sliding]\n\n', '');
  data[idx].rules = JSON.stringify(rules);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}
