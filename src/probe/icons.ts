const svg = (size: number, body: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** The mark: a dot on an orbit. */
export const mark = (size = 14) =>
  `<svg width="${size}" height="${(size * 14) / 16}" viewBox="0 0 16 14" aria-hidden="true"><path d="M13.2 7.27A5.25 5.25 0 1 1 7.82 2.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="11.38" cy="3.98" r="1.9" fill="currentColor"/></svg>`;

export const minus = (s = 14) => svg(s, `<path d="M3.5 8h9"/>`);
export const close = (s = 14) => svg(s, `<path d="M4 4l8 8M12 4l-8 8"/>`);
export const chevron = (s = 12) => svg(s, `<path d="M4 6l4 4 4-4"/>`);
export const external = (s = 14) => svg(s, `<path d="M6 3.5H3.5v9h9V10M9 3h4v4M13 3L7.5 8.5"/>`);
export const link = (s = 14) => svg(s, `<path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1"/>`);
export const check = (s = 14) => svg(s, `<path d="M3.5 8.5l3 3 6-7"/>`);
export const again = (s = 14) => svg(s, `<path d="M3 8a5 5 0 109-3M12 2.5V5H9.5"/>`);
// Ratings differ in shape as well as color.
export const smooth = (s = 12) => svg(s, `<circle cx="8" cy="8" r="6.25"/><path d="M5.5 8.25l1.75 1.75 3.25-3.75"/>`);
export const uneven = (s = 12) => svg(s, `<path d="M7.13 2.75a1 1 0 011.74 0l5.2 9a1 1 0 01-.87 1.5H2.8a1 1 0 01-.87-1.5z"/><path d="M8 6.75v2.5M8 11.5h.01"/>`);
export const choppy = (s = 12) => svg(s, `<circle cx="8" cy="8" r="6.25"/><path d="M8 5v3.5M8 11h.01"/>`);
export const locate = (s = 12) => svg(s, `<circle cx="8" cy="8" r="2"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5"/>`);
export const code = (s = 12) => svg(s, `<path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5"/>`);
export const layout = (s = 12) => svg(s, `<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6.5h11M6.5 6.5v7"/>`);
export const drawing = (s = 12) => svg(s, `<path d="M10.5 2.5l3 3-7.5 7.5H3V10z"/><path d="M9 4l3 3"/>`);
export const steady = (s = 12) => svg(s, `<path d="M3 7.5a5 5 0 019-3l1 1M13 8.5a5 5 0 01-9 3l-1-1"/><path d="M13 2.75v2.75h-2.75M3 13.25V10.5h2.75"/>`);
export const info = (s = 12) => svg(s, `<circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v3.5M8 5.25h.01"/>`);
export const bulb = (s = 14) => svg(s, `<path d="M6 12.5h4M6.5 14.25h3M8 1.75a4.25 4.25 0 00-2.5 7.7c.4.3.75.8.75 1.3v.25h3.5v-.25c0-.5.35-1 .75-1.3A4.25 4.25 0 008 1.75z"/>`);
