/**
 * One fragment pass per frame:
 *   1. build the source colour for this dither cell (animated noise gradient + optional landscape)
 *   2. ordered-dither it down to `uLevels` per channel
 * The canvas is rendered at (viewport / pixelSize) and upscaled with `image-rendering: pixelated`,
 * so each fragment is exactly one dither cell.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

out vec4 outColor;

uniform vec2  uCells;        // canvas size in cells
uniform float uPixel;        // CSS px per cell
uniform vec2  uView;         // element size in CSS px
uniform float uNorm;         // CSS px that one noise unit spans (keeps blob size stable as the page grows)
uniform float uTime;

// gradient
uniform vec3  uStops[3];
uniform float uScale;
uniform float uWarp;
uniform float uOrganic;
uniform float uSpread;
uniform vec2  uDir;

// dither
uniform int   uAlgo;         // 0..3 bayer 2/4/8/16, 4 noise, 5 threshold
uniform float uLevels;
uniform float uContrast;
uniform float uBrightness;
uniform bool  uMono;
uniform vec3  uMonoColor;

// landscape (document-anchored image at the bottom of the page)
uniform bool      uLandOn;
uniform sampler2D uLand;
uniform sampler2D uLandMask;
uniform float     uLandTop;  // CSS px from top of the canvas
uniform float     uLandHeight;
uniform float     uLandAspect;
uniform vec3      uLandTint;
uniform float     uLandMix;

// ---------------------------------------------------------------- noise
vec3 hash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}

float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0));
  float n100 = dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0));
  float n010 = dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0));
  float n110 = dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0));
  float n001 = dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1));
  float n101 = dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1));
  float n011 = dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1));
  float n111 = dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z) * 1.1547;
}

float fbm(vec3 p) {
  float total = 0.0, amp = 1.0, weight = 0.0;
  for (int i = 0; i < 3; i++) {
    total += gnoise(p) * amp;
    weight += amp;
    p = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64) * p * 2.02 + vec3(3.7, 1.9, 6.3);
    amp *= 0.48;
  }
  return total / weight;
}

// ---------------------------------------------------------------- colour
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 toOklab(vec3 c) {
  vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619,
                  0.5363325363, 0.6806995451, 0.2817188376,
                  0.0514459929, 0.1073969566, 0.6299787005) * c;
  lms = pow(max(lms, vec3(0.0)), vec3(1.0 / 3.0));
  return mat3(0.2104542553, 1.9779984951, 0.0259040371,
              0.7936177850, -2.4285922050, 0.7827717662,
              -0.0040720468, 0.4505937099, -0.8086757660) * lms;
}
vec3 fromOklab(vec3 c) {
  vec3 lms = mat3(1.0, 1.0, 1.0,
                  0.3963377774, -0.1055613458, -0.0894841775,
                  0.2158037573, -0.0638541728, -1.2914855480) * c;
  lms = lms * lms * lms;
  return mat3(4.0767416621, -1.2684380046, -0.0041960863,
              -3.3077115913, 2.6097574011, -0.7034186147,
              0.2309699292, -0.3413193965, 1.7076147010) * lms;
}
vec3 mixOklab(vec3 a, vec3 b, float t) {
  return linearToSrgb(fromOklab(mix(toOklab(srgbToLinear(a)), toOklab(srgbToLinear(b)), t)));
}
vec3 gradientAt(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.5) return mixOklab(uStops[0], uStops[1], smoothstep(0.0, 1.0, t * 2.0));
  return mixOklab(uStops[1], uStops[2], smoothstep(0.0, 1.0, t * 2.0 - 1.0));
}

// ---------------------------------------------------------------- dither
float bayer(ivec2 p, int bits) {
  int r = 0;
  for (int i = 0; i < 4; i++) {
    if (i >= bits) break;
    int xb = (p.x >> i) & 1;
    int yb = (p.y >> i) & 1;
    r |= (((xb ^ yb) << 1) | yb) << (2 * (bits - 1 - i));
  }
  return (float(r) + 0.5) / float(1 << (2 * bits));
}

float threshold(ivec2 p) {
  if (uAlgo <= 3) return bayer(p, uAlgo + 1);
  if (uAlgo == 4) return fract(52.9829189 * fract(0.06711056 * float(p.x) + 0.00583715 * float(p.y)));
  return 0.5;
}

float quantize(float c, float th) {
  float L = uLevels - 1.0;
  return clamp(floor(c * L + th) / L, 0.0, 1.0);
}

// ---------------------------------------------------------------- main
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  cell.y = int(uCells.y) - 1 - cell.y;               // row 0 = top
  vec2 p = (vec2(cell) + 0.5) * uPixel;              // CSS px, top-left origin

  // Animated gradient field.
  vec3 q = vec3(p / max(uNorm, 1.0) * uScale, uTime * 0.12);
  vec3 w = vec3(gnoise(q * 0.55 + vec3(0.7, -1.1, 0.4 + uTime * 0.05)),
                gnoise(q * 0.55 + vec3(5.2, 1.3, 2.8 - uTime * 0.04)),
                0.0) * uWarp;
  float field = fbm(q + w) * 0.5 + 0.5;
  field = clamp((field - 0.5) * uSpread + 0.5, 0.0, 1.0);

  vec2 uv = p / uView - 0.5;
  float diag = dot(uv, uDir) / (abs(uDir.x) * 0.5 + abs(uDir.y) * 0.5) * 0.5 + 0.5;
  vec3 col = gradientAt(mix(diag, field, uOrganic));

  // Landscape: object-fit: cover across full width, faded in by its mask.
  if (uLandOn) {
    float ly = (p.y - uLandTop) / uLandHeight;
    if (ly >= 0.0 && ly <= 1.0) {
      float lx = p.x / uView.x;
      float boxAspect = uView.x / uLandHeight;
      vec2 st = vec2(lx, ly);
      if (boxAspect > uLandAspect) st.y = 0.5 + (ly - 0.5) * (uLandAspect / boxAspect);
      else st.x = 0.5 + (lx - 0.5) * (boxAspect / uLandAspect);
      vec4 land = texture(uLand, st);
      float mask = texture(uLandMask, vec2(0.5, ly)).a;
      col = mix(col, land.rgb * uLandTint, land.a * mask * uLandMix);
    }
  }

  col = clamp((col - 0.5) * uContrast + 0.5 + (uBrightness - 1.0) * 0.5, 0.0, 1.0);

  float th = threshold(cell);
  vec3 outc;
  if (uMono) {
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    outc = uMonoColor * quantize(l, th);
  } else {
    outc = vec3(quantize(col.r, th), quantize(col.g, th), quantize(col.b, th));
  }
  outColor = vec4(outc, 1.0);
}
`;
