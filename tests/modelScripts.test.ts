// Integration test for the model verify/fix CLI scripts.
//
// Builds synthetic GLBs in a temp directory with the wrong metallicFactor,
// runs scripts/fix-models.ts against them, then confirms scripts/verify-models.ts
// goes from failing to passing. No real Tripo3D assets are needed.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestGlb } from './helpers/buildGlb';
import { parseGlb } from '../src/lib/glb';

// Vitest runs with the project root as cwd.
const projectRoot = resolve(process.cwd());
const verifier = join(projectRoot, 'scripts/verify-models.ts');
const fixer = join(projectRoot, 'scripts/fix-models.ts');

let workDir: string;

/** Run a script, returning its exit code and combined output. */
function run(script: string, args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [join(projectRoot, 'node_modules/tsx/dist/cli.mjs'), script, ...args],
      { cwd: workDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: failure.status ?? 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'glb-tools-'));

  // Wrong on two counts: metallicFactor left at the glTF default of 1.0 on a
  // non-metal object, and a full-strength normal map.
  writeFileSync(
    join(workDir, 'plague-cross.glb'),
    buildTestGlb({
      triangles: 40,
      texture: { width: 64, height: 64 },
      metallicFactor: null,
      normalScale: null,
      extensionsUsed: ['KHR_mesh_quantization'],
    }).bytes,
  );

  // A metal object that is already correct; the fixer must leave it alone.
  writeFileSync(
    join(workDir, 'siege-cannonball.glb'),
    buildTestGlb({
      triangles: 40,
      texture: { width: 64, height: 64 },
      metallicFactor: 1,
      normalScale: 0.4,
      extensionsUsed: ['KHR_mesh_quantization'],
    }).bytes,
  );

  // Draco, which no amount of fixing may excuse.
  writeFileSync(
    join(workDir, 'weaving-shuttle.glb'),
    buildTestGlb({
      triangles: 40,
      texture: { width: 64, height: 64 },
      metallicFactor: 0,
      normalScale: 0.4,
      extensionsUsed: ['KHR_draco_mesh_compression'],
      extensionsRequired: ['KHR_draco_mesh_compression'],
      dracoPrimitiveExtension: true,
    }).bytes,
  );
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('verify-models CLI', () => {
  it('exits non-zero and names each broken check before repair', () => {
    const { code, output } = run(verifier, [workDir]);

    expect(code).toBe(1);
    expect(output).toContain('FAIL');
    // The two material problems on the non-metal object.
    expect(output).toContain('[metalness]');
    expect(output).toContain('[normal-scale]');
    expect(output).toMatch(/expected 0 for a non-metal object/);
    // Draco, with its explanation.
    expect(output).toContain('[draco]');
    expect(output).toMatch(/model-viewer cannot load Draco/);
    // And the file that is already fine must not be flagged.
    expect(output).toMatch(/siege-cannonball\.glb\s+[\d.]+ MB\s+40\s+120\s+.*PASS/);
  });
});

describe('fix-models CLI', () => {
  it('writes nothing during a dry run', () => {
    const before = readFileSync(join(workDir, 'weaving-shuttle.glb'));
    const { output } = run(fixer, [workDir]);

    expect(output).toContain('dry run');
    expect(output).toContain('WOULD');
    const after = readFileSync(join(workDir, 'weaving-shuttle.glb'));
    expect(Buffer.compare(before, after)).toBe(0);
  });

  it('skips a file absent from the manifest rather than guessing', () => {
    // `not-in-manifest.glb` is not in MODEL_MANIFEST.
    writeFileSync(
      join(workDir, 'not-in-manifest.glb'),
      buildTestGlb({ triangles: 4, metallicFactor: 0 }).bytes,
    );
    try {
      const { code, output } = run(fixer, [workDir]);
      expect(output).toContain('SKIP');
      expect(output).toContain('not listed in src/data/model-manifest.ts');
      expect(code).toBe(1);
    } finally {
      rmSync(join(workDir, 'not-in-manifest.glb'));
    }
  });

  it('repairs the material factors and preserves the BIN chunk byte-for-byte', () => {
    const path = join(workDir, 'weaving-shuttle.glb');
    const before = parseGlb(new Uint8Array(readFileSync(path)));

    const { output } = run(fixer, [workDir, '--write']);
    expect(output).toContain('FIXED');

    const parsed = parseGlb(new Uint8Array(readFileSync(path)));

    // The JSON chunk changed.
    expect(parsed.json.materials[0].pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(parsed.json.materials[0].normalTexture.scale).toBeLessThanOrEqual(0.6);

    // The BIN chunk did not.
    expect(parsed.bin!.byteLength).toBe(before.bin!.byteLength);
    expect(Array.from(parsed.bin!.subarray(0, before.bin!.byteLength))).toEqual(
      Array.from(before.bin!),
    );

    // And the container is still self-consistent: the header's declared length
    // matches the real file size.
    const raw = new Uint8Array(readFileSync(path));
    const rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    expect(rawView.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
    expect(rawView.getUint32(8, true)).toBe(raw.byteLength);
  });

  it('reports the already-correct file as OK', () => {
    const { output } = run(fixer, [workDir]);
    expect(output).toMatch(/OK\s+siege-cannonball\.glb\s+\(metal\) - already correct/);
  });

  it('leaves the fixed file passing, while Draco still fails', () => {
    const { code, output } = run(verifier, [workDir]);

    expect(code).toBe(1); // because of the Draco file only
    expect(output).toMatch(/plague-cross\.glb.*PASS/);
    expect(output).toMatch(/siege-cannonball\.glb.*PASS/);
    expect(output).toMatch(/weaving-shuttle\.glb.*FAIL/);

    const errors = output.split('Errors (')[1] ?? '';
    expect(errors).not.toContain('siege-cannonball');
    expect(errors).toContain('weaving-shuttle');
    expect(errors).toContain('KHR_draco_mesh_compression');
  });
});
