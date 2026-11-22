import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";
import { parse } from "yaml";
import { render } from "../../../scripts/lib/home-assistant-template.mjs";

const config = new URL("../../../config/packages/temperature.yaml", import.meta.url);

When("le bureau est évalué à {string} avec calendrier {string}, radiateur {string} et mesure {string} âgée de {int} secondes",
  async function (localTime, workday, relay, reading, readingAge) {
    const { automation } = parse(readFileSync(config, "utf8"));
    const { variables, actions: [{ choose }] } = automation.find(({ id }) => id === "office_heating_schedule");
    const inputs = { local_time: localTime, workday, relay, reading, reading_age: readingAge };
    const assignments = Object.entries(variables).map(([name, template]) => {
      const expression = Object.hasOwn(inputs, name)
        ? JSON.stringify(inputs[name])
        : template.trim().slice(2, -2).trim();
      return `{% set ${name} = ${expression} %}`;
    });
    const branches = choose.map(({ conditions, sequence: [{ action, target }] }) => {
      assert.equal(target.entity_id, "switch.prise_radiateur");
      return `[${conditions.trim().slice(2, -2).trim()}, ${JSON.stringify(action)}]`;
    });
    this.command = await render(`${assignments.join("")}{{ [${branches.join(", ")}] | selectattr('0') | map(attribute='1') | first | default('aucune') | to_json }}`);
  });

Then("la commande du radiateur est {string}", function (expected) {
  assert.equal(this.command, expected);
});

When("Workday évalue le {string}", async function (date) {
  const { HA_URL, HA_TOKEN } = process.env;
  assert.ok(HA_URL && HA_TOKEN, "HA_URL and HA_TOKEN must be set");
  const entityId = "binary_sensor.workday_sensor_fr";
  const response = await fetch(`${HA_URL}/api/services/workday/check_date?return_response`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ entity_id: entityId, check_date: date }),
  });
  assert.ok(response.ok, `Workday returned ${response.status}`);
  const result = await response.json();
  this.workday = result.service_response[entityId].workday;
});

Then("le calendrier indique {string}", function (expected) {
  assert.equal(this.workday, expected === "ouvré");
});
