// Batch verification for the 3D artifact models in public/models/.
//
//   npm run verify:models
//   tsx scripts/verify-models.ts public/models
//
// Parses each .glb directly (12-byte header, then JSON and BIN chunks) rather
// than going through @gltf-transform, so the numbers reported are the numbers
// actually on disk and the Draco check cannot be normalised away by a loader.
//
// Exits non-zero if any file fails, so it can gate a build.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GlbParseError,
  KHR_DRACO,
  KHR_MESH_QUANTIZATION,
  analyzeModel,
  parseGlb,
} from '../src/lib/glb';
import {
  ALLOWED_EXTENSIONS,
  BBOX_TOLERANCE,
  MAX_FILE_BYTES,
  MAX_NORMAL_SCALE,
  MAX_TRIANGLES,
  MAX_TEXTURE_DIMENSION,
  METALLIC_METAL,
  METALLIC_NON_METAL,
  TARGET_LONGEST_EDGE,
} from '../src/data/modelSpec';
import { findManifestEntry, MODEL_MANIFEST } from '../src/data/model-manifest';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const modelsDir = process.argv[2] ? resolve(process.argv[2]) : join(projectRoot, 'public/models');

type Severity = 'error' | 'warn';

interface Finding {
  severity: Severity;
  check: string;
  detail: string;
}

interface FileReport {
  file: string;
  ok: boolean;
  bytes: number;
  triangles: number;
  vertices: number;
  textureSummary: string;
  findings: Finding[];
}

const reports: FileReport[] = [];

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkFile(
  file: string,
  bytes: Uint8Array,
  manifestKnown: boolean,
  manifestIsMetal: boolean | undefined,
): FileReport {
  const findings: Finding[] = [];
  const add = (severity: Severity, check: string, detail: string) =>
    findings.push({ severity, check, detail });

  let glb;
  try {
    glb = parseGlb(bytes);
  } catch (error) {
    if (error instanceof GlbParseError) {
      add('error', 'container', `not a readable GLB: ${error.message}`);
      return {
        file,
        ok: false,
        bytes: bytes.byteLength,
        triangles: 0,
        vertices: 0,
        textureSummary: '-',
        findings,
      };
    }
    throw error;
  }

  const metrics = analyzeModel(glb.json, bytes.byteLength, glb.bin);

  // --- file size ----------------------------------------------------------
  if (bytes.byteLength > MAX_FILE_BYTES) {
    add(
      'error',
      'size',
      `${mb(bytes.byteLength)} MB exceeds ${mb(MAX_FILE_BYTES)} MB`,
    );
  }

  // --- triangles ----------------------------------------------------------
  if (metrics.triangles > MAX_TRIANGLES) {
    add(
      'error',
      'triangles',
      `${metrics.triangles.toLocaleString()} exceeds ${MAX_TRIANGLES.toLocaleString()}`,
    );
  }

  // --- textures -----------------------------------------------------------
  const oversize = metrics.textures.filter(
    (texture) => Math.max(texture.width, texture.height) > MAX_TEXTURE_DIMENSION,
  );
  for (const texture of oversize) {
    add(
      'error',
      'texture',
      `${texture.name} is ${texture.width}x${texture.height}, exceeds ${MAX_TEXTURE_DIMENSION}px`,
    );
  }
  const unverified = metrics.textures.filter((texture) => texture.unverified);
  for (const texture of unverified) {
    add(
      'warn',
      'texture',
      `${texture.name} (${texture.format}) dimensions could not be read; verify manually`,
    );
  }

  // --- metallicFactor -----------------------------------------------------
  const expectedMetallic = manifestIsMetal ? METALLIC_METAL : METALLIC_NON_METAL;
  for (const material of metrics.materials) {
    if (!manifestKnown) {
      add(
        'warn',
        'metalness',
        `material "${material.name}" metallicFactor=${material.metallicFactor} not checked: ` +
          `file is absent from src/data/model-manifest.ts`,
      );
      continue;
    }
    if (material.metallicFactor !== expectedMetallic) {
      add(
        'error',
        'metalness',
        `material "${material.name}" metallicFactor=${material.metallicFactor}, ` +
          `expected ${expectedMetallic} for a ${manifestIsMetal ? 'metal' : 'non-metal'} object` +
          (material.metallicFactorDefaulted ? ' (property absent, glTF defaults it to 1.0)' : ''),
      );
    }
  }
  if (metrics.materials.length === 0) {
    add('warn', 'metalness', 'file declares no materials');
  }

  // --- normal map strength ------------------------------------------------
  for (const material of metrics.materials) {
    if (material.normalScale !== null && material.normalScale > MAX_NORMAL_SCALE) {
      add(
        'error',
        'normal-scale',
        `material "${material.name}" normalTexture.scale=${material.normalScale}, ` +
          `exceeds ${MAX_NORMAL_SCALE}` +
          (material.normalScaleDefaulted ? ' (property absent, glTF defaults it to 1.0)' : ''),
      );
    }
  }

  // --- bounding box -------------------------------------------------------
  if (!metrics.bbox) {
    add('error', 'bbox', 'could not compute a bounding box (no POSITION min/max found)');
  } else {
    const edge = metrics.bbox.longestEdge;
    if (Math.abs(edge - TARGET_LONGEST_EDGE) > BBOX_TOLERANCE) {
      add(
        'error',
        'bbox',
        `longest edge ${edge.toFixed(4)}, expected ${TARGET_LONGEST_EDGE} +/- ${BBOX_TOLERANCE}`,
      );
    }
  }

  // --- animations / skins -------------------------------------------------
  if (metrics.animations > 0) {
    add('error', 'animations', `${metrics.animations} animation(s) present, expected none`);
  }
  if (metrics.skins > 0) {
    add('error', 'skins', `${metrics.skins} skin(s) present, expected none`);
  }

  // --- extensions ---------------------------------------------------------
  if (metrics.dracoLocations.length > 0) {
    add(
      'error',
      'draco',
      `KHR_draco_mesh_compression found in ${metrics.dracoLocations.join(', ')}. ` +
        `@google/model-viewer cannot load Draco without a decoder it does not fetch by ` +
        `default, so this would add a runtime network dependency and break offline use. ` +
        `Re-export with --compress quantize.`,
    );
  }

  const disallowed = metrics.extensionList.filter(
    (name) => !ALLOWED_EXTENSIONS.includes(name),
  );
  for (const name of disallowed) {
    // Draco already reported above with a fuller explanation.
    if (name === KHR_DRACO) continue;
    const decoderNote = DECODER_EXTENSIONS.has(name)
      ? ' This extension needs a runtime decoder that model-viewer does not fetch by default.'
      : '';
    add('error', 'extensions', `extensionsUsed contains "${name}", only ${
      ALLOWED_EXTENSIONS.map((n) => `"${n}"`).join(', ')
    } is allowed.${decoderNote}`);
  }

  if (
    !metrics.extensionList.includes(KHR_MESH_QUANTIZATION) &&
    metrics.extensionList.length === 0
  ) {
    add(
      'warn',
      'extensions',
      'no extensionsUsed: file was not quantized, so it is probably far above the size and triangle budget',
    );
  }

  // extensionsRequired should not demand anything model-viewer lacks.
  for (const name of metrics.requiredExtensions) {
    if (!ALLOWED_EXTENSIONS.includes(name)) {
      add(
        'error',
        'extensions',
        `extensionsRequired contains "${name}", which the renderer must support but may not`,
      );
    }
  }

  // --- scene sanity -------------------------------------------------------
  if (metrics.nodesWithMesh === 0) {
    add('error', 'scene', 'no scene node references a mesh, the model would render empty');
  }
  if (metrics.primitives === 0) {
    add('error', 'scene', 'no mesh primitives found');
  }

  return {
    file,
    ok: !findings.some((finding) => finding.severity === 'error'),
    bytes: bytes.byteLength,
    triangles: metrics.triangles,
    vertices: metrics.vertices,
    textureSummary: summariseTextures(metrics.textures),
    findings,
  };
}

/**
 * Extensions that require fetching a decoder at runtime. Present so the reason
 * a Draco/Meshopt file fails is stated rather than implied.
 */
const DECODER_EXTENSIONS = new Set([
  KHR_DRACO,
  'EXT_meshopt_compression',
  'KHR_texture_basisu',
]);

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function summariseTextures(textures: { width: number; height: number; format: string }[]): string {
  if (textures.length === 0) return 'none';
  const sizes = textures.map((texture) =>
    texture.width && texture.height ? `${texture.width}x${texture.height}` : '?',
  );
  return `${textures.length} (${sizes.join(', ')})`;
}

function cell(text: string, width: number): string {
  // Count code points so CJK filenames still line up.
  const length = [...text].length;
  return text + ' '.repeat(Math.max(0, width - length));
}

function printTable(rows: FileReport[]): void {
  const headers = ['file', 'size', 'tris', 'verts', 'textures', 'result'];
  const widths = headers.map((header) => header.length);

  const body = rows.map((row) => [
    row.file,
    `${mb(row.bytes)} MB`,
    row.triangles.toLocaleString(),
    row.vertices.toLocaleString(),
    row.textureSummary,
    row.ok ? 'PASS' : 'FAIL',
  ]);

  body.forEach((cells) => {
    cells.forEach((value, index) => {
      widths[index] = Math.max(widths[index], [...value].length);
    });
  });

  const line = (cells: string[]) => cells.map((value, i) => cell(value, widths[i])).join('  ');

  console.log(line(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((cells) => console.log(line(cells)));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let files: string[];
try {
  files = readdirSync(modelsDir)
    .filter((name) => name.toLowerCase().endsWith('.glb'))
    .sort();
} catch {
  console.error(`No such directory: ${modelsDir}`);
  console.error(`Create it and drop the .glb files in, then re-run.`);
  process.exit(1);
}

if (files.length === 0) {
  console.log(`No .glb files found in ${modelsDir}`);
  console.log('');
  console.log('Expected artifacts (from src/data/model-manifest.ts):');
  for (const entry of manifestFilesForHint()) console.log(`  ${entry}`);
  process.exit(0);
}

for (const file of files) {
  const path = join(modelsDir, file);
  const stat = statSync(path);
  if (!stat.isFile()) continue;

  const manifest = findManifestEntry(file);
  const report = checkFile(
    file,
    new Uint8Array(readFileSync(path)),
    manifest !== undefined,
    manifest?.isMetal,
  );
  reports.push(report);
}

console.log(`Model verification: ${modelsDir}`);
console.log('');
printTable(reports);

const problems = reports.flatMap((report) =>
  report.findings
    .filter((finding) => finding.severity === 'error')
    .map((finding) => `${report.file} [${finding.check}] ${finding.detail}`),
);
const warnings = reports.flatMap((report) =>
  report.findings
    .filter((finding) => finding.severity === 'warn')
    .map((finding) => `${report.file} [${finding.check}] ${finding.detail}`),
);

if (warnings.length) {
  console.log('');
  console.log(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
}

if (problems.length) {
  console.log('');
  console.log(`Errors (${problems.length}):`);
  for (const problem of problems) console.log(`  x ${problem}`);
}

const failed = reports.filter((report) => !report.ok);
console.log('');
console.log(
  `${reports.length - failed.length}/${reports.length} files pass ` +
    `(spec: <=${mb(MAX_FILE_BYTES)} MB, <=${MAX_TRIANGLES.toLocaleString()} tris, ` +
    `<=${MAX_TEXTURE_DIMENSION}px textures, bbox ${TARGET_LONGEST_EDGE}+/-${BBOX_TOLERANCE}, ` +
    `normal scale <=${MAX_NORMAL_SCALE}, extensions ${ALLOWED_EXTENSIONS.join('/')} only)`,
);

process.exit(problems.length > 0 ? 1 : 0);

function manifestFilesForHint(): string[] {
  return MODEL_MANIFEST.map((entry) => `${entry.file}  (${entry.label})`);
}
