// I filtri che le letture si dividono: periodo, ricerca, pagina, presenza di
// un valore, soglie, zona. Una lettura prende i pezzi di schema che le servono
// (`...periodo()`, `...ricerca(…)`, `...pagina()`) e le funzioni che li
// applicano, così ogni busta usa gli stessi nomi.
//
// Regola comune: un filtro si deve poter togliere, e la busta dice su che cosa
// ha risposto (vedi le letture in `docs/API.md`).

import { annoInUso, estremiAnno } from '../../../domain/years.js'
import { limita, nomeCompleto } from '../../../domain/calculations.js'
import { annoDellaClasse } from '../../../domain/courses.js'
import { corrispondeAlla, normalizzaTesto, pezziDiRicerca } from '../../../domain/text.js'
import type { Allievo, Classe, Corso, Registro } from '../../../domain/models.js'
import { detto, type TestoPigro } from '../../../i18n/index.js'
import { errore } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  opzionale,
  scelta,
  soloDaFuori,
  testo,
  type SchemaOpzionale,
} from '../../schemas.js'
import { testi } from './common.testi.js'

// ------------------------------------------------------------------ il periodo

/**
 * `dal` e `al` per una lettura che guarda nel tempo. Sempre opzionali: senza,
 * si intende l'anno in uso, e nessuno deve inventare date per avere «tutto».
 * `cosa` è quel che il periodo filtra, detto nella lingua dell'aiuto.
 */
export function periodo (cosa: TestoPigro = () => testi().leOre): {
  dal: ReturnType<typeof opzionale<ReturnType<typeof iso>>>
  al: ReturnType<typeof opzionale<ReturnType<typeof iso>>>
} {
  // Il formato non sta nell'aiuto: `pattern` diventa `format: 'date'`, che la
  // griglia del modello rispetta da sé.
  return {
    dal: opzionale(iso({ aiuto: () => testi().periodoDal(detto(cosa)) })),
    al: opzionale(iso({ aiuto: () => testi().periodoAl(detto(cosa)) })),
  }
}

/**
 * Il periodo su cui si risponderà: quello chiesto, o l'anno. Torna sempre due
 * date piene, che chi chiama rimanda nella busta.
 *
 * Con `classe`, l'anno è quello della classe (con più anni aperti non coincide
 * con l'anno in uso). Il periodo si risolve solo qui, così la busta rimanda
 * per costruzione quel che il filtro ha usato.
 *
 * Prima i semestri, poi gli estremi dell'anno: in un registro valido
 * coincidono (`validation.ts`), altrimenti i semestri sono il calendario vero.
 */
export function risolviPeriodo (
  registro: Registro,
  // Un `null` vale come campo assente, qui e negli altri filtri del file.
  chiesto: { dal?: string | null, al?: string | null },
  classe?: Classe | null,
): { dal: string, al: string } {
  const anno = classe
    ? annoDellaClasse(registro, classe)
    : registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? null
  const estremi = estremiAnno(anno)
  return {
    dal: chiesto.dal ?? estremi?.inizio ?? '0000-01-01',
    al: chiesto.al ?? estremi?.fine ?? '9999-12-31',
  }
}


// --------------------------------------------------------- i periodi del conto

/**
 * Un semestre tagliato su quel che è stato chiesto. `dal` e `al` sono
 * l'intersezione fra semestre e intervallo: una quota su un denominatore più
 * largo del chiesto sarebbe più bassa del vero.
 */
export interface Periodo {
  semestreId: string
  numero: number
  etichetta: string
  dal: string
  al: string
}

/**
 * `semestreId` per una lettura che conta nel tempo. Senza, ogni periodo
 * dell'intervallo porta le sue cifre: è la forma normale, perché il semestre è
 * la scansione delle pagelle.
 */
export function periodoScelto (cosa: TestoPigro = () => testi().ilConto): {
  semestreId: SchemaOpzionale<string>
} {
  return {
    semestreId: opzionale(identificatore({ aiuto: () => testi().semestreSolo(detto(cosa)) })),
  }
}

/** Com'è fatta una voce di `periodi` nella busta: la si dichiara una volta. */
export const SCHEDA_PERIODO = {
  semestreId: testo({ aiuto: () => testi().schedaPeriodo.semestreId }),
  numero: numero({ intero: true, aiuto: () => testi().schedaPeriodo.numero }),
  etichetta: testo({ aiuto: () => testi().schedaPeriodo.etichetta }),
  dal: testo({ aiuto: () => testi().schedaPeriodo.dal }),
  al: testo({ aiuto: () => testi().schedaPeriodo.al }),
}

/**
 * I periodi su cui contare e gli estremi che ne escono: risolve l'intervallo
 * come `risolviPeriodo`, poi lo spezza sui semestri.
 *
 * - `semestreId` chiesto: un periodo solo; un id che non è di quell'anno
 *   solleva invece di dare una busta vuota.
 * - Anno senza semestri: un periodo solo, senza id, su tutto l'intervallo
 *   (sempre un array, una strada sola per chi legge).
 * - Caso normale: i semestri che toccano l'intervallo, tagliati sui loro
 *   estremi.
 *
 * `dal` e `al` tornano come unione di quel che si è guardato, non come chiesto.
 */
export function periodiDa (
  registro: Registro,
  chiesto: { dal?: string | null, al?: string | null, semestreId?: string | null },
  classe?: Classe | null,
): { dal: string, al: string, periodi: Periodo[] } {
  const { dal, al } = risolviPeriodo(registro, chiesto, classe)
  const anno = classe ? annoDellaClasse(registro, classe) : annoInUso(registro)
  const semestri = anno?.semestri ?? []

  if (chiesto.semestreId) {
    const suo = semestri.find((s) => s.id === chiesto.semestreId)
    if (!suo) {
      throw errore.nonTrovato('semestre', testi().rimedioSemestri)
    }
    // Chiesto un semestre, i suoi estremi vincono su quelli dell'anno, ma non su un
    // `dal`/`al` scritto a mano, più stretto di proposito.
    const inizio = chiesto.dal ? maggiore(chiesto.dal, suo.inizio) : suo.inizio
    const fine = chiesto.al ? minore(chiesto.al, suo.fine) : suo.fine
    return {
      dal: inizio,
      al: fine,
      periodi: [{
        semestreId: suo.id,
        numero: suo.numero,
        etichetta: suo.etichetta,
        dal: inizio,
        al: fine,
      }],
    }
  }

  const dentro = semestri
    .filter((s) => s.inizio <= al && s.fine >= dal)
    .map((s) => ({
      semestreId: s.id,
      numero: s.numero,
      etichetta: s.etichetta,
      dal: maggiore(s.inizio, dal),
      al: minore(s.fine, al),
    }))
    .sort((uno, altro) => uno.dal.localeCompare(altro.dal))

  if (dentro.length === 0) {
    return {
      dal,
      al,
      periodi: [{
        semestreId: '',
        numero: 0,
        etichetta: anno?.etichetta ?? testi().tuttoIlPeriodo,
        dal,
        al,
      }],
    }
  }
  return { dal: dentro[0].dal, al: dentro[dentro.length - 1].al, periodi: dentro }
}

/** Il più tardo di due giorni. Stringhe ISO: l'ordine alfabetico è quello vero. */
function maggiore (uno: string, altro: string): string {
  return uno > altro ? uno : altro
}

/** Il più presto di due giorni. */
function minore (uno: string, altro: string): string {
  return uno < altro ? uno : altro
}

/**
 * Se un giorno cade nel periodo, estremi compresi. È quella del dominio,
 * riesportata accanto al periodo.
 */
export { nelPeriodo } from '../../../domain/dates.js'

// ----------------------------------------------------------------- la ricerca

/**
 * `cerca` per una lettura con del testo dentro. L'esempio dice su che cosa si
 * cerca (argomento, cognome, obiettivo). `dove` si traduce; `esempio` è un
 * dato e non si traduce.
 */
export function ricerca (dove: TestoPigro, esempio: string): {
  cerca: ReturnType<typeof opzionale<ReturnType<typeof testo>>>
} {
  return {
    cerca: opzionale(testo({ aiuto: () => testi().ricerca(detto(dove)), esempio })),
  }
}

/**
 * Un filtro pronto: `corrisponde(paglia)` è vero quando la riga passa. Usa
 * `pezziDiRicerca` e `corrispondeAlla`, come la pagina: maiuscole, accenti e
 * apostrofi non contano, e ogni pezzo deve trovarsi. Senza `cerca` è sempre
 * vero.
 */
export function filtroTesto (cerca: string | null | undefined): {
  pezzi: string[]
  corrisponde: (paglia: string) => boolean
  ignorato: boolean
} {
  const pezzi = pezziDiRicerca(cerca ?? '')
  return {
    pezzi,
    corrisponde: (paglia: string) => pezzi.length === 0 || corrispondeAlla(paglia, pezzi),
    // Il filtro che si spegne da solo: `normalizzaTesto` tiene solo lettere e
    // cifre, e «@» o «…» danno zero pezzi, cioè «passano tutti». Chi chiama rimanda
    // questo booleano accanto a `cerca`, o la busta sembrerebbe filtrata.
    ignorato: (cerca ?? '').trim() !== '' && pezzi.length === 0,
  }
}

/**
 * I due campi d'uscita della ricerca: quel che si è cercato e se è servito.
 */
export const CAMPI_CERCA = {
  cerca: testo({ aiuto: () => testi().cerca }),
  cercaIgnorato: booleano({ aiuto: () => testi().cercaIgnorato }),
}

// ------------------------------------------------------- quel che resta fuori

/**
 * Quanti ne ha lasciati fuori un interruttore, o `null` se non c'è niente da
 * dire: con l'interruttore acceso uno zero manderebbe a riaccenderlo, e il
 * pannello scriverebbe una riga inutile.
 */
export function fuori (quanti: number, acceso: boolean): number | null {
  return acceso || quanti === 0 ? null : quanti
}

/**
 * `esclusiRitirati` e `esclusiArchiviate`, per l'uscita di una lettura che
 * applica quei filtri di suo. Su questi scatta la regola del modello: elenco
 * vuoto ed esclusi > 0 → richiama con `ritirati` e `archiviate` a vero.
 *
 * Piatti e non in un oggetto: la presentazione legge solo chiavi di primo
 * livello.
 */
export const CAMPI_ESCLUSI = {
  esclusiRitirati: nullabile(numero({ intero: true, aiuto: () => testi().esclusiRitirati })),
  esclusiArchiviate: nullabile(numero({ intero: true, aiuto: () => testi().esclusiArchiviate })),
}

// ------------------------------------------------------------------ le persone

/**
 * Le classi in cui guarda una lettura sulle persone: una, o tutte quelle
 * dell'anno, e con un corso solo la sua. Le archiviate restano fuori se non le
 * si chiede, e si contano prima di toglierle (`archiviateFuori`).
 *
 * `nominato` (deroga di `persone.medie`): chi nomina una classe o una persona
 * la vede anche archiviata.
 */
export function classiGuardate (
  r: Registro,
  ingresso: { classeId?: string, archiviate?: boolean },
  corso: Corso | null | undefined,
  nominato = false,
): { classi: Classe[], archiviateFuori: Classe[] } {
  const candidate = r.classi
    .filter((classe) => !ingresso.classeId || classe.id === ingresso.classeId)
    .filter((classe) => !corso || classe.id === corso.classeId)
  return {
    archiviateFuori: candidate.filter(
      (classe) => classe.archiviata && ingresso.archiviate !== true && !nominato,
    ),
    classi: candidate.filter(
      (classe) => ingresso.archiviate === true || nominato || !classe.archiviata,
    ),
  }
}

/**
 * Conta le persone che l'ingresso nomina, prima dei filtri accesi di suo:
 * `conta(classi, passa)` somma classe per classe. Serve a `CAMPI_ESCLUSI`.
 */
export function contaNominate (
  allievoId: string | undefined,
): (dove: Classe[], passa: (allievo: Allievo) => boolean) => number {
  const nominate = (classe: Classe): Allievo[] =>
    classe.allievi.filter((allievo) => !allievoId || allievo.id === allievoId)
  return (dove, passa) =>
    dove.reduce((quante, classe) => quante + nominate(classe).filter(passa).length, 0)
}

/**
 * I campi con cui ogni elenco di persone dice chi è e dove sta, fra l'id e
 * `attivo` — nell'uscita e nella riga, nello stesso ordine: vedi `rigaPersona`.
 */
export const CAMPI_RIGA_PERSONA = {
  cognome: testo(),
  nome: testo(),
  nomeCompleto: testo(),
  classeId: testo(),
  classe: testo(),
}

/** I valori di `CAMPI_RIGA_PERSONA` per una persona della sua classe. */
export function rigaPersona (classe: Classe, allievo: Allievo): {
  cognome: string
  nome: string
  nomeCompleto: string
  classeId: string
  classe: string
} {
  return {
    cognome: allievo.cognome,
    nome: allievo.nome,
    nomeCompleto: nomeCompleto(allievo),
    classeId: classe.id,
    classe: classe.nome,
  }
}

// ------------------------------------------------------------------ la pagina

/** Quante righe tornano quando non lo si dice. */
const QUANTE = 50

/** Il tetto: oltre, una busta è un file, non una risposta. */
const QUANTE_MASSIME = 500

/**
 * `da` e `quanti` per una lettura che elenca. Un salto e non un cursore: le
 * letture ordinano in modo stabile, e un anno scolastico non cambia mentre lo
 * si sfoglia.
 */
export function pagina (): {
  da: ReturnType<typeof opzionale<ReturnType<typeof numero>>>
  quanti: ReturnType<typeof opzionale<ReturnType<typeof numero>>>
} {
  // `soloDaFuori`: la pagina resta nel contratto ma non va nel catalogo del
  // modello (costa contesto). Al modello basta la prima pagina, e i conti
  // d'insieme non vengono tagliati.
  return {
    da: soloDaFuori(opzionale(numero({
      intero: true,
      minimo: 0,
      aiuto: () => testi().paginaDa,
    }))),
    quanti: soloDaFuori(opzionale(numero({
      intero: true,
      minimo: 1,
      massimo: QUANTE_MASSIME,
      aiuto: () => testi().paginaQuanti(QUANTE_MASSIME, QUANTE),
    }))),
  }
}

/** I campi che una busta paginata riporta accanto alle righe. */
export const CAMPI_PAGINA = {
  quante: numero({ intero: true, aiuto: () => testi().quante }),
  da: numero({ intero: true, aiuto: () => testi().da }),
  troncato: booleano({ aiuto: () => testi().troncato }),
  ancora: numero({ intero: true, aiuto: () => testi().ancora }),
}

/**
 * Taglia un elenco come la pagina chiede e dice come chiedere la prossima:
 * `quante` (totale filtrato), `da`, `ancora`, `troncato`. `ancora > 0` e
 * `troncato` sono ridondanti apposta: rispondono a due domande diverse.
 */
export function taglia<T> (
  righe: readonly T[],
  chiesto: { da?: number | null, quanti?: number | null },
): { pagina: T[], quante: number, da: number, troncato: boolean, ancora: number } {
  const da = Math.max(0, Math.trunc(chiesto.da ?? 0))
  const quanti = limita(Math.trunc(chiesto.quanti ?? QUANTE), 1, QUANTE_MASSIME)
  const pagina = righe.slice(da, da + quanti)
  // Mai negative: con `da` oltre la fine, pagina vuota e zero.
  const ancora = Math.max(0, righe.length - (da + pagina.length))
  return { pagina, quante: righe.length, da, troncato: ancora > 0, ancora }
}

// ------------------------------------------------- la presenza di un valore

/**
 * `ha` e `senza` per una lettura con campi che possono essere vuoti: «chi non
 * ha l'indirizzo», «quali ore non dicono che cosa si è fatto».
 *
 * Due campi che si compongono («ha l'e-mail del tutore ma non la propria»).
 * Che cosa conta come pieno lo dice `pieno`, una volta sola.
 */
export function presenzaDi<const C extends readonly string[]> (
  campi: C,
  cosa: TestoPigro,
): {
  ha: SchemaOpzionale<Array<C[number]>>
  senza: SchemaOpzionale<Array<C[number]>>
} {
  return {
    ha: opzionale(elenco(scelta(campi), {
      minimo: 1,
      aiuto: () => testi().conCampiPieni(detto(cosa)),
    })),
    senza: opzionale(elenco(scelta(campi), {
      minimo: 1,
      aiuto: () => testi().conCampiVuoti(detto(cosa)),
    })),
  }
}

/**
 * Se un valore conta come pieno: stringa di soli spazi ed elenco vuoto sono
 * vuoti, uno zero no.
 */
export function pieno (valore: unknown): boolean {
  if (valore === null || valore === undefined) return false
  if (typeof valore === 'string') return valore.trim() !== ''
  if (Array.isArray(valore)) return valore.length > 0
  // Un booleano spento è vuoto: per i campi-condizione («appello fatto») il no è
  // la ragione per cui si cerca.
  if (typeof valore === 'boolean') return valore
  // Uno zero è un fatto («zero assenze»), non un vuoto.
  return true
}

/**
 * Se una riga passa i due filtri. `valori` è la riga per campo
 * (`{ email: 'a@b.ch', telefoni: [] }`). Tutti i campi di `ha` pieni e tutti
 * quelli di `senza` vuoti, come la ricerca a pezzi. Un campo che la riga non
 * conosce conta come vuoto.
 */
export function passaPresenza (
  valori: Record<string, unknown>,
  ha: readonly string[] | null | undefined,
  senza: readonly string[] | null | undefined,
): boolean {
  if (ha && !ha.every((campo) => pieno(valori[campo]))) return false
  if (senza && !senza.every((campo) => !pieno(valori[campo]))) return false
  return true
}

// --------------------------------------------------------------- le soglie

/**
 * Un estremo numerico con l'aiuto scritto come negli altri. Una procedura
 * dichiara i suoi due campi per nome (chiavi composte a macchina il
 * compilatore non le vede); il significato condiviso sta in `fraSoglie`.
 */
export function estremo (aiuto: TestoPigro, opzioni: { minimo?: number, massimo?: number } = {}) {
  return opzionale(numero({ ...opzioni, aiuto }))
}

/**
 * Se un valore sta fra i due estremi, compresi («almeno quattro» comprende il
 * quattro). Un `null` (nessun voto) non passa nessuna soglia: per quelle righe
 * c'è `senza`.
 */
export function fraSoglie (
  valore: number | null | undefined,
  almeno: number | undefined,
  alPiu: number | undefined,
): boolean {
  if (almeno === undefined && alPiu === undefined) return true
  if (valore === null || valore === undefined) return false
  if (almeno !== undefined && valore < almeno) return false
  if (alPiu !== undefined && valore > alPiu) return false
  return true
}

// ------------------------------------------------------------------ la zona

/**
 * `comune` e `cap` per una lettura con degli indirizzi. Il comune si confronta
 * come un nome (senza accenti e maiuscole); il NAP per prefisso («69» è il
 * Luganese).
 */
export function zona (): {
  comune: SchemaOpzionale<string>
  cap: SchemaOpzionale<string>
} {
  return {
    // testo-fisso: l'esempio è un nome di comune, un dato che non si traduce
    comune: opzionale(testo({ aiuto: () => testi().comune, esempio: 'Lugano' })),
    cap: opzionale(testo({ aiuto: () => testi().cap, esempio: '6900' })),
  }
}

/**
 * Se un indirizzo è nella zona chiesta: comune normalizzato e intero
 * («Lugano» non prende «Luganello»), NAP per prefisso.
 */
export function nellaZona (
  indirizzo: { cap?: string, localita?: string } | null | undefined,
  chiesto: { comune?: string | null, cap?: string | null },
): boolean {
  if (!chiesto.comune && !chiesto.cap) return true
  if (!indirizzo) return false
  if (chiesto.comune) {
    if (normalizzaTesto(indirizzo.localita ?? '') !== normalizzaTesto(chiesto.comune)) return false
  }
  if (chiesto.cap) {
    const suo = (indirizzo.cap ?? '').replace(/\s+/g, '')
    if (!suo.toLowerCase().startsWith(chiesto.cap.replace(/\s+/g, '').toLowerCase())) return false
  }
  return true
}
