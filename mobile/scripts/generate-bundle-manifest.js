#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-bundle-manifest.js
//
// Build-time script — run as part of the CI release pipeline AFTER Metro
// produces the feature bundles. It:
//   1. Reads each compiled bundle artifact from ./dist/bundles/
//   2. Computes its SHA-256 checksum
//   3. Writes the final module-manifest.json consumed at runtime
//
// Usage:
//   node scripts/generate-bundle-manifest.js \
//     --bundles-dir ./dist/bundles \
//     --base-url https://cdn.example.com/esustellar/bundles/1.2.3 \
//     --app-version 1.2.3 \
//     --out ./dist/module-manifest.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv);
const bundlesDir = args['bundles-dir'] || path.join(__dirname, '..', 'dist', 'bundles');
const baseUrl = args['base-url'] || 'https://cdn.example.com/bundles';
const appVersion = args['app-version'] || '1.0.0';
const outFile = args['out'] || path.join(__dirname, '..', 'dist', 'module-manifest.json');

// ── Feature module list (matches bundleManifest.ts) ───────────────────────────

const MODULES = [
  { id: 'core',          bundleFile: 'core.bundle.js',          critical: true  },
  { id: 'auth',          bundleFile: 'auth.bundle.js',          critical: true  },
  { id: 'wallet',        bundleFile: 'wallet.bundle.js',        critical: true  },
  { id: 'security',      bundleFile: 'security.bundle.js',      critical: true  },
  { id: 'onboarding',    bundleFile: 'onboarding.bundle.js',    critical: false },
  { id: 'groups',        bundleFile: 'groups.bundle.js',        critical: false },
  { id: 'contributions', bundleFile: 'contributions.bundle.js', critical: false },
  { id: 'notifications', bundleFile: 'notifications.bundle.js', critical: false },
  { id: 'settings',      bundleFile: 'settings.bundle.js',      critical: false },
  { id: 'analytics',     bundleFile: 'analytics.bundle.js',     critical: false },
];

// ── SHA-256 helper ────────────────────────────────────────────────────────────

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Generating bundle manifest from: ${bundlesDir}`);

  const manifestModules = [];
  const missing = [];

  for (const mod of MODULES) {
    const filePath = path.join(bundlesDir, mod.bundleFile);

    if (!fs.existsSync(filePath)) {
      console.warn(`  MISSING: ${mod.bundleFile}`);
      missing.push(mod.id);
      continue;
    }

    const checksum = sha256File(filePath);
    const stats = fs.statSync(filePath);

    manifestModules.push({
      id: mod.id,
      version: appVersion,
      bundleUrl: `${baseUrl}/${mod.bundleFile}`,
      checksum,
      minAppVersion: '1.0.0',
      critical: mod.critical,
      sizeBytes: stats.size,
    });

    console.log(`  ✓ ${mod.id} (${(stats.size / 1024).toFixed(1)} kB) — ${checksum.slice(0, 16)}…`);
  }

  if (missing.length > 0) {
    console.warn(`\nWarning: ${missing.length} bundle(s) not found: ${missing.join(', ')}`);
    console.warn('Run the Metro build step first.\n');
  }

  const manifest = {
    manifestVersion: 1,
    publishedAt: new Date().toISOString(),
    appVersion,
    modules: manifestModules,
  };

  // Ensure output directory exists
  const outDir = path.dirname(outFile);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nManifest written to: ${outFile}`);
  console.log(`  ${manifestModules.length} module(s) catalogued`);
}

main();
