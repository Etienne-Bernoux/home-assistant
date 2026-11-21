import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";

const solar = {
  energy: "sensor.envoy_122333060519_energie_fournie_ct_de_production",
  power: "sensor.envoy_122333060519_puissance_ct_de_production",
};
const gridPower = "sensor.envoy_122333060519_consommation_nette_de_puissance_actuelle";

function query(type, args = {}) {
  const { HA_URL, HA_TOKEN } = process.env;
  assert.ok(HA_URL && HA_TOKEN, "HA_URL and HA_TOKEN are required");
  const url = new URL("/api/websocket", HA_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Home Assistant did not respond")), 4000);
    function finish(error, result) {
      clearTimeout(timeout);
      socket.close();
      if (error) reject(error);
      else resolve(result);
    }

    socket.addEventListener("error", () => finish(new Error("Home Assistant WebSocket failed")));
    socket.addEventListener("close", () => finish(new Error("Home Assistant closed the WebSocket")));
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      switch (message.type) {
        case "auth_required":
          socket.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
          break;
        case "auth_ok":
          socket.send(JSON.stringify({ id: 1, type, ...args }));
          break;
        case "auth_invalid":
          finish(new Error("Home Assistant rejected the token"));
          break;
        case "result":
          finish(message.success ? null : new Error(message.error.message), message.result);
          break;
      }
    });
  });
}

When("je consulte la production solaire du 20 novembre 2026", async function () {
  const result = await query("recorder/statistics_during_period", {
    start_time: "2026-11-20T15:00:00+01:00",
    end_time: "2026-11-20T19:00:00+01:00",
    period: "hour",
    statistic_ids: [solar.energy],
    units: { energy: "kWh" },
    types: ["change", "sum"],
  });
  this.statistics = result[solar.energy];
});

Then("la production horaire correspond aux relevés suivants en heure de Paris", function (table) {
  assert.deepEqual(this.statistics.map(({ start, change, sum }) => ({
    heure: new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
    }).format(start),
    kWh: +change.toFixed(3),
    "cumul kWh": +sum.toFixed(3),
  })), table.hashes().map((row) => ({
    heure: row.heure,
    kWh: Number(row.kWh),
    "cumul kWh": Number(row["cumul kWh"]),
  })));
});

When("je consulte les sources du tableau Énergie", async function () {
  this.sources = (await query("energy/get_prefs")).energy_sources;
});

Then("le direct utilise la pince solaire et la puissance nette de l'Envoy", function () {
  const solarSource = this.sources.find(({ type }) => type === "solar");
  const grid = this.sources.find(({ type }) => type === "grid");
  assert.equal(solarSource.stat_energy_from, solar.energy);
  assert.equal(solarSource.stat_rate, solar.power);
  assert.equal(grid.power_config?.stat_rate ?? grid.stat_rate, gridPower);
});

Then("le bilan de la batterie virtuelle utilise les compteurs MyLight", function () {
  const battery = this.sources.find(({ type }) => type === "battery");
  assert.equal(battery.stat_energy_from, "sensor.mylight_systems_decharge_batterie");
  assert.equal(battery.stat_energy_to, "sensor.mylight_systems_charge_batterie");
  assert.equal(battery.stat_soc, "sensor.etat_de_charge_batterie_virtuelle");
  assert.ok(!battery.stat_rate && !battery.power_config);
});
