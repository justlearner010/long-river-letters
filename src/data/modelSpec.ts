// Acceptance criteria for the 3D artifact models in `public/models/`.
//
// Compiled by Tripo3D, then run through `@gltf-transform/cli optimize`.
// The first test model came back at 53.75 MB / 1.9M triangles / 3x4096^2 JPEG,
// so these limits exist to catch that class of regression before it ships.
//
// Single source of truth for both `scripts/verify-models.ts` and
// `scripts/fix-models.ts`.

/** Largest acceptable .glb file, in bytes. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Largest acceptable triangle count per model. */
export const MAX_TRIANGLES = 30_000;

/** Largest acceptable texture edge, in pixels. */
export const MAX_TEXTURE_DIMENSION = 1024;

/** Longest edge of the world-space bounding box must be within this of 1.0. */
export const TARGET_LONGEST_EDGE = 1.0;
export const BBOX_TOLERANCE = 0.05;

/** Upper bound written onto `normalTexture.scale`. */
export const MAX_NORMAL_SCALE = 0.6;

/** `metallicFactor` for non-metal objects (terracotta, wood, stone, fabric, rubber). */
export const METALLIC_NON_METAL = 0;
/** `metallicFactor` for genuinely metal objects. */
export const METALLIC_METAL = 1;

/**
 * The only mesh extension `@google/model-viewer` may be asked to load.
 *
 * `KHR_mesh_quantization` requires no decoder: quantized attributes are plain
 * integer accessors that the renderer reads directly. Any other mesh extension
 * (`KHR_draco_mesh_compression`, `EXT_meshopt_compression`) needs a decoder
 * fetched over the network at runtime, which would break the app's
 * offline-capable guarantee.
 */
export const ALLOWED_EXTENSIONS: readonly string[] = ['KHR_mesh_quantization'];

export interface ModelSpecRow {
  metric: string;
  requirement: string;
}

export const MODEL_SPEC: readonly ModelSpecRow[] = [
  { metric: 'File size', requirement: '<= 2 MB' },
  { metric: 'Triangles', requirement: '<= 30,000' },
  { metric: 'Textures', requirement: '<= 1024 x 1024' },
  { metric: 'metallicFactor', requirement: '0, or 1 for the four metal artifacts' },
  { metric: 'Bounding box', requirement: 'longest edge 1.0 (+/- 0.05)' },
  { metric: 'normalTexture.scale', requirement: '<= 0.6' },
  { metric: 'Animations / skins', requirement: 'none' },
  {
    metric: 'extensionsUsed',
    requirement: 'KHR_mesh_quantization only (never KHR_draco_mesh_compression)',
  },
];
