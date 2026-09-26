// Il calendario ICS del documento, messo a fronte delle lezioni. Una lettura
// sulla copia nel documento; solo un calendario senza copia va in rete, e il
// testo scaricato si ricorda per un minuto (`data/calendar.ts`). Le regole si
// possono passare nell'ingresso: così la finestra di revisione mostra
// l'effetto di una scelta prima di salvarla.

import { confrontaCalendario } from '../../../domain/calendar.js'
import { leggiCalendario } from '../../../domain/calendarIcs.js'
import { testoDelCalendario } from '../../../data/calendar.js'
import { definisci, errore } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  ora,
  testo,
} from '../../schemas.js'
import { CALENDARIO_ID, calendarioDaLeggere, FASCIA, REGOLA } from './common.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './calendario.testi.js'

const t = () => testi().confronta
const c = () => testi().comune
const p = () => t().presentazione

const ESITI = ['combacia', 'allineare', 'annullare', 'nuova'] as const
const VIE = ['regola', 'nome', 'orario', 'sovrapposizione'] as const
const STATI = ['pianificata', 'svolta', 'annullata'] as const

export const procedura = definisci({
  nome: 'calendario.confronta',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Un calendario senza copia si legge dalla sua origine, un indirizzo di rete:
  // non si mette in mano al modello.
  perAssistente: false,
  ingresso: oggetto({
    calendarioId: opzionale(CALENDARIO_ID),
    regole: opzionale(elenco(REGOLA, { aiuto: () => t().regole })),
    dal: opzionale(iso({ aiuto: () => t().dal })),
    al: opzionale(iso({ aiuto: () => t().al })),
  }),
  uscita: oggetto({
    voci: elenco(oggetto({
      id: testo({ aiuto: () => t().id }),
      esito: testo({ aiuto: () => c().unoFra(ESITI.join(', ')) }),
      corsoId: identificatore(),
      via: testo({ aiuto: () => t().via(VIE.join(', ')) }),
      data: iso(),
      inizio: ora(),
      fine: ora(),
      fasce: elenco(FASCIA),
      aula: testo(),
      titoli: elenco(testo(), { aiuto: () => t().titoli }),
      lezioneId: nullabile(identificatore()),
      statoLezione: nullabile(testo({ aiuto: () => c().unoFra(STATI.join(', ')) })),
      differenze: elenco(testo(), { aiuto: () => t().differenze }),
      cambiaOrario: booleano(),
    })),
    senzaCorso: elenco(oggetto({
      titolo: testo(),
      luogo: testo(),
      quanti: numero({ intero: true }),
      primo: iso(),
      ultimo: iso(),
    }), { aiuto: () => t().senzaCorso }),
    assenti: elenco(oggetto({
      lezioneId: identificatore(),
      corsoId: identificatore(),
      data: iso(),
      inizio: testo(),
      fine: testo(),
      stato: testo(),
    }), { aiuto: () => t().assenti }),
    ignorati: numero({ intero: true }),
    scartati: numero({ intero: true, aiuto: () => c().scartati }),
    eventi: numero({ intero: true }),
    copre: nullabile(oggetto({ dal: iso(), al: iso() })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'eventi', etichetta: () => p().eventiLetti, formato: 'numero' },
          { campo: 'ignorati', etichetta: () => p().ignorati, formato: 'numero' },
          { campo: 'scartati', etichetta: () => c().diUnGiornoIntero, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'voci',
        colonne: [
          { campo: 'esito', testo: () => p().esito },
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', testo: () => c().dalle, formato: 'ora' },
          { campo: 'fine', testo: () => c().alle, formato: 'ora' },
          { campo: 'aula', testo: () => parole().aula },
          { campo: 'differenze', testo: () => p().cheCosaCambia, formato: 'elenco' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'assenti',
        colonne: [
          { campo: 'data', testo: () => p().soloNelRegistro, formato: 'data' },
          { campo: 'inizio', testo: () => c().dalle },
          { campo: 'fine', testo: () => c().alle },
          { campo: 'stato', testo: () => parole().stato },
        ],
      },
    ],
  },
  esegui: async (ambito, ingresso) => {
    const registro = ambito.contesto.registro
    const salvato = registro.impostazioni.calendario
    const calendario = calendarioDaLeggere(registro, ingresso.calendarioId)

    const anno = registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? null
    const dal = ingresso.dal ?? anno?.inizio
    const al = ingresso.al ?? anno?.fine
    if (!dal || !al) throw errore.rifiuta(c().serveAnno)
    if (dal > al) throw errore.rifiuta(c().periodoRovescio)

    let testoIcs: string
    try {
      testoIcs = await testoDelCalendario(calendario)
    } catch (guasto) {
      // Le frasi di `data/calendar.ts` non contengono l'indirizzo, che spesso ha un
      // gettone.
      throw errore.nonDisponibile(guasto instanceof Error ? guasto.message : c().nonSiLegge)
    }
    const regole = (ingresso.regole ?? salvato?.regole ?? []).map((r, i) => ({
      // testo-fisso: un identificatore di comodo, che nessuno legge
      id: r.id ?? `provvisoria-${i}`,
      testo: r.testo,
      corsoId: r.corsoId,
    }))
    return confrontaCalendario(registro, leggiCalendario(testoIcs, dal, al), regole)
  },
})
