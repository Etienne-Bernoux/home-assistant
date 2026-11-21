import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { Given, Then } from "@cucumber/cucumber";
import { parse } from "yaml";

const packageDirectory = new URL("../../../config/packages/", import.meta.url);

function readPackages() {
  return Object.fromEntries(readdirSync(packageDirectory).filter((file) => file.endsWith(".yaml"))
    .map((file) => [file.slice(0, -5), parse(readFileSync(new URL(file, packageDirectory), "utf8"))]));
}

function actionNames(value) {
  if (Array.isArray(value)) return value.flatMap(actionNames);
  if (!value || typeof value !== "object") return [];
  const names = [value.action, value.service].filter((name) => typeof name === "string");
  return names.concat(Object.values(value).flatMap(actionNames));
}

function sortedNames(names) {
  return [...new Set(names)].sort().join(", ");
}

Given("les packages Home Assistant du dépôt", function () {
  this.packages = readPackages();
});

Then("chaque automatisation est rangée et déclare les déclencheurs et actions suivants", function (table) {
  const actual = Object.entries(this.packages).flatMap(([pkg, config]) =>
    (config.automation ?? []).map((automation) => ({
      package: pkg,
      id: automation.id,
      déclencheurs: sortedNames(automation.triggers.map((trigger) => trigger.trigger)),
      actions: sortedNames(actionNames(automation.actions)),
    })));
  assert.equal(new Set(actual.map(({ id }) => id)).size, actual.length, "Duplicate automation ID");
  assert.deepEqual(actual.sort(byId), table.hashes().sort(byId));
});

Then("chaque script est rangé et appelle les actions suivantes", function (table) {
  const actual = Object.entries(this.packages).flatMap(([pkg, config]) =>
    Object.entries(config.script ?? {}).map(([id, script]) => ({
      package: pkg, id, actions: sortedNames(actionNames(script.sequence)),
    })));
  assert.equal(new Set(actual.map(({ id }) => id)).size, actual.length, "Duplicate script ID");
  assert.deepEqual(actual.sort(byId), table.hashes().sort(byId));
});

Then("les actions qui appellent un script pointent vers un script déclaré", function () {
  const scriptIds = new Set(Object.values(this.packages).flatMap((pkg) => Object.keys(pkg.script ?? {})));
  for (const name of Object.values(this.packages).flatMap((pkg) => actionNames([pkg.automation, pkg.script]))) {
    if (name.startsWith("script.") && !name.startsWith("script.turn_") && name !== "script.reload") {
      assert.ok(scriptIds.has(name.slice(7)), `Unknown script action: ${name}`);
    }
  }
});

function byId(left, right) {
  return left.id.localeCompare(right.id);
}
