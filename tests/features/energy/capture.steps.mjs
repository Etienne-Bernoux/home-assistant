import assert from "node:assert/strict";
import { When, Then } from "@cucumber/cucumber";

import { completedDays, summarize, incidents } from "../../../config/www/energy-capture-data.js";

const HOUR = 3600000;

When("je consulte le bilan le {string}", function (instant) {
  this.days = completedDays(Date.parse(instant));
});

Then("le bilan présente sept jours terminés dont le dernier compte {int} heures", function (hours) {
  assert.equal(this.days.length, 7);
  assert.equal(this.days[0].length, hours);
  const ordered = this.days.toReversed().flat();
  assert.ok(ordered.slice(1).every((hour, index) => hour === ordered[index] + HOUR));
});

When("un compteur enregistre zéro puis 2,5 kWh durant une journée de quatre créneaux", function () {
  this.hours = [0, HOUR, 2 * HOUR, 3 * HOUR];
  this.rows = [{ start: 0, change: 0 }, { start: HOUR, change: 2.5 }, { start: 3 * HOUR, change: null }];
});

Then("le bilan indique 2,5 kWh et deux créneaux renseignés", function () {
  assert.deepEqual(summarize(this.hours, this.rows), { count: 2, energy: 2.5 });
  assert.deepEqual(summarize(this.hours, this.rows, [{ start: HOUR, change: 1 }]), { count: 1, energy: 3.5 });
  assert.deepEqual(summarize(this.hours, []), { count: 0, energy: null });
});

When("les index divergent puis la mesure disparaît et revient en écart", function () {
  const points = [[0, "0"], [60, "2"], [600, "5"], [720, "unavailable"], [1200, "3"]];
  this.episodes = incidents(points.map(([lu, s]) => ({ lu, s })), 0, 1800000, 3);
});

Then("le bilan sépare les durées observées et leurs écarts maximaux", function () {
  assert.deepEqual(this.episodes, [
    { start: 1200000, end: 1800000, peak: 3, status: "en cours" },
    { start: 60000, end: 720000, peak: 5, status: "mesure interrompue" },
  ]);
});
