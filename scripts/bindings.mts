import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bindings = join(root, "src/shared/api/bindings.ts");
const args = process.argv.slice(2);

if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  console.error("Usage: node scripts/bindings.mts [--check]");
  process.exit(1);
}

const check = args[0] === "--check";
const temporaryDirectory = check
  ? await mkdtemp(join(tmpdir(), "tabletop-bindings-"))
  : undefined;
const output = temporaryDirectory
  ? join(temporaryDirectory, "bindings.ts")
  : bindings;

try {
  const result = spawnSync(
    "cargo",
    [
      "run",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--locked",
      "--features",
      "bindings",
      "--bin",
      "export-bindings",
      "--",
      output,
    ],
    { cwd: root, stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else if (check) {
    // Ignore checkout line endings; the generated contract itself must match.
    const normalize = (text: string) => text.replaceAll("\r\n", "\n");
    const expected = normalize(await readFile(output, "utf8"));
    const actual = normalize(await readFile(bindings, "utf8"));

    if (actual !== expected) {
      console.error(
        "IPC bindings are outdated. Run npm run bindings:generate and commit the result.",
      );
      process.exitCode = 1;
    } else {
      console.log("IPC bindings match the Rust contract.");
    }
  }
} catch (error) {
  console.error("Unable to generate or check IPC bindings:", error);
  process.exitCode = 1;
} finally {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
