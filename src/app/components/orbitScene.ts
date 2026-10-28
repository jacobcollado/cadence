import {
  CanvasTexture, Color, Group, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, NeutralToneMapping, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Scene, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// The hero's visual: the logo as an object. A ring of glass running through
// the spectrum, lying back in space with the dot riding in its gap, the way
// the mark draws it. The orbit turns at a steady beat and catches once a lap,
// like a missed frame. It floats over the floor, where the light through the
// glass falls in its colors, with the dot's beside it.

const SPECTRUM = ["#7c5ce6", "#3d6fe0", "#1fa2c9", "#2fb67c", "#f5b82e", "#f2762e", "#e5484d"];

// The mark's proportions (ui.tsx Mark): a 5.25 ring, a 1.5 stroke, a 1.9 dot,
// and an 84° gap with the dot at its middle.
const R = 1.6;
const TUBE = R * (0.75 / 5.25);
const DOT = R * (1.9 / 5.25);
const GAP = (84 * Math.PI) / 180;

const TILT = (62 * Math.PI) / 180; // how far the ring lies back
const LAP = 7000;                   // ms per turn
const CATCH = { at: 0.62, width: 0.07 }; // where in the lap it catches, and for how long
const OPEN_MS = 1400;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Lap progress with the catch: a steady turn that all but stops for a moment, then carries on. */
function beat(p: number) {
  const hold = 0.6 * CATCH.width;
  return (p - hold * smooth(CATCH.at, CATCH.at + CATCH.width, p)) / (1 - hold);
}

/** The spectrum laid along the ring, lifted toward white so it reads as clear glass. */
function spectrum(lift: number) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 2;
  const g = c.getContext("2d")!;
  const fill = g.createLinearGradient(0, 0, 512, 0);
  SPECTRUM.forEach((hex, i) => fill.addColorStop(i / (SPECTRUM.length - 1), new Color(hex).lerp(new Color("#fff"), lift).getStyle()));
  g.fillStyle = fill;
  g.fillRect(0, 0, 512, 2);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** The orbit's light on the floor, drawn in the orbit's own plane: the ring's
 * arc in its colors with the gap, and the dot in its own color at the gap. */
const POOL = R * 1.7; // half the drawing's width
function pool(dot: string) {
  const s = 512, px = s / (2 * POOL), c = document.createElement("canvas");
  c.width = c.height = s;
  const sharp = document.createElement("canvas");
  sharp.width = sharp.height = s;
  const g = sharp.getContext("2d")!;
  // The canvas runs y down, the plane y up, so an orbit angle a sits at -a.
  g.lineWidth = R * 0.3 * px;
  g.lineCap = "round";
  const steps = 160, sweep = Math.PI * 2 - GAP;
  for (let k = 0; k < steps; k++) {
    const u = k / steps, f = u * (SPECTRUM.length - 1), i = Math.floor(f);
    g.strokeStyle = new Color(SPECTRUM[i]).lerp(new Color(SPECTRUM[Math.min(i + 1, SPECTRUM.length - 1)]), f - i).getStyle();
    g.beginPath();
    g.arc(s / 2, s / 2, R * px, -(GAP / 2 + u * sweep), -(GAP / 2 + (k + 1.5) / steps * sweep), true);
    g.stroke();
  }
  g.fillStyle = dot;
  g.beginPath();
  g.arc(s / 2 + R * px, s / 2, DOT * px, 0, Math.PI * 2);
  g.fill();
  const out = c.getContext("2d")!;
  out.filter = `blur(${Math.round(R * 0.13 * px)}px)`;
  out.drawImage(sharp, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function blob() {
  const s = 128, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const fill = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  fill.addColorStop(0, "rgba(0,0,0,1)");
  fill.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fill;
  g.fillRect(0, 0, s, s);
  return new CanvasTexture(c);
}

export type Orbit = { dispose(): void };

export function mountOrbit(host: HTMLElement, opts: { still: boolean; onReady(): void }): Orbit {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(pointer: coarse)").matches ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new PerspectiveCamera(26, 1, 0.1, 80);

  // The orbit: the ring and its dot turn together, so the dot keeps its gap.
  const lean = new Group();   // follows the pointer
  const tilt = new Group();   // lies the ring back
  const orbit = new Group();  // turns
  tilt.rotation.x = -TILT;
  scene.add(lean); lean.add(tilt); tilt.add(orbit);

  const tint = spectrum(0.3), glow = spectrum(0);
  const glass = new MeshPhysicalMaterial({
    map: tint,
    transmission: 1,
    thickness: 0.5,
    ior: 1.5,
    roughness: 0.06,
    dispersion: 2,
  });
  const ringGeo = new TorusGeometry(R, TUBE, 48, 240, Math.PI * 2 - GAP).rotateZ(GAP / 2);
  orbit.add(new Mesh(ringGeo, glass));

  // Round caps where the ring ends, each in the color it ends on.
  const capGeo = new SphereGeometry(TUBE, 32, 16);
  const caps = [0, 1].map((end) => {
    const a = GAP / 2 + end * (Math.PI * 2 - GAP);
    const hex = SPECTRUM[end * (SPECTRUM.length - 1)];
    const mat = glass.clone();
    mat.map = null;
    mat.color = new Color(hex).lerp(new Color("#fff"), 0.3);
    const cap = new Mesh(capGeo, mat);
    cap.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    orbit.add(cap);
    return { mat, hex };
  });

  const ink = new MeshPhysicalMaterial({ roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dot = new Mesh(new SphereGeometry(DOT, 64, 32), ink);
  dot.position.set(R, 0, 0);
  orbit.add(dot);

  // The floor: the colored light through the ring, and a soft shadow under it all.
  const lowest = -R * Math.cos(TILT) - DOT;
  const floorY = lowest - 0.6;
  // The light is drawn in the orbit's plane and flattened straight down onto
  // the floor every frame, so it turns, catches and leans with the orbit.
  const lightMat = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const light = new Mesh(new PlaneGeometry(POOL * 2, POOL * 2), lightMat);
  light.matrixAutoUpdate = false;
  light.matrixWorldAutoUpdate = false;
  light.frustumCulled = false;
  scene.add(light);
  const flatten = new Matrix4().set(1, 0, 0, 0, 0, 0, 0, floorY, 0, 0, 1, 0, 0, 0, 0, 1);
  const castLight = () => {
    orbit.updateWorldMatrix(true, false);
    light.matrixWorld.multiplyMatrices(flatten, orbit.matrixWorld);
  };
  const shadow = new Mesh(new PlaneGeometry(R * 3, R * 1.4), new MeshBasicMaterial({ alphaMap: blob(), color: "#000", transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = floorY + 0.001;
  scene.add(shadow);

  // Each mode lights the glass its own way. Light: clear glass on paper with
  // white reflections. Dark: the glass glows in its own colors and reflects
  // in them too, with no white light anywhere.
  const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const mode = () => {
    const paper = new Color(css("--paper", "#fff"));
    const dark = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
    scene.background = paper;
    glass.emissiveMap = dark ? glow : null;
    glass.emissive.set(dark ? "#ffffff" : "#000000");
    glass.emissiveIntensity = dark ? 0.45 : 0;
    glass.specularColorMap = dark ? glow : null;
    glass.envMapIntensity = dark ? 0.6 : 1;
    glass.needsUpdate = true;
    caps.forEach(({ mat, hex }) => {
      mat.emissive.set(dark ? hex : "#000000");
      mat.emissiveIntensity = dark ? 0.45 : 0;
      mat.specularColor.set(dark ? hex : "#ffffff");
      mat.envMapIntensity = glass.envMapIntensity;
      mat.needsUpdate = true;
    });
    ink.color.set(css("--ink", "#1a1a1a"));
    ink.envMapIntensity = dark ? 0.5 : 1;
    (light.material as MeshBasicMaterial).opacity = dark ? 0.22 : 0.3;
    (shadow.material as MeshBasicMaterial).opacity = dark ? 0 : 0.1;
    lightMat.map?.dispose();
    lightMat.map = pool(css("--ink", "#1a1a1a"));
    lightMat.needsUpdate = true;
  };
  mode();

  // Frame the orbit and its floor so they fill the box, looking down a
  // little: project the scene's outermost points and back the camera off
  // until they all fit, centered.
  const reach = R * 1.7 * 0.95; // the light pool's soft outer edge
  const bounds = [
    ...[0, 1, 2, 3].map((k) => new Vector3(Math.cos((k * Math.PI) / 2) * reach, floorY, Math.sin((k * Math.PI) / 2) * reach)),
    ...[0, 1, 2, 3].map((k) => new Vector3(Math.cos((k * Math.PI) / 2) * (R + DOT), 0, 0).applyAxisAngle(new Vector3(1, 0, 0), -TILT).add(new Vector3(0, k === 1 ? DOT : 0, 0))),
    new Vector3(0, R * Math.cos(TILT) + DOT, -R * Math.sin(TILT)),
  ];
  const look = new Vector3(0, (floorY + R * Math.cos(TILT)) / 2, 0);
  const view = new Vector3(0, Math.sin(0.3), Math.cos(0.3)); // about 17° above
  const p = new Vector3();
  const fit = () => {
    let d = 12;
    for (let k = 0; k < 6; k++) {
      camera.position.copy(look).addScaledVector(view, d);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      let x = 0, y0 = Infinity, y1 = -Infinity;
      for (const b of bounds) {
        p.copy(b).project(camera);
        x = Math.max(x, Math.abs(p.x)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      // Recenter vertically, then scale the distance to fill 94% of the box.
      look.y += ((y0 + y1) / 2) * (d * Math.tan((camera.fov * Math.PI) / 360));
      d *= Math.max(x, (y1 - y0) / 2) / 0.94;
    }
  };
  const size = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit();
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(host);

  const themeObs = new MutationObserver(mode);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", mode);

  // The lean follows the pointer anywhere on the page, eased so it drifts.
  const aim = { x: 0, y: 0 }, at = { x: 0, y: 0 };
  const move = (e: PointerEvent) => {
    aim.x = (e.clientX / innerWidth) * 2 - 1;
    aim.y = (e.clientY / innerHeight) * 2 - 1;
  };
  if (!opts.still) addEventListener("pointermove", move, { passive: true });

  const REST = -0.5; // where the dot sits when still: front right, as in the mark
  let start = 0, raf = 0, visible = true, ready = false;
  const frame = (now: number) => {
    if (!start) start = now;
    const t = now - start;
    if (opts.still) {
      orbit.rotation.z = REST;
    } else {
      // It swings in to its resting place, then keeps the beat from there.
      const intro = easeOut(Math.min(t / OPEN_MS, 1));
      const lap = Math.floor(t / LAP) + beat((t % LAP) / LAP);
      orbit.rotation.z = REST - (1 - intro) * 1.2 + lap * Math.PI * 2;
      at.x += (aim.x - at.x) * 0.05;
      at.y += (aim.y - at.y) * 0.05;
      lean.rotation.y = at.x * 0.18;
      lean.rotation.x = at.y * 0.08;
      tilt.position.y = Math.sin(t / 1800) * 0.04; // a slow float
    }
    castLight();
    renderer.render(scene, camera);
    if (!ready) { ready = true; opts.onReady(); }
    if (!opts.still && visible) raf = requestAnimationFrame(frame);
  };

  // Off screen, nothing draws.
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) raf = requestAnimationFrame(frame);
  });
  io.observe(host);
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); themeObs.disconnect();
      scheme.removeEventListener("change", mode);
      removeEventListener("pointermove", move);
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.geometry.dispose();
        const m = o.material as MeshPhysicalMaterial;
        m.map?.dispose(); m.alphaMap?.dispose(); m.dispose();
      });
      tint.dispose(); glow.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
