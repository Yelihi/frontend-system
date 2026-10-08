# Environment recovery, declared before replacement generation

The original shared/fs-K1 plan turn failed with `Selected model is at capacity`,
exit 1, zero completed turns and unavailable usage. It did not produce plan.md.
Keep that attempt and its completed question-turn cost in the all-attempt ledger.
Do not count it as an FS semantic failure or an eligible completed plan.

Repeat this one entire journey from an empty conversation and byte-identical
initial code/runtime, using the same model, 600-second stage budget, frozen
questions/plan prompts and fixed answer bank. No previous model artifacts or
feedback are copied. Selection is the first complete environmental run, not a
higher-quality answer; no semantic repairs or source/prompt tuning. Report the
complete replacement separately from the original first-attempt result and disclose
that timing/provider conditions differ. One full recovery is attempted in this pilot.

The secondary reviewer's sound calibration also hit provider capacity. Its failed
attempt has unknown usage and is retained. Review retries do not count as generator
performance. Calibration packets are authored diagnostic examples with descriptive
IDs, not evidence of blind evaluator accuracy. Actual comparison packets remove
arm identifiers, though output style and explicit FS wording can reveal the method.

The shared/raw-K1 plan also aborted with the same provider capacity error after writing a plan artifact, but without a completed turn or usage. Extend this same fresh-cell recovery to that condition only; retain the original artifact as an incomplete observation. Run remaining recovery/model review calls serially to reduce provider pressure. This amendment changes scheduling, not inputs, rubric or model.

For the secondary reviewer, retry both authored calibration examples in one neutral-ID batch (C17/C42), then use two independent packets per call with the same rubric, serially. This reduces service requests. Each packet retains its own source and answers; the reviewer must not borrow information between them. No scores, comparative rankings or generator feedback are added. Initial labeled diagnostic calls remain in the cost ledger.
