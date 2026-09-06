import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import type {
  EngineeringRule,
  KnowledgeGap,
  KnowledgeReference,
  ProjectProfile,
  WorkRequest,
} from "../../domain/types.js";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

function technologyDomain(value: string): string {
  return slug(value.replace(/\.js$/i, "js"));
}

async function ruleFiles(root: string, domains: Set<string>): Promise<string[]> {
  const files: string[] = [];
  for (const domain of domains) {
    const directory = join(root, domain);
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".md")) files.push(join(directory, entry.name));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return files.sort();
}

async function mandatoryRules(root: string, profile: ProjectProfile): Promise<EngineeringRule[]> {
  const technologyDomains = profile.technologies.map((technology) => technologyDomain(technology.name));
  const domains = new Set(["common", ...technologyDomains]);
  const rules: EngineeringRule[] = [];
  for (const path of await ruleFiles(root, domains)) {
    const content = await readFile(path, "utf8");
    const domain = relative(root, path).split("/")[0] ?? "common";
    const sections = content.split(/^##\s+/m).slice(1);
    for (const section of sections) {
      const [heading = "", ...body] = section.split("\n");
      const title = heading.trim();
      const description = body.join("\n").trim();
      if (!title || !description) continue;
      rules.push({
        id: `mandatory:${domain}:${slug(title)}`,
        title,
        description,
        source: "mandatory",
        priority: 2,
        appliesTo: [domain],
        evidence: [path],
        mandatory: true,
      });
    }
  }
  return rules;
}

export class RuleResolver {
  constructor(private readonly mandatoryRoot: string) {}

  async resolve(
    profile: ProjectProfile,
    request: WorkRequest,
    knowledge: KnowledgeReference[],
    gaps: KnowledgeGap[],
  ): Promise<EngineeringRule[]> {
    const candidates: EngineeringRule[] = [
      ...request.constraints.map((constraint) => ({
        id: `user:${slug(constraint)}`,
        title: constraint,
        description: constraint,
        source: "user" as const,
        priority: 0,
        appliesTo: ["all"],
        mandatory: true,
      })),
      ...knowledge.map((reference) => ({
        id: reference.id,
        title: reference.title,
        description: reference.summary,
        source: "knowledge" as const,
        priority: 1,
        appliesTo: reference.domains,
        evidence: [reference.path],
        mandatory: true,
      })),
      ...(await mandatoryRules(this.mandatoryRoot, profile)),
      ...profile.constraints.map((constraint) => ({
        id: `project-rule:${constraint.id}`,
        title: constraint.description,
        description: constraint.description,
        source: "project" as const,
        priority: 3,
        appliesTo: ["all"],
        evidence: constraint.evidence,
        mandatory: true,
      })),
      ...gaps.map((gap) => ({
        id: `model-fallback:${gap.domain}`,
        title: `Apply model ${gap.domain} review`,
        description: `No applicable user knowledge was found for ${gap.domain}; use current engineering knowledge and record reusable findings as candidates.`,
        source: "model" as const,
        priority: 4,
        appliesTo: [gap.domain],
        mandatory: gap.domain === "security",
      })),
      ...profile.conventions.map((convention) => ({
        id: `convention:${convention.id}`,
        title: convention.description,
        description: convention.description,
        source: "project" as const,
        priority: 5,
        appliesTo: ["project"],
        evidence: convention.evidence,
        mandatory: false,
      })),
    ];

    const resolved = new Map<string, EngineeringRule>();
    for (const rule of candidates.sort((a, b) => a.priority - b.priority)) {
      const conflictKey = slug(rule.title);
      if (!resolved.has(conflictKey)) resolved.set(conflictKey, rule);
    }
    return [...resolved.values()];
  }
}
