const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'www.puzzlepk.com';
const KEY = '6f09230536ce4ffeb50d267f89db51d0';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Read sitemap
const sitemapPath = path.join(__dirname, '../frontend/public/sitemap.xml');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

// Extract URLs
const urls = [];
const regex = /<loc>(.*?)<\/loc>/g;
let match;
while ((match = regex.exec(sitemapContent)) !== null) {
    if (match[1].includes(HOST)) {
        urls.push(match[1]);
    }
}

// Remove duplicates
const uniqueUrls = [...new Set(urls)];

console.log(`Found ${uniqueUrls.length} unique URLs in sitemap.`);

// IndexNow allows max 10000 URLs per request
const payload = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: uniqueUrls
});

const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(payload);
req.end();

console.log(`Submitted URLs to IndexNow for ${HOST}.`);
