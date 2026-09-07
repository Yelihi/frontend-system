import { execFile } from "node:child_process";

function git(root: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", ["-C", root, ...args], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout.trim());
    });
  });
}

export async function changedFiles(root: string, base?: string): Promise<string[]> {
  const names = new Set<string>();
  if (base) {
    for (const path of (await git(root, ["diff", "--name-only", base, "--"])).split("\n").filter(Boolean)) names.add(path);
  }
  for (const line of (await git(root, ["status", "--porcelain"])).split("\n").filter(Boolean)) {
    const path = line.slice(3).split(" -> ").at(-1);
    if (path) names.add(path);
  }
  return [...names].filter((path) => !path.startsWith(".frontend-system/")).sort();
}

export async function reviewBase(root: string, requested?: string): Promise<string> {
  if (requested) {
    await git(root, ["rev-parse", "--verify", requested]);
    return requested;
  }
  if (await git(root, ["status", "--porcelain"])) return "HEAD";
  const head = await git(root, ["rev-parse", "HEAD"]);
  try {
    await git(root, ["rev-parse", "--verify", `${head}^`]);
    return `${head}^`;
  } catch {
    return head;
  }
}
