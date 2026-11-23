const HOUR = 3600000;
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", dateStyle: "short" });

export function completedDays(now) {
  const days = new Map();
  const today = DAY.format(now);
  for (let hour = Math.floor(now / HOUR) * HOUR; ; hour -= HOUR) {
    const date = DAY.format(hour);
    if (date === today) continue;
    if (!days.has(date)) {
      if (days.size === 7) break;
      days.set(date, []);
    }
    days.get(date).unshift(hour);
  }
  return [...days.values()];
}

export function summarize(hours, ...series) {
  const readings = series.map(rows => new Map(rows.map(row => [row.start, row.change])));
  const values = [];
  for (const hour of hours) {
    const parts = readings.map(changes => changes.get(hour));
    if (parts.every(Number.isFinite)) values.push(parts.reduce((a, b) => a + b, 0));
  }
  return { count: values.length, energy: values.length ? values.reduce((a, b) => a + b, 0) : null };
}

export function incidents(points, start, end, current) {
  const episodes = [];
  let active;
  function finish(time, status) {
    if (active && time - active.start >= 600000) episodes.push({ ...active, end: time, status });
    active = undefined;
  }
  for (const point of points) {
    const time = Math.max(start, (point.lu ?? point.lc) * 1000);
    if (time > end) break;
    const gap = parseFloat(point.s);
    if (gap > 1) {
      active ??= { start: time, peak: gap };
      active.peak = Math.max(active.peak, gap);
    } else {
      finish(time, Number.isFinite(gap) ? "revenu sous le seuil" : "mesure interrompue");
    }
  }
  finish(end, current > 1 ? "en cours" : "fin non observée");
  return episodes.reverse();
}
