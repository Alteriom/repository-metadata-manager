---
name: 🐛 Bug Report
about: Report a bug to help us improve the Repository Metadata Manager
title: '[BUG] Brief description of the issue'
labels: ['bug', 'needs-triage']
assignees: ''
---

## 🐛 Bug Description

**What went wrong?**
A clear and concise description of the bug you encountered.

**Which feature/component is affected?**

- [ ] 📊 Health Score Calculation
- [ ] 🔒 Security Audit
- [ ] 🛡️ Branch Protection
- [ ] 📚 Documentation Analysis
- [ ] ⚙️ CI/CD Management
- [ ] 🎯 Compliance Checking
- [ ] 📋 Interactive CLI
- [ ] 📦 Package Installation
- [ ] 🔧 Configuration
- [ ] Other: ****\_\_\_****

## 🔄 Steps to Reproduce

**Please provide detailed steps:**

1. Environment setup: `npm install @alteriom/repository-metadata-manager`
2. Configuration used: (attach config file or describe settings)
3. Command executed: `npm run [command]` or `repository-manager [options]`
4. Specific action that triggered the bug
5. Error occurred at step: \_\_\_

**Command Line Used:**

```bash
# Paste the exact command you ran here
```

**Configuration File (if applicable):**

```json
{
    "organizationTag": "your-org"
    // paste your config here
}
```

## ✅ Expected Behavior

**What should have happened?**
Describe the expected outcome in detail.

## ❌ Actual Behavior

**What actually happened?**
Describe what you observed instead.

**Error Message:**

```
Paste the complete error message here
```

**Console Output:**

```
Paste relevant console output here
```

## 📸 Screenshots/Logs

**If applicable, add screenshots or log files:**

- Screenshot of error
- Console output
- Log files (attach as files)

## 🖥️ Environment Details

**Required Information:**

- **OS:** [e.g., Windows 11, macOS 13.0, Ubuntu 22.04]
- **Node.js Version:** [run `node --version`]
- **NPM Version:** [run `npm --version`]
- **Package Version:** [run `npm list @alteriom/repository-metadata-manager`]
- **Installation Method:** [Global/Local/Dev Dependency]

**Repository Context:**

- **Repository Type:** [Public/Private/Organization]
- **Repository Size:** [Small <10 files / Medium 10-100 files / Large >100 files]
- **GitHub Token Permissions:** [Admin/Write/Read/None]

**Command Details:**

```bash
# Run this command and paste output
repository-manager health --version
```

## 🔍 Additional Context

**More details that might help:**

- [ ] This worked in a previous version (which version?)
- [ ] This happens only with specific repositories
- [ ] This happens only with certain configurations
- [ ] Related to organization settings
- [ ] Related to GitHub API limitations

**Previous Version that Worked:** ****\_\_\_****

**Frequency:**

- [ ] Always happens
- [ ] Sometimes happens
- [ ] Happened once
- [ ] Intermittent

## 💡 Possible Solution

**Do you have ideas for fixing this?**
If you have suggestions or have identified the root cause, please share.

## 🚨 Impact Assessment

**How severely does this affect your workflow?**

- [ ] 🔴 Critical - Blocks main functionality
- [ ] 🟡 High - Significant impact on workflow
- [ ] 🟢 Medium - Minor inconvenience
- [ ] ⚪ Low - Cosmetic or edge case

**Workaround Available?**

- [ ] Yes, I found a workaround: ****\_\_\_****
- [ ] No workaround available

---

**📝 Note for Contributors:**
Please ensure you're using the latest version before reporting bugs. Run `npm update @alteriom/repository-metadata-manager` to get the newest version.
