import type { Run } from "../shared/run";
import { LAYOUT, MIN_SECTION_TIME, MODE_LABEL, RATING_LABEL, type Cause, type RunStats } from "../shared/stats";
import { ADVICE, CAUSE_LABEL, scrollTip } from "../shared/advice";
import { LEVEL_LABEL, type MemoryReport, type Metric } from "../shared/vitals";
import { pathOf } from "./lib";

/**
 * A report as Markdown, for pasting into a pull request or an issue: the
 * verdicts, the sections, the cause and the first fix, and a link back.
 */
export function reportMarkdown(run: Run, stats: RunStats, cause: Cause, metrics: Metric[], mem: MemoryReport | null, link: string): string {
  const [device, browser] = run.device.name.split(" · ");
  const lines: string[] = [];
  lines.push(`### Cadence: ${device} on ${pathOf(run.url)}`);
  lines.push("");
  lines.push(`${browser}, ${MODE_LABEL[run.mode].toLowerCase()}, ${run.hz} Hz screen${run.load ? `, ${run.load} ms added load` : ""}`);
  lines.push("");

  const graded = metrics.filter((m) => m.level);
  const worst = graded.find((m) => m.level === "bad") ?? graded.find((m) => m.level === "warn") ?? metrics.find((m) => m.key === "lcp");
  lines.push(`- **Smoothness:** ${RATING_LABEL[stats.rating]}, ${Math.round(stats.fps)} fps out of ${run.hz}, ${stats.dropped} dropped frames, longest frame ${Math.round(stats.worst)} ms`);
  if (worst?.value !== undefined) lines.push(`- **Page load:** ${worst.name} ${worst.display}${worst.level ? ` (${LEVEL_LABEL[worst.level].toLowerCase()})` : ""}`);
  if (mem) {
    const what = [
      mem.heap ? `${mem.heap.peak.toFixed(1)} MB heap at its peak` : "heap not measured",
      mem.nodes ? `${mem.nodes.end.toLocaleString()} page elements` : "",
    ].filter(Boolean).join(", ");
    lines.push(`- **Memory:** ${mem.level === "good" ? "Steady" : "Growing"}, ${what}`);
  }
  lines.push("");

  const rows = stats.sections.filter((s) => s.frames > 0);
  if (rows.length) {
    lines.push("| Section | Rating | Frame rate | Dropped frames | Longest frame |");
    lines.push("|---|---|--:|--:|--:|");
    for (const s of rows) {
      const rating = s.time >= MIN_SECTION_TIME ? RATING_LABEL[s.rating] : "Too brief";
      lines.push(`| ${s.label} | ${rating} | ${Math.round(s.fps)} fps | ${s.dropped} | ${Math.round(s.worst)} ms |`);
    }
    lines.push("");
  }

  if (cause.kind) {
    lines.push(`**Why it slowed down: ${CAUSE_LABEL[cause.kind]}.** ${cause.text}`);
    const top = cause.culprits[0];
    if (top) lines.push(`${top.name === LAYOUT ? "Busy with" : "Top script"}: \`${top.name}\`${top.file ? ` in ${top.file}` : ""}, ${Math.round(top.total).toLocaleString()} ms over ${top.count === 1 ? "one run" : `${top.count} runs`}.`);
    const tip = cause.kind === "script" && top && /scroll/i.test(top.name) ? scrollTip(top.name, top.count, top.total) : ADVICE[cause.kind][0];
    lines.push("");
    lines.push(`**First fix to try: ${tip.title}.** ${tip.detail}`);
    lines.push("");
  }

  lines.push(`[Open the full report](${link})`);
  return lines.join("\n");
}
