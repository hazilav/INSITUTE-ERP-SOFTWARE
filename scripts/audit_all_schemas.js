const fs = require("fs");
const path = require("path");

function searchDir(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === "node_modules" || file === ".next" || file === ".git") continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath, results);
    } else {
      if (file.includes("schema") || file.includes("prisma") || file.endsWith(".json") || file.endsWith(".ts") || file.endsWith(".js")) {
        const content = fs.readFileSync(filePath, "utf8");
        if (content.includes("sqlite") || content.includes("provider =")) {
          results.push({ filePath, preview: content.slice(0, 300) });
        }
      }
    }
  }
  return results;
}

const results = searchDir(process.cwd());
console.log("=== ALL FILES WITH PRISMA PROVIDERS / SCHEMAS ===");
console.log(JSON.stringify(results, null, 2));
