import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const distIndex = readFileSync(join(__dirname, '..', 'dist', 'index.html'), 'utf-8');

const mockScript = `<script>
${readFileSync(join(__dirname, 'shared', 'mock-tauri.js'), 'utf-8')}
${readFileSync(join(__dirname, 'shared', 'test-utils.js'), 'utf-8')}
<\/script>`;

const appHtml = distIndex.replace('</head>', mockScript + '\n</head>');

writeFileSync(join(__dirname, 'app.html'), appHtml, 'utf-8');
console.log('Generated e2e/app.html from dist/index.html');
