const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = walk(srcDir);

console.log(`Deep auditing ${files.length} files...`);

const findings = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check 1: Raw alerts
    if (trimmed.includes('alert(')) {
      findings.push({ file, lineNum, category: 'RAW_ALERT', snippet: trimmed });
    }

    // Check 2: Disabled buttons without explanation or stuck state
    if (trimmed.includes('<button') && trimmed.includes('disabled') && !trimmed.includes('loading') && !trimmed.includes('disabled={')) {
      findings.push({ file, lineNum, category: 'HARDCODED_DISABLED_BUTTON', snippet: trimmed });
    }

    // Check 3: href="#"
    if (trimmed.includes('href="#"') || trimmed.includes("href='#'")) {
      findings.push({ file, lineNum, category: 'DUMMY_LINK', snippet: trimmed });
    }

    // Check 4: Console log inside button handler
    if (trimmed.includes('onClick') && trimmed.includes('console.log')) {
      findings.push({ file, lineNum, category: 'CONSOLE_LOG_HANDLER', snippet: trimmed });
    }

    // Check 5: Unhandled fetch without try/catch or catch
    if (trimmed.includes('fetch(') && !content.includes('catch') && !content.includes('try')) {
      findings.push({ file, lineNum, category: 'UNHANDLED_FETCH', snippet: trimmed });
    }
  });
});

console.log(`\n=== DEEP AUDIT RESULTS: ${findings.length} findings ===\n`);
findings.forEach((f) => {
  const relPath = path.relative(path.join(__dirname, '..'), f.file);
  console.log(`[${f.category}] ${relPath}:${f.lineNum}`);
  console.log(`   ${f.snippet}\n`);
});
