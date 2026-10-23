import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MYLIGHT = "https://myhome.mylight-systems.com";
const FIRST_DAY = "2025-05-23";
const TIME_ZONE = "Europe/Paris";
const DRY_RUN = process.argv.includes("--dry-run");
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

if (!HA_URL || !HA_TOKEN) {
  console.error("HA_URL and HA_TOKEN must be set");
  process.exit(1);
}

const keychain = (...args) => execFileSync("security", ["find-generic-password", "-s", "mylight", ...args], { encoding: "utf8" });

async function mylight(path, params) {
  const response = await fetch(`${MYLIGHT}${path}?${new URLSearchParams(params)}`);
  const body = await response.json();
  if (body.status !== "ok") throw new Error(`${path}: ${body.error}`);
  return body;
}

function forfaitCapacities() {
  const catalogue = readFileSync(new URL("../config/custom_templates/mylight.jinja", import.meta.url), "utf8");
  const body = catalogue.match(/macro msb_forfaits\(\)[^\n]*\n([\s\S]*?)\{%-? endmacro/)[1];
  return JSON.parse(body).map((forfait) => ({ from: forfait.from, kwh: forfait.kwh }));
}

function parisToDate(local) {
  const [date, time] = local.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wall;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(utc))
        .map((p) => [p.type, p.value]),
    );
    const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    utc += wall - shown;
  }
  return new Date(utc);
}

async function fetchStock() {
  const login = await mylight("/api/auth", { email: keychain().match(/"acct"<blob>="([^"]+)"/)[1], password: keychain("-w").trim() });
  const token = login.authToken;
  const { devices } = await mylight("/api/devices", { authToken: token });
  const battery = devices.find((device) => device.type === "bat");
  const rows = [];
  const end = new Date();
  for (let day = new Date(`${FIRST_DAY}T00:00:00Z`); day < end; day = new Date(day.getTime() + 10 * 86400000)) {
    const to = new Date(Math.min(day.getTime() + 10 * 86400000, end.getTime() + 86400000));
    const { measures } = await mylight("/api/measures/grouping", {
      authToken: token,
      groupType: "hour",
      fromDate: day.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
      measureType: "battery",
      deviceId: battery.id,
    });
    for (const group of measures ?? []) {
      const soc = group.values.find((value) => value.type === "soc");
      if (soc) rows.push({ day: group.date.slice(0, 10), start: parisToDate(group.date), kwh: Math.max(0, soc.value / 3.6e6) });
    }
  }
  const lastCompleteHour = new Date(Math.floor(Date.now() / 3600000) * 3600000 - 3600000);
  return rows.filter((row) => row.start < lastCompleteHour);
}

function toStatistics(rows, capacities) {
  const stock = [];
  const soc = [];
  let previous;
  for (const row of rows) {
    const before = previous && row.start - previous.start <= 3600000 ? previous.kwh : row.kwh;
    const low = Math.min(before, row.kwh);
    const high = Math.max(before, row.kwh);
    const mean = (before + row.kwh) / 2;
    const capacity = capacities.filter((forfait) => forfait.from <= row.day).at(-1).kwh;
    const percent = (kwh) => Math.round(Math.min(100, (kwh / capacity) * 100) * 100) / 100;
    const start = row.start.toISOString();
    stock.push({ start, mean: Math.round(mean * 1000) / 1000, min: Math.round(low * 1000) / 1000, max: Math.round(high * 1000) / 1000 });
    soc.push({ start, mean: percent(mean), min: percent(low), max: percent(high) });
    previous = row;
  }
  return { stock, soc };
}

function metadata(statisticId, unit, unitClass) {
  return { has_mean: true, mean_type: 1, has_sum: false, name: null, source: "recorder", statistic_id: statisticId, unit_of_measurement: unit, unit_class: unitClass };
}

function importStatistics(imports) {
  return new Promise((resolve, reject) => {
    const batches = imports.flatMap(({ meta, stats }) =>
      Array.from({ length: Math.ceil(stats.length / 1000) }, (_, i) => ({ meta, stats: stats.slice(i * 1000, (i + 1) * 1000) })),
    );
    const ws = new WebSocket(`${HA_URL.replace(/^http/, "ws")}/api/websocket`);
    let id = 0;
    const next = () => {
      if (id === batches.length) return ws.close(), resolve(batches.length);
      const batch = batches[id++];
      ws.send(JSON.stringify({ id, type: "recorder/import_statistics", metadata: batch.meta, stats: batch.stats }));
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
      if (message.type === "auth_invalid") return reject(new Error("Home Assistant token rejected"));
      if (message.type === "auth_ok") return next();
      if (message.id === id) return message.success ? next() : reject(new Error(JSON.stringify(message.error)));
    };
    ws.onerror = () => reject(new Error("Home Assistant websocket error"));
  });
}

const rows = await fetchStock();
const { stock, soc } = toStatistics(rows, forfaitCapacities());
console.log(`${rows.length} hours from ${stock[0].start} to ${stock.at(-1).start}, last stock ${stock.at(-1).mean} kWh (${soc.at(-1).mean} %)`);
if (!DRY_RUN) {
  const batches = await importStatistics([
    { meta: metadata("sensor.mylight_systems_energie_stockee_en_batterie", "kWh", "energy"), stats: stock },
    { meta: metadata("sensor.etat_de_charge_batterie_virtuelle", "%", "unitless"), stats: soc },
  ]);
  console.log(`${batches} batches sent; Home Assistant writes them in the background`);
}
