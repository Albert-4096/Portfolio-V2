/* ─── Terrain Background ─────────────────────────────────
   Real-terrain topographic contour background for alberyt.xyz.
   Renders a 1 m LiDAR DTM of the Retezat massif (ANCPI F06 tile)
   as a dark scene with glowing accent-coloured contour lines.

   Dependencies: three.js (core), gsap + ScrollTrigger, fetched only
   when the live scene will run (see skipLiveScene); three.js alone on
   an intro visit to a still device, which flies the scene too.
   Data: retezat-heightmap.png (16-bit packed R/G), retezat-meta.json
   Fallback: retezat-poster-*.webp via CSS for touch / small screens /
   reduced-motion / WebGL failure

   Intro: on an intro visit (html[data-intro]) js/intro.js flies this very scene. stage() builds it; its
   frame() sets a camera and the intro uniforms and renders at once. The shader merges the mark's A, as a
   mountain, into the real heights, so the A's rings bend into the terrain's own lines. release() lands it on
   the resting view: the loop takes over (live), or the frame is frozen into the still image (phones).
   If the intro gives up, the scene enters the usual way.
   ─────────────────────────────────────────────────────── */

let THREE, gsap, ScrollTrigger;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

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
root.dataset.terrain = skipLiveScene ? 'still' : 'live';

/* The inline head script sets html[data-intro] to pending before any module runs: js/intro.js flies this scene */
const introVisit = ['pending', 'hold'].includes(root.dataset.intro);
let inIntro = introVisit; // false once the intro has given up

/* Start the downloads at module evaluation: for the live scene, and on an intro visit for the still ones too,
   which fly it as well. A failure surfaces where the scene is built, never as an unhandledrejection. */
const quiet = (p) => { p.catch(() => {}); return p; };
const wanted = !skipLiveScene || introVisit;
const three = wanted ? quiet(import('three')) : null;
const libs = skipLiveScene ? null : quiet(loadScript('/vendor/gsap.min.js').then(() => loadScript('/vendor/ScrollTrigger.min.js')));
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

/* ── Static background (poster image, set in CSS; or, from the intro, a frozen frame of the scene) ─────── */
function showStatic(image) {
  root.dataset.terrain = 'still';
  const div = document.querySelector('.terrain-static-bg') || document.createElement('div');
  div.className = 'terrain-static-bg';
  div.setAttribute('aria-hidden', 'true');
  if (image) div.style.backgroundImage = `url("${image}")`;
  if (!div.isConnected) document.body.prepend(div);
  if (!document.querySelector('.terrain-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'terrain-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.prepend(overlay);
  }
  dispatchEvent(new Event('terrain:ready'));
  return div;
}

/* ── The scene ─────────────────────────────────────────── */
// Built once, by whoever needs it first: js/intro.js (stage) or the usual entrance (initTerrain).
// Resolves with null when there is no scene (the poster is up already).
let building = null;
const build = () => building ||= buildScene();

// WebGL, the mesh and its shader: nothing moves yet
async function buildScene() {
  const body = document.body;
  let canvas, renderer, shaderFailed = false;

  function fail(what, err) {
    console.warn(`[terrain] ${what}, falling back to static:`, err);
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas?.remove();
    showStatic();
    return null;
  }

  try {
    [THREE] = await Promise.all([three, libs]);
    if (!skipLiveScene) {
      ({ gsap, ScrollTrigger } = window);
      gsap.registerPlugin(ScrollTrigger);
    }
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
    // a still device flies the intro too, and its last frame becomes the poster: a little finer there
    renderer.setPixelRatio(Math.min(devicePixelRatio, skipLiveScene ? 2 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    // three.js reports a shader that won't compile or link instead of throwing; prepare() turns it into the poster
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

// What the built scene does: render, flight, loop, scroll, parallax and drift
function wire({ canvas, renderer, scene, camera, geometry, material, heightmapTex, uniforms, contourInterval, targetDisplacement, shaderFailed }) {
  // ── State ──
  let rafId = null;
  let isVisible = true;
  let isTabVisible = true;
  let disposed = false;
  let frozen = false;
  let running = false; // the loop and the parallax run from enter() or release(); until then only frame() draws
  let state = 'idle';  // idle → staged → landed (js/intro.js flew it) | entered (the usual way) | dropped (no scene)
  let announced = false;
  let observer, quickX, quickY;

  // Decoupled camera controls for scroll, parallax, drift, and intro dolly
  const cameraBase = { x: REST.pos[0], y: REST.pos[1], z: REST.pos[2] };
  const cameraOffset = { x: 0, y: 0 };
  const cameraIntroOffset = { y: 0.3, z: 0.8 };
  const cameraDrift = { x: 0, y: 0 };
  const lookAtTarget = new THREE.Vector3(...REST.look);
  const target = new THREE.Vector3();

  // The mark's lines are a fixed width in CSS px: half-widths in drawing-buffer px follow the pixel ratio
  function setRatio(ratio) {
    renderer.setPixelRatio(ratio);
    uniforms.uInkWidth.value.set(0.75, 0.55).multiplyScalar(renderer.getPixelRatio());
  }
  setRatio(renderer.getPixelRatio());

  // ── Render loop ──
  const clock = new THREE.Clock();

  function render() {
    if (disposed) return;

    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uCameraPos.value.copy(camera.position);

    // Apply parallax offset + scroll base + intro offset + idle drift
    camera.position.x = cameraBase.x + cameraOffset.x + cameraDrift.x;
    camera.position.y = cameraBase.y + cameraOffset.y + cameraIntroOffset.y + cameraDrift.y;
    camera.position.z = cameraBase.z + cameraIntroOffset.z;

    // Always orient camera toward lookAtTarget
    camera.lookAt(lookAtTarget);

    renderer.render(scene, camera);
    // the first frame compiles the shaders and blocks the main thread; js/motion.js waits it out
    if (!announced) { announced = true; dispatchEvent(new Event('terrain:ready')); }
  }

  function loop() {
    if (disposed || frozen) return;
    if (!isVisible || !isTabVisible) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(loop);
    render();
  }

  function startLoop() {
    if (rafId != null || disposed || frozen || !running) return;
    clock.start();
    loop();
  }

  function stopLoop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Adaptive quality: median of 90 frame deltas; >22 ms → DPR 1, still >28 ms → freeze ──
  function sampleFrames(done) {
    const deltas = [];
    let last = performance.now();
    (function tick(now) {
      if (disposed) return;
      if (isVisible && isTabVisible) deltas.push(now - last);
      last = now;
      if (deltas.length < 90) { requestAnimationFrame(tick); return; }
      deltas.sort((x, y) => x - y);
      done(deltas[45]);
    })(last);
  }

  function tuneQuality() {
    sampleFrames((median) => {
      if (median <= 22) return;
      setRatio(1);
      renderer.setSize(window.innerWidth, window.innerHeight);
      sampleFrames((again) => {
        if (again <= 28) return;
        frozen = true;
        stopLoop();
        console.info('[terrain] low fps, frozen');
      });
    });
  }

  // ── Resize handler ──
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    // resize clears the canvas; redraw the last frame (while js/intro.js flies, its own pose)
    if (!running) renderer.render(scene, camera);
    else if (frozen) render();
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ── Visibility: Page Visibility API ──
  function onVisibility() {
    isTabVisible = !document.hidden;
    if (isTabVisible && isVisible) startLoop();
    else stopLoop();
  }

  // ── Pointer parallax ──
  const parallaxRange = 0.08;
  function onMove(e) {
    if (!running) return; // the intro's flight is of the centred camera
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    quickX(nx * parallaxRange);
    quickY(ny * parallaxRange * 0.5);
  }

  if (!skipLiveScene) {
    // ── Visibility: IntersectionObserver ──
    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && isTabVisible) startLoop();
        else stopLoop();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);

    quickX = gsap.quickTo(cameraOffset, 'x', { duration: 0.8, ease: 'power2.out' });
    quickY = gsap.quickTo(cameraOffset, 'y', { duration: 0.8, ease: 'power2.out' });
    window.addEventListener('mousemove', onMove, { passive: true });
  }

  // ── GSAP: Idle drift (after intro) ──
  function startDrift() {
    // Very slow continuous camera orbit
    gsap.to(cameraDrift, {
      x: 0.15,
      duration: 30,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    gsap.to(cameraDrift, {
      y: 0.04,
      duration: 25,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ── GSAP: Intro timeline (the usual entrance) ──
  function entrance() {
    const tl = gsap.timeline({
      delay: 0.2,
      onStart: startLoop,
      onComplete: tuneQuality,
    });

    // Displacement rises from 0
    tl.to(uniforms.uDisplacement, {
      value: targetDisplacement,
      duration: 2.2,
      ease: 'power2.out',
    }, 0);

    // Opacity fades in
    tl.to(uniforms.uOpacity, {
      value: 1.0,
      duration: 1.5,
      ease: 'power2.inOut',
    }, 0);

    // Camera dollies in
    tl.to(cameraIntroOffset, {
      y: 0,
      z: 0,
      duration: 2.5,
      ease: 'power2.out',
    }, 0);

    tl.add(startDrift);
  }

  // ── GSAP: ScrollTrigger — camera traverses the massif ──
  function startScroll() {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: mainEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
      }
    });

    scrollTl
      // 1. To Building
      .to(cameraBase, { x: -0.5, y: 0.35, z: 1.1, ease: 'power1.inOut' }, 0)
      .to(lookAtTarget, { x: -0.15, y: 0.08, z: -0.2, ease: 'power1.inOut' }, 0)
      .to(uniforms.uFogFar, { value: 3.4, ease: 'power1.inOut' }, 0)

      // 2. To Projects
      .to(cameraBase, { x: 0.5, y: 0.3, z: 0.9, ease: 'power1.inOut' }, 1)
      .to(lookAtTarget, { x: 0.1, y: 0.12, z: 0.15, ease: 'power1.inOut' }, 1)
      .to(uniforms.uFogFar, { value: 3.0, ease: 'power1.inOut' }, 1)

      // 3. To Infra
      .to(cameraBase, { x: -0.2, y: 0.25, z: 0.75, ease: 'power1.inOut' }, 2)
      .to(lookAtTarget, { x: 0.15, y: 0.06, z: -0.25, ease: 'power1.inOut' }, 2)
      .to(uniforms.uFogFar, { value: 2.6, ease: 'power1.inOut' }, 2)

      // 4. To About / Contact
      .to(cameraBase, { x: 0.0, y: 0.75, z: 1.5, ease: 'power1.inOut' }, 3)
      .to(lookAtTarget, { x: 0.0, y: 0.1, z: 0.0, ease: 'power1.inOut' }, 3)
      .to(uniforms.uFogFar, { value: 2.2, ease: 'power1.inOut' }, 3)
      .to(uniforms.uContourWidth, { value: 1.2, ease: 'power1.inOut' }, 3);
  }

  // ── Cleanup ──
  function teardown() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    observer?.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('visibilitychange', onVisibility);
    geometry.dispose();
    material.dispose();
    heightmapTex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  // on a real unload only: a page kept in the back/forward cache comes back with its scene
  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    teardown();
  });

  // no scene any more: the poster
  function drop() {
    state = 'dropped';
    teardown();
    showStatic();
  }
  // the scene broke on the way: same
  function fail(what, err) {
    console.warn(`[terrain] ${what}, falling back to static:`, err);
    drop();
  }

  // every intro uniform back to rest, whatever the flight left them at
  function toRest() {
    uniforms.uIntro.value = 0;
    uniforms.uBody.value = 1;
    uniforms.uInk.value = 0;
    uniforms.uSink.value = 0;
    uniforms.uReveal.value = EVERYWHERE;
    camera.up.set(0, 1, 0);
  }

  /* ── The usual way in: non-intro visits, and an intro that gave up ── */
  function enter() {
    if (disposed || (state !== 'idle' && state !== 'staged')) return;
    if (skipLiveScene) return drop(); // phones: the poster
    state = 'entered';
    try {
      toRest();
      uniforms.uDisplacement.value = 0;
      uniforms.uOpacity.value = 0;
      cameraIntroOffset.y = 0.3;
      cameraIntroOffset.z = 0.8;
      running = true;
      entrance();
      startScroll();
    } catch (err) {
      fail('Failed to start the scene', err);
    }
  }

  /* ── js/intro.js's flight ── */
  // the intro's neutral state, and one frame that nobody sees: the shaders compile and the mesh uploads
  // now, while the screen is still. false: it broke, and the poster is up.
  function prepare() {
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
      return true;
    } catch (err) {
      fail('Failed to render the first frame', err);
      return false;
    }
  }

  // sets the camera and the uniforms from f and renders now; the loop's own state is left alone
  function frame(f) {
    if (disposed || state !== 'staged') return; // a skip's last frame can come after release()
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

  // the flight has landed on REST: the scene is the page's again
  function release() {
    if (disposed || state !== 'staged') return;
    state = 'landed';
    try {
      toRest();
      uniforms.uDisplacement.value = targetDisplacement;
      uniforms.uOpacity.value = 1;
      if (skipLiveScene) return freeze().catch(err => fail('Failed to freeze the last frame', err));
      // the loop's first frame is the flight's last: same camera, same uniforms; drift and parallax ease in from 0
      cameraIntroOffset.y = cameraIntroOffset.z = 0;
      lookAtTarget.fromArray(REST.look);
      running = true;
      startLoop();
      startDrift();
      tuneQuality();
      startScroll();
    } catch (err) {
      fail('Failed to land the scene', err);
    }
  }

  // phones: the rest frame becomes the static background, pixel for pixel, and the GL context goes
  async function freeze() {
    camera.position.fromArray(REST.pos);
    camera.lookAt(target.fromArray(REST.look));
    uniforms.uCameraPos.value.copy(camera.position);
    renderer.render(scene, camera);
    // copied out in this very task: the drawing buffer is still there, no need to preserve it
    const still = document.createElement('canvas');
    still.width = canvas.width;
    still.height = canvas.height;
    still.getContext('2d').drawImage(canvas, 0, 0);
    const portrait = still.height >= still.width;
    const blob = await new Promise(resolve => still.toBlob(resolve));
    if (!blob) throw new Error('toBlob gave nothing');
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    // decoded before it replaces the canvas, so it paints in the very next frame
    try { await img.decode(); } catch (err) { URL.revokeObjectURL(url); throw err; }
    if (disposed) return URL.revokeObjectURL(url);
    // the device turned while it was being made (a resize lands the intro at once): the poster fits, it doesn't
    if ((innerHeight >= innerWidth) !== portrait) { URL.revokeObjectURL(url); return drop(); }
    const div = showStatic(url);
    teardown();
    // the snapshot is of one orientation: on a turn the CSS poster takes over
    matchMedia('(orientation: portrait)').addEventListener('change', () => {
      div.style.backgroundImage = '';
      URL.revokeObjectURL(url);
    }, { once: true });
  }

  return {
    enter,
    prepare,
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

/* ── Main init: the usual entrance ──────────────────────── */
async function initTerrain() {
  // ── Touch / small / reduced motion → static poster ──
  if (skipLiveScene) {
    showStatic();
    return;
  }
  (await build())?.enter();
}

/* ── The intro gave up (html[data-intro] went off): the page enters the usual way ── */
function giveUp() {
  if (!inIntro) return;
  inIntro = false;
  settleStage?.(null); // a stage() still pending ends here
  if (building) {
    if (skipLiveScene) showStatic(); // phones: the poster now, not once the scene they no longer need is built
    building.then(scene => scene?.enter()); // built, or building: it enters when it can
  }
  else initTerrain();
}

/* ── Bootstrap: lazy-init after first paint ──────────── */
if (introVisit) {
  // nothing is built until js/intro.js asks for the stage, or gives up
  addEventListener('intro:over', () => { if (root.dataset.intro === 'off') giveUp(); });
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initTerrain, { timeout: 200 });
    } else {
      setTimeout(initTerrain, 0);
    }
  });
} else {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initTerrain, { timeout: 200 });
  } else {
    setTimeout(initTerrain, 0);
  }
}
