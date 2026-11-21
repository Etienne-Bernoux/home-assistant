import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";
import { energyInWh } from "../../../scripts/energy-units.mjs";

When("le rattrapage convertit {float} {string}", function (value, unit) {
  this.convert = () => energyInWh(value, unit);
});

Then("il obtient {int} Wh", function (expected) {
  assert.ok(Math.abs(this.convert() - expected) < 0.000001);
});

Then("l’unité est refusée", function () {
  assert.throws(this.convert, /Unsupported energy unit/);
});
