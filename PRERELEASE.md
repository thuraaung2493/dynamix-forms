# Publishing the npm prerelease

The public packages are `@thuraaung2493/dynamic-form-core` and `@thuraaung2493/dynamic-form-react`, both at `0.1.0-beta.0`. The React package depends on the exact same prerelease of core. The builder apps are private and must not be published.

Both `0.1.0-beta.0` packages were published on 2026-10-29. Do not rerun the publish commands below for this version; npm versions are immutable. Use this checklist after bumping both versions and the React package's exact core dependency for the next prerelease.

## Automated staged beta releases

After [`.github/workflows/npm-release.yml`](./.github/workflows/npm-release.yml) is merged, configure a stage-only npm trusted publisher **for each package**. Use the npm package Settings → Trusted Publisher page (or `npm trust github`) with these exact values:

| Setting | Value |
| --- | --- |
| GitHub user | `thuraaung2493` |
| Repository | `dynamix-forms` |
| Workflow filename | `npm-release.yml` |
| Environment | `npm-release` |
| Allowed action | `npm stage publish` only; do not enable direct `npm publish` |

No `NPM_TOKEN` secret is needed. Configure the trusted publishers close to the first staged release, because npm expires a new configuration if it has no successful publish within two days. The GitHub `npm-release` environment allows deployments only from protected branches; the workflow also refuses to run its jobs outside `main`.

For the next beta release:

1. On a feature branch, bump **both** package versions, the React package's core dependency, both private apps' package dependencies, and `package-lock.json`. Use a new exact version such as `0.1.0-beta.1`. Open a PR and merge only after CI passes.
2. In GitHub Actions, run **Stage npm beta release** from `main`. Enter that exact version and choose `both`. The workflow checks all local version references, verifies the selected versions are not already public, runs the full prerelease checks, then stages core followed by React. If one stage succeeded and the other failed, correct the problem and rerun with the failed package as the target.
3. In npm's Staged Packages page, review each tarball and approve **core first, then React** with your own 2FA. The staged versions are not public until approved. You can also use `npm stage list`, `npm stage view <stage-id>`, and `npm stage approve <stage-id>` from your authenticated terminal.
4. Verify both public `@beta` versions and tags with the commands below. Do not expect the workflow to publish automatically on every merge or to deploy the builder.

The workflow is beta-only. A stable release should use an explicitly reviewed `latest` release flow rather than changing this workflow's default tag.

## Before publishing

Use Node.js 24 and npm 11. From the repository root:

```bash
npm ci
npm run prerelease:check
```

The check runs lint, type checking, tests, builds, and dry-run packs. Inspect both pack file lists: they should contain only the package metadata, license, README, compiled `dist` files, and (for React) `styles.css`. Each pack rebuilds from a clean `dist` directory to prevent stale generated files from slipping into an archive.

Check your npm identity and confirm that the versions are available:

```bash
npm whoami
npm view @thuraaung2493/dynamic-form-core versions --json
npm view @thuraaung2493/dynamic-form-react versions --json
```

You need publish access to the `thuraaung2493` scope. Do not publish if either package already has version `0.1.0-beta.0`; npm versions cannot be overwritten. Bump **both** package versions and their exact internal dependency references before trying again.

npm also requires account-level two-factor authentication or a suitable granular publishing token for new packages. Enable 2FA in your npm account settings before an interactive publish. Complete the challenge in your own terminal or browser; never put one-time or recovery codes into a repository or chat.

## Publish in dependency order

Run these commands only when you intend to make the packages public:

```bash
npm publish --workspace @thuraaung2493/dynamic-form-core --access public --tag beta
npm publish --workspace @thuraaung2493/dynamic-form-react --access public --tag beta
```

The package manifests also set `publishConfig.tag` to `beta`, so a plain `npm publish` from a package workspace requests the `beta` tag. Publishing is irreversible for a given version; do not intentionally target `latest` for a prerelease. npm nevertheless created `latest` on the first publication, as noted below.

Verify the published versions and tags:

```bash
npm view @thuraaung2493/dynamic-form-core@beta version
npm view @thuraaung2493/dynamic-form-react@beta version
npm dist-tag ls @thuraaung2493/dynamic-form-core
npm dist-tag ls @thuraaung2493/dynamic-form-react
```

Consumers can install the prerelease explicitly:

```bash
npm install @thuraaung2493/dynamic-form-core@beta @thuraaung2493/dynamic-form-react@beta
```

These are the first published versions of both packages. npm automatically assigned `latest` to `0.1.0-beta.0` as well as `beta`, even though they were published with `--tag beta`. npm rejected removal of `latest` with HTTP 400. Until a stable release is published, an unqualified install also gets this beta; use `@beta` or the exact version to make prerelease intent explicit.
