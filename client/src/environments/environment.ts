export const environment = {
    production: true,
    // the built app is served from the same origin as the API, so both are relative.
    // MessageService turns wsUrl into ws(s)://<current host>/api/message/ws
    baseUrl: '/',
    wsUrl: '/api/message/ws'
}
