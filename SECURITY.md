# Security Policy

## Supported Versions

Only the latest minor release gets fixes. While the version is 0.x, a minor release can change behavior; each change is listed in [CHANGELOG.md](CHANGELOG.md).

| Version          | Supported          |
| ---------------- | ------------------ |
| Latest 0.x minor | :white_check_mark: |
| Older releases   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in cmdk-engine, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Report it privately on GitHub: open the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/Priyans-hu/cmdk-engine/security/advisories/new))
3. If you cannot use GitHub, email **gargpriyanshu2004@gmail.com**
4. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Status Update**: Within 7 days with an assessment
- **Resolution**: Timeline depends on severity and complexity

### Severity Levels

| Level    | Description                                    | Response Time |
| -------- | ---------------------------------------------- | ------------- |
| Critical | Remote code execution, credential exposure     | 24-48 hours   |
| High     | Significant data exposure, auth bypass         | 3-5 days      |
| Medium   | Limited data exposure, denial of service       | 1-2 weeks     |
| Low      | Minor issues with limited impact               | Next release  |

## Security Considerations

### For Library Users

- cmdk-engine's access control layer is a **filter**, not an authentication system. It hides commands from the UI but does not prevent direct URL navigation. Always enforce permissions server-side.
- The frecency storage uses `localStorage` by default. Do not store sensitive data in command metadata.
- The CLI tool's route scanner reads your source files. It does not execute them or make network requests.
- The CLI loads a `.js`, `.mjs` or `.cjs` config file by importing it, so it runs that file's code. Only run it in a project you trust.
- Commands loaded from async sources are untrusted. Only `href` is filtered (relative, `http(s):`, `mailto:` and `tel:` are kept), so render labels and descriptions as text, never as HTML.

### For Contributors

- Never log or expose user credentials, tokens, or sensitive metadata
- Keep dependencies minimal and audit regularly
- Prefer pure functions over side effects in core modules

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve cmdk-engine's security.
