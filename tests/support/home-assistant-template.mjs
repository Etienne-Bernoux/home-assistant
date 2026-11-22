import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export async function render(template) {
  const { HA_URL, HA_TOKEN } = process.env;
  assert.ok(HA_URL && HA_TOKEN, "HA_URL and HA_TOKEN must be set");
  const response = await fetch(`${HA_URL}/api/template`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ template }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  if (text === "True" || text === "False") return text === "True";
  return JSON.parse(text);
}

const templateDirectory = new URL("../../config/custom_templates/", import.meta.url);
const localImport = /{%-?\s*from\s+(['"])([\w.-]+\.jinja)\1\s+import\s+[^%]+?-?%}/g;

export function renderWithLocalTemplates(template) {
  return render(template.replace(localImport, (_, quote, file) => {
    const source = file === "mylight.jinja" ? "mylight.example.jinja" : file;
    return readFileSync(new URL(source, templateDirectory), "utf8");
  }));
}
