import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const apiClientDir = path.resolve(rootDir, "packages/api-client");
const openapiPath = path.resolve(apiClientDir, "openapi.json");
const generatedDir = path.resolve(apiClientDir, "src/generated");

const isCheck = process.argv.includes("--check");

function normalize(str) {
  return str ? str.replace(/\r\n/g, "\n").trim() : "";
}

function getFastApiOpenApiSchema() {
  const output = execSync(
    'uv --directory apps/api run python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))"',
    { cwd: rootDir, encoding: "utf-8" },
  );
  return output.trim();
}

function formatApiClientDir() {
  execSync("pnpm exec prettier --write .", {
    cwd: apiClientDir,
    encoding: "utf-8",
    stdio: "ignore",
  });
}

function runOpenApiTs() {
  execSync("pnpm exec openapi-ts", {
    cwd: apiClientDir,
    encoding: "utf-8",
    stdio: "inherit",
  });
  formatApiClientDir();
}

function readAllFiles(dir) {
  const filesMap = new Map();
  if (!fs.existsSync(dir)) return filesMap;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const relPath = path.relative(dir, fullPath);
        filesMap.set(relPath, fs.readFileSync(fullPath, "utf-8"));
      }
    }
  }
  walk(dir);
  return filesMap;
}

async function main() {
  try {
    console.log("Extracting OpenAPI 3.1.0 schema from FastAPI...");
    const rawSchema = getFastApiOpenApiSchema();

    if (isCheck) {
      // Snapshot existing files
      const existingOpenApi = fs.existsSync(openapiPath)
        ? fs.readFileSync(openapiPath, "utf-8")
        : null;
      const existingGenerated = readAllFiles(generatedDir);

      // Perform generation and formatting
      fs.writeFileSync(openapiPath, `${rawSchema}\n`, "utf-8");
      runOpenApiTs();

      const newOpenApi = fs.readFileSync(openapiPath, "utf-8");
      const newGenerated = readAllFiles(generatedDir);

      let outOfSync = false;
      if (normalize(existingOpenApi) !== normalize(newOpenApi)) {
        console.error("❌ openapi.json is out of sync.");
        outOfSync = true;
      }

      if (existingGenerated.size !== newGenerated.size) {
        console.error("❌ Generated files count mismatched.");
        outOfSync = true;
      } else {
        for (const [file, content] of newGenerated.entries()) {
          if (normalize(existingGenerated.get(file)) !== normalize(content)) {
            console.error(`❌ Generated file ${file} is out of sync.`);
            outOfSync = true;
          }
        }
      }

      if (outOfSync) {
        console.error(
          "\nAPI client generated artifacts are out of sync with FastAPI schema. Please run 'pnpm generate:api-client' to update.",
        );
        process.exit(1);
      }

      console.log("✅ API client artifacts are synchronized and up to date.");
    } else {
      fs.writeFileSync(openapiPath, `${rawSchema}\n`, "utf-8");
      console.log("Generating TypeScript API client with @hey-api/openapi-ts...");
      runOpenApiTs();
      console.log("✅ API client generation completed successfully.");
    }
  } catch (error) {
    console.error("Error generating API client:", error);
    process.exit(1);
  }
}

main();
