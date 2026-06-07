const fs = require('fs');
const path = require('path');
const { TRANSLATIONS } = require('./dist_tmp_cjs/core/i18n/translations.js');

const baseXml = fs.readFileSync('messages.xlf', 'utf-8');

function generateXlf(lang) {
  const dict = TRANSLATIONS[lang];
  if (!dict) {
      console.log('No dict for', lang);
      return;
  }

  let translatedXml = baseXml;
  
  translatedXml = translatedXml.replace(/<trans-unit id="@@([^"]+)" datatype="html">([\s\S]*?)<\/trans-unit>/g, (match, key, inner) => {
    let translation = dict[key];
    if (translation === undefined) {
      console.warn(`Missing translation for ${lang}: ${key}`);
      translation = key; // fallback
    }
    
    // We need to insert <target>...</target> after <source>...</source>
    const sourceRegex = /(<source>[\s\S]*?<\/source>)/;
    if (sourceRegex.test(inner)) {
      const replacedInner = inner.replace(sourceRegex, `$1\n        <target>${translation}</target>`);
      return `<trans-unit id="@@${key}" datatype="html">${replacedInner}</trans-unit>`;
    } else {
      return match;
    }
  });

  const outPath = path.join(__dirname, `src/locale/messages.${lang}.xlf`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, translatedXml, 'utf-8');
  console.log(`Generated ${outPath}`);
}

generateXlf('en');
generateXlf('zh');
