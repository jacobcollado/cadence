import type { Device } from "../shared/run";

interface UAData {
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string }>;
}

const BROWSERS: [RegExp, string][] = [
  [/EdgiOS\/([\d.]+)/, "Edge"],
  [/EdgA?\/([\d.]+)/, "Edge"],
  [/OPR\/([\d.]+)/, "Opera"],
  [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
  [/CriOS\/([\d.]+)/, "Chrome"],
  [/FxiOS\/([\d.]+)/, "Firefox"],
  [/Firefox\/([\d.]+)/, "Firefox"],
  [/Chrome\/([\d.]+)/, "Chrome"],
  [/Version\/([\d.]+).*Safari/, "Safari"],
];

export async function readDevice(): Promise<Device> {
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & {
    userAgentData?: UAData;
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };
  const touch = navigator.maxTouchPoints > 0;

  let model: string | undefined;
  let platformVersion: string | undefined;
  try {
    const hints = await nav.userAgentData?.getHighEntropyValues?.(["model", "platformVersion"]);
    model = hints?.model || undefined;
    platformVersion = hints?.platformVersion;
  } catch {}

  let os = "Unknown";
  let osVersion: string | undefined;
  let kind: Device["kind"] = "computer";
  let base = "Computer";

  if (/iPhone/.test(ua)) {
    os = "iOS"; kind = "phone"; base = "iPhone";
    osVersion = ua.match(/OS (\d+)[_.](\d+)/)?.slice(1).join(".");
  } else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch)) {
    os = "iPadOS"; kind = "tablet"; base = "iPad";
  } else if (/Android/.test(ua)) {
    os = "Android";
    osVersion = ua.match(/Android (\d+(?:\.\d+)?)/)?.[1];
    kind = /Mobile/.test(ua) ? "phone" : "tablet";
    base = model ?? (kind === "phone" ? "Android phone" : "Android tablet");
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = "macOS"; base = "Mac";
  } else if (/Windows/.test(ua)) {
    os = "Windows"; base = "Windows PC";
    if (platformVersion) osVersion = parseInt(platformVersion) >= 13 ? "11" : "10";
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS"; base = "Chromebook";
  } else if (/Linux/.test(ua)) {
    os = "Linux"; base = "Linux PC";
  }

  let browser = "Browser";
  let browserVersion: string | undefined;
  for (const [re, name] of BROWSERS) {
    const m = ua.match(re);
    if (m) {
      browser = name;
      const parts = m[1].split(".");
      browserVersion = name === "Safari" ? parts.slice(0, 2).join(".") : parts[0];
      break;
    }
  }

  const gpu = readGpu();
  // Chrome on a Mac names the chip, which says more than "Mac" alone.
  if (base === "Mac" && gpu?.startsWith("Apple M")) base = `Mac ${gpu.replace("Apple ", "")}`;

  return {
    name: `${base} · ${browser}${browserVersion ? " " + browserVersion : ""}`,
    kind, os, osVersion, browser, browserVersion, model, gpu,
    cores: navigator.hardwareConcurrency || undefined,
    memory: nav.deviceMemory,
    screen: [screen.width, screen.height],
    viewport: [innerWidth, innerHeight],
    dpr: Math.round(devicePixelRatio * 100) / 100,
    touch,
    connection: nav.connection?.effectiveType,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function readGpu(): string | undefined {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return cleanGpu(raw);
  } catch {
    return;
  }
}

// "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)" -> "Apple M2"
// "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)" -> "NVIDIA GeForce RTX 3070"
export function cleanGpu(raw: string): string {
  let s = raw;
  const angle = s.match(/^ANGLE \((.+)\)$/);
  if (angle) {
    const parts = angle[1].split(", ");
    s = parts[1] ?? parts[0];
  }
  return s
    .replace(/^ANGLE Metal Renderer: /, "")
    .replace(/\s*\(0x[0-9a-f]+\)/i, "")
    .replace(/\s+Direct3D.*$/, "")
    .replace(/\s+vs_\d.*$/, "")
    .replace(/\((TM|R)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
