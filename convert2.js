const fs = require('fs');

const cookiesData = fs.readFileSync('cookies.json', 'utf8');
const exported = JSON.parse(cookiesData);

// Decodifica la stringa base64 nel campo "data"
const decoded = Buffer.from(exported.data, 'base64').toString('utf8');
const cookies = JSON.parse(decoded);

const playwrightState = {
  cookies: cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expirationDate ? cookie.expirationDate : -1,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite || 'Lax'
  })),
  origins: []
};

fs.writeFileSync('vinted-state.json', JSON.stringify(playwrightState, null, 2));
console.log('File vinted-state.json creato con successo!');
