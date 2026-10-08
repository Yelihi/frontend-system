import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

test("maintenance evaluator accepts the reference journey and rejects known policy/state/I-O/keep defects", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-eval-calibration-"));
  try {
    const output = join(root, "calibration.json");
    await promisify(execFile)(process.execPath, ["test/evals/fs-comparison/v3/maintenance/evaluate.mjs", "calibrate", output], { timeout: 30000 });
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.equal(report.correctAccepted, 3);
    assert.equal(report.mutantsRejected, 21);
    assert.equal(report.modelCalls, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
