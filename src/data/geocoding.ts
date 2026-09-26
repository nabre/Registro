// Da un indirizzo scritto a mano a coordinate, con Nominatim (OpenStreetMap).
// È l'unico punto in cui un dato dell'anagrafica esce dalla macchina: si chiama
// solo dal gesto «Trova gli indirizzi», mai all'apertura di una pagina. Si
// rispettano le regole di Nominatim: `User-Agent`, una richiesta al secondo,
// ogni indirizzo chiesto una volta (la risposta resta in `Registro.coordinate`).
// Gli indirizzi reali spesso non si trovano interi: vedi la cascata in `domandePer`.

import { scomponiIndirizzo } from '../domain/map.js'
import { testi } from './geocoding.testi.js'

const SERVIZIO = 'https://nominatim.openstreetmap.org/search'

/** Chi sta chiamando: Nominatim rifiuta le richieste anonime. */
// testo-fisso: l'intestazione `user-agent` per il gestore del servizio, non la legge chi insegna
const CHI_CHIAMA = 'Regiclass/1.0 (+https://github.com/nabre/Registro)'

/** Una richiesta al secondo, il limite di Nominatim, con un po' di margine. */
const PAUSA_MS = 1100

/** Quanto si aspetta una risposta prima di dire che non è arrivata. */
const ATTESA_MS = 10000

/**
 * I paesi in cui si cerca se l'indirizzo non lo dice: la Svizzera e i vicini.
 * Senza, un «Via Roma 5» finisce spesso in Italia.
 */
const PAESI = 'ch,it,de,fr,at'

/** Un NAP svizzero: quattro cifre, la prima diversa da zero. */
const NAP_SVIZZERO = /^[1-9]\d{3}$/

/** Il primo istante libero per la prossima richiesta. */
let prossimoTurno = 0

/**
 * Aspetta il proprio turno: una richiesta ogni `PAUSA_MS`, anche con domande
 * simultanee. Il turno si prenota prima dell'attesa, senza `await` in mezzo:
 * è questo che ne fa una coda. `adesso` è per le prove; torna l'attesa.
 */
export async function rispettaIlPasso (adesso: number = Date.now()): Promise<number> {
  const mio = Math.max(adesso, prossimoTurno)
  prossimoTurno = mio + PAUSA_MS
  const attesa = mio - adesso
  if (attesa > 0) await new Promise((risolvi) => setTimeout(risolvi, attesa))
  return attesa
}

/** Un indirizzo collocato, come torna dal servizio: senza ancora una chiave. */
interface PuntoTrovato {
  lat: number
  lon: number
  /** L'indirizzo così com'è stato chiesto. */
  indirizzo: string
  /** Come l'ha capito il geocodificatore: serve a fidarsi o a non fidarsi. */
  etichetta?: string
  /** Il punto è quello del paese, non del portone: la mappa lo dichiara. */
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
  if (!risposta.ok) throw new Error(testi().haRisposto(risposta.status))
  const dati = (await risposta.json()) as RispostaNominatim[]
  return (Array.isArray(dati) ? dati[0] : undefined) ?? null
}

/**
 * Le domande per un indirizzo, dalla più precisa alla più grossolana: ci si
 * ferma alla prima che risponde. Servono perché righe come «Studio X, Via Y 2,
 * CP 570, 6512 Giubiasco» mandate intere spesso non trovano niente.
 */
function domandePer (indirizzo: string): Array<{ domanda: Domanda; approssimato: boolean }> {
  const pezzi = scomponiIndirizzo(indirizzo)
  // Un NAP svizzero dice già il paese: senza questo «6743 Bodio» può finire in Italia.
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
 * Cerca un indirizzo e torna dove cade: il primo risultato, per pertinenza.
 * Che cosa ha capito il servizio resta in `etichetta`, visibile sul segnaposto.
 */
export async function geocodifica (indirizzo: string): Promise<EsitoGeocodifica> {
  const cercato = indirizzo.trim()
  if (!cercato) return { trovato: false, motivo: testi().indirizzoVuoto }

  for (const tentativo of domandePer(cercato)) {
    let risultato: RispostaNominatim | null
    try {
      risultato = await chiedi(tentativo.domanda)
    } catch (errore) {
      // Di solito manca la rete: si dice in chiaro e ci si ferma, perché non
      // risponderebbe nemmeno alle domande di ripiego.
      const dettaglio = errore instanceof Error ? errore.message : String(errore)
      return { trovato: false, motivo: testi().nonRisponde(dettaglio) }
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

  return { trovato: false, motivo: testi().nessunRisultato }
}
