import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { energyInWh, TO_WH } from "./energy-units.mjs";

const MYLIGHT = "https://myhome.mylight-systems.com";
const TIME_ZONE = "Europe/Paris";
const HOUR = 3600000;
const GAP = 20 * 60000;
const ENGINE = "sensor.rentabilite_mylight_compteurs";
const TRV = { peak: 0.2142, off_peak: 0.1589 };
const FEED_IN = 0.042;
const OFF_PEAK = [["02:00", "07:00"], ["12:30", "15:30"]];
const DRY_RUN = process.argv.includes("--dry-run");
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const SHELLY_ANNEX_URL = process.env.SHELLY_ANNEX_URL;
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const FROM = Date.parse(arg("from"));
const TO = Date.parse(arg("to"));

if (!HA_URL || !HA_TOKEN) {
  console.error("HA_URL and HA_TOKEN must be set");
  process.exit(1);
}
if (!Number.isFinite(FROM) || !Number.isFinite(TO) || FROM % HOUR || TO % HOUR || TO < FROM) {
  console.error("--from and --to must be UTC hour starts, e.g. --from=2026-11-18T07:00:00Z --to=2026-11-20T06:00:00Z");
  process.exit(1);
}
if (Date.now() < TO + 3 * HOUR) {
  console.error(`wait until ${new Date(TO + 3 * HOUR).toISOString()}: MyLight revises its latest hours, and the hour after --to must have its first 5-minute statistics`);
  process.exit(1);
}

const parts = (t) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(t))
      .map((p) => [p.type, p.value]),
  );
const localDay = (t) => { const p = parts(t); return `${p.year}-${p.month}-${p.day}`; };
const localHour = (t) => +parts(t).hour;

function parisToDate(local) {
  const [date, time] = local.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wall;
  for (let i = 0; i < 2; i++) {
    const p = parts(utc);
    utc += wall - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  }
  return utc;
}

function offPeakShare(t) {
  const start = localHour(t) * 60;
  const minutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  return OFF_PEAK.reduce((share, [a, b]) => share + Math.max(0, Math.min(start + 60, minutes(b)) - Math.max(start, minutes(a))) / 60, 0);
}

const tariffs = JSON.parse(readFileSync(new URL("../config/custom_templates/mylight.jinja", import.meta.url), "utf8").match(/macro ml_tariffs\(\)[^\n]*\n([\s\S]*?)\{%-? endmacro/)[1]);
const tariffAt = (t) => tariffs.filter((tariff) => tariff.from <= localDay(t)).at(-1);

const keychain = (...args) => execFileSync("security", ["find-generic-password", "-s", "mylight", ...args], { encoding: "utf8" });

async function mylight(path, params) {
  const body = await (await fetch(`${MYLIGHT}${path}?${new URLSearchParams(params)}`)).json();
  if (body.status !== "ok") throw new Error(`${path}: ${body.error}`);
  return body;
}

async function fetchMyLight(from, to) {
  const login = await mylight("/api/auth", { email: keychain().match(/"acct"<blob>="([^"]+)"/)[1], password: keychain("-w").trim() });
  const { devices } = await mylight("/api/devices", { authToken: login.authToken });
  const sources = {
    vrt: devices.find((device) => device.type === "vrt"),
    heater: devices.find((device) => device.type === "cmp" && !/production|consommation/i.test(device.name ?? "")),
  };
  const hours = new Map();
  for (const [name, device] of Object.entries(sources)) {
    for (let day = Date.parse(`${localDay(from - 86400000)}T00:00:00Z`); day <= to + 86400000; day += 10 * 86400000) {
      const toDate = new Date(Math.min(day + 10 * 86400000, to + 2 * 86400000)).toISOString().slice(0, 10);
      const { measures } = await mylight("/api/measures/grouping", { authToken: login.authToken, groupType: "hour", fromDate: new Date(day).toISOString().slice(0, 10), toDate, measureType: "one_phase", deviceId: device.id });
      for (const group of measures ?? []) {
        const values = Object.fromEntries(group.values.map((v) => [v.type, v.value / 3600]));
        const hour = hours.get(parisToDate(group.date)) ?? {};
        if (name === "vrt") Object.assign(hour, { billed: values.grid_sans_msb_energy, charge: values.msb_charge, discharge: values.msb_discharge, green: values.green_energy, produced: values.produced_energy });
        else hour.heater = values.energy;
        hours.set(parisToDate(group.date), hour);
      }
    }
  }
  return hours;
}

async function fetchAnnex(from, to) {
  const wh = new Map();
  let ts = from / 1000;
  while (ts && ts < (to + HOUR) / 1000) {
    const body = await (await fetch(`${SHELLY_ANNEX_URL}/rpc/EM1Data.GetData?id=0&ts=${ts}&end_ts=${(to + HOUR) / 1000 - 1}`)).json();
    for (const block of body.data ?? []) {
      block.values.forEach((values, i) => {
        const hour = Math.floor(((block.ts + i * block.period) * 1000) / HOUR) * HOUR;
        const slot = wh.get(hour) ?? { wh: 0, minutes: 0 };
        wh.set(hour, { wh: slot.wh + values[0], minutes: slot.minutes + block.period / 60 });
      });
    }
    ts = body.next_record_ts;
  }
  const short = [...wh].filter(([hour, slot]) => hour >= from && hour <= to && slot.minutes < 55);
  for (let hour = from; hour <= to; hour += HOUR) if (!wh.has(hour)) short.push([hour]);
  if (short.length) throw new Error(`Shelly annex records missing for ${short.length} hours, first ${new Date(short[0][0]).toISOString()}`);
  return new Map([...wh].map(([hour, slot]) => [hour, slot.wh]));
}

function hourlyFromStates(points, weight) {
  const hours = new Map();
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const rise = b.v - a.v;
    if (rise <= 0) continue;
    const span = [];
    for (let h = Math.floor(a.t / HOUR) * HOUR; h < b.t; h += HOUR) {
      const overlap = Math.min(h + HOUR, b.t) - Math.max(h, a.t);
      if (overlap > 0) span.push({ h, overlap, w: b.t - a.t > GAP ? weight(h) * overlap : overlap });
    }
    const total = span.reduce((s, x) => s + x.w, 0);
    for (const x of span) hours.set(x.h, (hours.get(x.h) ?? 0) + rise * (total > 0 ? x.w / total : x.overlap / (b.t - a.t)));
  }
  return hours;
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${HA_URL.replace(/^http/, "ws")}/api/websocket`);
    const pending = new Map();
    let id = 0;
    const call = (message) => new Promise((done, fail) => { pending.set(++id, { done, fail }); ws.send(JSON.stringify({ id, ...message })); });
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
      if (message.type === "auth_invalid") return reject(new Error("Home Assistant token rejected"));
      if (message.type === "auth_ok") return resolve({ call, close: () => ws.close() });
      const waiter = pending.get(message.id);
      if (waiter) message.success ? waiter.done(message.result) : waiter.fail(new Error(JSON.stringify(message.error)));
    };
    ws.onerror = () => reject(new Error("Home Assistant websocket error"));
  });
}

const flows = (hour) => ({
  bought: hour.billed ?? 0,
  returned: hour.discharge ?? 0,
  green: hour.green ?? 0,
  reinjected: Math.max(0, (hour.produced ?? 0) - (hour.green ?? 0) - (hour.charge ?? 0)),
});

function profitabilityCorrection(engineStates, myLight) {
  const total = { ml_energy_eur: 0, edf_panels_eur: 0, no_panels_eur: 0 };
  const addHour = (t, f) => {
    const share = offPeakShare(t);
    const tariff = tariffAt(t);
    const trv = share * TRV.off_peak + (1 - share) * TRV.peak;
    const price = share * tariff.off_peak + (1 - share) * tariff.peak;
    total.ml_energy_eur += (f.bought / 1000) * price - (f.reinjected / 1000) * FEED_IN;
    total.edf_panels_eur += ((f.bought + f.returned) / 1000) * trv;
    total.no_panels_eur += ((f.bought + f.returned + f.green) / 1000) * trv;
  };
  const hoursOf = (day) => [...myLight.keys()].filter((t) => localDay(t) === day).sort((a, b) => a - b);
  for (let i = 1; i < engineStates.length; i++) {
    const [before, after] = [engineStates[i - 1], engineStates[i]];
    if (after.t - before.t < 30 * 60000 || before.a.day === localDay(after.t) || after.t < FROM || before.t > TO + HOUR) continue;
    const rest = Object.fromEntries(["bought", "returned", "green", "reinjected"].map((k) => {
      const dayTotal = hoursOf(before.a.day).reduce((s, t) => s + flows(myLight.get(t))[k], 0);
      return [k, Math.max(0, dayTotal - +before.a[`last_${k}`])];
    }));
    for (const t of hoursOf(before.a.day).reverse()) {
      const f = flows(myLight.get(t));
      const take = Object.fromEntries(Object.keys(rest).map((k) => [k, Math.min(rest[k], f[k])]));
      addHour(t, take);
      for (const k in rest) rest[k] -= take[k];
    }
    for (let day = Date.parse(`${before.a.day}T12:00:00Z`) + 86400000; localDay(day) < localDay(after.t); day += 86400000) {
      for (const t of hoursOf(localDay(day))) addHour(t, flows(myLight.get(t)));
    }
    console.log(`profitability engine stopped ${new Date(before.t).toISOString()} on ${before.a.day}, restarted ${new Date(after.t).toISOString()}: rest of that day and the days in between were never counted`);
  }
  return total;
}

const myLight = await fetchMyLight(FROM, TO);
const annex = SHELLY_ANNEX_URL ? await fetchAnnex(FROM, TO) : null;
const fromMyLight = (key) => (t) => {
  const hour = myLight.get(t);
  if (!hour) throw new Error(`no MyLight data at ${new Date(t).toISOString()}`);
  return hour[key] ?? 0;
};
const targets = [
  { id: "sensor.mylight_systems_consommation_reseau_sans_batterie_virtuelle", wh: fromMyLight("billed") },
  { id: "sensor.mylight_systems_energie_reinjectee_au_reseau", wh: (t) => flows(myLight.get(t) ?? {}).reinjected },
  { id: "sensor.mylight_systems_charge_batterie", wh: fromMyLight("charge") },
  { id: "sensor.mylight_systems_decharge_batterie", wh: fromMyLight("discharge") },
  { id: "sensor.mylight_systems_energie_verte_solaire_direct", wh: fromMyLight("green") },
  { id: "sensor.chauffe_eau_energie", wh: fromMyLight("heater") },
  ...(annex
    ? [
        { id: "sensor.annexe_energie", wh: (t) => annex.get(t) },
        { id: "sensor.cout_annexe", eur: (t) => (annex.get(t) / 1000) * tariffAt(t).peak },
      ]
    : []),
  { id: "sensor.envoy_122333060519_energie_fournie_ct_de_production", weight: (t) => Math.max(0, (myLight.get(t)?.produced ?? 0) - 16) },
  { id: "sensor.prise_bureau_energie", weight: () => 1 },
  { id: "sensor.prise_cellier_energie", weight: () => 1 },
];
if (!annex) console.log("SHELLY_ANNEX_URL not set: annex energy and cost left as recorded");

const ha = await connect();
const metadata = await ha.call({ type: "recorder/get_statistics_metadata", statistic_ids: targets.map((target) => target.id) });
for (const target of targets) {
  const unit = metadata.find((m) => m.statistic_id === target.id)?.statistics_unit_of_measurement;
  if (!unit) continue;
  const read = async () => (await ha.call({ type: "recorder/statistics_during_period", start_time: new Date(FROM - HOUR).toISOString(), end_time: new Date(TO + HOUR).toISOString(), period: "hour", types: ["sum", "state"], statistic_ids: [target.id], units: TO_WH[unit] ? { energy: unit } : {} }))[target.id] ?? [];
  const rows = await read();
  const base = rows.find((row) => row.start === FROM - HOUR);
  const end = rows.find((row) => row.start === TO);
  if (!base || !end) {
    console.log(`${target.id}: no statistics row at ${new Date(base ? TO : FROM - HOUR).toISOString()}, skipped`);
    continue;
  }
  let perHour;
  if (target.weight) {
    const history = await ha.call({ type: "history/history_during_period", start_time: new Date(FROM - 6 * HOUR).toISOString(), end_time: new Date(TO + 3 * HOUR).toISOString(), entity_ids: [target.id], minimal_response: false, no_attributes: false });
    const points = [];
    let stateUnit;
    for (const point of history[target.id] ?? []) {
      stateUnit = point.a?.unit_of_measurement ?? stateUnit;
      const value = parseFloat(point.s);
      if (!Number.isFinite(value)) continue;
      if (!TO_WH[stateUnit]) throw new Error(`${target.id}: unsupported history unit ${stateUnit}`);
      points.push({ t: (point.lu ?? point.lc) * 1000, v: energyInWh(value, stateUnit) });
    }
    const wh = hourlyFromStates(points, target.weight);
    perHour = (t) => (wh.get(t) ?? 0) / TO_WH[unit];
  } else if (target.eur) perHour = target.eur;
  else perHour = (t) => target.wh(t) / TO_WH[unit];
  let sum = base.sum;
  const stats = [];
  for (let t = FROM; t <= TO; t += HOUR) {
    sum += perHour(t);
    const old = rows.find((row) => row.start === t);
    stats.push({ start: new Date(t).toISOString(), sum: Math.round(sum * 1e6) / 1e6, ...(old?.state != null ? { state: old.state } : {}) });
  }
  const adjustment = Math.round((sum - end.sum) * 1e6) / 1e6;
  console.log(`${target.id}: ${(sum - base.sum).toFixed(3)} ${unit} over the window (recorded ${(end.sum - base.sum).toFixed(3)}), ${adjustment} ${unit} carried to the following hours`);
  if (DRY_RUN) continue;
  await ha.call({ type: "recorder/import_statistics", metadata: { has_mean: false, mean_type: 0, has_sum: true, name: null, source: "recorder", statistic_id: target.id, unit_of_measurement: unit, unit_class: TO_WH[unit] ? "energy" : null }, stats });
  if (adjustment) await ha.call({ type: "recorder/adjust_sum_statistics", statistic_id: target.id, start_time: new Date(TO + HOUR).toISOString(), adjustment, adjustment_unit_of_measurement: unit });
}

const engine = await ha.call({ type: "history/history_during_period", start_time: new Date(FROM - 2 * 86400000).toISOString(), end_time: new Date(TO + 2 * HOUR).toISOString(), entity_ids: [ENGINE], minimal_response: false, no_attributes: false });
let attributes = {};
const engineStates = (engine[ENGINE] ?? []).map((p) => ({ t: (p.lu ?? p.lc) * 1000, a: (attributes = { ...attributes, ...(p.a ?? {}) }) }));
const correction = profitabilityCorrection(engineStates, myLight);
if (Object.values(correction).some((v) => Math.abs(v) > 0.00005)) {
  console.log(`profitability: add once to ${ENGINE} attributes ${Object.entries(correction).map(([k, v]) => `${k} +${v.toFixed(4)}`).join(", ")} (gain +${(correction.edf_panels_eur - correction.ml_energy_eur).toFixed(2)} EUR, savings +${(correction.no_panels_eur - correction.ml_energy_eur).toFixed(2)} EUR)`);
} else console.log("profitability: nothing missed");
ha.close();
