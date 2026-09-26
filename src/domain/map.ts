// La mappa delle persone in formazione: dove abitano, dove lavorano, dov'è la
// scuola, e chi condivide un indirizzo.
//
// Qui geometria (proiezione e inquadratura) e lettura dell'anagrafica; la rete
// sta in `src/data/geocoding.ts`, il disegno in `src/ui/views/map.ts`.
//
// Il perno è l'indirizzo, non la persona: le coordinate stanno in
// `Registro.coordinate` con chiave sull'indirizzo. Così si geocodifica una
// volta per indirizzo, una correzione vale per tutti, e si vede chi condivide
// casa o ditta.
//
// Proiezione Web Mercator (EPSG:3857), quella dei tasselli scaricati: un'altra
// sposterebbe i segnaposti rispetto alle strade.

import { nomeCompleto, ordinaAllievi } from './calculations.js'
import type { Allievo, Classe, Coordinata, Registro } from './models.js'
import { CASELLE_POSTALI, sembraToponimo } from './addresses.js'
import { scriviIndirizzo } from './addresses.js'
import { limita } from './calculations.js'
import { testi } from './map.testi.js'

/** Un paio di coordinate in gradi: quel che una mappa sa di un posto. */
export interface Coordinate {
  lat: number
  lon: number
}

/**
 * La sede della scuola, il punto rispetto a cui si leggono gli altri. Fissa
 * nel codice come il lessico. Coordinate del campus di Trevano, non del centro
 * di Canobbio: due chilometri contano su questa mappa.
 */
export const SEDE = {
  // testo-fisso: nome proprio della scuola, uguale in ogni lingua
  nome: 'Centro professionale tecnico Trevano',
  // testo-fisso: indirizzo postale, ed è anche la chiave delle sue coordinate
  indirizzo: 'Via Trevano, 6952 Canobbio',
  lat: 46.0298,
  lon: 8.9628,
} as const

/**
 * Di che cosa parla un punto sulla mappa. Un indirizzo può avere più generi
 * insieme (la bottega sotto casa).
 */
type GenerePunto = 'domicilio' | 'lavoro' | 'sede'

/** Come si chiamano i tre generi (legenda, spunte), letti dal catalogo al momento. */
export const NOMI_GENERE: Readonly<Record<GenerePunto, string>> = {
  get domicilio () { return testi().domicilio },
  get lavoro () { return testi().lavoro },
  get sede () { return testi().sede },
}

/**
 * Un indirizzo ridotto alla forma confrontabile: la chiave delle coordinate e
 * il criterio per dire che due indirizzi sono lo stesso («Via Roma 3,6900
 * Lugano» e «Via Roma 3, 6900 Lugano»).
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
 * Una riga come «Studio d'ingegneria, Via Campagna 2.1, CP 570, 6512
 * Giubiasco» mandata intera a Nominatim non trova niente.
 *
 * Si buttano la casella postale (è dove si riceve la posta, non dove si sta) e
 * l'intestazione: i pezzi davanti che non cominciano con una parola da
 * toponimo e non contengono cifre.
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
  // In una riga sola: chiave delle coordinate, domanda al geocodificatore e
  // cartellino della mappa sono questa riga.
  return scriviIndirizzo(genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore)
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
 * Tutti gli indirizzi scritti nelle classi date, raccolti per indirizzo: la
 * lettura da cui discendono segnaposti, fila da geocodificare e collegamenti.
 * Chi si è ritirato non c'è.
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
 * Gli indirizzi che aspettano le coordinate: scritti e mai cercati, uno per
 * indirizzo. `rifaiTutto` li rimette tutti in fila, per chi sospetta risposte
 * finite nel posto sbagliato.
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
 * Un punto da disegnare: un indirizzo con tutti quelli che ci stanno. Un
 * segnaposto per indirizzo, così sei tirocinanti nella stessa officina si
 * vedono come sei.
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
   * Il colore della classe, solo per i domicili: una casa è di una persona e
   * quindi di una classe; un'azienda può ospitare classi diverse e resta
   * neutra (la distingue la figura nella punta).
   */
  colore?: string
  /** Quanto dista dalla sede, in chilometri in linea d'aria. */
  distanzaKm: number
  /** Come ha capito l'indirizzo il geocodificatore. */
  etichetta?: string
}

/**
 * I punti da disegnare, sede compresa. Gli strati spengono gli usi, non gli
 * indirizzi: un indirizzo resta acceso finché uno dei suoi generi è visibile.
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
      sottotitolo: testi().sede,
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
      // Casa e lavoro insieme: comanda il lavoro (la ditta con l'alloggio sopra).
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
  const t = testi()
  if (aziende.length === 1) return aziende[0]
  if (aziende.length > 1) return t.aziende(aziende.length)
  if (persone === 1) return usi[0].chi
  return t.persone(persone)
}

function sottotitoloDelPunto (
  usi: UsoIndirizzo[],
  aziende: string[],
  classi: ReadonlySet<string>,
): string {
  const t = testi()
  const persone = new Set(usi.map((uso) => uso.allievoId)).size
  // Un'azienda dice chi ci lavora, una casa di chi è.
  if (aziende.length > 0) {
    return persone === 1 ? usi[0].chi : t.inTirocinio(persone)
  }
  if (persone > 1) return t.stessoIndirizzo(persone)
  return classi.size > 1 ? t.eAltre(usi[0].classe) : usi[0].classe
}

/**
 * I punti di una persona sola (casa, azienda, scuola) per la mappa piccola
 * della sua scheda: quanta strada fa. La sede c'è sempre. I punti sono quelli
 * della raccolta condivisa, con tutti quelli che ci stanno.
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
 * Gli indirizzi che più persone hanno in comune, scritti per nome: la mappa
 * mostra un segnaposto solo. Aiuta anche a scovare indirizzi copiati male.
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
    // Una persona sola non condivide niente, nemmeno abitando dove lavora.
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

  // Prima i gruppi più numerosi.
  return gruppi.sort(
    (a, b) =>
      new Set(b.usi.map((u) => u.allievoId)).size - new Set(a.usi.map((u) => u.allievoId)).size ||
      a.indirizzo.localeCompare(b.indirizzo, 'it'),
  )
}

/**
 * Il tragitto di una persona, da casa al lavoro: solo con tutti e due i capi
 * visibili. Due persone con stessa casa e ditta fanno due righe sovrapposte.
 */
export interface Tragitto {
  /** Stabile fra un ridisegno e l'altro, per sapere quale riga è sotto il mouse o scelta. */
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
 * Dove cade un punto nel piano dei tasselli, in pixel, a quello zoom: il piano
 * misura `256 · 2^zoom` pixel per lato. Il resto della mappa è una sottrazione
 * su questi due numeri.
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
  if (km < 10) return testi().kmDecimale(km)
  return `${Math.round(km)} km` // testo-fisso: unità di misura, uguale in ogni lingua
}

/**
 * Un paio di coordinate da rileggere e incollare: cinque decimali (circa un
 * metro) e punto decimale, come le accetta ogni mappa.
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
 * L'inquadratura che fa stare tutti i punti in un riquadro: centro nel mezzo
 * del rettangolo, zoom più grande che li contiene col margine. Con un punto
 * solo si sceglie una misura di quartiere.
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
 * Quali tasselli servono per un riquadro. Gli `x` fuori intervallo si
 * riportano dentro (il mondo si richiude in longitudine); gli `y` fuori non
 * esistono e restano del colore del fondo.
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
 * Ingrandisce o riduce tenendo fermo il punto sotto il puntatore, invece del
 * centro del riquadro.
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

  // Dove sta il punto sotto il puntatore adesso e dove finirebbe: la differenza
  // è lo spostamento del centro.
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
 * La barra della scala: la misura tonda più vicina (1, 2 o 5 per potenza di
 * dieci) e quanti pixel misura.
 */
export function barraScala (
  inquadratura: Inquadratura,
): { pixel: number; testo: string } {
  const massimoPixel = 120
  const metri = metriPerPixel(inquadratura) * massimoPixel
  const potenza = 10 ** Math.floor(Math.log10(Math.max(metri, 1)))
  const passo = [1, 2, 5, 10].map((m) => m * potenza).filter((m) => m <= metri).pop() ?? potenza
  return {
    pixel: Math.round(passo / metriPerPixel(inquadratura)),
    // testo-fisso: unità di misura, uguale in ogni lingua
    testo: passo >= 1000 ? `${passo / 1000} km` : `${passo} m`,
  }
}
