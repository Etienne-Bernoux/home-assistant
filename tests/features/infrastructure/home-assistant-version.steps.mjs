import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { When, Then } from "@cucumber/cucumber";

const versionFile = new URL("../../support/home-assistant-version", import.meta.url);

When("Home Assistant indique sa version de Core", async function () {
  const { HA_URL, HA_TOKEN } = process.env;
  assert.ok(HA_URL && HA_TOKEN, "HA_URL and HA_TOKEN must be set");
  const response = await fetch(new URL("/api/config", HA_URL), {
    headers: { Authorization: `Bearer ${HA_TOKEN}` },
  });
  assert.ok(response.ok, `GET /api/config returned ${response.status}`);
  const { version } = await response.json();
  assert.ok(typeof version === "string" && version.length > 0, "GET /api/config did not return a Core version");
  this.coreVersion = version;
});

Then("cette version correspond à celle du conteneur de CI", function () {
  const pinnedVersion = readFileSync(versionFile, "utf8").trim();
  assert.equal(
    pinnedVersion,
    this.coreVersion,
    `Update tests/support/home-assistant-version to ${this.coreVersion}, the version reported by the Pi.`,
  );
});
