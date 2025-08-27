# Setup Guide for Organizations

This guide shows how to set up the Repository Metadata Manager for your organization without exposing hardcoded values.

## Step 1: Install the Package

```bash
npm install --save-dev repository-metadata-manager
```

## Step 2: Create Organization Configuration

Create a `metadata-config.json` file in your repository root:

```json
{
    "organizationTag": "your-org-name",
    "organizationName": "Your Organization Name",
    "packagePath": "./package.json",
    "repositoryType": "auto-detect",
    "customTopics": {
        "ai-agent": ["automation", "github-integration", "compliance"],
        "api": ["api", "backend", "server"],
        "frontend": ["frontend", "ui", "web"],
        "cli-tool": ["cli", "tool", "command-line"],
        "library": ["library", "package", "sdk"],
        "general": ["utility"]
    }
}
```

## Step 3: Add Scripts to package.json

```json
{
    "scripts": {
        "metadata:report": "repository-metadata report --config metadata-config.json",
        "metadata:validate": "repository-metadata validate --config metadata-config.json",
        "metadata:apply": "repository-metadata apply --config metadata-config.json",
        "metadata:dry-run": "repository-metadata dry-run --config metadata-config.json"
    }
}
```

## Step 4: Set Environment Variables (Optional)

```bash
# .env file or CI/CD environment
GITHUB_TOKEN=your_github_token_here
GITHUB_REPOSITORY_OWNER=your-org-name
GITHUB_REPOSITORY_NAME=your-repo-name
```

## Step 5: Usage Examples

### Generate compliance report:

```bash
npm run metadata:report
```

### Preview changes:

```bash
npm run metadata:dry-run
```

### Apply changes:

```bash
npm run metadata:apply
```

### Command-line usage without config file:

```bash
repository-metadata report --org-tag your-org --owner your-org --repo your-repo
```

## Security Best Practices

- **Never commit GitHub tokens** to your repository
- **Use environment variables** for sensitive information
- **Keep organization-specific settings** in configuration files
- **Use `.gitignore`** to exclude sensitive config files if needed

## Organization-Wide Deployment

To deploy across multiple repositories:

1. Create a shared configuration template
2. Use GitHub Actions or scripts to distribute the configuration
3. Set up organization-level environment variables
4. Use the same configuration structure across all repositories

This approach ensures no hardcoded organization-specific values are exposed in the public package.
