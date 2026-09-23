// I piani lezione di un corso, come li elenca la pagina Piani.
//
// Il contesto manda `pianoId` — è il piano aperto — e fin qui non lo prendeva
// nessuno: «che cosa avevo previsto per giovedì» era una domanda senza
// attrezzo. Qui c'è l'elenco; le tappe di uno solo le dà `piani.leggi`, perché
// dodici piani con dentro le loro attività sono una busta che nessuno ha
// chiesto e che copre la domanda «quanti ne ho».

import {
  corsiDellaClasse,
  lezioneDelPianoNelRegistro,
  nomeDelPiano,
  pianiDelCorso,
} from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import { elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { CAMPI_PAGINA, filtroTesto, pagina, ricerca, taglia } from '../common/filters.js'
import { esigiClasse, esigiCorso } from '../common/register.js'

export const procedura = definisci({
  nome: 'piani.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'I piani lezione di un corso, con obiettivi e tappe',
  idempotente: true,
  ingresso: oggetto({
    // Opzionale come in `valutazioni.elenco`, e per la stessa ragione:
    // «dove avevo messo quel piano sulle frazioni» è una domanda su tutti i
    // corsi, e con il corso obbligatorio voleva dire cercarlo corso per corso.
    corsoId: opzionale(identificatore({ aiuto: 'Solo i piani di questo corso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo i piani dei corsi di questa classe' })),
    tag: opzionale(testo({
      aiuto: 'Solo i piani con questa etichetta. Esatta, non a pezzi',
      esempio: 'ripasso',
    })),
    ...ricerca('nome, obiettivo, tappa o etichetta', 'frazioni'),
    ...pagina(),
  }),
  uscita: oggetto({
    corsoId: nullabile(testo({ aiuto: 'Il corso chiesto, o nullo se erano tutti' })),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    ...CAMPI_PAGINA,
    piani: elenco(oggetto({
      id: testo({ aiuto: 'Da passare a «piani.leggi» per avere le tappe' }),
      corsoId: testo({ aiuto: 'Di quale corso è: serve quando si chiedono tutti' }),
      nome: testo({ aiuto: 'Come si chiama nell’elenco: «3ª lezione», «bozza del 12.09»' }),
      assegnatoA: testo({ aiuto: 'L’ora a cui è assegnato, o vuoto se è una bozza' }),
      obiettivi: numero({ intero: true }),
      tappe: numero({ intero: true }),
      ud: numero({ aiuto: 'Quanto dura in unità didattiche, sommando le tappe' }),
      risorse: numero({ intero: true }),
      tag: elenco(testo()),
    })),
  }),
  presentazione: {
    titolo: 'I piani del corso',
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'quante', etichetta: 'Piani', formato: 'numero' }] },
      {
        tipo: 'tabella',
        da: 'piani',
        colonne: [
          { campo: 'nome', testo: 'Piano' },
          { campo: 'assegnatoA', testo: 'Assegnato a' },
          { campo: 'tappe', testo: 'Tappe', formato: 'numero' },
          { campo: 'ud', testo: 'UD', formato: 'numero' },
          { campo: 'obiettivi', testo: 'Obiettivi', formato: 'numero' },
          { campo: 'tag', testo: 'Etichette', formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const corso = ingresso.corsoId ? esigiCorso(ambito, ingresso.corsoId) : null
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)
    const { corrisponde } = filtroTesto(ingresso.cerca)

    const corsi = (ingresso.classeId ? corsiDellaClasse(r, ingresso.classeId) : r.corsi)
      .filter((c) => !corso || c.id === corso.id)

    const scelti = corsi
      .flatMap((c) => pianiDelCorso(r, c.id).map((piano) => ({ piano, corsoId: c.id })))
      // L'etichetta è esatta e la ricerca è a pezzi: sono due gesti diversi.
      // Un'etichetta la si sceglie da un elenco — o c'è o non c'è — mentre
      // «frazioni» lo si batte ricordandosi metà di quel che si cercava.
      .filter(({ piano }) => !ingresso.tag || piano.tag.includes(ingresso.tag))
      .filter(({ piano }) =>
        corrisponde([
          nomeDelPiano(r, piano),
          piano.note ?? '',
          ...piano.tag,
          ...piano.obiettivi,
          ...piano.attivita.map((tappa) => tappa.titolo),
        ].join(' ')),
      )

    const { pagina: piani, quante, da, troncato, ancora } = taglia(scelti, ingresso)

    return {
      corsoId: corso?.id ?? null,
      cerca: ingresso.cerca ?? '',
      quante,
      da,
      troncato,
      ancora,
      piani: piani.map(({ piano, corsoId }) => ({
        id: piano.id,
        corsoId,
        // Il nome che la pagina gli dà, non l'id: «3ª lezione» è il modo in cui
        // un piano si nomina parlando, e viene da `nomeDelPiano` — la stessa
        // funzione che riempie l'elenco a schermo.
        nome: nomeDelPiano(r, piano),
        assegnatoA: lezioneDelPianoNelRegistro(r, piano),
        obiettivi: piano.obiettivi.length,
        tappe: piano.attivita.length,
        // Le UD e non i minuti: è l'unità in cui un piano si scrive, e i minuti
        // dipendono dall'orario della scuola. Vedi `Attivita.durataUd`.
        ud: piano.attivita.reduce((totale, tappa) => totale + tappa.durataUd, 0),
        risorse: piano.risorse.length,
        tag: [...piano.tag],
      })),
    }
  },
})
