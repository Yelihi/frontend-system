import * as z from "zod/v4";

export const ruleId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
// Policy keys are semantic IDs, never filesystem record names.
const policyId = z.string().regex(/^[\p{L}\p{N}][\p{L}\p{N}:._-]{0,239}$/u);
export const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const layer = z.enum(["domain", "architecture", "framework", "accessibility", "security", "testing"]);
export const localPath = z.string().min(1).refine((path) =>
  !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !path.startsWith(".frontend-system/"),
"Expected a project-relative source path");

export const ruleSchema = z.strictObject({
  id: policyId, version: z.number().int().positive(), title: z.string().min(1),
  statement: z.string().min(1), layer, obligation: z.enum(["required", "recommended"]),
  conditions: z.array(z.string().min(1)), exclusions: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)).min(1),
  verification: z.enum(["existing-tool", "custom-check", "behavior-test", "review"]).describe('Select exactly one method. To require both tests and semantic review, use behavior-test here and link the same ruleId in checks AND reviews. Never concatenate enum values.'),
  examples: z.array(z.object({
    path: z.string().min(1), expectation: z.enum(["pass", "fail", "excluded"]),
    diagnostic: z.string().optional(),
  })),
  validation: z.enum(["proposed", "verified"]), limitations: z.array(z.string()),
});

const policyObject = z.strictObject({
  version: z.literal(1),
  rules: z.array(ruleSchema),
  checks: z.array(z.strictObject({
    id: policyId, script: z.string().min(1).describe('Package script key; when command is omitted the script must already exist. Do not assume test/lint/build exists. Inspect capabilities and keep pending verification setup explicit; never claim a planned check already exists or passed.'), command: z.string().min(1).describe('Exact package.json scripts[script] body, not the command invoking that script. For script test, supply an actual runner body such as node --test; npm test would invoke itself recursively.'),
    ruleIds: z.array(policyId), guardPaths: z.array(localPath).min(1).optional(),
  })),
  reviews: z.array(z.strictObject({ id: policyId, ruleIds: z.array(policyId), description: z.string().min(1) })),
  // Exact hashes protect checker/config/test assets. Changes require a policy update.
  guards: z.array(z.strictObject({ path: localPath, hash: sha256 })),
  exceptions: z.array(z.strictObject({
    id: policyId, ruleId: policyId, files: z.array(localPath).min(1), reason: z.string().min(1),
    risk: z.string().min(1), verification: z.string().min(1),
    resolveByStep: ruleId, reconsiderWhen: z.string().min(1),
  })),
});

export const policyInputSchema = policyObject.extend({
  version: z.literal(1).default(1),
  rules: z.array(ruleSchema.extend({version: z.number().int().positive().default(1),
    conditions: ruleSchema.shape.conditions.default([]), exclusions: ruleSchema.shape.exclusions.default([]),
    examples: ruleSchema.shape.examples.default([]), limitations: ruleSchema.shape.limitations.default([]),
    validation: ruleSchema.shape.validation.default('proposed'),
    evidence: ruleSchema.shape.evidence.optional().describe('Legacy text evidence; omit to derive provenance from linked decisions. Open decisions may be saved but block approval. Code citations belong only in evidence.decisions[].evidence.'),
  })),
  checks: z.array(policyObject.shape.checks.element.extend({ command: policyObject.shape.checks.element.shape.command.optional(),
    guardPaths: z.array(localPath).min(1).optional().describe('Existing verification assets to protect. save_revision pins their current hashes; no need to duplicate these paths in guards. Do not pin a file whose edit this plan authorizes; retain appropriate review/other protected checks for that transition.'),
  })),
  guards: z.array(policyObject.shape.guards.element.extend({ hash: sha256.optional() })).default([]),
  reviews: policyObject.shape.reviews.default([]), exceptions: policyObject.shape.exceptions.default([]),
});
export type PolicyInput = z.input<typeof policyInputSchema>;

export const policySchema = policyObject.superRefine((policy, context) => {
  for (const group of [policy.rules, policy.checks, policy.reviews, policy.exceptions]) {
    if (new Set(group.map(({ id }) => id)).size !== group.length) context.addIssue({ code: "custom", message: "Duplicate policy IDs" });
  }
  const ids = new Set(policy.rules.map(({ id }) => id));
  for (const check of policy.checks) {
    if (check.guardPaths?.some((path) => !policy.guards.some((guard) => guard.path === path))) {
      context.addIssue({ code: "custom", message: `Check references an unpinned verification asset: ${check.id}` });
    }
  }
  for (const item of [...policy.checks, ...policy.reviews]) {
    if (item.ruleIds.some((id) => !ids.has(id))) context.addIssue({ code: "custom", message: "Unknown policy rule" });
  }
  for (const exception of policy.exceptions) {
    if (!ids.has(exception.ruleId)) context.addIssue({ code: "custom", message: "Unknown exception rule" });
    if (!policy.reviews.some((review) => review.ruleIds.includes(exception.ruleId))) context.addIssue({ code: "custom", message: "Migration exception requires a resolution review" });
  }
  for (const rule of policy.rules.filter((rule) => rule.obligation === "required")) {
    if (![...policy.checks, ...policy.reviews].some((item) => item.ruleIds.includes(rule.id))) {
      context.addIssue({ code: "custom", message: `Required rule has no evidence requirement: ${rule.id}` });
    }
  }
});
export type VerificationPolicy = z.infer<typeof policySchema>;

export function requiredScripts(policy: VerificationPolicy): string[] {
  return [...new Set(policy.checks.map(({ script }) => script))];
}

// Keep older policies readable so the host can repair them; enforce on approval and use.
export function policyProtectionFailures(policy: VerificationPolicy): string[] {
  const failures = new Set(policy.guards.map(({ path }) => path)).size !== policy.guards.length ? ["Duplicate guard paths"] : [];
  for (const check of policy.checks) {
    // Catch the observed direct npm self-call. This is not a shell parser or a
    // proof against indirect cycles, wrappers, workspace calls or other runners.
    const invocation = check.command.trim().match(/^npm\s+(?:(run|run-script)\s+)?([a-zA-Z0-9:._-]+)$/);
    if (invocation?.[2] === check.script && (invocation[1] || ['test', 'start', 'stop', 'restart'].includes(check.script)))
      failures.push(`Check ${check.id} recursively invokes its own script ${check.script}; command must be the package script body, not npm's invocation.`);
  }
  return failures.concat(policy.rules.filter((rule) => rule.obligation === "required").flatMap((rule) => {
    const checks = policy.checks.filter((check) => check.ruleIds.includes(rule.id));
    const reviewed = policy.reviews.some((review) => review.ruleIds.includes(rule.id));
    if (rule.verification === "review") return reviewed ? [] : [`Required rule needs semantic review: ${rule.id}`];
    if (!checks.length) return [`Required rule needs an automated check: ${rule.id}`];
    return checks.filter((check) => !reviewed && !check.guardPaths?.length)
      .map((check) => `Required check needs guardPaths or semantic review for rule ${rule.id}: ${check.id}`);
  }));
}

export function policyFailures(policy: VerificationPolicy, scripts: Record<string, string>, files: Record<string, string>): string[] {
  return [
    ...policyProtectionFailures(policy),
    ...policy.checks.filter((check) => scripts[check.script] !== check.command)
      .map((check) => `Missing or changed required script: ${check.script}`),
    ...policy.guards.filter((guard) => files[guard.path] !== guard.hash)
      .map((guard) => `Protected verification asset changed: ${guard.path}`),
  ];
}
