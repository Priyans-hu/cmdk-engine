# Contributing to cmdk-engine

Thanks for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
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
3. Ensure the test suite passes (`bun test`)
4. Make sure your code passes lint and typecheck (`bun run lint && bun run typecheck`)
5. Write a clear PR description

## Development Setup

### Prerequisites

- Node.js 18+
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

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Lint
bun run lint

# Type check
bun run typecheck

# Format
bun run format
```

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
│   ├── react/         # React hooks
│   ├── adapters/      # Framework adapters (cmdk, react-router, next.js)
│   └── cli/           # CLI tool (scan, init, validate)
├── tests/             # Test files (mirrors src/ structure)
└── docs/              # Next.js docs site
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
