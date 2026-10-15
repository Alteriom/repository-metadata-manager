# 01-change — fix a defect or add a capability

One run is one change to the engine or an interface: a defect (a wrong finding, score, plan, apply or CLI result) or a capability (a checker, a command, a policy option, an interface). Defined (a failing reproduction, or a spec), changed with tests, verified the way CI verifies, proposed as a pull request. Pull requests #89 to #98 and #131 to #135 were runs of this job.

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Define](stages/01_define/CONTEXT.md) — a reproduction that fails, or a spec a person approves.
2. [Change](stages/02_change/CONTEXT.md) — the code and its tests, with every invariant kept.
3. [Verify](stages/03_verify/CONTEXT.md) — the checks CI runs, and the pull request.

A merge changes nothing for consumers until a release: that is the `release` route.
