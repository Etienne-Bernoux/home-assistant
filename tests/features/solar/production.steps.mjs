import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";
import { parse } from "yaml";
import { renderWithLocalTemplates } from "../../support/home-assistant-template.mjs";

function reading(text) {
  const [state, unit] = text.split(" ");
  return `${JSON.stringify(state)}, ${JSON.stringify(unit)}`;
}

When("la production de l’Envoy vaut {string} et son CT {string}", async function (production, ct) {
  const { automation } = parse(readFileSync(new URL("../../../config/packages/solar.yaml", import.meta.url), "utf8"));
  const [{ above }] = automation.find(({ id }) => id === "solar_production_diverged").triggers;
  const gap = await renderWithLocalTemplates(
    `{% from 'solar.jinja' import envoy_production_gap_kwh %}` +
      `{{ envoy_production_gap_kwh(${reading(production)}, ${reading(ct)}) | to_json }}`,
  );
  this.reloaded = gap !== "" && Number(gap) > above;
});

Then("l’intégration Enphase est rechargée : {word}", function (expected) {
  assert.equal(this.reloaded ? "oui" : "non", expected);
});
