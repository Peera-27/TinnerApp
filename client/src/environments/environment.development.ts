export const environment = {
    production: false,
    // ng serve runs on :4200, the Elysia server on :8000 — so dev needs absolute
    // URLs. MODE=development on the server enables TLS with the same ssl/ cert.
    baseUrl: 'https://localhost:8000/',
    wsUrl: 'wss://localhost:8000/api/message/ws'
}
