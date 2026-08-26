# Repository Manager MCP Server

The `repo-manager-mcp` executable exposes:

- `inventory` — normalized local repository identity and metadata
- `evaluate` — policy report and gate status
- `findings` — filtered normalized findings
- `plan` — deterministic, read-only remediation plan
- `apply` — exact approved plan execution, disabled by default

## Configuration

```json
{
  "mcpServers": {
    "repository-manager": {
      "command": "repo-manager-mcp",
      "env": {
        "REPO_MANAGER_ALLOWED_ROOTS": "/workspace/repos"
      }
    }
  }
}
```

Multiple allowed roots use the operating system path delimiter. Tokens are inherited from `GITHUB_TOKEN`; they are never MCP tool arguments.

## Apply capability

General-purpose servers should remain read-only. A dedicated executor can set `REPO_MANAGER_ENABLE_APPLY=true`. Apply still requires `approved: true`, an exact `RepositoryRemediationPlan`, a target inside the allowlist, and unchanged precondition hashes.
