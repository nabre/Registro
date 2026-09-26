// Un piano lezione per intero: obiettivi, tappe con la loro durata, che cosa
// portare in aula. `piani.elenco` dice quanti sono; questa ne apre uno.

import { nomeTipoAttivita } from '../../../domain/activities.js'
import { lezioneDelPianoNelRegistro, nomeDelPiano } from '../../../domain/courses.js'
import { definisci, errore } from '../../contract.js'
import { booleano, elenco, identificatore, numero, oggetto, testo } from '../../schemas.js'
import { corto } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './piani.testi.js'

const t = () => testi().leggi
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'piani.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({ pianoId: identificatore() }),
  uscita: oggetto({
    id: testo(),
    nome: testo(),
    corsoId: testo(),
    assegnatoA: testo({ aiuto: () => t().assegnatoA }),
    obiettivi: elenco(testo()),
    prerequisiti: testo(),
    note: testo(),
    tag: elenco(testo()),
    ud: numero({ aiuto: () => t().ud }),
    tappe: elenco(oggetto({
      titolo: testo(),
      tipo: testo({ aiuto: () => t().tipo }),
      durataUd: numero(),
      descrizione: testo(),
      materiali: testo({ aiuto: () => t().materiali }),
      valutata: booleano({ aiuto: () => t().valutata }),
    })),
    risorse: elenco(oggetto({
      titolo: testo(),
      genere: testo({ aiuto: () => t().genere }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'nome', etichetta: () => p().piano },
          { campo: 'assegnatoA', etichetta: () => p().assegnatoA },
          { campo: 'ud', etichetta: () => p().durata, formato: 'numero' },
          { campo: 'prerequisiti', etichetta: () => p().prerequisiti },
          { campo: 'note', etichetta: () => parole().note },
        ],
      },
      { tipo: 'elenco', da: 'obiettivi', titolo: () => p().obiettivi },
      {
        tipo: 'tabella',
        da: 'tappe',
        titolo: () => p().tappe,
        colonne: [
          { campo: 'titolo', testo: () => p().tappa },
          { campo: 'tipo', testo: () => p().genere },
          { campo: 'durataUd', testo: () => corto(lessico().unitaDidattica), formato: 'numero' },
          { campo: 'materiali', testo: () => p().materiali },
          { campo: 'valutata', testo: () => p().prova, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const piano = r.piani.find((p) => p.id === ingresso.pianoId)
    if (!piano) {
      throw errore.nonTrovato(
        'pianoLezione',
        t().rimedio,
      )
    }

    return {
      id: piano.id,
      nome: nomeDelPiano(r, piano),
      corsoId: piano.corsoId ?? '',
      assegnatoA: lezioneDelPianoNelRegistro(r, piano),
      obiettivi: [...piano.obiettivi],
      prerequisiti: piano.prerequisiti ?? '',
      note: piano.note ?? '',
      tag: [...piano.tag],
      ud: piano.attivita.reduce((totale, tappa) => totale + tappa.durataUd, 0),
      tappe: piano.attivita.map((tappa) => ({
        titolo: tappa.titolo,
        // Il nome del tipo come nella tendina della tappa, non la chiave del dominio.
        tipo: nomeTipoAttivita(tappa.tipo),
        durataUd: tappa.durataUd,
        descrizione: tappa.descrizione ?? '',
        materiali: tappa.materiali ?? '',
        valutata: Boolean(tappa.valutazione),
      })),
      risorse: piano.risorse.map((risorsa) => ({
        titolo: risorsa.titolo,
        genere: risorsa.tipo,
      })),
    }
  },
})
