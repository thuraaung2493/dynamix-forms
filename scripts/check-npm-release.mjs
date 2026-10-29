import { readFileSync } from 'node:fs';

const version = process.env.RELEASE_VERSION;
const target = process.env.RELEASE_TARGET ?? 'both';

if (!/^\d+\.\d+\.\d+-beta\.\d+$/.test(version ?? '')) {
  throw new Error('RELEASE_VERSION must be an exact beta version such as 0.1.0-beta.1.');
}

if (!['both', 'core', 'react'].includes(target)) {
  throw new Error('RELEASE_TARGET must be both, core, or react.');
}

const root = new URL('../', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const core = readJson('packages/dynamic-form-core/package.json');
const react = readJson('packages/dynamic-form-react/package.json');
const api = readJson('apps/form-builder-api/package.json');
const web = readJson('apps/form-builder-web/package.json');
const lock = readJson('package-lock.json');

const coreName = '@thuraaung2493/dynamic-form-core';
const reactName = '@thuraaung2493/dynamic-form-react';
const versions = {
  'core package': core.version,
  'React package': react.version,
  'React core dependency': react.dependencies?.[coreName],
  'API core dependency': api.dependencies?.[coreName],
  'web core dependency': web.dependencies?.[coreName],
  'web React dependency': web.dependencies?.[reactName],
  'lockfile core package': lock.packages?.['packages/dynamic-form-core']?.version,
  'lockfile React package': lock.packages?.['packages/dynamic-form-react']?.version,
  'lockfile React core dependency': lock.packages?.['packages/dynamic-form-react']?.dependencies?.[coreName],
  'lockfile API core dependency': lock.packages?.['apps/form-builder-api']?.dependencies?.[coreName],
  'lockfile web core dependency': lock.packages?.['apps/form-builder-web']?.dependencies?.[coreName],
  'lockfile web React dependency': lock.packages?.['apps/form-builder-web']?.dependencies?.[reactName],
};

for (const [label, actual] of Object.entries(versions)) {
  if (actual !== version) {
    throw new Error(`${label} must be ${version}; found ${actual ?? 'missing'}.`);
  }
}

for (const [label, manifest] of [['core', core], ['React', react]]) {
  if (manifest.private === true || manifest.publishConfig?.access !== 'public' || manifest.publishConfig?.tag !== 'beta') {
    throw new Error(`${label} package must be public and use the beta publish tag.`);
  }
}

if (api.private !== true || web.private !== true) {
  throw new Error('Builder apps must remain private.');
}

if (process.env.CHECK_NPM_REGISTRY === '1') {
  const names = target === 'both' ? [coreName, reactName] : [target === 'core' ? coreName : reactName];

  for (const name of names) {
    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (response.status === 200) {
      throw new Error(`${name}@${version} is already published; bump the version before staging.`);
    }
    if (response.status !== 404) {
      throw new Error(`Could not verify ${name}@${version} availability: registry returned ${response.status}.`);
    }
  }
}

console.log(`Release manifests match ${version}; target: ${target}.`);
