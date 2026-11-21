import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";
import { parse } from "yaml";
import { render } from "../../../scripts/lib/home-assistant-template.mjs";

When("Home Assistant évalue les heures creuses à {string}", async function (time) {
  assert.match(time, /^\d\d:\d\d$/);
  const config = parse(readFileSync(new URL("../../../config/packages/energy_tariff.yaml", import.meta.url), "utf8"));
  const { state } = config.template.flatMap((entry) => entry.binary_sensor ?? [])
    .find(({ unique_id }) => unique_id === "electricity_off_peak");
  const context = `{% set test_now = as_datetime('2026-11-21T${time}:00+01:00') %}`;
  this.isOffPeak = await render(context + state.replaceAll("now()", "test_now"));
});

Then("le tarif est {string}", function (expected) {
  assert.equal(typeof this.isOffPeak, "boolean");
  assert.equal(this.isOffPeak ? "creux" : "plein", expected);
});
