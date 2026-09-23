// Quel che resta da fare, come lo mostra il widget sul desktop.
//
// È la seconda scheda della striscia, e risponde alla domanda che ci si fa
// guardando il registro di sfuggita: «sono indietro?». La risposta arriva in due
// pezzi, e sono due pezzi diversi apposta.
//
// **Le ore aperte** stanno in cima. Un'ora passata senza appello, o fatta e mai
// segnata svolta, è un buco nel registro — l'unica cosa che nessun altro può
// chiudere al posto di chi c'era, e l'unica che diventa più difficile ogni
// giorno che passa. Vengono prima perché il resto può aspettare domani, e
// queste no: fra una settimana nessuno ricorda più chi mancava.
//
// **Le pendenze per classe** stanno sotto, e sono il riassunto della pagina
// Todo: le firme che non tornano, le prove da ridare, i documenti che vanno e
// vengono. I conti li fa `todo.ts`, non questo file — il widget e la pagina
// devono contare lo stesso, o uno dei due direbbe una bugia e non si saprebbe
// quale.
//
// Come le altre viste «da lontano», qui non c'è un orologio: entrano il
// registro, il giorno e l'ora, esce un albero di stringhe che si prova con
// `node --test`.

import { annoDellAgenda } from './agenda.js'
import { estremiAnno } from './years.js'
import { confrontaLezioni, inizioLezione } from './calculations.js'
import { classeDelCorso, corsiDellAnno, corsoPerId, materiaDelCorso, siglaMateria } from './courses.js'
import { cosaManca, diagnosiLezione } from './dashboard.js'
import { GIORNI_BREVI, giornoDelMese, giornoSettimana } from './dates.js'
import type { Iso, Ora, Registro } from './models.js'
import { annoInUso } from './years.js'
import {
  FAMIGLIE_TODO,
  classiConLavoro,
  nomeFamiglia,
  riepilogoTodo,
  type FamigliaTodo,
  type RiepilogoTodo,
} from './todo.js'

/**
 * Quante ore aperte entrano nella striscia.
 *
 * Non è una misura di spazio — la scheda scorre — ma di sopportazione: un
 * elenco di quaranta buchi non si legge, si subisce, e chi lo guarda smette di
 * aprire la scheda. Le altre si contano e si dicono in una riga sola, che è già
 * abbastanza per sapere di essere indietro.
 */
export const ORE_APERTE_MOSTRATE = 6

/** Un'ora rimasta indietro, come la si legge in una riga. */
interface OraAperta {
  lezioneId: string
  data: Iso
  /** 'ven 12': il giorno com'è scritto in testa a una colonna del registro. */
  quando: string
  inizio: Ora | null
  classe: string
  materia: string
  /** Che cosa manca: «senza appello», «non segnata svolta», o tutte e due. */
  manca: string[]
}

/** Una tipologia di lavoro aperto dentro una classe. */
interface VocePendenza {
  famiglia: FamigliaTodo
  nome: string
  aperti: number
  /** Quelle in ritardo, o che nessun automatismo chiuderà: danno il tono. */
  urgenti: number
}

interface ClassePendenze {
  classeId: string
  classe: string
  aperti: number
  urgenti: number
  voci: VocePendenza[]
}

interface AgendaPendenze {
  /** Nessun anno aperto: la scheda lo dice come fanno le altre. */
  senzaRegistro: boolean
  oreAperte: OraAperta[]
  /** Quante ore aperte restano fuori dall'elenco: si dicono in una riga. */
  altreOre: number
  classi: ClassePendenze[]
  /** I totali, che sono quel che va scritto sulla linguetta della scheda. */
  aperti: number
  urgenti: number
}

/** Le classi dell'anno in uso: le sole di cui il widget parla. */
function classiDellAnno (registro: Registro): Registro['classi'] {
  // Dall'anno in uso e non da `annoCorrenteId` nudo: con un identificativo che
  // punta a un anno sparito qui usciva zero classi e il widget diceva «nessun
  // registro», mentre la barra laterale accanto le elencava tutte.
  const anno = annoInUso(registro)
  return registro.classi.filter((classe) => classe.annoId === anno?.id)
}

/**
 * Le ore rimaste aperte, dalla più vecchia.
 *
 * Dalla più vecchia e non dall'ultima: un martedì di ottobre senza appello è
 * quello che si sta dimenticando davvero, e un elenco che cominciasse da ieri lo
 * spingerebbe fuori dalla striscia ogni giorno un po' di più. È lo stesso ordine
 * con cui `oraDaCompilare` sceglie dove mandare chi apre il registro.
 *
 * Si guardano solo le ore già cominciate: quelle di domani non sono buchi, e
 * attraversare l'anno intero a ogni battito dell'orologio costa senza dare
 * niente in cambio.
 */
export function oreAperte (registro: Registro, oggi: Iso, ora: Ora): OraAperta[] {
  const estremi = estremiAnno(annoDellAgenda(registro))
  if (!estremi) return []

  return registro.lezioni
    .filter((lezione) => lezione.data >= estremi.inizio && lezione.data <= oggi)
    .sort(confrontaLezioni)
    .map((lezione) => ({ lezione, diagnosi: diagnosiLezione(registro, lezione, 0, oggi, ora) }))
    .filter(({ diagnosi }) => diagnosi.urgenza === 'manca')
    .map(({ lezione, diagnosi }) => {
      const corso = corsoPerId(registro, lezione.corsoId)
      return {
        lezioneId: lezione.id,
        data: lezione.data,
        quando: `${GIORNI_BREVI[giornoSettimana(lezione.data) - 1]} ${giornoDelMese(lezione.data)}`,
        inizio: (inizioLezione(lezione)) ?? null,
        classe: classeDelCorso(registro, corso)?.nome ?? 'classe',
        materia: siglaMateria(materiaDelCorso(registro, corso)),
        manca: cosaManca(diagnosi),
      }
    })
}

/** Le classi con qualcosa in sospeso, ridotte a quel che sta in una striscia. */
function pendenzePerClasse (riepilogo: RiepilogoTodo): ClassePendenze[] {
  return classiConLavoro(riepilogo).map((todo) => ({
    classeId: todo.classeId,
    classe: todo.classe,
    aperti: todo.aperti,
    urgenti: todo.urgenti,
    voci: FAMIGLIE_TODO.filter((famiglia) => todo.conti[famiglia].aperti > 0).map((famiglia) => ({
      famiglia,
      nome: nomeFamiglia(famiglia),
      aperti: todo.conti[famiglia].aperti,
      urgenti: todo.conti[famiglia].urgenti,
    })),
  }))
}

/**
 * La scheda intera.
 *
 * `riepilogo` si passa da fuori perché costa: i conti delle consegne, delle
 * riconsegne e delle firme si rifanno per ogni classe, e dipendono dal giorno e
 * non dall'ora — chi chiama può tenerli da parte finché il registro non cambia,
 * invece di rifarli a ogni battito dell'orologio. Senza, li si fa qui.
 */
export function agendaPendenze (
  registro: Registro,
  oggi: Iso,
  ora: Ora,
  riepilogo: RiepilogoTodo = riepilogoPendenze(registro, oggi),
): AgendaPendenze {
  const anno = annoDellAgenda(registro)
  const aperte = oreAperte(registro, oggi, ora)
  const classi = pendenzePerClasse(riepilogo)

  return {
    senzaRegistro: anno === null,
    oreAperte: aperte.slice(0, ORE_APERTE_MOSTRATE),
    altreOre: Math.max(0, aperte.length - ORE_APERTE_MOSTRATE),
    classi,
    // Le ore aperte contano fra le cose da fare: sono la parte che nessun altro
    // può chiudere, e lasciarle fuori dal totale vorrebbe dire una linguetta
    // che dice «niente» mentre la scheda ne elenca sei.
    aperti: riepilogo.aperti + aperte.length,
    urgenti: riepilogo.urgenti + aperte.length,
  }
}

/** I conti della pagina Todo, per l'anno in uso. Vedi `agendaPendenze`. */
export function riepilogoPendenze (registro: Registro, oggi: Iso): RiepilogoTodo {
  return riepilogoTodo(
    registro,
    classiDellAnno(registro),
    corsiDellAnno(registro, registro.annoCorrenteId),
    oggi,
  )
}
