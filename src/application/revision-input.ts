import * as z from "zod/v4";
import { policyInputSchema } from "./policy.js";
import { issuesSchema } from "./workflow-store.js";
import { designEvidenceSchema, decisionUpdatesSchema } from "./design-evidence.js";

export const revisionPayloadSchema = z.strictObject({
  content: z.string().min(1).optional().describe('Required for a new plan; omit unchanged content on updates.'),
  policy: policyInputSchema.optional(), issues: issuesSchema.optional(), evidence: designEvidenceSchema.optional(),
  decisionUpdates: decisionUpdatesSchema.optional().describe('Patch existing choices by ID; cannot accompany evidence. New selections require supplied confirmation. Include evidenceRoutes for new answer documents.'),
  evidenceRoutes: designEvidenceSchema.shape.routes.optional().describe('Fresh working contextIds with explicit judgments; cannot accompany full evidence. Include sources still cited by retained decisions.'),
});
