// Le ore a calendario, in un periodo.
//
// È l'agenda detta a chi chiede: «che ore ho domani», «quante ne ho fatte in
// matematica», «quali ho annullato». Fin qui l'assistente non aveva modo di
// rispondere a nessuna delle tre — `ore.appello.leggi` vuole un `lezioneId`, e
// l'unico modo di procurarselo era averlo già nel contesto, cioè averla già
// aperta.
//
// Filtri e nessun obbligo: il corso, la classe, la materia, il periodo, lo
// stato, e una ricerca a parole su argomento, corso e aula. Senza niente sono
// le ore dell'anno in uso, che è l'elenco da cui si parte per restringere.
//
// I filtri non sono scritti qui: vengono da `common/filters.ts`, e sono gli
// stessi di tutte le altre letture che elencano. Il periodo si chiama `dal` e
// `al` dappertutto, la ricerca `cerca`, la pagina `da` e `quanti` — e chi ha
// imparato a restringere un elenco sa restringerli tutti.

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
import { STATI_LEZIONE } from './common.js'

/**
 * I campi di un'ora che possono restare vuoti.
 *
 * Sono le sei caselle che a fine semestre si scopre di non aver riempito:
 * «quali ore non dicono che cosa si è fatto» è la domanda con cui si chiude
 * un registro, e fin qui si rispondeva scorrendo il calendario mese per mese.
 * Non ci stanno data, corso e stato: quelli un'ora ce li ha sempre, e un
 * filtro su di loro non toglierebbe mai niente.
 */
const CAMPI_ORA = ['argomenti', 'materiali', 'consuntivo', 'piano', 'aula', 'appello'] as const

/**
 * Se su quell'ora qualcuno ha spuntato almeno una casella.
 *
 * «L'appello è stato fatto» non è «c'è una riga»: una riga tutta a
 * `non-impostato` è un'ora in cui nessuno ha segnato niente, e contarla come
 * fatta gonfierebbe il denominatore della presenza. Una funzione e non due
 * righe ripetute, perché adesso la stessa domanda la fanno in due — il filtro
 * prima di tagliare, e la busta quando scrive `conAppello`.
 */
function appelloFatto (lezione: Lezione): boolean {
  return lezione.presenze.some((presenza) =>
    presenza.stati.some((stato) => stato !== 'non-impostato'),
  )
}

/**
 * L'ora come la vede il filtro: un valore per campo, e basta che `pieno`
 * sappia dire se c'è.
 *
 * Il piano non si legge dal solo `pianoId`: un id che non punta a niente è un
 * rimando rotto — capita ai registri che hanno perso una scaletta — e
 * contarlo come piano nasconderebbe proprio l'ora che va ripreparata.
 */
function valoriDi (lezione: Lezione, piani: ReadonlySet<string>): Record<string, unknown> {
  return {
    argomenti: lezione.argomenti,
    materiali: lezione.materiali,
    consuntivo: lezione.consuntivo,
    piano: lezione.pianoId !== null && piani.has(lezione.pianoId) ? lezione.pianoId : null,
    aula: lezione.aula,
    // `pieno` guarda il valore e non il tipo, e un `false` è un valore: un
    // booleano passato com'è sarebbe sempre pieno, e «le ore senza appello»
    // tornerebbe vuota qualunque cosa ci sia nel registro.
    appello: appelloFatto(lezione) || null,
  }
}

export const procedura = definisci({
  nome: 'ore.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'Le ore a calendario in un periodo, con stato e argomenti',
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: 'Solo le ore di questo corso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo le ore di questa classe' })),
    materiaId: opzionale(identificatore({ aiuto: 'Solo le ore di questa materia, in ogni classe' })),
    stato: opzionale(scelta(STATI_LEZIONE, { aiuto: 'Solo le ore in questo stato' })),
    ...periodo('le ore'),
    ...ricerca('argomento, corso o aula', 'frazioni'),
    // Le caselle rimaste vuote, chieste per nome. È il filtro con cui si
    // chiude un semestre — «quali ore non hanno l’argomento», «su quali non
    // ho fatto l’appello» — e i due campi si compongono: `ha: ['appello']`
    // con `senza: ['argomenti']` sono le ore tenute davvero e mai raccontate.
    ...presenzaDi(CAMPI_ORA, 'le ore'),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    // Rimandati come `cerca`: una busta che non dice quali caselle ha chiesto
    // vuote si rilegge il giorno dopo come se fossero tutte le ore del
    // periodo, ed è il modo più facile di contare due volte un semestre.
    ha: elenco(scelta(CAMPI_ORA), { aiuto: 'I campi che si sono chiesti pieni' }),
    senza: elenco(scelta(CAMPI_ORA), { aiuto: 'I campi che si sono chiesti vuoti' }),
    ...CAMPI_PAGINA,
    ore: elenco(oggetto({
      id: testo(),
      data: testo(),
      inizio: nullabile(testo()),
      fine: nullabile(testo()),
      corsoId: testo(),
      corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica»' }),
      classe: testo(),
      numero: nullabile(numero({ intero: true, aiuto: 'La quantesima del corso: le annullate non contano' })),
      stato: scelta(STATI_LEZIONE),
      ud: numero({ intero: true }),
      minuti: numero({ intero: true, aiuto: 'Minuti di lezione effettiva, pause escluse' }),
      aula: testo(),
      argomenti: testo({ aiuto: 'Che cosa si è fatto, come l’ha scritto chi insegna' }),
      conAppello: booleano({ aiuto: 'Se l’appello è stato fatto almeno su una UD' }),
    })),
  }),
  presentazione: {
    titolo: 'Le ore a calendario',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'ha', etichetta: 'Con', formato: 'elenco' },
          { campo: 'senza', etichetta: 'Senza', formato: 'elenco' },
          { campo: 'quante', etichetta: 'Ore nel periodo', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'ore',
        colonne: [
          { campo: 'data', testo: 'Giorno', formato: 'data' },
          { campo: 'inizio', testo: 'Dalle', formato: 'ora' },
          { campo: 'corso', testo: 'Corso' },
          { campo: 'stato', testo: 'Stato' },
          { campo: 'ud', testo: 'UD', formato: 'numero' },
          { campo: 'argomenti', testo: 'Argomenti' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const { dal, al } = risolviPeriodo(r, ingresso)
    const { corrisponde } = filtroTesto(ingresso.cerca)
    // Gli id dei piani che esistono davvero, raccolti una volta sola: cercare
    // dentro il filtro vorrebbe dire scorrere tutti i piani per ogni ora
    // dell'anno, che su un registro pieno sono due liste lunghe moltiplicate.
    const piani = new Set(r.piani.map((piano) => piano.id))

    // Come si legge un'ora quando la si cerca a parole: l'argomento, il nome
    // del corso, l'aula. Composta una volta e usata due — per filtrare e per
    // rispondere — così non si può cercare in una riga e mostrarne un'altra.
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
      // Per materia e non per corso: «quante ore di matematica ho fatto» è una
      // domanda su tutte le classi insieme, e per corso vorrebbe dire una
      // chiamata per classe e una somma fatta da chi legge.
      .filter((lezione) =>
        !ingresso.materiaId || materiaDellaLezione(r, lezione)?.id === ingresso.materiaId,
      )
      .filter((lezione) =>
        corrisponde([lezione.argomenti ?? '', detta(lezione).corso, lezione.aula ?? ''].join(' ')),
      )
      .filter((lezione) => passaPresenza(valoriDi(lezione, piani), ingresso.ha, ingresso.senza))
      // Il comparatore del dominio e non una copia: quello pareggia anche
      // sull'id, e senza quel terzo criterio due ore della stessa data alla
      // stessa ora si scambiano di posto fra una chiamata e l'altra.
      .sort(confrontaLezioni)

    const { pagina: ore, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      dal,
      al,
      cerca: ingresso.cerca ?? '',
      ha: ingresso.ha ?? [],
      senza: ingresso.senza ?? [],
      // Tagliato e detto, e adesso anche **ripescabile**: prima la busta
      // diceva «ce ne sono di più» e non c'era nessuna strada per averle.
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
          ud: contaUd(lezione),
          minuti: minutiEffettivi(lezione),
          aula: lezione.aula ?? '',
          argomenti: lezione.argomenti ?? '',
          conAppello: appelloFatto(lezione),
        }
      }),
    }
  },
})
