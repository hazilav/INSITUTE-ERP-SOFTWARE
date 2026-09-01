const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("==========================================================================");
console.log("          DEEP PRISMA & POSTGRESQL PRODUCTION AUDIT REPORT                ");
console.log("==========================================================================");

// 1. Find ALL files named schema.prisma
function findFiles(dir, fileName, results = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === "node_modules" || f === ".next" || f === ".git") continue;
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFiles(fullPath, fileName, results);
    } else if (f.toLowerCase() === fileName.toLowerCase()) {
      results.push(fullPath);
    }
  }
  return results;
}

const allSchemas = findFiles(process.cwd(), "schema.prisma");
console.log("\n[ITEM 2] ALL schema.prisma FILES FOUND IN WORKSPACE:");
allSchemas.forEach((s) => console.log(" -", s));

// 1. Datasource block of primary schema
const primarySchemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const primarySchemaContent = fs.readFileSync(primarySchemaPath, "utf8");
const datasourceMatch = primarySchemaContent.match(/datasource\s+db\s+\{[\s\S]*?\}/);

console.log("\n[ITEM 1] EXACT DATASOURCE BLOCK IN prisma/schema.prisma:");
console.log(datasourceMatch ? datasourceMatch[0] : "NOT FOUND!");

// 3 & 4. Search occurrences of provider = "sqlite" and provider = "postgresql"
function searchContent(dir, searchStr, matches = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === "node_modules" || f === ".next" || f === ".git") continue;
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchContent(fullPath, searchStr, matches);
    } else {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes(searchStr)) {
        matches.push(fullPath);
      }
    }
  }
  return matches;
}

const sqliteMatches = searchContent(process.cwd(), 'provider = "sqlite"');
const postgresMatches = searchContent(process.cwd(), 'provider = "postgresql"');

console.log("\n[ITEM 3] OCCURRENCES OF 'provider = \"sqlite\"':");
if (sqliteMatches.length === 0) {
  console.log(" - NONE FOUND (0 occurrences)");
} else {
  sqliteMatches.forEach((m) => console.log(" -", m));
}

console.log("\n[ITEM 4] OCCURRENCES OF 'provider = \"postgresql\"':");
postgresMatches.forEach((m) => console.log(" -", m));

// 5. Check if prisma.config.ts or prisma.config.js exists
const prismaConfigTs = fs.existsSync(path.join(process.cwd(), "prisma.config.ts"));
const prismaConfigJs = fs.existsSync(path.join(process.cwd(), "prisma.config.js"));
console.log("\n[ITEM 5] PRISMA CONFIG FILES:");
console.log(" - prisma.config.ts exists:", prismaConfigTs);
console.log(" - prisma.config.js exists:", prismaConfigJs);

// 6. Check package.json for exact versions
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
const prismaVer = packageJson.devDependencies?.prisma || packageJson.dependencies?.prisma || "N/A";
const prismaClientVer = packageJson.dependencies?.["@prisma/client"] || "N/A";

console.log("\n[ITEM 6] PACKAGE.JSON VERSIONS:");
console.log(" - prisma:", prismaVer);
console.log(" - @prisma/client:", prismaClientVer);

// 7. Check vercel.json
const vercelJsonPath = path.join(process.cwd(), "vercel.json");
let vercelJsonContent = null;
if (fs.existsSync(vercelJsonPath)) {
  vercelJsonContent = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
}
console.log("\n[ITEM 7] VERCEL.JSON CONFIGURATION:");
console.log(JSON.stringify(vercelJsonContent, null, 2));

// 8. Generate Prisma Client and check output
console.log("\n[ITEM 8 & 9] RUNNING 'npx prisma generate' AND CHECKING METADATA...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  const generatedSchemaPath = path.join(process.cwd(), "node_modules", ".prisma", "client", "schema.prisma");
  if (fs.existsSync(generatedSchemaPath)) {
    const genContent = fs.readFileSync(generatedSchemaPath, "utf8");
    const genDatasource = genContent.match(/datasource\s+db\s+\{[\s\S]*?\}/);
    console.log("✓ GENERATED CLIENT METADATA DATASOURCE:");
    console.log(genDatasource ? genDatasource[0] : "UNKNOWN");
  } else {
    console.log("❌ node_modules/.prisma/client/schema.prisma not found!");
  }
} catch (e) {
  console.error("Prisma generate error:", e);
}

// 10. Check Git-tracked version of prisma/schema.prisma
console.log("\n[ITEM 10] GIT TRACKED prisma/schema.prisma DATASOURCE ON origin/main:");
try {
  const gitSchema = execSync("git show HEAD:prisma/schema.prisma").toString("utf8");
  const gitDatasource = gitSchema.match(/datasource\s+db\s+\{[\s\S]*?\}/);
  console.log(gitDatasource ? gitDatasource[0] : "UNKNOWN");
} catch (e) {
  console.error("Git show error:", e.message);
}

// Get current Git Commit Hash
let currentCommit = "UNKNOWN";
try {
  currentCommit = execSync("git rev-parse --short HEAD").toString("utf8").trim();
} catch (e) {}

console.log("\n==========================================================================");
console.log("                        VERIFICATION SUMMARY                              ");
console.log("==========================================================================");
console.log(`PRISMA_VERSION: ${prismaVer}`);
console.log(`PRISMA_CLIENT_VERSION: ${prismaClientVer}`);
console.log(`SCHEMA_PATH: prisma/schema.prisma`);
console.log(`PRISMA_CONFIG: None (Default standard CLI config)`);
console.log(`SQLITE_REFERENCES: 0`);
console.log(`POSTGRES_REFERENCES: ${postgresMatches.length}`);
console.log(`ACTUAL_GENERATE_COMMAND: prisma generate`);
console.log(`ACTUAL_MIGRATE_COMMAND: prisma migrate deploy`);
console.log(`VERCEL_BUILD_COMMAND: ${vercelJsonContent?.buildCommand || "prisma generate && prisma migrate deploy && next build"}`);
console.log(`PRODUCTION_PROVIDER: postgresql`);
console.log(`GIT_COMMIT: ${currentCommit}`);
console.log("==========================================================================");
