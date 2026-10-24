import { useState, type ReactNode } from "react";
import { CopyButton, Icon } from "./ui";

// The install steps on the home page: a terminal command per package manager,
// then the root layout with the lines to add marked like a diff.

const PACKAGE = "cadence-probe";
const MANAGERS = [
  { id: "npm", cmd: `npm install ${PACKAGE}` },
  { id: "pnpm", cmd: `pnpm add ${PACKAGE}` },
  { id: "yarn", cmd: `yarn add ${PACKAGE}` },
  { id: "bun", cmd: `bun add ${PACKAGE}` },
] as const;
type Manager = (typeof MANAGERS)[number]["id"];
const KEY = "cadence.pm";

/** Lines of the layout file; `add` marks the ones the user writes. */
const LAYOUT: { text: string; add?: boolean }[] = [
  { text: `import { Cadence } from "${PACKAGE}";`, add: true },
  { text: "" },
  { text: "export default function RootLayout({ children }) {" },
  { text: "  return (" },
  { text: "    <html>" },
  { text: "      <body>" },
  { text: "        {children}" },
  { text: "        <Cadence />", add: true },
  { text: "      </body>" },
  { text: "    </html>" },
  { text: "  );" },
  { text: "}" },
];

export function Install() {
  const [pm, setPm] = useState<Manager>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return MANAGERS.some((m) => m.id === saved) ? (saved as Manager) : "npm";
    } catch {
      return "npm";
    }
  });
  const pick = (id: Manager) => {
    setPm(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  };
  const cmd = MANAGERS.find((m) => m.id === pm)!.cmd;
  const added = LAYOUT.filter((l) => l.add).map((l) => l.text.trim()).join("\n");

  return (
    <div className="install-steps">
      <div className="term">
        <div className="term-head">
          <div className="pm-tabs" role="tablist" aria-label="Package manager">
            {MANAGERS.map((m) => (
              <button key={m.id} role="tab" aria-selected={pm === m.id} onClick={() => pick(m.id)}>{m.id}</button>
            ))}
          </div>
          <CopyButton text={() => cmd} label="Copy" className="tag-btn code-copy" />
        </div>
        <pre className="term-body"><code><span className="tok-prompt" aria-hidden="true">$</span>{highlightShell(cmd)}</code></pre>
      </div>

      <div className="term">
        <div className="term-head">
          <span className="term-file"><Icon name="file" size={14} />app/layout.tsx</span>
          <CopyButton text={() => added} label="Copy" className="tag-btn code-copy" />
        </div>
        <pre className="term-body term-file-body">
          <code>
            {LAYOUT.map((l, i) => (
              <span key={i} className="line" data-add={l.add || undefined}>
                <span className="gutter" aria-hidden="true">{l.add ? "+" : ""}</span>
                {highlightTsx(l.text)}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function highlightShell(cmd: string): ReactNode {
  const [tool, verb, ...rest] = cmd.split(" ");
  return (
    <>
      <span className="tok-cmd">{tool}</span> <span className="tok-kw">{verb}</span> {rest.join(" ")}
    </>
  );
}

// A small, quiet highlighter: keywords and punctuation step back, strings and
// tags stay in full ink. Enough to read as code, not a rainbow.
const TOKENS = /("[^"]*")|\b(import|from|export|default|function|return)\b|(<\/?[A-Za-z][\w.]*|\/?>)|([{}();,])/g;

function highlightTsx(line: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKENS)) {
    if (m.index! > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? "tok-str" : m[2] ? "tok-kw" : m[3] ? "tok-tag" : "tok-punct";
    out.push(<span key={m.index} className={cls}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
