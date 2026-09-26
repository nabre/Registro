// I traslochi dei registri su disco, fatti una volta all'apertura senza chiedere:
// JSON piatti nella radice → una cartella per anno → un `.regi` per anno, con le
// cartelle dei documenti dentro. Ogni cosa va a chi appartiene (classe, corso,
// valutazione, piano); quel che non si sa assegnare va nell'anno in uso, mai perso.

import * as apparato from 'apparato'

import { cartellaDellAnno, fetteDellAnno } from '../domain/years.js'
import { creaAnnoCorrente } from '../domain/factories.js'
import type { Registro } from '../domain/models.js'
import { VERSIONE_DATI } from '../domain/models.js'
import { nomeSicuro } from '../domain/text.js'
import { normalizzaRegistro } from '../domain/normalization.js'
import type { Archivio } from './archive.js'
import { type Deposito, deposito } from './store.js'
import { Pacchetto, STORICO } from './package.js'
import {
  DATI,
  cartellaAnno,
  NOMI,
  type NomeCollezione,
  cartellaAnnoIn,
  cartellaCollezioniIn,
  esisteFile,
  percorsoIn,
  percorsoPacchettoIn,
  sottocartelleDi,
  togliSeVuota,
  travasa,
  type OpzioniTravaso,
  vociDi,
} from './paths.js'

/** Le sottocartelle della disposizione piatta che vanno dentro un anno. */
const SOTTOCARTELLE = [
  'documentazione',
  'archivio',
  'esportazioni',
  'documenti',
  'allegati',
  'risorse',
  'assenze',
  'in-arrivo',
  'quarantena',
  '.storico',
]

/** Quel che si è spostato, per dirlo a chi apre il registro. */
interface EsitoMigrazione {
  anni: string[]
  /** L'anno che resta aperto: quello in cui si stava lavorando. */
  corrente: string
}

const COLLEZIONI = Object.keys(NOMI) as NomeCollezione[]

async function leggiJson (file: apparato.Uri): Promise<unknown> {
  try {
    const testo = new TextDecoder().decode(await apparato.file.readFile(file)).trim()
    return testo ? JSON.parse(testo) : null
  } catch {
    return null
  }
}

/**
 * Scrive un JSON passando da un temporaneo sincronizzato e poi rinominato, così
 * un'interruzione non lascia un file troncato. (Non `scriviJson`: quella è di
 * `environment/jsonStore.ts`.)
 */
async function scriviJsonUri (file: apparato.Uri, contenuto: unknown): Promise<void> {
  await apparato.file.createDirectory(apparato.Uri.joinPath(file, '..'))
  const temporaneo = file.with({ path: `${file.path}.tmp` })
  await apparato.file.writeFile(
    temporaneo,
    new TextEncoder().encode(`${JSON.stringify(contenuto, null, 2)}\n`),
    { sincronizza: true },
  )
  await apparato.file.rename(temporaneo, file, { overwrite: true })
}

/**
 * Vero se c'è la disposizione piatta: JSON delle collezioni nella radice, o un
 * `registro.json` con gli anni dentro. Un documento accanto non basta a dire di
 * no: la sincronizzazione può portare file da una macchina non aggiornata.
 */
async function daMigrare (radice: apparato.Uri): Promise<boolean> {
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    if (await esisteFile(apparato.Uri.joinPath(radice, NOMI[collezione]))) return true
  }
  const grezzo = await leggiJson(apparato.Uri.joinPath(radice, NOMI.registro))
  return Array.isArray((grezzo as { anni?: unknown })?.anni)
}

/** Una destinazione che non si crea salta il ramo; una cartella si toglie solo se vuota del tutto. */
const TRASLOCO: OpzioniTravaso = { saltaSeNonSiCrea: true, soloSeVuotaDelTutto: true }

/** Sposta una voce di cartella dentro un'altra, senza coprire quel che ci trova. */
async function sposta (da: apparato.Uri, a: apparato.Uri): Promise<boolean> {
  if (!(await esisteFile(da))) return false
  if (await esisteFile(a)) return travasa(da, a, TRASLOCO)
  try {
    await apparato.file.createDirectory(apparato.Uri.joinPath(a, '..'))
    await apparato.file.rename(da, a, { overwrite: false })
    return true
  } catch {
    return travasa(da, a, TRASLOCO)
  }
}

/**
 * Divide per anno le sottocartelle dei documenti: per nome di classe
 * (`documentazione/`, `archivio/`, `esportazioni/`), per id (`allegati/`,
 * `risorse/`); il resto va all'anno in uso.
 */
async function dividiCartelle (
  radice: apparato.Uri,
  registro: Registro,
  destinazioni: Map<string, string>,
  corrente: string,
): Promise<void> {
  const cartellaDi = new Map<string, string>()
  const annoDellaClasse = new Map(registro.classi.map((c) => [c.id, c.annoId]))
  const corsoDellaClasse = new Map(registro.corsi.map((c) => [c.id, c.classeId]))

  const dove = (annoId: string | undefined) =>
    (annoId && destinazioni.get(annoId)) || corrente

  // Gli ambiti che possono stare davanti alla classe: le materie e `docente-di-classe`.
  const ambiti = [...registro.materie.map((m) => nomeSicuro(m.nome)), 'docente-di-classe']

  for (const classe of registro.classi) {
    const nome = nomeSicuro(classe.nome)
    cartellaDi.set(`documentazione/${nome}`, dove(classe.annoId))
    for (const radice of ['archivio', 'esportazioni']) {
      // Classe davanti o materia davanti: si possono trovare tutte e due.
      cartellaDi.set(`${radice}/${nome}`, dove(classe.annoId))
      for (const ambito of ambiti) {
        cartellaDi.set(`${radice}/${ambito}/${nome}`, dove(classe.annoId))
      }
    }
  }
  for (const momento of registro.valutazioni) {
    const classeId = corsoDellaClasse.get(momento.corsoId ?? '')
    cartellaDi.set(`allegati/${momento.id}`, dove(annoDellaClasse.get(classeId ?? '')))
  }
  for (const piano of registro.piani) {
    const classeId = corsoDellaClasse.get(piano.corsoId ?? '')
    cartellaDi.set(`risorse/${piano.id}`, dove(annoDellaClasse.get(classeId ?? '')))
  }

  // Prima quel che si sa assegnare, poi il resto: altrimenti una cartella di
  // classe finirebbe nell'anno in uso.
  for (const [relativo, anno] of cartellaDi) {
    const da = apparato.Uri.joinPath(radice, ...relativo.split('/'))
    const verso = cartellaAnnoIn(radice, anno)
    if (!verso) continue
    await sposta(da, apparato.Uri.joinPath(verso, ...relativo.split('/')))
  }

  for (const nome of SOTTOCARTELLE) {
    const da = apparato.Uri.joinPath(radice, nome)
    if (!(await esisteFile(da))) continue
    const verso = cartellaAnnoIn(radice, corrente)
    if (!verso) continue
    // `.storico` sono le copie dei JSON: seguono i JSON, dentro `dati/`.
    const a = nome === '.storico'
      ? apparato.Uri.joinPath(verso, DATI, nome)
      : apparato.Uri.joinPath(verso, nome)
    await sposta(da, a)
    await togliSeVuota(da, TRASLOCO)
  }
}

/**
 * Porta un registro dalla disposizione piatta a una cartella per anno; `null` se
 * non c'è niente da fare. Non lancia: quel che non si sposta si ritenta al
 * prossimo avvio.
 */
export async function migraAnni (radice: apparato.Uri): Promise<EsitoMigrazione | null> {
  if (!(await esisteFile(radice))) return null
  if (!(await daMigrare(radice))) return null

  // Da qui si lavora su un registro normalizzato, non sui JSON grezzi.
  const grezzo: Record<string, unknown> = {}
  for (const collezione of COLLEZIONI) {
    const file = apparato.Uri.joinPath(radice, NOMI[collezione])
    const letto = await leggiJson(file)
    // Un file presente ma illeggibile (segnaposto OneDrive, JSON rotto) ferma
    // tutto fino al prossimo avvio: migrare lo perderebbe. Un file vuoto va bene.
    if (letto === null && (await esisteFile(file)) && !(await senzaNienteDentro(file))) return null
    if (collezione === 'registro' && letto && typeof letto === 'object') {
      Object.assign(grezzo, letto)
    } else if (letto !== null) {
      grezzo[collezione] = letto
    }
  }
  const registro = normalizzaRegistro(grezzo)

  const vuoto =
    registro.classi.length === 0 &&
    registro.corsi.length === 0 &&
    registro.lezioni.length === 0 &&
    registro.piani.length === 0 &&
    registro.valutazioni.length === 0
  // Senza anni ma con dati: si crea l'anno che comprende oggi.
  if (registro.anni.length === 0) {
    if (vuoto) return null
    registro.anni = [creaAnnoCorrente()]
    registro.annoCorrenteId = registro.anni[0].id
    for (const classe of registro.classi) classe.annoId = registro.anni[0].id
  }

  const prese = new Set(await sottocartelleDi(radice))
  const destinazioni = new Map<string, string>()
  for (const anno of registro.anni) destinazioni.set(anno.id, cartellaDellAnno(anno, prese))

  const correnteId = registro.annoCorrenteId ?? registro.anni[registro.anni.length - 1].id
  const corrente = destinazioni.get(correnteId) ?? destinazioni.get(registro.anni[0].id)!

  // L'anno in uso raccoglie anche gli sciolti (corso senza classe, piano non assegnato).
  for (const anno of registro.anni) {
    const cartella = destinazioni.get(anno.id)!
    const dati = cartellaCollezioniIn(radice, cartella)
    if (!dati) continue
    await apparato.file.createDirectory(dati)

    const fette = fetteDellAnno(registro, anno.id, cartella === corrente)
    await scriviJsonUri(percorsoIn(radice, cartella, 'registro')!, {
      versione: VERSIONE_DATI,
      anno,
      // Copiate in ogni anno: un anno chiuso resta leggibile con la sua scala.
      materie: registro.materie,
      impostazioni: registro.impostazioni,
    })
    for (const collezione of COLLEZIONI) {
      if (collezione === 'registro') continue
      const contenuto = fette[collezione]
      if (contenuto.length === 0) continue
      await scriviJsonUri(percorsoIn(radice, cartella, collezione)!, contenuto)
    }
  }

  await dividiCartelle(radice, registro, destinazioni, corrente)

  // I file piatti per ultimi e nel cestino: sono l'unica copia intera, e finché
  // ci sono un'apertura interrotta rifà il giro da capo.
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    const file = apparato.Uri.joinPath(radice, NOMI[collezione])
    if (!(await esisteFile(file))) continue
    try {
      await apparato.file.delete(file, { useTrash: true })
    } catch {
      // Resta lì: la migrazione riparte al prossimo avvio.
    }
  }

  return {
    anni: registro.anni.map((a) => destinazioni.get(a.id)!),
    corrente,
  }
}

// ------------------------------------------------- dalle cartelle ai documenti

/**
 * Da `2026-2027/dati/*.json` a `2026-2027.regi`. Prima si scrive il documento,
 * poi `dati/` va nel cestino: un'interruzione lascia le cartelle intatte.
 * Un anno che ha già il documento si salta: la `dati/` accanto è di una
 * macchina non aggiornata, e riprenderla riporterebbe indietro i dati.
 */
export async function impacchettaAnni (radice: apparato.Uri): Promise<string[]> {
  if (!(await esisteFile(radice))) return []

  const fatti: string[] = []
  for (const cartella of await sottocartelleDi(radice)) {
    // Basta un file illeggibile per non scrivere il documento: esistendo, la
    // cartella non si riprenderebbe più e quel file andrebbe perso.
    let mancati = 0
    const dati = cartellaCollezioniIn(radice, cartella)
    const documento = percorsoPacchettoIn(radice, cartella)
    if (!dati || !documento) continue
    if (!(await esisteFile(apparato.Uri.joinPath(dati, NOMI.registro)))) continue
    if (await esisteFile(documento)) continue

    const pacchetto = Pacchetto.nuovo(documento)
    // Compressione massima: questi file (lo storico soprattutto) non si riscrivono più.
    pacchetto.stringiAlMassimo()
    let qualcosa = false
    for (const [nome, tipo] of await vociDi(dati)) {
      if (tipo === apparato.GenereFile.Directory) continue
      // Solo i JSON: niente `.tmp` di salvataggi interrotti o copie `.rotto-…`.
      if (!nome.endsWith('.json') || nome.endsWith('.tmp')) continue
      const testo = await leggiTesto(apparato.Uri.joinPath(dati, nome))
      if (testo === null) {
        mancati += 1
        continue
      }
      pacchetto.scrivi(nome, testo)
      qualcosa = true
    }
    // Anche lo storico entra nel documento. Illeggibile conta come mancato:
    // «non si legge» non vuol dire «non c'è».
    let storico: Array<[string, apparato.GenereFile]> = []
    try {
      storico = await apparato.file.readDirectory(apparato.Uri.joinPath(dati, STORICO))
    } catch (errore) {
      if (!(errore instanceof apparato.ErroreFile && errore.code === 'FileNotFound')) mancati += 1
    }
    for (const [nome, tipo] of storico) {
      if (tipo === apparato.GenereFile.Directory || !nome.endsWith('.json')) continue
      const testo = await leggiTesto(apparato.Uri.joinPath(dati, STORICO, nome))
      if (testo === null) {
        mancati += 1
        continue
      }
      pacchetto.scrivi(`${STORICO}/${nome}`, testo)
    }
    if (!qualcosa) continue
    if (mancati > 0) {
      console.warn(
        `[anni] ${cartella}: ${mancati} file non si sono potuti leggere, ` +
          'il documento non si scrive e la cartella resta dov’è fino al prossimo avvio.',
      )
      continue
    }

    try {
      await pacchetto.salva({ forza: true })
    } catch {
      // La cartella resta: si riprova alla prossima apertura.
      continue
    }
    try {
      await apparato.file.delete(dati, { recursive: true, useTrash: true })
    } catch {
      // Il documento c'è: la cartella resta lì, ignorata.
    }
    fatti.push(cartella)
  }
  return fatti
}

/** Vero se il file non ha niente dentro, a parte gli spazi. Un file che non si legge non è vuoto. */
async function senzaNienteDentro (file: apparato.Uri): Promise<boolean> {
  const testo = await leggiTesto(file)
  return testo !== null && testo.trim() === ''
}

/** Il testo di un file, o null se non c'è o non si legge. */
async function leggiTesto (file: apparato.Uri): Promise<string | null> {
  try {
    return new TextDecoder().decode(await apparato.file.readFile(file))
  } catch {
    return null
  }
}

// -------------------------------------------- dalle cartelle dentro il documento

/**
 * Le cartelle dell'anno che entrano nel documento. Mancano `bozze/` (i `.eml`
 * li riapre il programma di posta, da fuori) e `in-arrivo/` (la svuota lo
 * smistatore, e porterebbe dentro LEGGIMI e sottocartelle vuote).
 */
const DA_INGLOBARE = [
  'archivio',
  'esportazioni',
  'documentazione',
  'documenti',
  'allegati',
  'risorse',
  'assenze',
  'quarantena',
]

/**
 * I file delle cartelle dell'anno dentro il documento; torna quanti ne sono entrati.
 * Prima si salva il documento, poi le cartelle vanno nel cestino, e solo quelle
 * entrate per intero: dove il cestino non c'è (`environment/fs.ts`) si cancella
 * davvero. Interrotto, al riavvio si riprende: i file già dentro si saltano.
 */
export async function inglobaCartelle (archivio: Archivio): Promise<number> {
  const dove = deposito()
  const anno = cartellaAnno()
  if (!dove || !anno) return 0

  let entrati = 0
  let falliti = 0
  const svuotate: apparato.Uri[] = []
  for (const nome of DA_INGLOBARE) {
    const cartella = apparato.Uri.joinPath(anno, nome)
    if (!(await esisteFile(cartella))) continue
    const esito = await inglobaSotto(dove, cartella, nome)
    entrati += esito.entrati
    falliti += esito.falliti
    if (esito.falliti === 0) svuotate.push(cartella)
  }
  if (falliti > 0) {
    console.warn(
      `[anni] ${falliti} file non sono entrati nel documento: le loro cartelle restano dov’erano.`,
    )
  }
  if (entrati === 0) return 0

  await archivio.salva()
  // `salva` non solleva se falliscono le collezioni in attesa (le rimette in
  // coda): con qualcosa in sospeso non si cancella niente.
  if (archivio.statoSalvataggio.inSospeso) {
    console.warn('[anni] il documento non è stato scritto per intero: le cartelle restano dov’erano.')
    return entrati
  }

  for (const cartella of svuotate) {
    try {
      await apparato.file.delete(cartella, { recursive: true, useTrash: true })
    } catch {
      // Un file aperto altrove tiene la cartella: si riprova al prossimo avvio.
    }
  }
  return entrati
}

/**
 * Mette nel documento tutto quel che sta sotto una cartella. `falliti` decide se
 * la cartella si può buttare. Non `vociDi`: su errore torna vuoto, e una
 * cartella illeggibile sembrerebbe vuota.
 */
async function inglobaSotto (
  dove: Deposito,
  cartella: apparato.Uri,
  prefisso: string,
): Promise<{ entrati: number, falliti: number }> {
  let entrati = 0
  let falliti = 0

  let voci: Array<[string, apparato.GenereFile]>
  try {
    voci = await apparato.file.readDirectory(cartella)
  } catch {
    return { entrati: 0, falliti: 1 }
  }

  for (const [nome, tipo] of voci) {
    const relativo = `${prefisso}/${nome}`
    if (tipo === apparato.GenereFile.Directory) {
      const sotto = await inglobaSotto(dove, apparato.Uri.joinPath(cartella, nome), relativo)
      entrati += sotto.entrati
      falliti += sotto.falliti
      continue
    }
    // Già dentro: si salta, la cartella può essere tornata con file vecchi.
    if (dove.esiste(relativo)) continue
    try {
      const contenuto = await apparato.file.readFile(apparato.Uri.joinPath(cartella, nome))
      dove.scrivi(relativo, contenuto, { certamenteNuovo: true })
      entrati += 1
    } catch {
      // Resta fuori, e `falliti` impedisce di cancellarne la cartella.
      falliti += 1
    }
  }
  return { entrati, falliti }
}
