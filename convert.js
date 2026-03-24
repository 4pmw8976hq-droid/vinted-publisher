const fs = require('fs');

const cookiesData = fs.readFileSync('cookies.json', 'utf8');
const cookies = JSON.parse(cookiesData);

function mapSameSite(sameSite) {
  if (sameSite === 'no_restriction') return 'None';
  if (sameSite === 'unspecified') return 'Lax';
  // Se è già Strict, Lax o None, lo lascia invariato
  if (['Strict', 'Lax', 'None'].includes(sameSite)) return sameSite;
  return 'Lax'; // default
}

const playwrightState = {
  cookies: cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expirationDate ? cookie.expirationDate : -1,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: mapSameSite(cookie.sameSite)
  })),
  origins: []
};

fs.writeFileSync('vinted-state.json', JSON.stringify(playwrightState, null, 2));
console.log('File vinted-state.json creato con successo!');
