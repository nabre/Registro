// Le ore a calendario in un periodo: «che ore ho domani», «quante ne ho fatte
// in matematica», «quali ho annullato». Dà anche il `lezioneId` che le altre
// letture vogliono.
//
// Tutti i filtri sono facoltativi (corso, classe, materia, periodo, stato,
// ricerca su argomento, corso e aula): senza, le ore dell'anno in uso. Vengono
// da `common/filters.ts`, con gli stessi nomi delle altre letture.

import {
  confrontaLezioni,
  contaUd,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
} from '../../../domain/calculations.js'
import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
  numeroDellaLezione,
} from '../../../domain/courses.js'
import type { Lezione } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
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
  CAMPI_PAGINA,
  filtroTesto,
  nelPeriodo,
  pagina,
  passaPresenza,
  periodo,
  presenzaDi,
  ricerca,
  risolviPeriodo,
  taglia,
} from '../common/filters.js'
import { corto } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { STATI_LEZIONE } from './common.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './ore.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

/**
 * I campi di un'ora che possono restare vuoti: «quali ore non dicono che cosa
 * si è fatto». Data, corso e stato ci sono sempre.
 */
const CAMPI_ORA = ['argomenti', 'materiali', 'consuntivo', 'piano', 'aula', 'appello'] as const

/**
 * Se su quell'ora è stata spuntata almeno una casella: una riga tutta
 * `non-impostato` non è un appello fatto. La usano il filtro e `conAppello`.
 */
function appelloFatto (lezione: Lezione): boolean {
  return lezione.presenze.some((presenza) =>
    presenza.stati.some((stato) => stato !== 'non-impostato'),
  )
}

/**
 * L'ora come la vede il filtro: un valore per campo. Il piano conta solo se il
 * `pianoId` punta a un piano che esiste: un rimando rotto è un'ora da
 * ripreparare.
 */
function valoriDi (lezione: Lezione, piani: ReadonlySet<string>): Record<string, unknown> {
  return {
    argomenti: lezione.argomenti,
    materiali: lezione.materiali,
    consuntivo: lezione.consuntivo,
    piano: lezione.pianoId !== null && piani.has(lezione.pianoId) ? lezione.pianoId : null,
    aula: lezione.aula,
    // `pieno` considera pieno un `false`: `|| null` rende vuoto l'appello non fatto.
    appello: appelloFatto(lezione) || null,
  }
}

export const procedura = definisci({
  nome: 'ore.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: () => testi().comune.soloDelCorso })),
    classeId: opzionale(identificatore({ aiuto: () => testi().comune.soloDellaClasse })),
    materiaId: opzionale(identificatore({ aiuto: () => t().materiaId })),
    stato: opzionale(scelta(STATI_LEZIONE, { aiuto: () => t().stato })),
    ...periodo(() => t().leOre),
    ...ricerca(() => t().dove, 'frazioni'),
    // Le caselle vuote per nome, componibili: `ha: ['appello']` con
    // `senza: ['argomenti']` = ore tenute e mai raccontate.
    ...presenzaDi(CAMPI_ORA, () => t().leOre),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    cerca: testo({ aiuto: () => t().cerca }),
    // Rimandati come `cerca`: la busta dice quali caselle ha chiesto vuote.
    ha: elenco(scelta(CAMPI_ORA), { aiuto: () => t().ha }),
    senza: elenco(scelta(CAMPI_ORA), { aiuto: () => t().senza }),
    ...CAMPI_PAGINA,
    ore: elenco(oggetto({
      id: testo(),
      data: testo(),
      inizio: nullabile(testo()),
      fine: nullabile(testo()),
      corsoId: testo(),
      corso: testo({ aiuto: () => testi().comune.corsoComeSiLegge }),
      classe: testo(),
      numero: nullabile(numero({ intero: true, aiuto: () => t().numero })),
      stato: scelta(STATI_LEZIONE),
      ud: numero({ intero: true }),
      minuti: numero({ intero: true, aiuto: () => t().minuti }),
      aula: testo(),
      argomenti: testo({ aiuto: () => t().argomenti }),
      conAppello: booleano({ aiuto: () => t().conAppello }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
          { campo: 'ha', etichetta: () => parole().con, formato: 'elenco' },
          { campo: 'senza', etichetta: () => parole().senza, formato: 'elenco' },
          { campo: 'quante', etichetta: () => p().oreNelPeriodo, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'ore',
        colonne: [
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', testo: () => p().dalle, formato: 'ora' },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'stato', testo: () => p().stato },
          { campo: 'ud', testo: () => corto(lessico().unitaDidattica), formato: 'numero' },
          { campo: 'argomenti', testo: () => p().argomenti },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const { dal, al } = risolviPeriodo(r, ingresso)
    const { corrisponde } = filtroTesto(ingresso.cerca)
    // Gli id dei piani esistenti, raccolti una volta sola.
    const piani = new Set(r.piani.map((piano) => piano.id))

    // Come si legge un'ora cercata a parole (argomento, corso, aula): la stessa
    // stringa serve a filtrare e a rispondere.
    const detta = (lezione: typeof r.lezioni[number]) => {
      const classe = classeDellaLezione(r, lezione)
      const materia = materiaDellaLezione(r, lezione)
      return {
        classe,
        materia,
        corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') ||
          corsoDellaLezione(r, lezione)?.titolo || '—',
      }
    }

    const scelte = r.lezioni
      .filter((lezione) => nelPeriodo(lezione.data, dal, al))
      .filter((lezione) => !ingresso.corsoId || lezione.corsoId === ingresso.corsoId)
      .filter((lezione) => !ingresso.stato || lezione.stato === ingresso.stato)
      .filter((lezione) =>
        !ingresso.classeId || classeDellaLezione(r, lezione)?.id === ingresso.classeId,
      )
      // Per materia e non per corso: «quante ore di matematica» vale su tutte le
      // classi.
      .filter((lezione) =>
        !ingresso.materiaId || materiaDellaLezione(r, lezione)?.id === ingresso.materiaId,
      )
      .filter((lezione) =>
        corrisponde([lezione.argomenti ?? '', detta(lezione).corso, lezione.aula ?? ''].join(' ')),
      )
      .filter((lezione) => passaPresenza(valoriDi(lezione, piani), ingresso.ha, ingresso.senza))
      // Il comparatore del dominio: pareggia anche sull'id, così l'ordine è stabile.
      .sort(confrontaLezioni)

    const { pagina: ore, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      dal,
      al,
      cerca: ingresso.cerca ?? '',
      ha: ingresso.ha ?? [],
      senza: ingresso.senza ?? [],
      // Tagliato, detto, e raggiungibile con la pagina.
      quante,
      da,
      troncato,
      ancora,
      ore: ore.map((lezione) => {
        const { classe, corso } = detta(lezione)
        return {
          id: lezione.id,
          data: lezione.data,
          inizio: inizioLezione(lezione),
          fine: fineLezione(lezione),
          corsoId: lezione.corsoId,
          corso,
          classe: classe?.nome ?? '—',
          numero: numeroDellaLezione(r, lezione),
          stato: lezione.stato,
          ud: contaUd(lezione, r.impostazioni.minutiUd),
          minuti: minutiEffettivi(lezione),
          aula: lezione.aula ?? '',
          argomenti: lezione.argomenti ?? '',
          conAppello: appelloFatto(lezione),
        }
      }),
    }
  },
})
