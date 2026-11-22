import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Given, Then } from "@cucumber/cucumber";
import { catalogPath, packageRules, readPackages, renderCatalog } from "../../generate-automation-catalog.mjs";

const builtinScriptActions = new Set(["script.reload", "script.turn_on", "script.turn_off", "script.toggle"]);
const interfaceNotifyActions = new Set(["notify.mobile_app_pixel_6"]);
const builtinNotifyActions = new Set(["notify.send_message"]);

function actionNames(value) {
  if (Array.isArray(value)) return value.flatMap(actionNames);
  if (!value || typeof value !== "object") return [];
  const names = [value.action, value.service].filter((name) => typeof name === "string");
  return names.concat(Object.values(value).flatMap(actionNames));
}

Given("les packages Home Assistant du dépôt", function () {
  this.packages = readPackages();
  this.rules = Object.values(this.packages).flatMap(packageRules);
  this.actions = this.rules.flatMap(({ actions, action, sequence }) => actionNames([actions, action, sequence]));
});

Then("chaque automatisation et chaque script a un identifiant unique", function () {
  const ids = new Set();
  for (const { id } of this.rules) {
    assert.ok(typeof id === "string" && id.trim(), "Missing rule ID");
    assert.ok(!ids.has(id), `Duplicate rule ID: ${id}`);
    ids.add(id);
  }
});

Then("chaque automatisation et chaque script a un alias", function () {
  for (const { id, alias } of this.rules) {
    assert.ok(typeof alias === "string" && alias.trim(), `Missing alias: ${id}`);
  }
});

Then("les actions qui appellent un script pointent vers un script déclaré", function () {
  const scriptActions = new Set(Object.values(this.packages)
    .flatMap(({ script }) => Object.keys(script ?? {}))
    .map((id) => `script.${id}`));

  for (const name of this.actions.filter((action) => action.startsWith("script."))) {
    assert.ok(builtinScriptActions.has(name) || scriptActions.has(name), `Unknown script action: ${name}`);
  }
});

Then("les actions de notification pointent vers un service connu", function () {
  const declaredActions = new Set(Object.values(this.packages)
    .flatMap(({ notify }) => notify ?? [])
    .map(({ name }) => `notify.${name}`));

  for (const name of this.actions.filter((action) => action.startsWith("notify."))) {
    assert.ok(
      builtinNotifyActions.has(name) || interfaceNotifyActions.has(name) || declaredActions.has(name),
      `Unknown notify action: ${name}`,
    );
  }
});

Then("la documentation du catalogue est à jour", function () {
  assert.equal(
    readFileSync(catalogPath, "utf8"),
    renderCatalog(this.packages),
    "Automation catalog is out of date. Run node tests/generate-automation-catalog.mjs",
  );
});
