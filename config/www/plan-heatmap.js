const COLD = 16;
const HOT = 25;
const COLD_HUE = 210;

const colorFor = (temperature) => {
  const k = Math.min(Math.max((temperature - COLD) / (HOT - COLD), 0), 1);
  return `hsl(${Math.round(COLD_HUE * (1 - k))}, 60%, 68%)`;
};

class PlanHeatmap extends HTMLElement {
  setConfig(config) {
    if (!config.plan || !config.rooms) throw new Error("plan and rooms are required");
    this._config = config;
    this._shapes = {};
    this._load();
  }

  set hass(hass) {
    this._hass = hass;
    this._paint();
  }

  async _load() {
    const response = await fetch(this._config.plan);
    this.innerHTML = await response.text();
    const svg = this.querySelector("svg");
    svg.style.cssText = "display:block;width:100%;height:100%";
    for (const layer of svg.querySelectorAll("#walls, #windows, #labels")) {
      layer.setAttribute("pointer-events", "none");
    }
    for (const [room, entityId] of Object.entries(this._config.rooms)) {
      const shape = svg.querySelector(`#${CSS.escape(room)}`);
      if (!shape) continue;
      shape.dataset.idleFill = shape.getAttribute("fill");
      shape.style.cursor = "pointer";
      shape.addEventListener("click", () =>
        this.dispatchEvent(
          new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }),
        ),
      );
      this._shapes[room] = shape;
    }
    this._paint();
  }

  _paint() {
    if (!this._hass) return;
    for (const [room, shape] of Object.entries(this._shapes)) {
      const temperature = parseFloat(this._hass.states[this._config.rooms[room]]?.state);
      shape.setAttribute(
        "fill",
        Number.isNaN(temperature) ? shape.dataset.idleFill : colorFor(temperature),
      );
    }
  }
}

customElements.define("plan-heatmap", PlanHeatmap);
