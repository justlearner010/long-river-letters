// The 16 artifact models in public/models/, matched to what was actually generated.
//
// `isMetal` drives the metallicFactor the fixer writes. Tripo3D leaves
// metallicFactor at the glTF default of 1.0, which makes terracotta render like
// chrome, so anything whose dominant material is clay, wood, stone, fibre or
// rubber must be corrected to 0.
//
// `label` is the human-readable artifact name, reused by the letter view.

export interface ModelManifestEntry {
  /** Filename inside public/models/. */
  file: string;
  /** Human-readable name, also used as the object-type key when fixing. */
  label: string;
  /** True only for artifacts whose dominant material is metal. */
  isMetal: boolean;
  /** Anchor event this artifact is attached to, when one applies. */
  anchorEventId?: string;
}

export const MODEL_MANIFEST: readonly ModelManifestEntry[] = [
  // --- metal artifacts -----------------------------------------------------
  { file: 'bronze-seal.glb', label: '青铜封印', isMetal: true },
  { file: 'byzantine-amulet.glb', label: '拜占庭护身符', isMetal: true, anchorEventId: 'e103' },
  { file: 'hand-cannon.glb', label: '青铜手铳', isMetal: true },
  { file: 'movable-type.glb', label: '金属活字', isMetal: true, anchorEventId: 'e113' },
  { file: 'siege-cannonball.glb', label: '攻城炮石', isMetal: true },
  { file: 'silver-dollar.glb', label: '西班牙银元', isMetal: true, anchorEventId: 'e135' },
  { file: 'adjustable-wrench.glb', label: '活动扳手', isMetal: true },

  // --- non-metal artifacts -------------------------------------------------
  { file: 'apothecary-scale.glb', label: '中药戥子', isMetal: false },
  { file: 'brick-tea.glb', label: '茶砖', isMetal: false, anchorEventId: 'e135' },
  { file: 'gas-mask.glb', label: '民用防毒面具', isMetal: false, anchorEventId: 'e190' },
  { file: 'hand-spindle.glb', label: '手工纺锤', isMetal: false },
  { file: 'plague-cross.glb', label: '瘟疫十字', isMetal: false, anchorEventId: 'e103' },
  { file: 'spinning-wheel.glb', label: '纺车', isMetal: false },
  { file: 'spyglass.glb', label: '单筒望远镜', isMetal: false },
  { file: 'votive-vessel.glb', label: '陶制还愿器皿', isMetal: false },
  { file: 'weaving-shuttle.glb', label: '飞梭', isMetal: false },
];

/** Lookup by filename, case-insensitive, for the fixer and verifier. */
export function findManifestEntry(
  file: string,
): ModelManifestEntry | undefined {
  const target = file.toLowerCase();
  return MODEL_MANIFEST.find((entry) => entry.file.toLowerCase() === target);
}
