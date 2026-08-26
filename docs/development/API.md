# Programmatic API

```javascript
const {
  Engine,
  Checker,
  Context,
  Report,
  Policy,
  Planner,
  Executor,
  Inventory,
} = require('@alteriom/repository-metadata-manager');
```

## Engine

```javascript
const engine = new Engine({
  projectRoot: '/absolute/repository/path',
  config: '.repo-manager.json'
});

const report = await engine.run(['security', 'cicd']);
const plan = await engine.plan();
const preview = await engine.applyPlan(plan);
const audit = await engine.applyPlan(plan, { approved: true, dryRun: false });
```

`run()` returns `RepositoryComplianceReport`. `plan()` returns `RepositoryRemediationPlan`. `applyPlan()` returns `RepositoryRemediationAudit`.

## Custom checker

Extend `Checker`, return findings from `check(context)`, and declare only finding IDs that have a safe `plan()` implementation.

```javascript
class ExampleChecker extends Checker {
  constructor() {
    super({
      name: 'example',
      version: '1.0.0',
      description: 'Example policy',
      defaultWeight: 10,
      fixableFindingIds: []
    });
  }

  async check(context) {
    return this.createResult(context.fileExists('example.txt') ? 100 : 0, [{
      id: 'example-001',
      severity: 'medium',
      message: 'example.txt is missing',
      file: 'example.txt',
      fix: 'Add example.txt'
    }]);
  }
}
```

Register custom checkers before calling `run()`. Built-ins load automatically only when no checker has been registered.

## Safety

Use `Engine` for normal integrations. Calling `Executor` directly does not bypass validation, project-root containment, approval, or precondition hashes.
