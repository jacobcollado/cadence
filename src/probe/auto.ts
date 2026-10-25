import { boot } from "./index";

// The script-tag build (probe.js): starts itself as soon as the page has a body.
// Read while this script is still the one executing; it's null afterwards.
const script = document.currentScript as HTMLScriptElement | null;
const start = () => boot({ app: script?.dataset.app, src: script?.src });

if (document.body) start();
else document.addEventListener("DOMContentLoaded", start, { once: true });
