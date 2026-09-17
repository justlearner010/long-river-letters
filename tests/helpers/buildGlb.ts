// Synthetic GLB fixtures for the model verify/fix tests.
//
// These build structurally valid binary glTF 2.0 files from scratch so the
// tooling can be exercised without any real Tripo3D assets on disk.

import { deflateSync } from 'node:zlib';

import {
  CHUNK_BIN,
  CHUNK_JSON,
  GLB_HEADER_BYTES,
  GLB_MAGIC,
} from '../../src/lib/glb';

// ---------------------------------------------------------------------------
// PNG generation
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

/** Build a genuinely valid, fully-decodable greyscale PNG of the given size. */
export function buildPng(width: number, height: number): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // One filter byte (0 = None) followed by `width` grey samples, per row.
  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x++) {
      raw[y * (width + 1) + 1 + x] = (x * 7 + y * 13) & 0xff;
    }
  }

  const parts = [
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ];

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// GLB generation
// ---------------------------------------------------------------------------

export interface TestGlbOptions {
  /** Number of triangles to emit (each triangle is 3 unique vertices). */
  triangles?: number;
  /** Embedded texture dimensions. Pass `null` for no texture. */
  texture?: { width: number; height: number } | null;
  /** Omit metallicFactor entirely to exercise the glTF default of 1.0. */
  metallicFactor?: number | null;
  /** Omit normalTexture.scale to exercise its default of 1.0. */
  normalScale?: number | null;
  /** Whether the material gets a normalTexture at all. */
  includeNormalTexture?: boolean;
  /** Entries written to extensionsUsed. */
  extensionsUsed?: string[];
  /** Also record those extensions in extensionsRequired. */
  extensionsRequired?: string[];
  /** Emit a Draco extension object on the primitive. */
  dracoPrimitiveExtension?: boolean;
  /** Extra node scale, applied on top of the auto-fit scale. */
  extraScale?: number;
  /** Number of animations to declare. */
  animations?: number;
  /** Number of skins to declare. */
  skins?: number;
  /** Asset generator string. */
  generator?: string | null;
  materialName?: string;
  /** Intentionally corrupt the header's declared length. */
  corruptLength?: number;
}

export interface BuiltGlb {
  bytes: Uint8Array;
  json: Record<string, any>;
  /** The logical (unpadded) BIN payload length. */
  binLength: number;
  /** Offset of the BIN chunk payload inside the file, for byte-for-byte checks. */
  binOffset: number;
}

export function buildTestGlb(options: TestGlbOptions = {}): BuiltGlb {
  const {
    triangles = 12,
    texture = { width: 1024, height: 1024 },
    metallicFactor = 1,
    normalScale = 1,
    includeNormalTexture = true,
    extensionsUsed = [],
    extensionsRequired = [],
    dracoPrimitiveExtension = false,
    extraScale = 1,
    animations = 0,
    skins = 0,
    generator = 'synthetic-test',
    materialName = 'TestMaterial',
  } = options;

  const vertexCount = triangles * 3;

  // --- geometry buffers ---------------------------------------------------
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    // A flat triangle grid spanning [0,1] on X/Y so min/max are meaningful.
    const t = i / 3;
    positions[i * 3 + 0] = t % 1;
    positions[i * 3 + 1] = Math.floor(t) % 2;
    positions[i * 3 + 2] = 0;
  }

  // Indices need Uint32 once past 65535 vertices.
  const useUint32 = vertexCount > 65535;
  const indices = useUint32 ? new Uint32Array(vertexCount) : new Uint16Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) indices[i] = i;

  const positionBytes = new Uint8Array(positions.buffer);
  const indexBytes = new Uint8Array(indices.buffer);
  const imageBytes = texture ? buildPng(texture.width, texture.height) : null;

  // --- buffer layout ------------------------------------------------------
  const segments: Uint8Array[] = [];
  const bufferViews: any[] = [];
  let cursor = 0;

  const pushSegment = (data: Uint8Array): number => {
    // Each bufferView must start on a 4-byte boundary.
    const padding = (4 - (data.byteLength % 4)) % 4;
    const index = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: cursor, byteLength: data.byteLength });
    segments.push(data);
    cursor += data.byteLength;
    if (padding) {
      segments.push(new Uint8Array(padding));
      cursor += padding;
    }
    return index;
  };

  const positionView = pushSegment(positionBytes);
  const indexView = pushSegment(indexBytes);
  const imageView = imageBytes ? pushSegment(imageBytes) : -1;

  const accessors: any[] = [
    {
      bufferView: positionView,
      componentType: 5126, // FLOAT
      count: vertexCount,
      type: 'VEC3',
      min: [0, 0, 0],
      max: [1, 1, 0],
    },
    {
      bufferView: indexView,
      componentType: useUint32 ? 5125 : 5123,
      count: vertexCount,
      type: 'SCALAR',
    },
  ];

  // --- material -----------------------------------------------------------
  const pbr: Record<string, unknown> = {};
  if (metallicFactor !== null) pbr.metallicFactor = metallicFactor;
  pbr.roughnessFactor = 0.8;

  if (imageBytes) {
    pbr.baseColorTexture = { index: 0 };
  }

  const material: Record<string, unknown> = {
    name: materialName,
    pbrMetallicRoughness: pbr,
  };

  if (includeNormalTexture) {
    const normalTexture: Record<string, unknown> = { index: 0 };
    if (normalScale !== null) normalTexture.scale = normalScale;
    material.normalTexture = normalTexture;
  }

  // --- JSON ---------------------------------------------------------------
  const images: any[] = [];
  const textures: any[] = [];

  if (imageBytes) {
    images.push({ name: 'baseColor', bufferView: imageView, mimeType: 'image/png' });
    textures.push({ source: 0 });
  }

  // A quantized model restores its real size through node scale, so the
  // auto-fit scale here mimics that: accessor spans 1 unit, node scales by 1.
  const sceneRootIndex = 0;

  const json: Record<string, any> = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [sceneRootIndex] }],
    nodes: [
      {
        name: 'Artifact',
        mesh: 0,
        scale: [extraScale, extraScale, extraScale],
      },
    ],
    meshes: [
      {
        name: 'ArtifactMesh',
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0,
            ...(dracoPrimitiveExtension
              ? { extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } } } }
              : {}),
          },
        ],
      },
    ],
    materials: [material],
    accessors,
    bufferViews,
    buffers: [{ byteLength: cursor }],
  };

  if (imageBytes) {
    json.images = images;
    json.textures = textures;
    json.samplers = [{ magFilter: 9729, minFilter: 9987 }];
  }
  if (generator) json.asset.generator = generator;
  if (extensionsUsed.length) json.extensionsUsed = [...extensionsUsed];
  if (extensionsRequired.length) json.extensionsRequired = [...extensionsRequired];
  if (animations) {
    json.animations = Array.from({ length: animations }, (_, i) => ({ name: `Anim${i}` }));
  }
  if (skins) {
    json.skins = Array.from({ length: skins }, (_, i) => ({ name: `Skin${i}`, joints: [] }));
  }

  // --- binary chunk -------------------------------------------------------
  const binLength = cursor;
  const bin = new Uint8Array(binLength);
  let binCursor = 0;
  for (const segment of segments) {
    bin.set(segment, binCursor);
    binCursor += segment.byteLength;
  }

  // --- container ----------------------------------------------------------
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = pad(jsonBytes, 0x20);
  const binPadded = pad(bin, 0x00);

  const total = GLB_HEADER_BYTES + 8 + jsonPadded.length + 8 + binPadded.length;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, options.corruptLength ?? total, true);

  let offset = GLB_HEADER_BYTES;
  view.setUint32(offset, jsonPadded.length, true);
  view.setUint32(offset + 4, CHUNK_JSON, true);
  out.set(jsonPadded, offset + 8);
  offset += 8 + jsonPadded.length;

  const binOffset = offset + 8;
  view.setUint32(offset, binPadded.length, true);
  view.setUint32(offset + 4, CHUNK_BIN, true);
  out.set(binPadded, binOffset);

  return { bytes: out, json, binLength, binOffset };
}

function pad(bytes: Uint8Array, fill: number): Uint8Array {
  const remainder = bytes.byteLength % 4;
  if (remainder === 0) return bytes;
  const padded = new Uint8Array(bytes.byteLength + (4 - remainder));
  padded.set(bytes);
  padded.fill(fill, bytes.byteLength);
  return padded;
}
