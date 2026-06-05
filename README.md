<div align="center">

# ⚡ powerflow

**Animated, framework-agnostic SVG energy-flow diagram.**

Live power flow between **solar, grid, home, battery and two wallboxes** — with
dots whose speed is proportional to the actual power.

[![npm](https://img.shields.io/npm/v/powerflow?color=cb3837&logo=npm)](https://www.npmjs.com/package/powerflow)
[![bundle size](https://img.shields.io/bundlephobia/minzip/powerflow?label=min%2Bgzip)](https://bundlephobia.com/package/powerflow)
[![zero deps](https://img.shields.io/badge/dependencies-0%20runtime-brightgreen)](#)
[![license](https://img.shields.io/npm/l/powerflow?color=blue)](./LICENSE)

<br />

<img src="https://raw.githubusercontent.com/mihaitom/power-flow-diagram/main/docs/preview.gif" alt="powerflow — animated energy-flow diagram" width="460" />

<br />

[**▶ Try the live playground**](https://mihaitom.github.io/power-flow-diagram/)

</div>

---

It ships as a `<power-flow>` **Web Component**, so it works natively in **React,
Angular, Vue, Svelte or plain HTML** — plus a tiny vanilla API. No canvas, just
crisp scalable vectors; no runtime framework dependency.

- 🔋 **Optional nodes** — solar, battery and both wallboxes appear automatically
  when you pass their values, and the layout trims away the empty rows.
- 🎯 **Power-proportional animation** — dot speed scales with watts, and stays
  smooth (no jumping) as values update.
- 🧮 **Consistent flow math** — each source is split across its sinks with no
  double-counting, modelled after Home Assistant's
  [power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus).
- 💍 **Coverage rings** — the home ring shows what feeds the load (solar / battery
  / grid); the grid ring shows what feeds an export (solar / battery).
- 🎨 **Themeable** — every node colour and label is overridable.
- 🪶 **Tiny & isolated** — ~6 kB min+gzip, zero runtime deps, rendered in a shadow
  root so its styles never leak.

## Install

```bash
npm install powerflow
```

…or straight from a CDN, no build step:

```html
<script type="module" src="https://unpkg.com/powerflow"></script>
```

## Quick start (any framework / plain HTML)

```html
<script type="module">
  import "powerflow"; // registers the <power-flow> element
</script>

<power-flow id="pf"></power-flow>

<script type="module">
  const pf = document.getElementById("pf");
  pf.data = {
    solar: 2400,    // PV production (W)
    grid: -600,     // grid power: + import, − export
    load: 1800,     // house consumption (W)
    battery: -300,  // + discharging, − charging (optional)
    batterySoc: 82, // state of charge in % (optional)
    wallbox: 1100,  // EV charger consumption (optional)
  };
</script>
```

`data`, `colors` and `labels` are set as JS **properties** (objects). In plain
HTML you can also pass them as JSON attributes:
`<power-flow data='{"solar":2400,"grid":-600,"load":1800}'></power-flow>`.

## Framework usage

<details open>
<summary><b>React</b></summary>

```tsx
import "powerflow";
import { useRef, useEffect } from "react";

export function Energy({ data }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.data = data; }, [data]);
  return <power-flow ref={ref} />;
}
```

React ≥ 19 also lets you pass `data={data}` directly.

</details>

<details>
<summary><b>Angular</b></summary>

Add `CUSTOM_ELEMENTS_SCHEMA` to your module/component, `import "powerflow";`
once, then:

```html
<power-flow [data]="data" [colors]="colors"></power-flow>
```

</details>

<details>
<summary><b>Vue 3</b></summary>

`import "powerflow";` once, tell Vue the tag is a custom element
(`compilerOptions.isCustomElement`), then:

```vue
<power-flow :data="data" :labels="labels" />
```

</details>

<details>
<summary><b>Vanilla (no custom element)</b></summary>

```ts
import { createPowerFlow } from "powerflow";

const pf = createPowerFlow(document.getElementById("box"), { data });
pf.update({ data: nextData }); // cheap, call as often as you like
pf.destroy();
```

The diagram renders into a shadow root on the host element, so its styles never
leak into your app.

</details>

## API

| Property / option | Type                  | Description                  |
| ----------------- | --------------------- | ---------------------------- |
| `data`            | `FlowData`            | Live power readings (watts). |
| `colors`          | `Partial<FlowColors>` | Override any accent colour.  |
| `labels`          | `Partial<FlowLabels>` | Override node labels (i18n). |

### `FlowData`

| Field        | Type             | Description                                              |
| ------------ | ---------------- | ------------------------------------------------------- |
| `solar`      | `number \| null` | Solar / PV production (≥ 0). Optional.                  |
| `grid`       | `number`         | Grid power. Positive = import, negative = export.       |
| `load`       | `number`         | Total house consumption (≥ 0).                          |
| `battery`    | `number \| null` | Positive = discharging, negative = charging. Optional.  |
| `batterySoc` | `number \| null` | Battery state of charge in percent. Optional.           |
| `wallbox`    | `number \| null` | EV charger consumption, drawn below the house. Optional.|
| `wallbox2`   | `number \| null` | Second EV charger, drawn above the house. Optional.     |

> Only `grid` and `load` are required. Omitting (or passing `null` for) `solar` /
> `battery` / `wallbox` / `wallbox2` hides that node, and the diagram trims the
> now-empty row so there's no dead space. Both wallboxes are sub-consumers of
> `load`, not extra load on top of it.

### `colors`

```ts
{
  solar:    "#fb8c00", // orange
  home:     "#43a047", // green
  gridIn:   "#1e88e5", // blue  — importing from grid
  gridOut:  "#e53935", // red   — exporting to grid
  battery:  "#8e24aa", // violet
  wallbox:  "#00acc1", // cyan
  wallbox2: "#00897b", // teal
}
```

### `labels` (i18n)

Defaults are English. Override per language, e.g.
`{ grid: "Netz", home: "Haus", battery: "Akku" }`.

## How the flows are computed

Meters only tell you the net at each node, so `powerflow` decomposes them into
the individual legs by priority — every source is split across the sinks it
feeds, with nothing double-counted:

1. a **charging battery** is fed from solar first (the rest from the grid),
2. remaining **solar** serves the house, then exports,
3. a **discharging battery** covers the house's remaining demand, then exports,
4. the **grid** covers whatever the house still needs.

This matches the convention of
[power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus), so e.g.
`solar 1000 W, load 1000 W, battery charging 100 W, grid +100 W` correctly shows
solar→battery 100, solar→home 900 and grid→home 100 — not a single solar→home
line.

## Development

```bash
npm install
npm run dev          # playground: sliders, test-case buttons, "simulate day"

npm run build        # both of the below
npm run build:lib    # → dist/      the publishable library (JS bundles + .d.ts)
npm run build:site   # → dist-site/ the static playground (e.g. for GitHub Pages)
```

## Credits

Inspired by [**power-flow-card-plus**](https://github.com/flixlix/power-flow-card-plus)
by [@flixlix](https://github.com/flixlix) — the excellent Home Assistant card.
`powerflow` reuses its flow-allocation conventions but is a standalone,
framework-agnostic Web Component with no Home Assistant dependency.

## License

[MIT](./LICENSE) © Thomas Mihailovits
