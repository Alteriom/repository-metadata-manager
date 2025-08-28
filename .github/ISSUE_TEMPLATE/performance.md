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
- [ ] Other: ___________

## 📊 Performance Metrics

**Current Performance:**

- **Command:** `repository-manager [command]`
- **Execution Time:** _____ seconds/minutes
- **Memory Usage:** _____ MB
- **CPU Usage:** _____%
- **Repository Size:** _____ files/MB

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

- **Target Execution Time:** _____ seconds
- **Acceptable Memory Usage:** _____ MB
- **Comparison:** Similar tools take _____ seconds

**Benchmark Reference:**
If you have performance comparisons with other tools or previous versions.

## 🔄 Reproduction Steps

**How to reproduce the performance issue:**

1. **Environment Setup:**
   - Repository type: [Large/Medium/Small]
   - Number of files: _____
   - Repository structure: _____

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

- **Repository Size:** _____ files
- **Repository Type:** [Public/Private/Organization]
- **Git History:** [Large/Medium/Small]
- **File Types:** [Mostly JS/Mixed/Large binaries]

## 📈 Performance Comparison

**Previous Versions:**
- Version X.X.X took: _____ seconds
- Current version takes: _____ seconds
- Performance change: _____ (better/worse)

**Other Tools:**
- Tool A takes: _____ seconds  
- Tool B takes: _____ seconds
- Our tool takes: _____ seconds

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
- [ ] Other: ___________

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
- Similar to: #___
- Caused by: #___
- Blocks: #___

**External Factors:**
- Network conditions: _____
- GitHub API rate limits: _____
- System load: _____

---

**📝 Note:** Performance optimization helps everyone! Include as much detail as possible to help us identify and fix the issue.
