// Binary glTF 2.0 (.glb) container parsing, inspection, and repair.
//
// Everything in this module is pure: it takes / returns Uint8Array and plain
// objects and never touches the filesystem, so it is unit-testable in jsdom.
//
// GLB layout (glTF 2.0 spec, section "GLB File Format Specification"):
//
//   header   magic 'glTF' (0x46546C67 u32 LE)
//            version     (u32 LE, must be 2)
//            length      (u32 LE, total file length INCLUDING this header)
//   chunk 0  chunkLength (u32 LE) | chunkType 'JSON' (0x4E4F534A) | payload
//   chunk 1  chunkLength (u32 LE) | chunkType 'BIN\0' (0x004E4942) | payload
//
// Each chunk payload is padded to a 4-byte boundary. The JSON chunk is padded
// with spaces (0x20); the BIN chunk is padded with zeros (0x00). Padding is
// included in chunkLength but is NOT part of the logical payload.
//
// Repairing a GLB by rewriting only the JSON chunk is safe because bufferView
// `byteOffset` values are relative to the start of the BIN chunk payload, so
// moving the BIN chunk within the file does not invalidate any of them.

export const GLB_MAGIC = 0x46546c67; // 'glTF'
export const CHUNK_JSON = 0x4e4f534a; // 'JSON'
export const CHUNK_BIN = 0x004e4942; // 'BIN\0'

export const KHR_DRACO = 'KHR_draco_mesh_compression';
export const KHR_MESH_QUANTIZATION = 'KHR_mesh_quantization';

export const GLB_HEADER_BYTES = 12;
export const CHUNK_HEADER_BYTES = 8;

// glTF JSON is a dynamic document. We keep a loose alias for readability and
// narrow at the point of use.
export type GltfJson = Record<string, any>;

export interface Glb {
  version: number;
  json: GltfJson;
  /** Parsed and 4-byte-padded BIN payload, or null when the GLB has no BIN chunk. */
  bin: Uint8Array | null;
}

/** Raised when a file is not a structurally valid GLB container. */
export class GlbParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlbParseError';
  }
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export function parseGlb(bytes: Uint8Array): Glb {
  if (bytes.byteLength < GLB_HEADER_BYTES) {
    throw new GlbParseError(`too short to be a GLB (${bytes.byteLength} bytes)`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    throw new GlbParseError(
      `bad magic 0x${magic.toString(16).padStart(8, '0')}, expected 0x${GLB_MAGIC.toString(16)} ('glTF')`,
    );
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new GlbParseError(`unsupported GLB version ${version}, expected 2`);
  }

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== bytes.byteLength) {
    throw new GlbParseError(
      `header declares ${declaredLength} bytes but file is ${bytes.byteLength} bytes`,
    );
  }

  let offset = GLB_HEADER_BYTES;
  let json: GltfJson | null = null;
  let bin: Uint8Array | null = null;

  while (offset + CHUNK_HEADER_BYTES <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const start = offset + CHUNK_HEADER_BYTES;
    const end = start + chunkLength;

    if (end > bytes.byteLength) {
      throw new GlbParseError(
        `chunk at byte ${offset} claims ${chunkLength} bytes, past end of file`,
      );
    }

    const payload = bytes.subarray(start, end);

    if (chunkType === CHUNK_JSON) {
      if (json) throw new GlbParseError('more than one JSON chunk');
      // Padding bytes are 0x20 spaces; trimming them is harmless either way.
      const text = new TextDecoder().decode(payload);
      try {
        json = JSON.parse(text) as GltfJson;
      } catch (error) {
        throw new GlbParseError(`JSON chunk is not valid JSON: ${(error as Error).message}`);
      }
    } else if (chunkType === CHUNK_BIN) {
      if (bin) throw new GlbParseError('more than one BIN chunk');
      bin = payload;
    }
    // Unknown chunk types are legal and ignored per spec.

    offset = end;
  }

  if (!json) throw new GlbParseError('no JSON chunk found');

  return { version, json, bin };
}

/**
 * Rebuild a GLB from a glTF JSON document and an optional BIN payload.
 *
 * The BIN bytes are copied verbatim (only zero padding is appended when the
 * length is not already a multiple of 4), and the header length is recomputed
 * from the actual chunk sizes.
 */
export function serializeGlb(json: GltfJson, bin: Uint8Array | null): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = padTo4(jsonBytes, 0x20);
  const binPadded = bin ? padTo4(bin, 0x00) : null;

  const total =
    GLB_HEADER_BYTES +
    CHUNK_HEADER_BYTES +
    jsonPadded.byteLength +
    (binPadded ? CHUNK_HEADER_BYTES + binPadded.byteLength : 0);

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  const chunks: GlbChunk[] = [{ type: CHUNK_JSON, data: jsonPadded }];
  if (binPadded) chunks.push({ type: CHUNK_BIN, data: binPadded });

  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  let offset = GLB_HEADER_BYTES;
  for (const chunk of chunks) {
    view.setUint32(offset, chunk.data.byteLength, true);
    view.setUint32(offset + 4, chunk.type, true);
    out.set(chunk.data, offset + CHUNK_HEADER_BYTES);
    offset += CHUNK_HEADER_BYTES + chunk.data.byteLength;
  }

  return out;
}

export interface GlbChunk {
  type: number;
  data: Uint8Array;
}

function padTo4(bytes: Uint8Array, fill: number): Uint8Array {
  const remainder = bytes.byteLength % 4;
  if (remainder === 0) return bytes;
  const padded = new Uint8Array(bytes.byteLength + (4 - remainder));
  padded.set(bytes);
  padded.fill(fill, bytes.byteLength);
  return padded;
}

// ---------------------------------------------------------------------------
// Image dimensions
// ---------------------------------------------------------------------------

export interface ImageSize {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

/**
 * Read pixel dimensions straight out of an encoded image buffer.
 *
 * Supports PNG (IHDR) and JPEG (SOF marker). No decoding is performed, so this
 * is cheap enough to run over every texture in a batch.
 */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  return pngSize(bytes) ?? jpegSize(bytes);
}

function pngSize(bytes: Uint8Array): ImageSize | null {
  // 89 50 4E 47 0D 0A 1A 0A
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.byteLength < 24) return null;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return null;
  }
  // The first chunk after the signature must be IHDR.
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20), format: 'png' };
}

function jpegSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < bytes.byteLength) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];

    // Fill bytes: a run of 0xFF is legal padding before a marker.
    if (marker === 0xff) {
      i++;
      continue;
    }
    // Standalone markers carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }

    const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];

    // SOF0..SOF15, excluding DHT (0xC4), JPG (0xC8) and DAC (0xCC).
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height, format: 'jpeg' };
    }

    if (marker === 0xda) break; // start of scan: image data follows, no more headers

    i += 2 + segmentLength;
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4x4 column-major matrix helpers (glTF stores `node.matrix` column-major)
// ---------------------------------------------------------------------------

export type Mat4 = number[];
export type Vec3 = [number, number, number];

export function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

/** Narrow a glTF JSON array field to a fixed-length numeric tuple. */
function vec3(value: unknown, fallback: Vec3): Vec3 {
  return Array.isArray(value) && value.length === 3 ? (value as Vec3) : fallback;
}

function vecN(value: unknown, fallback: Mat4): Mat4 {
  return Array.isArray(value) ? (value as Mat4) : fallback;
}

/** Build a node's local matrix from either `matrix` or translation/rotation/scale. */
export function nodeLocalMatrix(node: GltfJson): Mat4 {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return node.matrix.slice() as Mat4;
  }
  const t = vec3(node.translation, [0, 0, 0]);
  const r = vecN(node.rotation, [0, 0, 0, 1]);
  const s = vec3(node.scale, [1, 1, 1]);

  const [x, y, z, w] = r;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface TextureReport {
  index: number;
  name: string;
  width: number;
  height: number;
  format: string;
  /** True when dimensions could not be determined (e.g. KTX2 or external URI). */
  unverified: boolean;
}

export interface MaterialReport {
  index: number;
  name: string;
  /** Effective metallicFactor, applying the glTF default of 1.0 when absent. */
  metallicFactor: number;
  /** True when metallicFactor was absent from the JSON and defaulted. */
  metallicFactorDefaulted: boolean;
  /** Effective normalTexture.scale, applying the glTF default of 1.0 when absent. */
  normalScale: number | null;
  normalScaleDefaulted: boolean;
  hasMetallicRoughnessTexture: boolean;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  size: Vec3;
  longestEdge: number;
}

export interface ModelMetrics {
  bytes: number;
  triangles: number;
  vertices: number;
  meshes: number;
  primitives: number;
  materials: MaterialReport[];
  textures: TextureReport[];
  maxTextureDimension: number;
  bbox: BoundingBox | null;
  animations: number;
  skins: number;
  extensionList: string[];
  requiredExtensions: string[];
  /** Locations (extensionsUsed / extensionsRequired / primitive.extensions) where Draco appears. */
  dracoLocations: string[];
  generator: string | null;
  nodesWithMesh: number;
}

export function analyzeModel(json: GltfJson, bytes: number, bin: Uint8Array | null = null): ModelMetrics {
  const accessors: GltfJson[] = json.accessors ?? [];
  const meshes: GltfJson[] = json.meshes ?? [];
  const materials: GltfJson[] = json.materials ?? [];
  const nodes: GltfJson[] = json.nodes ?? [];
  const scenes: GltfJson[] = json.scenes ?? [];

  // --- geometry -----------------------------------------------------------
  // Triangles come from the index accessor when present, otherwise the vertex
  // position accessor is an implicit triangle list.
  let triangles = 0;
  let primitives = 0;
  const vertexAccessors = new Set<number>();

  for (const mesh of meshes) {
    for (const primitive of mesh.primitives ?? []) {
      primitives++;
      const indices = primitive.indices;
      if (typeof indices === 'number' && accessors[indices]) {
        triangles += Math.floor(accessors[indices].count / 3);
      } else {
        const position = primitive.attributes?.POSITION;
        if (typeof position === 'number' && accessors[position]) {
          triangles += Math.floor(accessors[position].count / 3);
        }
      }
      const position = primitive.attributes?.POSITION;
      if (typeof position === 'number') vertexAccessors.add(position);
    }
  }

  let vertices = 0;
  for (const index of vertexAccessors) vertices += accessors[index]?.count ?? 0;

  // --- materials ----------------------------------------------------------
  const materialReports: MaterialReport[] = materials.map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const defaulted = pbr.metallicFactor === undefined;
    const normal = material.normalTexture;
    const normalDefaulted = normal !== undefined && normal.scale === undefined;
    return {
      index,
      name: material.name ?? `material_${index}`,
      metallicFactor: defaulted ? 1.0 : pbr.metallicFactor,
      metallicFactorDefaulted: defaulted,
      normalScale: normal === undefined ? null : normalDefaulted ? 1.0 : normal.scale,
      normalScaleDefaulted: normalDefaulted,
      hasMetallicRoughnessTexture: pbr.metallicRoughnessTexture !== undefined,
    };
  });

  // --- textures -----------------------------------------------------------
  const textures: TextureReport[] = (json.textures ?? []).map((texture: GltfJson, index: number) => {
    const sourceIndex = texture.source;
    const image = sourceIndex === undefined ? undefined : (json.images ?? [])[sourceIndex];
    const name = image?.name ?? texture.name ?? `texture_${index}`;
    if (!image) {
      return { index, name, width: 0, height: 0, format: 'unknown', unverified: true };
    }
    const imageBytes = resolveImageBytes(json, image, bin);
    if (!imageBytes) {
      return {
        index,
        name,
        width: 0,
        height: 0,
        format: image.mimeType ?? 'external',
        unverified: true,
      };
    }
    const size = imageSize(imageBytes);
    if (!size) {
      return {
        index,
        name,
        width: 0,
        height: 0,
        format: image.mimeType ?? 'unknown',
        unverified: true,
      };
    }
    return { index, name, ...size, unverified: false };
  });

  const maxTextureDimension = textures.reduce(
    (max, texture) => Math.max(max, texture.width, texture.height),
    0,
  );

  // --- bounding box -------------------------------------------------------
  const bbox = computeBoundingBox(json, nodes, scenes, meshes, accessors);

  // --- extensions ---------------------------------------------------------
  const extensionList: string[] = json.extensionsUsed ?? [];
  const requiredExtensions: string[] = json.extensionsRequired ?? [];

  const dracoLocations: string[] = [];
  if (extensionList.includes(KHR_DRACO)) dracoLocations.push('extensionsUsed');
  if (requiredExtensions.includes(KHR_DRACO)) dracoLocations.push('extensionsRequired');
  for (let m = 0; m < meshes.length; m++) {
    const meshPrimitives: GltfJson[] = meshes[m].primitives ?? [];
    for (let p = 0; p < meshPrimitives.length; p++) {
      if (meshPrimitives[p].extensions?.[KHR_DRACO]) {
        dracoLocations.push(`meshes[${m}].primitives[${p}].extensions`);
      }
    }
  }

  return {
    bytes,
    triangles,
    vertices,
    meshes: meshes.length,
    primitives,
    materials: materialReports,
    textures,
    maxTextureDimension,
    bbox,
    animations: (json.animations ?? []).length,
    skins: (json.skins ?? []).length,
    extensionList,
    requiredExtensions,
    dracoLocations,
    generator: json.asset?.generator ?? null,
    nodesWithMesh: nodes.filter((node) => node.mesh !== undefined).length,
  };
}

/**
 * Compute the world-space bounding box.
 *
 * This walks the scene graph rather than reading raw accessor min/max, because
 * `KHR_mesh_quantization` stores POSITION as small integers and restores the
 * real size through a node scale. Reading the accessor min/max alone would
 * report a box ~32767 units wide for a correctly quantized, unit-sized model.
 */
function computeBoundingBox(
  json: GltfJson,
  nodes: GltfJson[],
  scenes: GltfJson[],
  meshes: GltfJson[],
  accessors: GltfJson[],
): BoundingBox | null {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  // Fall back to walking every node when the file declares no scene.
  const sceneRoots: number[] =
    scenes.length > 0 ? (scenes[json.scene ?? 0]?.nodes ?? []) : nodes.map((_, i) => i);

  const seen = new Set<number>();

  const visit = (nodeIndex: number, parentMatrix: Mat4): void => {
    if (seen.has(nodeIndex)) return; // guard against a malformed cyclic graph
    seen.add(nodeIndex);

    const node = nodes[nodeIndex];
    if (!node) return;

    const world = multiply(parentMatrix, nodeLocalMatrix(node));

    if (typeof node.mesh === 'number') {
      const mesh = meshes[node.mesh];
      for (const primitive of mesh?.primitives ?? []) {
        const positionIndex = primitive.attributes?.POSITION;
        if (typeof positionIndex !== 'number') continue;
        const accessor = accessors[positionIndex];
        if (!accessor?.min || !accessor?.max) continue;

        const localMin: Vec3 = accessor.min;
        const localMax: Vec3 = accessor.max;
        // Transform all 8 corners: a rotation would otherwise shrink the box.
        for (let corner = 0; corner < 8; corner++) {
          const point: Vec3 = [
            corner & 1 ? localMax[0] : localMin[0],
            corner & 2 ? localMax[1] : localMin[1],
            corner & 4 ? localMax[2] : localMin[2],
          ];
          const world_ = transformPoint(world, point);
          for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], world_[axis]);
            max[axis] = Math.max(max[axis], world_[axis]);
          }
        }
      }
    }

    for (const child of node.children ?? []) visit(child, world);
  };

  for (const root of sceneRoots) visit(root, identity());

  if (!Number.isFinite(min[0])) return null;

  const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { min, max, size, longestEdge: Math.max(size[0], size[1], size[2]) };
}

/** The single GLB buffer payload, reconstructed from the file's chunks. */
function resolveImageBytes(
  json: GltfJson,
  image: GltfJson,
  bin: Uint8Array | null,
): Uint8Array | null {
  if (typeof image.bufferView === 'number') {
    const bufferView = (json.bufferViews ?? [])[image.bufferView];
    if (!bufferView || !bin) return null;
    const start = bufferView.byteOffset ?? 0;
    return bin.subarray(start, start + bufferView.byteLength);
  }
  if (typeof image.uri === 'string' && image.uri.startsWith('data:')) {
    const comma = image.uri.indexOf(',');
    if (comma === -1) return null;
    const meta = image.uri.slice(5, comma);
    const payload = image.uri.slice(comma + 1);
    if (/;base64/i.test(meta)) return base64ToBytes(payload);
    return new TextEncoder().encode(decodeURIComponent(payload));
  }
  return null;
}

function base64ToBytes(base64: string): Uint8Array | null {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  const buffer = (globalThis as any).Buffer;
  if (buffer) return new Uint8Array(buffer.from(base64, 'base64'));
  return null;
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

export interface FixOptions {
  /** Whether the object is genuinely metal. Non-metal objects get metallicFactor 0. */
  isMetal: boolean;
  /** Upper bound applied to normalTexture.scale. */
  normalScaleMax: number;
}

export interface FixChange {
  path: string;
  from: string;
  to: string;
}

/**
 * Apply the mechanical material fixes in place.
 *
 * Returns the list of changes made, so callers can report them and so tests can
 * assert on an exact set.
 */
export function applyModelFixes(json: GltfJson, options: FixOptions): FixChange[] {
  const changes: FixChange[] = [];
  const materials: GltfJson[] = json.materials ?? [];

  for (let index = 0; index < materials.length; index++) {
    const material = materials[index];

    // --- metallicFactor ---------------------------------------------------
    // glTF defaults metallicFactor to 1.0 when the property is omitted, which
    // is why Tripo output renders terracotta as chrome. Always write the value
    // explicitly so the intent survives further tooling.
    const targetMetallic = options.isMetal ? 1.0 : 0.0;
    material.pbrMetallicRoughness = material.pbrMetallicRoughness ?? {};
    const pbr = material.pbrMetallicRoughness;
    const current = pbr.metallicFactor;
    const effective = current === undefined ? 1.0 : current;

    if (effective !== targetMetallic) {
      changes.push({
        path: `materials[${index}](${material.name ?? index}).pbrMetallicRoughness.metallicFactor`,
        from: current === undefined ? `default 1` : String(current),
        to: String(targetMetallic),
      });
      pbr.metallicFactor = targetMetallic;
    }

    // --- normalTexture.scale ---------------------------------------------
    // Also defaults to 1.0. An absent scale is still a violation of the
    // "keep normal maps weak" rule, so it gets written explicitly too.
    const normal = material.normalTexture;
    if (normal !== undefined) {
      const currentScale = normal.scale;
      const effectiveScale = currentScale === undefined ? 1.0 : currentScale;
      if (effectiveScale > options.normalScaleMax) {
        changes.push({
          path: `materials[${index}](${material.name ?? index}).normalTexture.scale`,
          from: currentScale === undefined ? `default 1` : String(currentScale),
          to: String(options.normalScaleMax),
        });
        normal.scale = options.normalScaleMax;
      }
    }
  }

  return changes;
}
