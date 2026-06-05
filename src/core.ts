import {
  mdiSolarPowerVariant,
  mdiTransmissionTower,
  mdiHome,
  mdiBatteryMedium,
  mdiEvStation,
} from "@mdi/js";

/** Live energy readings driving the diagram. All power values are in watts. */
export interface FlowData {
  /** Solar / PV production (>= 0). Omit/null hides the solar node. */
  solar?: number | null;
  /** Grid power. Positive = importing from grid, negative = exporting. */
  grid: number;
  /** House consumption (>= 0). */
  load: number;
  /** Battery power. Positive = discharging (to house), negative = charging. Omit/null hides the battery node. */
  battery?: number | null;
  /** Battery state of charge in percent (0–100). */
  batterySoc?: number | null;
  /** Wallbox / EV charger consumption (below the house). Omit/null hides the node. */
  wallbox?: number | null;
  /** Second wallbox / EV charger consumption (above the house). Omit/null hides the node. */
  wallbox2?: number | null;
}

/** Color for each node and flow direction. Any CSS color string. */
export interface FlowColors {
  solar: string;
  home: string;
  /** Grid node + dots while importing from the grid. */
  gridIn: string;
  /** Grid node + dots while exporting to the grid. */
  gridOut: string;
  battery: string;
  wallbox: string;
  wallbox2: string;
}

/** Text label under each node. */
export interface FlowLabels {
  solar: string;
  grid: string;
  home: string;
  battery: string;
  wallbox: string;
  wallbox2: string;
}

export interface PowerFlowOptions {
  data: FlowData;
  colors?: Partial<FlowColors>;
  labels?: Partial<FlowLabels>;
}

// Defaults mirror common energy-dashboard conventions:
// Solar = orange, consumption/home = green, grid import = blue,
// grid export = red, wallbox = cyan, second wallbox = teal, battery = violet.
const DEFAULT_COLORS: FlowColors = {
  solar: "#fb8c00",
  home: "#43a047",
  gridIn: "#1e88e5",
  gridOut: "#e53935",
  battery: "#8e24aa",
  wallbox: "#00acc1",
  wallbox2: "#00897b",
};

const DEFAULT_LABELS: FlowLabels = {
  solar: "Solar",
  grid: "Grid",
  home: "Home",
  battery: "Battery",
  wallbox: "Wallbox",
  wallbox2: "Wallbox 2",
};

const SVGNS = "http://www.w3.org/2000/svg";

// Home arc: circumference for r=47 (inner ring of the home circle, r=52).
const ARC_LENGTH = 2 * Math.PI * 47; // ≈ 295.31

// MDI paths live in a 24×24 box. We draw native SVG paths instead of
// foreignObject because Safari/WebKit mis-positions foreignObject inside
// scaled SVGs. Centers the icon at (centerX, centerY) and scales it to size.
function iconTransform(centerX: number, centerY: number, size: number): string {
  return `translate(${centerX - size / 2} ${centerY - size / 2}) scale(${size / 24})`;
}

function formatWatts(watts: number): string {
  return Math.abs(watts) >= 1000
    ? `${(watts / 1000).toFixed(1)} kW`
    : `${Math.round(watts)} W`;
}

/** Translucent fill derived from a node's accent color. */
function tint(color: string): string {
  return `color-mix(in srgb, ${color} 15%, transparent)`;
}

// One entry per animated dot. `cls` selects the dot color via CSS.
const DOTS = [
  { id: "solar-home", cls: "solar", path: "p-solar-home" },
  { id: "solar-grid", cls: "return", path: "p-solar-grid" },
  { id: "grid-home", cls: "grid", path: "p-grid-home" },
  { id: "bat-home", cls: "battery-out", path: "p-bat-home" },
  { id: "bat-grid", cls: "return", path: "p-bat-grid" },
  { id: "solar-bat", cls: "battery-in", path: "p-solar-bat" },
  { id: "home-wallbox", cls: "wallbox", path: "p-home-wallbox" },
  { id: "home-wallbox2", cls: "wallbox2", path: "p-home-wallbox2" },
] as const;

const CSS = `
:host { display: block; }
/* Fill the host box in both dimensions; preserveAspectRatio="meet" (the SVG
   default) keeps the diagram centered and uncropped. The host gets a natural
   aspect-ratio (set from the viewBox) so that, when no explicit height is
   given, the height still follows the width as before. */
.flow-svg { width: 100%; height: 100%; display: block; }

.track {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  opacity: 0.15;
}

.dot { stroke-width: 4; }
.dot.solar { fill: var(--sfd-solar); stroke: var(--sfd-solar); }
.dot.grid { fill: var(--sfd-grid-in); stroke: var(--sfd-grid-in); }
.dot.return { fill: var(--sfd-grid-out); stroke: var(--sfd-grid-out); }
.dot.battery-out, .dot.battery-in { fill: var(--sfd-battery); stroke: var(--sfd-battery); }
.dot.wallbox { fill: var(--sfd-wallbox); stroke: var(--sfd-wallbox); }
.dot.wallbox2 { fill: var(--sfd-wallbox2); stroke: var(--sfd-wallbox2); }

.node-bg { stroke: none; }
.node-ring { fill: none; stroke-width: 2.5; }
.node.dim { opacity: 0.3; }

.home-arc {
  fill: none;
  stroke-width: 4;
  transition: stroke-dasharray 0.4s, stroke-dashoffset 0.4s;
}
.home-arc.solar-arc { stroke: var(--sfd-solar); }
.home-arc.bat-arc { stroke: var(--sfd-battery); }
.home-arc.grid-arc { stroke: var(--sfd-grid-in); }

.val-text { font-size: 14px; text-anchor: middle; fill: currentColor; font-weight: 700; }
.lbl-text {
  font-size: 11px;
  text-anchor: middle;
  fill: currentColor;
  opacity: 0.55;
  font-weight: 500;
  letter-spacing: 0.04em;
}
`;

// Static SVG skeleton. Every node, track and dot is present from the start;
// topology (battery/wallbox) is toggled via `display`, so path lengths only
// have to be measured once and SMIL animations never restart on toggle.
//
// Diagonal paths fan out at the grid/home side by ±12 (y=173/197), mirroring
// the fan-out at the solar/battery side (x=188/212).
const SKELETON = `
<svg class="flow-svg" xmlns="${SVGNS}">
  <defs>
    <path id="p-solar-home" d="M212,112 C212,150 256,173 294,173" />
    <path id="p-solar-grid" d="M188,112 C188,150 144,173 106,173" />
    <path id="p-grid-home" d="M107,185 H293" />
    <path id="p-bat-home" d="M212,258 C212,220 256,197 294,197" />
    <path id="p-bat-grid" d="M188,258 C188,220 144,197 106,197" />
    <path id="p-solar-bat" d="M200,112 V258" />
    <path id="p-home-wallbox" d="M345,237 V258" />
    <path id="p-home-wallbox2" d="M345,133 V112" />
  </defs>

  <use href="#p-solar-home" class="track" data-topo="solar" />
  <use href="#p-solar-grid" class="track" data-topo="solar" />
  <use href="#p-grid-home" class="track" />
  <use href="#p-bat-home" class="track" data-topo="battery" />
  <use href="#p-bat-grid" class="track" data-topo="battery" />
  <use href="#p-solar-bat" class="track" data-topo="solar-bat" />
  <use href="#p-home-wallbox" class="track" data-topo="wallbox" />
  <use href="#p-home-wallbox2" class="track" data-topo="wallbox2" />

  ${DOTS.map(
    (d) =>
      `<circle id="dot-${d.id}" r="2" class="dot ${d.cls}" vector-effect="non-scaling-stroke" />`,
  ).join("\n  ")}

  <!-- Coverage rings, drawn under the node bodies. The home ring shows how
       the load is sourced (solar/battery/grid); the grid ring shows how an
       export is sourced (solar/battery). In their own group so the solar
       node's "dim" state can't fade them. -->
  <g>
    <circle id="arc-solar" cx="345" cy="185" r="47" class="home-arc solar-arc" transform="rotate(-90 345 185)" />
    <circle id="arc-bat" cx="345" cy="185" r="47" class="home-arc bat-arc" transform="rotate(-90 345 185)" />
    <circle id="arc-grid" cx="345" cy="185" r="47" class="home-arc grid-arc" transform="rotate(-90 345 185)" />
    <circle id="garc-solar" cx="55" cy="185" r="47" class="home-arc solar-arc" transform="rotate(-90 55 185)" />
    <circle id="garc-bat" cx="55" cy="185" r="47" class="home-arc bat-arc" transform="rotate(-90 55 185)" />
  </g>

  <!-- ── Solar (top, optional) ── -->
  <g id="n-solar" class="node" data-topo="solar">
    <circle cx="200" cy="60" r="52" class="node-bg" id="solar-bg" />
    <circle cx="200" cy="60" r="52" class="node-ring" id="solar-ring" />
    <path id="solar-icon" transform="${iconTransform(200, 42, 28)}" d="${mdiSolarPowerVariant}" />
    <text x="200" y="76" class="val-text" id="t-solar-val"></text>
    <text x="200" y="89" class="lbl-text" id="t-solar-lbl"></text>
  </g>

  <!-- ── Grid (left) ── -->
  <g class="node">
    <circle cx="55" cy="185" r="52" class="node-bg" id="grid-bg" />
    <circle cx="55" cy="185" r="52" class="node-ring" id="grid-ring" />
    <path id="grid-icon" transform="${iconTransform(55, 167, 28)}" d="${mdiTransmissionTower}" />
    <text x="55" y="201" class="val-text" id="t-grid-val"></text>
    <text x="55" y="214" class="lbl-text" id="t-grid-lbl"></text>
  </g>

  <!-- ── Home (right) ── -->
  <g class="node">
    <circle cx="345" cy="185" r="52" class="node-bg" id="home-bg" />
    <circle cx="345" cy="185" r="52" class="node-ring" id="home-ring" />
    <path id="home-icon" transform="${iconTransform(345, 167, 28)}" d="${mdiHome}" />
    <text x="345" y="201" class="val-text" id="t-home-val"></text>
    <text x="345" y="214" class="lbl-text" id="t-home-lbl"></text>
  </g>

  <!-- ── Wallbox 2 (above the house, optional) ── -->
  <g id="n-wallbox2" class="node" data-topo="wallbox2">
    <circle cx="345" cy="60" r="52" class="node-bg" id="wb2-bg" />
    <circle cx="345" cy="60" r="52" class="node-ring" id="wb2-ring" />
    <path id="wb2-icon" transform="${iconTransform(345, 42, 28)}" d="${mdiEvStation}" />
    <text x="345" y="76" class="val-text" id="t-wb2-val"></text>
    <text x="345" y="89" class="lbl-text" id="t-wb2-lbl"></text>
  </g>

  <!-- ── Battery (bottom, optional) ── -->
  <g id="n-battery" class="node" data-topo="battery">
    <circle cx="200" cy="310" r="52" class="node-bg" id="bat-bg" />
    <circle cx="200" cy="310" r="52" class="node-ring" id="bat-ring" />
    <path id="bat-icon" transform="${iconTransform(200, 290, 28)}" d="${mdiBatteryMedium}" />
    <text x="200" y="323" class="val-text" id="t-bat-soc"></text>
    <text x="200" y="336" class="val-text" id="t-bat-watts" style="font-size: 11px; opacity: 0.75"></text>
    <text x="200" y="349" class="lbl-text" id="t-bat-lbl"></text>
  </g>

  <!-- ── Wallbox (below the house, optional) ── -->
  <g id="n-wallbox" class="node" data-topo="wallbox">
    <circle cx="345" cy="310" r="52" class="node-bg" id="wb-bg" />
    <circle cx="345" cy="310" r="52" class="node-ring" id="wb-ring" />
    <path id="wb-icon" transform="${iconTransform(345, 290, 28)}" d="${mdiEvStation}" />
    <text x="345" y="328" class="val-text" id="t-wb-val"></text>
    <text x="345" y="341" class="lbl-text" id="t-wb-lbl"></text>
  </g>
</svg>
`;

/**
 * Framework-agnostic renderer for the energy-flow diagram. Renders into a
 * shadow root attached to the given host element, so its styles never leak.
 */
export class PowerFlow {
  private root: ShadowRoot;
  private svg!: SVGSVGElement;
  private el: Record<string, Element> = {};
  private colors: FlowColors = DEFAULT_COLORS;
  private labels: FlowLabels = DEFAULT_LABELS;

  // Per-dot animation state. We drive the dots ourselves (requestAnimationFrame)
  // instead of SMIL so a speed change keeps each dot's position continuous —
  // SMIL would restart the motion from the path start on every `dur` change,
  // making the dots jump while a value is being dragged.
  private dots: Record<
    string,
    {
      circle: SVGCircleElement;
      path: SVGPathElement;
      length: number;
      speed: number; // px/s
      visible: boolean;
      prog: number; // 0..1 along the path
    }
  > = {};
  private raf = 0;
  private lastTime = 0;

  constructor(host: HTMLElement, options: PowerFlowOptions) {
    this.root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    this.root.innerHTML = `<style>${CSS}</style>${SKELETON}`;
    this.svg = this.root.querySelector("svg")!;
    this.cacheRefs();
    this.initDots();
    this.update(options);
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private cacheRefs() {
    this.svg.querySelectorAll<Element>("[id]").forEach((node) => {
      this.el[node.id] = node;
    });
  }

  private initDots() {
    for (const d of DOTS) {
      const path = this.svg.querySelector<SVGPathElement>(`#${d.path}`)!;
      this.dots[d.id] = {
        circle: this.el[`dot-${d.id}`] as SVGCircleElement,
        path,
        length: path.getTotalLength(),
        speed: 0,
        visible: false,
        prog: Math.random(), // stagger start positions
      };
    }
  }

  // Single animation loop for all dots. Advances each visible dot along its path
  // by speed·dt, wrapping at the end. dt is capped so returning from a
  // background tab doesn't teleport the dots.
  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    for (const id in this.dots) {
      const s = this.dots[id];
      if (!s.visible || s.length === 0) continue;
      s.prog += (s.speed * dt) / s.length;
      s.prog -= Math.floor(s.prog); // wrap into [0, 1)
      const p = s.path.getPointAtLength(s.prog * s.length);
      s.circle.setAttribute("cx", String(p.x));
      s.circle.setAttribute("cy", String(p.y));
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Re-render with new data / colors / labels. Cheap to call frequently. */
  update(options: PowerFlowOptions) {
    const data = options.data;
    if (options.colors !== undefined) {
      this.colors = { ...DEFAULT_COLORS, ...options.colors };
    }
    if (options.labels !== undefined) {
      this.labels = { ...DEFAULT_LABELS, ...options.labels };
    }
    const { colors, labels } = this;

    const solarWatts = data.solar ?? 0;
    const gridWatts = data.grid ?? 0;
    const loadWatts = data.load ?? 0;
    const batteryWatts = data.battery ?? 0;
    const wallboxWatts = data.wallbox ?? 0;
    const wallbox2Watts = data.wallbox2 ?? 0;
    const hasSolar = data.solar != null;
    const hasBattery = data.battery != null;
    const hasWallbox = data.wallbox != null;
    const hasWallbox2 = data.wallbox2 != null;

    // ── Flow allocation ──────────────────────────────────────────────
    // Each source (solar, battery, grid) is split across the sinks it feeds,
    // by priority, so every leg carries the power actually on it — the dot
    // speeds and home arcs all stay mutually consistent and never double-count
    // a shared meter (e.g. one export split between solar and battery).
    //
    //   1. Solar serves the house first (self-consumption),
    //   2. surplus solar charges the battery, then exports;
    //   3. the battery covers the house's remaining demand, then exports;
    //   4. the grid covers whatever the house still needs.
    //
    // `load` is the total house consumption; the wallbox is a sub-consumer of
    // it (drawn as a separate leg), not an extra load on top.
    const solarP = Math.max(solarWatts, 0);
    const load = Math.max(loadWatts, 0);
    const batteryDischarge = Math.max(batteryWatts, 0);
    const batteryCharge = Math.max(-batteryWatts, 0);

    const solarToHome = Math.min(solarP, load);
    const homeRemaining = load - solarToHome;
    const solarSurplus = solarP - solarToHome;

    const solarToBattery = Math.min(solarSurplus, batteryCharge);
    const solarToGrid = solarSurplus - solarToBattery;

    const batToHome = Math.min(batteryDischarge, homeRemaining);
    const batToGrid = batteryDischarge - batToHome;

    const gridToHome = homeRemaining - batToHome;

    // ViewBox: include the top row (solar / wallbox 2, edge y=8) and/or the
    // bottom row (battery / wallbox, edge y=362) only when something occupies
    // it, with an 8px margin. Absent rows are trimmed so the diagram never has
    // a large empty band — e.g. grid+home+battery starts at the middle row.
    const hasTop = hasSolar || hasWallbox2;
    const hasBottom = hasBattery || hasWallbox;
    const minY = hasTop ? 0 : 125; // middle row (cy 185, edge 133) − 8 margin
    const maxY = hasBottom ? 370 : 245; // battery edge 362 / home edge 237 + 8
    const height = maxY - minY;
    this.svg.setAttribute("viewBox", `0 ${minY} 400 ${height}`);

    // Give the host a natural aspect-ratio matching the current viewBox. When
    // the consumer sets an explicit height (e.g. a resizable container), that
    // wins and the diagram fits inside it; otherwise the height follows width.
    (this.root.host as HTMLElement).style.aspectRatio = `400 / ${height}`;

    // Expose colors to the CSS (dots and arcs) as custom properties.
    const style = this.svg.style;
    style.setProperty("--sfd-solar", colors.solar);
    style.setProperty("--sfd-grid-in", colors.gridIn);
    style.setProperty("--sfd-grid-out", colors.gridOut);
    style.setProperty("--sfd-battery", colors.battery);
    style.setProperty("--sfd-wallbox", colors.wallbox);
    style.setProperty("--sfd-wallbox2", colors.wallbox2);

    // Topology: show/hide the optional nodes and their tracks (each tagged with
    // a matching data-topo attribute). The solar↔battery track needs both nodes.
    this.setTopo("solar", hasSolar);
    this.setTopo("battery", hasBattery);
    this.setTopo("wallbox", hasWallbox);
    this.setTopo("wallbox2", hasWallbox2);
    this.setTopo("solar-bat", hasSolar && hasBattery);

    // ── Dots ──
    this.setDot("solar-home", solarToHome > 0, solarToHome);
    this.setDot("solar-grid", solarToGrid > 0, solarToGrid);
    this.setDot("grid-home", gridToHome > 0, gridToHome);
    this.setDot("bat-home", hasBattery && batToHome > 0, batToHome);
    this.setDot("bat-grid", hasBattery && batToGrid > 0, batToGrid);
    this.setDot("solar-bat", hasBattery && solarToBattery > 0, solarToBattery);
    this.setDot("home-wallbox", hasWallbox && wallboxWatts > 0, wallboxWatts);
    this.setDot("home-wallbox2", hasWallbox2 && wallbox2Watts > 0, wallbox2Watts);

    // ── Solar node ──
    if (hasSolar) {
      this.el["n-solar"].classList.toggle("dim", solarWatts === 0);
      this.fill("solar-bg", tint(colors.solar));
      this.stroke("solar-ring", colors.solar);
      this.fill("solar-icon", colors.solar);
      this.text("t-solar-val", formatWatts(solarWatts));
      this.text("t-solar-lbl", labels.solar);
    }

    // Home arc: the fraction of the house load covered by solar, battery and
    // grid — the same allocation as the dots, so the ring closes to a full
    // circle and the segments agree with the flows.
    const solarShare = load > 0 ? solarToHome / load : 0;
    const batteryShare = load > 0 ? batToHome / load : 0;
    const gridShare = load > 0 ? gridToHome / load : 0;
    this.arc("arc-solar", solarShare, solarShare, 0);
    this.arc("arc-bat", batteryShare, batteryShare, solarShare);
    this.arc("arc-grid", gridShare, gridShare, solarShare + batteryShare);

    // Grid arc: when exporting, what the export is made of (solar vs. battery).
    const gridExport = solarToGrid + batToGrid;
    const exportSolarShare = gridExport > 0 ? solarToGrid / gridExport : 0;
    const exportBatShare = gridExport > 0 ? batToGrid / gridExport : 0;
    this.arc("garc-solar", exportSolarShare, exportSolarShare, 0);
    this.arc("garc-bat", exportBatShare, exportBatShare, exportSolarShare);

    // ── Grid node ──
    const gridColor = gridWatts >= 0 ? colors.gridIn : colors.gridOut;
    this.fill("grid-bg", tint(gridColor));
    this.stroke("grid-ring", gridColor);
    this.fill("grid-icon", gridColor);
    const gridVal = this.el["t-grid-val"] as SVGTextElement;
    gridVal.setAttribute("fill", gridColor);
    gridVal.textContent = `${gridWatts >= 0 ? "→" : "←"} ${formatWatts(Math.abs(gridWatts))}`;
    this.text("t-grid-lbl", labels.grid);

    // ── Home node ──
    this.fill("home-bg", tint(colors.home));
    this.stroke("home-ring", colors.home);
    this.fill("home-icon", colors.home);
    this.text("t-home-val", formatWatts(loadWatts));
    this.text("t-home-lbl", labels.home);

    // ── Battery node ──
    if (hasBattery) {
      this.fill("bat-bg", tint(colors.battery));
      this.stroke("bat-ring", colors.battery);
      this.fill("bat-icon", colors.battery);
      const soc = this.el["t-bat-soc"] as SVGTextElement;
      soc.style.display = data.batterySoc != null ? "" : "none";
      if (data.batterySoc != null) soc.textContent = `${Math.round(data.batterySoc)} %`;
      this.text(
        "t-bat-watts",
        `${batteryWatts >= 0 ? "↑" : "↓"} ${formatWatts(Math.abs(batteryWatts))}`,
      );
      this.text("t-bat-lbl", labels.battery);
    }

    // ── Wallbox node (below the house) ──
    if (hasWallbox) {
      this.el["n-wallbox"].classList.toggle("dim", wallboxWatts === 0);
      this.fill("wb-bg", tint(colors.wallbox));
      this.stroke("wb-ring", colors.wallbox);
      this.fill("wb-icon", colors.wallbox);
      this.text("t-wb-val", formatWatts(wallboxWatts));
      this.text("t-wb-lbl", labels.wallbox);
    }

    // ── Wallbox 2 node (above the house) ──
    if (hasWallbox2) {
      this.el["n-wallbox2"].classList.toggle("dim", wallbox2Watts === 0);
      this.fill("wb2-bg", tint(colors.wallbox2));
      this.stroke("wb2-ring", colors.wallbox2);
      this.fill("wb2-icon", colors.wallbox2);
      this.text("t-wb2-val", formatWatts(wallbox2Watts));
      this.text("t-wb2-lbl", labels.wallbox2);
    }
  }

  /** Remove the rendered diagram from its host and stop the animation loop. */
  destroy() {
    cancelAnimationFrame(this.raf);
    this.root.innerHTML = "";
    this.el = {};
    this.dots = {};
  }

  // ── helpers ──

  // Show/hide every element belonging to an optional node (its node group and
  // its tracks share the same data-topo key).
  private setTopo(key: string, visible: boolean) {
    this.svg
      .querySelectorAll<SVGElement>(`[data-topo="${key}"]`)
      .forEach((n) => (n.style.display = visible ? "" : "none"));
  }

  private fill(id: string, color: string) {
    this.el[id]?.setAttribute("fill", color);
  }

  private stroke(id: string, color: string) {
    this.el[id]?.setAttribute("stroke", color);
  }

  private text(id: string, value: string) {
    const node = this.el[id];
    if (node) node.textContent = value;
  }

  // Show/hide a dot and set its speed. Only the speed changes on a value update
  // — the rAF loop keeps the position continuous, so dragging a slider never
  // makes the dot jump back to the start.
  private setDot(id: string, visible: boolean, watts: number) {
    const s = this.dots[id];
    s.visible = visible;
    s.circle.style.display = visible ? "" : "none";
    if (visible) {
      s.speed = this.flowSpeed(watts, s.length);
      // Place it at its current progress right away so it never flashes at the
      // SVG origin before the first animation frame positions it.
      const p = s.path.getPointAtLength(s.prog * s.length);
      s.circle.setAttribute("cx", String(p.x));
      s.circle.setAttribute("cy", String(p.y));
    }
  }

  // Dot speed in px/s, (nearly) proportional to power so the speed difference
  // matches the power difference (330 W vs 1300 W ≈ 4× slower/faster). We clamp
  // the implied traversal time to [0.4s, 14s] — derived back into a speed — so
  // very small/large flows stay readable on any path length.
  private flowSpeed(watts: number, length: number): number {
    const raw = Math.max(Math.abs(watts) * 0.1, 2); // 330 W → 33 px/s
    const seconds = Math.max(0.4, Math.min(length / raw, 14));
    return length / seconds;
  }

  // Render a share (0..1) as a dash arc on the home ring, offset by the share
  // already drawn before it.
  private arc(id: string, share: number, dash: number, offsetShare: number) {
    const node = this.el[id] as SVGCircleElement;
    if (share <= 0) {
      node.style.display = "none";
      return;
    }
    node.style.display = "";
    node.setAttribute(
      "stroke-dasharray",
      `${dash * ARC_LENGTH} ${ARC_LENGTH - dash * ARC_LENGTH}`,
    );
    node.setAttribute(
      "stroke-dashoffset",
      `${ARC_LENGTH * 0.25 - offsetShare * ARC_LENGTH}`,
    );
  }
}

/** Render the diagram into `host` (a shadow root is attached to it). */
export function createPowerFlow(
  host: HTMLElement,
  options: PowerFlowOptions,
): PowerFlow {
  return new PowerFlow(host, options);
}
