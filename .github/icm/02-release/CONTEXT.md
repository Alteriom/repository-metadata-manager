# 02-release — the pipeline

Decide the number and the path, prepare the notes, let a person publish, confirm what reached npm.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| [`01_plan`](stages/01_plan/CONTEXT.md) | the version and the path | the request | `output/plan.md` | A person reads `plan.md` and approves the version number and the path, or names others. |
| [`02_prepare`](stages/02_prepare/CONTEXT.md) | the release pull request | 01_plan's `plan.md` | `output/release-pr.md` | A person reads `release-pr.md` and the notes, merges the pull request, and then takes the step it names. |
| [`03_publish`](stages/03_publish/CONTEXT.md) | confirm what was published | 02_prepare's `release-pr.md` | `output/publish.md` | A person reads `publish.md`, checks the npm page once, and decides whether anything missing must be done by hand. |
