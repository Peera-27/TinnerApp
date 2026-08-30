export const environment = {
    production: false,
    // Same shape as production: the dev server proxies /api to the Elysia
    // server (see proxy.conf.json), so the browser only ever talks to its own
    // origin. That keeps dev and prod on one code path and means the
    // self-signed cert never reaches the browser — no interstitial to click
    // through, and no failed request on every page load.
    baseUrl: '/',
    wsUrl: '/api/message/ws'
}
