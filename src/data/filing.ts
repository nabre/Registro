// Dove finisce ogni documento che entra nel registro, e con che nome.
//
// Una regola sola, per tutto: `archivio/<materia>/<classe>/<chi>/<file>`.
// La materia è quella del corso quando il documento appartiene
// all'insegnamento — il testo di una verifica, la prova corretta di una persona
// — ed è `docente-di-classe` quando appartiene alla classe come gruppo:
// pagelle, certificati, autorizzazioni, moduli.
//
//   archivio/
//     Calcolo professionale/
//       DIC4a/
//         classe/
//           DIC4a_Verifica 1_testo.pdf
//           DIC4a_Verifica 1_soluzione.pdf
//         allievi/
//           Rossi Mario/
//             DIC4a_Verifica 1_Rossi Mario_prova.pdf
//     docente-di-classe/
//       DIC4a/
//         allievi/
//           Rossi Mario/
//             DIC4a_Pagella 3° anno_Rossi Mario.pdf
//         foto/
//           Rossi Mario.jpg
//
// La materia davanti alla classe perché è la cartella che si tiene aperta: si
// insegna una materia in più classi, e i documenti di un insegnamento — le
// verifiche, le soluzioni, i piani — sono gli stessi da una classe all'altra.
// Con la classe davanti, la stessa verifica finiva in tre posti lontani e per
// riusarla bisognava ricordarsi in quale classe la si era fatta per prima.
//
// Prima erano tre cartelle piatte — `allegati/<id valutazione>`,
// `documenti/<id classe>` — con dentro nomi fatti di identificatori. Il
// registro ci si ritrovava benissimo; una persona no, e quella cartella la si
// apre da fuori: si cerca il documento di un allievo, si allega una pagella a
// una mail, si consegna un fascicolo a chi subentra. Nomi che parlano e una
// gerarchia che rispecchia come si ragiona — quale classe, di che cosa, quale
// documento — valgono più della comodità di chi scrive il codice.
//
// I nomi delle cartelle si ricavano ogni volta da classe, corso e documento:
// rinominare una verifica rinomina la sua cartella al primo file archiviato. È
// il motivo per cui i percorsi salvati vengono comunque tenuti per esteso
// dentro il registro — quel che conta è il file dove sta adesso, non dove la
// regola direbbe di metterlo oggi.

import * as apparato from 'apparato'

import { nomeCompleto } from '../domain/calculations.js'
import { deposito } from './store.js'
import { classeDelCorsoId, corsiDellaClasse, materiaDelCorso } from '../domain/courses.js'
import { DOCUMENTO_SCHEDE, DOCUMENTO_SCHEDE_PRIMA } from '../domain/lexicon.js'
import type {
  Allievo,
  Attivita,
  Classe,
  Corso,
  PianoLezione,
  Registro,
  Risorsa,
} from '../domain/models.js'
import type { Archivio } from './archive.js'
import {
  cartellaAnno,
  esisteFile,
  estensioneDi,
  nomeSicuro,
  sottocartelleDi,
  vociDi,
} from './paths.js'

import {
  ARCHIVIO,
  DEGLI_ALLIEVI,
  DOCENTE_DI_CLASSE,
  DI_CLASSE,
  ESPORTAZIONI,
  FOTO,
  QUARANTENA,
  cartellaDelPercorso,
  documentoPiano,
  nomeFileArchivio,
  percorsoArchivio,
  percorsoEsportazione,
} from '../domain/locations.js'

// Le regole dei nomi e delle cartelle stanno nel dominio — le legge anche il
// webview, che non può sapere di file — e continuano a uscire da qui: chi
// archivia importa un file solo.
export {
  ARCHIVIO,
  DEGLI_ALLIEVI,
  DOCENTE_DI_CLASSE,
  DI_CLASSE,
  ESPORTAZIONI,
  FOTO,
  cartellaDelPercorso,
  documentoPiano,
  estensioneDi,
  nomeFileArchivio,
  nomeSicuro,
  percorsoArchivio,
  percorsoEsportazione,
}

/**
 * I documenti che stavano sotto `docente-di-classe/` e adesso stanno sotto il
 * corso: si contano le ore di un insegnamento, non quelle di una classe.
 */
const DIVENTATI_DEL_CORSO = ['Presenze', DOCUMENTO_SCHEDE, ...DOCUMENTO_SCHEDE_PRIMA]

/**
 * L'Uri di un percorso d'archivio, e la cartella che lo contiene. Passa dalla
 * stessa pulizia di `fileAllegato`: il percorso può venire da un JSON scritto a
 * mano, e una risalita `..` non deve portare fuori dalla cartella dei dati.
 */
/**
 * Il percorso vero di un documento archiviato, per chi sa aprire solo i file.
 *
 * I documenti stanno dentro il documento d'anno, e un lettore PDF non sa
 * aprirlo: si materializza una copia e si consegna quella. Chi deve soltanto
 * leggerne il contenuto non passa di qui — usa il deposito, e non tocca il
 * disco.
 */
export async function uriArchivio (relativo: string): Promise<apparato.Uri | null> {
  return (await deposito()?.materializza(relativo)) ?? null
}

/**
 * L'inventario di quel che sta sotto `esportazioni/`: percorso e misura.
 *
 * Lo legge il pannello e lo spinge al webview con lo stato. Sono nomi e
 * lunghezze — niente contenuto — e si ricavano dall'indice del documento
 * d'anno, senza aprire un file: un anno con seicento PDF dentro costa un giro
 * di `filter` su una mappa già in memoria.
 */
export function esportazioniPresenti (): Array<{
  percorso: string
  misura: number
  revisione: number
}> {
  return quelCheCè(ESPORTAZIONI)
}

/**
 * Che cosa c'è sotto `archivio/` e in quarantena: i fogli raccolti e i PDF
 * ancora da dividere, come li vede il pannello.
 *
 * Gli stessi tre campi delle esportazioni, perché servono alla stessa cosa —
 * dire se un foglio c'è ancora e far ricaricare l'anteprima quando cambia — e
 * non è un caso: dal punto di vista di chi guarda sono la stessa cosa, un file
 * dentro il documento dell'anno che si apre in una cornice.
 *
 * La quarantena sta qui per la stessa ragione, ed è stata un'omissione che si
 * vedeva: un PDF appena caricato si apriva su «il file non è più qui» mentre
 * stava dentro il documento a un centimetro di distanza — il pannello non sa
 * di file, e per lui «esserci» vuol dire comparire in questo inventario.
 *
 * Le anteprime no: sono fotografie di servizio che il registro si disegna da
 * sé, non fogli che qualcuno ha portato, e in un inventario che serve a dire
 * «questo documento c'è ancora» sarebbero righe che non rispondono a nessuna
 * domanda.
 */
export function archiviPresenti (): Array<{
  percorso: string
  misura: number
  revisione: number
}> {
  return [
    ...quelCheCè(ARCHIVIO),
    ...quelCheCè(QUARANTENA).filter(
      (voce) => !voce.percorso.startsWith(`${QUARANTENA}/anteprime/`),
    ),
  ]
}

/** L'inventario di una cartella del documento: percorso, misura, revisione. */
function quelCheCè (prefisso: string): Array<{
  percorso: string
  misura: number
  revisione: number
}> {
  const dove = deposito()
  if (!dove) return []
  return dove.elenca(prefisso).map((percorso) => ({
    percorso,
    misura: dove.misura(percorso) ?? 0,
    // Quante volte è stato riscritto: è quel che dice all'anteprima che il
    // foglio che sta mostrando non è più quello nella cartella, anche quando il
    // nome e la misura non sono cambiati di un byte.
    revisione: dove.revisione(percorso),
  }))
}

/**
 * Un percorso libero: quello chiesto se non c'è già un file, altrimenti lo
 * stesso con un numero — «Rossi Mario (2).pdf». Due allievi omonimi nella
 * stessa classe producono lo stesso nome, e il documento del secondo non deve
 * coprire quello del primo.
 *
 * `sostituibile` è il file che si sta apposta rimpiazzando — la scansione
 * migliore dello stesso foglio — e a quel percorso si può scrivere sopra.
 */
async function percorsoLibero (
  relativo: string,
  sostituibile: string | null | undefined = null,
): Promise<string> {
  if (relativo === sostituibile) return relativo
  const dove = deposito()
  if (!dove || !dove.esiste(relativo)) return relativo

  const punto = relativo.lastIndexOf('.')
  const barra = relativo.lastIndexOf('/')
  const radice = punto > barra ? relativo.slice(0, punto) : relativo
  const estensione = punto > barra ? relativo.slice(punto) : ''
  for (let n = 2; n < 200; n += 1) {
    const tentativo = `${radice} (${n})${estensione}`
    if (tentativo === sostituibile) return tentativo
    if (!dove.esiste(tentativo)) return tentativo
  }
  return `${radice} ${Date.now()}${estensione}`
}

/**
 * Riscrive un documento generato, buttando via quello di prima.
 *
 * Un rapporto non è un documento che si raccoglie: è una fotografia di com'è il
 * registro adesso, e rifarla vuol dire che quella di prima non serve più.
 * Passando dalla numerazione — «Verbale (2).pdf», «Verbale (3).pdf» — la
 * cartella si riempiva di stampe dello stesso verbale, tutte uguali tranne
 * l'ultima, e chi la apriva doveva guardare le date per capire quale valesse.
 *
 * Quindi si scrive al percorso esatto, e si portano via anche i doppioni
 * numerati lasciati dai giri di prima: nel cestino, non cancellati sul serio,
 * perché un ripensamento deve poter tornare indietro.
 *
 * `doppioni` spegne quella pulizia, e serve dove i numeri fra parentesi non
 * sono mai stati doppioni: nella cartella dei fascicoli il nome del file è il
 * nome che qualcuno ha scelto, e «Schede (2)» è un fascicolo suo — con la sua
 * ricetta — non la stampa di prima di «Schede».
 */
export async function riscrivi (
  relativo: string,
  byte: Uint8Array,
  precedenti: readonly string[] = [],
  { doppioni = true }: { doppioni?: boolean } = {},
): Promise<EsitoArchivio> {
  const dove = deposito()
  if (!dove) return { errore: 'Nessun anno aperto.' }
  dove.scrivi(relativo, byte)
  if (doppioni) togliDoppioni(relativo)
  // Solo dopo aver scritto la nuova copia: i vecchi nomi sono dello stesso PDF.
  for (const precedente of precedenti) {
    if (precedente === relativo || !precedente.startsWith(`${ESPORTAZIONI}/`)) continue
    if (cartellaDelPercorso(precedente) !== cartellaDelPercorso(relativo)) continue
    dove.elimina(precedente)
    if (doppioni) togliDoppioni(precedente)
  }
  return { relativo }
}

/**
 * I «(2)», «(3)» dello stesso documento: se ne vanno nel cestino.
 *
 * Sono le stampe di prima, quando ogni rapporto rifatto prendeva un numero
 * invece del posto del precedente. Si riconoscono dal nome, e solo quelle: un
 * file che qualcuno ha messo lì a mano non si chiama così.
 */
function togliDoppioni (relativo: string): void {
  const dove = deposito()
  if (!dove) return
  const nome = relativo.split('/').pop() ?? ''
  const punto = nome.lastIndexOf('.')
  const radice = punto > 0 ? nome.slice(0, punto) : nome
  const estensione = punto > 0 ? nome.slice(punto) : ''
  const numerato = new RegExp(`^${scappa(radice)} \\(\\d+\\)${scappa(estensione)}$`)

  for (const voce of dove.fileIn(cartellaDelPercorso(relativo))) {
    if (numerato.test(voce.split('/').pop() ?? '')) dove.elimina(voce)
  }
}

/** Un testo che dentro un'espressione regolare vale per quel che è. */
function scappa (testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/** Com'è andata una scrittura nell'archivio: il percorso, o perché no. */
type EsitoArchivio = { relativo: string } | { errore: string }

/**
 * Scrive un file nell'archivio, creando quel che serve. Torna il percorso
 * relativo da salvare nel registro — che può differire da quello chiesto, se
 * era già preso — o il motivo per cui non si è potuto scrivere.
 */
export async function archivia (
  relativo: string,
  byte: Uint8Array,
  sostituibile: string | null = null,
): Promise<EsitoArchivio> {
  const libero = await percorsoLibero(relativo, sostituibile)
  const dove = deposito()
  if (!dove) return { errore: 'Nessun anno aperto.' }
  dove.scrivi(libero, byte, { certamenteNuovo: libero !== sostituibile })
  return { relativo: libero }
}

/** Come sopra, ma copiando un file che sta già da qualche parte sul disco. */
export async function archiviaCopia (
  relativo: string,
  origine: apparato.Uri,
  sostituibile: string | null = null,
): Promise<EsitoArchivio> {
  const libero = await percorsoLibero(relativo, sostituibile)
  const dove = deposito()
  if (!dove) return { errore: 'Nessun anno aperto.' }
  let contenuto: Uint8Array
  try {
    contenuto = await apparato.file.readFile(origine)
  } catch (errore) {
    return { errore: errore instanceof Error ? errore.message : String(errore) }
  }
  dove.scrivi(libero, contenuto, { certamenteNuovo: true })
  return { relativo: libero }
}

/**
 * Dove finisce il ritratto di un allievo:
 * `archivio/docente-di-classe/<classe>/foto/<Cognome Nome>.jpg`.
 *
 * Nella cartella della classe, con il resto di quel che la riguarda: chi apre
 * `docente-di-classe/DIC4a/` trova i suoi documenti e le sue facce, e chi
 * archivia l'anno o lo consegna a un collega si porta dietro tutto insieme.
 * Una cartella `foto/` in cima all'anno avrebbe diviso in due posti le cose
 * della stessa classe.
 *
 * Sta sotto `docente-di-classe/` e non sotto una materia perché l'anagrafica
 * non è di nessun insegnamento: è della classe, come la pagella.
 *
 * Il nome è quello della persona e non il suo identificatore: la cartella si
 * apre anche da fuori dal registro — per rifare una foto, per toglierne una —
 * e `al-7f3c.jpg` non dice a nessuno di chi sia. Chi cambia cognome si ritrova
 * la foto vecchia con il nome vecchio, ed è il momento in cui si rifà.
 */
export function percorsoFoto (
  classe: Classe,
  allievo: Allievo,
  estensione: string,
): string {
  const punto = estensione.startsWith('.') ? estensione : `.${estensione}`
  return [
    ARCHIVIO,
    DOCENTE_DI_CLASSE,
    nomeSicuro(classe.nome),
    FOTO,
    `${nomeSicuro(nomeCompleto(allievo), 'allievo')}${punto.toLowerCase()}`,
  ].join('/')
}

/** Il documento di un allievo dentro una richiesta del docente di classe. */
export function percorsoConsegna (
  classe: Classe,
  nomeFile: string,
  chi: string | null = null,
): string {
  return percorsoArchivio(classe.nome, null, nomeFile, chi)
}

/** Un allegato di un momento di valutazione: sta sotto il suo corso. */
export function percorsoValutazione (
  classe: Classe,
  corso: Corso | null,
  nomeFile: string,
  chi: string | null = null,
): string {
  return percorsoArchivio(classe.nome, corso?.titolo ?? 'corso', nomeFile, chi)
}

/** L'ambito d'archivio dei piani che non stanno su nessun corso. */
const PIANI_SCIOLTI = 'piani'

/** Il nome del file senza l'estensione: è la parte che dice qualcosa. */
function radiceDelNome (nome: string): string {
  const punto = nome.lastIndexOf('.')
  return punto > 0 ? nome.slice(0, punto) : nome
}

/**
 * Dove finisce un file allegato a un piano, o a una delle sue tappe.
 *
 * Sta con gli altri documenti del corso — `archivio/<materia>/<classe>/` — e
 * non più in `risorse/<id del piano>/`: quella cartella si apre anche da fuori dal
 * registro, per ristampare la scheda dell'anno scorso o mandarla a un collega,
 * e un identificatore non dice a nessuno di che ora si tratti.
 *
 * Il nome del file tiene il suo — «scheda 3.pdf» è come lo si riconosce — e ci
 * mette davanti classe, piano e tappa: un file esce dall'archivio di continuo,
 * e fuori dalle sue cartelle deve ancora saper dire da dove viene.
 */
export function percorsoRisorsaPiano (
  registro: Registro,
  piano: PianoLezione,
  attivita: Attivita | null,
  nomeOriginale: string,
): string {
  const classe = piano.corsoId ? classeDelCorsoId(registro, piano.corsoId) : null
  const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
  const nomeClasse = classe?.nome ?? 'senza classe'
  const documento = documentoPiano(registro, piano)
  return percorsoArchivio(
    nomeClasse,
    corso?.titolo ?? PIANI_SCIOLTI,
    nomeFileArchivio(
      nomeClasse,
      attivita?.titolo.trim() || null,
      documento,
      radiceDelNome(nomeOriginale),
      estensioneDi(nomeOriginale),
    ),
  )
}

/**
 * Sposta un file dell'archivio dove la regola direbbe di metterlo adesso.
 *
 * Serve quando cambia quel che il nome racconta — una risorsa che passa da una
 * tappa all'altra — perché il nome di un file archiviato è la sua carta
 * d'identità fuori dalla cartella, e lasciarlo dire il falso è peggio che non
 * dirlo. Torna il percorso nuovo, o null se il file non si è potuto spostare:
 * in quel caso la riga tiene quello di prima e non si perde niente.
 */
export async function rinominaArchivio (
  vecchio: string,
  chiesto: string,
): Promise<string | null> {
  if (vecchio === chiesto) return vecchio
  const libero = await percorsoLibero(chiesto, vecchio)
  const dove = deposito()
  // Il file non c'è più: il riferimento resta dov'era.
  if (!dove || !dove.sposta(vecchio, libero)) return null
  return libero
}

// ------------------------------------------------------------- la migrazione

/** Le cartelle piatte di prima, da svuotare una volta sola. */
const VECCHIE = ['documenti', 'allegati', 'assenze', 'risorse']

/** Come si chiamava la cartella unica, quando era una sola. */
const VECCHIA_UNICA = 'documentazione'

/**
 * I documenti che il registro stampa da sé, per come cominciano i loro nomi.
 *
 * Serve a una prudenza sola: dividendo la cartella unica nelle due radici, un
 * file finisce fra le stampe solo se nessun JSON lo nomina *e* si chiama come
 * si chiamano le stampe. Tutto il resto va in `archivio/`, che è la cartella
 * che non si cancella: sbagliare da quella parte costa un file di troppo da
 * buttare a mano, sbagliare dall'altra costa una scansione persa.
 */
const DOCUMENTI_GENERATI = [
  'Verbali',
  'Piani',
  'Presenze',
  'Valutazioni',
  'Prove',
  'Fascicolo',
  DOCUMENTO_SCHEDE,
  ...DOCUMENTO_SCHEDE_PRIMA,
  'Foto della classe',
]

/**
 * Divide la vecchia cartella unica nelle due radici: `archivio/` per quel che è
 * stato caricato, `esportazioni/` per quel che il registro ha stampato.
 *
 * Di chi sia un file lo dicono i JSON e non il suo nome: ogni percorso salvato
 * nel registro — un allegato, un documento di consegna, un foglio firmato, una
 * foto — è roba caricata, perché le stampe il registro non se le segna. È
 * l'unico criterio che non sbaglia, e in più è quello che rende vera la
 * promessa dell'altra radice: se niente ci punta dentro, cancellarla non rompe
 * nessun riferimento.
 *
 * Il sottoalbero si conserva com'è: le due radici hanno la stessa struttura, e
 * qui cambia solo la prima cartella. Quel che resta da sistemare — le cartelle
 * per tipo di documento della disposizione di prima — lo sistema il passo dopo,
 * che gira su tutte e due le radici.
 */
async function dividiPerOrigine (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0
  const unica = apparato.Uri.joinPath(radice, VECCHIA_UNICA)
  if (!(await esisteFile(unica))) return 0

  const registro = archivio.registro
  // Tutti i percorsi che il registro si è segnato: sono i file caricati.
  const nominati = new Set<string>()
  for (const consegna of registro.consegne) {
    for (const spunta of consegna.fatte) if (spunta.file) nominati.add(spunta.file)
    for (const documento of consegna.documenti ?? []) nominati.add(documento.file)
    if (consegna.fileTutti) nominati.add(consegna.fileTutti)
    if (consegna.fileFirme) nominati.add(consegna.fileFirme)
  }
  for (const momento of registro.valutazioni) {
    for (const allegato of momento.allegati) nominati.add(allegato.file)
  }
  for (const fascicolo of registro.fascicoli) {
    for (const documento of fascicolo.documenti) if (documento.file) nominati.add(documento.file)
    for (const blocco of fascicolo.assenze) {
      for (const riga of blocco.righe) {
        for (const foglio of riga.fogli) nominati.add(foglio.file)
      }
    }
  }
  for (const piano of registro.piani) {
    for (const risorsa of [...piano.risorse, ...piano.attivita.flatMap((a) => a.risorse)]) {
      if (risorsa.file) nominati.add(risorsa.file)
    }
  }
  for (const classe of registro.classi) {
    for (const allievo of classe.allievi) if (allievo.foto) nominati.add(allievo.foto)
  }

  // Come comincia il nome di una stampa: `<classe>_<documento>_…`.
  const inizi = registro.classi.flatMap((classe) =>
    DOCUMENTI_GENERATI.map((documento) => nomeSicuro(`${classe.nome}_${documento}`)),
  )

  const spostamenti = new Map<string, string>()

  const percorri = async (cartella: apparato.Uri, dentro: string[]): Promise<void> => {
    for (const [nome, tipo] of await vociDi(cartella)) {
      const sotto = apparato.Uri.joinPath(cartella, nome)
      if (tipo === apparato.GenereFile.Directory) {
        await percorri(sotto, [...dentro, nome])
        await togliSeVuota(sotto)
        continue
      }
      const vecchio = [VECCHIA_UNICA, ...dentro, nome].join('/')
      const stampa = !nominati.has(vecchio) && inizi.some((inizio) => nome.startsWith(inizio))
      const nuovo = [stampa ? ESPORTAZIONI : ARCHIVIO, ...dentro, nome].join('/')
      const destinazione = apparato.Uri.joinPath(radice, ...nuovo.split('/'))
      if (await esisteFile(destinazione)) continue
      try {
        await apparato.file.createDirectory(apparato.Uri.joinPath(destinazione, '..'))
        await apparato.file.rename(sotto, destinazione, { overwrite: false })
        spostamenti.set(vecchio, nuovo)
      } catch {
        // Aperto altrove, o in sola lettura: resta dov'è e si riprova al giro
        // dopo. Un file che non si sposta non ferma gli altri.
      }
    }
  }

  await percorri(unica, [])
  await togliSeVuota(unica)
  if (spostamenti.size === 0) return 0

  riscriviPercorsi(archivio, (percorso) => spostamenti.get(percorso) ?? percorso)
  return spostamenti.size
}

/**
 * Riscrive tutti i percorsi che il registro si è segnato.
 *
 * Ogni spostamento di file finisce qui: sono cinque posti in quattro
 * collezioni, e trovarli uno per uno a ogni migrazione è il modo di
 * dimenticarne uno — e un riferimento dimenticato è un file che il pannello
 * dichiara sparito mentre sta lì.
 */
function riscriviPercorsi (archivio: Archivio, rifai: (percorso: string) => string): void {
  archivio.modifica((r) => {
    for (const consegna of r.consegne) {
      for (const spunta of consegna.fatte) if (spunta.file) spunta.file = rifai(spunta.file)
      for (const documento of consegna.documenti ?? []) documento.file = rifai(documento.file)
      if (consegna.fileTutti) consegna.fileTutti = rifai(consegna.fileTutti)
      if (consegna.fileFirme) consegna.fileFirme = rifai(consegna.fileFirme)
    }
    for (const momento of r.valutazioni) {
      for (const allegato of momento.allegati) allegato.file = rifai(allegato.file)
    }
    for (const fascicolo of r.fascicoli) {
      for (const documento of fascicolo.documenti) {
        if (documento.file) documento.file = rifai(documento.file)
      }
      for (const blocco of fascicolo.assenze) {
        for (const riga of blocco.righe) {
          for (const foglio of riga.fogli) foglio.file = rifai(foglio.file)
        }
      }
    }
    for (const piano of r.piani) {
      for (const risorsa of [...piano.risorse, ...piano.attivita.flatMap((a) => a.risorse)]) {
        if (risorsa.file) risorsa.file = rifai(risorsa.file)
      }
    }
    for (const classe of r.classi) {
      for (const allievo of classe.allievi) if (allievo.foto) allievo.foto = rifai(allievo.foto)
    }
  }, ['consegne', 'valutazioni', 'fascicoli', 'piani', 'classi'])
}

/** Travasa una cartella dentro un'altra, senza coprire quel che ci trova. */
async function travasa (da: apparato.Uri, a: apparato.Uri): Promise<boolean> {
  let qualcosa = false
  await apparato.file.createDirectory(a)
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

/**
 * I documenti che erano della classe e adesso sono del corso: presenze e
 * schede allievo, da `docente-di-classe/` alla cartella della materia.
 *
 * Si sposta solo per le classi che portano un corso solo. Con due materie il
 * file vecchio parlava davvero di tutte e due — le sue ore erano la somma — e
 * infilarlo sotto una delle due lo farebbe leggere come se fosse suo. Quelli
 * restano dov'erano: sono stampe, si rifanno, e la prossima esce già al posto
 * giusto.
 */
async function portaSottoIlCorso (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0
  const registro = archivio.registro
  let spostate = 0

  for (const classe of registro.classi) {
    const corsi = corsiDellaClasse(registro, classe.id)
    if (corsi.length !== 1) continue
    const materia = materiaDelCorso(registro, corsi[0])?.nome ?? corsi[0].titolo

    const daClasse = apparato.Uri.joinPath(
      radice,
      VECCHIA_UNICA,
      nomeSicuro(classe.nome),
      DOCENTE_DI_CLASSE,
    )
    for (const documento of DIVENTATI_DEL_CORSO) {
      const da = apparato.Uri.joinPath(daClasse, documento)
      if (!(await esisteFile(da))) continue
      const a = apparato.Uri.joinPath(
        radice,
        VECCHIA_UNICA,
        nomeSicuro(classe.nome),
        nomeSicuro(materia),
        documento,
      )
      if (await esisteFile(a)) {
        if (await travasa(da, a)) spostate += 1
      } else {
        try {
          await apparato.file.createDirectory(apparato.Uri.joinPath(a, '..'))
          await apparato.file.rename(da, a, { overwrite: false })
          spostate += 1
        } catch {
          if (await travasa(da, a)) spostate += 1
        }
      }
      await togliSeVuota(da)
    }
    await togliSeVuota(daClasse)
  }

  return spostate
}

/**
 * Divide in due la cartella di ogni ambito: quel che è della classe e quel che
 * è di una persona.
 *
 * Prima stavano mescolate — «Presenze», «Verbali» e «Schede allievo» una
 * accanto all'altra — e per arrivare al foglio di qualcuno si passava da venti
 * file che parlavano di tutti. Adesso i documenti della classe stanno sotto
 * `classe/` e quelli di una persona sotto `allievi/<Cognome Nome>/`, tutti
 * insieme: chi cerca «la roba di Rossi» apre una cartella sola.
 *
 * In nessuna delle due c'è una cartella per tipo di documento: erano cartelle
 * da un file, e una cartella che contiene una cosa sola è un clic in più per
 * arrivare a quella cosa. Quelle che si trovano si aprono e si svuotano dentro
 * la cartella che le contiene.
 *
 * Di chi sia un file lo dice il suo nome: `nomeFileArchivio` ci scrive dentro
 * il nome di chi riguarda, ed è per quello che ce lo scrive — un file esce
 * dalla sua cartella di continuo e deve saper dire da solo di chi è. Quello che
 * non nomina nessuno degli iscritti è della classe.
 *
 * `foto/` resta dov'è: non è un ambito, è l'anagrafica.
 */
async function dividiClasseEAllievi (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0

  const spostamenti = new Map<string, string>()

  /** Porta un file dove va adesso, e segna da dove veniva. */
  const porta = async (da: string[], a: string[]): Promise<void> => {
    const destinazione = apparato.Uri.joinPath(radice, ...a)
    if (await esisteFile(destinazione)) return
    try {
      await apparato.file.createDirectory(apparato.Uri.joinPath(destinazione, '..'))
      await apparato.file.rename(apparato.Uri.joinPath(radice, ...da), destinazione, {
        overwrite: false,
      })
      spostamenti.set(da.join('/'), a.join('/'))
    } catch {
      // Aperto altrove, o in sola lettura: resta dov'è e si riprova al giro
      // dopo. Un file che non si sposta non ferma gli altri.
    }
  }

  // Le due radici di adesso e quella di prima: se un file non si è potuto
  // spostare al passo precedente, la cartella vecchia c'è ancora e va
  // sistemata anche lei.
  for (const [radiceNome, classe] of [VECCHIA_UNICA, ARCHIVIO, ESPORTAZIONI].flatMap(
    (nome) => archivio.registro.classi.map((c) => [nome, c] as const),
  )) {
    const nomeClasse = nomeSicuro(classe.nome)
    const cartellaClasse = apparato.Uri.joinPath(radice, radiceNome, nomeClasse)
    // Come il nome di ognuno compare dentro il nome di un file suo.
    const iscritti = classe.allievi.map((allievo) => nomeSicuro(nomeCompleto(allievo)))
    const diChi = (file: string) => iscritti.find((nome) => file.includes(nome)) ?? null

    for (const ambito of await sottocartelleDi(cartellaClasse)) {
      // L'anagrafica non è un ambito e non si tocca.
      if (ambito === FOTO) continue
      const cartellaAmbito = apparato.Uri.joinPath(cartellaClasse, ambito)

      for (const dentro of await sottocartelleDi(cartellaAmbito)) {
        // `allievi/` è già a posto: dentro ci sono le cartelle delle persone,
        // e dentro quelle i file.
        if (dentro === DEGLI_ALLIEVI) continue

        // `classe/` può portarsi dietro le cartelle per documento della
        // disposizione di prima: si svuotano dentro di lei.
        if (dentro === DI_CLASSE) {
          const suoi = apparato.Uri.joinPath(cartellaAmbito, DI_CLASSE)
          for (const documento of await sottocartelleDi(suoi)) {
            const da = apparato.Uri.joinPath(suoi, documento)
            for (const [file, tipo] of await vociDi(da)) {
              if (tipo !== apparato.GenereFile.File) continue
              const base = [radiceNome, nomeClasse, ambito, DI_CLASSE]
              await porta([...base, documento, file], [...base, file])
            }
            await togliSeVuota(da)
          }
          continue
        }

        // Una cartella per documento della disposizione vecchia: i suoi file si
        // dividono fra le due nuove, **restando nella radice in cui stanno**.
        // La destinazione era cablata su `documentazione/` mentre l'origine gira
        // su tre radici: quel che `dividiPerOrigine` aveva appena messo in
        // `archivio/` e in `esportazioni/` tornava indietro nella cartella
        // vecchia, e con lui il percorso riscritto nel registro. Il blocco di
        // `classe/` qui sopra la radice la porta da tutte e due le parti: è lui
        // che dice qual era l'intenzione.
        const da = apparato.Uri.joinPath(cartellaAmbito, dentro)
        for (const [file, tipo] of await vociDi(da)) {
          if (tipo !== apparato.GenereFile.File) continue
          const suo = diChi(file)
          await porta(
            [radiceNome, nomeClasse, ambito, dentro, file],
            [
              radiceNome,
              nomeClasse,
              ambito,
              ...(suo ? [DEGLI_ALLIEVI, suo] : [DI_CLASSE]),
              file,
            ],
          )
        }
        await togliSeVuota(da)
      }

      // I file lasciati nella radice dell'ambito — ce ne sono di vecchi — vanno
      // dove vanno tutti gli altri.
      for (const [file, tipo] of await vociDi(cartellaAmbito)) {
        if (tipo !== apparato.GenereFile.File) continue
        const suo = diChi(file)
        await porta(
          [radiceNome, nomeClasse, ambito, file],
          [
            radiceNome,
            nomeClasse,
            ambito,
            ...(suo ? [DEGLI_ALLIEVI, suo] : [DI_CLASSE]),
            file,
          ],
        )
      }
    }
  }

  if (spostamenti.size === 0) return 0
  riscriviPercorsi(archivio, (percorso) => spostamenti.get(percorso) ?? percorso)
  return spostamenti.size
}

/**
 * Scambia le prime due cartelle: la materia passa davanti alla classe.
 *
 * Prima era `archivio/<classe>/<materia>/`, e la cartella che si teneva aperta
 * era quella di una classe. Ma un insegnamento si porta in più classi con lo
 * stesso materiale — la verifica, la sua soluzione, i piani — e con la classe
 * davanti la stessa verifica stava in tre posti lontani: per riusarla si doveva
 * ricordare in quale classe la si era fatta per prima. Con la materia davanti
 * il materiale di un corso sta tutto insieme, e sotto ogni materia le sue
 * classi.
 *
 * Si riconosce la disposizione vecchia dal nome della prima cartella: se è
 * quello di una classe del registro, quel che c'è dentro va scambiato. Dopo lo
 * scambio le prime cartelle sono materie e `docente-di-classe`, e il giro
 * seguente non trova più niente da fare.
 *
 * `foto/` non è una materia: l'anagrafica è della classe, e va sotto
 * `docente-di-classe/<classe>/foto/` con il resto di quel che la riguarda.
 */
async function portaLaMateriaDavanti (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0

  const classi = new Set(archivio.registro.classi.map((c) => nomeSicuro(c.nome)))
  if (classi.size === 0) return 0

  const spostamenti = new Map<string, string>()

  /** Travasa un albero di file da una parte all'altra, segnando dove finiscono. */
  const porta = async (da: string[], a: string[]): Promise<void> => {
    for (const [nome, tipo] of await vociDi(apparato.Uri.joinPath(radice, ...da))) {
      if (tipo === apparato.GenereFile.Directory) {
        await porta([...da, nome], [...a, nome])
        await togliSeVuota(apparato.Uri.joinPath(radice, ...da, nome))
        continue
      }
      const destinazione = apparato.Uri.joinPath(radice, ...a, nome)
      if (await esisteFile(destinazione)) continue
      try {
        await apparato.file.createDirectory(apparato.Uri.joinPath(radice, ...a))
        await apparato.file.rename(
          apparato.Uri.joinPath(radice, ...da, nome),
          destinazione,
          { overwrite: false },
        )
        spostamenti.set([...da, nome].join('/'), [...a, nome].join('/'))
      } catch {
        // Aperto altrove, o in sola lettura: resta dov'è e si riprova al giro
        // dopo. Un file che non si sposta non ferma gli altri.
      }
    }
  }

  for (const radiceNome of [ARCHIVIO, ESPORTAZIONI]) {
    const dentro = apparato.Uri.joinPath(radice, radiceNome)
    for (const nomeClasse of await sottocartelleDi(dentro)) {
      // La prima cartella è già una materia: questa radice è a posto.
      if (!classi.has(nomeClasse)) continue
      const cartellaClasse = apparato.Uri.joinPath(dentro, nomeClasse)
      for (const ambito of await sottocartelleDi(cartellaClasse)) {
        await porta(
          [radiceNome, nomeClasse, ambito],
          ambito === FOTO
            ? [radiceNome, DOCENTE_DI_CLASSE, nomeClasse, FOTO]
            : [radiceNome, ambito, nomeClasse],
        )
        await togliSeVuota(apparato.Uri.joinPath(cartellaClasse, ambito))
      }
      await togliSeVuota(cartellaClasse)
    }
  }

  if (spostamenti.size === 0) return 0
  riscriviPercorsi(archivio, (percorso) => spostamenti.get(percorso) ?? percorso)
  return spostamenti.size
}

/**
 * Sposta nell'archivio quel che era stato salvato con la disposizione di prima,
 * e aggiorna i percorsi dentro il registro.
 *
 * Si fa in lettura, una volta, e si può interrompere: ogni file spostato ha già
 * il suo percorso riscritto, e quel che resta indietro verrà ripreso al giro
 * dopo. Un file che non si trova più non ferma niente — il riferimento resta
 * com'è, e il pannello lo segnalerà come rotto quando qualcuno prova ad aprirlo.
 */
export async function migraArchivio (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0

  // Nell'ordine in cui le disposizioni si sono succedute: prima si mette a
  // posto la cartella unica, poi la si divide in due radici, poi si sistemano
  // le sottocartelle, e alla fine la materia passa davanti alla classe. Gli
  // ultimi due passi girano su tutte e due le radici.
  const unificate =
    (await portaSottoIlCorso(archivio)) +
    (await dividiPerOrigine(archivio)) +
    (await dividiClasseEAllievi(archivio)) +
    (await portaLaMateriaDavanti(archivio))

  // Niente da fare se le cartelle vecchie non esistono: è il caso normale.
  const daFare: string[] = []
  for (const vecchia of VECCHIE) {
    try {
      await apparato.file.stat(apparato.Uri.joinPath(radice, vecchia))
      daFare.push(vecchia)
    } catch {
      // Non c'è: bene così.
    }
  }
  if (daFare.length === 0) return unificate

  const registro = archivio.registro
  const spostamenti: Array<{ vecchio: string, nuovo: string }> = []

  // Le consegne tengono i file in quattro posti: i documenti di ognuno, quello
  // uguale per tutti, il foglio delle firme, e le spunte di prima — che la
  // normalizzazione ha già quasi sempre svuotato dentro i documenti.
  for (const consegna of registro.consegne) {
    const classe = classeDelCorsoId(registro, consegna.corsoId)
    if (!classe) continue
    const nomeDi = (allievoId: string | null, dettaglio: string | null, file: string) => {
      const allievo = allievoId ? classe.allievi.find((a) => a.id === allievoId) ?? null : null
      return percorsoConsegna(
        classe,
        nomeFileArchivio(
          classe.nome,
          allievo ? nomeCompleto(allievo) : null,
          consegna.testo,
          dettaglio,
          estensioneDi(file),
        ),
      )
    }
    const daSpostare = (file: string | undefined): file is string =>
      Boolean(file && file.startsWith('documenti/'))

    for (const spunta of consegna.fatte) {
      if (!daSpostare(spunta.file)) continue
      const allievo = classe.allievi.find((a) => a.id === spunta.chi) ?? null
      spostamenti.push({ vecchio: spunta.file, nuovo: nomeDi(allievo?.id ?? null, allievo ? null : 'mio', spunta.file) })
    }
    for (const documento of consegna.documenti ?? []) {
      if (!daSpostare(documento.file)) continue
      const allievo = classe.allievi.find((a) => a.id === documento.allievoId) ?? null
      spostamenti.push({ vecchio: documento.file, nuovo: nomeDi(allievo?.id ?? null, allievo ? null : 'mio', documento.file) })
    }
    if (daSpostare(consegna.fileTutti)) {
      spostamenti.push({ vecchio: consegna.fileTutti, nuovo: nomeDi(null, 'per tutti', consegna.fileTutti) })
    }
    if (daSpostare(consegna.fileFirme)) {
      spostamenti.push({ vecchio: consegna.fileFirme, nuovo: nomeDi(null, 'firme di consegna', consegna.fileFirme) })
    }
  }

  for (const momento of registro.valutazioni) {
    const classe = classeDelCorsoId(registro, momento.corsoId)
    const corso = registro.corsi.find((c) => c.id === momento.corsoId) ?? null
    if (!classe) continue
    for (const allegato of momento.allegati) {
      if (!allegato.file || !allegato.file.startsWith('allegati/')) continue
      const allievo = allegato.allievoId
        ? classe.allievi.find((a) => a.id === allegato.allievoId) ?? null
        : null
      spostamenti.push({
        vecchio: allegato.file,
        nuovo: percorsoValutazione(
          classe,
          corso,
          nomeFileArchivio(
            classe.nome,
            allievo ? nomeCompleto(allievo) : null,
            momento.titolo,
            allievo ? 'prova' : allegato.ruolo,
            estensioneDi(allegato.file),
          ),
        ),
      })
    }
  }

  // I fogli delle assenze: stavano in una cartella tutta loro, e sono documenti
  // del docente di classe come gli altri.
  for (const fascicolo of registro.fascicoli) {
    const classe = registro.classi.find((c) => c.id === fascicolo.classeId)
    if (!classe) continue
    for (const blocco of fascicolo.assenze) {
      for (const riga of blocco.righe) {
        for (const foglio of riga.fogli) {
          if (!foglio.file || !foglio.file.startsWith('assenze/')) continue
          const allievo = classe.allievi.find((a) => a.id === riga.allievoId) ?? null
          spostamenti.push({
            vecchio: foglio.file,
            nuovo: percorsoArchivio(
              classe.nome,
              null,
              blocco.etichetta,
              nomeFileArchivio(
                classe.nome,
                allievo ? nomeCompleto(allievo) : null,
                blocco.etichetta,
                `${foglio.tipo}${foglio.firmato ? ' firmato' : ''}`,
                estensioneDi(foglio.file),
              ),
            ),
          })
        }
      }
    }
  }

  // Le risorse dei piani: stavano in `risorse/<id del piano>`, cartelle che
  // il registro ritrovava benissimo e una persona no. Vanno con gli altri
  // documenti del corso, sotto il nome del piano e della tappa che le usa.
  for (const piano of registro.piani) {
    const appese: Array<{ attivita: Attivita | null, risorsa: Risorsa }> = [
      ...piano.risorse.map((risorsa) => ({ attivita: null, risorsa })),
      ...piano.attivita.flatMap((a) => a.risorse.map((risorsa) => ({ attivita: a, risorsa }))),
    ]
    for (const { attivita, risorsa } of appese) {
      if (!risorsa.file || !risorsa.file.startsWith('risorse/')) continue
      const nome = risorsa.nome || risorsa.file.split('/').pop() || 'risorsa'
      spostamenti.push({
        vecchio: risorsa.file,
        nuovo: percorsoRisorsaPiano(registro, piano, attivita, nome),
      })
    }
  }

  let spostati = 0
  const riusciti = new Map<string, string>()
  // Due voci che vorrebbero lo stesso nome — due omonimi, due prove dello
  // stesso ruolo in un registro vecchio — non si spostano una sull'altra:
  // la seconda prende un numero, e nessun file copre un altro.
  const occupati = new Set<string>()
  for (const { vecchio, nuovo: chiesto } of spostamenti) {
    if (riusciti.has(vecchio)) continue
    let nuovo = await percorsoLibero(chiesto)
    while (occupati.has(nuovo)) nuovo = await percorsoLibero(`${nuovo.replace(/(\.[^./]+)$/, '')} (${occupati.size + 2})${estensioneDi(nuovo)}`)
    // Il file non c'è più: il riferimento resta com'era.
    if (deposito()?.sposta(vecchio, nuovo)) {
      riusciti.set(vecchio, nuovo)
      occupati.add(nuovo)
      spostati += 1
    }
  }

  if (riusciti.size > 0) {
    archivio.modifica((r) => {
      for (const consegna of r.consegne) {
        for (const spunta of consegna.fatte) {
          const nuovo = spunta.file ? riusciti.get(spunta.file) : undefined
          if (nuovo) spunta.file = nuovo
        }
        for (const documento of consegna.documenti ?? []) {
          const nuovo = riusciti.get(documento.file)
          if (nuovo) documento.file = nuovo
        }
        if (consegna.fileTutti && riusciti.has(consegna.fileTutti)) {
          consegna.fileTutti = riusciti.get(consegna.fileTutti)
        }
        if (consegna.fileFirme && riusciti.has(consegna.fileFirme)) {
          consegna.fileFirme = riusciti.get(consegna.fileFirme)
        }
      }
      for (const momento of r.valutazioni) {
        for (const allegato of momento.allegati) {
          const nuovo = riusciti.get(allegato.file)
          if (nuovo) allegato.file = nuovo
        }
      }
      for (const fascicolo of r.fascicoli) {
        for (const blocco of fascicolo.assenze) {
          for (const riga of blocco.righe) {
            for (const foglio of riga.fogli) {
              const nuovo = riusciti.get(foglio.file)
              if (nuovo) foglio.file = nuovo
            }
          }
        }
      }
      for (const piano of r.piani) {
        for (const risorsa of [...piano.risorse, ...piano.attivita.flatMap((a) => a.risorse)]) {
          const nuovo = risorsa.file ? riusciti.get(risorsa.file) : undefined
          if (nuovo) risorsa.file = nuovo
        }
      }
    }, ['consegne', 'valutazioni', 'fascicoli', 'piani'])
  }

  // Le cartelle vecchie se ne vanno solo se non è rimasto niente dentro: un
  // file che nessuno ha registrato — messo lì a mano — non si butta.
  for (const vecchia of daFare) {
    await togliSeVuota(apparato.Uri.joinPath(radice, vecchia))
  }

  return spostati + unificate
}

/** Cancella una cartella e le sue sottocartelle, ma solo se non c'è più niente. */
async function togliSeVuota (cartella: apparato.Uri): Promise<boolean> {
  // Una lettura che solleva, e non `vociDi`: quella su errore torna un elenco
  // vuoto, e una cartella che non si è potuta leggere sembrerebbe vuota — e
  // verrebbe cancellata senza cestino con dentro quel che non si è visto. Su
  // errore non si tocca niente, come per una cartella che non c'è.
  let voci: Array<[string, apparato.GenereFile]>
  try {
    voci = await apparato.file.readDirectory(cartella)
  } catch {
    return false
  }
  for (const [nome, tipo] of voci) {
    if (tipo !== apparato.GenereFile.Directory) return false
    if (!(await togliSeVuota(apparato.Uri.joinPath(cartella, nome)))) return false
  }
  try {
    await apparato.file.delete(cartella, { recursive: true, useTrash: false })
    return true
  } catch {
    return false
  }
}
