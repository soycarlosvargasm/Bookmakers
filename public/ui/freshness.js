(() => {
  const windows = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
  const timestamp = value => value ? Date.parse(value) : NaN;

  function age(value, now = Date.now()) {
    const at = timestamp(value);
    if (!Number.isFinite(at)) return '';
    const minutes = Math.max(0, Math.floor((now - at) / 60000));
    if (minutes < 1) return 'hace menos de 1 min';
    if (minutes < 60) return `hace ${minutes} min`;
    if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} h`;
    return `hace ${Math.floor(minutes / 1440)} d`;
  }

  function countryView(country, filter = '24h', now = Date.now()) {
    const cutoff = filter === 'all' ? -Infinity : now - windows[filter];
    const brands = country.brands.map(brand => {
      const lastRunAt = brand.region.latestRun?.at ?? brand.region.latest;
      const at = timestamp(lastRunAt);
      const recent = Number.isFinite(at) && at >= cutoff;
      return { ...brand, lastRunAt, recent, displayStatus: Number.isFinite(at) && !recent ? 'old' : brand.region.status };
    });
    const recent = brands.filter(brand => brand.recent);
    const withData = recent.filter(brand => brand.region.latestRun?.records > 0).length;
    const failed = recent.filter(brand => ['failed', 'challenge'].includes(brand.region.status)).length;
    const busy = recent.some(brand => brand.region.inProgress);
    const ok = recent.length > 0 && recent.every(brand => brand.region.status === 'ok' && brand.region.latestRun?.records > 0);
    const times = brands.map(brand => timestamp(brand.lastRunAt)).filter(Number.isFinite);
    const lastRunAt = times.length ? new Date(Math.max(...times)).toISOString() : null;
    const status = !recent.length ? lastRunAt && filter !== 'all' ? 'SIN DATOS RECIENTES' : 'SIN DATOS'
      : ok ? 'OK' : failed === recent.length ? 'FALLÓ' : withData || failed || busy ? 'PARCIAL' : 'SIN DATOS';
    const color = status === 'OK' ? 'ok' : status === 'FALLÓ' ? 'bad' : status === 'PARCIAL' ? 'warn' : 'muted';
    return { ...country, brands, withData, busy, status, color, lastRunAt, age: age(lastRunAt, now) };
  }

  function dataRange(filter, now = Date.now()) {
    if (filter === 'all') return { mode: 'history' };
    if (filter === 'upcoming7d' || filter === 'undated') return { mode: 'live', observedSince: new Date(now - 900000).toISOString(), until: new Date(now + windows['7d']).toISOString(), ...(filter === 'undated' ? { includeUndated: 'true' } : {}) };
    return { mode: 'live', observedSince: new Date(now - windows[filter]).toISOString() };
  }

  window.collectorFreshness = { age, countryView, dataRange };
})();
