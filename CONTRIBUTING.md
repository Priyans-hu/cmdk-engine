# Contributing to cmdk-engine

Thanks for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Changesets](#changesets)
- [Project Structure](#project-structure)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When filing a bug:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Include your environment** (OS, Node version, React version, framework)
- **Provide a minimal reproduction** if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating one:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this would be useful to most users**
- **List any alternatives you've considered**

### Your First Code Contribution

Look for issues labeled:

- `good first issue` — Simple issues for newcomers
- `help wanted` — Issues that need attention

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests
3. Add a [changeset](#changesets) if the change is user-facing
4. Run the checks CI runs (see [Before you push](#before-you-push))
5. Write a clear PR description

## Development Setup

### Prerequisites

- Node.js 20+ (matches `engines` in package.json and CI)
- [Bun](https://bun.sh) (recommended) or npm/pnpm

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/cmdk-engine.git
cd cmdk-engine

# Install dependencies
bun install

# Build
bun run build

# Run tests (not `bun test`: that is Bun's own runner, and it cannot run this suite)
bun run test

# Run tests in watch mode
bun run test:watch

# Lint
bun run lint

# Type check
bun run typecheck

# Format the files you changed (config in .prettierrc)
bunx prettier --write <files>
```

### Before you push

CI runs these on Node 20 and 22. Run them in this order:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:dist      # the tests again, against the built package
bun run lint:package   # publint and are-the-types-wrong
bun run size           # size budgets for each entry
```

### Docs site

The docs site in `docs/` is a Next.js static export with its own lockfile. It runs this repo's build of `cmdk-engine`, not the npm release, so build the library first. With Node 20:

```bash
bun install --frozen-lockfile
bun run build
cd docs
bun install --frozen-lockfile
node ../scripts/local-build.mjs docs   # run it again after each library build
bun run build
```

### Examples

Each app in `examples/` installs `cmdk-engine` from npm, and CI builds it against this repo's build instead. To run one the same way, from the repo root (see [examples/README.md](examples/README.md)):

```bash
bun run build
node scripts/local-build.mjs example vite-react-router --dev
```

## Changesets

Every user-facing change needs a changeset, which becomes a line in `CHANGELOG.md` at release time. Run `bun run changeset`, pick the bump (patch for fixes, minor for features) and write one to three lines for users. If the change alters existing behavior, start the summary with "Behavior change:" and say what to do about it. Do not edit `CHANGELOG.md` yourself. Docs-only and CI-only changes need none.

Maintainers: see [RELEASING.md](RELEASING.md) for how a release is cut.

## Project Structure

```
cmdk-engine/
├── src/
│   ├── core/          # Framework-agnostic engine (zero deps)
│   │   ├── types.ts   # All type definitions
│   │   ├── registry.ts # Command registry (pub/sub store)
│   │   ├── search.ts  # Built-in fuzzy search
│   │   ├── keywords.ts # Synonym engine
│   │   ├── access-control.ts # RBAC filter
│   │   ├── frecency.ts # Frecency ranking
│   │   └── grouping.ts # Command groups
│   ├── react/         # Provider and hooks
│   ├── adapters/      # UI and route adapters, one folder each
│   └── cli/           # CLI tool (scan, init, validate)
├── tests/             # Unit tests (mirrors src/ structure)
├── tests-dist/        # Tests of the built package (`bun run test:dist`)
├── docs/              # Next.js docs site
└── .changeset/        # One file per user-facing change
```

## Style Guidelines

### TypeScript

- Strict mode is enforced
- Use `type` imports for type-only imports (`import type { ... }`)
- Export types from barrel files
- Keep functions small and focused

### Testing

- Every feature needs tests
- Use `describe` blocks to group related tests
- Test edge cases (empty inputs, undefined, invalid data)

### Documentation

- Add JSDoc comments to exported functions and types
- Update docs if you change public API
- Put `<!-- readme-test: typecheck -->` on the line directly above a README code fence that should keep compiling. `bun run test:dist` type-checks it against the built package. Exactly one fence, the Quick Start, is marked `render` and also runs

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

- `core`: Core engine
- `react`: React hooks
- `adapter`: Framework adapters
- `cli`: CLI tool
- `ci`: CI/CD changes

### Examples

```
feat(core): add frecency ranking algorithm
fix(adapter): resolve cmdk scroll position on filter
docs(readme): add CLI usage examples
chore(ci): update node version matrix
```

## Questions?

Feel free to open an issue or reach out to the maintainers.

Thank you for contributing!
