# Shared reference

What every job on this repository draws on. Each file points at the repository file that owns a fact; follow the pointer for the detail, and when the two disagree the owning file is right.

| File | Answers |
|---|---|
| [architecture.md](architecture.md) | the policy, engine, checkers, control layer, the CLI, MCP, Action and library, and who consumes the package |
| [invariants.md](invariants.md) | the trust boundaries a change must not weaken, and the code that enforces each |
| [build-and-test.md](build-and-test.md) | the local checks and every workflow a pull request meets, the administrator approval included |
| [release.md](release.md) | how a version reaches npm, and where the version stands |
| [gotchas.md](gotchas.md) | traps that have already cost a red run, a blocked merge or a wrong instruction |
| [documents.md](documents.md) | the documents of this repository, which are pinned, and where they have drifted |

Each stage's contract names the files it loads.
