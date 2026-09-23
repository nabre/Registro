// Come un registro tutto in un mucchio diventa un registro per anni.
//
// Fino alla versione 2 i nove JSON stavano tutti insieme nella radice, con gli
// anni scolastici mescolati dentro: le classi portavano un `annoId`, e «l'anno
// scorso» voleva dire filtrare. Funzionava finché gli anni erano uno. Al
// secondo, ogni elenco che si dimenticava il filtro mostrava due anni insieme —
// e in una media è un errore che non si vede.
//
// Adesso l'anno è una cartella. Questo file è il passaggio da lì a qui: si fa
// una volta, alla prima apertura, e non chiede niente a nessuno. Chiedere
// avrebbe voluto dire lasciare per un po' un registro che il resto del
// programma non sa più leggere, e non c'è una risposta utile da dare: i dati
// vanno spostati comunque.
//
// Regole dello spostamento, tutte con lo stesso criterio — a chi appartiene:
//
//   le classi        all'anno che dichiarano
//   corsi, ore, voti, consegne, fascicoli   alla classe da cui dipendono
//   archivio/<materia>/<classe>            alla classe che la nomina
//   documentazione/<classe>                 alla classe che le dà il nome
//   allegati/<id>, risorse/<id>             alla valutazione o al piano
//   tutto il resto                          all'anno in uso
//
// L'ultima riga è quella che conta: quel che non si sa a chi assegnare non si
// perde e non resta indietro, va nell'anno in uso. Un file perso in una
// migrazione è un file perso, e nessuna regola elegante lo vale.

import * as apparato from 'apparato'

import { cartellaDellAnno, fetteDellAnno } from '../domain/years.js'
import { creaAnnoCorrente } from '../domain/factories.js'
import type { Registro } from '../domain/models.js'
import { VERSIONE_DATI } from '../domain/models.js'
import { nomeSicuro } from '../domain/text.js'
import { normalizzaRegistro } from '../domain/validation.js'
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
  vociDi,
} from './paths.js'

/** Le sottocartelle che stavano nella radice e adesso stanno dentro un anno. */
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

async function scriviJson (file: apparato.Uri, contenuto: unknown): Promise<void> {
  await apparato.file.createDirectory(apparato.Uri.joinPath(file, '..'))
  await apparato.file.writeFile(
    file,
    new TextEncoder().encode(`${JSON.stringify(contenuto, null, 2)}\n`),
  )
}

/**
 * Vero se qui c'è ancora la disposizione di prima: i JSON delle collezioni
 * sciolti nella radice, o un `registro.json` che porta dentro gli anni.
 *
 * La presenza di un documento accanto non basta a dire di no: una cartella
 * sincronizzata può aver ricevuto il documento da una macchina già migrata e i
 * file vecchi da un'altra che non lo era. Finché quei file ci sono, c'è ancora
 * da spostare.
 */
async function daMigrare (radice: apparato.Uri): Promise<boolean> {
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    if (await esisteFile(apparato.Uri.joinPath(radice, NOMI[collezione]))) return true
  }
  const grezzo = await leggiJson(apparato.Uri.joinPath(radice, NOMI.registro))
  return Array.isArray((grezzo as { anni?: unknown })?.anni)
}

/** Sposta una voce di cartella dentro un'altra, senza coprire quel che ci trova. */
async function sposta (da: apparato.Uri, a: apparato.Uri): Promise<boolean> {
  if (!(await esisteFile(da))) return false
  if (await esisteFile(a)) return travasa(da, a)
  try {
    await apparato.file.createDirectory(apparato.Uri.joinPath(a, '..'))
    await apparato.file.rename(da, a, { overwrite: false })
    return true
  } catch {
    return travasa(da, a)
  }
}

/** Travasa una cartella dentro un'altra, voce per voce, senza coprire niente. */
async function travasa (da: apparato.Uri, a: apparato.Uri): Promise<boolean> {
  let qualcosa = false
  try {
    await apparato.file.createDirectory(a)
  } catch {
    return false
  }
  for (const [nome, tipo] of await vociDi(da)) {
    const origine = apparato.Uri.joinPath(da, nome)
    const destinazione = apparato.Uri.joinPath(a, nome)
    if (tipo === apparato.GenereFile.Directory) {
      if (await travasa(origine, destinazione)) qualcosa = true
      await togliSeVuota(origine)
      continue
    }
    if (await esisteFile(destinazione)) continue
    try {
      await apparato.file.rename(origine, destinazione, { overwrite: false })
      qualcosa = true
    } catch {
      // Aperto altrove, o in sola lettura: resta dov'è, e si riprova al giro dopo.
    }
  }
  return qualcosa
}

async function togliSeVuota (cartella: apparato.Uri): Promise<void> {
  // Una lettura che solleva, e non `vociDi`: quella su errore torna un elenco
  // vuoto, e una cartella che non si è potuta leggere — un segnaposto di
  // OneDrive, un permesso negato — sembrerebbe vuota e verrebbe cancellata
  // senza cestino con dentro quel che non si è visto.
  try {
    if ((await apparato.file.readDirectory(cartella)).length > 0) return
  } catch {
    return
  }
  try {
    // `recursive` su una cartella di cui si è appena verificato che è vuota
    // non toglie niente in più, e non chiede a chi implementa il file system
    // di saper cancellare una cartella senza dirglielo.
    await apparato.file.delete(cartella, { recursive: true, useTrash: false })
  } catch {
    // Non si è potuta togliere: una cartella vuota di troppo non fa danno.
  }
}

/**
 * Divide per anno le sottocartelle dei documenti.
 *
 * `documentazione/` si divide per classe — la cartella porta il nome della
 * classe, ed è così che ci si ritrova aprendola da fuori — mentre `allegati/` e
 * `risorse/` di prima si dividono per identificatore. Quel che non si riconosce
 * segue l'anno in uso insieme a tutto il resto.
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

  // Gli ambiti che possono stare davanti alla classe nelle due radici: le
  // materie del registro, e la cartella dei documenti che materia non hanno.
  const ambiti = [...registro.materie.map((m) => nomeSicuro(m.nome)), 'docente-di-classe']

  for (const classe of registro.classi) {
    const nome = nomeSicuro(classe.nome)
    cartellaDi.set(`documentazione/${nome}`, dove(classe.annoId))
    for (const radice of ['archivio', 'esportazioni']) {
      // La disposizione di prima, con la classe davanti, e quella di adesso,
      // con la materia: qui si incontrano tutte e due, perché una cartella
      // piatta può essere stata lasciata a metà strada.
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

  // Prima quel che si sa dividere, poi quel che resta: così una cartella di
  // classe non finisce nell'anno in uso solo perché il giro generale l'ha
  // incontrata per prima.
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
    await togliSeVuota(da)
  }
}

/**
 * Porta un registro dalla disposizione piatta a una cartella per anno.
 *
 * Torna null quando non c'è niente da fare — il caso normale, a ogni avvio
 * dopo il primo. Non lancia mai: un file che non si riesce a spostare resta
 * dov'è e si ritenta alla prossima apertura, perché a quel punto i JSON degli
 * anni ci sono già e il giro dopo si limita a quel che manca.
 */
export async function migraAnni (radice: apparato.Uri): Promise<EsitoMigrazione | null> {
  if (!(await esisteFile(radice))) return null
  if (!(await daMigrare(radice))) return null

  // Si legge il mucchio com'è, con la stessa rete che regge i file scritti a
  // mano: da qui in poi si lavora su un registro normalizzato, non su JSON.
  const grezzo: Record<string, unknown> = {}
  for (const collezione of COLLEZIONI) {
    const file = apparato.Uri.joinPath(radice, NOMI[collezione])
    const letto = await leggiJson(file)
    // Un file che c'è e non si legge — un segnaposto di OneDrive che non
    // scarica, un JSON rotto — non è un file che non c'è: migrare adesso
    // vorrebbe dire scrivere gli anni senza quella collezione e poi mandare
    // il file nel cestino, che su una chiavetta è una cancellazione. Si lascia
    // tutto com'è e si riprova al prossimo avvio. Un file vuoto invece si
    // legge benissimo: non ha niente dentro.
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
  // Un registro senza anni ma con dentro qualcosa: si dichiara l'anno che
  // comprende oggi, invece di lasciare i dati in una cartella che non c'è.
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

  // I file di ogni anno, nella sua cartella. L'anno in uso raccoglie anche gli
  // sciolti — un corso senza classe, un piano mai assegnato — e li raccoglie
  // una volta sola.
  for (const anno of registro.anni) {
    const cartella = destinazioni.get(anno.id)!
    const dati = cartellaCollezioniIn(radice, cartella)
    if (!dati) continue
    await apparato.file.createDirectory(dati)

    const fette = fetteDellAnno(registro, anno.id, cartella === corrente)
    await scriviJson(percorsoIn(radice, cartella, 'registro')!, {
      versione: VERSIONE_DATI,
      anno,
      // Materie e impostazioni si copiano in ogni anno: da qui in poi ognuno
      // ha le sue, e un anno chiuso resta leggibile con la scala con cui è
      // stato scritto anche se intanto la scala è cambiata.
      materie: registro.materie,
      impostazioni: registro.impostazioni,
    })
    for (const collezione of COLLEZIONI) {
      if (collezione === 'registro') continue
      const contenuto = fette[collezione]
      if (contenuto.length === 0) continue
      await scriviJson(percorsoIn(radice, cartella, collezione)!, contenuto)
    }
  }

  await dividiCartelle(radice, registro, destinazioni, corrente)

  // I file vecchi per ultimi, e nel cestino — non cancellati sul serio: è il
  // momento in cui si potrebbe scoprire che è andato storto qualcosa, ed è
  // l'unica copia intera di com'era. Finché sono lì, un'apertura interrotta a
  // metà li ritrova e rifà il giro da capo invece di lasciare un anno a metà.
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    const file = apparato.Uri.joinPath(radice, NOMI[collezione])
    if (!(await esisteFile(file))) continue
    try {
      await apparato.file.delete(file, { useTrash: true })
    } catch {
      // Resta lì: al prossimo avvio la migrazione riparte e lo ritrova.
    }
  }

  return {
    anni: registro.anni.map((a) => destinazioni.get(a.id)!),
    corrente,
  }
}

// ------------------------------------------------- dalle cartelle ai documenti

/**
 * Il secondo trasloco: da `2026-2027/dati/*.json` a `2026-2027.registro`.
 *
 * Anche questo si fa una volta sola e senza chiedere niente, per la stessa
 * ragione dell'altro: finché i dati stanno in due disposizioni diverse, il
 * registro ne legge una sola, e lasciare scegliere vorrebbe dire lasciare a
 * metà un registro che nessuno sa più leggere.
 *
 * L'ordine è quello che regge un'interruzione a metà. Prima si scrive il
 * documento — se la corrente va via qui, sul disco ci sono le cartelle di
 * prima, intatte, e al riavvio si ricomincia — e solo dopo la vecchia
 * `dati/` va nel cestino. Nel cestino e non cancellata: è il momento in cui si
 * potrebbe scoprire che qualcosa non è passato, ed è l'unica copia di com'era.
 *
 * Un anno che ha già il suo documento si salta: la cartella `dati/` rimasta
 * accanto è quella di una macchina non ancora aggiornata, e riprenderla
 * vorrebbe dire riportare indietro i dati di oggi con quelli di ieri.
 */
export async function impacchettaAnni (radice: apparato.Uri): Promise<string[]> {
  if (!(await esisteFile(radice))) return []

  const fatti: string[] = []
  for (const cartella of await sottocartelleDi(radice)) {
    // I file che c'erano e non si sono potuti leggere. Uno solo basta a non
    // scrivere il documento: scritto senza quella collezione, al prossimo
    // avvio il documento esisterebbe già e la cartella non si riprenderebbe
    // più — e intanto `dati/` sarebbe andata nel cestino, che su una chiavetta
    // vuol dire cancellata.
    let mancati = 0
    const dati = cartellaCollezioniIn(radice, cartella)
    const documento = percorsoPacchettoIn(radice, cartella)
    if (!dati || !documento) continue
    if (!(await esisteFile(apparato.Uri.joinPath(dati, NOMI.registro)))) continue
    if (await esisteFile(documento)) continue

    const pacchetto = Pacchetto.nuovo(documento)
    // Quel che si scrive qui — le copie dello storico soprattutto — non verrà
    // più riscritto: si comprime al massimo, e il tempo speso una volta sola
    // resta risparmiato su ogni sincronizzazione che verrà.
    pacchetto.stringiAlMassimo()
    let qualcosa = false
    for (const [nome, tipo] of await vociDi(dati)) {
      if (tipo === apparato.GenereFile.Directory) continue
      // Solo i JSON delle collezioni, e non quel che si è depositato accanto:
      // un `.tmp` di un salvataggio interrotto o una copia `.rotto-…` non
      // devono entrare nel documento come se fossero dati buoni.
      if (!nome.endsWith('.json') || nome.endsWith('.tmp')) continue
      const testo = await leggiTesto(apparato.Uri.joinPath(dati, nome))
      if (testo === null) {
        mancati += 1
        continue
      }
      pacchetto.scrivi(nome, testo)
      qualcosa = true
    }
    // E le copie di com'era, che seguono i JSON dentro il documento: sono la
    // rete di chi si accorge domani che oggi ha cancellato una classe. Anche
    // qui una lettura che solleva: uno storico che non si legge non è uno
    // storico che non c'è, e andrebbe nel cestino con il resto.
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
      // Non si è potuto scrivere: la cartella resta dov'è e si riprova alla
      // prossima apertura, che è esattamente quel che serve.
      continue
    }
    try {
      await apparato.file.delete(dati, { recursive: true, useTrash: true })
    } catch {
      // Il documento c'è comunque, ed è quello che il registro legge: la
      // cartella di prima resta lì, ignorata, finché qualcuno non la toglie.
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
 * Le cartelle dell'anno che entrano nel documento.
 *
 * Non ci sono tutte, e le due che mancano mancano per una ragione soltanto.
 * `bozze/` è dove il registro scrive i messaggi `.eml` da rileggere prima di
 * spedirli, e dove il programma di posta li riapre: è una porta verso un altro
 * programma, e dentro un archivio non ci
 * si scrive da fuori. `in-arrivo/` è la cassetta di prima, che non è più la
 * porta d'ingresso di niente: quel che ci è rimasto lo porta dentro lo
 * smistatore all'apertura dell'anno, e inglobarla qui vorrebbe dire portarci
 * dentro anche il LEGGIMI e le sottocartelle vuote che si tirava dietro.
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
 * Il terzo trasloco: i documenti dell'anno dentro il documento dell'anno.
 *
 * Prima i JSON, poi i PDF. Si fa una volta, come gli altri due, e con lo stesso
 * ordine che regge un'interruzione: si scrive il documento con tutto dentro, e
 * solo quando quello è a posto le cartelle vanno nel cestino. Interrotto a
 * metà, al riavvio si ricomincia — i file sono ancora tutti al loro posto, e
 * quelli già entrati si riconoscono perché ci sono già.
 *
 * Torna quanti file sono entrati, per dirlo a chi apre il registro.
 *
 * **Una cartella va nel cestino solo se è entrato tutto quel che conteneva.**
 * Il `catch` qui sotto ha sempre detto «la sua cartella non si cancella perché
 * il file c'è ancora», ma non aveva modo di farlo valere: `inglobaSotto`
 * tornava un numero e basta, e `svuotate.push` stava fuori da ogni condizione.
 * Un segnaposto di OneDrive che non si idrata, un file aperto altrove, una
 * sottocartella che non si legge — e quel file spariva insieme alla cartella,
 * senza essere mai entrato nel documento. Per di più non sempre nel cestino:
 * `environment/fs.ts` ripiega sulla cancellazione definitiva dove il cestino non
 * c'è, cioè su una chiavetta o su una condivisione di rete.
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

  // Il documento per primo, e per intero: da qui in poi i file ci sono dentro,
  // e le cartelle sono una copia di troppo.
  await archivio.salva()
  // Ma solo se è andato davvero. `salva` non solleva quando a fallire sono le
  // collezioni in attesa — le rimette in coda, lo dice alla barra e riprova —
  // e un disco pieno lasciava i file in memoria e le cartelle nel cestino.
  // Se resta qualcosa in sospeso non si cancella niente: al prossimo avvio i
  // file già entrati si riconoscono, e gli altri si riprendono.
  if (archivio.statoSalvataggio.inSospeso) {
    console.warn('[anni] il documento non è stato scritto per intero: le cartelle restano dov’erano.')
    return entrati
  }

  for (const cartella of svuotate) {
    try {
      await apparato.file.delete(cartella, { recursive: true, useTrash: true })
    } catch {
      // Un file aperto in un altro programma tiene la sua cartella: resta lì,
      // ignorata, e al prossimo avvio si riproverà con quel che è rimasto.
    }
  }
  return entrati
}

/**
 * Mette dentro il documento tutto quel che sta sotto una cartella.
 *
 * Torna anche quanti non ce l'hanno fatta, perché è quel numero — e non quello
 * di quelli entrati — a decidere se la cartella si può buttare.
 *
 * La cartella si legge qui e non con `vociDi`, che su errore torna un elenco
 * vuoto: una cartella illeggibile e una cartella vuota si leggerebbero uguali,
 * e la prima verrebbe cancellata con tutto quel che non si è riusciti a
 * guardare.
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
    // Quel che è già dentro non si ripassa: la cartella può essere tornata da
    // una sincronizzazione con dei file vecchi, e riprenderli vorrebbe dire
    // riportare indietro quel che si è fatto da allora.
    if (dove.esiste(relativo)) continue
    try {
      const contenuto = await apparato.file.readFile(apparato.Uri.joinPath(cartella, nome))
      dove.scrivi(relativo, contenuto, { certamenteNuovo: true })
      entrati += 1
    } catch {
      // Non si è potuto leggere: resta fuori, e la sua cartella non si cancella
      // perché il file c'è ancora. È questo `falliti` a farlo valere.
      falliti += 1
    }
  }
  return { entrati, falliti }
}
