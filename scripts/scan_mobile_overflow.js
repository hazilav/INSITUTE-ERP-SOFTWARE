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

const findings = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check 1: 100vw or w-screen
    if (trimmed.includes('100vw') || trimmed.includes('w-screen')) {
      findings.push({ file, lineNum, reason: '100vw / w-screen viewport width', text: trimmed });
    }

    // Check 2: Fixed pixel min-width without mobile reset
    if (/min-w-\[\d+px\]/.test(trimmed) || /w-\[\d+px\]/.test(trimmed)) {
      if (!trimmed.includes('sm:') && !trimmed.includes('md:') && !trimmed.includes('lg:')) {
        findings.push({ file, lineNum, reason: 'Fixed pixel width/min-width without mobile breakpoint', text: trimmed });
      }
    }

    // Check 3: Multi-column grid without grid-cols-1 or mobile fallback
    if (/grid-cols-[2-9]/.test(trimmed) || /grid-cols-1[0-2]/.test(trimmed)) {
      if (!trimmed.includes('grid-cols-1') && !trimmed.includes('sm:grid-cols') && !trimmed.includes('md:grid-cols')) {
        findings.push({ file, lineNum, reason: 'Grid columns without grid-cols-1 mobile stack', text: trimmed });
      }
    }

    // Check 4: Table tag without parent overflow container
    if (trimmed.includes('<table') && !content.slice(Math.max(0, content.indexOf(trimmed) - 200), content.indexOf(trimmed)).includes('overflow-x-auto')) {
      findings.push({ file, lineNum, reason: 'Table without overflow-x-auto wrapper', text: trimmed });
    }
  });
});

console.log(`\n=== MOBILE OVERFLOW AUDIT: ${findings.length} POTENTIAL ISSUES ===\n`);
findings.forEach((f) => {
  const relPath = path.relative(path.join(__dirname, '..'), f.file);
  console.log(`[${f.reason}] ${relPath}:${f.lineNum}\n  --> ${f.text.slice(0, 120)}\n`);
});
