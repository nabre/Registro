// Che cosa si è fatto nelle ore in cui una persona non c'era: gli argomenti di
// `ore.elenco` incrociati con l'appello, per preparare un recupero.
//
// `presenza` sceglie le ore (perse, seguite, a metà, tutte): «che cosa ha
// perso» e «che cosa ha fatto» sono la stessa lettura con un filtro.
//
// Gli stati per UD li allinea `statiAllineati`, e che cosa sia un'ora persa lo
// dice `contaComeAssenza`, la stessa funzione dei rapporti.

import {
  contaComeAssenza,
  contaUd,
  inizioLezione,
  nomeCompleto,
  statiAllineati,
} from '../../../domain/calculations.js'
import {
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import type { Lezione } from '../../../domain/models.js'
import { definisci, errore } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import {
  CAMPI_CERCA,
  CAMPI_PAGINA,
  filtroTesto,
  nelPeriodo,
  pagina,
  periodo,
  ricerca,
  risolviPeriodo,
  taglia,
} from '../common/filters.js'
import { esigiCorso, esigiPersona } from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './argomenti.testi.js'

const p = () => testi().presentazione

/**
 * Come si è stati in un'ora. `parziale`: ora cominciata in ritardo o lasciata
 * a metà, qualcosa si è sentito. `ignota`: nessuno ha fatto l'appello, né
 * presenza né assenza.
 */
const PRESENZE = ['persa', 'parziale', 'seguita', 'ignota'] as const

/** Che cosa si vuole vedere: il filtro che rende utile questa lettura. */
const FILTRI = ['perse', 'parziali', 'seguite', 'ignote', 'tutte'] as const

/** Come si legge una presenza quando la si sceglie nel filtro. */
const QUALI: Record<(typeof FILTRI)[number], readonly (typeof PRESENZE)[number][]> = {
  perse: ['persa'],
  parziali: ['parziale'],
  seguite: ['seguita'],
  ignote: ['ignota'],
  tutte: PRESENZE,
}

export const procedura = definisci({
  nome: 'persone.argomenti',
  versione: 1,
  genere: 'lettura',
  titolo: () => testi().titolo,
  idempotente: true,
  ingresso: oggetto({
    allievoId: identificatore({ aiuto: () => testi().allievoId }),
    corsoId: opzionale(identificatore({ aiuto: () => testi().corsoId })),
    // Predefinito «perse»: chi apre questa lettura prepara quasi sempre un recupero.
    presenza: opzionale(scelta(FILTRI, { aiuto: () => testi().presenza })),
    ...periodo(),
    ...ricerca(() => testi().dove, 'frazioni'),
    ...pagina(),
  }),
  uscita: oggetto({
    allievoId: testo(),
    allievo: testo({ aiuto: () => testi().allievo }),
    classe: testo(),
    dal: testo(),
    al: testo(),
    presenza: scelta(FILTRI, { aiuto: () => testi().presenzaUscita }),
    cerca: CAMPI_CERCA.cerca,
    ...CAMPI_PAGINA,
    // I tre conti stanno sul periodo intero, non sulla pagina.
    orePerse: numero({ intero: true, aiuto: () => testi().orePerse }),
    udPerse: numero({ intero: true, aiuto: () => testi().udPerse }),
    senzaArgomento: numero({ intero: true, aiuto: () => testi().senzaArgomento }),
    ore: elenco(oggetto({
      lezioneId: testo({ aiuto: () => testi().lezioneId }),
      data: testo(),
      inizio: nullabile(testo()),
      corsoId: testo(),
      corso: testo({ aiuto: () => testi().corso }),
      materia: testo(),
      aula: testo(),
      argomenti: testo({ aiuto: () => testi().argomenti }),
      presenza: scelta(PRESENZE),
      ud: numero({ intero: true, aiuto: () => testi().ud }),
      udAssenza: numero({ intero: true, aiuto: () => testi().udAssenza }),
      udPresenza: numero({ intero: true, aiuto: () => testi().udPresenza }),
      nota: testo({ aiuto: () => testi().nota }),
      conAppello: booleano({ aiuto: () => testi().conAppello }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'allievo', etichetta: () => p().persona },
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'presenza', etichetta: () => p().filtro },
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
          { campo: 'quante', etichetta: () => p().quante, formato: 'numero' },
          { campo: 'orePerse', etichetta: () => p().orePerse, formato: 'numero' },
          { campo: 'udPerse', etichetta: () => p().udPerse, formato: 'numero' },
          { campo: 'senzaArgomento', etichetta: () => p().senzaArgomento, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'ore',
        colonne: [
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', testo: () => p().dalle, formato: 'ora' },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'presenza', testo: () => p().comeAndata },
          { campo: 'udAssenza', testo: () => p().udPerseColonna, formato: 'numero' },
          { campo: 'argomenti', testo: () => p().argomenti },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const { classe, allievo } = esigiPersona(ambito, ingresso.allievoId)
    // Il corso nominato deve esistere ed essere di questa classe: altrimenti zero
    // ore sembrerebbero «non ha perso niente».
    if (ingresso.corsoId) {
      const corso = esigiCorso(ambito, ingresso.corsoId)
      if (corso.classeId !== classe.id) {
        throw errore.rifiuta(testi().corsoDiAltraClasse(corso.titolo, classe.nome))
      }
    }

    const { dal, al } = risolviPeriodo(r, ingresso)
    const quali = QUALI[ingresso.presenza ?? 'perse']
    const { corrisponde } = filtroTesto(ingresso.cerca)

    const corsi = corsiDellaClasse(r, classe.id)
      .filter((corso) => !ingresso.corsoId || corso.id === ingresso.corsoId)

    const righe = corsi
      .flatMap((corso) => {
        const materia = materiaDelCorso(r, corso)?.nome ?? ''
        const nome = [classe.nome, materia].filter(Boolean).join(' — ') || corso.titolo
        return registroDelCorso(r, corso.id)
          // Le annullate restano fuori: un'ora non tenuta non si recupera.
          .filter((lezione) => lezione.stato !== 'annullata')
          .filter((lezione) => nelPeriodo(lezione.data, dal, al))
          .map((lezione) =>
            voce(lezione, r.impostazioni.minutiUd, corso.id, nome, materia, ingresso.allievoId))
      })
      // Stesso ordine di `confrontaLezioni` (qui le righe non sono lezioni): il
      // pareggio sull'id rende stabile l'ordine delle ore alla stessa data e ora.
      .sort((a, b) =>
        a.data.localeCompare(b.data) ||
        (a.inizio ?? '').localeCompare(b.inizio ?? '') ||
        a.lezioneId.localeCompare(b.lezioneId),
      )

    // I conti del periodo prima dei filtri: dicono come sta la persona.
    const orePerse = righe.filter((riga) => riga.presenza === 'persa').length
    const udPerse = righe.reduce((somma, riga) => somma + riga.udAssenza, 0)

    const scelte = righe
      .filter((riga) => quali.includes(riga.presenza))
      .filter((riga) => corrisponde([riga.argomenti, riga.materia, riga.aula].join(' ')))

    const { pagina: ore, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      allievoId: allievo.id,
      allievo: nomeCompleto(allievo),
      classe: classe.nome,
      dal,
      al,
      presenza: ingresso.presenza ?? 'perse',
      cerca: ingresso.cerca ?? '',
      quante,
      da,
      troncato,
      ancora,
      orePerse,
      udPerse,
      // Sulle righe scelte: è un avvertimento su quel che si sta guardando.
      senzaArgomento: scelte.filter((riga) => riga.argomenti === '').length,
      ore,
    }
  },
})

/** Una riga: l'ora vista dalla parte di una persona sola. */
function voce (
  lezione: Lezione,
  minutiUd: number,
  corsoId: string,
  corso: string,
  materia: string,
  allievoId: string,
): {
  lezioneId: string
  data: string
  inizio: string | null
  corsoId: string
  corso: string
  materia: string
  aula: string
  argomenti: string
  presenza: (typeof PRESENZE)[number]
  ud: number
  udAssenza: number
  udPresenza: number
  nota: string
  conAppello: boolean
} {
  const ud = contaUd(lezione, minutiUd)
  const presenza = lezione.presenze.find((p) => p.allievoId === allievoId)
  const stati = statiAllineati(presenza, ud)
  const udAssenza = stati.filter(contaComeAssenza).length
  const conAppello = stati.some((stato) => stato !== 'non-impostato')

  return {
    lezioneId: lezione.id,
    data: lezione.data,
    inizio: inizioLezione(lezione),
    corsoId,
    corso,
    materia,
    aula: lezione.aula ?? '',
    argomenti: lezione.argomenti ?? '',
    // Conta quante UD sono andate perse, non il riassunto dell'ora: chi entra alla
    // terza UD di quattro ha perso metà argomento.
    presenza:
      !conAppello ? 'ignota'
        : udAssenza === 0 ? 'seguita'
          : udAssenza === ud ? 'persa'
            : 'parziale',
    ud,
    udAssenza,
    udPresenza: stati.filter((stato) => stato === 'presente' || stato === 'ritardo').length,
    nota: presenza?.nota ?? '',
    conAppello,
  }
}
