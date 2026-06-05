# powerflow

Animated SVG energy-flow diagram — **framework-agnostic**. Shows live power
flow between **solar, grid, home, battery and wallbox** with dots whose speed is
proportional to the actual power. No canvas, just scalable vectors; no runtime
framework dependency.

It ships as a `<power-flow>` **Web Component** (works natively in React,
Angular, Vue, Svelte or plain HTML) plus a tiny vanilla API. Battery and wallbox
nodes are optional and appear automatically when you pass their values.

## Install

```bash
npm install powerflow
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

## React

```tsx
import "powerflow";
import { useRef, useEffect } from "react";

export function Energy({ data }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.data = data; }, [data]);
  return <power-flow ref={ref} />;
}
```

(React ≥ 19 also lets you pass `data={data}` directly.)

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to your module/component, `import "powerflow";`
once, then:

```html
<power-flow [data]="data" [colors]="colors"></power-flow>
```

## Vue 3

`import "powerflow";` once, tell Vue the tag is a custom element
(`compilerOptions.isCustomElement`), then:

```vue
<power-flow :data="data" :labels="labels" />
```

## Vanilla API (no custom element)

```ts
import { createPowerFlow } from "powerflow";

const pf = createPowerFlow(document.getElementById("box"), { data });
pf.update({ data: nextData }); // cheap, call as often as you like
pf.destroy();
```

The diagram renders into a shadow root on the host element, so its styles never
leak into your app.

## API

| Property / option | Type                  | Description                        |
| ----------------- | --------------------- | --------------------------------- |
| `data`            | `FlowData`            | Live power readings (watts).      |
| `colors`          | `Partial<FlowColors>` | Override any accent color.        |
| `labels`          | `Partial<FlowLabels>` | Override node labels (i18n).      |

### `FlowData`

| Field        | Type             | Description                                            |
| ------------ | ---------------- | ----------------------------------------------------- |
| `solar`      | `number \| null` | Solar / PV production (≥ 0). Optional.                 |
| `grid`       | `number`         | Grid power. Positive = import, negative = export.     |
| `load`       | `number`         | House consumption (≥ 0).                               |
| `battery`    | `number \| null` | Positive = discharging, negative = charging. Optional. |
| `batterySoc` | `number \| null` | Battery state of charge in percent. Optional.         |
| `wallbox`    | `number \| null` | EV charger consumption, drawn below the house. Optional. |
| `wallbox2`   | `number \| null` | Second EV charger, drawn above the house. Optional.   |

> Only `grid` and `load` are required. Omitting (or passing `null` for) `solar` /
> `battery` / `wallbox` / `wallbox2` hides that node, and the diagram trims the
> now-empty row so there's no dead space.
> Both wallboxes are sub-consumers of `load`, not extra load on top of it.

### `colors`

```ts
{
  solar:   "#fb8c00", // orange
  home:    "#43a047", // green
  gridIn:  "#1e88e5", // blue  — importing from grid
  gridOut: "#e53935", // red   — exporting to grid
  battery:  "#8e24aa", // violet
  wallbox:  "#00acc1", // cyan
  wallbox2: "#00897b", // teal
}
```

### `labels` (i18n)

Defaults are English. Override per language, e.g.
`{ grid: "Netz", home: "Haus", battery: "Akku" }`.

## Playground

```bash
npm install
npm run dev   # open the printed URL — sliders, test-case buttons, "simulate day"
```

## Build

```bash
npm run build        # both of the below
npm run build:lib    # → dist/      the publishable library (JS bundles + .d.ts)
npm run build:site   # → dist-site/ the static playground (e.g. for GitHub Pages)
```

## License

MIT
