/* ─── Intro terrain ─────────────────────────────────────
   The automatic intro flies the Retezat LiDAR scene. Its last frame fades into
   the page's quiet background, then releases the WebGL resources. */

let THREE;

/* ── CSS token reader ──────────────────────────────────── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function cssColor(name) {
  const hex = cssVar(name);
  return new THREE.Color(hex);
}
// the token as plain CSS has it (sRGB, 0..1): the shader writes it out untouched, like the mark's SVG stroke
function cssSrgb(name) {
  const n = parseInt(cssVar(name).slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255].map(v => v / 255);
}

/* ── Feature gates ─────────────────────────────────────── */
const root = document.documentElement;
const MOBILE_BP = 768;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;
const isSmallViewport = window.innerWidth < MOBILE_BP;
const skipLiveScene = isCoarse || isSmallViewport || prefersReducedMotion;
root.dataset.terrain = 'quiet';

/* The inline head script sets html[data-intro] to pending before any module runs: js/intro.js flies this scene */
const introVisit = ['pending', 'hold'].includes(root.dataset.intro);
let inIntro = introVisit; // false once the intro has given up

/* Download scene assets only when the automatic intro needs them. */
const quiet = (p) => { p.catch(() => {}); return p; };
const three = introVisit ? quiet(import('three')) : null;
// the heightmap and its meta: at once on an intro visit (it waits on them), otherwise when the scene is built
let fetched = null;
const assets = () => fetched ||= [
  quiet(fetch('/assets/retezat-meta.json').then(r => r.json())),
  quiet(three.then(T => new Promise((resolve, reject) => {
    new T.TextureLoader().load('/assets/retezat-heightmap.png', resolve, undefined, reject);
  }))),
];
if (introVisit) assets();

/* The scene's resting camera; js/intro.js flies to it. Keep in step with the camera code below. */
const REST = { pos: [0, 0.6, 1.4], look: [0, 0.15, 0], fov: 45 };
const EVERYWHERE = 1e4; // uReveal at rest: lines show at any distance from the A

/* The mark's A (PEAK in js/intro.js), on its 24-unit grid, y down: a triangle and the body under it */
const PEAK = [
  [[9, 3.5], [11.39, 9.75], [6.61, 9.75]],
  [[2.5, 20.5], [6.228, 10.75], [11.772, 10.75], [15.5, 20.5], [11.9, 20.5], [9, 12.915], [6.1, 20.5]],
];
// Inigo Quilez's exact polygon distance: the nearest edge, signed by winding (negative inside)
const polygon = (name, pts) => /* glsl */ `
  float ${name}(vec2 p) {
    const vec2 v[${pts.length}] = vec2[${pts.length}](${pts.map(([x, y]) => `vec2(${x}, ${y})`).join(', ')});
    float d = dot(p - v[0], p - v[0]), s = 1.0;
    for (int i = 0; i < ${pts.length}; i++) {
      vec2 a = v[i == 0 ? ${pts.length - 1} : i - 1], b = v[i];
      vec2 e = a - b, w = p - b;
      vec2 q = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
      d = min(d, dot(q, q));
      bvec3 c = bvec3(p.y >= b.y, p.y < a.y, e.x * w.y > e.y * w.x);
      if (all(c) || all(not(c))) s = -s;
    }
    return s * sqrt(d);
  }
`;

/* ── Vertex Shader ─────────────────────────────────────── */
const vertexShader = /* glsl */ `
  uniform sampler2D uHeightmap;
  uniform float uDisplacement;
  uniform vec2 uTexelSize; // 1.0 / texture dimensions

  varying float vWorldHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec2 uv = uv;

    // Sample heightmap: decode 16-bit from R (high) + G (low)
    vec4 hSample = texture2D(uHeightmap, uv);
    float height01 = (hSample.r * 255.0 * 256.0 + hSample.g * 255.0) / 65535.0;

    // Displace vertex along Y
    vec3 displaced = position;
    displaced.y = height01 * uDisplacement;

    // Derive normals via finite differences on the heightmap
    float hL = (texture2D(uHeightmap, uv - vec2(uTexelSize.x, 0.0)).r * 255.0 * 256.0
              + texture2D(uHeightmap, uv - vec2(uTexelSize.x, 0.0)).g * 255.0) / 65535.0;
    float hR = (texture2D(uHeightmap, uv + vec2(uTexelSize.x, 0.0)).r * 255.0 * 256.0
              + texture2D(uHeightmap, uv + vec2(uTexelSize.x, 0.0)).g * 255.0) / 65535.0;
    float hD = (texture2D(uHeightmap, uv - vec2(0.0, uTexelSize.y)).r * 255.0 * 256.0
              + texture2D(uHeightmap, uv - vec2(0.0, uTexelSize.y)).g * 255.0) / 65535.0;
    float hU = (texture2D(uHeightmap, uv + vec2(0.0, uTexelSize.y)).r * 255.0 * 256.0
              + texture2D(uHeightmap, uv + vec2(0.0, uTexelSize.y)).g * 255.0) / 65535.0;

    float scale = max(uDisplacement * 2.0, 1e-4); // tangent scale; flat at the start of a rise
    vNormal = normalize(vec3(hL - hR, 2.0 / scale, hD - hU));

    vWorldHeight = height01;
    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

/* ── Fragment Shader ───────────────────────────────────── */
const fragmentShader = /* glsl */ `
  uniform vec3 uAccentColor;
  uniform vec3 uAccentDimColor;
  uniform vec3 uBgColor;
  uniform float uContourInterval;  // in normalised height units
  uniform float uContourWidth;
  uniform float uOpacity;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTime;
  uniform vec3 uCameraPos;

  // js/intro.js's flight (rest values: exactly the scene without it)
  uniform float uIntro;     // 0 at rest; 1 while js/intro.js flies the scene
  uniform vec2  uAOrigin;   // plane (x, z) of the mark's (0, 0)
  uniform float uAUnit;     // plane units per mark unit
  uniform float uATop;      // the A's outline, normalised height (a contour level)
  uniform float uSink;      // normalised height the A has sunk by
  uniform float uReveal;    // mark units from the A's outline within which lines show
  uniform float uBody;      // the ground's opacity (1 at rest)
  uniform float uInk;       // 1: the mark's bright lines, 0: the scene's own (0 at rest)
  uniform vec3  uInkMajor;  // sRGB, written straight out: the CSS --accent
  uniform vec3  uInkMinor;  // sRGB: --accent-dim and --accent mixed half and half
  uniform vec2  uInkWidth;  // half-widths in drawing-buffer px of an ink line: (major, minor)

  varying float vWorldHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  ${polygon('sdTri', PEAK[0])}
  ${polygon('sdBody', PEAK[1])}

  void main() {
    // ── The field the lines are drawn from: the terrain's heights; during the intro, merged with the A ──
    float h = vWorldHeight, reveal = 1.0;
    if (uIntro > 0.5) {
      vec2 m = (vWorldPos.xz - uAOrigin) / uAUnit;
      float sd = min(sdTri(m), sdBody(m));
      // the A as a mountain: its outline the level uATop, a ring each 1.1 units below it, a low dome inside (< 1 level)
      float cone = uATop - uContourInterval * (sd < 0.0 ? 0.5 * sd : sd / 1.1);
      // on the real terrain, sinking into it: a smooth max, so each line bends from the A's ring into the terrain's own
      float a = cone - uSink, k = 0.5 * uContourInterval, t = max(k - abs(a - h), 0.0) / k;
      h = max(a, h) + t * t * k * 0.25;
      // a front spreading out from the outline: sharp at first, so the A's own rings come in one by one, softer as it goes
      reveal = 1.0 - smoothstep(uReveal, 1.3 * uReveal + 0.8, max(sd, 0.0));
    }

    // ── Contour lines (fwidth anti-aliased) ──
    float scaledHeight = h / uContourInterval;
    float contourFrac = fract(scaledHeight);
    float fw = fwidth(scaledHeight) * uContourWidth;
    float contour = smoothstep(fw, 0.0, contourFrac) + smoothstep(1.0 - fw, 1.0, contourFrac);

    // Major contour lines (every 5 intervals) — slightly brighter
    float majorScaled = h / (uContourInterval * 5.0);
    float majorFrac = fract(majorScaled);
    float majorFw = fwidth(majorScaled) * uContourWidth * 1.5;
    float majorContour = smoothstep(majorFw, 0.0, majorFrac) + smoothstep(1.0 - majorFw, 1.0, majorFrac);

    // ── Self-shading from derived normals ──
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));
    float diffuse = max(dot(vNormal, lightDir), 0.0);
    float shade = mix(0.15, 0.45, diffuse);

    // ── Elevation gradient (subtle) ──
    float elevGrad = smoothstep(0.0, 1.0, vWorldHeight);

    // ── Base colour: dark with subtle elevation tint ──
    vec3 baseColor = mix(uBgColor * 1.1, uBgColor * 1.6, elevGrad * 0.3);
    baseColor *= shade;

    // ── Contour colour ──
    vec3 contourColor = mix(uAccentDimColor, uAccentColor, majorContour * 0.5 + 0.5);
    float sceneCov = max(contour * 0.7, majorContour) * 0.6;

    // ── The line: the scene's own, or the mark's (a fixed px width, from the true distance in px to the nearest level) ──
    vec3 lineCol = contourColor;
    float lineCov = sceneCov;
    if (uInk > 0.0) {
      float g = length(vec2(dFdx(scaledHeight), dFdy(scaledHeight))) + 1e-6;
      float n = floor(scaledHeight + 0.5);
      float px = abs(scaledHeight - n) / g;
      bool major = mod(n, 5.0) < 0.5;
      float ink = 1.0 - smoothstep(-0.5, 0.5, px - (major ? uInkWidth.x : uInkWidth.y));
      lineCol = mix(contourColor, major ? uInkMajor : uInkMinor, uInk);
      lineCov = mix(sceneCov, ink * (major ? 0.95 : 0.7), uInk);
    }
    lineCov *= reveal;

    // ── Fresnel rim (very subtle) ──
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    vec3 rimColor = uAccentDimColor * fresnel * 0.15;

    // ── Compose, under the distance fog ──
    vec3 ground = baseColor + rimColor, line = lineCol + rimColor;
    float dist = length(vWorldPos - uCameraPos);
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    ground = mix(ground, uBgColor, fogFactor);
    line = mix(line, uBgColor, fogFactor);

    // lines over the ground; during the intro the ground itself fades in over the page (uBody)
    float alpha = lineCov + uBody * (1.0 - lineCov);
    gl_FragColor = vec4((line * lineCov + ground * uBody * (1.0 - lineCov)) / max(alpha, 1e-4), alpha * uOpacity);
  }
`;

function showQuiet() {
  root.dataset.terrain = 'quiet';
  document.querySelector('.terrain-overlay')?.remove();
  dispatchEvent(new Event('terrain:ready'));
}

/* ── The scene ─────────────────────────────────────────── */
// Built once when js/intro.js requests its stage.
let building = null;
const build = () => building ||= buildScene();

// WebGL, the mesh and its shader: nothing moves yet
async function buildScene() {
  const body = document.body;
  let canvas, renderer, shaderFailed = false;

  function fail(what, err) {
    console.warn(`[terrain] ${what}, using the quiet background:`, err);
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas?.remove();
    showQuiet();
    return null;
  }

  try {
    THREE = await three;
  } catch (err) {
    return fail('Failed to load dependencies', err);
  }

  // ── Canvas & Overlay ──
  canvas = document.createElement('canvas');
  canvas.id = 'terrain-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  body.prepend(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'terrain-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  body.prepend(overlay);

  // ── Read design tokens & create WebGL context ──
  let accentColor, accentDimColor, bgColor, scene, camera;
  try {
    accentColor = cssColor('--accent');
    accentDimColor = cssColor('--accent-dim');
    bgColor = cssColor('--bg');

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    // Keep the existing intro resolution on touch devices.
    renderer.setPixelRatio(Math.min(devicePixelRatio, skipLiveScene ? 2 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    // three.js reports shader failures instead of throwing; prepare() checks them.
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
      shaderFailed = true;
      console.error('[terrain] shader failed:', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
    };

    scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(REST.fov, aspect, 0.1, 100);

    // Camera framed on ridgelines at a low cinematic angle
    camera.position.fromArray(REST.pos);
    camera.lookAt(...REST.look);
  } catch (err) {
    return fail('WebGL initialization failed', err);
  }

  // ── Load assets ──
  let geometry, material, heightmapTex, uniforms, contourInterval, targetDisplacement;
  try {
    const [meta, tex] = await Promise.all(assets());
    heightmapTex = tex;
    heightmapTex.minFilter = THREE.LinearFilter;
    heightmapTex.magFilter = THREE.LinearFilter;
    heightmapTex.wrapS = THREE.ClampToEdgeWrapping;
    heightmapTex.wrapT = THREE.ClampToEdgeWrapping;

    // ── Geometry ──
    // Aspect ratio matching the DTM
    const dtmAspect = meta.widthPx / meta.heightPx;
    const planeW = 2.0 * dtmAspect;
    const planeH = 2.0;
    const segments = 512;
    geometry = new THREE.PlaneGeometry(
      planeW, planeH,
      Math.round(segments * dtmAspect), segments
    );
    geometry.rotateX(-Math.PI / 2); // lay flat

    // ── Contour interval in normalised units ──
    // Target ~100m contour intervals in real-world space
    const contourRealM = 100;
    contourInterval = contourRealM / meta.verticalRangeM;

    // ── Material ──
    const [inkMajor, inkDim] = [cssSrgb('--accent'), cssSrgb('--accent-dim')];
    uniforms = {
      uHeightmap: { value: heightmapTex },
      uDisplacement: { value: 0.0 },
      uTexelSize: { value: new THREE.Vector2(1.0 / meta.widthPx, 1.0 / meta.heightPx) },
      uContourInterval: { value: contourInterval },
      uContourWidth: { value: 1.8 },
      uAccentColor: { value: accentColor },
      uAccentDimColor: { value: accentDimColor },
      uBgColor: { value: bgColor },
      uOpacity: { value: 0.0 },
      uFogNear: { value: 1.5 },
      uFogFar: { value: 3.8 },
      uTime: { value: 0 },
      uCameraPos: { value: camera.position.clone() },
      // js/intro.js's flight, at rest
      uIntro: { value: 0 },
      uAOrigin: { value: new THREE.Vector2() },
      uAUnit: { value: 1 },
      uATop: { value: 0 },
      uSink: { value: 0 },
      uReveal: { value: EVERYWHERE },
      uBody: { value: 1 },
      uInk: { value: 0 },
      uInkMajor: { value: new THREE.Vector3(...inkMajor) },
      uInkMinor: { value: new THREE.Vector3(...inkMajor.map((v, i) => (v + inkDim[i]) / 2)) },
      uInkWidth: { value: new THREE.Vector2() },
    };

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    scene.add(mesh);

    // ── Vertical exaggeration ──
    // Physically meaningful: verticalRange / horizontalExtent, then exaggerate
    const naturalRatio = meta.verticalRangeM / meta.horizontalExtentM;
    const exaggeration = 2.5;
    targetDisplacement = naturalRatio * exaggeration * planeW;
    return wire({ canvas, renderer, scene, camera, geometry, material, heightmapTex, uniforms, contourInterval, targetDisplacement,
      shaderFailed: () => shaderFailed });
  } catch (err) {
    geometry?.dispose();
    material?.dispose();
    heightmapTex?.dispose();
    return fail('Failed to load terrain assets', err);
  }
}

function wire({ canvas, renderer, scene, camera, geometry, material, heightmapTex, uniforms, contourInterval, targetDisplacement, shaderFailed }) {
  let disposed = false;
  let state = 'idle';
  const target = new THREE.Vector3();
  uniforms.uInkWidth.value.set(0.75, 0.55).multiplyScalar(renderer.getPixelRatio());

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.render(scene, camera);
  }
  addEventListener('resize', onResize, { passive: true });

  function teardown() {
    if (disposed) return;
    disposed = true;
    removeEventListener('resize', onResize);
    removeEventListener('pagehide', onPageHide);
    geometry.dispose();
    material.dispose();
    heightmapTex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    showQuiet();
  }
  function onPageHide(e) {
    if (!e.persisted) teardown();
  }
  addEventListener('pagehide', onPageHide);

  function prepare() {
    if (disposed) return false;
    try {
      uniforms.uIntro.value = 1;
      uniforms.uBody.value = 0;
      uniforms.uInk.value = 1;
      uniforms.uReveal.value = 0;
      uniforms.uDisplacement.value = 0;
      uniforms.uOpacity.value = 1;
      renderer.render(scene, camera);
      if (shaderFailed()) throw new Error('the shader did not compile');
      state = 'staged';
      root.dataset.terrain = 'intro';
      return true;
    } catch (err) {
      console.warn('[terrain] Failed to prepare the intro:', err);
      teardown();
      return false;
    }
  }

  function frame(f) {
    if (disposed || state !== 'staged') return;
    camera.position.fromArray(f.pos);
    camera.up.fromArray(f.up);
    camera.lookAt(target.fromArray(f.look));
    uniforms.uCameraPos.value.copy(camera.position);
    uniforms.uAOrigin.value.fromArray(f.a.origin);
    uniforms.uAUnit.value = f.a.unit;
    uniforms.uATop.value = f.a.top;
    uniforms.uReveal.value = f.reveal;
    uniforms.uSink.value = f.sink;
    uniforms.uDisplacement.value = f.relief * targetDisplacement;
    uniforms.uBody.value = f.body;
    uniforms.uInk.value = f.ink;
    renderer.render(scene, camera);
  }

  function release() {
    if (disposed || state !== 'staged') return;
    state = 'landed';
    canvas.animate([{ opacity: getComputedStyle(canvas).opacity }, { opacity: 0 }], {
      duration: 600, easing: 'ease-out', fill: 'forwards',
    }).finished.then(teardown, teardown);
  }

  return {
    prepare,
    dispose: teardown,
    stage: {
      rest: { pos: [...REST.pos], look: [...REST.look], fov: REST.fov },
      ci: contourInterval,
      still: skipLiveScene,
      canvas,
      frame,
      release,
    },
  };
}

/* js/intro.js flies this very scene. The first call builds it in intro mode, compiles its shaders and renders
   one hidden frame (a main-thread stall: call it while the screen is still). Resolves with the stage, or with
   null when there is none to fly (no WebGL, assets failed, the visit no longer in its intro). Never rejects. */
let staging = null, settleStage = null;
export function stage() {
  return staging ||= new Promise((resolve) => {
    settleStage = resolve;
    (async () => {
      if (!inIntro) return null;
      const scene = await build();
      return scene && inIntro && scene.prepare() ? scene.stage : null;
    })().then(resolve, () => resolve(null));
  });
}

/* An interrupted intro must also release a scene that is still being built. */
if (introVisit) {
  addEventListener('intro:over', () => {
    if (root.dataset.intro !== 'off' || !inIntro) return;
    inIntro = false;
    settleStage?.(null);
    building?.then(scene => scene?.dispose());
    showQuiet();
  }, { once: true });
}
