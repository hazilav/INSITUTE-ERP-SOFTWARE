const fs = require("fs");
const path = require("path");

function searchDir(dir, matches = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === "node_modules" || file === ".next" || file === ".git") continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath, matches);
    } else {
      const content = fs.readFileSync(filePath, "utf8");
      const terms = ["sqlite", "dev.db", "file:", "better-sqlite3"];
      for (const term of terms) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
          matches.push({ filePath, term });
        }
      }
    }
  }
  return matches;
}

const results = searchDir(process.cwd());
console.log("=== SEARCH RESULTS FOR SQLITE / FILE / DEV.DB / BETTER-SQLITE3 REFERENCES ===");
console.log(JSON.stringify(results, null, 2));
