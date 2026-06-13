import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const files = (await readdir(new URL("../tests/", import.meta.url)))
  .filter((file) => file.endsWith(".e2e.ts"))
  .sort();

for (const file of files) {
  console.log(`\n━━ tests/${file} ━━`);
  const code = await new Promise((resolve) => {
    const child = spawn("bun", ["run", `tests/${file}`], { stdio: "inherit", env: process.env });
    child.on("exit", (status) => resolve(status ?? 1));
  });
  if (code !== 0) process.exit(code);
}

console.log(`\n✅ ${files.length} launch-readiness suites passed.`);