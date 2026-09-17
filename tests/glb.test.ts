import { describe, expect, it } from 'vitest';

import {
  CHUNK_BIN,
  CHUNK_JSON,
  GLB_MAGIC,
  GlbParseError,
  analyzeModel,
  applyModelFixes,
  imageSize,
  parseGlb,
  serializeGlb,
} from '../src/lib/glb';
import { buildPng, buildTestGlb } from './helpers/buildGlb';
import {
  MAX_FILE_BYTES,
  MAX_NORMAL_SCALE,
  MAX_TEXTURE_DIMENSION,
  MAX_TRIANGLES,
} from '../src/data/modelSpec';
import { MODEL_MANIFEST, findManifestEntry } from '../src/data/model-manifest';

describe('glb container', () => {
  it('round-trips a synthetic GLB through parse and serialize', () => {
    const built = buildTestGlb({ triangles: 4 });
    const parsed = parseGlb(built.bytes);
    const again = serializeGlb(parsed.json, parsed.bin);

    const reparsed = parseGlb(again);
    expect(reparsed.version).toBe(2);
    expect(reparsed.json.meshes).toHaveLength(1);
    expect(reparsed.bin?.byteLength).toBe(parsed.bin?.byteLength);
  });

  it('preserves the BIN payload byte-for-byte across a rewrite', () => {
    const built = buildTestGlb({ triangles: 4, texture: { width: 64, height: 64 } });
    const parsed = parseGlb(built.bytes);
    const before = parsed.bin!.slice();

    applyModelFixes(parsed.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    const rewritten = serializeGlb(parsed.json, parsed.bin);
    const after = parseGlb(rewritten).bin!;

    expect(after.byteLength).toBe(before.byteLength);
    expect(Array.from(after.subarray(0, before.byteLength))).toEqual(Array.from(before));
  });

  it('keeps the declared header length in sync with the real file size', () => {
    const built = buildTestGlb({ triangles: 4, metallicFactor: 0, normalScale: 0.5 });
    const parsed = parseGlb(built.bytes);
    const rewritten = serializeGlb(parsed.json, parsed.bin);

    const view = new DataView(rewritten.buffer, rewritten.byteOffset, rewritten.byteLength);
    expect(view.getUint32(0, true)).toBe(GLB_MAGIC);
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(rewritten.byteLength);
    expect(rewritten.byteLength % 4).toBe(0);
  });

  it('writes the JSON chunk before the BIN chunk with correct chunk types', () => {
    const built = buildTestGlb({ triangles: 4 });
    const view = new DataView(built.bytes.buffer, built.bytes.byteOffset, built.bytes.byteLength);
    expect(view.getUint32(16, true)).toBe(CHUNK_JSON);
    expect(view.getUint32(built.binOffset - 4, true)).toBe(CHUNK_BIN);
  });

  it('rejects a file whose declared length is wrong', () => {
    const built = buildTestGlb({ triangles: 4, corruptLength: 999999 });
    expect(() => parseGlb(built.bytes)).toThrow(GlbParseError);
  });

  it('rejects a file with the wrong magic', () => {
    const built = buildTestGlb({ triangles: 4 });
    built.bytes[0] = 0x00;
    expect(() => parseGlb(built.bytes)).toThrow(/bad magic/);
  });

  it('rejects a truncated file', () => {
    expect(() => parseGlb(new Uint8Array([1, 2, 3]))).toThrow(/too short/);
  });
});

describe('image dimension parsing', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    expect(imageSize(buildPng(1024, 512))).toEqual({ width: 1024, height: 512, format: 'png' });
    expect(imageSize(buildPng(4096, 4096))).toEqual({
      width: 4096,
      height: 4096,
      format: 'png',
    });
  });

  it('reads JPEG dimensions across varied APPn / SOF markers', () => {
    const jpeg = buildJpeg(2048, 1536, [0xe0, 0xe1, 0xdb]);
    expect(imageSize(jpeg)).toEqual({ width: 2048, height: 1536, format: 'jpeg' });

    const progressive = buildJpeg(300, 200, [0xe0], 0xc2);
    expect(imageSize(progressive)).toEqual({ width: 300, height: 200, format: 'jpeg' });
  });

  it('returns null for unrecognised data', () => {
    expect(imageSize(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]))).toBeNull();
  });
});

describe('analyzeModel', () => {
  it('counts triangles from the index accessor', () => {
    const built = buildTestGlb({ triangles: 1234 });
    const metrics = analyzeModel(parseGlb(built.bytes).json, built.bytes.byteLength);
    expect(metrics.triangles).toBe(1234);
    expect(metrics.vertices).toBe(3702);
  });

  it('falls back to POSITION count when a primitive is unindexed', () => {
    const built = buildTestGlb({ triangles: 30 });
    delete built.json.meshes[0].primitives[0].indices;
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.triangles).toBe(30);
  });

  it('reads embedded texture dimensions out of the BIN chunk', () => {
    const built = buildTestGlb({ texture: { width: 4096, height: 4096 } });
    const parsed = parseGlb(built.bytes);
    const metrics = analyzeModel(parsed.json, built.bytes.byteLength, parsed.bin);

    expect(metrics.textures).toHaveLength(1);
    expect(metrics.textures[0]).toMatchObject({ width: 4096, height: 4096, unverified: false });
    expect(metrics.maxTextureDimension).toBe(4096);
  });

  it('applies the glTF default of 1.0 for an absent metallicFactor', () => {
    const built = buildTestGlb({ metallicFactor: null });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.materials[0].metallicFactor).toBe(1);
    expect(metrics.materials[0].metallicFactorDefaulted).toBe(true);
  });

  it('applies the default of 1.0 for an absent normalTexture.scale', () => {
    const built = buildTestGlb({ normalScale: null });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.materials[0].normalScale).toBe(1);
    expect(metrics.materials[0].normalScaleDefaulted).toBe(true);
  });

  it('detects Draco in extensionsUsed and on the primitive', () => {
    const built = buildTestGlb({
      extensionsUsed: ['KHR_draco_mesh_compression'],
      dracoPrimitiveExtension: true,
    });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.dracoLocations).toContain('extensionsUsed');
    expect(metrics.dracoLocations.some((location) => location.includes('primitives'))).toBe(true);
  });

  it('detects animations and skins', () => {
    const built = buildTestGlb({ animations: 2, skins: 1 });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.animations).toBe(2);
    expect(metrics.skins).toBe(1);
  });

  it('computes the bounding box in world space, including node scale', () => {
    // Accessor spans 1 unit; the quantized-style node scale must be applied.
    const built = buildTestGlb({ extraScale: 1 });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.bbox).not.toBeNull();
    expect(metrics.bbox!.longestEdge).toBeCloseTo(1, 5);

    const scaled = buildTestGlb({ extraScale: 32767 });
    const scaledMetrics = analyzeModel(scaled.json, 0);
    expect(scaledMetrics.bbox!.longestEdge).toBeCloseTo(32767, 0);
  });

  it('follows child nodes and accumulates their transforms', () => {
    const built = buildTestGlb({ triangles: 6 });
    built.json.nodes = [
      { name: 'Root', children: [1], scale: [0.5, 0.5, 0.5] },
      { name: 'Child', mesh: 0 },
    ];
    built.json.scenes = [{ nodes: [0] }];
    const metrics = analyzeModel(built.json, 0);
    // accessor spans 1 unit, root scales by 0.5
    expect(metrics.bbox!.longestEdge).toBeCloseTo(0.5, 5);
  });

  it('ignores nodes that are not reachable from the scene', () => {
    const built = buildTestGlb({ triangles: 6 });
    built.json.nodes.push({ name: 'Orphan', mesh: 0, scale: [100, 100, 100] });
    const metrics = analyzeModel(built.json, 0);
    expect(metrics.bbox!.longestEdge).toBeCloseTo(1, 5);
  });
});

describe('applyModelFixes', () => {
  it('sets metallicFactor to 0 for a non-metal object', () => {
    const built = buildTestGlb({ metallicFactor: 1 });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });

    expect(built.json.materials[0].pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(changes.map((change) => change.path)).toContain(
      'materials[0](TestMaterial).pbrMetallicRoughness.metallicFactor',
    );
  });

  it('sets metallicFactor to 1 for a metal object', () => {
    const built = buildTestGlb({ metallicFactor: 0 });
    applyModelFixes(built.json, { isMetal: true, normalScaleMax: MAX_NORMAL_SCALE });
    expect(built.json.materials[0].pbrMetallicRoughness.metallicFactor).toBe(1);
  });

  it('writes metallicFactor when the property is absent (glTF default 1.0)', () => {
    const built = buildTestGlb({ metallicFactor: null });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });

    expect(built.json.materials[0].pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(changes.find((c) => c.path.includes('metallicFactor'))?.from).toBe('default 1');
  });

  it('leaves an already-correct file untouched and reports no changes', () => {
    const built = buildTestGlb({ metallicFactor: 0, normalScale: 0.5 });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    expect(changes).toEqual([]);
  });

  it('clamps normalTexture.scale above the maximum', () => {
    const built = buildTestGlb({ normalScale: 1.0, metallicFactor: 0 });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });

    expect(built.json.materials[0].normalTexture.scale).toBe(MAX_NORMAL_SCALE);
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toContain('normalTexture.scale');
  });

  it('clamps an absent normalTexture.scale, since the default is 1.0', () => {
    const built = buildTestGlb({ normalScale: null, metallicFactor: 0 });
    applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    expect(built.json.materials[0].normalTexture.scale).toBe(MAX_NORMAL_SCALE);
  });

  it('preserves a normalTexture.scale already at or below the maximum', () => {
    const built = buildTestGlb({ normalScale: 0.25, metallicFactor: 0 });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    expect(built.json.materials[0].normalTexture.scale).toBe(0.25);
    expect(changes).toEqual([]);
  });

  it('handles a material with no normalTexture', () => {
    const built = buildTestGlb({ includeNormalTexture: false, metallicFactor: 1 });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    expect(changes).toHaveLength(1);
    expect(built.json.materials[0].normalTexture).toBeUndefined();
  });

  it('fixes every material in a multi-material file', () => {
    const built = buildTestGlb({ metallicFactor: 1 });
    built.json.materials.push({
      name: 'Second',
      pbrMetallicRoughness: { metallicFactor: 1 },
      normalTexture: { index: 0, scale: 1 },
    });
    const changes = applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    expect(changes).toHaveLength(4);
    expect(built.json.materials[1].pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(built.json.materials[1].normalTexture.scale).toBe(MAX_NORMAL_SCALE);
  });
});

describe('end-to-end repair (the fixer must make a broken file pass)', () => {
  it('takes a Tripo-like file from failing to passing every check the fixer owns', () => {
    // Reproduces the failure mode: metallicFactor left at the default 1.0 on a
    // terracotta object, and a full-strength normal map.
    const built = buildTestGlb({
      triangles: 900,
      metallicFactor: null,
      normalScale: 1.0,
    });

    const before = analyzeModel(built.json, built.bytes.byteLength, parseGlb(built.bytes).bin);
    expect(before.materials[0].metallicFactor).toBe(1); // wrong for terracotta
    expect(before.materials[0].normalScale).toBe(1.0); // above spec

    applyModelFixes(built.json, { isMetal: false, normalScaleMax: MAX_NORMAL_SCALE });
    const repaired = serializeGlb(built.json, parseGlb(built.bytes).bin);
    const parsed = parseGlb(repaired);
    const after = analyzeModel(parsed.json, repaired.byteLength, parsed.bin);

    expect(after.materials[0].metallicFactor).toBe(0);
    expect(after.materials[0].normalScale).toBeLessThanOrEqual(MAX_NORMAL_SCALE);
    expect(after.triangles).toBe(900);

    // And the file is still a valid, re-parseable GLB.
    expect(parseGlb(repaired).version).toBe(2);
  });

  it('leaves size, triangle and texture problems for gltf-transform to solve', () => {
    // The fixer must not silently pretend a 1.9M-triangle file is fine.
    const built = buildTestGlb({ triangles: 1_908_837 > 65535 * 3 ? 70_000 : 70_000 });
    const metrics = analyzeModel(parseGlb(built.bytes).json, built.bytes.byteLength);
    expect(metrics.triangles).toBeGreaterThan(MAX_TRIANGLES);
    expect(MAX_FILE_BYTES).toBe(2 * 1024 * 1024);
    expect(MAX_TEXTURE_DIMENSION).toBe(1024);
  });
});

describe('model manifest', () => {
  it('lists 16 artifacts', () => {
    expect(MODEL_MANIFEST).toHaveLength(16);
  });

  it('marks exactly the metal artifacts as metal', () => {
    const metal = MODEL_MANIFEST.filter((entry) => entry.isMetal);
    expect(metal.map((entry) => entry.file).sort()).toEqual(
      [
        'adjustable-wrench.glb',
        'bronze-seal.glb',
        'byzantine-amulet.glb',
        'hand-cannon.glb',
        'movable-type.glb',
        'siege-cannonball.glb',
        'silver-dollar.glb',
      ].sort(),
    );
  });

  it('uses unique filenames ending in .glb', () => {
    const files = MODEL_MANIFEST.map((entry) => entry.file);
    expect(new Set(files).size).toBe(files.length);
    for (const file of files) expect(file.endsWith('.glb')).toBe(true);
  });

  it('resolves filenames case-insensitively', () => {
    expect(findManifestEntry('BRONZE-SEAL.GLB')?.isMetal).toBe(true);
    expect(findManifestEntry('nope.glb')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// A minimal but genuinely valid baseline JPEG, built marker by marker.
// ---------------------------------------------------------------------------

function buildJpeg(
  width: number,
  height: number,
  appMarkers: number[],
  sofMarker = 0xc0,
): Uint8Array {
  const segments: number[][] = [];

  for (const marker of appMarkers) {
    const payload = [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
    segments.push([0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload]);
  }

  // DQT (0xDB) with a token 65-byte table.
  const dqt = new Array(65).fill(0x10);
  segments.push([0xff, 0xdb, ((dqt.length + 2) >> 8) & 0xff, (dqt.length + 2) & 0xff, ...dqt]);

  // SOF: length 17, precision 8, height, width, 3 components.
  const sof = [
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  ];
  segments.push([0xff, sofMarker, ((sof.length + 2) >> 8) & 0xff, (sof.length + 2) & 0xff, ...sof]);

  const bytes: number[] = [0xff, 0xd8];
  for (const segment of segments) bytes.push(...segment);
  bytes.push(0xff, 0xda, 0x00, 0x02); // SOS with no payload, then EOF
  bytes.push(0xff, 0xd9);

  return new Uint8Array(bytes);
}
