// Dove stanno i modelli dei rapporti, e come si leggono.
//
// Stanno in `templates/` dentro la cartella di lavoro — quella che contiene il
// documento dell'anno — e non dentro il programma: sono roba che il docente
// modifica, l'intestazione con il nome della scuola, l'ordine delle sezioni di
// un verbale, una colonna in più in una tabella. Metterli fra il codice
// avrebbe voluto dire ricompilare per cambiare una riga, e perderli a ogni
// aggiornamento.
//
// La copia di serie invece viaggia con il programma: è la `templates/` del
// repository, e `npm run templates` la traduce in `defaultTemplates.ts`. Le due
// cartelle si chiamano uguale e non sono la stessa cosa: quella è la copia che
// il registro porta con sé, questa è quella del docente — e comanda la sua.
//
// Se la cartella non c'è, la si scrive con i modelli di serie: un registro che
// non sa stampare finché qualcuno non gli copia dei file dentro sarebbe rotto
// appena installato. Da lì in poi comanda quel che c'è su disco, sempre — se
// qualcuno cancella una riga, il rapporto esce senza quella riga.

import * as apparato from 'apparato'

import {
  conBase,
  leggiBlocchi,
  leggiModello,
  leggiTesti,
  testiVuoti,
  type Blocchi,
  type Modello,
  type Testi,
} from '../domain/reports.js'
import {
  CATALOGO_MODELLI,
  fileDelModello,
  fileDiTesto,
  modelloDelFile,
  nomeFileAmmesso,
  sorteModello,
  titoloModello,
} from '../domain/templateCatalog.js'
import { MODELLI_PREDEFINITI } from './defaultTemplates.js'
import { impronta } from '../domain/text.js'
import type { VoceModello } from '../protocol.js'
import { esisteFile, radiceDiLavoro, vociDi } from './paths.js'

/**
 * Lo strato delle misure: formato del foglio, corpi, colonne delle tabelle.
 *
 * Sta sotto tutti, e non c'è bisogno di dichiararlo. È l'unico modello con
 * questo privilegio, e se lo guadagna per due motivi. Non dice niente su che
 * cosa un rapporto contiene — solo quanto è grande — quindi non può cambiare
 * un foglio a sorpresa. E chi aveva già un `_base.tpl` suo, modificato prima
 * che questo strato esistesse, altrimenti non lo vedrebbe mai: il registro non
 * riscrive i modelli che trova, ed è giusto così, ma vorrebbe dire che chi usa
 * il registro da più tempo è l'unico a non poter cambiare i corpi.
 */
const STILE = '_stile'

/**
 * Quanti modelli si possono incatenare con `estende`.
 *
 * Tre bastano — `_stile` sotto `_base` sotto il rapporto — e il limite serve a
 * un caso solo: due file che si estendono a vicenda, scritti a mano da
 * qualcuno. Senza, il registro girerebbe in tondo invece di stampare.
 */
const PROFONDITA_MASSIMA = 8

export const CARTELLA_MODELLI = 'templates'

export function cartellaModelli (): apparato.Uri | null {
  const radice = radiceDiLavoro()
  return radice ? apparato.Uri.joinPath(radice, CARTELLA_MODELLI) : null
}

/**
 * Il file in cui il registro si ricorda che cosa ha scritto lui.
 *
 * Non è un modello e non si modifica a mano: sta nella cartella perché è di
 * quella cartella che parla, e perché portandosi via `templates/` su un'altra
 * macchina si porta via anche la memoria di che cosa era stato toccato.
 */
const IMPRONTE = '_impronte.json'

/** Che cosa il registro ricorda di un modello: quel che ha scritto, e da che cosa. */
interface Impronta {
  /** L'impronta del testo che il registro ha scritto per ultimo. */
  scritto: string
  /** L'impronta della copia di serie di quel giorno: serve a dire «arretrato». */
  base: string
}

type Impronte = Record<string, Impronta>

async function leggiImpronte (cartella: apparato.Uri): Promise<Impronte> {
  try {
    const byte = await apparato.file.readFile(apparato.Uri.joinPath(cartella, IMPRONTE))
    const letto: unknown = JSON.parse(new TextDecoder().decode(byte))
    if (!letto || typeof letto !== 'object') return {}
    const esito: Impronte = {}
    for (const [nome, voce] of Object.entries(letto as Record<string, unknown>)) {
      if (!voce || typeof voce !== 'object') continue
      const { scritto, base } = voce as Partial<Impronta>
      if (typeof scritto === 'string' && typeof base === 'string') esito[nome] = { scritto, base }
    }
    return esito
  } catch {
    // Non c'è, o è illeggibile: è la prima volta, o qualcuno ci ha messo le
    // mani. Senza memoria non si aggiorna niente da soli, che è il modo
    // prudente di sbagliare.
    return {}
  }
}

async function scriviImpronte (cartella: apparato.Uri, impronte: Impronte): Promise<void> {
  try {
    await apparato.file.writeFile(
      apparato.Uri.joinPath(cartella, IMPRONTE),
      new TextEncoder().encode(`${JSON.stringify(impronte, null, 2)}
`),
    )
  } catch {
    // Cartella in sola lettura: si continua senza memoria, e la prossima volta
    // i modelli si lasciano com'erano invece di aggiornarsi.
  }
}

/** Quel che il registro ricorda di aver scritto, per l'inventario. */
let ricordate: Impronte = {}

/**
 * Le cartelle su cui il giro di controllo è già stato fatto, in questa
 * sessione.
 *
 * Era un interruttore solo, e il conto non tornava: `cartellaModelli()` è per
 * documento, l'interruttore era per processo. Aprendo un secondo anno il giro
 * si saltava, e i modelli di serie in quel `templates/` non ci arrivavano mai.
 */
const controllate = new Set<string>()

/**
 * Il testo di ogni modello gia' letto in questa sessione.
 *
 * `assicuraModelli` era memoizzata apposta, con il commento che spiega perche'
 * — «rileggere tredici modelli per ciascuno vorrebbe dire trecento letture» —
 * ma la memoizzazione si fermava li'. `sorgenteModello` no: e ogni rapporto la
 * chiama ~3 volte per risalire la catena `estende`, piu' una per `_testi` e una
 * per `_blocchi`. Un «Aggiorna tutto» su una classe fa ventinove PDF, cioe'
 * ~145 `readFile` e altrettanti parse degli stessi cinque file. Su una
 * `templates/` dentro una cartella sincronizzata il costo per lettura non e'
 * quello di un SSD.
 *
 * La svuota chi scrive — `scriviModello`, `ripristinaModello` — e chi cambia
 * cartella di lavoro. Chi tocca `templates/` da fuori passa per l'osservatore,
 * che ricarica l'inventario: `aggiornaInventarioModelli` la svuota con lui.
 */
const lette = new Map<string, string | null>()

/** Il testo di un modello smette di valere: l'ha appena riscritto qualcuno. */
function dimenticaLetti (): void {
  lette.clear()
}

/**
 * Scrive i modelli di serie che mancano, e aggiorna quelli che nessuno ha
 * toccato.
 *
 * Il file che il docente ha modificato non si riscrive mai: è il motivo per cui
 * i modelli stanno fuori dal codice. Ma il file che il registro aveva scritto
 * da sé e che da allora nessuno ha aperto è un'altra cosa — è la copia di
 * serie di una versione fa, e lasciarla lì vuol dire che una sezione nuova di
 * un verbale non arriva mai a chi il registro lo usa da più tempo. Quei due
 * casi si distinguono soltanto ricordando che cosa si è scritto: è `_impronte`.
 *
 * Chi aveva già la cartella prima che questa memoria esistesse non ha
 * impronte, e niente si muove: i suoi file restano intatti, e la pagina
 * Modelli dice quali sono arretrati.
 */
export async function assicuraModelli (): Promise<void> {
  const cartella = cartellaModelli()
  if (!cartella) return
  try {
    await apparato.file.createDirectory(cartella)
  } catch {
    return
  }
  // Una volta per sessione, non a ogni rapporto: questa funzione sta davanti a
  // ogni PDF che si compone, e un «Aggiorna tutto» ne compone venticinque —
  // rileggere tredici modelli per ciascuno vorrebbe dire trecento letture per
  // rispondere sempre la stessa cosa. Quel che cambia mentre si lavora passa
  // da `scriviModello`, che tiene aggiornata la memoria da sé.
  const chiave = cartella.toString()
  if (controllate.has(chiave)) return
  controllate.add(chiave)

  const impronte = await leggiImpronte(cartella)
  let cambiate = false

  for (const [nome, contenuto] of Object.entries(MODELLI_PREDEFINITI)) {
    const file = apparato.Uri.joinPath(cartella, nomeFileModello(nome))
    const suDisco = (await esisteFile(file)) ? await leggiTestoDi(file) : null
    const sorte = sorteModello({
      suDisco,
      diSerie: contenuto,
      scritto: impronte[nome]?.scritto,
      base: impronte[nome]?.base,
      impronta,
    })
    if (sorte !== 'manca' && sorte !== 'aggiorna' && sorte !== 'uguale') continue

    if (sorte === 'uguale') {
      // Identico alla copia di serie: si prende nota, così al prossimo
      // aggiornamento si sa che nessuno lo aveva toccato.
      const segno = impronta(contenuto)
      if (impronte[nome]?.scritto === segno && impronte[nome]?.base === segno) continue
      impronte[nome] = { scritto: segno, base: segno }
      cambiate = true
      continue
    }

    try {
      await apparato.file.writeFile(file, new TextEncoder().encode(contenuto))
      const segno = impronta(contenuto)
      impronte[nome] = { scritto: segno, base: segno }
      cambiate = true
    } catch {
      // Cartella in sola lettura: si legge quel che c'è, e se non c'è niente
      // si ripiega sul modello di serie tenuto in memoria.
    }
  }

  if (cambiate) await scriviImpronte(cartella, impronte)
  ricordate = impronte
}

/** Il testo di un file della cartella dei modelli, o `null` se non si legge. */
async function leggiTestoDi (file: apparato.Uri): Promise<string | null> {
  try {
    return new TextDecoder().decode(await apparato.file.readFile(file))
  } catch {
    return null
  }
}

/**
 * Segna che cosa il registro ha appena scritto, e su quale copia di serie era
 * basato: è quel che permette di dire «arretrato» invece di «modificato».
 */
async function ricordaScritto (nome: string, testo: string): Promise<void> {
  const cartella = cartellaModelli()
  if (!cartella) return
  const diSerie = sorgenteDiSerie(nome)
  if (diSerie === null) return
  const impronte = await leggiImpronte(cartella)
  impronte[nome] = { scritto: impronta(testo), base: impronta(diSerie) }
  await scriviImpronte(cartella, impronte)
  ricordate = impronte
}

/**
 * Come si chiama su disco un modello: `_base` è `_base.tpl`, `_firma.html` è
 * già il nome che ha.
 *
 * I modelli di rapporto si nominano senza estensione perché è così che si
 * richiamano fra loro — `estende: _base` — mentre gli altri file della cartella
 * se la portano dietro: la firma è HTML, e chiamarla `_firma` vorrebbe dire un
 * modello di rapporto che non esiste.
 */
function nomeFileModello (nome: string): string {
  return fileDelModello(nome)
}

/** Il file della firma, dentro `templates/`. */
const FIRMA = '_firma.html'

/**
 * La firma da mettere in fondo alle mail: quella su disco, o quella di serie.
 *
 * Sta in `templates/` con i modelli dei rapporti e non fra le impostazioni per
 * la stessa ragione per cui ci stanno le intestazioni dei fogli: è un pezzo di
 * testo che si scrive una volta, si corregge a mano quando cambia un numero di
 * telefono, e non ha niente a che vedere con come il registro funziona.
 *
 * Vuoto vuol dire nessuna firma: la mail parte com'è scritta.
 */
export async function firmaPosta (): Promise<string> {
  const cartella = cartellaModelli()
  if (cartella) {
    try {
      const byte = await apparato.file.readFile(apparato.Uri.joinPath(cartella, FIRMA))
      return new TextDecoder().decode(byte)
    } catch {
      // Non c'è, o non si legge: sotto c'è la copia di serie.
    }
  }
  return MODELLI_PREDEFINITI[FIRMA] ?? ''
}

/** Le immagini che un modello può chiedere: `templates/logo.png` e simili. */
const IMMAGINE_AMMESSA = /^[A-Za-z0-9_ -]+\.(png|jpe?g)$/i

/**
 * I byte di un'immagine di `templates/`, o niente se non c'è.
 *
 * Solo un nome di file, controllato di nuovo qui: il primo controllo sta nel
 * dominio, che legge il modello, ma questa è la funzione che apre davvero un
 * file e non deve fidarsi di chi la chiama. Le immagini stanno accanto ai
 * modelli perché sono la stessa cosa — il logo della sede è impaginazione, non
 * un documento della classe — e ci si arriva dalla stessa cartella che si apre
 * per cambiare la testata.
 */
export async function immagineModello (nome: string): Promise<Uint8Array | null> {
  if (!IMMAGINE_AMMESSA.test(nome)) return null
  const cartella = cartellaModelli()
  if (!cartella) return null
  try {
    return await apparato.file.readFile(apparato.Uri.joinPath(cartella, nome))
  } catch {
    // Non c'è: il rapporto esce senza. Un logo mancante non è un motivo per
    // non stampare il verbale.
    return null
  }
}

/**
 * Il testo di un modello: quello su disco, o quello di serie se non c'è.
 *
 * Il nome viene da una riga `estende:` di un file di testo che si modifica a
 * mano, e `joinPath` risolve i `..`: senza questo controllo un modello poteva
 * chiedere `../../../qualcosa` e finire dentro un rapporto. I modelli hanno
 * nomi di parole, non percorsi.
 */
async function sorgenteDi (nome: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]+$/.test(nome)) return null
  return sorgenteModello(nome)
}

/**
 * Il testo di un file della cartella: quello su disco, o quello di serie.
 *
 * Vale per i modelli e per la firma delle e-mail — sono la stessa cosa, un
 * file di testo che il docente modifica — e il nome passa dal controllo del
 * dominio prima di diventare un percorso: la pagina lo manda da dentro una
 * sandbox, e un `..` in mezzo non deve poter leggere un file qualunque.
 */
export async function sorgenteModello (nome: string): Promise<string | null> {
  const file = nomeFileModello(nome)
  if (!nomeFileAmmesso(file) || !fileDiTesto(file)) return null
  const cartella = cartellaModelli()
  const chiave = `${cartella?.toString() ?? ''}|${file}`
  const gia = lette.get(chiave)
  if (gia !== undefined) return gia
  const testo = await leggiSorgente(cartella, file, nome)
  lette.set(chiave, testo)
  return testo
}

async function leggiSorgente (
  cartella: apparato.Uri | null,
  file: string,
  nome: string,
): Promise<string | null> {
  if (cartella) {
    try {
      const byte = await apparato.file.readFile(apparato.Uri.joinPath(cartella, file))
      return new TextDecoder().decode(byte)
    } catch {
      // Non c'è, o non si legge: sotto c'è la copia di serie.
    }
  }
  return MODELLI_PREDEFINITI[nome] ?? null
}

/** Il testo di serie di un modello, per chi offre di tornare indietro. */
function sorgenteDiSerie (nome: string): string | null {
  return MODELLI_PREDEFINITI[nome] ?? null
}

/** Il nome del file con le frasi e i nomi delle colonne. */
const TESTI = '_testi'

/** Il nome del file con i pezzi di corpo riusabili. */
export const BLOCCHI = '_blocchi'

/**
 * Le parole comuni: `_testi.tpl`, o niente se non c'è.
 *
 * Niente e non un errore: un registro senza quel file stampa esattamente come
 * prima che il file esistesse, con le frasi che il codice porta di suo. È la
 * stessa regola dei modelli — comanda quel che c'è su disco, e quel che non
 * c'è non manca.
 */
export async function testi (): Promise<Testi> {
  const sorgente = await sorgenteDi(TESTI)
  return sorgente === null ? testiVuoti() : leggiTesti(sorgente)
}

/**
 * I pezzi di corpo riusabili: `_blocchi.tpl`, o niente se non c'è.
 *
 * Come le parole: quel che non c'è non manca. Un modello che chiama con `usa:`
 * un blocco che non esiste salta quella riga, e il resto del rapporto esce.
 */
export async function blocchi (): Promise<Blocchi> {
  const sorgente = await sorgenteDi(BLOCCHI)
  return sorgente === null ? {} : leggiBlocchi(sorgente)
}

/**
 * Il modello con quel nome, posato su tutti quelli che estende.
 *
 * La catena si segue fino in fondo e non per un livello solo: `_stile` sta
 * sotto `_base`, e `_base` sotto ogni rapporto. Prima ci si fermava al primo
 * gradino, e uno strato comune sotto la base non sarebbe mai arrivato in cima.
 *
 * Si risolve dal basso: si raccoglie la catena, poi si posa il più profondo e
 * ci si mette sopra gli altri uno per volta, così ogni gradino sovrascrive
 * quello sotto e il file che si è chiesto vince su tutti.
 *
 * Torna null solo se il modello non esiste né su disco né fra quelli di serie:
 * a quel punto è un nome sbagliato, non un file mancante, e chi ha chiesto il
 * rapporto deve saperlo.
 */
export async function modello (nome: string, bozza: string | null = null): Promise<Modello | null> {
  // La bozza è il testo che si sta scrivendo nella pagina e non è ancora
  // salvato: l'anteprima deve mostrare quello, non il file di ieri. Vale solo
  // per il modello chiesto — quelli che estende si leggono da disco, perché
  // sono quel che varrà davvero quando questo verrà salvato.
  const testo = bozza ?? (await sorgenteDi(nome))
  if (testo === null) return null

  const catena = [leggiModello(nome, testo)]
  const visti = new Set([nome])
  for (let passo = 0; passo < PROFONDITA_MASSIMA; passo += 1) {
    const sopra = catena[catena.length - 1]
    const padre = sopra.estende
    // Un modello che si estende da sé, o due che si rimandano a vicenda: si
    // smette qui e vale quel che si è già letto. Un rapporto un po' spoglio è
    // meglio di un rapporto che non esce.
    if (!padre || visti.has(padre)) break
    const testoPadre = await sorgenteDi(padre)
    if (testoPadre === null) break
    visti.add(padre)
    catena.push(leggiModello(padre, testoPadre))
  }

  // Lo strato delle misure va in fondo alla catena se nessuno l'ha nominato:
  // vedi la nota su `STILE`.
  if (!visti.has(STILE)) {
    const testoStile = await sorgenteDi(STILE)
    if (testoStile !== null) catena.push(leggiModello(STILE, testoStile))
  }

  let composto = catena[catena.length - 1]
  for (let i = catena.length - 2; i >= 0; i -= 1) composto = conBase(catena[i], composto)
  return composto
}

// ------------------------------------------------------- la cartella, dal di dentro
//
// Fino a ieri i modelli si gestivano aprendo `templates/` nel gestore di file:
// il registro sapeva leggerli e nient'altro. Funzionava, e aveva due prezzi che
// si pagavano ogni volta. Il primo è che bisognava sapere in anticipo quale dei
// tredici file toccare — i nomi non lo dicono, e `_stile.tpl` e
// `momento-valutazione.tpl` si somigliano abbastanza da sembrare la stessa
// cosa. Il secondo è che un refuso non si vedeva: il lettore salta quel che non
// capisce, e si scopriva il giorno dopo, guardando il PDF, che una tabella non
// c'era più.
//
// Da qui in giù c'è quel che serve a gestirli dentro il registro: l'inventario
// della cartella, la scrittura di un file, il ritorno al modello di serie. I
// controlli sui nomi stanno nel dominio e si rifanno qui: chi chiede è il
// webview, che vive in una sandbox, e un percorso che arriva da fuori non si
// scrive mai senza riguardarlo.

/** L'inventario di adesso: lo legge il pannello per spingerlo con lo stato. */
let inventario: VoceModello[] = []

/**
 * Che cosa c'è in `templates/`, come l'ha visto l'ultimo giro.
 *
 * Tenuto da parte e non riletto a ogni spinta di stato: lo stato si rispinge a
 * ogni casella dell'appello, e un giro di `readDirectory` su una cartella
 * sincronizzata a ogni voto salvato sarebbe lavoro pagato per niente. Lo
 * rinfresca chi tocca la cartella — e l'apertura di un documento, che è
 * l'altro momento in cui la cartella può essere cambiata sotto i piedi.
 */
export function inventarioModelli (): readonly VoceModello[] {
  return inventario
}

/**
 * Rilegge la cartella e aggiorna l'inventario.
 *
 * L'elenco è il catalogo più quel che c'è davvero: i modelli di serie
 * compaiono anche quando il file non è ancora stato scritto — il registro li
 * ha in memoria e stampa comunque — e i file che qualcuno ha aggiunto a mano
 * compaiono in fondo, perché la cartella è sua.
 */
export async function aggiornaInventarioModelli (): Promise<readonly VoceModello[]> {
  // Di qui passa ogni cambiamento della cartella — un salvataggio, un
  // ripristino, l'osservatore che vede una mano da fuori — ed e' quindi il
  // punto in cui i testi tenuti a mente smettono di valere.
  dimenticaLetti()
  const cartella = cartellaModelli()
  if (cartella) ricordate = await leggiImpronte(cartella)
  const voci = cartella ? await vociDi(cartella) : []
  const suDisco = new Map<string, number>()
  for (const [file, tipo] of voci) {
    if (tipo === apparato.GenereFile.Directory || !nomeFileAmmesso(file)) continue
    suDisco.set(file, 0)
  }
  // La misura di ognuno, uno `stat` per file: sono una dozzina, e serve a dire
  // in elenco quanto è grosso un modello senza aprirlo.
  if (cartella) {
    for (const file of [...suDisco.keys()]) {
      try {
        const informazioni = await apparato.file.stat(apparato.Uri.joinPath(cartella, file))
        suDisco.set(file, informazioni.size)
      } catch {
        // Sparito fra la lettura della cartella e adesso: non c'è.
        suDisco.delete(file)
      }
    }
  }

  const fatte: VoceModello[] = []
  const visti = new Set<string>()

  for (const voce of CATALOGO_MODELLI) {
    const file = fileDelModello(voce.nome)
    visti.add(file)
    const diSerie = MODELLI_PREDEFINITI[voce.nome] ?? null
    const testo = suDisco.has(file) ? await sorgenteModello(voce.nome) : null
    fatte.push({
      nome: voce.nome,
      file,
      titolo: voce.titolo,
      ruolo: voce.ruolo,
      aiuto: voce.aiuto,
      genere: voce.genere,
      misura: suDisco.get(file) ?? (diSerie === null ? 0 : new TextEncoder().encode(diSerie).length),
      suDisco: suDisco.has(file),
      haDiSerie: diSerie !== null,
      // «Modificato» è il confronto con la copia di serie e non una data: un
      // file riscritto uguale non è modificato, e il file che il registro
      // scrive da sé al primo rapporto non deve presentarsi come tale.
      modificato: testo !== null && diSerie !== null && testo !== diSerie,
      // Arretrato: modificato da qualcuno, e nel frattempo la copia di serie è
      // cambiata. È la sola cosa che il registro sa e il docente no — il suo
      // file non porta scritto da quale versione viene — ed è quel che serve
      // per decidere se vale la pena rimetterci le mani.
      arretrato:
        sorteModello({
          suDisco: testo,
          diSerie,
          scritto: ricordate[voce.nome]?.scritto,
          base: ricordate[voce.nome]?.base,
          impronta,
        }) === 'arretrato',
    })
  }

  for (const [file, misura] of suDisco) {
    if (visti.has(file)) continue
    const nome = modelloDelFile(file)
    const immagine = !fileDiTesto(file)
    fatte.push({
      nome,
      file,
      titolo: titoloModello(nome),
      ruolo: immagine ? 'immagine' : 'rapporto',
      aiuto: immagine
        ? 'Un’immagine della cartella: i modelli la mostrano con «immagine:»'
        : 'Un modello aggiunto a mano: vale per chi lo nomina con «estende:»',
      genere: null,
      misura,
      suDisco: true,
      haDiSerie: false,
      modificato: false,
      // Un file aggiunto a mano non ha una copia di serie: non può essere
      // indietro rispetto a niente.
      arretrato: false,
    })
  }

  inventario = fatte
  return inventario
}

/**
 * Scrive un modello, creando la cartella se non c'è.
 *
 * Non si controlla che quel che si salva sia giusto, ed è voluto: un modello a
 * metà è un lavoro in corso, non un errore, e un registro che rifiutasse di
 * salvare una riga incompleta obbligherebbe a tenere il file aperto altrove.
 * Quel che non tornerà lo dice la pagina mentre si scrive — `verificaModelli`,
 * nel dominio — e lo dice riga per riga, che serve più di un rifiuto.
 */
export async function scriviModello (
  nome: string,
  testo: string,
): Promise<{ errore: string } | null> {
  const file = nomeFileModello(nome)
  if (!nomeFileAmmesso(file) || !fileDiTesto(file)) {
    return { errore: `«${nome}» non è un nome di modello.` }
  }
  const cartella = cartellaModelli()
  if (!cartella) return { errore: 'Nessuna cartella di lavoro aperta.' }
  try {
    await apparato.file.createDirectory(cartella)
    await apparato.file.writeFile(
      apparato.Uri.joinPath(cartella, file),
      new TextEncoder().encode(testo),
    )
  } catch (errore) {
    return { errore: `Il modello non si è potuto scrivere: ${(errore as Error).message}` }
  }
  // Da adesso questo file è «suo», e si sa su quale copia di serie era basato:
  // il giorno in cui quella cambia, la pagina Modelli può dirlo invece di
  // lasciarlo arretrato in silenzio.
  await ricordaScritto(nome, testo)
  await aggiornaInventarioModelli()
  return null
}

/**
 * Rimette il modello di serie al posto di quello modificato.
 *
 * Si riscrive il file invece di cancellarlo: cancellandolo il registro
 * stamperebbe comunque con la copia che ha in memoria — il foglio sarebbe lo
 * stesso — ma chi apre la cartella da fuori troverebbe un buco dove c'era un
 * file, e non saprebbe più che cosa il registro sta usando.
 */
export async function ripristinaModello (nome: string): Promise<{ errore: string } | null> {
  const diSerie = sorgenteDiSerie(nome)
  if (diSerie === null) {
    return { errore: `«${nome}» non è un modello di serie: non c’è niente a cui tornare.` }
  }
  return scriviModello(nome, diSerie)
}

/** Le immagini che stanno in `templates/`: `logo.jpg` e simili. */
export function immaginiModelli (): string[] {
  return inventario.filter((voce) => voce.ruolo === 'immagine').map((voce) => voce.file)
}

/**
 * Porta un'immagine dentro `templates/`, con il nome che aveva.
 *
 * Serve al logo della sede, che è l'immagine che quasi tutti cambiano: prima
 * bisognava aprire la cartella, copiarci dentro il file e ricordarsi di
 * scriverne il nome in `_base.tpl`. Il nome si ripulisce qui — quella cartella
 * la legge anche il compositore dei PDF, e un file con dentro una barra non è
 * un nome di immagine.
 */
export async function importaImmagine (
  origine: apparato.Uri,
  nome: string,
): Promise<{ errore: string } | { file: string }> {
  const file = nome.split(/[\\/]/).pop() ?? ''
  if (!nomeFileAmmesso(file) || fileDiTesto(file)) {
    return { errore: `«${nome}» non va bene: servono un PNG o un JPEG, con un nome semplice.` }
  }
  const cartella = cartellaModelli()
  if (!cartella) return { errore: 'Nessuna cartella di lavoro aperta.' }
  try {
    await apparato.file.createDirectory(cartella)
    const byte = await apparato.file.readFile(origine)
    await apparato.file.writeFile(apparato.Uri.joinPath(cartella, file), byte)
  } catch (errore) {
    return { errore: `L’immagine non si è potuta copiare: ${(errore as Error).message}` }
  }
  await aggiornaInventarioModelli()
  return { file }
}
