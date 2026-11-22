import assert from "node:assert/strict";
import { Then } from "@cucumber/cucumber";
import { cases } from "../../support/test-weather-advice.mjs";

Then("le cas météo {string} donne les consignes attendues", async function (name) {
  assert.ok(Object.hasOwn(cases, name), `Unknown weather case: ${name}`);
  await cases[name]();
});
