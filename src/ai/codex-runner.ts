import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { z } from "zod";
import { toJSONSchema } from "zod";

function execute(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 20 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (error, _stdout, stderr) => {
      if (error) reject(new Error(`${error.message}${stderr ? `\n${stderr}` : ""}`));
      else resolve();
    });
  });
}

export class CodexRunner {
  private readonly executable = process.env.FS_CODEX_BIN || "codex";

  async structured<T>(root: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "frontend-system-codex-"));
    const schemaPath = join(temporaryDirectory, "schema.json");
    const outputPath = join(temporaryDirectory, "output.json");
    try {
      await writeFile(schemaPath, JSON.stringify(toJSONSchema(schema)));
      await execute(this.executable, [
        "exec",
        "--ephemeral",
        "--color", "never",
        "--cd", root,
        "--sandbox", "read-only",
        "--output-schema", schemaPath,
        "--output-last-message", outputPath,
        prompt,
      ]);
      return schema.parse(JSON.parse(await readFile(outputPath, "utf8")));
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  async edit(root: string, prompt: string): Promise<string> {
    return this.text(root, prompt, true);
  }

  async read(root: string, prompt: string): Promise<string> {
    return this.text(root, prompt, false);
  }

  private async text(root: string, prompt: string, write: boolean): Promise<string> {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "frontend-system-codex-"));
    const outputPath = join(temporaryDirectory, "output.txt");
    try {
      await execute(this.executable, [
        "exec",
        "--ephemeral",
        "--color", "never",
        "--cd", root,
        "--sandbox", write ? "workspace-write" : "read-only",
        ...(write ? ["--approve-for-me"] : []),
        "--output-last-message", outputPath,
        prompt,
      ]);
      return await readFile(outputPath, "utf8");
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}
