// Batch-repairs the mechanical problems in public/models/*.glb.
//
//   npm run fix:models                 # dry run, prints what would change
//   npm run fix:models -- --write      # rewrites the files in place
//   tsx scripts/fix-models.ts public/models --write
//
// Repairs:
//   1. metallicFactor  - set to 1 for the four metal artifacts, 0 for everything
//                        else (Tripo3D leaves it at the glTF default of 1.0,
//                        which renders terracotta like chrome).
//   2. normalTexture.scale - clamp to <= MAX_NORMAL_SCALE.
//
// The GLB JSON chunk is rewritten; the BIN chunk is copied byte-for-byte and
// the header length is recomputed. bufferView byteOffsets are relative to the
// BIN payload, so moving it within the file does not invalidate anything.
//
// This does NOT fix size, triangle count or texture resolution. Those need
// `@gltf-transform/cli optimize`; see public/models/README.md.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GlbParseError, applyModelFixes, parseGlb, serializeGlb } from '../src/lib/glb';
import { MAX_NORMAL_SCALE } from '../src/data/modelSpec';
import { MODEL_MANIFEST, findManifestEntry } from '../src/data/model-manifest';

const args = process.argv.slice(2);
const write = args.includes('--write');
const positional = args.filter((arg) => !arg.startsWith('--'));
const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const modelsDir = positional[0] ? resolve(positional[0]) : join(projectRoot, 'public/models');

// ---------------------------------------------------------------------------

let files: string[];
try {
  files = readdirSync(modelsDir)
    .filter((name) => name.toLowerCase().endsWith('.glb'))
    .sort();
} catch {
  console.error(`No such directory: ${modelsDir}`);
  process.exit(1);
}

if (files.length === 0) {
  console.log(`No .glb files found in ${modelsDir} - nothing to fix.`);
  console.log('');
  console.log('The fixer expects the artifacts listed in src/data/model-manifest.ts:');
  for (const entry of MODEL_MANIFEST) {
    console.log(`  ${entry.file}  (${entry.label}, ${entry.isMetal ? 'metal' : 'non-metal'})`);
  }
  process.exit(0);
}

interface FileResult {
  file: string;
  changed: boolean;
  changeCount: number;
  lines: string[];
  binPreserved: boolean | null;
  error?: string;
}

const results: FileResult[] = [];

for (const file of files) {
  const path = join(modelsDir, file);
  if (!statSync(path).isFile()) continue;

  const entry = findManifestEntry(file);
  if (!entry) {
    results.push({
      file,
      changed: false,
      changeCount: 0,
      lines: [],
      binPreserved: null,
      error:
        'not listed in src/data/model-manifest.ts, so its object type (and therefore ' +
        'the correct metallicFactor) is unknown. Add an entry with { file, label, isMetal }.',
    });
    continue;
  }

  let original: Uint8Array;
  try {
    original = new Uint8Array(readFileSync(path));
  } catch (error) {
    results.push({
      file,
      changed: false,
      changeCount: 0,
      lines: [],
      binPreserved: null,
      error: `could not read: ${(error as Error).message}`,
    });
    continue;
  }

  let glb;
  try {
    glb = parseGlb(original);
  } catch (error) {
    if (error instanceof GlbParseError) {
      results.push({
        file,
        changed: false,
        changeCount: 0,
        lines: [],
        binPreserved: null,
        error: `not a readable GLB: ${error.message}`,
      });
      continue;
    }
    throw error;
  }

  const changes = applyModelFixes(glb.json, {
    isMetal: entry.isMetal,
    normalScaleMax: MAX_NORMAL_SCALE,
  });

  const lines = changes.map((change) => `${change.path}: ${change.from} -> ${change.to}`);

  if (changes.length === 0) {
    results.push({ file, changed: false, changeCount: 0, lines, binPreserved: null });
    continue;
  }

  const output = serializeGlb(glb.json, glb.bin);

  // Prove the BIN payload survived untouched before writing anything.
  const binPreserved = glb.bin
    ? bytesEqual(original.subarray(findBinOffset(original), findBinOffset(original) + glb.bin.byteLength), glb.bin)
    : null;

  if (write) {
    writeFileSync(path, output);
  }

  results.push({
    file,
    changed: true,
    changeCount: changes.length,
    lines,
    binPreserved,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let totalChanges = 0;
let totalFiles = 0;
let hadError = false;

console.log(`Model repair: ${modelsDir}${write ? '' : '  (dry run, pass --write to apply)'}`);
console.log('');

for (const result of results) {
  const entry = findManifestEntry(result.file);
  const kind = entry ? (entry.isMetal ? 'metal' : 'non-metal') : 'unmapped';

  if (result.error) {
    hadError = true;
    console.log(`SKIP  ${result.file}  (${kind})`);
    console.log(`      ${result.error}`);
    console.log('');
    continue;
  }

  if (!result.changed) {
    console.log(`OK    ${result.file}  (${kind}) - already correct`);
    continue;
  }

  totalFiles++;
  totalChanges += result.changeCount;
  console.log(`${write ? 'FIXED' : 'WOULD'} ${result.file}  (${kind})`);
  for (const line of result.lines) console.log(`      ${line}`);
  if (result.binPreserved === false) {
    console.log('      WARNING: binary chunk did not match after rewrite');
  }
}

console.log('');
console.log(
  write
    ? `${totalFiles} file(s) rewritten, ${totalChanges} change(s) applied.`
    : `${totalFiles} file(s) would be rewritten, ${totalChanges} change(s) needed.`,
);

if (!write && totalFiles > 0) {
  console.log('Re-run with --write to apply, then `npm run verify:models` to confirm.');
}

if (hadError) {
  console.log('');
  console.log('One or more files were skipped. Fix the errors above and re-run.');
  process.exit(1);
}

// ---------------------------------------------------------------------------

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Locate the BIN chunk payload offset by walking the chunk table. */
function findBinOffset(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    if (chunkType === 0x004e4942) return offset + 8;
    offset += 8 + chunkLength;
  }
  return -1;
}
