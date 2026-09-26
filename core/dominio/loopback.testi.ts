// I testi di `loopback.ts`: perché un indirizzo della dettatura non è di questo computer.

import { catalogo } from '../i18n/index.js'

const it = {
  vuoto: 'Ci vuole un indirizzo, per esempio http://127.0.0.1:17493.',
  nonIndirizzo: 'Non sembra un indirizzo: ci vuole qualcosa come http://127.0.0.1:17493.',
  soloHttp: 'Ci vuole un indirizzo che cominci con http://.',
  nonLocale:
    'Dev’essere un indirizzo di questo computer — 127.0.0.1, localhost o [::1] —: ' +
    'la voce di chi detta non esce di qui.',
  credenziali: 'Niente nome e password nell’indirizzo: basta l’indirizzo con la porta.',
  percorso: 'Solo l’indirizzo e la porta, senza niente dopo: per esempio http://127.0.0.1:17493.',
}

export const testi = catalogo(it, {
  de: {
    vuoto: 'Es braucht eine Adresse, zum Beispiel http://127.0.0.1:17493.',
    nonIndirizzo:
      'Das sieht nicht nach einer Adresse aus: Es braucht etwas wie http://127.0.0.1:17493.',
    soloHttp: 'Es braucht eine Adresse, die mit http:// beginnt.',
    nonLocale:
      'Es muss eine Adresse dieses Computers sein — 127.0.0.1, localhost oder [::1] —: ' +
      'Die Stimme beim Diktieren verlässt ihn nicht.',
    credenziali: 'Kein Name und kein Passwort in der Adresse: Die Adresse mit dem Port genügt.',
    percorso: 'Nur Adresse und Port, ohne etwas dahinter: zum Beispiel http://127.0.0.1:17493.',
  },
  fr: {
    vuoto: 'Il faut une adresse, par exemple http://127.0.0.1:17493.',
    nonIndirizzo:
      'Cela ne ressemble pas à une adresse : il faut quelque chose comme ' +
      'http://127.0.0.1:17493.',
    soloHttp: 'Il faut une adresse qui commence par http://.',
    nonLocale:
      'Ce doit être une adresse de cet ordinateur — 127.0.0.1, localhost ou [::1] — : ' +
      'la voix de qui dicte ne sort pas d’ici.',
    credenziali: 'Pas de nom ni de mot de passe dans l’adresse : l’adresse avec le port suffit.',
    percorso: 'Seulement l’adresse et le port, rien après : par exemple http://127.0.0.1:17493.',
  },
  en: {
    vuoto: 'An address is needed, for example http://127.0.0.1:17493.',
    nonIndirizzo:
      'That doesn’t look like an address: it needs to be something like ' +
      'http://127.0.0.1:17493.',
    soloHttp: 'The address needs to start with http://.',
    nonLocale:
      'It must be an address on this computer — 127.0.0.1, localhost or [::1] —: ' +
      'the voice of whoever is dictating doesn’t leave it.',
    credenziali: 'No name or password in the address: the address with the port is enough.',
    percorso:
      'Just the address and the port, with nothing after: for example http://127.0.0.1:17493.',
  },
})
