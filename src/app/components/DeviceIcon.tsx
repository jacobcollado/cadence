// The marks that name a device: the Apple and Android marks, and a plain
// laptop drawn to the same weight.

export type Device = "laptop" | "apple" | "android";

export function DeviceIcon({ device }: { device: Device }) {
  if (device === "apple") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
  if (device === "android") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2 19a10 10 0 0 1 20 0zM7 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0zM14.8 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0z" />
      <path d="M6.6 10.2L4.4 6.4M17.4 10.2l2.2-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.5 4h13A1.5 1.5 0 0 1 20 5.5V16H4V5.5A1.5 1.5 0 0 1 5.5 4zM6 6v8h12V6z" />
      <rect x="1.5" y="17.5" width="21" height="2.5" rx="1.25" />
    </svg>
  );
}
