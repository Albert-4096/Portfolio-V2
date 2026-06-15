/* ─── Terrain Background ─────────────────────────────────
   Real-terrain topographic contour background for alberyt.xyz.
   Renders a 1 m LiDAR DTM of the Retezat massif (ANCPI F06 tile)
   as a dark scene with glowing accent-coloured contour lines.

   Dependencies: three.js (core), gsap + ScrollTrigger
   Data: retezat-heightmap.png (16-bit packed R/G), retezat-meta.json
   Fallback: retezat-hillshade.png via CSS for mobile / reduced-motion
   ─────────────────────────────────────────────────────── */

import * as THREE from 'three';

/* gsap + ScrollTrigger loaded as UMD scripts (defer), available as globals */
const { gsap } = window;
const { ScrollTrigger } = window;

gsap.registerPlugin(ScrollTrigger);

/* ── CSS token reader ──────────────────────────────────── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function cssColor(name) {
  const hex = cssVar(name);
  return new THREE.Color(hex);
}

/* ── Feature gates ─────────────────────────────────────── */
const MOBILE_BP = 768;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;
const isSmallViewport = window.innerWidth < MOBILE_BP;
const skipLiveScene = isCoarse || isSmallViewport;

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

    float scale = uDisplacement * 2.0; // tangent scale
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

  varying float vWorldHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    // ── Contour lines (fwidth anti-aliased) ──
    float scaledHeight = vWorldHeight / uContourInterval;
    float contourFrac = fract(scaledHeight);
    float fw = fwidth(scaledHeight) * uContourWidth;
    float contour = smoothstep(fw, 0.0, contourFrac) + smoothstep(1.0 - fw, 1.0, contourFrac);

    // Major contour lines (every 5 intervals) — slightly brighter
    float majorScaled = vWorldHeight / (uContourInterval * 5.0);
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
    float totalContour = max(contour * 0.7, majorContour);

    // ── Fresnel rim (very subtle) ──
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    vec3 rimColor = uAccentDimColor * fresnel * 0.15;

    // ── Compose ──
    vec3 color = mix(baseColor, contourColor, totalContour * 0.85);
    color += rimColor;

    // ── Distance fog ──
    float dist = length(vWorldPos - uCameraPos);
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    color = mix(color, uBgColor, fogFactor);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

/* ── Main init ─────────────────────────────────────────── */
function initTerrain() {
  const body = document.body;

  // ── Mobile / coarse → static hillshade fallback ──
  if (skipLiveScene) {
    const div = document.createElement('div');
    div.className = 'terrain-static-bg';
    div.setAttribute('aria-hidden', 'true');
    body.prepend(div);

    const overlay = document.createElement('div');
    overlay.className = 'terrain-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    body.prepend(overlay);
    return;
  }

  // ── Reduced motion → will render one static frame ──
  const animationEnabled = !prefersReducedMotion;

  // ── Canvas & Overlay ──
  const canvas = document.createElement('canvas');
  canvas.id = 'terrain-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  body.prepend(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'terrain-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  body.prepend(overlay);

  // Helper for static fallback
  function triggerFallback(err) {
    console.warn('[terrain] WebGL initialization failed, falling back to static:', err);
    canvas.remove();
    const div = document.createElement('div');
    div.className = 'terrain-static-bg';
    div.setAttribute('aria-hidden', 'true');
    body.prepend(div);
  }

  // ── Read design tokens & create WebGL context ──
  let accentColor, accentDimColor, bgColor, renderer, scene, camera;
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);

    // Camera framed on ridgelines at a low cinematic angle
    camera.position.set(0, 0.6, 1.4);
    camera.lookAt(0, 0.15, 0);
  } catch (err) {
    triggerFallback(err);
    return;
  }

  // ── State ──
  let rafId = null;
  let isVisible = true;
  let isTabVisible = true;
  let disposed = false;

  // Decoupled camera controls for scroll, parallax, drift, and intro dolly
  const cameraBase = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const cameraOffset = { x: 0, y: 0 };
  const cameraIntroOffset = { y: 0.3, z: 0.8 };
  const cameraDrift = { x: 0, y: 0 };
  const lookAtTarget = new THREE.Vector3(0, 0.15, 0);

  // ── Load assets ──
  Promise.all([
    fetch('/assets/retezat-meta.json').then(r => r.json()),
    new Promise((resolve, reject) => {
      new THREE.TextureLoader().load('/assets/retezat-heightmap.png', resolve, undefined, reject);
    }),
  ]).then(([meta, heightmapTex]) => {
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
    const geometry = new THREE.PlaneGeometry(
      planeW, planeH,
      Math.round(segments * dtmAspect), segments
    );
    geometry.rotateX(-Math.PI / 2); // lay flat

    // ── Contour interval in normalised units ──
    // Target ~50m contour intervals in real-world space
    const contourRealM = 50;
    const contourInterval = contourRealM / meta.verticalRangeM;

    // ── Material ──
    const uniforms = {
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
    };

    const material = new THREE.ShaderMaterial({
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
    const targetDisplacement = naturalRatio * exaggeration * planeW;

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
    }

    function loop() {
      if (disposed) return;
      if (!isVisible || !isTabVisible) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(loop);
      render();
    }

    function startLoop() {
      if (rafId != null || disposed) return;
      clock.start();
      loop();
    }

    function stopLoop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // ── Resize handler ──
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (!animationEnabled) render(); // re-render static frame
    }
    window.addEventListener('resize', onResize, { passive: true });

    // ── Visibility: IntersectionObserver ──
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && isTabVisible && animationEnabled) startLoop();
        else stopLoop();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    // ── Visibility: Page Visibility API ──
    document.addEventListener('visibilitychange', () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isVisible && animationEnabled) startLoop();
      else stopLoop();
    });

    // ── Pointer parallax ──
    if (animationEnabled && !isCoarse) {
      const parallaxRange = 0.08;
      const quickX = gsap.quickTo(cameraOffset, 'x', { duration: 0.8, ease: 'power2.out' });
      const quickY = gsap.quickTo(cameraOffset, 'y', { duration: 0.8, ease: 'power2.out' });

      window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        quickX(nx * parallaxRange);
        quickY(ny * parallaxRange * 0.5);
      }, { passive: true });
    }

    // ── GSAP: Intro timeline ──
    if (animationEnabled) {
      const tl = gsap.timeline({
        delay: 0.2,
        onStart: startLoop,
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

      // ── GSAP: Idle drift (after intro) ──
      tl.add(() => {
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
      });

      // ── GSAP: ScrollTrigger — camera traverses the massif ──
      const mainEl = document.querySelector('main');
      if (mainEl) {
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
    } else {
      // ── Reduced motion: single static frame ──
      uniforms.uDisplacement.value = targetDisplacement;
      uniforms.uOpacity.value = 1.0;
      render();
    }

    // ── Cleanup ──
    window.addEventListener('beforeunload', () => {
      disposed = true;
      stopLoop();
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      heightmapTex.dispose();
      renderer.dispose();
    });

  }).catch(err => {
    console.warn('[terrain] Failed to load terrain assets, falling back to static:', err);
    // Fallback to static hillshade
    canvas.remove();
    const div = document.createElement('div');
    div.className = 'terrain-static-bg';
    div.setAttribute('aria-hidden', 'true');
    body.prepend(div);
  });
}

/* ── Bootstrap: lazy-init after first paint ──────────── */
if (document.readyState === 'loading') {
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
