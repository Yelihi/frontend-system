# v9 preregistered planning / knowledge-influence pilot

The hypothesis is that collected conditional knowledge improves code-grounded
questions and scoped decisions, and that sync/routing makes that knowledge usable.
Superiority is not a stopping condition. No implementation is requested or graded.

Eight independent journeys: two fixture variants (shared identity / independent
identities) × ordinary, raw-K1, fs-K0, fs-K1. One gpt-6-sol replicate per cell,
medium reasoning, 600 seconds per turn, at most two simultaneous model calls.
Each journey: fresh isolated context → inspection and free questions → supplied
answers to the questions actually asked → unapproved plan. No repair turns.
Same source files, request, output format, budget and answer policy for paired arms.
The raw-K1 and fs-K1 bodies are byte-identical authored notes. K0 has an empty
learned index. Ordinary has no extra corpus. FS has current production skills/MCP.
This separates observed information gain (raw/ordinary), workflow gain (FS-K1/raw)
and knowledge addition within FS (K1/K0), without asserting single-run causality.
The general evidence note is part of every common fixture README.

Questions are free-form, at most six material questions, no predefined topics in
the generator prompt. The coordinator reads completed questions and selects only
matching entries from the frozen answers.json. Each mapping includes rationale;
unmatched choices get the exact unknown response. No unsolicited bank answers.
This is transparent scripted interaction, not evidence of human UX quality. Combined
questions may receive multiple matching answers. Resolved code facts need no user
question. Asking everything is not a success criterion.

All arms produce questions.json and plan.md. Each question has id, question,
evidence [{path,quote}], options [{id,description,cost}]. The final plan explains
scope, obligations vs discretion/open choices, ownership/interfaces, decision
rationales and verification. FS additionally uses actual project/route/revision
records. Extra FS record cost is counted. No plan approval or product edits.

No hidden architecture is the unique answer. Freeze these review dimensions:
1. Grounding: specific correct observations with code evidence; record false claims.
2. Material questions: discovers unresolved identity replacement semantics, auth
   incident ownership and read ordering/lifetime when not already settled. Mutation
   retry questions only needed if proposing changed retry behavior. Do not reward
   redundant code-answerable questions or force irrelevant categories.
3. Tradeoffs: viable choices with costs, existing structure/stateless reuse where
   appropriate; no compulsory singleton, library, or epoch on every replacement.
4. Contract precision: chosen behavior has owner, boundary, permitted change and
   concrete test/example. Count independently verifiable commitments, not prose.
5. Answer fidelity: no decision contrary to supplied answers, inferred approval or
   fabricated host behavior; unknown decisions remain visibly unresolved.
6. Knowledge calibration: meaningful condition/exclusion use in the actual question
   or plan, including independent identity and same-value-refresh exclusions.

Mechanical checks: source immutability, question quote existence, artifact presence,
complete usage/thread accounting, source/reference hashes, review/sync validation,
MCP candidate/read/save records. These do NOT grade semantic plan quality.
A blind reviewer receives anonymized question/answer/plan packets, source, request,
and this rubric. It must cite exact text for each finding; coordinator verifies
quotes and conclusions against sources. No aggregate quality score or automatic
winner. Report opportunity-level counts, explicit weaknesses and changed decisions.
Model judging is a fallible secondary observation, not an architecture oracle.
Authored calibration packets (sound scoped choice vs forced conflicting singleton)
check that reviewer rejects obvious violations before evaluating actual outputs.

Input files/runtime/runner are hashed before calls; originals, failures, timing and
usage are retained. Baseline cannot read skills, hidden answers, graders or results.
No model-produced scripts/tests are executed by the host. All sessions use existing
permission/Git/MCP isolation checks; network and personal skills/config disabled.
Total tokens and uncached-input+output are separate; evaluator cost is separate.
Small synthetic corpus, one model and one replicate limit generalization. Different
future knowledge can change results. K1 matches the domain deliberately; this is
not a held-out general effectiveness claim or evidence of production token savings.
