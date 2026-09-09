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

import * as vscode from 'vscode'

import { cartellaDellAnno, fetteDellAnno } from '../dominio/anni.js'
import { creaAnnoCorrente } from '../dominio/fabbriche.js'
import type { Registro } from '../dominio/modelli.js'
import { VERSIONE_DATI } from '../dominio/modelli.js'
import { nomeSicuro } from '../dominio/testo.js'
import { normalizzaRegistro } from '../dominio/validazione.js'
import {
  DATI,
  INDICE,
  NOMI,
  type NomeCollezione,
  cartellaAnnoDi,
  cartellaCollezioniDi,
  cartellaDati,
  esisteFile,
  percorsoIn,
  percorsoIndice,
  sottocartelleDi,
  vociDi,
} from './percorsi.js'

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
export interface EsitoMigrazione {
  anni: string[]
  /** L'anno che resta aperto: quello in cui si stava lavorando. */
  corrente: string
}

const COLLEZIONI = Object.keys(NOMI) as NomeCollezione[]

async function leggiJson (file: vscode.Uri): Promise<unknown> {
  try {
    const testo = new TextDecoder().decode(await vscode.workspace.fs.readFile(file)).trim()
    return testo ? JSON.parse(testo) : null
  } catch {
    return null
  }
}

async function scriviJson (file: vscode.Uri, contenuto: unknown): Promise<void> {
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(file, '..'))
  await vscode.workspace.fs.writeFile(
    file,
    new TextEncoder().encode(`${JSON.stringify(contenuto, null, 2)}\n`),
  )
}

/**
 * Vero se qui c'è ancora la disposizione di prima: i JSON delle collezioni
 * nella radice, oppure un `registro.json` che porta dentro gli anni.
 *
 * L'indice nuovo non basta a dire di no: una cartella sincronizzata può aver
 * ricevuto l'indice da una macchina già migrata e i file vecchi da un'altra
 * che non lo era. Finché quei file ci sono, c'è ancora da spostare.
 */
async function daMigrare (radice: vscode.Uri): Promise<boolean> {
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    if (await esisteFile(vscode.Uri.joinPath(radice, NOMI[collezione]))) return true
  }
  const grezzo = await leggiJson(vscode.Uri.joinPath(radice, INDICE))
  return Array.isArray((grezzo as { anni?: unknown })?.anni)
}

/** Sposta una voce di cartella dentro un'altra, senza coprire quel che ci trova. */
async function sposta (da: vscode.Uri, a: vscode.Uri): Promise<boolean> {
  if (!(await esisteFile(da))) return false
  if (await esisteFile(a)) return travasa(da, a)
  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(a, '..'))
    await vscode.workspace.fs.rename(da, a, { overwrite: false })
    return true
  } catch {
    return travasa(da, a)
  }
}

/** Travasa una cartella dentro un'altra, voce per voce, senza coprire niente. */
async function travasa (da: vscode.Uri, a: vscode.Uri): Promise<boolean> {
  let qualcosa = false
  try {
    await vscode.workspace.fs.createDirectory(a)
  } catch {
    return false
  }
  for (const [nome, tipo] of await vociDi(da)) {
    const origine = vscode.Uri.joinPath(da, nome)
    const destinazione = vscode.Uri.joinPath(a, nome)
    if (tipo === vscode.FileType.Directory) {
      if (await travasa(origine, destinazione)) qualcosa = true
      await togliSeVuota(origine)
      continue
    }
    if (await esisteFile(destinazione)) continue
    try {
      await vscode.workspace.fs.rename(origine, destinazione, { overwrite: false })
      qualcosa = true
    } catch {
      // Aperto altrove, o in sola lettura: resta dov'è, e si riprova al giro dopo.
    }
  }
  return qualcosa
}

async function togliSeVuota (cartella: vscode.Uri): Promise<void> {
  if ((await vociDi(cartella)).length > 0) return
  try {
    // `recursive` su una cartella di cui si è appena verificato che è vuota
    // non toglie niente in più, e non chiede a chi implementa il file system
    // di saper cancellare una cartella senza dirglielo.
    await vscode.workspace.fs.delete(cartella, { recursive: true, useTrash: false })
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
  radice: vscode.Uri,
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
    const da = vscode.Uri.joinPath(radice, ...relativo.split('/'))
    const verso = cartellaAnnoDi(anno)
    if (!verso) continue
    await sposta(da, vscode.Uri.joinPath(verso, ...relativo.split('/')))
  }

  for (const nome of SOTTOCARTELLE) {
    const da = vscode.Uri.joinPath(radice, nome)
    if (!(await esisteFile(da))) continue
    const verso = cartellaAnnoDi(corrente)
    if (!verso) continue
    // `.storico` sono le copie dei JSON: seguono i JSON, dentro `dati/`.
    const a = nome === '.storico'
      ? vscode.Uri.joinPath(verso, DATI, nome)
      : vscode.Uri.joinPath(verso, nome)
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
export async function migraAnni (): Promise<EsitoMigrazione | null> {
  const radice = cartellaDati()
  if (!radice) return null
  if (!(await esisteFile(radice))) return null
  if (!(await daMigrare(radice))) return null

  // Si legge il mucchio com'è, con la stessa rete che regge i file scritti a
  // mano: da qui in poi si lavora su un registro normalizzato, non su JSON.
  const grezzo: Record<string, unknown> = {}
  for (const collezione of COLLEZIONI) {
    const letto = await leggiJson(vscode.Uri.joinPath(radice, NOMI[collezione]))
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
    const dati = cartellaCollezioniDi(cartella)
    if (!dati) continue
    await vscode.workspace.fs.createDirectory(dati)

    const fette = fetteDellAnno(registro, anno.id, cartella === corrente)
    await scriviJson(percorsoIn(cartella, 'registro')!, {
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
      await scriviJson(percorsoIn(cartella, collezione)!, contenuto)
    }
  }

  await dividiCartelle(radice, registro, destinazioni, corrente)

  // L'indice per ultimo: finché non c'è, una apertura interrotta a metà
  // ritrova i file vecchi e rifà il giro da capo invece di aprire un anno a
  // metà. Poi i file vecchi se ne vanno nel cestino — non cancellati sul
  // serio: è il momento in cui si potrebbe scoprire che è andato storto
  // qualcosa, ed è l'unica copia intera di com'era.
  await scriviJson(percorsoIndice()!, { versione: VERSIONE_DATI, annoCorrente: corrente })
  for (const collezione of COLLEZIONI) {
    if (collezione === 'registro') continue
    const file = vscode.Uri.joinPath(radice, NOMI[collezione])
    if (!(await esisteFile(file))) continue
    try {
      await vscode.workspace.fs.delete(file, { useTrash: true })
    } catch {
      // Resta lì: al prossimo avvio la migrazione riparte e lo ritrova.
    }
  }

  return {
    anni: registro.anni.map((a) => destinazioni.get(a.id)!),
    corrente,
  }
}
