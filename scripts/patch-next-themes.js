const fs = require('fs');
const path = require('path');

// Patch ESM: index.mjs
const mjsPath = path.join(__dirname, '../node_modules/next-themes/dist/index.mjs');
if (fs.existsSync(mjsPath)) {
  let mjs = fs.readFileSync(mjsPath, 'utf8');
  const start = mjs.indexOf('_=t.memo');
  const end = mjs.indexOf(',H=', start);
  if (start !== -1 && end !== -1) {
    mjs = mjs.slice(0, start) + '_=()=>null' + mjs.slice(end);
    fs.writeFileSync(mjsPath, mjs, 'utf8');
    console.log('Successfully patched index.mjs');
  } else {
    console.log('Could not find slice in index.mjs');
  }
}

// Patch CJS: index.js
const cjsPath = path.join(__dirname, '../node_modules/next-themes/dist/index.js');
if (fs.existsSync(cjsPath)) {
  let cjs = fs.readFileSync(cjsPath, 'utf8');
  const start = cjs.indexOf('Y=t.memo');
  const end = cjs.indexOf(',Z=', start);
  if (start !== -1 && end !== -1) {
    cjs = cjs.slice(0, start) + 'Y=()=>null' + cjs.slice(end);
    fs.writeFileSync(cjsPath, cjs, 'utf8');
    console.log('Successfully patched index.js');
  } else {
    console.log('Could not find slice in index.js');
  }
}
