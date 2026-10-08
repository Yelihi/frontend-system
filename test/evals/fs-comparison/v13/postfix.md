# Follow-up declared before model calls

Run the same v13 initial/change prompts on the FS arm with the corrected runtime.
Retain the original four calls and their failure/cost records. Do not rerun ordinary
or choose a winning sample. This is a two-call regression check, not an isolated
causal experiment or statistically representative performance estimate.

Observed defects prompting this follow-up:
- English request caused manual translation of Korean renderer output, breaking its hash.
- Missing initial project.md was interpreted as requiring extra authorization even for
  a requested saved FS plan; save_revision failed and only an unbound draft remained.

Runtime changes include native en/ko controls, preserve-export instructions,
first-baseline vs later-manual-refresh clarification, exact flow citation lines and
one source-reviewed Effect investigation migration. Keep all source, user requirements,
model, reasoning, isolation and timeout unchanged. No product/app execution is authorized.

Check native language selection/artifact hash, fresh thread IDs, stale existing consumer,
unapproved plan persistence/diagnostics, semantic boundaries and tokens. Report any new
errors. The old ordinary arm is a historical reference, not a simultaneous paired replicate.
