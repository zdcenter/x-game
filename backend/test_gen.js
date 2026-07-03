const { generate } = require('bridges-generator');

try {
  const generated = generate(7, 7, 10, 0.2);
  console.log(JSON.stringify(generated.puzzle));
} catch (e) {
  console.error(e);
}
