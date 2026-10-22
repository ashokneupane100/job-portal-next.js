import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Prints the TRUNCATE statement for Drizzle Studio's SQL console and, when a
// clipboard tool is available, copies it so you can paste it straight in.
const sqlFile = join(process.cwd(), "src", "drizzle", "clear-all-data.sql");
const contents = readFileSync(sqlFile, "utf8");

// Strip the comment lines so only the runnable statement is copied.
const statement = contents
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--") && line.trim() !== "")
  .join("\n");

function copyToClipboard(text: string): string | null {
  const candidates: Array<[string, string[]]> = [
    ["wl-copy", []],
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
    ["pbcopy", []],
  ];

  for (const [cmd, args] of candidates) {
    try {
      execFileSync(cmd, args, { input: text, stdio: ["pipe", "ignore", "ignore"] });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

const usedTool = copyToClipboard(statement);

console.log("\nCopy this into Drizzle Studio's SQL console:\n");
console.log(statement);
console.log("");

if (usedTool) {
  console.log(`✓ Copied to your clipboard (via ${usedTool}). Just paste it and press Run.\n`);
} else {
  console.log("Tip: select the line above and copy it, then paste into Studio.\n");
}
