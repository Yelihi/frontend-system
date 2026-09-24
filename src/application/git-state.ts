import { execFile } from "node:child_process";

function git(root: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", ["-C", root, ...args], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

export async function changedFiles(root: string, base?: string): Promise<string[]> {
  const names = new Set<string>();
  if (base) {
    for (const path of (await git(root, ["diff", "--name-only", "--no-renames", "-z", base, "--"])).split("\0").filter(Boolean)) names.add(path);
  }
  const entries = (await git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])).split("\0").filter(Boolean);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    names.add(entry.slice(3));
    // NUL status records put the destination first, followed by the original path.
    if (/[RC]/.test(entry.slice(0, 2))) names.add(entries[++index]!);
  }
  return [...names].filter((path) => path !== ".frontend-system" && !path.startsWith(".frontend-system/")).sort();
}

export async function reviewBase(root: string, requested?: string): Promise<string> {
  if (requested) {
    await git(root, ["rev-parse", "--verify", requested]);
    return requested;
  }
  if (await git(root, ["status", "--porcelain"])) return "HEAD";
  const head = (await git(root, ["rev-parse", "HEAD"])).trim();
  try {
    await git(root, ["rev-parse", "--verify", `${head}^`]);
    return `${head}^`;
  } catch {
    return head;
  }
}

export async function diffStat(root: string, base: string): Promise<string> {
  return (await git(root, ["diff", "--stat", base, "--"])).trim();
}
