# Releasing

`.github/workflows/release.yml` runs every release. A pushed `v*` tag publishes the package to npm, creates the GitHub release with the standalone binaries, and updates the Homebrew tap formula. A manual run never publishes to npm.

## One-time setup: npm trusted publishing

With trusted publishing, the workflow publishes with a short-lived OIDC token from GitHub instead of a stored npm token, and npm adds provenance automatically.

1. Add it right before you tag: a new trusted publisher expires if no publish uses it within two days.
2. On npmjs.com, open the `cmdk-engine` package, then **Settings** > **Trusted publishing**, and add a GitHub Actions publisher:
   - Organization or user: `Priyans-hu`
   - Repository: `cmdk-engine`
   - Workflow filename: `release.yml`
   - Environment name: leave empty
   - Allowed actions: tick **direct publishing** (`npm publish`). The workflow publishes with `npm publish`, and a new configuration allows only `npm stage publish` until you tick it.
3. After a release has published this way, delete the `NPM_TOKEN` repository secret. In **Settings** > **Publishing access**, you can then choose "Require two-factor authentication and disallow tokens".

Until then, the workflow passes the `NPM_TOKEN` secret as a fallback: npm tries OIDC first and uses the token only when that fails. Classic tokens no longer work, so the fallback needs a granular access token with read and write access to `cmdk-engine` (90 days at most).

The publish job runs on Node 22 and installs npm 11.5.1 or later, which trusted publishing requires (with Node 22.14 or later).

## Rehearse

Run the workflow by hand with **dry_run** checked (the default), from Actions > Release > Run workflow, or:

```bash
gh workflow run release.yml -R Priyans-hu/cmdk-engine --ref main -f dry_run=true
```

The rehearsal:

- installs, tests, builds and runs `test:dist`;
- runs `npm publish --dry-run`, or `npm pack --dry-run` when the version is already on npm (npm 11 refuses a publish dry run over a published version);
- builds the three standalone binaries, runs each one, and keeps them as workflow artifacts;
- writes the Homebrew formula and runs `git push --dry-run` against the tap, which fails if `HOMEBREW_TAP_TOKEN` cannot push.

It publishes nothing to npm, creates no GitHub release and pushes nothing to the tap. Rehearse after the version PR merges and before you tag, so the publish dry run covers the new version.

A manual run with dry_run unchecked still never publishes to npm. It creates (or updates) the GitHub release for the version in `package.json`, whose tag must already exist, and pushes the formula. Use it to backfill a release, such as the missing v0.5.1.

## Release

1. Merge the PRs that carry changesets.
2. On a branch from `main`, run `bun run changeset version`. It bumps `package.json`, writes `CHANGELOG.md` and removes the used changesets. Commit it as `chore(release): x.y.z`, then open a PR to `main` and merge it.
3. Rehearse, as above.
4. Tag the merge commit and push the tag:

   ```bash
   git switch main && git pull
   git tag v0.6.0
   git push origin v0.6.0
   ```

   The workflow stops if the tag does not match the version in `package.json`.

5. Check the result:
   - npm lists the new version as `latest`, with provenance.
   - The GitHub release has six assets: three binaries and their `.sha256` files.
   - `Formula/cmdk-engine.rb` in `Priyans-hu/homebrew-tap` has the new version.

Do not run `bun run release` locally. A local publish makes the workflow's publish a no-op, and that version gets no provenance.
