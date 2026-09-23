// La mappa: trovare le coordinate degli indirizzi dell'anagrafica.
//
// Un gestore solo, e quasi tutto il suo lavoro è aspettare: il geocodificatore
// accetta una domanda al secondo. Passa dall'host e non dal pannello per il
// motivo di sempre — il pannello non ha rete — e scrive in `coordinate`, la
// raccolta in cui la chiave è l'indirizzo.
//
// **Una domanda per indirizzo, non per persona.** È quel che si guadagna
// tenendo i punti fuori dall'anagrafica: dieci tirocinanti nella stessa ditta
// sono una domanda sola, e la stessa risposta vale per tutti e dieci. Su una
// classe vera il giro passa da due minuti a una ventina di secondi, e — cosa
// che conta di più — non ci si ritrova dieci punti leggermente diversi per lo
// stesso portone.

import { geocodifica } from '../data/geocoding.js'
import { istanteAdesso } from '../domain/dates.js'
import { indirizziDaRisolvere, rubricaDi } from '../domain/map.js'
import type { Classe, Coordinata } from '../domain/models.js'
import { plurale } from '../domain/text.js'
import { DOCUMENTO_CAMBIATO, conMessaggio, rifiuta, rifiutaCon, type Parte } from './context.js'

/**
 * Quanti indirizzi si cercano al massimo in un giro.
 *
 * Non è una difesa dal servizio — a quella pensa la pausa fra una domanda e
 * l'altra — ma da un'attesa senza fine: sei classi mai geolocalizzate sono
 * duecento indirizzi distinti, cioè quattro minuti di filo che gira senza che
 * si possa fermare. Chi ne ha di più preme una seconda volta, e il registro
 * riparte da dove si era fermato, perché quel che ha trovato l'ha già scritto.
 */
const MASSIMO_PER_GIRO = 60

export const mappa = {
  'mappa.geocodifica': async (contesto, azione) => {
    const tutte = contesto.registro.classi.filter((c) => !c.archiviata)
    const scelte: Classe[] = azione.classeIds?.length
      ? tutte.filter((c) => azione.classeIds?.includes(c.id))
      : tutte
    if (scelte.length === 0) return rifiuta('Non c’è nessuna classe da mettere sulla mappa.')

    const tutti = indirizziDaRisolvere(scelte, rubricaDi(contesto.registro), {
      rifaiTutto: azione.rifaiTutto,
    })
    // Un indirizzo solo quando lo si chiede da una scheda: là si è appena
    // corretta una riga, e rimettere in fila la classe intera vorrebbe dire
    // aspettare un minuto per un portone.
    const lavoro = azione.allievoId
      ? tutti.filter((voce) => voce.usi.some((uso) => uso.allievoId === azione.allievoId))
      : tutti
    if (lavoro.length === 0) {
      return conMessaggio(
        azione.allievoId
          ? 'Gli indirizzi di questa persona sono già sulla mappa.'
          : 'Ogni indirizzo scritto ha già il suo punto sulla mappa.',
      )
    }

    const giro = lavoro.slice(0, MASSIMO_PER_GIRO)
    let trovati = 0
    // Quanti sono caduti sul paese invece che sul portone: si dice, perché è la
    // differenza fra un indirizzo trovato e un indirizzo quasi trovato.
    let approssimati = 0
    const persi: string[] = []
    // Il **perche'** del primo fallimento: «Il servizio non risponde», «Indirizzo
    // vuoto». Veniva scartato, e al suo posto si elencavano i nomi — cosi'
    // staccando la rete il registro rispondeva con un elenco di allievi invece
    // di dire che era offline, e quel messaggio esce anche dal condotto, cioe'
    // fuori dalla macchina. I nomi restano per chi guarda dal pannello, ma dopo
    // la causa e non al posto suo.
    let motivo: string | null = null
    // Il giro dura minuti, e in quei minuti si può aprire un altro anno: da lì
    // in poi le case di questa classe non devono finire nella raccolta
    // `coordinate` di quello. Si smette al primo segno, e lo si dice.
    let cambiato = false

    for (const voce of giro) {
      if (!contesto.ancoraQui()) {
        cambiato = true
        break
      }
      const esito = await geocodifica(voce.indirizzo)
      if (!esito.trovato) {
        motivo ??= esito.motivo ?? null
        // Chi lo usa, e non l'indirizzo nudo: un elenco di vie non dice a chi
        // si deve andare a chiedere la riga giusta.
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
      // Una scrittura per ogni indirizzo trovato, e non una sola alla fine: il
      // giro dura minuti, e un registro chiuso a metà strada non deve buttare
      // via le risposte già arrivate. Rifiutata vuol dire che il documento è
      // cambiato durante la domanda: quel punto non si scrive, e il giro finisce.
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

    const restano = lavoro.length - giro.length
    const coda = restano > 0 ? ` Ne restano ${restano}: premere di nuovo per continuare.` : ''
    const contati = plurale(trovati, 'indirizzo trovato', 'indirizzi trovati')

    if (cambiato) {
      // Un rifiuto anche se qualcosa è stato scritto prima: quel che manca va
      // cercato riaprendo l'anno giusto, e chi riceve `conflitto` lo sa.
      return rifiutaCon(
        'conflitto',
        trovati > 0
          ? `Il documento aperto è cambiato: giro interrotto dopo ${contati}.`
          : DOCUMENTO_CAMBIATO,
      )
    }
    // Quante persone ne approfittano: è il numero che dice perché la raccolta
    // sta fuori dall'anagrafica, e su una classe di tirocinanti si vede.
    const persone = new Set(
      giro.flatMap((voce) => voce.usi.map((uso) => uso.allievoId)),
    ).size

    if (trovati === 0) {
      // La causa per prima: se nessuno e' stato trovato, quasi sempre il motivo
      // e' uno solo e vale per tutti — la rete, il servizio giu' — e sapere
      // quello serve piu' che leggere i nomi di venticinque persone.
      return rifiuta(motivo ?? 'Nessun indirizzo trovato.')
    }
    const quasi =
      approssimati > 0
        ? ` ${plurale(approssimati, 'indirizzo è caduto', 'indirizzi sono caduti')} sul paese: la via non è in mappa.`
        : ''

    if (persi.length > 0) {
      return conMessaggio(
        `${contati}. Non trovati: ${persi.join(' · ')}.${quasi}${coda}`,
        'avviso',
      )
    }
    return conMessaggio(
      `${contati}, per ${plurale(persone, 'persona', 'persone')}.${quasi}${coda}`,
    )
  },
} satisfies Parte
