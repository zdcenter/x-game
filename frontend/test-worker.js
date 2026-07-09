const linkHeader = '<chunk-X.js>; rel="modulepreload"';
const fixedLink = linkHeader.replace(/<([^/h][^>]*)>/g, '</$1>');
console.log(fixedLink);
