// Da un indirizzo scritto a mano a un paio di coordinate.
//
// È l'unico punto del registro in cui un dato dell'anagrafica esce dalla
// macchina, e per questo sta in un file suo, con un nome che si legge
// nell'elenco dei file. Chi lo chiama è un gesto solo — «Trova gli indirizzi»,
// nella pagina della mappa — e mai un'apertura di pagina o un salvataggio: un
// indirizzo di casa di una persona minorenne non deve partire perché qualcuno
// ha cambiato scheda.
//
// Risponde Nominatim, il geocodificatore di OpenStreetMap. È gratuito e senza
// chiave, e in cambio chiede tre cose che qui si rispettano: un `User-Agent`
// che dica chi chiama, una richiesta al secondo al massimo, e nessuno scarico
// di massa. La terza la garantisce il fatto che il registro chiede un indirizzo
// una volta sola — uno per indirizzo, non uno per persona — e la risposta se la
// tiene in `Registro.coordinate`.
//
// ------------------------------------------------------------------ la cascata
//
// Una riga sola mandata così com'è non basta, e non è un difetto del servizio:
// gli indirizzi che il docente scrive sono quelli che gli hanno dato, e sono
// fatti così — «Studio d'ingegneria, Via Campagna 2.1, CP 570, 6512 Giubiasco».
// Nominatim cerca un portone che si chiami «Studio d'ingegneria», non lo trova,
// e risponde niente. Su una classe vera era un indirizzo su cinque.
//
// Perciò si chiede in **quattro modi, dal più preciso al più grossolano**, e ci
// si ferma al primo che risponde:
//
//   1. via + civico + NAP + paese, in forma strutturata — è la domanda giusta,
//      e basta per ogni civico che in OpenStreetMap esista;
//   2. la sola via + NAP + paese — il civico in mappa non c'è, la via sì: si
//      cade sulla via, che per una visita in azienda basta;
//   3. la riga intera, libera — per gli indirizzi che non si lasciano spezzare:
//      frazioni, nuclei, indirizzi esteri scritti in un altro ordine;
//   4. NAP + paese — il punto del paese, e si dichiara: `approssimato`.
//
// Il quarto non è un ripiego per pigrizia. Una via che in OpenStreetMap non
// c'è esiste lo stesso nel mondo, e chi guarda la mappa ha comunque bisogno di
// sapere che quella persona viene da Olivone e non da Chiasso. Quel che non si
// deve fare è spacciarlo per un indirizzo preciso: il punto porta
// `approssimato`, e la mappa lo scrive accanto al segnaposto.
//
// Il pannello non può chiamare niente di tutto questo: la sua politica di
// sicurezza è `default-src 'none'`. La rete la tocca il main process, ed è la
// stessa divisione che vale per la posta e per le scansioni.

import { scomponiIndirizzo } from '../domain/map.js'

const SERVIZIO = 'https://nominatim.openstreetmap.org/search'

/**
 * Chi sta chiamando.
 *
 * Nominatim rifiuta le richieste anonime, ed è giusto: è un servizio pagato da
 * donazioni, e senza un nome non si può chiedere conto a nessuno di un
 * programma che lo martella.
 */
const CHI_CHIAMA = 'RegistroDocenti/1.0 (registro di classe CPTT; uso didattico)'

/** Una richiesta al secondo: è il limite dichiarato, e si rispetta aspettando. */
const PAUSA_MS = 1100

/** Quanto si aspetta una risposta prima di dire che non è arrivata. */
const ATTESA_MS = 10000

/**
 * I paesi in cui si cerca, quando l'indirizzo non dice di suo dove sta.
 *
 * La Svizzera più i vicini da cui si viene a scuola. Senza questo limite un
 * «Via Roma 5» risolve in Italia una volta su due.
 */
const PAESI = 'ch,it,de,fr,at'

/** Un NAP svizzero: quattro cifre, la prima diversa da zero. */
const NAP_SVIZZERO = /^[1-9]\d{3}$/

let ultimaChiamata = 0

async function rispettaIlPasso (): Promise<void> {
  const quandoSiPuo = ultimaChiamata + PAUSA_MS
  const adesso = Date.now()
  if (adesso < quandoSiPuo) {
    await new Promise((risolvi) => setTimeout(risolvi, quandoSiPuo - adesso))
  }
  ultimaChiamata = Date.now()
}

/** Un indirizzo collocato, come torna dal servizio: senza ancora una chiave. */
interface PuntoTrovato {
  lat: number
  lon: number
  /** L'indirizzo così com'è stato chiesto. */
  indirizzo: string
  /** Come l'ha capito il geocodificatore: serve a fidarsi o a non fidarsi. */
  etichetta?: string
  /**
   * Il punto è quello del paese e non del portone: la via non esiste in
   * OpenStreetMap, o l'indirizzo non si è lasciato spezzare.
   *
   * Si dichiara perché la differenza conta: a un punto approssimato non ci si
   * va in macchina, e chi lo vede sa che per quella visita in azienda il numero
   * va cercato altrove.
   */
  approssimato?: boolean
}

/** Com'è andata: il punto trovato, oppure perché non se n'è trovato nessuno. */
type EsitoGeocodifica =
  | { trovato: true; punto: PuntoTrovato }
  | { trovato: false; motivo: string }

interface RispostaNominatim {
  lat?: string
  lon?: string
  display_name?: string
}

/** Una domanda al servizio, già composta. */
type Domanda = Record<string, string>

/** Manda una domanda e torna il primo risultato, o `null` se non ce n'è. */
async function chiedi (domanda: Domanda): Promise<RispostaNominatim | null> {
  const parametri = new URLSearchParams({
    ...domanda,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  })

  await rispettaIlPasso()

  const risposta = await fetch(`${SERVIZIO}?${parametri.toString()}`, {
    headers: { 'user-agent': CHI_CHIAMA, accept: 'application/json' },
    signal: AbortSignal.timeout(ATTESA_MS),
  })
  if (!risposta.ok) throw new Error(`il servizio ha risposto ${risposta.status}`)
  const dati = (await risposta.json()) as RispostaNominatim[]
  return (Array.isArray(dati) ? dati[0] : undefined) ?? null
}

/** Le domande da fare per un indirizzo, dalla più precisa alla più grossolana. */
function domandePer (indirizzo: string): Array<{ domanda: Domanda; approssimato: boolean }> {
  const pezzi = scomponiIndirizzo(indirizzo)
  // Un NAP svizzero dice già il paese: chiudere lì dentro la ricerca è quel che
  // impedisce a «6743 Bodio» di risolvere in provincia di Varese — è successo,
  // in prova, ed è il genere di errore che nessuno va a verificare.
  const dove: Domanda = NAP_SVIZZERO.test(pezzi.nap)
    ? { countrycodes: 'ch' }
    : { countrycodes: PAESI }

  const luogo: Domanda = {
    ...(pezzi.nap ? { postalcode: pezzi.nap } : {}),
    ...(pezzi.citta ? { city: pezzi.citta } : {}),
  }
  const haLuogo = Object.keys(luogo).length > 0

  const domande: Array<{ domanda: Domanda; approssimato: boolean }> = []

  // 1. via e civico, con il luogo: la domanda giusta.
  if (pezzi.via && haLuogo) {
    domande.push({ domanda: { ...dove, ...luogo, street: pezzi.via }, approssimato: false })
  }
  // 2. la via senza il civico: il numero in mappa non c'è, la via sì.
  if (pezzi.soloVia && pezzi.soloVia !== pezzi.via && haLuogo) {
    domande.push({ domanda: { ...dove, ...luogo, street: pezzi.soloVia }, approssimato: false })
  }
  // 3. la riga intera, libera: per quel che non si lascia spezzare.
  domande.push({ domanda: { ...dove, q: indirizzo.trim() }, approssimato: false })
  // 4. il paese, e lo si dichiara.
  if (haLuogo) domande.push({ domanda: { ...dove, ...luogo }, approssimato: true })

  return domande
}

/**
 * Cerca un indirizzo e torna dove cade.
 *
 * Il primo risultato e non una scelta fra tanti: Nominatim ordina per
 * pertinenza, e un elenco da cui scegliere per novanta indirizzi sarebbe
 * novanta finestre da chiudere. Che cosa ha capito resta scritto in
 * `etichetta`, e chi guarda la mappa lo legge nel cartellino del segnaposto —
 * è lì che un indirizzo finito nel paese sbagliato si riconosce, e lo si
 * corregge in anagrafica.
 */
export async function geocodifica (indirizzo: string): Promise<EsitoGeocodifica> {
  const cercato = indirizzo.trim()
  if (!cercato) return { trovato: false, motivo: 'Indirizzo vuoto.' }

  for (const tentativo of domandePer(cercato)) {
    let risultato: RispostaNominatim | null
    try {
      risultato = await chiedi(tentativo.domanda)
    } catch (errore) {
      // Il caso normale è la rete che non c'è — la scuola dietro un proxy, il
      // portatile in treno — e va detto con parole che si capiscano: chi legge
      // «TypeError: fetch failed» pensa a un guasto del registro. Si smette
      // qui: se il servizio non risponde, non risponderà nemmeno alle domande
      // di ripiego, e insistere vorrebbe dire quattro attese per indirizzo.
      const dettaglio = errore instanceof Error ? errore.message : String(errore)
      return { trovato: false, motivo: `Il servizio non risponde (${dettaglio}).` }
    }
    if (!risultato) continue

    const lat = Number(risultato.lat)
    const lon = Number(risultato.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    return {
      trovato: true,
      punto: {
        lat,
        lon,
        indirizzo: cercato,
        etichetta: risultato.display_name,
        ...(tentativo.approssimato ? { approssimato: true } : {}),
      },
    }
  }

  return { trovato: false, motivo: 'Nessun risultato, nemmeno per il paese.' }
}
