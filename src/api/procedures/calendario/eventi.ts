// Gli eventi del calendario ICS del documento, così come sono, perché il
// calendario del pannello li disegni accanto alle ore (tratteggiati, senza
// farne lezioni). Una lettura sulle copie nel documento.
//
// Senza `calendarioId` li legge tutti. La chiave di ogni evento comincia con
// l'id del calendario: due calendari possono avere lo stesso UID. Un calendario
// che non si legge finisce in `guasti` e non ferma gli altri.

import { leggiCalendario, type EventoCalendario } from '../../../domain/calendarIcs.js'
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
import { calendarioDaLeggere } from './common.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './calendario.testi.js'

const t = () => testi().eventi
const c = () => testi().comune

export const procedura = definisci({
  nome: 'calendario.eventi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Come `calendario.confronta`: l'origine è un indirizzo di rete, non va al
  // modello.
  perAssistente: false,
  ingresso: oggetto({
    calendarioId: opzionale(identificatore({ aiuto: () => t().calendarioId })),
    dal: opzionale(iso({ aiuto: () => t().dal })),
    al: opzionale(iso({ aiuto: () => t().al })),
  }),
  uscita: oggetto({
    eventi: elenco(oggetto({
      chiave: testo({ aiuto: () => t().chiave }),
      calendarioId: testo({ aiuto: () => t().calendarioIdUscita }),
      data: iso(),
      inizio: ora(),
      fine: ora(),
      titolo: testo(),
      luogo: testo(),
      annullato: booleano({ aiuto: () => t().annullato }),
    })),
    scartati: numero({ intero: true, aiuto: () => c().scartati }),
    copre: nullabile(oggetto({ dal: iso(), al: iso() })),
    guasti: elenco(oggetto({
      calendarioId: testo(),
      nome: testo(),
      motivo: testo({ aiuto: () => t().motivo }),
    }), { aiuto: () => t().guasti }),
  }),
  presentazione: {
    titolo: () => t().presentazione.titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'scartati', etichetta: () => c().diUnGiornoIntero, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'eventi',
        colonne: [
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', testo: () => c().dalle, formato: 'ora' },
          { campo: 'fine', testo: () => c().alle, formato: 'ora' },
          { campo: 'titolo', testo: () => t().presentazione.evento },
          { campo: 'luogo', testo: () => parole().dove },
        ],
      },
    ],
  },
  esegui: async (ambito, ingresso) => {
    const registro = ambito.contesto.registro
    const calendari = ingresso.calendarioId
      ? [calendarioDaLeggere(registro, ingresso.calendarioId)]
      : registro.impostazioni.calendario?.calendari ?? []
    if (calendari.length === 0) {
      throw errore.rifiuta(c().nessunCalendario)
    }

    const anno = registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? null
    const dal = ingresso.dal ?? anno?.inizio
    const al = ingresso.al ?? anno?.fine
    if (!dal || !al) throw errore.rifiuta(c().serveAnno)
    if (dal > al) throw errore.rifiuta(c().periodoRovescio)

    const eventi: Array<EventoCalendario & { calendarioId: string }> = []
    const guasti: Array<{ calendarioId: string, nome: string, motivo: string }> = []
    let scartati = 0
    for (const calendario of calendari) {
      let testoIcs: string
      try {
        testoIcs = await testoDelCalendario(calendario)
      } catch (guasto) {
        // Le frasi di `data/calendar.ts` non contengono l'indirizzo, che spesso ha un
        // gettone.
        const motivo = guasto instanceof Error ? guasto.message : c().nonSiLegge
        if (ingresso.calendarioId) throw errore.nonDisponibile(motivo)
        guasti.push({ calendarioId: calendario.id, nome: calendario.nome, motivo })
        continue
      }
      const letto = leggiCalendario(testoIcs, dal, al)
      scartati += letto.scartati
      for (const evento of letto.eventi) {
        eventi.push({ ...evento, chiave: `${calendario.id}:${evento.chiave}`, calendarioId: calendario.id })
      }
    }
    eventi.sort((a, b) => a.data.localeCompare(b.data) || a.inizio.localeCompare(b.inizio))
    return {
      eventi,
      scartati,
      copre: eventi.length > 0 ? { dal: eventi[0].data, al: eventi[eventi.length - 1].data } : null,
      guasti,
    }
  },
})
