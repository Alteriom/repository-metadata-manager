# 03-deps — the pipeline

Read the bump against what uses it, read CI against `main`, recommend; a person approves and merges.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| [`01_review`](stages/01_review/CONTEXT.md) | review the bump | the pull request | `output/review.md` | A person reads `review.md` and the CI result, approves the head with `/approve-command-center` if satisfied, and decides to merge, hold or close. |
