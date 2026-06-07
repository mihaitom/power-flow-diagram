import './index';
import {
  mdiSolarPowerVariant,
  mdiSolarPanel,
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiTransmissionTower,
  mdiPowerPlug,
  mdiFlash,
  mdiHome,
  mdiHomeOutline,
  mdiHomeModern,
  mdiBatteryMedium,
  mdiBatteryCharging60,
  mdiHomeBattery,
  mdiEvStation,
  mdiCarElectric,
  mdiEvPlugType2,
  mdiLanguageHtml5,
  mdiReact,
  mdiAngular,
  mdiVuejs,
  mdiCodeBraces,
} from '@mdi/js';

declare const hljs: {
  highlight: (code: string, opts: { language: string }) => { value: string };
};

// ── Theme toggle ──────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle')!;
const mkIcon = (d: string) =>
  `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><path d="${d}" fill="currentColor"/></svg>`;

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  themeToggle.innerHTML =
    theme === 'dark'
      ? mkIcon(mdiWeatherSunny) + ' Light'
      : mkIcon(mdiWeatherNight) + ' Dark';
}
themeToggle.addEventListener('click', () => {
  applyTheme(
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
  );
});
applyTheme(document.documentElement.dataset.theme || 'light');

// ── Diagram element & inputs ──────────────────────────────────────────────────
const el = document.getElementById('diagram') as any;
const ids = ['solar', 'grid', 'load', 'battery', 'soc', 'wallbox', 'wallbox2'];
const inp = Object.fromEntries(
  ids.map((id) => [id, document.getElementById(id) as HTMLInputElement]),
);
const hasSolar = document.getElementById('has-solar') as HTMLInputElement;
const hasBat = document.getElementById('has-battery') as HTMLInputElement;
const hasWb = document.getElementById('has-wallbox') as HTMLInputElement;
const hasWb2 = document.getElementById('has-wallbox2') as HTMLInputElement;

const fmt = (w: number) =>
  Math.abs(w) >= 1000 ? (w / 1000).toFixed(3) + ' kW' : Math.round(w) + ' W';

function apply() {
  (document.getElementById('v-solar') as HTMLElement).textContent = fmt(
    +inp.solar.value,
  );
  (document.getElementById('v-grid') as HTMLElement).textContent = fmt(
    +inp.grid.value,
  );
  (document.getElementById('v-load') as HTMLElement).textContent = fmt(
    +inp.load.value,
  );
  (document.getElementById('v-battery') as HTMLElement).textContent = fmt(
    +inp.battery.value,
  );
  (document.getElementById('v-soc') as HTMLElement).textContent =
    inp.soc.value + ' %';
  (document.getElementById('v-wallbox') as HTMLElement).textContent = fmt(
    +inp.wallbox.value,
  );
  (document.getElementById('v-wallbox2') as HTMLElement).textContent = fmt(
    +inp.wallbox2.value,
  );
  (document.getElementById('solar-ctrls') as HTMLElement).style.opacity =
    hasSolar.checked ? '1' : '0.4';
  (document.getElementById('battery-ctrls') as HTMLElement).style.opacity =
    hasBat.checked ? '1' : '0.4';
  (document.getElementById('wallbox-ctrls') as HTMLElement).style.opacity =
    hasWb.checked ? '1' : '0.4';
  (document.getElementById('wallbox2-ctrls') as HTMLElement).style.opacity =
    hasWb2.checked ? '1' : '0.4';

  el.data = {
    solar: hasSolar.checked ? +inp.solar.value : null,
    grid: +inp.grid.value,
    load: +inp.load.value,
    battery: hasBat.checked ? +inp.battery.value : null,
    batterySoc: hasBat.checked ? +inp.soc.value : null,
    wallbox: hasWb.checked ? +inp.wallbox.value : null,
    wallbox2: hasWb2.checked ? +inp.wallbox2.value : null,
  };
}

inp.soc.addEventListener('input', apply);

// ── Ring colors ───────────────────────────────────────────────────────────────
const colorIds: Record<string, string> = {
  solar: 'c-solar',
  home: 'c-home',
  gridIn: 'c-grid-in',
  gridOut: 'c-grid-out',
  batteryIn: 'c-battery-in',
  batteryOut: 'c-battery-out',
  wallbox: 'c-wallbox',
  wallbox2: 'c-wallbox2',
};
const cinp = Object.fromEntries(
  Object.entries(colorIds).map(([k, id]) => [
    k,
    document.getElementById(id) as HTMLInputElement,
  ]),
);
const DEFAULT_COLORS = Object.fromEntries(
  Object.entries(cinp).map(([k, i]) => [k, i.defaultValue]),
);

function applyColors() {
  el.colors = Object.fromEntries(
    Object.entries(cinp).map(([k, i]) => [k, i.value]),
  );
}
Object.values(cinp).forEach((i) => i.addEventListener('input', applyColors));
applyColors();

(document.getElementById('reset-colors') as HTMLElement).addEventListener(
  'click',
  () => {
    for (const [k, i] of Object.entries(cinp)) i.value = DEFAULT_COLORS[k];
    applyColors();
  },
);

// ── Speed ─────────────────────────────────────────────────────────────────────
const speedInp = document.getElementById('speed') as HTMLInputElement;
const vSpeed = document.getElementById('v-speed') as HTMLElement;
vSpeed.textContent = `${speedInp.value}×`;
speedInp.addEventListener('input', () => {
  vSpeed.textContent = `${speedInp.value}×`;
  el.speedScale = Number(speedInp.value);
});

// ── Icon shuffle / reset ──────────────────────────────────────────────────────
const ICON_OPTIONS: Record<string, string[]> = {
  solar: [mdiSolarPowerVariant, mdiSolarPanel, mdiWeatherSunny],
  grid: [mdiTransmissionTower, mdiPowerPlug, mdiFlash],
  home: [mdiHome, mdiHomeOutline, mdiHomeModern],
  battery: [mdiBatteryMedium, mdiBatteryCharging60, mdiHomeBattery],
  wallbox: [mdiEvStation, mdiCarElectric, mdiEvPlugType2],
  wallbox2: [mdiEvStation, mdiCarElectric, mdiEvPlugType2],
};
const DEFAULT_ICONS = Object.fromEntries(
  Object.entries(ICON_OPTIONS).map(([k, opts]) => [k, opts[0]]),
);
(document.getElementById('shuffle-icons') as HTMLElement).addEventListener(
  'click',
  () => {
    el.icons = Object.fromEntries(
      Object.entries(ICON_OPTIONS).map(([k, opts]) => [
        k,
        opts[Math.floor(Math.random() * opts.length)],
      ]),
    );
  },
);
(document.getElementById('reset-icons') as HTMLElement).addEventListener(
  'click',
  () => {
    el.icons = { ...DEFAULT_ICONS };
  },
);

// ── Labels (i18n demo) ────────────────────────────────────────────────────────
let de = false;
const labelsBtn = document.getElementById('languageBtn') as HTMLElement;
labelsBtn.addEventListener('click', () => {
  de = !de;
  el.labels = de
    ? {
        solar: 'Solar',
        grid: 'Netz',
        home: 'Haus',
        battery: 'Akku',
        wallbox: 'Wallbox',
        wallbox2: 'Wallbox 2',
      }
    : null;
  labelsBtn.textContent = de ? 'Toggle labels (EN)' : 'Toggle labels (DE)';
});

// ── Simulate day ──────────────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null;
const btn = document.getElementById('simulate') as HTMLElement;
const simTimeEl = document.getElementById('sim-time') as HTMLElement;
const DAY_SECONDS = 60;
const TICK_MS = 1000;
const tInc = Math.PI / ((DAY_SECONDS * 1000) / TICK_MS);

btn.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    btn.classList.remove('on');
    btn.textContent = '▶ Simulate day';
    simTimeEl.textContent = '';
    return;
  }
  btn.classList.add('on');
  btn.textContent = '⏸ Stop';
  let t = 0;
  let soc = 20;
  timer = setInterval(() => {
    t += tInc;
    const sun = Math.max(0, Math.sin(t)) ** 1.4;
    const solar = hasSolar.checked ? Math.round(7000 * sun) : 0;
    const p = t / Math.PI;
    const wallbox = hasWb.checked && p > 0.25 && p < 0.55 ? 7400 : 0;
    const wallbox2 = hasWb2.checked && p > 0.58 && p < 0.78 ? 3600 : 0;
    const baseLoad = Math.round(700 + 500 * Math.abs(Math.sin(t)));
    const load = baseLoad + wallbox + wallbox2;
    const net = solar - load;

    let battery = 0;
    if (hasBat.checked) {
      if (net > 0 && soc < 100) battery = -Math.min(net, 4000);
      else if (net < 0 && soc > 0) battery = Math.min(-net, 4000);
      soc = Math.max(0, Math.min(100, soc + (-battery / 4000) * 2));
    }

    inp.solar.value = String(solar);
    inp.wallbox.value = String(wallbox);
    inp.wallbox2.value = String(wallbox2);
    inp.battery.value = String(battery);
    inp.soc.value = String(Math.round(soc));
    inp.load.min = String(wallbox + wallbox2);
    inp.load.max = String(Number(inp.load.min) + 4000);
    inp.load.value = String(load);
    updateGrid();

    const hour = 6 + p * 14;
    simTimeEl.textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
    if (t > Math.PI) {
      t = 0;
      soc = 20;
    }
  }, TICK_MS);
});

const stopSim = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  btn.classList.remove('on');
  simTimeEl.textContent = '';
  btn.textContent = '▶ Simulate day';
};

// ── Slider logic ──────────────────────────────────────────────────────────────
const wallboxInp = document.getElementById('wallbox') as HTMLInputElement;
const wallbox2Inp = document.getElementById('wallbox2') as HTMLInputElement;
const loadInp = document.getElementById('load') as HTMLInputElement;
const gridInp = document.getElementById('grid') as HTMLInputElement;
const batteryInp = document.getElementById('battery') as HTMLInputElement;
const solarInp = document.getElementById('solar') as HTMLInputElement;

function updateLoadMin() {
  const newMin =
    (hasWb.checked ? Number(wallboxInp.value) : 0) +
    (hasWb2.checked ? Number(wallbox2Inp.value) : 0);
  const maxLoad = newMin + 4000;
  const oldMin = Number(loadInp.min || 0);
  const shifted = Number(loadInp.value) - oldMin + newMin;
  loadInp.min = String(newMin);
  loadInp.max = String(maxLoad);
  loadInp.value = String(Math.min(maxLoad, Math.max(newMin, shifted)));
  updateGrid();
}

function updateGrid() {
  const solarVal = hasSolar.checked ? Number(solarInp.value) : 0;
  const batteryVal = hasBat.checked ? Number(batteryInp.value) : 0;
  gridInp.value = String(Number(loadInp.value) - solarVal - batteryVal);
  apply();
}

[wallboxInp, wallbox2Inp, hasWb, hasWb2].forEach((e) =>
  e.addEventListener('input', updateLoadMin),
);
[loadInp, solarInp, batteryInp, hasSolar, hasBat].forEach((e) =>
  e.addEventListener('input', updateGrid),
);

updateLoadMin();

// ── Test cases ────────────────────────────────────────────────────────────────
const testCases = [
  {
    label: 'Solar day',
    solar: 5000,
    load: 1500,
    battery: -1500,
    wallbox: null,
    wallbox2: null,
  },
  {
    label: 'Solar + EV',
    solar: 8000,
    load: 7000,
    battery: null,
    wallbox: 6400,
    wallbox2: null,
  },
  {
    label: '2 EVs',
    solar: 3000,
    load: 8000,
    battery: 1000,
    wallbox: 6400,
    wallbox2: 300,
  },
  {
    label: 'Night: bat + grid',
    solar: 0,
    load: 2000,
    battery: 800,
    wallbox: null,
    wallbox2: null,
  },
  {
    label: 'Night EV',
    solar: 0,
    load: 3000,
    battery: 500,
    wallbox: 2200,
    wallbox2: null,
  },
  {
    label: 'Grid→Battery',
    solar: 0,
    load: 1000,
    battery: -500,
    wallbox: null,
    wallbox2: null,
  },
  {
    label: 'Grid only',
    solar: null,
    load: 1500,
    battery: null,
    wallbox: null,
    wallbox2: null,
  },
];
const tcRow = document.getElementById('testcases') as HTMLElement;
for (const tc of testCases) {
  const b = document.createElement('button');
  b.textContent = tc.label;
  b.addEventListener('click', () => {
    stopSim();
    hasSolar.checked = tc.solar !== null;
    hasBat.checked = tc.battery !== null;
    hasWb.checked = tc.wallbox !== null;
    hasWb2.checked = tc.wallbox2 !== null;
    inp.solar.value = String(tc.solar ?? 0);
    inp.battery.value = String(tc.battery ?? 0);
    inp.wallbox.value = String(tc.wallbox ?? 0);
    inp.wallbox2.value = String(tc.wallbox2 ?? 0);
    updateLoadMin();
    inp.load.value = String(tc.load);
    updateGrid();
    history.replaceState(null, '', '?' + encodeState());
  });
  tcRow.appendChild(b);
}

// ── Install section ───────────────────────────────────────────────────────────
const PKG_MANAGERS = [
  { id: "npm",  cmd: "npm install powerflow" },
  { id: "pnpm", cmd: "pnpm add powerflow"    },
  { id: "bun",  cmd: "bun add powerflow"     },
  { id: "yarn", cmd: "yarn add powerflow"    },
];
let activePm = PKG_MANAGERS[0].id;
const pmTabsEl    = document.getElementById("pm-tabs")      as HTMLElement;
const installCmdEl = document.getElementById("install-cmd") as HTMLElement;

PKG_MANAGERS.forEach(({ id, cmd }, i) => {
  const b = document.createElement("button");
  b.textContent = id;
  if (i === 0) b.classList.add("on");
  b.addEventListener("click", () => {
    pmTabsEl.querySelectorAll("button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    activePm = id;
    installCmdEl.textContent = cmd;
  });
  pmTabsEl.appendChild(b);
});
installCmdEl.textContent = PKG_MANAGERS[0].cmd;

(document.getElementById("copy-install") as HTMLElement).addEventListener("click", () => {
  const copyInstallBtn = document.getElementById("copy-install") as HTMLElement;
  const pm = PKG_MANAGERS.find(p => p.id === activePm)!;
  navigator.clipboard.writeText(pm.cmd).then(() => {
    copyInstallBtn.textContent = "Copied!";
    setTimeout(() => { copyInstallBtn.textContent = "Copy"; }, 1500);
  });
});

// ── Code modal ────────────────────────────────────────────────────────────────
const codeDialog = document.getElementById('code-dialog') as HTMLDialogElement;
let activeFw = 'html';

const FW_TABS = [
  { fw: 'html', label: 'HTML', icon: mdiLanguageHtml5 },
  { fw: 'react', label: 'React', icon: mdiReact },
  { fw: 'angular', label: 'Angular', icon: mdiAngular },
  { fw: 'vue', label: 'Vue 3', icon: mdiVuejs },
  { fw: 'svelte', label: 'Svelte', icon: mdiCodeBraces },
];
const FW_LANG: Record<string, string> = {
  html: 'html',
  react: 'javascript',
  angular: 'typescript',
  vue: 'html',
  svelte: 'html',
};

const fwTabsEl = document.getElementById('fw-tabs') as HTMLElement;
FW_TABS.forEach(({ fw, label, icon }, i) => {
  const b = document.createElement('button');
  b.dataset.fw = fw;
  b.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-right:4px;"><path d="${icon}" fill="currentColor"/></svg>${label}`;
  if (i === 0) b.classList.add('on');
  b.addEventListener('click', () => {
    fwTabsEl
      .querySelectorAll('button')
      .forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    activeFw = fw;
    refreshCode();
  });
  fwTabsEl.appendChild(b);
});

function jsObj(obj: Record<string, unknown>, pad: string): string {
  const inner = Object.entries(obj)
    .map(([k, v]) => `${pad}  ${k}: ${JSON.stringify(v)}`)
    .join(',\n');
  return `{\n${inner},\n${pad}}`;
}

function buildSnippet(fw: string): string {
  const data: Record<string, unknown> = {
    grid: +inp.grid.value,
    load: +inp.load.value,
  };
  if (hasSolar.checked) data.solar = +inp.solar.value;
  if (hasBat.checked) {
    data.battery = +inp.battery.value;
    data.batterySoc = +inp.soc.value;
  }
  if (hasWb.checked) data.wallbox = +inp.wallbox.value;
  if (hasWb2.checked) data.wallbox2 = +inp.wallbox2.value;

  const changedColors = Object.fromEntries(
    Object.entries(cinp)
      .filter(
        ([k, i]) => i.value.toLowerCase() !== DEFAULT_COLORS[k].toLowerCase(),
      )
      .map(([k, i]) => [k, i.value]),
  );

  const assign = (pfVar: string, pad: string): string => {
    const r = [`${pad}${pfVar}.data = ${jsObj(data, pad)};`];
    if (Object.keys(changedColors).length)
      r.push(`${pad}${pfVar}.colors = ${jsObj(changedColors, pad)};`);
    if (de) r.push(`${pad}${pfVar}.labels = ${jsObj(el.labels, pad)};`);
    if (+speedInp.value !== 1)
      r.push(`${pad}${pfVar}.speedScale = ${+speedInp.value};`);
    return r.join('\n');
  };

  if (fw === 'html')
    return `<script type="module" src="https://unpkg.com/powerflow"><\/script>

<power-flow id="pf"><\/power-flow>

<script type="module">
  const pf = document.getElementById("pf");
${assign('pf', '  ')}
<\/script>`;

  if (fw === 'react')
    return `import "powerflow";
import { useRef, useEffect } from "react";

export function PowerFlowWidget() {
  const ref = useRef(null);
  useEffect(() => {
    const pf = ref.current;
${assign('pf', '    ')}
  }, []);
  return <power-flow ref={ref} />;
}`;

  if (fw === 'angular')
    return `import "powerflow";
import { Component, ElementRef, ViewChild, AfterViewInit } from "@angular/core";

@Component({
  selector: "app-power-flow",
  template: \`<power-flow #pf></power-flow>\`,
})
export class PowerFlowComponent implements AfterViewInit {
  @ViewChild("pf") pf!: ElementRef;

  ngAfterViewInit() {
${assign('this.pf.nativeElement', '    ')}
  }
}`;

  if (fw === 'vue')
    return `<template>
  <power-flow ref="pf" />
</template>

<script setup>
import "powerflow";
import { ref, onMounted } from "vue";

const pf = ref(null);
onMounted(() => {
${assign('pf.value', '  ')}
});
<\/script>`;

  if (fw === 'svelte')
    return `<script>
  import "powerflow";
  import { onMount } from "svelte";
  let pf;
  onMount(() => {
${assign('pf', '    ')}
  });
<\/script>

<power-flow bind:this={pf} />`;

  return '';
}

function refreshCode() {
  const code = buildSnippet(activeFw);
  const pre = document.getElementById('code-pre') as HTMLElement;
  pre.innerHTML = hljs.highlight(code, { language: FW_LANG[activeFw] }).value;
}

(document.getElementById('get-code') as HTMLElement).addEventListener(
  'click',
  () => {
    refreshCode();
    codeDialog.showModal();
  },
);
(document.getElementById('close-code') as HTMLElement).addEventListener(
  'click',
  () => codeDialog.close(),
);
codeDialog.addEventListener('click', (e) => {
  if (e.target === codeDialog) codeDialog.close();
});

(document.getElementById('copy-code') as HTMLElement).addEventListener(
  'click',
  () => {
    const copyBtn = document.getElementById('copy-code') as HTMLElement;
    navigator.clipboard
      .writeText(
        (document.getElementById('code-pre') as HTMLElement).textContent ?? '',
      )
      .then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy code';
        }, 1500);
      });
  },
);

// ── URL state ─────────────────────────────────────────────────────────────────
function encodeState(): URLSearchParams {
  const p = new URLSearchParams();
  p.set('hasSolar', hasSolar.checked ? '1' : '0');
  p.set('hasBat', hasBat.checked ? '1' : '0');
  p.set('hasWb', hasWb.checked ? '1' : '0');
  p.set('hasWb2', hasWb2.checked ? '1' : '0');
  p.set('solar', inp.solar.value);
  p.set('load', inp.load.value);
  p.set('battery', inp.battery.value);
  p.set('soc', inp.soc.value);
  p.set('wallbox', inp.wallbox.value);
  p.set('wallbox2', inp.wallbox2.value);
  p.set('speed', speedInp.value);
  for (const [k, i] of Object.entries(cinp)) {
    if (i.value.toLowerCase() !== DEFAULT_COLORS[k].toLowerCase())
      p.set('c_' + k, i.value.slice(1));
  }
  return p;
}

[
  ...Object.values(inp),
  hasSolar,
  hasBat,
  hasWb,
  hasWb2,
  speedInp,
  ...Object.values(cinp),
].forEach((i) =>
  i.addEventListener('input', () =>
    history.replaceState(null, '', '?' + encodeState()),
  ),
);

const copyLinkBtn = document.getElementById('copy-link') as HTMLElement;
copyLinkBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(location.href).then(() => {
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyLinkBtn.textContent = 'Copy link';
    }, 1500);
  });
});

(function loadFromURL() {
  if (!location.search) return;
  const p = new URLSearchParams(location.search);
  if (p.has('hasSolar')) hasSolar.checked = p.get('hasSolar') === '1';
  if (p.has('hasBat')) hasBat.checked = p.get('hasBat') === '1';
  if (p.has('hasWb')) hasWb.checked = p.get('hasWb') === '1';
  if (p.has('hasWb2')) hasWb2.checked = p.get('hasWb2') === '1';
  if (p.has('solar')) inp.solar.value = p.get('solar')!;
  if (p.has('battery')) inp.battery.value = p.get('battery')!;
  if (p.has('soc')) inp.soc.value = p.get('soc')!;
  if (p.has('wallbox')) inp.wallbox.value = p.get('wallbox')!;
  if (p.has('wallbox2')) inp.wallbox2.value = p.get('wallbox2')!;
  if (p.has('speed')) {
    speedInp.value = p.get('speed')!;
    vSpeed.textContent = `${p.get('speed')}×`;
    el.speedScale = Number(p.get('speed'));
  }
  for (const [k, i] of Object.entries(cinp)) {
    const v = p.get('c_' + k);
    if (v) i.value = '#' + v;
  }
  applyColors();
  updateLoadMin();
  if (p.has('load')) {
    inp.load.value = p.get('load')!;
    updateGrid();
  }
  history.replaceState(null, '', '?' + encodeState());
})();
