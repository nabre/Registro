// Un piano lezione per intero: che cosa si voleva fare, in che ordine.
//
// È la risposta a «che cosa avevo preparato», ed è anche quel che serve per
// prepararne un altro: gli obiettivi, le tappe con la loro durata, che cosa
// ciascuna chiede di portare in aula. `piani.elenco` dice quanti sono; questa
// apre quello che interessa.

import { nomeTipoAttivita } from '../../../domain/activities.js'
import { lezioneDelPianoNelRegistro, nomeDelPiano } from '../../../domain/courses.js'
import { LEZIONE } from '../../../domain/lexicon.js'
import { definisci, errore } from '../../contract.js'
import { booleano, elenco, identificatore, numero, oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'piani.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: 'Un piano lezione per intero: obiettivi, tappe, risorse',
  idempotente: true,
  ingresso: oggetto({ pianoId: identificatore() }),
  uscita: oggetto({
    id: testo(),
    nome: testo(),
    corsoId: testo(),
    assegnatoA: testo({ aiuto: 'L’ora a cui è assegnato, o vuoto se è una bozza' }),
    obiettivi: elenco(testo()),
    prerequisiti: testo(),
    note: testo(),
    tag: elenco(testo()),
    ud: numero({ aiuto: 'Quanto dura in tutto, in unità didattiche' }),
    tappe: elenco(oggetto({
      titolo: testo(),
      tipo: testo({ aiuto: 'Che genere di attività è, come si legge' }),
      durataUd: numero(),
      descrizione: testo(),
      materiali: testo({ aiuto: 'Che cosa serve in aula per quella tappa' }),
      valutata: booleano({ aiuto: 'Se da quella tappa esce una prova' }),
    })),
    risorse: elenco(oggetto({
      titolo: testo(),
      genere: testo({ aiuto: 'Che cos’è: un file, un collegamento, un’immagine' }),
    })),
  }),
  presentazione: {
    titolo: 'Il piano lezione',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'nome', etichetta: 'Piano' },
          { campo: 'assegnatoA', etichetta: 'Assegnato a' },
          { campo: 'ud', etichetta: 'Durata in UD', formato: 'numero' },
          { campo: 'prerequisiti', etichetta: 'Prerequisiti' },
          { campo: 'note', etichetta: 'Note' },
        ],
      },
      { tipo: 'elenco', da: 'obiettivi', titolo: 'Obiettivi' },
      {
        tipo: 'tabella',
        da: 'tappe',
        titolo: 'Le tappe, nell’ordine',
        colonne: [
          { campo: 'titolo', testo: 'Tappa' },
          { campo: 'tipo', testo: 'Genere' },
          { campo: 'durataUd', testo: 'UD', formato: 'numero' },
          { campo: 'materiali', testo: 'Materiali' },
          { campo: 'valutata', testo: 'Prova', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const piano = r.piani.find((p) => p.id === ingresso.pianoId)
    if (!piano) {
      throw errore.nonTrovato(
        LEZIONE.pianoLezione,
        'I piani di un corso li elenca «piani.elenco».',
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
        // Il nome che la pagina dà al tipo, non la chiave del dominio: è la
        // parola che chi insegna legge nella tendina della tappa.
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
