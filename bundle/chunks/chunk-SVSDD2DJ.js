import { createRequire as __fsCreateRequire } from 'node:module'; import { fileURLToPath as __fsFileURLToPath } from 'node:url'; import { dirname as __fsDirname } from 'node:path'; const require = __fsCreateRequire(import.meta.url); const __filename = __fsFileURLToPath(import.meta.url); const __dirname = __fsDirname(__filename);

// src/application/flow-review.ts
function validateFlowReview(flow) {
  const r = flow.review;
  if (!r) return;
  const assert = (value, message) => {
    if (!value) throw new Error("Flow review: " + message);
  };
  const unique = (items, kind) => assert(new Set(items.map((i) => i.id)).size === items.length, "duplicate " + kind);
  const nodes = new Map(flow.nodes.map((n) => [n.id, n])), edges = new Map(flow.edges.map((e) => [e.id, e]));
  const rules = new Set(flow.invariants.map((i) => i.id)), tests = new Set(flow.testCases?.map((t) => t.id));
  const contracts = new Map(r.contracts.map((c) => [c.id, c])), fields = new Map(r.fields.map((f) => [f.id, f]));
  const scenes = new Set(flow.pages?.flatMap((p) => p.scenes.map((s) => s.id)));
  const steps = flow.scenarios.flatMap((s) => s.steps.map((t) => t.review).filter((t) => t !== void 0));
  const stepIds = new Set(steps.map((s) => s.id));
  assert(flow.pages?.length, "pages required");
  assert(flow.scenarios.length && (flow.testCases?.length ?? 0) > 0, "review requires scenarios and test plans");
  assert(scenes.size === flow.pages.flatMap((p) => p.scenes).length, "review scene IDs must be unique across pages");
  for (const [kind, items] of [["contract", r.contracts], ["field", r.fields], ["edit", r.edits], ["step", steps]]) unique(items, kind);
  assert(new Set(r.screens.map((s) => s.sceneId)).size === r.screens.length, "duplicate review scene");
  const refs = (ids, set, kind) => {
    assert(new Set(ids).size === ids.length, "duplicate " + kind + " refs");
    assert(ids.every((id) => set.has(id)), "unknown " + kind + " reference");
  };
  const evidence = (ids) => refs(ids, new Set(Object.keys(flow.evidence)), "evidence");
  for (const c of r.contracts) {
    refs(c.nodeIds, nodes, "contract node");
    evidence(c.evidence);
    assert(flow.basis !== "observed" || c.evidence.length, "observed contract needs evidence");
  }
  for (const field of r.fields) {
    assert(nodes.has(field.ownerNodeId), "unknown field owner");
    evidence(field.evidence);
    assert(flow.basis !== "observed" || field.evidence.length, "observed field needs evidence");
  }
  for (const n of flow.nodes) {
    assert(n.review, "missing node change classification");
    refs(n.review.contractIds, contracts, "node contract");
    assert(n.review.contractIds.every((id) => contracts.get(id).nodeIds.includes(n.id)), "contract owner mismatch");
  }
  for (const c of r.contracts) assert(c.nodeIds.every((id) => nodes.get(id)?.review?.contractIds.includes(c.id)), "contract node link mismatch");
  const cards = flow.nodes.flatMap((n) => n.review?.flowCard ? [n.review.flowCard.order] : []);
  assert(new Set(cards).size === cards.length, "duplicate flow card order");
  for (const scene of r.screens) {
    assert(scenes.has(scene.sceneId), "unknown screen scene");
    unique(scene.blocks, "screen block");
    for (const b of scene.blocks) {
      assert(nodes.has(b.nodeId), "unknown screen owner");
      let owner = nodes.get(b.nodeId);
      const seen = /* @__PURE__ */ new Set();
      while (owner?.parent && !seen.has(owner.id)) {
        seen.add(owner.id);
        owner = nodes.get(owner.parent);
      }
      assert(!["page", "component"].includes(nodes.get(b.nodeId).kind) || flow.pages.some((p) => p.node === owner?.id && p.scenes.some((s) => s.id === scene.sceneId)), "screen block belongs to another page");
      assert(!b.editId || r.edits.some((e) => e.id === b.editId && e.nodeIds.includes(b.nodeId)), "unknown screen edit or owner");
    }
  }
  for (const scenario of flow.scenarios) {
    assert(scenario.steps.every((s) => s.review), "every review step requires metadata");
    for (const s of scenario.steps) {
      const step = s.review;
      refs(step.edgeIds, edges, "ordered edge");
      assert(step.edgeIds[0] === s.edge, "primary edge differs from ordered calls");
      refs(step.ruleIds, rules, "step rule");
      refs(step.testIds, tests, "step test");
      assert(s.views?.every((v) => r.screens.some((screen) => screen.sceneId === v.scene)), "step screen missing");
      refs(step.changes.map((c) => c.fieldId), fields, "changed field");
      for (const c of step.changes) {
        assert(flow.basis === "proposed" ? c.basis === "proposed" : c.basis !== "proposed", "state basis mismatch");
        assert(JSON.stringify(c.before) === JSON.stringify(c.after) === (c.changeKind === "preserved"), "ambiguous changeKind");
      }
    }
  }
  refs(r.dependencyEdgeIds, edges, "dependency edge");
  for (const id of r.dependencyEdgeIds) {
    const e = edges.get(id);
    assert(nodes.get(e.from)?.review?.graph && nodes.get(e.to)?.review?.graph, "dependency endpoint has no placement");
  }
  for (const rule of flow.invariants) {
    assert(rule.review, "rule metadata missing");
    refs(rule.review.nodeIds, nodes, "rule node");
    refs(rule.review.testIds, tests, "rule test");
  }
  for (const t of flow.testCases ?? []) {
    assert(t.review, "test details missing");
    refs(t.review.ruleIds, rules, "test rule");
    refs(t.review.nodeIds, nodes, "test node");
    refs(t.review.stepIds, stepIds, "test step");
    assert(t.review.stepIds.every((id) => flow.scenarios.find((s) => s.id === t.scenarioId)?.steps.some((s) => s.review?.id === id && s.review.testIds.includes(t.id))), "test step link mismatch");
  }
  for (const step of steps) assert(step.testIds.every((id) => flow.testCases?.find((t) => t.id === id)?.review?.stepIds.includes(step.id)), "step test link mismatch");
  for (const edit of r.edits) {
    refs(edit.nodeIds, nodes, "edit node");
    refs(edit.contractIds, contracts, "edit contract");
    refs(edit.testIds, tests, "edit test");
    refs(edit.ruleIds, rules, "edit rule");
    assert(edit.initial.length <= edit.maxLength && edit.existing.length <= edit.maxLength, "edit exceeds length");
    if (edit.signatureToken) assert(edit.contractIds.every((id) => contracts.get(id).signature.includes(edit.signatureToken)), "signature token absent");
  }
}
function projectReviewView(flow, flowHash) {
  validateFlowReview(flow);
  const r = flow.review;
  const scenarios = flow.scenarios.map((s) => ({ id: s.id, title: s.title, steps: s.steps.map((step) => ({ ...step.review, scene: step.views[0].scene, links: step.review.edgeIds.map((id) => flow.edges.find((e) => e.id === id)) })) }));
  return {
    ...r,
    flowHash,
    flowId: flow.id,
    title: flow.title,
    basis: flow.basis,
    summary: flow.summary,
    limitations: flow.limitations,
    nodes: flow.nodes,
    evidence: flow.evidence,
    scenarios,
    rules: flow.invariants.map((i) => ({ id: i.id, statement: i.statement, ...i.review })),
    tests: (flow.testCases ?? []).map((t) => ({ id: t.id, given: t.given.split("\n"), when: t.when.split("\n"), then: t.then.split("\n"), ...t.review })),
    dependencies: r.dependencyEdgeIds.map((id) => flow.edges.find((e) => e.id === id)),
    sourceIds: Object.fromEntries(flow.nodes.map((n) => [n.id, "v" + Buffer.from(n.id).toString("hex")]))
  };
}

// src/application/flow-contracts.ts
function validateStructuredFlow(flow) {
  validateFlowReview(flow);
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
  projectReviewView,
  validateStructuredFlow,
  validateFlowPlan
};
