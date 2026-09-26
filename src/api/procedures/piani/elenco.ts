// I piani lezione, come li elenca la pagina Piani («che cosa avevo previsto per
// giovedì»). Le tappe di un piano le dà `piani.leggi`.

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
import { corto } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { testi } from './piani.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'piani.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    // Facoltativo, come in `valutazioni.elenco`: un piano si cerca su tutti i corsi.
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    tag: opzionale(testo({
      aiuto: () => t().tag,
      esempio: 'ripasso',
    })),
    ...ricerca(() => t().dove, 'frazioni'),
    ...pagina(),
  }),
  uscita: oggetto({
    corsoId: nullabile(testo({ aiuto: () => t().corsoChiesto })),
    cerca: testo({ aiuto: () => t().cerca }),
    ...CAMPI_PAGINA,
    piani: elenco(oggetto({
      id: testo({ aiuto: () => t().id }),
      corsoId: testo({ aiuto: () => t().corsoDelPiano }),
      nome: testo({ aiuto: () => t().nome }),
      assegnatoA: testo({ aiuto: () => t().assegnatoA }),
      obiettivi: numero({ intero: true }),
      tappe: numero({ intero: true }),
      ud: numero({ aiuto: () => t().ud }),
      risorse: numero({ intero: true }),
      tag: elenco(testo()),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [{ campo: 'quante', etichetta: () => p().piani, formato: 'numero' }],
      },
      {
        tipo: 'tabella',
        da: 'piani',
        colonne: [
          { campo: 'nome', testo: () => p().piano },
          { campo: 'assegnatoA', testo: () => p().assegnatoA },
          { campo: 'tappe', testo: () => p().tappe, formato: 'numero' },
          { campo: 'ud', testo: () => corto(lessico().unitaDidattica), formato: 'numero' },
          { campo: 'obiettivi', testo: () => p().obiettivi, formato: 'numero' },
          { campo: 'tag', testo: () => p().etichette, formato: 'elenco' },
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
      // L'etichetta è esatta (si sceglie da un elenco), la ricerca è a pezzi.
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
        // Il nome come lo mostra la pagina («3ª lezione»), da `nomeDelPiano`.
        nome: nomeDelPiano(r, piano),
        assegnatoA: lezioneDelPianoNelRegistro(r, piano),
        obiettivi: piano.obiettivi.length,
        tappe: piano.attivita.length,
        // Le UD e non i minuti: un piano si scrive in UD (vedi `Attivita.durataUd`).
        ud: piano.attivita.reduce((totale, tappa) => totale + tappa.durataUd, 0),
        risorse: piano.risorse.length,
        tag: [...piano.tag],
      })),
    }
  },
})
