import * as z from 'zod/v4';
import {projectEvidenceInputSchema} from './design-evidence.js';

export const projectAnalysisSchema = z.object({
  evidence: projectEvidenceInputSchema.optional(), summary: z.string(),
  domains: z.array(z.string()).default([]), events: z.array(z.string()).default([]),
  state: z.array(z.string()).default([]), styles: z.array(z.string()).default([]), tests: z.array(z.string()).default([]),
  observed: z.array(z.string()).default([]), architecture: z.array(z.string()).default([]),
  conventions: z.array(z.string()).default([]), decisions: z.array(z.string()).default([]),
  qualityGates: z.array(z.string()).default([]), assumptions: z.array(z.string()).default([]),
  questions: z.array(z.object({id:z.string(),question:z.string(),reason:z.string()})).default([]),
});
export const projectContextPayloadSchema = z.strictObject({analysis: projectAnalysisSchema});
