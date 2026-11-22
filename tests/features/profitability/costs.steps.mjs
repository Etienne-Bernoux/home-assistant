import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";
import { parse } from "yaml";
import { renderWithLocalTemplates } from "../../support/home-assistant-template.mjs";

const configDirectory = new URL("../../../config/", import.meta.url);
const entities = {
  bought: "sensor.mylight_systems_consommation_reseau_sans_batterie_virtuelle",
  returned: "sensor.mylight_systems_decharge_batterie",
  green: "sensor.mylight_systems_energie_verte_solaire_direct",
  reinjected: "sensor.mylight_systems_energie_reinjectee_au_reseau",
};
const first = [1000, 500, 500, 200];
const later = [3000, 900, 2000, 700];
const reset = [1000, 400, 500, 200];
const scenarios = {
  "consommation en heures pleines": { previous: first, current: later, price: 0.2 },
  "consommation en heures creuses": { previous: first, current: later, price: 0.15, offPeak: true },
  "révision légère à la baisse": { previous: first, current: [900, 450, 450, 180], price: 0.2 },
  "remise à zéro du compteur": { previous: later, current: reset, price: 0.2 },
  "changement de jour": { previous: reset, current: reset, price: 0.2, nextDay: true },
  "index de la veille encore présent à minuit": {
    previous: reset,
    current: reset,
    price: 0.2,
    nextDay: true,
    now: "2026-11-21T00:00:00+01:00",
    publishedAt: "2026-11-20T23:56:18+01:00",
  },
  "premier index du jour après le relevé tardif": {
    previous: reset,
    current: reset,
    price: 0.2,
    previousReadingDay: "2026-11-20",
    now: "2026-11-21T00:15:00+01:00",
  },
  "compteurs indisponibles": { previous: first, current: Array(4).fill("unavailable"), price: 0.2 },
};
const costs = ["ml_energy_eur", "edf_panels_eur", "no_panels_eur"];

When("le compteur de rentabilité traite {string}", async function (situation) {
  const {
    previous, current, price, offPeak = false, nextDay = false,
    now = "2026-11-21T14:00:00+01:00", publishedAt = now, previousReadingDay,
  } = scenarios[situation];
  const config = parse(readFileSync(new URL("packages/mylight_profitability.yaml", configDirectory), "utf8"));
  const engine = config.template.flatMap((entry) => entry.sensor ?? [])
    .find(({ unique_id }) => unique_id === "mylight_profitability_engine");
  const mockStates = Object.fromEntries(Object.values(entities).map((id, index) => [id, { state: current[index], last_updated: publishedAt }]));
  mockStates["sensor.prix_electricite"] = { state: price, last_updated: now };
  const attributes = Object.fromEntries(Object.keys(entities).map((name, index) => [`last_${name}`, previous[index]]));
  Object.assign(attributes, Object.fromEntries(costs.map((name) => [name, 0])), {
    day: nextDay ? "2026-11-20" : "2026-11-21",
  });
  if (previousReadingDay) {
    for (const name of Object.keys(entities)) attributes[`last_${name}_day`] = previousReadingDay;
  }
  const context = `
{% set test_now = as_datetime('${now}') %}
{% set this = {'attributes': ${JSON.stringify(attributes)}} %}
{% set test_states = ${JSON.stringify(mockStates)} %}
{% macro mock_state(entity, returns) %}{%- do returns(test_states[entity].state) -%}{% endmacro %}
{% macro mock_expand(entity, returns) %}{%- do returns([test_states[entity]]) -%}{% endmacro %}
{% macro mock_off_peak(entity, state, returns) %}{%- do returns(${offPeak ? "true" : "false"}) -%}{% endmacro %}
{% set states = mock_state | as_function %}
{% set expand = mock_expand | as_function %}
{% set is_state = mock_off_peak | as_function %}
`;
  this.costs = await Promise.all(costs.map((name) => {
    const template = engine.attributes[name]
      .replaceAll("now()", "test_now");
    return renderWithLocalTemplates(context + template);
  }));
});

Then("les coûts MyLight, EDF avec panneaux et sans panneaux valent {float}, {float} et {float} euros",
  function (mylight, edf, withoutPanels) {
    assert.deepEqual(this.costs, [mylight, edf, withoutPanels]);
  });
