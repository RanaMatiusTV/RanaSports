(() => {
  if (window.__ranaSportScorePagedFetch) return;
  window.__ranaSportScorePagedFetch = true;

  const nativeFetch = window.fetch.bind(window);
  const DEEP_TTL = 5 * 60 * 1000;
  let deepCache = { at: 0, matches: [] };

  const matchKey = m => String(
    m?.id || m?.url || [m?.home, m?.away, m?.time].join('|')
  );

  async function fetchJson(url, init) {
    const response = await nativeFetch(url, init);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return { response, data: await response.json() };
  }

  async function deepMatches(base, init) {
    const now = Date.now();
    if (now - deepCache.at < DEEP_TTL) return deepCache.matches;

    const calls = [2, 3].map(async page => {
      const url = new URL(base.href);
      url.searchParams.set('page', String(page));
      url.searchParams.set('__rs_multi', '1');
      try {
        const { data } = await fetchJson(url.href, init);
        return Array.isArray(data?.matches) ? data.matches : [];
      } catch {
        return [];
      }
    });

    const pages = await Promise.all(calls);
    const merged = pages.flat();
    deepCache = { at: now, matches: merged };
    return merged;
  }

  window.fetch = async function ranaPagedFetch(input, init) {
    const raw = typeof input === 'string' ? input : input?.url;

    try {
      const url = new URL(raw, location.href);
      const isTarget = url.hostname === 'sportscore.com' &&
        url.pathname === '/api/widget/matches/' &&
        url.searchParams.get('sport') === 'football' &&
        !url.searchParams.has('__rs_multi');

      if (!isTarget) return nativeFetch(input, init);

      const page1 = new URL(url.href);
      page1.searchParams.set('page', '1');
      page1.searchParams.set('__rs_multi', '1');

      const [{ response, data }, deeper] = await Promise.all([
        fetchJson(page1.href, init),
        deepMatches(url, init)
      ]);

      const first = Array.isArray(data?.matches) ? data.matches : [];
      const seen = new Set();
      const matches = [];

      for (const match of [...first, ...deeper]) {
        const key = matchKey(match);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        matches.push(match);
      }

      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.delete('content-length');
      headers.delete('content-encoding');

      return new Response(JSON.stringify({ ...data, count: matches.length, matches }), {
        status: 200,
        statusText: 'OK',
        headers
      });
    } catch {
      return nativeFetch(input, init);
    }
  };
})();