// La mappa delle persone in formazione: dove abitano, dove lavorano, dov'è la
// scuola — e chi sta dove sta già qualcun altro.
//
// È un file di dominio e quindi non sa niente né della rete né del DOM: qui
// stanno la geometria — la proiezione con cui un paio di coordinate diventa un
// punto sullo schermo, e l'inquadratura che fa stare tutti i punti dentro il
// riquadro — e la lettura dell'anagrafica, cioè quali indirizzi ci sono, quali
// sono già collocati e quali sono lo stesso indirizzo. Chi va a chiedere le
// coordinate alla rete è `src/data/geocoding.ts`, chi disegna è
// `src/ui/views/map.ts`.
//
// **Il perno è l'indirizzo, non la persona.** Le coordinate stanno in una
// raccolta a sé — `Registro.coordinate`, con la chiave sull'indirizzo — e non
// dentro l'allievo. Da questa scelta vengono tre cose che con il punto
// nell'anagrafica non si potevano avere: la domanda al geocodificatore si fa
// una volta per indirizzo e non una per persona (sei persone nella stessa
// azienda erano sei domande, e sei risposte leggermente diverse per lo stesso
// portone); un indirizzo corretto in una scheda vale subito per tutte le altre;
// e soprattutto si vede *chi condivide un indirizzo con chi* — fratelli sotto
// lo stesso tetto, compagni nella stessa ditta — che è il fatto per cui una
// mappa di classe si guarda davvero.
//
// La proiezione è quella di ogni mappa a tasselli — Web Mercator, EPSG:3857 — e
// non è una scelta estetica: i tasselli che il registro scarica sono disegnati
// in quella, e proiettare i punti in un altro modo vorrebbe dire segnaposti
// spostati rispetto alle strade che si vedono sotto.

import { nomeCompleto, ordinaAllievi } from './calculations.js'
import type { Allievo, Classe, Coordinata, Registro } from './models.js'
import { CASELLE_POSTALI, sembraToponimo } from './addresses.js'
import { scriviIndirizzo } from './addresses.js'
import { limita } from './calculations.js'

/** Un paio di coordinate in gradi: quel che una mappa sa di un posto. */
export interface Coordinate {
  lat: number
  lon: number
}

/**
 * La sede della scuola: il punto fisso rispetto a cui si leggono tutti gli
 * altri.
 *
 * Sta scritta qui e non fra le impostazioni perché è la sede di questo
 * registro, come il lessico è il suo lessico: un dato che non cambia mai, e
 * un'impostazione che non si cambia mai è una casella in più da capire. Le
 * coordinate sono quelle del campus di Trevano e non del centro di Canobbio —
 * due chilometri di differenza, che su una mappa di gente che fa la spola sono
 * la differenza fra «a due passi» e «dall'altra parte del paese».
 */
export const SEDE = {
  nome: 'Centro professionale tecnico Trevano',
  indirizzo: 'Via Trevano, 6952 Canobbio',
  lat: 46.0298,
  lon: 8.9628,
} as const

/**
 * Di che cosa parla un punto sulla mappa.
 *
 * Tre generi, e un indirizzo può averne più d'uno insieme: la casa di qualcuno
 * è il posto di lavoro di qualcun altro più spesso di quanto si creda — un
 * artigiano con la bottega sotto casa, e in classe il figlio di un altro.
 */
type GenerePunto = 'domicilio' | 'lavoro' | 'sede'

/** Come si chiamano i tre generi: la legenda, e le spunte che li accendono. */
export const NOMI_GENERE: Record<GenerePunto, string> = {
  domicilio: 'Domicilio',
  lavoro: 'Posto di lavoro',
  sede: 'Sede scolastica',
}

/**
 * Un indirizzo ridotto alla sua forma confrontabile.
 *
 * È la chiave con cui un indirizzo ritrova le sue coordinate, ed è anche il
 * modo in cui due indirizzi risultano *lo stesso* indirizzo: uno spazio in più,
 * una maiuscola diversa e una virgola attaccata non sono un altro portone.
 * Senza questa riduzione, «Via Roma 3,6900 Lugano» e «Via Roma 3, 6900 Lugano»
 * sarebbero due domande al geocodificatore e due segnaposti sovrapposti.
 */
export function chiaveIndirizzo (indirizzo: string): string {
  return indirizzo
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .toLocaleLowerCase('it-CH')
}

/**
 * Un indirizzo spezzato nei pezzi con cui si cerca: via, civico, NAP, località.
 *
 * Serve perché un indirizzo scritto da un docente non è una riga pulita. Quel
 * che arriva davvero, nei registri veri, è roba come «Studio d'ingegneria, Via
 * Campagna 2.1, CP 570, 6512 Giubiasco»: il nome dello studio davanti, una
 * casella postale in mezzo, e in fondo il NAP con il paese. Mandata così a
 * Nominatim quella riga non trova niente — nessun portone si chiama «Studio
 * d'ingegneria» — e l'indirizzo resta fuori dalla mappa senza che si capisca
 * perché. Spezzata nei suoi pezzi, invece, trova.
 *
 * Due cose si buttano via, e nessuna delle due è un dato dell'indirizzo:
 *
 *   La **casella postale** — `CP 934`, `C.P. 46`, `casella postale 95` — che è
 *   dove si riceve la posta, non dove si sta: un ufficio postale al posto di
 *   un'azienda sarebbe un segnaposto sbagliato, non un segnaposto in meno.
 *
 *   L'**intestazione**: i pezzi davanti che non sono una via — il nome dello
 *   studio, il nome di una persona, «succursale Lugano». Si riconoscono per
 *   esclusione: un pezzo che non comincia con una parola da toponimo e non
 *   contiene cifre non è un indirizzo, è un'etichetta.
 */
interface PezziIndirizzo {
  /** La via con il suo civico: «Via Campagna 2.1». */
  via: string
  /** Solo il civico, quando si riesce a isolarlo: «2.1», «60 F», «4A». */
  civico: string
  /** La via senza civico: è il ripiego quando il numero in mappa non c'è. */
  soloVia: string
  /** Il numero di avviamento postale, se c'è: quattro cifre in Svizzera. */
  nap: string
  /** Il paese o la città: «Giubiasco», «Roveredo GR». */
  citta: string
  /** Quel che si è buttato via: serve solo a dire perché, a chi guarda. */
  scartato: string[]
}

/** Il civico in coda alla via: «12», «4A», «2.1», «60 F». */
const CIVICO = /\s+(\d+(?:[./]\d+)?\s*[a-zA-Z]?)$/

/** Spezza un indirizzo nei pezzi con cui lo si cerca. Vedi `PezziIndirizzo`. */
export function scomponiIndirizzo (indirizzo: string): PezziIndirizzo {
  const scartato: string[] = []

  const senzaCasella = indirizzo.replace(CASELLE_POSTALI, (trovato) => {
    scartato.push(trovato.replace(/^,\s*/, '').trim())
    return ''
  })

  const pezzi = senzaCasella
    .split(',')
    .map((pezzo) => pezzo.trim())
    .filter((pezzo) => pezzo.length > 0)

  let nap = ''
  let citta = ''
  const coda = pezzi[pezzi.length - 1] ?? ''
  const conNap = /^(\d{4})\s+(.+)$/.exec(coda)
  if (conNap) {
    nap = conNap[1]
    citta = conNap[2].trim()
    pezzi.pop()
  } else if (pezzi.length > 1) {
    citta = coda
    pezzi.pop()
  }

  // Quel che resta davanti alla via: nomi di studi, di persone, «succursale X».
  while (pezzi.length > 1 && !sembraToponimo(pezzi[0])) scartato.push(pezzi.shift() as string)

  const via = pezzi[0] ?? ''
  const conCivico = CIVICO.exec(via)
  const civico = conCivico ? conCivico[1].replace(/\s+/g, ' ').trim() : ''
  const soloVia = conCivico ? via.slice(0, conCivico.index).trim() : via

  return { via, civico, soloVia, nap, citta, scartato }
}

/** La rubrica degli indirizzi collocati: la chiave è l'indirizzo. */
export type Rubrica = ReadonlyMap<string, Coordinata>

/** La rubrica di un registro, pronta da interrogare. */
export function rubricaDi (registro: Pick<Registro, 'coordinate'>): Rubrica {
  return new Map(registro.coordinate.map((voce) => [voce.chiave, voce]))
}

/** Dove cade un indirizzo, se qualcuno l'ha già cercato. */
export function coordinataDi (rubrica: Rubrica, indirizzo: string): Coordinata | undefined {
  const scritto = indirizzo.trim()
  return scritto ? rubrica.get(chiaveIndirizzo(scritto)) : undefined
}

/** L'indirizzo di casa o quello dell'azienda, come l'ha scritto il docente. */
export function indirizzoDi (allievo: Allievo, genere: 'domicilio' | 'lavoro'): string {
  // In una riga sola: la chiave delle coordinate, la domanda al
  // geocodificatore e il cartellino sulla mappa sono sempre stati questa
  // riga, e dividerla in caselle non doveva cambiarli.
  return scriviIndirizzo(genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore)
}

/** Se quell'indirizzo di quella persona ha già il suo punto. */
export function collocato (
  rubrica: Rubrica,
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): boolean {
  const indirizzo = indirizzoDi(allievo, genere)
  return Boolean(indirizzo) && rubrica.has(chiaveIndirizzo(indirizzo))
}

/** Chi usa un indirizzo, e a che titolo. */
export interface UsoIndirizzo {
  classeId: string
  classe: string
  allievoId: string
  chi: string
  genere: 'domicilio' | 'lavoro'
  /** Il nome dell'azienda, quando l'uso è il posto di lavoro. */
  azienda?: string
  /** Il colore della classe: quello con cui la si riconosce nel calendario. */
  colore?: string
}

/** Un indirizzo dell'anagrafica, con tutti quelli che lo usano. */
interface IndirizzoUsato {
  chiave: string
  /** L'indirizzo come lo ha scritto il docente la prima volta che compare. */
  indirizzo: string
  usi: UsoIndirizzo[]
  /** Le coordinate, se qualcuno le ha già cercate. */
  punto?: Coordinata
}

/**
 * Tutti gli indirizzi scritti nelle classi date, raccolti per indirizzo.
 *
 * È la lettura da cui discende tutto il resto: i segnaposti, la fila di quel
 * che manca, i collegamenti. Raccogliere per indirizzo invece che per persona è
 * quel che fa emergere le due cose che si vanno a cercare — la stessa casa e la
 * stessa ditta — senza doverle rincorrere confrontando stringhe in tre viste
 * diverse.
 *
 * Chi si è ritirato non c'è: la mappa risponde a «dove sta la mia classe», e
 * chi non la frequenta più sarebbe un segnaposto che nessuno sa spiegare.
 */
export function indirizziUsati (classi: readonly Classe[], rubrica: Rubrica): IndirizzoUsato[] {
  const perChiave = new Map<string, IndirizzoUsato>()

  for (const classe of classi) {
    for (const allievo of ordinaAllievi(classe.allievi)) {
      if (!allievo.attivo) continue
      for (const genere of ['domicilio', 'lavoro'] as const) {
        const indirizzo = indirizzoDi(allievo, genere)
        if (!indirizzo) continue
        const chiave = chiaveIndirizzo(indirizzo)
        const voce = perChiave.get(chiave) ?? {
          chiave,
          indirizzo,
          usi: [],
          punto: rubrica.get(chiave),
        }
        voce.usi.push({
          classeId: classe.id,
          classe: classe.nome,
          allievoId: allievo.id,
          chi: nomeCompleto(allievo),
          genere,
          azienda: genere === 'lavoro' ? allievo.azienda?.trim() || undefined : undefined,
          colore: classe.colore,
        })
        perChiave.set(chiave, voce)
      }
    }
  }

  return [...perChiave.values()]
}

/**
 * Gli indirizzi che aspettano le coordinate: quelli scritti e mai cercati.
 *
 * Uno per indirizzo e non uno per persona, ed è la ragione per cui la raccolta
 * sta fuori dall'anagrafica: una classe in cui dieci persone fanno il tirocinio
 * nella stessa ditta è una domanda sola, non dieci, e il giro dura dieci
 * secondi invece di due minuti.
 *
 * `rifaiTutto` li rimette tutti in fila: è il gesto di chi sospetta che una
 * risposta di prima sia caduta nel posto sbagliato — un «Via Roma» senza
 * località può finire in mezza Europa — e vuole riprovare da capo.
 */
export function indirizziDaRisolvere (
  classi: readonly Classe[],
  rubrica: Rubrica,
  opzioni: { rifaiTutto?: boolean } = {},
): IndirizzoUsato[] {
  return indirizziUsati(classi, rubrica).filter(
    (voce) => opzioni.rifaiTutto === true || !voce.punto,
  )
}

/** Quali generi di punto si vogliono vedere. */
export interface StratiMappa {
  domicili: boolean
  lavori: boolean
  sede: boolean
}

/**
 * Un punto da disegnare: un indirizzo, con tutti quelli che ci stanno.
 *
 * Un segnaposto per indirizzo e non per persona: due fratelli sono una casa
 * sola, e sei tirocinanti nella stessa officina sono un capannone solo. Prima
 * erano sei segnaposti nello stesso pixel — il sesto copriva gli altri cinque,
 * e la cosa che si voleva vedere, cioè che erano sei, era proprio quella che
 * non si vedeva.
 */
export interface SegnoMappa extends Coordinate {
  /** Stabile fra un ridisegno e l'altro: `ind:<chiave>`, o `sede`. */
  id: string
  chiave: string
  /** Il genere di chi ci sta: uno solo, o tutti e due se l'indirizzo è doppio. */
  generi: GenerePunto[]
  /** Il genere con cui si disegna: il lavoro vince sulla casa, la sede su tutto. */
  genere: GenerePunto
  /** Il nome grosso: la persona, l'azienda, la scuola — o quanti sono. */
  titolo: string
  /** La riga sotto: la classe, chi ci lavora, o che cosa hanno in comune. */
  sottotitolo?: string
  indirizzo: string
  /** Chi ci abita e chi ci lavora. Vuoto solo per la sede. */
  usi: UsoIndirizzo[]
  /**
   * Il colore della classe, e solo per i domicili.
   *
   * Il colore dice *di chi è* un punto, e questo ha senso per una casa: quella
   * è di una persona, e la persona è di una classe. Un'azienda no — è un posto
   * di lavoro, e spesso ci stanno persone di classi diverse: dipingerla del
   * colore di una delle tre direbbe una cosa falsa, e del colore «misto» non
   * direbbe niente. Le aziende restano neutre, e a distinguerle dalle case è la
   * figura dentro la punta.
   */
  colore?: string
  /** Quanto dista dalla sede, in chilometri in linea d'aria. */
  distanzaKm: number
  /** Come ha capito l'indirizzo il geocodificatore. */
  etichetta?: string
}

/**
 * I punti da disegnare, sede compresa.
 *
 * Gli strati spengono gli *usi*, non gli indirizzi: un indirizzo che è casa di
 * uno e ditta di un altro resta acceso finché almeno uno dei due generi si
 * vuole vedere, e il segnaposto racconta quel che resta.
 */
export function segniDellaMappa (
  classi: readonly Classe[],
  strati: StratiMappa,
  rubrica: Rubrica,
): SegnoMappa[] {
  const segni: SegnoMappa[] = []

  if (strati.sede) {
    segni.push({
      id: 'sede',
      chiave: chiaveIndirizzo(SEDE.indirizzo),
      generi: ['sede'],
      genere: 'sede',
      titolo: SEDE.nome,
      sottotitolo: 'Sede scolastica',
      indirizzo: SEDE.indirizzo,
      usi: [],
      lat: SEDE.lat,
      lon: SEDE.lon,
      distanzaKm: 0,
    })
  }

  for (const voce of indirizziUsati(classi, rubrica)) {
    if (!voce.punto) continue
    const usi = voce.usi.filter((uso) =>
      uso.genere === 'domicilio' ? strati.domicili : strati.lavori,
    )
    if (usi.length === 0) continue

    const generi = [...new Set(usi.map((uso) => uso.genere))] as GenerePunto[]
    const classiQui = new Set(usi.map((uso) => uso.classeId))
    const persone = new Set(usi.map((uso) => uso.allievoId))
    const aziende = [
      ...new Set(usi.filter((uso) => uso.azienda).map((uso) => uso.azienda as string)),
    ]

    segni.push({
      id: `ind:${voce.chiave}`,
      chiave: voce.chiave,
      generi,
      // Dove si lavora e si abita insieme comanda il lavoro: è il caso della
      // ditta con l'alloggio sopra, e sulla mappa si cerca la ditta.
      genere: generi.includes('lavoro') ? 'lavoro' : 'domicilio',
      titolo: titoloDelPunto(usi, aziende, persone.size),
      sottotitolo: sottotitoloDelPunto(usi, aziende, classiQui),
      indirizzo: voce.indirizzo,
      usi,
      // Il colore soltanto alle case di una classe sola: vedi `SegnoMappa.colore`.
      colore:
        generi.includes('lavoro') || classiQui.size !== 1 ? undefined : usi[0].colore,
      lat: voce.punto.lat,
      lon: voce.punto.lon,
      etichetta: voce.punto.etichetta,
      distanzaKm: distanzaKm(voce.punto, SEDE),
    })
  }

  return segni
}

function titoloDelPunto (usi: UsoIndirizzo[], aziende: string[], persone: number): string {
  if (aziende.length === 1) return aziende[0]
  if (aziende.length > 1) return `${aziende.length} aziende`
  if (persone === 1) return usi[0].chi
  return `${persone} persone`
}

function sottotitoloDelPunto (
  usi: UsoIndirizzo[],
  aziende: string[],
  classi: ReadonlySet<string>,
): string {
  const persone = new Set(usi.map((uso) => uso.allievoId)).size
  // Un'azienda dice chi ci lavora, una casa di chi è: sono le due domande che
  // si fanno guardando un segnaposto con più di un nome dentro.
  if (aziende.length > 0) {
    return persone === 1 ? usi[0].chi : `${persone} in tirocinio qui`
  }
  if (persone > 1) return `Stesso indirizzo · ${persone} persone`
  return usi[0].classe + (classi.size > 1 ? ' e altre' : '')
}

/**
 * I punti di una persona sola: casa, azienda, e la scuola.
 *
 * È quel che disegna la mappa piccola nella sua scheda, dove la domanda non è
 * «dov'è tutta la classe» ma «quanta strada fa questa persona»: i tre vertici
 * del suo triangolo, e le righe che li uniscono. La sede c'è sempre, anche
 * quando gli altri due mancano — una mappa con dentro solo la scuola dice
 * almeno rispetto a che cosa mancano.
 *
 * I punti restano quelli della raccolta condivisa, con dentro tutti quelli che
 * ci stanno: se il compagno di classe lavora nella stessa ditta, il cartellino
 * lo dice anche qui.
 */
export function segniDiAllievo (
  classe: Classe,
  allievo: Allievo,
  rubrica: Rubrica,
  classi: readonly Classe[] = [classe],
): SegnoMappa[] {
  const suoi = new Set<string>()
  for (const genere of ['domicilio', 'lavoro'] as const) {
    const indirizzo = indirizzoDi(allievo, genere)
    if (indirizzo) suoi.add(chiaveIndirizzo(indirizzo))
  }

  return segniDellaMappa(classi, { domicili: true, lavori: true, sede: true }, rubrica).filter(
    (segno) => segno.genere === 'sede' || suoi.has(segno.chiave),
  )
}

/**
 * Gli indirizzi che più di una persona ha in comune.
 *
 * È la domanda a cui la mappa da sola non risponde: due segnaposti nello stesso
 * punto si vedono come uno, e chi guarda non sa se è una casa di fratelli o sei
 * tirocinanti nella stessa ditta. Qui sono scritti per nome — ed è anche il
 * modo in cui si scopre un indirizzo copiato male: due persone che lavorano
 * «nella stessa azienda» ma in anagrafica hanno due vie diverse non compaiono,
 * e la mancanza si nota.
 */
interface Condivisione {
  chiave: string
  indirizzo: string
  /** Che cosa hanno in comune: la casa, la ditta, o un indirizzo che è tutti e due. */
  tipo: 'domicilio' | 'lavoro' | 'misto'
  /** L'azienda, quando è quella a essere in comune. */
  azienda?: string
  usi: UsoIndirizzo[]
  punto?: Coordinata
}

export function condivisioni (classi: readonly Classe[], rubrica: Rubrica): Condivisione[] {
  const gruppi: Condivisione[] = []

  for (const voce of indirizziUsati(classi, rubrica)) {
    const persone = new Set(voce.usi.map((uso) => uso.allievoId))
    // Una persona sola non condivide niente — nemmeno con sé stessa, quando
    // abita dove lavora: quello è un fatto suo, non un legame con altri.
    if (persone.size < 2) continue
    const generi = new Set(voce.usi.map((uso) => uso.genere))
    const aziende = [
      ...new Set(voce.usi.filter((uso) => uso.azienda).map((uso) => uso.azienda as string)),
    ]
    gruppi.push({
      chiave: voce.chiave,
      indirizzo: voce.indirizzo,
      tipo: generi.size > 1 ? 'misto' : ([...generi][0]),
      azienda: aziende.length === 1 ? aziende[0] : undefined,
      usi: voce.usi,
      punto: voce.punto,
    })
  }

  // Prima i gruppi più numerosi: è l'ordine in cui la cosa si guarda — la ditta
  // con sei tirocinanti prima della casa con due fratelli.
  return gruppi.sort(
    (a, b) =>
      new Set(b.usi.map((u) => u.allievoId)).size - new Set(a.usi.map((u) => u.allievoId)).size ||
      a.indirizzo.localeCompare(b.indirizzo, 'it'),
  )
}

/**
 * Il tragitto di una persona: da casa al posto di lavoro.
 *
 * Si disegna solo quando si vedono tutti e due i capi, perché una riga con un
 * capo fuori dagli strati accesi sembrerebbe puntare al nulla. Due persone che
 * abitano insieme e lavorano nello stesso posto fanno due righe sovrapposte, ed
 * è giusto: sono due tragitti, e i due capi dicono di chi sono.
 */
export interface Tragitto {
  /**
   * Stabile fra un ridisegno e l'altro, come quello dei segnaposti: è lui a
   * dire quale riga è sotto il mouse e quale è stata scelta, e senza un nome
   * proprio una riga non si distingue dalle altre dopo che il disegno è stato
   * rifatto.
   */
  id: string
  allievoId: string
  chi: string
  /** I due capi, per nome: i segnaposti da accendere insieme alla riga. */
  daId: string
  aId: string
  da: Coordinate
  a: Coordinate
  colore?: string
  km: number
}

export function tragitti (segni: readonly SegnoMappa[]): Tragitto[] {
  const case_ = new Map<string, SegnoMappa>()
  for (const segno of segni) {
    for (const uso of segno.usi) {
      if (uso.genere === 'domicilio') case_.set(uso.allievoId, segno)
    }
  }

  const righe: Tragitto[] = []
  for (const segno of segni) {
    for (const uso of segno.usi) {
      if (uso.genere !== 'lavoro') continue
      const casa = case_.get(uso.allievoId)
      if (!casa) continue
      righe.push({
        id: `via:${uso.allievoId}:${casa.id}>${segno.id}`,
        allievoId: uso.allievoId,
        chi: uso.chi,
        daId: casa.id,
        aId: segno.id,
        da: casa,
        a: segno,
        colore: uso.colore,
        km: distanzaKm(casa, segno),
      })
    }
  }
  return righe
}

/** Quanti indirizzi ci sono scritti, quanti collocati, e chi non ne ha nessuno. */
interface ContiMappa {
  scritti: number
  collocati: number
  /** Le persone senza nemmeno un indirizzo in anagrafica. */
  senzaIndirizzo: number
  /** Gli indirizzi che più di una persona ha in comune. */
  condivisi: number
}

export function contiDellaMappa (classi: readonly Classe[], rubrica: Rubrica): ContiMappa {
  const usati = indirizziUsati(classi, rubrica)
  const conIndirizzo = new Set<string>()
  for (const voce of usati) for (const uso of voce.usi) conIndirizzo.add(uso.allievoId)

  let attivi = 0
  for (const classe of classi) {
    for (const allievo of classe.allievi) if (allievo.attivo) attivi += 1
  }

  return {
    scritti: usati.length,
    collocati: usati.filter((voce) => voce.punto).length,
    senzaIndirizzo: attivi - conIndirizzo.size,
    condivisi: usati.filter((voce) => new Set(voce.usi.map((u) => u.allievoId)).size > 1).length,
  }
}

// ------------------------------------------------------------------ geometria

/** Il lato di un tassello, in pixel: 256 è la misura di ogni mappa a tasselli. */
const PIASTRELLA = 256

/** Fin dove si può ingrandire: oltre il 19 i tasselli non esistono. */
export const ZOOM_MASSIMO = 19
const ZOOM_MINIMO = 2

const RAGGIO_TERRA_KM = 6371

/** La latitudine oltre la quale Mercator non arriva: i poli stanno all'infinito. */
const LIMITE_LATITUDINE = 85.05112878

/**
 * Dove cade un punto nel piano dei tasselli, in pixel, a quello zoom.
 *
 * Il piano è quadrato e misura `256 · 2^zoom` pixel per lato: a zoom 0 il mondo
 * intero sta in un tassello, e ogni zoom in più raddoppia il lato. Tutto il
 * resto della mappa — quali tasselli chiedere, dove mettere i segnaposti, di
 * quanto spostare tutto quando si trascina — è una sottrazione su questi due
 * numeri.
 */
export function proietta (punto: Coordinate, zoom: number): { x: number; y: number } {
  const lato = PIASTRELLA * 2 ** zoom
  const lat = limita(punto.lat, -LIMITE_LATITUDINE, LIMITE_LATITUDINE)
  const seno = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((punto.lon + 180) / 360) * lato,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * lato,
  }
}

/** L'inverso di `proietta`: da pixel del piano a coordinate. */
export function riproietta (x: number, y: number, zoom: number): Coordinate {
  const lato = PIASTRELLA * 2 ** zoom
  const n = Math.PI - (2 * Math.PI * y) / lato
  return {
    lon: (x / lato) * 360 - 180,
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
  }
}

/** La distanza in linea d'aria, in chilometri: la formula dell'emisenoverso. */
export function distanzaKm (a: Coordinate, b: Coordinate): number {
  const rad = (gradi: number) => (gradi * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * RAGGIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Come si scrive una distanza: sotto il chilometro in metri, sopra con un decimale. */
export function scriviDistanza (km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}

/**
 * Come si scrive un paio di coordinate perché le si possa rileggere e ridigitare.
 *
 * Cinque decimali, che valgono circa un metro: la precisione che un indirizzo
 * civico può avere davvero. Il punto decimale e non la virgola, perché è la
 * forma con cui si incollano dentro una mappa qualunque — è quello che si fa
 * con una coordinata letta da una scheda.
 */
export function scriviCoordinate (punto: Coordinate): string {
  return `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`
}

/** Dove guarda la mappa: il punto al centro del riquadro, e quanto è ingrandita. */
export interface Inquadratura {
  centro: Coordinate
  zoom: number
}

/**
 * L'inquadratura che fa stare tutti i punti dentro un riquadro di quella misura.
 *
 * Si cerca lo zoom, non il contrario: il centro è il mezzo del rettangolo che
 * contiene i punti, e lo zoom è il più grande che li tiene ancora dentro,
 * margine compreso. Con un punto solo — o con punti tutti nello stesso posto —
 * non c'è niente da contenere e si sceglie una misura di quartiere: il massimo
 * ingrandimento su una casa sola non dice dove quella casa sia.
 */
export function inquadraturaPer (
  punti: readonly Coordinate[],
  larghezza: number,
  altezza: number,
  opzioni: { margine?: number; zoomMassimo?: number } = {},
): Inquadratura {
  const margine = opzioni.margine ?? 48
  const zoomMassimo = opzioni.zoomMassimo ?? 16

  if (punti.length === 0) return { centro: { lat: SEDE.lat, lon: SEDE.lon }, zoom: 12 }

  const latitudini = punti.map((p) => p.lat)
  const longitudini = punti.map((p) => p.lon)
  const centro = {
    lat: (Math.min(...latitudini) + Math.max(...latitudini)) / 2,
    lon: (Math.min(...longitudini) + Math.max(...longitudini)) / 2,
  }
  if (punti.length === 1) return { centro, zoom: 14 }

  const utileLarghezza = Math.max(1, larghezza - margine * 2)
  const utileAltezza = Math.max(1, altezza - margine * 2)

  let scelto = ZOOM_MINIMO
  for (let zoom = ZOOM_MINIMO; zoom <= zoomMassimo; zoom += 1) {
    const proiettati = punti.map((p) => proietta(p, zoom))
    const larga = Math.max(...proiettati.map((p) => p.x)) - Math.min(...proiettati.map((p) => p.x))
    const alta = Math.max(...proiettati.map((p) => p.y)) - Math.min(...proiettati.map((p) => p.y))
    if (larga > utileLarghezza || alta > utileAltezza) break
    scelto = zoom
  }
  return { centro, zoom: scelto }
}

/** Un tassello da scaricare, e dove va messo dentro il riquadro. */
interface Tassello {
  z: number
  x: number
  y: number
  /** L'angolo in alto a sinistra del tassello, in pixel dentro il riquadro. */
  sinistra: number
  sopra: number
}

/**
 * Quali tasselli servono per riempire un riquadro inquadrato così.
 *
 * Gli `x` fuori dall'intervallo si riportano dentro — il mondo si richiude su
 * sé stesso in longitudine, e trascinando verso est si torna al meridiano da
 * cui si era partiti — mentre gli `y` fuori non esistono: sopra il polo non c'è
 * niente da scaricare, e quei buchi restano del colore del fondo.
 */
export function tasselliVisibili (
  inquadratura: Inquadratura,
  larghezza: number,
  altezza: number,
): Tassello[] {
  const zoom = Math.round(inquadratura.zoom)
  const quanti = 2 ** zoom
  const centro = proietta(inquadratura.centro, zoom)
  // L'angolo in alto a sinistra del riquadro, in pixel del piano.
  const origineX = centro.x - larghezza / 2
  const origineY = centro.y - altezza / 2

  const primoX = Math.floor(origineX / PIASTRELLA)
  const primoY = Math.floor(origineY / PIASTRELLA)
  const ultimoX = Math.floor((origineX + larghezza) / PIASTRELLA)
  const ultimoY = Math.floor((origineY + altezza) / PIASTRELLA)

  const elenco: Tassello[] = []
  for (let y = primoY; y <= ultimoY; y += 1) {
    if (y < 0 || y >= quanti) continue
    for (let x = primoX; x <= ultimoX; x += 1) {
      elenco.push({
        z: zoom,
        x: ((x % quanti) + quanti) % quanti,
        y,
        sinistra: x * PIASTRELLA - origineX,
        sopra: y * PIASTRELLA - origineY,
      })
    }
  }
  return elenco
}

/** Dove cade un punto dentro il riquadro, in pixel dal suo angolo. */
export function posizioneNelRiquadro (
  punto: Coordinate,
  inquadratura: Inquadratura,
  larghezza: number,
  altezza: number,
): { x: number; y: number } {
  const zoom = Math.round(inquadratura.zoom)
  const centro = proietta(inquadratura.centro, zoom)
  const dove = proietta(punto, zoom)
  return {
    x: dove.x - centro.x + larghezza / 2,
    y: dove.y - centro.y + altezza / 2,
  }
}

/** Sposta l'inquadratura di tanti pixel: è il trascinamento, detto in coordinate. */
export function trascina (inquadratura: Inquadratura, dx: number, dy: number): Inquadratura {
  const zoom = Math.round(inquadratura.zoom)
  const centro = proietta(inquadratura.centro, zoom)
  return {
    zoom: inquadratura.zoom,
    centro: riproietta(centro.x - dx, centro.y - dy, zoom),
  }
}

/**
 * Ingrandisce o riduce tenendo fermo il punto sotto il puntatore.
 *
 * Senza questa correzione la rotellina ingrandisce sul centro del riquadro, e
 * chi punta un paese in un angolo se lo vede scappare via a ogni scatto.
 */
export function ingrandisci (
  inquadratura: Inquadratura,
  passo: number,
  fuoco: { x: number; y: number } | null,
  larghezza: number,
  altezza: number,
): Inquadratura {
  const prima = Math.round(inquadratura.zoom)
  const zoom = limita(prima + passo, ZOOM_MINIMO, ZOOM_MASSIMO)
  if (zoom === prima) return inquadratura
  if (!fuoco) return { centro: inquadratura.centro, zoom }

  // Il punto che sta sotto il puntatore adesso, e dove finirebbe dopo il
  // cambio: la differenza è di quanto va spostato il centro perché resti dov'è.
  const centro = proietta(inquadratura.centro, prima)
  const sotto = riproietta(
    centro.x - larghezza / 2 + fuoco.x,
    centro.y - altezza / 2 + fuoco.y,
    prima,
  )
  const dopo = proietta(sotto, zoom)
  return {
    zoom,
    centro: riproietta(dopo.x + (larghezza / 2 - fuoco.x), dopo.y + (altezza / 2 - fuoco.y), zoom),
  }
}

/** Quanti metri misura un pixel al centro dell'inquadratura: la scala. */
function metriPerPixel (inquadratura: Inquadratura): number {
  const zoom = Math.round(inquadratura.zoom)
  return (156543.03392 * Math.cos((inquadratura.centro.lat * Math.PI) / 180)) / 2 ** zoom
}

/**
 * La barra della scala: una misura tonda, e quanti pixel misura.
 *
 * Tonda perché una barra che dice «137 m» non si usa per stimare niente: si
 * cerca il numero più vicino fra 1, 2 e 5 per ogni potenza di dieci, che è come
 * sono fatte tutte le scale delle carte.
 */
export function barraScala (
  inquadratura: Inquadratura,
  massimoPixel = 120,
): { pixel: number; testo: string } {
  const metri = metriPerPixel(inquadratura) * massimoPixel
  const potenza = 10 ** Math.floor(Math.log10(Math.max(metri, 1)))
  const passo = [1, 2, 5, 10].map((m) => m * potenza).filter((m) => m <= metri).pop() ?? potenza
  return {
    pixel: Math.round(passo / metriPerPixel(inquadratura)),
    testo: passo >= 1000 ? `${passo / 1000} km` : `${passo} m`,
  }
}
