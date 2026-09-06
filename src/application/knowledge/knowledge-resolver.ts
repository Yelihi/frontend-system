import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";

import type {
  KnowledgeGap,
  KnowledgeReference,
  ProjectProfile,
  WorkRequest,
} from "../../domain/types.js";

const ignoredWords = new Set(["the", "and", "for", "with", "this", "that", "현재", "기능", "분석", "개선"]);

export function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1 && !ignoredWords.has(word)))];
}

async function markdownFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") found.push(path);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  };
  await visit(root);
  return found.sort();
}

function domainName(value: string): string {
  return value.toLowerCase().replace(/\.js$/, "js").replace(/[^a-z0-9]+/g, "-");
}

export class KnowledgeResolver {
  constructor(private readonly root: string) {}

  async resolve(
    profile: ProjectProfile,
    request: WorkRequest,
  ): Promise<{ applicable: KnowledgeReference[]; gaps: KnowledgeGap[] }> {
    const queryTerms = new Set([
      ...terms(request.raw),
      ...profile.technologies.flatMap((technology) => terms(technology.name)),
    ]);
    const applicable: Array<KnowledgeReference & { score: number }> = [];

    for (const path of await markdownFiles(this.root)) {
      const content = await readFile(path, "utf8");
      const relativePath = relative(this.root, path);
      const haystack = `${relativePath}\n${content}`.toLowerCase();
      const score = [...queryTerms].filter((term) => haystack.includes(term)).length;
      if (!score) continue;
      const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? basename(path, ".md");
      const summary = content
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/^#+\s+.*$/gm, "").trim())
        .find(Boolean) ?? title;
      applicable.push({
        id: `knowledge:${relativePath.replace(/\.md$/, "")}`,
        path,
        title,
        summary,
        domains: relativePath.split("/").slice(0, -1).map(domainName),
        score,
      });
    }

    const selected = applicable.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 12);
    const coveredDomains = new Set(selected.flatMap((item) => item.domains));
    const requiredDomains = new Set([
      "security",
      "accessibility",
      "testing",
      ...profile.technologies
        .filter((technology) => technology.category !== "test-tool")
        .map((technology) => domainName(technology.name)),
    ]);

    return {
      applicable: selected.map(({ score: _score, ...reference }) => reference),
      gaps: [...requiredDomains]
        .filter((domain) => !coveredDomains.has(domain))
        .map((domain) => ({ domain, status: "missing-user-knowledge", fallbackRequired: true })),
    };
  }
}
