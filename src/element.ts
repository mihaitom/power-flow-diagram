import { PowerFlow } from "./core";
import type { FlowData, FlowColors, FlowLabels } from "./core";

/**
 * `<power-flow>` custom element — a framework-agnostic energy-flow diagram.
 *
 * Set rich values as JS properties (objects), e.g. from React/Angular/Vue:
 *
 *   const el = document.querySelector("power-flow");
 *   el.data = { solar: 3200, grid: -800, load: 2400, battery: -1200 };
 *   el.colors = { solar: "#f90" };
 *   el.labels = { home: "Haus" };
 *
 * For plain HTML you can also pass JSON via attributes:
 *
 *   <power-flow data='{"solar":3200,"grid":-800,"load":2400}'></power-flow>
 */
export class PowerFlowElement extends HTMLElement {
  static get observedAttributes() {
    return ["data", "colors", "labels"];
  }

  private pf: PowerFlow | null = null;
  private _data: FlowData = { solar: 0, grid: 0, load: 0 };
  private _colors: Partial<FlowColors> | undefined;
  private _labels: Partial<FlowLabels> | undefined;

  set data(value: FlowData) {
    this._data = value;
    this.render();
  }
  get data(): FlowData {
    return this._data;
  }

  set colors(value: Partial<FlowColors> | undefined) {
    this._colors = value;
    this.render();
  }
  get colors(): Partial<FlowColors> | undefined {
    return this._colors;
  }

  set labels(value: Partial<FlowLabels> | undefined) {
    this._labels = value;
    this.render();
  }
  get labels(): Partial<FlowLabels> | undefined {
    return this._labels;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.pf?.destroy();
    this.pf = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (value == null) return;
    try {
      const parsed = JSON.parse(value);
      if (name === "data") this._data = parsed;
      else if (name === "colors") this._colors = parsed;
      else if (name === "labels") this._labels = parsed;
      this.render();
    } catch {
      // Ignore malformed JSON in attributes — property setters are the main API.
    }
  }

  private render() {
    if (!this.isConnected) return;
    const options = { data: this._data, colors: this._colors, labels: this._labels };
    if (this.pf) {
      this.pf.update(options);
    } else {
      this.pf = new PowerFlow(this, options);
    }
  }
}

/** Register `<power-flow>` (idempotent). Safe to call multiple times. */
export function definePowerFlow(tagName = "power-flow"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, PowerFlowElement);
  }
}
