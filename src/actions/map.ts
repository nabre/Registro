// La mappa: trovare le coordinate degli indirizzi dell'anagrafica.
// Il geocodificatore accetta una domanda al secondo e il pannello non ha rete:
// si passa dall'host e si scrive in `coordinate`, con chiave l'indirizzo. Una
// domanda per indirizzo, non per persona: stessa ditta, stesso punto.

import { geocodifica } from '../data/geocoding.js'
import { istanteAdesso } from '../domain/dates.js'
import { indirizziDaRisolvere, rubricaDi } from '../domain/map.js'
import type { Classe, Coordinata } from '../domain/models.js'
import { conMessaggio, rifiuta, rifiutaCon, type Parte } from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './map.testi.js'

/**
 * Quanti indirizzi al massimo in un giro, per non attendere minuti senza poter
 * fermare. Un secondo giro riparte da dove si era fermato.
 */
const MASSIMO_PER_GIRO = 60

export const mappa = {
  'mappa.geocodifica': async (contesto, azione) => {
    const tutte = contesto.registro.classi.filter((c) => !c.archiviata)
    const scelte: Classe[] = azione.classeIds?.length
      ? tutte.filter((c) => azione.classeIds?.includes(c.id))
      : tutte
    if (scelte.length === 0) return rifiuta(testi().nessunaClasse)

    const tutti = indirizziDaRisolvere(scelte, rubricaDi(contesto.registro), {
      rifaiTutto: azione.rifaiTutto,
    })
    // Dalla scheda di una persona si cercano solo i suoi indirizzi.
    const lavoro = azione.allievoId
      ? tutti.filter((voce) => voce.usi.some((uso) => uso.allievoId === azione.allievoId))
      : tutti
    if (lavoro.length === 0) {
      const t = testi()
      return conMessaggio(azione.allievoId ? t.personaGiaSullaMappa : t.tuttiGiaSullaMappa)
    }

    const giro = lavoro.slice(0, MASSIMO_PER_GIRO)
    let trovati = 0
    // Quanti sono caduti sul paese invece che sul portone.
    let approssimati = 0
    const persi: string[] = []
    // La causa del primo fallimento (es. servizio offline): si dice prima dei
    // nomi, che non devono uscire dal condotto al posto suo.
    let motivo: string | null = null
    // Durante il giro può aprirsi un altro anno: si smette e lo si dice.
    let cambiato = false

    for (const voce of giro) {
      if (!contesto.ancoraQui()) {
        cambiato = true
        break
      }
      const esito = await geocodifica(voce.indirizzo)
      if (!esito.trovato) {
        motivo ??= esito.motivo ?? null
        // Chi lo usa, non l'indirizzo: dice a chi chiedere la riga giusta.
        persi.push(voce.usi[0]?.chi ?? voce.indirizzo)
        continue
      }
      const nuova: Coordinata = {
        chiave: voce.chiave,
        indirizzo: voce.indirizzo,
        lat: esito.punto.lat,
        lon: esito.punto.lon,
        etichetta: esito.punto.etichetta,
        ...(esito.punto.approssimato ? { approssimato: true } : {}),
        trovatoIl: istanteAdesso(),
      }
      // Una scrittura per indirizzo, così un giro interrotto tiene quel che ha
      // trovato. Rifiutata: il documento è cambiato, il giro finisce.
      const scritto = contesto.modifica((r) => {
        const indice = r.coordinate.findIndex((c) => c.chiave === nuova.chiave)
        if (indice >= 0) r.coordinate[indice] = nuova
        else r.coordinate.push(nuova)
        r.coordinate.sort((a, b) => a.chiave.localeCompare(b.chiave, 'it'))
      }, ['coordinate'])
      if (!scritto.ok) {
        cambiato = true
        break
      }
      if (esito.punto.approssimato) approssimati += 1
      trovati += 1
    }

    const t = testi()
    const restano = lavoro.length - giro.length
    const coda = restano > 0 ? t.restano(restano) : ''
    const contati = t.trovati(trovati)

    if (cambiato) {
      // `conflitto` anche se qualcosa è stato scritto: il resto va cercato nell'anno giusto.
      return rifiutaCon(
        'conflitto',
        trovati > 0 ? t.interrotto(contati) : comuni().documentoCambiato,
      )
    }
    // Quante persone coprono gli indirizzi trovati.
    const persone = new Set(
      giro.flatMap((voce) => voce.usi.map((uso) => uso.allievoId)),
    ).size

    if (trovati === 0) {
      // Nessuno trovato: di solito una causa sola (rete, servizio), detta al posto dei nomi.
      return rifiuta(motivo ?? t.nessunoTrovato)
    }
    const quasi = approssimati > 0 ? t.approssimati(approssimati) : ''

    if (persi.length > 0) return conMessaggio(t.nonTrovati(contati, persi, quasi, coda), 'avviso')
    return conMessaggio(t.perPersone(contati, persone, quasi, coda))
  },
} satisfies Parte
