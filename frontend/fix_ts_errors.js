const fs = require('fs');

const file1 = '/home/zd/x-game/frontend/src/app/features/games/math24/components/math24-pk-speed/math24-pk-speed.component.ts';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace("import { Component, effect, inject, Input } from '@angular/core';", "import { Component, effect, inject, Input, signal } from '@angular/core';");
fs.writeFileSync(file1, content1);

const file2 = '/home/zd/x-game/frontend/src/app/features/games/math24/components/math24-pk-steal/math24-pk-steal.component.ts';
if (fs.existsSync(file2)) {
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace("import { Component, effect, inject, Input } from '@angular/core';", "import { Component, effect, inject, Input, signal } from '@angular/core';");
  fs.writeFileSync(file2, content2);
}

const file3 = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.ts';
let content3 = fs.readFileSync(file3, 'utf8');
// Move super() to the top of the constructor
const constructorStart = `  constructor() {
    this.roomLifecycle = setupRoomLifecycle({`;
const newConstructorStart = `  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({`;
content3 = content3.replace(constructorStart, newConstructorStart);
content3 = content3.replace(`      });\n    super();\n    effect(() => {`, `      });\n    effect(() => {`);
fs.writeFileSync(file3, content3);

console.log('Fixed TS compilation errors');
