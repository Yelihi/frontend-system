import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { changedFiles, diffStat, reviewBase } from "../src/application/git-state.js";

test("Git review paths preserve filenames, both rename sides, and individual untracked files", async () => {
  const root = await mkdtemp(join(tmpdir(), "fs-git-paths-"));
  const git = (...args: string[]) => promisify(execFile)("git", ["-C", root, ...args]);
  const write = async (path: string, content: string) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  };
  try {
    await git("init");
    await git("config", "user.name", "FS test");
    await git("config", "user.email", "fs-test@example.invalid");
    const unusual = ["src/한글.ts", "src/with space.ts", "src/line\nbreak.ts", "src/quote\".ts", "src/arrow -> name.ts", " leading.ts "];
    for (const path of ["src/order.ts", "src/old name.ts", "src/deleted.ts", ...unusual]) await write(path, "original\n");
    await git("add", ".");
    await git("commit", "-m", "baseline");
    const baseline = (await git("rev-parse", "HEAD")).stdout.trim();
    assert.equal(await reviewBase(root), baseline);
    assert.deepEqual(await changedFiles(root), []);

    // A leading space in the first porcelain status must not shift its filename.
    await write("src/order.ts", "changed\n");
    assert.deepEqual(await changedFiles(root), ["src/order.ts"]);
    assert.equal(await reviewBase(root), "HEAD");
    for (const path of unusual) await write(path, "changed\n");
    await git("mv", "src/old name.ts", "src/new\n이름.ts");
    await rm(join(root, "src/deleted.ts"));
    for (const path of ["new/one.ts", "new/nested/two.ts", ".frontend-system/evidence.md"]) await write(path, "new\n");
    const expected = ["src/order.ts", "src/old name.ts", "src/new\n이름.ts", "src/deleted.ts", "new/one.ts", "new/nested/two.ts", ...unusual].sort();
    assert.deepEqual(await changedFiles(root), expected);
    assert.deepEqual(await changedFiles(root, baseline), expected);
    const stat = await diffStat(root, baseline);
    assert.ok(stat.length > 0);
    assert.equal(stat, stat.trim());

    await git("add", ".");
    await git("commit", "-m", "changes");
    const head = (await git("rev-parse", "HEAD")).stdout.trim();
    assert.equal(await reviewBase(root), `${head}^`);
    assert.equal(await reviewBase(root, baseline), baseline);
    assert.deepEqual(await changedFiles(root), []);
    assert.deepEqual(await changedFiles(root, baseline), expected);
    await assert.rejects(reviewBase(root, "missing-ref"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
