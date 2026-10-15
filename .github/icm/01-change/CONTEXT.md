# 01-change — the pipeline

Define it, change it with tests and every invariant kept, prove it the way CI will, and wait for the administrator's approval on the pull request.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| [`01_define`](stages/01_define/CONTEXT.md) | reproduction or spec | the report or request | `output/definition.md` | A person runs the reproduction and confirms it fails for the reported reason, or reads the spec and approves it, before any code changes. |
| [`02_change`](stages/02_change/CONTEXT.md) | the code and its tests | 01_define's `definition.md` | `output/change.md` | A person reads the diff beside `definition.md`: it does what was defined, every invariant touched has a test, and nothing outside the layer moved. |
| [`03_verify`](stages/03_verify/CONTEXT.md) | checks and the pull request | 02_change's `change.md` | `output/pull-request.md` | A repository administrator reads `pull-request.md` and the diff, comments `/approve-command-center <sha>` if satisfied, and decides whether to merge. |
