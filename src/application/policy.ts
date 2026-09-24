import * as z from "zod/v4";

export const ruleId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
export const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const layer = z.enum(["domain", "architecture", "framework", "accessibility", "security", "testing"]);
export const localPath = z.string().min(1).refine((path) =>
  !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !path.startsWith(".frontend-system/"),
"Expected a project-relative source path");

export const ruleSchema = z.strictObject({
  id: ruleId, version: z.number().int().positive(), title: z.string().min(1),
  statement: z.string().min(1), layer, obligation: z.enum(["required", "recommended"]),
  conditions: z.array(z.string().min(1)), exclusions: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)).min(1),
  verification: z.enum(["existing-tool", "custom-check", "behavior-test", "review"]),
  examples: z.array(z.object({
    path: z.string().min(1), expectation: z.enum(["pass", "fail", "excluded"]),
    diagnostic: z.string().optional(),
  })),
  validation: z.enum(["proposed", "verified"]), limitations: z.array(z.string()),
});

export const policySchema = z.strictObject({
  version: z.literal(1),
  rules: z.array(ruleSchema),
  checks: z.array(z.strictObject({
    id: ruleId, script: z.string().min(1), command: z.string().min(1),
    ruleIds: z.array(ruleId), guardPaths: z.array(localPath).min(1).optional(),
  })),
  reviews: z.array(z.strictObject({ id: ruleId, ruleIds: z.array(ruleId), description: z.string().min(1) })),
  // Exact hashes protect checker/config/test assets. Changes require a policy update.
  guards: z.array(z.strictObject({ path: localPath, hash: sha256 })),
  exceptions: z.array(z.strictObject({
    id: ruleId, ruleId, files: z.array(localPath).min(1), reason: z.string().min(1),
    risk: z.string().min(1), verification: z.string().min(1),
    resolveByStep: ruleId, reconsiderWhen: z.string().min(1),
  })),
}).superRefine((policy, context) => {
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
