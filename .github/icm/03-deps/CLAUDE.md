# 03-deps — review a dependency bump

One run is one Dependabot pull request: an npm package (`deps`, grouped minor and patch) or a GitHub Action (`ci`) (`.github/dependabot.yml`). Reviewed against what this repository uses of it, checked in CI, recommended to a person. Pull requests #105, #115, #121, #124 to #130 and #144 were runs of this job.

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Review](stages/01_review/CONTEXT.md) — what moved, what uses it, what CI says, and a recommendation.
