// ─────────────────────────────────────────────────────────────
//  Settings you can change without touching the rest of the code
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  // Leave as null to use the built-in stand-in stele.
  // To use a real 3D scan, put the file in the /models folder and set e.g.
  //   modelUrl: 'models/hammurabi.glb'   (or .gltf / .stl)
  modelUrl: null,

  // Many STL scans are "Z-up" (they lie on their back when loaded). If yours
  // loads lying down, change this to 'z'.
  modelUpAxis: 'y',

  // Extra spin (degrees) so the relief faces the student when placed.
  // Try 90, 180 or -90 if a real scan loads facing sideways or backwards.
  modelRotationDeg: 0,

  // Real stele height in metres. The model is scaled to match.
  realHeightMeters: 2.25,

  // "Table size" scale (0.25 = a quarter size, about 56 cm tall)
  tableScale: 0.25,

  // Colour used for STL scans (STL files have no colour of their own)
  stlColor: 0x2c2c30,
};
