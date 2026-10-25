# cadence-probe

Stress test your site on the devices your customers use. [cad-ence.dev](https://cad-ence.dev)

Cadence records every frame while a page scrolls on a real phone, laptop or desktop, then shows which section stutters, and why.

Nothing loads for your visitors. The probe only downloads and starts when the address carries `?perf`, and stays on for that tab until you close its panel or visit with `?perf=off`.

## Install

```sh
npm install cadence-probe
```

## React and Next.js

Add it once, to your root layout:

```tsx
import { Cadence } from "cadence-probe/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Cadence />
      </body>
    </html>
  );
}
```

## Any other site

```ts
import { loadCadence } from "cadence-probe";

loadCadence();
```

## Run a test

Open any page with `?perf` on the end, on any device. A small panel appears: pick a pass (steady scroll, fast scroll, idle or manual), run it, and open the report.

## Options

| Option | Default | |
|---|---|---|
| `param` | `"perf"` | The query switch that turns the probe on. |
| `app` | `"https://cad-ence.dev"` | Where reports open. |
| `enabled` | `true` | Set `false` to never load, for example outside staging. |

Because the probe ships inside your own bundle, it works under strict Content Security Policies with no extra setup.

## License

MIT
