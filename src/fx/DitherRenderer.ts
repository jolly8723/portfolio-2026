import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import { DITHER_ALGORITHMS, type DitherParams, type GradientParams } from './params';
import { THEME_TRANSITION_MS, hexToRgb, type RGB } from '../theme/themes';

export interface LandscapeSource {
  image: TexImageSource;
  mask: TexImageSource;
  aspect: number;
}

export interface LandscapeFrame {
  /** CSS px from the canvas top. */
  top: number;
  height: number;
}

type Palette = RGB[];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Owns one WebGL2 canvas. Callers push params/palettes; `frame()` draws.
 * Palette and landscape tint changes tween over THEME_TRANSITION_MS so theme
 * switches crossfade in step with the CSS token transitions.
 */
export class DitherRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private landTex: WebGLTexture | null = null;
  private maskTex: WebGLTexture | null = null;
  private landAspect = 1;

  private dither!: DitherParams;
  private gradient!: GradientParams;
  private time = 0;

  private palette: Palette | null = null;
  private paletteFrom: Palette | null = null;
  private paletteTo: Palette | null = null;
  private tint: RGB = [1, 1, 1];
  private tintFrom: RGB = [1, 1, 1];
  private tintTo: RGB = [1, 1, 1];
  private landMix = 1;
  private landMixFrom = 1;
  private landMixTo = 1;
  private tweenStart = 0;

  private canvas: HTMLCanvasElement;
  private buffer: WebGLBuffer | null = null;

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.program = this.link();
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * `partial: true` keeps the drawing buffer between frames so `frame()` can redraw only
   * a visible band of a very tall canvas (see `clip`).
   */
  static create(canvas: HTMLCanvasElement, opts: { partial?: boolean } = {}): DitherRenderer | null {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: !!opts.partial,
    });
    if (!gl) return null;
    try {
      return new DitherRenderer(canvas, gl);
    } catch (err) {
      console.error('[dither] failed to initialise', err);
      return null;
    }
  }

  private link(): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error');
    gl.useProgram(p);
    return p;
  }

  private u(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    return this.uniforms.get(name)!;
  }

  private texture(src: TexImageSource, unit: number, filter: number) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return tex;
  }

  setLandscape(source: LandscapeSource) {
    const gl = this.gl;
    // Pixel art: nearest sampling keeps its blocky edges under the dither.
    this.landTex = this.texture(source.image, 0, gl.NEAREST);
    this.maskTex = this.texture(source.mask, 1, gl.LINEAR);
    this.landAspect = source.aspect;
    gl.uniform1i(this.u('uLand'), 0);
    gl.uniform1i(this.u('uLandMask'), 1);
  }

  setParams(dither: DitherParams, gradient: GradientParams) {
    this.dither = dither;
    this.gradient = gradient;
  }

  /** Sets colours; tweens from the current colours unless `instant`. */
  setColors(stops: string[], landscape?: { tint: string; mix: number }, instant = false) {
    const next = stops.map(hexToRgb);
    const tint = landscape ? hexToRgb(landscape.tint) : this.tintTo;
    const mix = landscape ? landscape.mix : this.landMixTo;
    if (instant || !this.palette) {
      this.palette = this.paletteFrom = this.paletteTo = next;
      this.tint = this.tintFrom = this.tintTo = tint;
      this.landMix = this.landMixFrom = this.landMixTo = mix;
      return;
    }
    this.paletteFrom = this.palette;
    this.paletteTo = next;
    this.tintFrom = this.tint;
    this.tintTo = tint;
    this.landMixFrom = this.landMix;
    this.landMixTo = mix;
    this.tweenStart = performance.now();
  }

  /** Resize the backing store so one texel = one dither cell. Returns the CSS size of the canvas. */
  resize(cssWidth: number, cssHeight: number) {
    const px = this.dither.pixelSize;
    const w = Math.max(1, Math.ceil(cssWidth / px));
    const h = Math.max(1, Math.ceil(cssHeight / px));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    return { width: w * px, height: h * px };
  }

  /**
   * Advance the animation clock by dt seconds and draw.
   * `view` is the canvas' CSS size; `norm` the CSS length of one noise unit;
   * `clip` (CSS px, from the canvas top) limits drawing to a vertical band.
   */
  frame(
    dt: number,
    view: { width: number; height: number; norm: number },
    landscape?: LandscapeFrame,
    clip?: { top: number; bottom: number },
  ) {
    const gl = this.gl;
    this.time += dt * this.gradient.speed;
    this.stepTween();

    const d = this.dither;
    const g = this.gradient;
    const angle = (g.angle * Math.PI) / 180;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (clip) {
      const px = d.pixelSize;
      const top = Math.max(0, Math.floor(clip.top / px));
      const bottom = Math.min(this.canvas.height, Math.ceil(clip.bottom / px));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, this.canvas.height - bottom, this.canvas.width, Math.max(0, bottom - top));
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.uniform2f(this.u('uCells'), this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u('uPixel'), d.pixelSize);
    gl.uniform2f(this.u('uView'), view.width, view.height);
    gl.uniform1f(this.u('uNorm'), view.norm);
    gl.uniform1f(this.u('uTime'), this.time);

    gl.uniform3fv(this.u('uStops'), this.palette!.flat());
    gl.uniform1f(this.u('uScale'), g.scale);
    gl.uniform1f(this.u('uWarp'), g.warp);
    gl.uniform1f(this.u('uOrganic'), g.organic);
    gl.uniform1f(this.u('uSpread'), g.spread);
    gl.uniform2f(this.u('uDir'), Math.cos(angle), Math.sin(angle));

    gl.uniform1i(this.u('uAlgo'), Math.max(0, DITHER_ALGORITHMS.indexOf(d.algorithm)));
    gl.uniform1f(this.u('uLevels'), Math.max(2, d.levels));
    gl.uniform1f(this.u('uContrast'), d.contrast);
    gl.uniform1f(this.u('uBrightness'), d.brightness);
    gl.uniform1i(this.u('uMono'), d.mono ? 1 : 0);
    gl.uniform3fv(this.u('uMonoColor'), hexToRgb(d.monoColor));

    const landOn = !!(landscape && this.landTex && this.maskTex);
    gl.uniform1i(this.u('uLandOn'), landOn ? 1 : 0);
    if (landOn && landscape) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.landTex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
      gl.uniform1f(this.u('uLandTop'), landscape.top);
      gl.uniform1f(this.u('uLandHeight'), landscape.height);
      gl.uniform1f(this.u('uLandAspect'), this.landAspect);
      gl.uniform3fv(this.u('uLandTint'), this.tint);
      gl.uniform1f(this.u('uLandMix'), this.landMix);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  get tweening() {
    return this.paletteTo !== this.palette;
  }

  private stepTween() {
    if (!this.paletteFrom || !this.paletteTo || this.palette === this.paletteTo) return;
    const t = Math.min(1, (performance.now() - this.tweenStart) / THEME_TRANSITION_MS);
    const e = easeInOut(t);
    if (t >= 1) {
      this.palette = this.paletteTo;
      this.tint = this.tintTo;
      this.landMix = this.landMixTo;
      return;
    }
    const from = this.paletteFrom;
    this.palette = this.paletteTo.map((c, i) => c.map((v, j) => lerp(from[i][j], v, e)) as RGB);
    // Keep `palette` distinct from `paletteTo` until the tween completes.
    this.tint = this.tintTo.map((v, j) => lerp(this.tintFrom[j], v, e)) as RGB;
    this.landMix = lerp(this.landMixFrom, this.landMixTo, e);
  }

  /**
   * Frees GL objects but keeps the context alive: the same canvas may be re-initialised
   * (React StrictMode remounts), and a lost context can't be recovered from getContext().
   */
  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.landTex);
    gl.deleteTexture(this.maskTex);
  }
}
