import assert from "node:assert/strict";

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

if (!HA_URL || !HA_TOKEN) {
  console.error("HA_URL and HA_TOKEN must be set");
  process.exit(1);
}

const DAY = "2026-11-10";
const NEXT = "2026-11-11";

function local(day, hour) {
  return new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+01:00`);
}

function forecast(from, hours, overrides = {}) {
  return Array.from({ length: hours }, (_, i) => {
    const at = new Date(from.getTime() + i * 3600_000);
    const key = at.toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 13);
    return {
      datetime: at.toISOString().replace(".000Z", "+00:00"),
      temperature: 15,
      precipitation: 0,
      ...overrides[key],
    };
  });
}

async function render(template) {
  const response = await fetch(`${HA_URL}/api/template`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ template }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return JSON.parse(text);
}

function evening(overrides) {
  const data = JSON.stringify(forecast(local(DAY, 19), 48, overrides));
  return render(
    `{% from 'weather_advice.jinja' import evening_advice %}` +
      `{{ evening_advice('${data}' | from_json, '${DAY}T19:58:00+01:00', 28, 1, 0.5) }}`,
  );
}

function rain(hour, overrides, lastRain = "", day = DAY) {
  const data = JSON.stringify(forecast(local(day, hour), 48, overrides));
  const now = new Date(local(day, hour).getTime() - 2 * 60_000)
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace(" ", "T");
  return render(
    `{% from 'weather_advice.jinja' import rain_reminder %}` +
      `{{ rain_reminder('${data}' | from_json, '${now}+01:00', 0.5, '${lastRain}') }}`,
  );
}

const wet = (...keys) => Object.fromEntries(keys.map((key) => [key, { precipitation: 2 }]));
const at = (day, hour) => `${day} ${String(hour).padStart(2, "0")}`;
const memory = (hour) => `${DAY} ${String(hour).padStart(2, "0")}:00:00`;

const cases = {
  "AE1 hot tomorrow, mild night: shutters only": async () => {
    const result = await evening({ [at(NEXT, 15)]: { temperature: 29 }, [at(NEXT, 4)]: { temperature: 12 } });
    assert.deepEqual(result, { consignes: ["volets"], max: 29 });
  },
  "AE2 mild tomorrow, dry night: nothing": async () => {
    const result = await evening({ [at(NEXT, 15)]: { temperature: 22 }, [at(NEXT, 4)]: { temperature: 8 } });
    assert.deepEqual(result.consignes, []);
  },
  "AE3 rain at 3 h and 0 °C at 6 h: laundry then tap": async () => {
    const result = await evening({ [at(NEXT, 3)]: { precipitation: 2 }, [at(NEXT, 6)]: { temperature: 0 } });
    assert.deepEqual(result.consignes, ["linge", "gel"]);
  },
  "thresholds are inclusive": async () => {
    const result = await evening({
      [at(NEXT, 14)]: { temperature: 28 },
      [at(NEXT, 5)]: { temperature: 1, precipitation: 0.5 },
    });
    assert.deepEqual(result, { consignes: ["volets", "linge", "gel"], max: 28 });
  },
  "rain at 19 h or 8 h is outside the night": async () => {
    const result = await evening(wet(at(DAY, 19), at(NEXT, 8)));
    assert.deepEqual(result.consignes, []);
  },
  "rain at 20 h is inside the night": async () => {
    assert.deepEqual((await evening(wet(at(DAY, 20)))).consignes, ["linge"]);
  },
  "rain at 7 h is inside the night": async () => {
    assert.deepEqual((await evening(wet(at(NEXT, 7)))).consignes, ["linge"]);
  },
  "frost at 8 h counts, at 9 h does not": async () => {
    assert.deepEqual((await evening({ [at(NEXT, 8)]: { temperature: 0 } })).consignes, ["gel"]);
    assert.deepEqual((await evening({ [at(NEXT, 9)]: { temperature: 0 } })).consignes, []);
  },
  "AE4 one reminder for a 15 h to 18 h episode": async () => {
    const rainy = wet(at(DAY, 15), at(DAY, 16), at(DAY, 17), at(DAY, 18));
    assert.equal((await rain(13, rainy)).start_hour, 15);
    assert.equal((await rain(14, rainy)).start_hour, null);
    const fifteen = await rain(15, rainy);
    assert.equal(fifteen.start_hour, null);
    assert.equal(fifteen.last_rain, memory(15));
    assert.equal((await rain(16, rainy, memory(15))).start_hour, null);
  },
  "AE5 two episodes split by four dry hours": async () => {
    const rainy = wet(at(DAY, 11), at(DAY, 16));
    assert.equal((await rain(9, rainy)).start_hour, 11);
    assert.equal((await rain(14, rainy, memory(11))).start_hour, 16);
  },
  "AE6 rain at 9 h is announced at 8 h": async () => {
    assert.equal((await rain(8, wet(at(DAY, 9)))).start_hour, 9);
  },
  "AE7 rain at 21 h gives no daytime reminder": async () => {
    for (let hour = 8; hour <= 19; hour += 1) {
      assert.equal((await rain(hour, wet(at(DAY, 21)))).start_hour, null, `hour ${hour}`);
    }
  },
  "rain at 19 h is announced at 17 h, not at 16 h or 18 h": async () => {
    const rainy = wet(at(DAY, 19));
    assert.equal((await rain(16, rainy)).start_hour, null);
    assert.equal((await rain(17, rainy)).start_hour, 19);
    assert.equal((await rain(18, rainy)).start_hour, null);
  },
  "rain already falling before the candidate hour suppresses the reminder": async () => {
    assert.equal((await rain(12, wet(at(DAY, 13), at(DAY, 14)))).start_hour, null);
  },
  "rain until 6 h then at 9 h is the same episode": async () => {
    assert.equal((await rain(8, wet(at(DAY, 9)), memory(6))).start_hour, null);
  },
  "memory never moves ahead of the starting hour": async () => {
    const seven = await rain(7, wet(at(DAY, 8)));
    assert.equal(seven.start_hour, null);
    assert.equal(seven.last_rain, "");
    const eight = await rain(8, wet(at(DAY, 8)));
    assert.equal(eight.start_hour, 8);
    assert.equal(eight.last_rain, memory(8));
  },
  "memory records a rainy starting hour at night": async () => {
    assert.equal((await rain(3, wet(at(DAY, 3)))).last_rain, memory(3));
  },
  "drizzle below the threshold is dry": async () => {
    assert.equal((await rain(13, { [at(DAY, 15)]: { precipitation: 0.3 } })).start_hour, null);
  },
};

let failed = 0;
for (const [name, run] of Object.entries(cases)) {
  try {
    await run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${error.message.split("\n").join("\n     ")}`);
  }
}
console.log(`${Object.keys(cases).length - failed}/${Object.keys(cases).length} passed`);
process.exit(failed ? 1 : 0);
