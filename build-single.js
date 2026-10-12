/* 构建单文件版
   把 prototype 的四个页面 + static/style.css + static/app.js
   合并成一个自包含的 HTML（hash 路由切页，双击即可打开）。
   产出两份（内容完全一致，只是文件名不同）：
     1. index.html        —— 网站入口 / GitHub Pages 首页
     2. AegisData.html    —— 发给别人时文件名更明确，双击即开
   用法：node build-single.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'AegisData.html');
const OUT_INDEX = path.join(ROOT, 'index.html');

const PAGES = [
  { key: 'console', file: 'index.html', title: '访问控制台' },
  { key: 'audit',   file: 'audit.html', title: '审计日志' },
  { key: 'rules',   file: 'rules.html', title: '权限规则' },
  { key: 'about',   file: 'about.html', title: '系统说明' },
];

const read = (p) => fs.readFileSync(p, 'utf8');

/* 取出「侧边栏 + 主区域」，其余（head / script 标签）由本脚本统一生成 */
function extractBodyBlock(html) {
  const start = html.indexOf('<aside class="sidebar">');
  const end = html.indexOf('<script src=');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('body 结构未匹配，无法提取内容块');
  }
  return html.slice(start, end).trim();
}

/* 侧边栏在所有页面是同一份，单独保留一份并做 hash 链接改写 */
function extractSidebar(html) {
  const block = extractBodyBlock(html);
  const start = block.indexOf('<aside class="sidebar">');
  const end = block.indexOf('</aside>') + '</aside>'.length;
  return block.slice(start, end);
}

function rewriteLinks(html) {
  return html
    .replace(/href="index\.html"/g, 'href="#console"')
    .replace(/href="audit\.html"/g, 'href="#audit"')
    .replace(/href="rules\.html"/g, 'href="#rules"')
    .replace(/href="about\.html"/g, 'href="#about"');
}

const navLinks = {
  console: '<a class="nav__item is-active" href="#console" data-nav="console">',
  audit:   '<a class="nav__item" href="#audit" data-nav="audit">',
  rules:   '<a class="nav__item" href="#rules" data-nav="rules">',
  about:   '<a class="nav__item" href="#about" data-nav="about">',
};

/* 侧边栏里把 is-active 去掉，改由脚本按 hash 控制 */
function sidebarTemplate(sidebar) {
  let out = rewriteLinks(sidebar);
  out = out.replace(/<a class="nav__item is-active" href="#(console|audit|rules|about)"[^>]*>/g,
    (m, key) => navLinks[key].replace(' is-active', ''));
  /* 补 data-nav，便于脚本高亮 */
  out = out.replace(/<a class="nav__item" href="#(console|audit|rules|about)"/g,
    (m, key) => '<a class="nav__item" href="#' + key + '" data-nav="' + key + '"');
  /* aria-current 交给脚本 */
  out = out.replace(/\s+aria-current="page"/g, '');
  return out;
}

/* 每页的「主区域」内容 */
function extractMain(html) {
  const block = extractBodyBlock(html);
  const start = block.indexOf('<div class="main">');
  if (start < 0) throw new Error('未找到 .main');
  return rewriteLinks(block.slice(start).trim());
}

const css = read(path.join(ROOT, 'static', 'style.css'));
let app = read(path.join(ROOT, 'static', 'app.js'));
app = rewriteLinks(app);

const htmls = {};
for (const p of PAGES) htmls[p.key] = read(path.join(ROOT, 'prototype', p.file));

const sidebar = sidebarTemplate(extractSidebar(htmls.console));

const sections = PAGES.map((p, i) => {
  const main = extractMain(htmls[p.key]);
  const hidden = i === 0 ? '' : ' hidden';
  return `<div class="page" data-page-section="${p.key}"${hidden}>\n${main}\n</div>`;
}).join('\n\n');

const bundle = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AegisData · 企业数据安全管理平台</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 3 27 7.5v8.7c0 6.6-4.5 11.6-11 13.8-6.5-2.2-11-7.2-11-13.8V7.5L16 3Z' fill='%231e40af'/%3E%3Cpath d='M11 16.2l3.4 3.4L21.5 13' stroke='%23fff' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>
${css}
</style>
</head>
<body data-page="console" data-single="1">

${sidebar}

<div class="pages">
${sections}
</div>

<script>
${app}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, bundle, 'utf8');
fs.writeFileSync(OUT_INDEX, bundle, 'utf8');

console.log('已生成 ' + path.relative(process.cwd(), OUT));
console.log('已生成 ' + path.relative(process.cwd(), OUT_INDEX));
console.log('大小 ' + (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1) + ' KB');