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

console.log(`Scanning ${files.length} files...`);

const issues = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Check 1: alert()
    if (line.includes('alert(')) {
      issues.push({ file, lineNum, type: 'ALERT_CALL', text: line.trim() });
    }

    // Check 2: href="#" or href=""
    if (line.includes('href="#"') || line.includes('href=""')) {
      issues.push({ file, lineNum, type: 'DUMMY_HREF', text: line.trim() });
    }

    // Check 3: Empty onClick or console.log onClick
    if (line.includes('onClick={() => {}}') || line.includes('onClick={() => null}') || line.includes('onClick={() => undefined}')) {
      issues.push({ file, lineNum, type: 'EMPTY_ONCLICK', text: line.trim() });
    }

    // Check 4: TODO in code
    if (line.includes('TODO')) {
      issues.push({ file, lineNum, type: 'TODO_COMMENT', text: line.trim() });
    }

    // Check 5: "Coming Soon" or "Not Implemented"
    if (line.toLowerCase().includes('coming soon') || line.toLowerCase().includes('not implemented')) {
      issues.push({ file, lineNum, type: 'PLACEHOLDER_TEXT', text: line.trim() });
    }
  });
});

console.log(`\n=== AUDIT RESULTS: ${issues.length} potential issues found ===\n`);
issues.forEach((iss) => {
  const relPath = path.relative(path.join(__dirname, '..'), iss.file);
  console.log(`[${iss.type}] ${relPath}:${iss.lineNum}`);
  console.log(`   ${iss.text}\n`);
});
