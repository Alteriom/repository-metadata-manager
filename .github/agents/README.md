# GitHub Copilot Custom Agents

This directory contains specialized GitHub Copilot agents designed specifically for the Repository Metadata Manager project. Each agent is an expert in a specific domain and can be invoked using the `@` syntax in GitHub Copilot.

## Available Agents

### 🏥 @repo-health-agent
**Expert in repository health scoring, compliance checking, and organization-wide analytics**

Use this agent for:
- Calculating repository health scores
- Analyzing compliance issues
- Understanding health scoring categories and weights
- Implementing health check features
- Generating health reports

**Example prompts:**
- "Calculate the health score for this repository"
- "What factors affect the documentation score?"
- "How do I add a new health check category?"

### 📚 @docs-agent
**Expert technical writer for repository documentation, API references, and user guides**

Use this agent for:
- Writing and updating documentation
- Creating API reference docs
- Updating README and CHANGELOG
- Writing user guides and tutorials
- Maintaining documentation consistency

**Example prompts:**
- "Document the new compliance report feature"
- "Update the README with the latest automation commands"
- "Create API documentation for HealthScoreManager"

### 🧪 @test-agent
**Quality assurance engineer specializing in Jest testing for Node.js CLI tools**

Use this agent for:
- Writing Jest tests
- Creating mock objects for testing
- Testing CLI commands
- Integration testing
- Improving test coverage

**Example prompts:**
- "Write tests for the AutomationManager class"
- "Create integration tests for the health command"
- "How do I mock Octokit API calls?"

### 🤖 @automation-agent
**Expert in cross-repository automation, organization-wide analytics, and compliance management**

Use this agent for:
- Building automation features
- Multi-repository operations
- Organization-wide analytics
- Batch processing
- GitHub API integration

**Example prompts:**
- "Add a new automation command for detecting stale PRs"
- "How do I implement concurrency control for batch operations?"
- "Create a report generator for security vulnerabilities"

### 🛠️ @repo-manager
**General-purpose repository manager with expertise in all aspects of this project**

Use this agent for:
- General development tasks
- Understanding project architecture
- Working across multiple areas
- Code reviews and refactoring
- Following project conventions

**Example prompts:**
- "Help me understand the project structure"
- "What's the correct pattern for adding a new feature manager?"
- "Review this code for best practices"

## How to Use These Agents

### In GitHub Copilot Chat

1. **Invoke an agent** using the `@` symbol:
   ```
   @docs-agent Write documentation for the new security dashboard feature
   ```

2. **Ask domain-specific questions:**
   ```
   @test-agent How should I test async API calls with Octokit?
   ```

3. **Get code suggestions:**
   ```
   @automation-agent Add a method to check for outdated dependencies
   ```

### Best Practices

- **Use the right agent for the task**: Choose the specialist agent that matches your current work
- **Be specific**: Provide context about what you're trying to achieve
- **Reference existing code**: Mention specific files or functions when relevant
- **Follow agent boundaries**: Agents are configured with specific do's and don'ts

### Agent Selection Guide

| Task | Recommended Agent |
|------|-------------------|
| Calculate health scores | @repo-health-agent |
| Write documentation | @docs-agent |
| Create tests | @test-agent |
| Build automation features | @automation-agent |
| General development | @repo-manager |
| Organization analytics | @automation-agent |
| API documentation | @docs-agent |
| CLI testing | @test-agent |
| Compliance checking | @repo-health-agent |

## Agent Capabilities

All agents have knowledge of:
- ✅ Project structure and file organization
- ✅ Tech stack (Node.js 18+, Commander.js, Octokit, Jest, etc.)
- ✅ Code style conventions and naming patterns
- ✅ Available npm scripts and commands
- ✅ Testing and development workflows
- ✅ Critical issues to avoid (e.g., deprecated method names)

All agents follow:
- ✅ Established coding patterns
- ✅ Error handling best practices
- ✅ Terminal output conventions (chalk colors)
- ✅ Clear boundaries (always/ask/never guidelines)

## Creating New Agents

To create a new agent for this repository:

1. **Create a new file** in `.github/agents/` with format: `agent-name.md`

2. **Add YAML frontmatter:**
   ```yaml
   ---
   name: agent_name
   description: One-sentence description of what this agent does
   ---
   ```

3. **Include these sections:**
   - Your Role - Define the agent's expertise
   - Project Knowledge - Tech stack, file structure
   - Commands You Can Use - Executable commands
   - Standards - Code style, patterns, examples
   - Boundaries - Always/Ask/Never rules

4. **Follow best practices:**
   - Put commands early
   - Include real code examples
   - Be specific about tech stack versions
   - Set clear boundaries
   - Show good vs. bad patterns

See [How to write a great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) for more guidance.

## Feedback and Improvements

These agents evolve with the project. If you find an agent:
- Missing important context
- Giving incorrect suggestions
- Needs additional boundaries

Please update the relevant `.md` file or create an issue.

## Learn More

- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [Custom Agents Guide](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Repository Documentation](../../docs/)
