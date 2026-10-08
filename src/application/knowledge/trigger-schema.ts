import * as z from "zod/v4";
import { investigationAssessmentSchema } from "./investigation.js";

const text = z.string().trim().min(1).max(600);
export const interpretationSchema = z.object({
  path: text, line: z.number().int().positive(), column: z.number().int().positive().default(1), evidence: text,
  signal: text, interpretation: text,
});
export const triggerInspectionSchema = z.object({
  includeRelations: z.boolean().optional().describe("Return up to 200 function/call/argument/dispatch facts for scoped investigation; omitted by default."),
  files: z.array(text).min(1).max(40),
  technologies: z.array(text).max(15).default([]),
  interpretations: z.array(interpretationSchema).max(40).default([]),
  snapshot: z.object({ baseRef: text, expectedCommit: text }).optional(),
});
export const checkJudgmentSchema = z.object({
  investigation: investigationAssessmentSchema.optional(),
  itemId: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["apply", "keep", "not-applicable", "needs-context", "needs-decision"]),
  rationale: text, evidence: text,
  evidenceLine: z.number().int().positive().optional(),
  verification: z.object({ kind: z.enum(["none", "static", "test", "browser", "profiler"]), reason: text }),
});


export const triggerDiscoverySchema = z.object({
  query: z.string().max(600).default(""), technologies: z.array(text).max(15).default([]),
  domains: z.array(text).max(15).default([]),
  offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(20).default(10),
  expectedHash: z.string().optional(),
});
