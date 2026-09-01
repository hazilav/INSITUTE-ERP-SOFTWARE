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

console.log(`Scanning ${files.length} files for currency references...`);

const findings = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check for $ inside text or template strings representing currency
    if (
      trimmed.includes('$') &&
      !trimmed.includes('${') && // ignore normal template literals unless it looks like currency like `${$` or `$${`
      !trimmed.includes('process.env')
    ) {
      findings.push({ file, lineNum, text: trimmed });
    } else if (trimmed.includes('$${') || trimmed.includes('${$') || trimmed.includes('USD') || trimmed.toLowerCase().includes('dollar')) {
      findings.push({ file, lineNum, text: trimmed });
    }
  });
});

console.log(`\n=== CURRENCY FINDINGS: ${findings.length} matches ===\n`);
findings.forEach((f) => {
  const relPath = path.relative(path.join(__dirname, '..'), f.file);
  console.log(`${relPath}:${f.lineNum} -> ${f.text}`);
});
