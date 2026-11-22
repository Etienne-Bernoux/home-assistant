import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";
import { parse } from "yaml";
import { render } from "../../support/home-assistant-template.mjs";

When("Home Assistant évalue la protection après la coupure numéro {int}", async function (attempt) {
  const { automation } = parse(readFileSync(new URL("../../../config/packages/annex.yaml", import.meta.url), "utf8"));
  const { actions } = automation.find(({ id }) => id === "annex_overload_cut");
  const { waits } = actions.find(({ variables }) => variables?.waits).variables;
  const { if: [{ value_template: condition }], then: automatic, else: manual } =
    actions.find((action) => action.if);
  const context = `{% set attempt = ${attempt} %}{% set waits = ${JSON.stringify(waits)} %}`;
  const shouldReconnect = await render(context + condition);
  const branch = shouldReconnect ? automatic : manual;
  assert.equal(branch.some(({ action }) => action === "switch.turn_on"), shouldReconnect);
  this.delay = shouldReconnect
    ? await render(context + branch.find(({ delay }) => delay).delay.minutes)
    : null;
});

Then("la remise sous tension est {string}", function (expected) {
  const actual = this.delay === null
    ? "manuelle"
    : `${this.delay} minute${this.delay === 1 ? "" : "s"}`;
  assert.equal(actual, expected);
});
