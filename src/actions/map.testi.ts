// I testi di `map.ts`: com'è andato un giro di ricerca degli indirizzi.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  nessunaClasse: 'Non c’è nessuna classe da mettere sulla mappa.',
  personaGiaSullaMappa: 'Gli indirizzi di questa persona sono già sulla mappa.',
  tuttiGiaSullaMappa: 'Ogni indirizzo scritto ha già il suo punto sulla mappa.',
  restano: (n: number) => ` Ne restano ${n}: premere di nuovo per continuare.`,
  trovati: (n: number) => plurale(n, 'indirizzo trovato', 'indirizzi trovati'),
  interrotto: (contati: string) =>
    `Il documento aperto è cambiato: giro interrotto dopo ${contati}.`,
  nessunoTrovato: 'Nessun indirizzo trovato.',
  approssimati: (n: number) =>
    ` ${plurale(n, 'indirizzo è caduto', 'indirizzi sono caduti')} sul paese: ` +
    'la via non è in mappa.',
  nonTrovati: (contati: string, persi: readonly string[], quasi: string, coda: string) =>
    `${contati}. Non trovati: ${persi.join(' · ')}.${quasi}${coda}`,
  perPersone: (contati: string, persone: number, quasi: string, coda: string) =>
    `${contati}, per ${plurale(persone, 'persona', 'persone')}.${quasi}${coda}`,
}

export const testi = catalogo(it, {
  de: {
    nessunaClasse: 'Es gibt keine Klasse, die auf die Karte kommt.',
    personaGiaSullaMappa: 'Die Adressen dieser Person sind schon auf der Karte.',
    tuttiGiaSullaMappa: 'Jede erfasste Adresse hat schon ihren Punkt auf der Karte.',
    restano: (n) => ` Es bleiben noch ${n}: Drück nochmals, um weiterzumachen.`,
    trovati: (n) => plurale(n, 'Adresse gefunden', 'Adressen gefunden'),
    interrotto: (contati) =>
      `Inzwischen ist ein anderes Dokument geöffnet: Suche nach ${contati} abgebrochen.`,
    nessunoTrovato: 'Keine Adresse gefunden.',
    approssimati: (n) =>
      ` ${plurale(n, 'Adresse wurde', 'Adressen wurden')} nur dem Ort zugeordnet: ` +
      'Die Strasse ist nicht auf der Karte.',
    nonTrovati: (contati, persi, quasi, coda) =>
      `${contati}. Nicht gefunden: ${persi.join(' · ')}.${quasi}${coda}`,
    perPersone: (contati, persone, quasi, coda) =>
      `${contati}, für ${plurale(persone, 'Person', 'Personen')}.${quasi}${coda}`,
  },
  fr: {
    nessunaClasse: 'Il n’y a aucune classe à placer sur la carte.',
    personaGiaSullaMappa: 'Les adresses de cette personne sont déjà sur la carte.',
    tuttiGiaSullaMappa: 'Chaque adresse saisie a déjà son point sur la carte.',
    restano: (n) => ` Il en reste ${n} : appuie à nouveau pour continuer.`,
    trovati: (n) => plurale(n, 'adresse trouvée', 'adresses trouvées'),
    interrotto: (contati) =>
      `Un autre document a été ouvert entre-temps : recherche interrompue après ${contati}.`,
    nessunoTrovato: 'Aucune adresse trouvée.',
    approssimati: (n) =>
      ` ${plurale(n, 'adresse placée', 'adresses placées')} sur la seule localité : ` +
      'la rue n’est pas sur la carte.',
    nonTrovati: (contati, persi, quasi, coda) =>
      `${contati}. Introuvables : ${persi.join(' · ')}.${quasi}${coda}`,
    perPersone: (contati, persone, quasi, coda) =>
      `${contati}, pour ${plurale(persone, 'personne', 'personnes')}.${quasi}${coda}`,
  },
  en: {
    nessunaClasse: 'There’s no class to put on the map.',
    personaGiaSullaMappa: 'This person’s addresses are already on the map.',
    tuttiGiaSullaMappa: 'Every address entered already has its point on the map.',
    restano: (n) => ` ${n} left: press again to continue.`,
    trovati: (n) => plurale(n, 'address found', 'addresses found'),
    interrotto: (contati) => `A different document is now open: search stopped after ${contati}.`,
    nessunoTrovato: 'No address found.',
    approssimati: (n) =>
      ` ${plurale(n, 'address was', 'addresses were')} placed on the town only: ` +
      'the street isn’t on the map.',
    nonTrovati: (contati, persi, quasi, coda) =>
      `${contati}. Not found: ${persi.join(' · ')}.${quasi}${coda}`,
    perPersone: (contati, persone, quasi, coda) =>
      `${contati}, for ${plurale(persone, 'person', 'people')}.${quasi}${coda}`,
  },
})
