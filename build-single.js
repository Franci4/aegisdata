/* 构建单文件版
   把 src/prototype 的四个页面 + src/static 的样式和脚本
   合并成一个自包含的 HTML（hash 路由切页，双击即可打开）。
   产出：
     1. index.html                   —— 网站入口 / GitHub Pages 首页
     2. AegisData.html               —— 发给别人时文件名更明确，双击即开
     3. code/                        —— 干净的可运行代码副本（页面 + static/ + 单文件版）
   用法：node build-single.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'AegisData.html');
const OUT_INDEX = path.join(ROOT, 'index.html');
const CODE = path.join(ROOT, 'code');

const PAGES = [
  { key: 'console', file: 'index.html', title: '访问控制台' },
  { key: 'audit',   file: 'audit.html', title: '审计日志' },
  { key: 'rules',   file: 'rules.html', title: '权限规则' },
  { key: 'about',   file: 'about.html', title: '系统说明' },
];

const read = (p) => fs.readFileSync(p, 'utf8');

/* 取出「顶部栏 + 侧边栏 + 主区域」，其余（head / script 标签）由本脚本统一生成 */
function extractBodyBlock(html) {
  const start = html.indexOf('<header class="top">');
  const end = html.indexOf('<script src=');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('body 结构未匹配，无法提取内容块');
  }
  return html.slice(start, end).trim();
}

/* 顶部栏与侧边栏在所有页面是同一份，各保留一份做 hash 链接改写 */
function extractTopbar(html) {
  const block = extractBodyBlock(html);
  const start = block.indexOf('<header class="top">');
  const end = block.indexOf('</header>') + '</header>'.length;
  return block.slice(start, end);
}

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

/* 侧边栏与顶部栏里去掉写死的选中态，改由脚本按 hash 控制 */
function shellTemplate(html) {
  let out = rewriteLinks(html);
  out = out.replace(/<a class="nav__item is-active" href="#(console|audit|rules|about)"[^>]*>/g,
    (m, key) => '<a class="nav__item" href="#' + key + '" data-nav="' + key + '">');
  out = out.replace(/\s+aria-current="page"/g, '');
  return out;
}

/* 每页的「主区域」内容（去掉重复的 shell，只留 .main 内部） */
function extractMain(html) {
  const block = extractBodyBlock(html);
  const start = block.indexOf('<div class="main">');
  if (start < 0) throw new Error('未找到 .main');
  const main = block.slice(start).trim();
  /* 去掉最外层 <div class="main"> ... </div>，由单文件版统一包裹 */
  const inner = main
    .replace(/^<div class="main">/, '')
    .replace(/<\/div>\s*$/, '');
  return rewriteLinks(inner);
}

const css = read(path.join(SRC, 'static', 'style.css'));
let app = read(path.join(SRC, 'static', 'app.js'));
app = rewriteLinks(app);

const htmls = {};
for (const p of PAGES) htmls[p.key] = read(path.join(SRC, 'prototype', p.file));

const topbar = shellTemplate(extractTopbar(htmls.console));
let sidebar = shellTemplate(extractSidebar(htmls.console));

const sections = PAGES.map((p) => {
  const main = extractMain(htmls[p.key]);
    const shown = p.key === 'console' ? ' is-shown' : '';
  return `    <div class="page page--${p.key}${shown}" id="${p.key}">\n${main}\n    </div>`;
}).join('\n\n');

/* 单文件版：把 logo 与 favicon 内联成 data URI，保证不依赖任何外部文件 */
const logoPath = path.join(SRC, 'static', 'logo-mark.webp');
const logoData = 'data:image/webp;base64,' + fs.readFileSync(logoPath).toString('base64');
const faviconUrl = logoData;

let bundle = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AegisData · 企业数据安全管理平台</title>
<link rel="icon" href="${faviconUrl}">
<style>
${css}
</style>
</head>
<body data-page="console" data-single="1" class="single">

${topbar}

<div class="shell">

${sidebar}

  <div class="main">
${sections}
  </div>
</div>

<script>
${app}
</script>
</body>
</html>
`;

/* 页面里的 logo 引用改成内联 data URI */
bundle = bundle.split('../static/logo-mark.webp').join(logoData);


fs.writeFileSync(OUT, bundle, 'utf8');
fs.writeFileSync(OUT_INDEX, bundle, 'utf8');

/* ── 同步一份干净的可运行代码到 code/ ──────────────────────────── */
function syncCode() {
  const pairs = [
    [path.join(SRC, 'prototype', 'index.html'), path.join(CODE, 'index.html')],
    [path.join(SRC, 'prototype', 'audit.html'), path.join(CODE, 'audit.html')],
    [path.join(SRC, 'prototype', 'rules.html'), path.join(CODE, 'rules.html')],
    [path.join(SRC, 'prototype', 'about.html'), path.join(CODE, 'about.html')],
    [path.join(SRC, 'static', 'style.css'),     path.join(CODE, 'static', 'style.css')],
    [path.join(SRC, 'static', 'app.js'),        path.join(CODE, 'static', 'app.js')],
    [path.join(SRC, 'static', 'logo-mark.webp'), path.join(CODE, 'static', 'logo-mark.webp')],
  ];
  for (const [from, to] of pairs) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  const single = path.join(CODE, '单文件版.html');
  fs.writeFileSync(single, bundle, 'utf8');
}

syncCode();

console.log('已生成 ' + path.relative(process.cwd(), OUT));
console.log('已生成 ' + path.relative(process.cwd(), OUT_INDEX));
console.log('已同步 code/ 目录');
console.log('大小 ' + (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1) + ' KB');