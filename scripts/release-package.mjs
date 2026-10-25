// Prepares a new cadence-probe release: bumps the version, rebuilds, and says
// what's left. Usage: npm run release:package -- patch|minor|major
// Publishing stays manual: it needs the account's Windows Hello approval.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const kind = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(kind)) {
  console.error(`Unknown bump "${kind}". Use patch (fixes), minor (new features) or major (breaking changes).`);
  process.exit(1);
}

const file = "packages/cadence-probe/package.json";
const pkg = JSON.parse(readFileSync(file, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
const next = kind === "major" ? `${major + 1}.0.0` : kind === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
pkg.version = next;
writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
console.log(`cadence-probe ${major}.${minor}.${patch} -> ${next}`);

execSync("npm run build:package", { stdio: "inherit" });

console.log(`
Ready. To publish ${next}, in your own PowerShell:
  cd packages\\cadence-probe
  npm publish
then approve with Windows Hello.`);
