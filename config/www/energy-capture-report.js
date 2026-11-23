import { completedDays, summarize, incidents } from "./energy-capture-data.js?v=1";

const HOUR = 3600000;
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", dateStyle: "short" });
const STAMP = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const GAP = "sensor.ecart_de_production_de_l_envoy";
const GRID = "sensor.mylight_systems_consommation_reseau_sans_batterie_virtuelle";
const DISCHARGE = "sensor.mylight_systems_decharge_batterie";
const DIRECT = "sensor.mylight_systems_energie_verte_solaire_direct";
const SOURCES = [
  ["home", "Consommation totale", GRID, DISCHARGE, DIRECT],
  ["solar", "Production solaire", "sensor.envoy_122333060519_energie_fournie_ct_de_production"],
  ["grid", "Achats réseau", GRID],
  ["charge", "Charge virtuelle", "sensor.mylight_systems_charge_batterie"],
  ["discharge", "Décharge virtuelle", DISCHARGE],
  ["annex", "Annexe", "sensor.annexe_energie"],
  ["heater", "Chauffe-eau", "sensor.chauffe_eau_energie"],
];

function element(parent, tag, content) {
  const child = document.createElement(tag);
  if (content !== undefined) child.textContent = content;
  parent.append(child);
  return child;
}

class EnergyCaptureReport extends HTMLElement {
  setConfig(config) {
    this.ranges = config.reconstructed ?? [];
  }

  set hass(hass) {
    this.home = hass;
    if (this.isConnected && !this.timer) this.connectedCallback();
  }

  connectedCallback() {
    if (!this.home || this.timer) return;
    this.timer = setInterval(() => this.refresh(), 300000);
    this.refresh();
  }

  disconnectedCallback() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.request = undefined;
  }

  async refresh() {
    const request = this.request = Symbol();
    const now = Date.now();
    const days = completedDays(now);
    const start = days.at(-1)[0];
    const end = days[0].at(-1) + HOUR;
    if (!this.firstChild) element(this, "p", "Chargement des relevés…");
    const [stats, history] = await Promise.allSettled([
      this.home.callWS({
        type: "recorder/statistics_during_period", period: "hour",
        start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(),
        statistic_ids: [...new Set(SOURCES.flatMap(([, , ...ids]) => ids))], units: { energy: "kWh" }, types: ["change"],
      }),
      this.home.callWS({
        type: "history/history_during_period", entity_ids: [GAP],
        start_time: new Date(start).toISOString(), end_time: new Date(now).toISOString(),
        minimal_response: true, no_attributes: true,
      }),
    ]);
    if (this.request !== request) return;
    const openDays = new Map([...this.querySelectorAll("details")].map(day => [day.dataset.date, day.open]));
    this.replaceChildren();
    const card = element(this, "ha-card");
    card.style.cssText = "display:block;padding:16px;overflow:auto";
    element(card, "h2", "Énergie des sept derniers jours complets");
    if (stats.status === "fulfilled") {
      for (const [index, hours] of days.entries()) {
        const day = element(card, "details");
        day.dataset.date = DAY.format(hours[0]);
        day.open = openDays.get(day.dataset.date) ?? (index === 0);
        const title = element(day, "summary", new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full" }).format(hours[0]));
        title.style.cssText = "cursor:pointer;padding:10px 0;font-weight:600";
        const table = element(day, "table");
        table.style.cssText = "width:100%;text-align:left";
        const header = element(table, "tr");
        for (const label of ["Mesure", "kWh relevés", "Heures"]) element(header, "th", label);
        for (const [key, label, ...ids] of SOURCES) {
          const { count, energy } = summarize(hours, ...ids.map(id => stats.value[id] ?? []));
          const row = element(table, "tr");
          element(row, "td", label);
          element(row, "td", energy === null ? "Aucune donnée" : NUMBER.format(energy));
          element(row, "td", count + "/" + hours.length);
          for (const range of this.ranges.filter(item => item.source === key)) {
            const covered = hours.filter(h => h >= Date.parse(range.from) && h < Date.parse(range.until));
            if (!covered.length) continue;
            const note = element(element(table, "tr"), "td", range.label + " · " + STAMP.format(covered[0]) + " au " + STAMP.format(covered.at(-1) + HOUR));
            note.colSpan = 3;
          }
        }
      }
    } else element(card, "p", "Lecture des statistiques impossible.");
    element(card, "h2", "Décrochages solaires");
    element(card, "p", "Écart entre les deux index supérieur à 1 kWh pendant au moins 10 min, jusqu’à maintenant.");
    const points = history.value?.[GAP];
    if (!points?.length) {
      element(card, "p", history.status === "rejected" ? "Lecture de l’historique impossible." : "Aucun historique disponible.");
      return;
    }
    const events = incidents(points, start, now, Number(this.home.states[GAP]?.state));
    if (!events.length) element(card, "p", "Aucun décrochage dans les mesures disponibles.");
    for (const event of events) {
      const duration = Math.floor((event.end - event.start) / 60000);
      element(card, "p", STAMP.format(event.start) + " · " + duration + " min observées · écart maximal " + NUMBER.format(event.peak) + " kWh · " + event.status);
    }
  }
}

customElements.define("energy-capture-report", EnergyCaptureReport);
