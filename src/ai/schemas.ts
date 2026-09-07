import { z } from "zod";

export const inspectionSchema = z.object({
  summary: z.string(),
  observed: z.array(z.string()),
  architecture: z.array(z.string()),
  conventions: z.array(z.string()),
  decisions: z.array(z.string()),
  qualityGates: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    reason: z.string(),
  })),
});

export const reviewSchema = z.object({
  summary: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  applicableDimensions: z.array(z.string()),
  findings: z.array(z.object({
    id: z.string(),
    severity: z.enum(["blocker", "warning", "note"]),
    dimension: z.string(),
    title: z.string(),
    evidence: z.array(z.string()),
    proposal: z.string(),
    requiresDecision: z.boolean(),
  })),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    reason: z.string(),
  })),
  tests: z.array(z.object({
    kind: z.enum(["unit", "integration", "e2e", "storybook", "security"]),
    reason: z.string(),
    target: z.string(),
  })),
});

