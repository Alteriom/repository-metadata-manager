---
name: ⚡ Performance Issue
about: Report performance problems or suggest optimizations
title: '[PERFORMANCE] Brief description of performance issue'
labels: ['performance', 'needs-investigation']
assignees: ''
---

## ⚡ Performance Issue

**What performance problem are you experiencing?**

- [ ] 🐌 Slow command execution
- [ ] 💾 High memory usage
- [ ] 🔄 Slow startup time
- [ ] 📊 Slow health score calculation
- [ ] 🔍 Slow file analysis
- [ ] 🌐 Slow GitHub API calls
- [ ] 💻 High CPU usage
- [ ] 📈 Performance degradation over time
- [ ] Other: \***\*\_\_\_\*\***

## 📊 Performance Metrics

**Current Performance:**

- **Command:** `repository-manager [command]`
- **Execution Time:** **\_** seconds/minutes
- **Memory Usage:** **\_** MB
- **CPU Usage:** **\_**%
- **Repository Size:** **\_** files/MB

**Measurement Method:**

```bash
# How did you measure performance?
time repository-manager health
# or
/usr/bin/time -v repository-manager health
```

**Performance Data:**

```
Paste performance output here
```

## 🎯 Expected Performance

**What performance would you expect?**

- **Target Execution Time:** **\_** seconds
- **Acceptable Memory Usage:** **\_** MB
- **Comparison:** Similar tools take **\_** seconds

**Benchmark Reference:**
If you have performance comparisons with other tools or previous versions.

## 🔄 Reproduction Steps

**How to reproduce the performance issue:**

1. **Environment Setup:**
    - Repository type: [Large/Medium/Small]
    - Number of files: **\_**
    - Repository structure: **\_**

2. **Commands to Run:**

```bash
# Step-by-step commands
repository-manager [command] [options]
```

3. **Measurement Commands:**

```bash
# How to measure the performance
time [command]
```

## 🖥️ Environment

**System Specifications:**

- **OS:** [Windows/macOS/Linux + version]
- **CPU:** [e.g., Intel i7, Apple M1, AMD Ryzen]
- **RAM:** [e.g., 8GB, 16GB, 32GB]
- **Storage:** [SSD/HDD]
- **Node.js Version:** [run `node --version`]
- **Package Version:** [run `npm list @alteriom/repository-metadata-manager`]

**Repository Details:**

- **Repository Size:** **\_** files
- **Repository Type:** [Public/Private/Organization]
- **Git History:** [Large/Medium/Small]
- **File Types:** [Mostly JS/Mixed/Large binaries]

## 📈 Performance Comparison

**Previous Versions:**

- Version X.X.X took: **\_** seconds
- Current version takes: **\_** seconds
- Performance change: **\_** (better/worse)

**Other Tools:**

- Tool A takes: **\_** seconds
- Tool B takes: **\_** seconds
- Our tool takes: **\_** seconds

## 🔍 Investigation

**What have you tried?**

- [ ] Updated to latest version
- [ ] Ran with `--verbose` flag
- [ ] Tested on different repositories
- [ ] Tested with different Node.js versions
- [ ] Checked system resources
- [ ] Profiled with Node.js profiler

**Findings:**
Describe any patterns or insights you've discovered.

## 🛠️ Potential Solutions

**Do you have suggestions for optimization?**

- [ ] Caching improvements
- [ ] Parallel processing
- [ ] Algorithm optimization
- [ ] Memory management
- [ ] API call reduction
- [ ] File I/O optimization
- [ ] Other: \***\*\_\_\_\*\***

**Implementation Ideas:**
If you have specific technical suggestions.

## 📊 Impact Assessment

**How does this affect your workflow?**

- [ ] 🔴 Blocks usage entirely
- [ ] 🟡 Significantly slows workflow
- [ ] 🟢 Minor inconvenience
- [ ] ⚪ Optimization opportunity

**Scale of Impact:**

- **Frequency:** [Every use / Daily / Weekly / Occasionally]
- **User Base:** [Personal / Team / Organization-wide]
- **Repository Types:** [All / Large repos only / Specific types]

## 🔬 Profiling Data

**If you have profiling data, please attach:**

- [ ] Node.js profiler output
- [ ] Memory snapshots
- [ ] CPU flame graphs
- [ ] System monitoring logs

**Profiling Commands Used:**

```bash
# Commands used for profiling
node --prof repository-manager health
node --prof-process isolate-*.log > processed.txt
```

## 📋 Additional Context

**Related Performance Issues:**

- Similar to: #\_\_\_
- Caused by: #\_\_\_
- Blocks: #\_\_\_

**External Factors:**

- Network conditions: **\_**
- GitHub API rate limits: **\_**
- System load: **\_**

---

**📝 Note:** Performance optimization helps everyone! Include as much detail as possible to help us identify and fix the issue.
