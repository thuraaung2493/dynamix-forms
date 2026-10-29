# Publishing the npm prerelease

The public packages are `@thuraaung2493/dynamic-form-core` and `@thuraaung2493/dynamic-form-react`, both at `0.1.0-beta.0`. The React package depends on the exact same prerelease of core. The builder apps are private and must not be published.

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

The package manifests also set `publishConfig.tag` to `beta`, so an accidental plain `npm publish` from a package workspace will not move the `latest` tag. Publishing is irreversible for a given version; do not use `latest` for this prerelease.

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

The `beta` tag is opt-in; a normal install without `@beta` should not select these prerelease versions.
