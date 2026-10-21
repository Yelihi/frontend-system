import { createRequire as __fsCreateRequire } from 'node:module'; import { fileURLToPath as __fsFileURLToPath } from 'node:url'; import { dirname as __fsDirname } from 'node:path'; const require = __fsCreateRequire(import.meta.url); const __filename = __fsFileURLToPath(import.meta.url); const __dirname = __fsDirname(__filename);

// src/application/flow-contracts.ts
function validateStructuredFlow(flow) {
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const edges = new Set(flow.edges.map((edge) => edge.id));
  const scenarios = new Set(flow.scenarios.map((scenario) => scenario.id));
  const cases = new Set(flow.testCases?.map((item) => item.id));
  const pages = new Map(flow.pages?.map((page) => [page.node, page]));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  for (const [name, ids] of Object.entries({
    pages: flow.pages?.map((p) => p.node),
    navigation: flow.navigation?.map((n) => n.id),
    knowledge: flow.knowledge?.map((k) => k.id),
    testCases: flow.testCases?.map((c) => c.id),
    checks: flow.checks?.map((c) => c.id)
  })) {
    assert(!ids || new Set(ids).size === ids.length, `Duplicate structured flow ${name}`);
  }
  assert(flow.basis === "proposed" || !flow.designState, "Observed flows cannot declare design readiness");
  for (const node of flow.nodes) {
    if (flow.pages) assert(new Set(node.contracts?.map((c) => c.name)).size === (node.contracts?.length ?? 0), "Contract names must be unique within a node");
    if (flow.designState === "ready" && node.contracts?.length) assert(node.architecture, "Ready contract needs its layer, runtime and responsibility");
  }
  for (const page of flow.pages ?? []) {
    assert(nodes.get(page.node)?.kind === "page", "Unknown page node");
    assert(new Set(page.scenes.map((scene) => scene.id)).size === page.scenes.length, "Duplicate page scene");
    for (const scene of page.scenes) for (const block of scene.blocks ?? []) {
      let owner = nodes.get(block.node);
      const seen = /* @__PURE__ */ new Set();
      while (owner?.parent && !seen.has(owner.id)) {
        seen.add(owner.id);
        owner = nodes.get(owner.parent);
      }
      assert(owner?.id === page.node, "Wireframe block must belong to its page");
      assert(flow.basis === "proposed", "Observed screens require captures, not proposed wireframe blocks");
    }
  }
  for (const edge of flow.navigation ?? []) {
    assert(pages.has(edge.from) && pages.has(edge.to), "Unknown navigation page");
    assert(edge.evidence.every((id) => flow.evidence[id]), "Unknown navigation evidence");
    assert(flow.basis !== "observed" || edge.evidence.length, "Observed navigation requires evidence");
  }
  for (const scenario of flow.scenarios) for (const step of scenario.steps) {
    assert(!flow.pages || step.views?.length, "Structured page flows require explicit step views");
    assert(new Set(step.views?.map((view) => view.page)).size === (step.views?.length ?? 0), "Duplicate step page view");
    for (const view of step.views ?? []) assert(pages.get(view.page)?.scenes.some((scene) => scene.id === view.scene), "Unknown step page/scene");
    for (const change of step.changes ?? []) {
      assert(nodes.has(change.ownerNode), "Unknown state change owner");
      assert(flow.basis !== "observed" || change.basis !== "proposed", "Observed state change cannot be proposed");
      assert(flow.basis !== "proposed" || change.basis === "proposed", "Proposed state changes cannot claim measurements");
    }
  }
  for (const item of flow.testCases ?? []) assert(scenarios.has(item.scenarioId), "Unknown test scenario");
  for (const item of flow.checks ?? []) {
    assert(item.nodes.every((id) => nodes.has(id)) && item.scenarios.every((id) => scenarios.has(id)), "Unknown check target");
    assert(item.nodes.length + item.scenarios.length > 0, "Check needs a scoped target");
    assert(item.testCaseIds.every((id) => cases.has(id)), "Unknown check test case");
  }
  for (const item of flow.knowledge ?? []) {
    assert(item.nodes.length + item.edges.length + item.scenarios.length > 0, "Knowledge judgment needs a scoped target");
    assert(item.nodes.every((id) => nodes.has(id)) && item.edges.every((id) => edges.has(id)) && item.scenarios.every((id) => scenarios.has(id)), "Unknown knowledge target");
    assert(item.evidence.every((id) => flow.evidence[id]), "Unknown knowledge evidence");
  }
  if (flow.designState === "ready") {
    assert(flow.pages?.length && flow.scenarios.length, "Ready design needs pages and scenarios");
    assert(flow.scenarios.every((s) => flow.testCases?.some((c) => c.scenarioId === s.id)), "Ready design needs test intent for every scenario");
    assert(flow.knowledge?.every((k) => !k.judgment.startsWith("needs-")) ?? true, "Ready design has pending knowledge judgments");
  }
}
function validateFlowPlan(flow, evidence, issues) {
  const ref = evidence.analysisRefs?.find((r) => r.kind === "flow" && r.id === flow.id);
  if (!ref) throw new Error("Implementation flow must be pinned in the plan");
  const linked = issues.filter((issue) => ref.issueIds.includes(issue.id));
  if (flow.basis === "observed" && !linked.some((issue) => issue.implementationTargets?.some((t) => t.flowTarget?.flowId === flow.id))) return;
  if (flow.basis === "proposed" && flow.pages && flow.designState !== "ready") throw new Error("Structured design must be ready before plan binding");
  for (const item of flow.knowledge ?? []) {
    if (evidence.referenceHashes[item.referenceId] !== item.referenceHash) throw new Error(`Flow knowledge version differs from plan: ${item.referenceId}`);
    if (!evidence.routes.some((route) => route.judgments.some((j) => j.referenceId === item.referenceId && j.decision === item.judgment))) throw new Error(`Flow judgment differs from plan: ${item.id}`);
    if (item.judgment === "apply" && !evidence.decisions.some((d) => d.id === item.decisionId && d.status === "resolved" && d.knowledgeIds.includes(item.referenceId) && linked.some((issue) => d.issueIds.includes(issue.id)))) throw new Error(`Flow knowledge lacks a resolved decision: ${item.id}`);
  }
  for (const issue of linked) for (const target of issue.implementationTargets ?? []) {
    const link = target.flowTarget;
    if (link?.flowId !== flow.id) continue;
    const contract = flow.nodes.find((n) => n.id === link.nodeId)?.contracts?.find((c) => c.name === link.contractName);
    if (!contract || !target.files.includes(contract.path)) throw new Error(`Unknown implementation flow contract: ${target.target}`);
    const relevant = (k) => k.nodes.includes(link.nodeId) || flow.edges.some((e) => (e.from === link.nodeId || e.to === link.nodeId) && (k.edges.includes(e.id) || flow.scenarios.some((s) => k.scenarios.includes(s.id) && s.steps.some((step) => step.edge === e.id))));
    for (const judgment of flow.knowledge?.filter((k) => k.judgment === "apply" && relevant(k)) ?? []) {
      if (!target.knowledgeIds.includes(judgment.referenceId)) throw new Error(`Implementation target omits flow judgment: ${target.target}/${judgment.id}`);
    }
  }
  if (flow.basis === "proposed" && flow.pages) for (const node of flow.nodes) for (const contract of node.contracts ?? []) {
    if (!linked.some((issue) => issue.implementationTargets?.some((t) => t.flowTarget?.flowId === flow.id && t.flowTarget.nodeId === node.id && t.flowTarget.contractName === contract.name)))
      throw new Error(`Planned flow contract lacks implementation target: ${node.id}/${contract.name}`);
  }
  for (const expected of flow.testCases ?? []) {
    const actual = linked.flatMap((issue) => issue.testCases ?? []).find((c) => c.id === expected.id && c.flowId === flow.id && c.scenarioId === expected.scenarioId);
    if (!actual || ["given", "when", "then", "method"].some((key) => actual[key] !== expected[key])) throw new Error(`Plan test differs from flow contract: ${expected.id}`);
  }
}

export {
  validateStructuredFlow,
  validateFlowPlan
};
