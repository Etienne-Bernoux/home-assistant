const FIRST_DAY = "2025-03-01";
const STATISTIC_ID = "sensor.ensoleillement";
const DRY_RUN = process.argv.includes("--dry-run");
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

if (!HA_URL || !HA_TOKEN) {
  console.error("HA_URL and HA_TOKEN must be set");
  process.exit(1);
}

async function state(entityId) {
  const response = await fetch(`${HA_URL}/api/states/${entityId}`, { headers: { Authorization: `Bearer ${HA_TOKEN}` } });
  if (!response.ok) throw new Error(`${entityId}: HTTP ${response.status}`);
  return response.json();
}

async function fetchRadiation(through) {
  const zone = await state("zone.home");
  const params = new URLSearchParams({
    latitude: zone.attributes.latitude.toFixed(2),
    longitude: zone.attributes.longitude.toFixed(2),
    start_date: FIRST_DAY,
    end_date: through.slice(0, 10),
    hourly: "shortwave_radiation",
    timezone: "GMT",
  });
  const body = await (await fetch(`https://historical-forecast-api.open-meteo.com/v1/forecast?${params}`)).json();
  if (body.error) throw new Error(body.reason);
  return body.hourly.time.map((time, i) => ({ time, kwh: (body.hourly.shortwave_radiation[i] ?? 0) / 1000 }));
}

function toStatistics(hours, through) {
  const kept = hours.filter((hour) => hour.time <= through);
  const stats = [];
  let sum = 0;
  for (let i = kept.length - 1; i > 0; i--) {
    sum -= kept[i].kwh;
    const value = Math.round(sum * 10000) / 10000;
    stats.unshift({ start: `${kept[i - 1].time}:00Z`, state: value, sum: value });
  }
  return stats;
}

function importStatistics(stats) {
  const meta = { has_mean: false, mean_type: 0, has_sum: true, name: null, source: "recorder", statistic_id: STATISTIC_ID, unit_of_measurement: "kWh/m²", unit_class: null };
  const batches = Array.from({ length: Math.ceil(stats.length / 1000) }, (_, i) => ({
    type: "recorder/import_statistics",
    metadata: meta,
    stats: stats.slice(i * 1000, (i + 1) * 1000),
  }));
  batches.push({
    type: "recorder/adjust_sum_statistics",
    statistic_id: STATISTIC_ID,
    start_time: stats[0].start,
    adjustment: -stats[0].sum,
    adjustment_unit_of_measurement: "kWh/m²",
  });
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${HA_URL.replace(/^http/, "ws")}/api/websocket`);
    let id = 0;
    const next = () => {
      if (id === batches.length) return ws.close(), resolve(batches.length);
      ws.send(JSON.stringify({ id: id + 1, ...batches[id++] }));
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

const through = (await state(STATISTIC_ID)).attributes.through;
if (!through) throw new Error(`${STATISTIC_ID} has no through attribute yet`);
const stats = toStatistics(await fetchRadiation(through), through);
console.log(`${stats.length} hours from ${stats[0].start} to ${stats.at(-1).start}, ${(-stats[0].sum).toFixed(1)} kWh/m² before ${through}`);
if (!DRY_RUN) console.log(`${await importStatistics(stats)} calls done`);
