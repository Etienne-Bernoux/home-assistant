import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

const packagesDirectory = new URL("../config/packages/", import.meta.url);
export const catalogPath = new URL("../docs/automations.md", import.meta.url);

export function readPackages() {
  return Object.fromEntries(readdirSync(packagesDirectory)
    .filter((file) => file.endsWith(".yaml"))
    .sort()
    .map((file) => [file.slice(0, -5), parse(readFileSync(new URL(file, packagesDirectory), "utf8"))]));
}

export function packageRules(config) {
  return [
    ...(config.automation ?? []),
    ...Object.entries(config.script ?? {}).map(([id, script]) => ({ ...script, id })),
  ];
}

export function renderCatalog(packages) {
  const sections = Object.entries(packages).flatMap(([name, config]) => {
    const rules = packageRules(config);
    if (!rules.length) return [];
    const entries = rules.map(({ id, alias }) => `- ${alias} (\`${id}\`)`).join("\n");
    return [`## ${name}\n\n[Configuration ${name}.yaml](../config/packages/${name}.yaml)\n\n${entries}`];
  });

  return [
    "# Automatisations et scripts de Nyons",
    "Ce catalogue est généré à partir des packages Home Assistant. Pour le régénérer, lancer `node tests/generate-automation-catalog.mjs` depuis la racine du dépôt.",
    ...sections,
    "",
  ].join("\n\n").trimEnd() + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(catalogPath, renderCatalog(readPackages()));
}
