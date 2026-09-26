// Dove finisce ogni documento che entra nel registro, e con che nome:
// `archivio/<materia>/<classe>/<chi>/<file>`, con la materia del corso per i
// documenti dell'insegnamento e `docente-di-classe` per quelli della classe.
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
// La materia sta davanti perché i documenti di un insegnamento valgono per più
// classi. Nomi leggibili perché la cartella si apre anche da fuori. I percorsi
// salvati nel registro sono per esteso: conta dove il file sta, non dove la
// regola lo metterebbe oggi.

import * as apparato from 'apparato'

import { nomeCompleto } from '../domain/calculations.js'
import { deposito } from './store.js'
import { classeDelCorsoId, corsiDellaClasse, materiaDelCorso } from '../domain/courses.js'
import { testi as date } from '../domain/dates.testi.js'
import { DOCUMENTO_SCHEDE_PRIMA } from '../domain/lexicon.js'
import { nomiDelleSchede } from '../domain/lexicon.testi.js'
import { testi as percorsi } from '../domain/locations.testi.js'
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
  togliSeVuota,
  travasa,
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
} from '../domain/locations.js'
import { testi } from './filing.testi.js'

// Le regole dei nomi stanno nel dominio (le usa anche il webview); si
// riesportano qui perché chi archivia importi un file solo.
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
}

/**
 * I documenti da spostare da `docente-di-classe/` sotto il corso (le presenze
 * sono di un insegnamento), con i nomi di ogni lingua e quelli di prima.
 */
function diventatiDelCorso (): string[] {
  return [
    ...new Set([
      ...percorsi.tutte().map((lingua) => lingua.documenti.presenze),
      ...nomiDelleSchede(DOCUMENTO_SCHEDE_PRIMA),
    ]),
  ]
}

/**
 * Un file vero per un documento archiviato, per chi sa aprire solo file (un
 * lettore PDF): se ne materializza una copia. Per leggerlo basta il deposito.
 */
export async function uriArchivio (relativo: string): Promise<apparato.Uri | null> {
  return (await deposito()?.materializza(relativo)) ?? null
}

/**
 * L'inventario di `esportazioni/` per il webview, dall'indice del documento in
 * memoria: nessun file si apre.
 */
export function esportazioniPresenti (): Array<{
  percorso: string
  misura: number
  revisione: number
}> {
  return quelCheCè(ESPORTAZIONI)
}

/**
 * L'inventario di `archivio/` e della quarantena per il pannello: per lui un
 * file «c'è» solo se compare qui. Le anteprime della quarantena restano fuori:
 * sono immagini di servizio, non fogli.
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
    // Fa ricaricare l'anteprima anche quando nome e misura non cambiano.
    revisione: dove.revisione(percorso),
  }))
}

/**
 * Il percorso chiesto se libero, altrimenti con un numero («Rossi Mario (2).pdf»):
 * due omonimi non si coprono. `sostituibile` è il file che si rimpiazza apposta.
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
 * Riscrive un documento generato al percorso esatto: un rapporto è una
 * fotografia di adesso. Toglie (nel cestino) i doppioni numerati e la stessa
 * stampa in un'altra lingua. `doppioni: false` spegne queste pulizie per i
 * fascicoli, dove «Schede (2)» è un nome scelto, non una ristampa.
 */
export async function riscrivi (
  relativo: string,
  byte: Uint8Array,
  precedenti: readonly string[] = [],
  { doppioni = true }: { doppioni?: boolean } = {},
): Promise<EsitoArchivio> {
  const dove = deposito()
  if (!dove) return { errore: testi().nessunAnno }
  dove.scrivi(relativo, byte)
  if (doppioni) {
    togliDoppioni(relativo)
    togliAltreLingue(relativo)
  }
  // Solo dopo aver scritto la nuova copia: i vecchi nomi sono dello stesso PDF.
  for (const precedente of precedenti) {
    if (precedente === relativo || !precedente.startsWith(`${ESPORTAZIONI}/`)) continue
    if (cartellaDelPercorso(precedente) !== cartellaDelPercorso(relativo)) continue
    dove.elimina(precedente)
    if (doppioni) togliDoppioni(precedente)
  }
  return { relativo }
}

/** I «(2)», «(3)» dello stesso documento nella stessa cartella: nel cestino. */
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

/**
 * La stessa stampa in un'altra lingua: nel cestino. Stessa cartella e nome
 * identico tolte le parole tradotte (documento, «anno intero»).
 */
function togliAltreLingue (relativo: string): void {
  const dove = deposito()
  if (!dove || !relativo.startsWith(`${ESPORTAZIONI}/`)) return
  const parole = paroleDelleStampe()
  const cercato = senzaLingua(relativo, parole)
  for (const voce of dove.fileIn(cartellaDelPercorso(relativo))) {
    if (voce !== relativo && senzaLingua(voce, parole) === cercato) dove.elimina(voce)
  }
}

/**
 * Le parole tradotte dei nomi delle stampe, in ogni lingua, verso il loro senso
 * («Präsenzliste» → `presenze`). Il carattere nullo davanti non può stare in un
 * nome vero: `nomeSicuro` lo toglie.
 */
function paroleDelleStampe (): Map<string, string> {
  const parole = new Map<string, string>()
  const segna = (cosa: string, parola: string) => parole.set(nomeSicuro(parola), `\u0000${cosa}`)
  for (const lingua of percorsi.tutte()) {
    for (const [cosa, parola] of Object.entries(lingua.documenti)) segna(cosa, parola)
  }
  for (const parola of nomiDelleSchede(DOCUMENTO_SCHEDE_PRIMA)) segna('schede', parola)
  for (const lingua of date.tutte()) segna('annoIntero', lingua.annoIntero)
  return parole
}

/** Il nome di un file con le parole della lingua al posto di quel che vogliono dire. */
function senzaLingua (relativo: string, parole: ReadonlyMap<string, string>): string {
  const nome = relativo.split('/').pop() ?? ''
  const punto = nome.lastIndexOf('.')
  const radice = punto > 0 ? nome.slice(0, punto) : nome
  const estensione = punto > 0 ? nome.slice(punto) : ''
  return radice.split('_').map((pezzo) => parole.get(pezzo) ?? pezzo).join('_') + estensione
}

/** Un testo che dentro un'espressione regolare vale per quel che è. */
function scappa (testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/** Com'è andata una scrittura nell'archivio: il percorso, o perché no. */
type EsitoArchivio = { relativo: string } | { errore: string }

/**
 * Scrive un file nell'archivio. Torna il percorso da salvare (diverso dal
 * chiesto se era preso) o il motivo del rifiuto.
 */
export async function archivia (
  relativo: string,
  byte: Uint8Array,
  sostituibile: string | null = null,
): Promise<EsitoArchivio> {
  const libero = await percorsoLibero(relativo, sostituibile)
  const dove = deposito()
  if (!dove) return { errore: testi().nessunAnno }
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
  if (!dove) return { errore: testi().nessunAnno }
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
 * `archivio/docente-di-classe/<classe>/foto/<Cognome Nome>.jpg`. Della classe,
 * non di una materia; col nome della persona perché si apre anche da fuori.
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
 * Dove finisce un file allegato a un piano o a una tappa: con i documenti del
 * corso. Il nome originale resta, preceduto da classe, piano e tappa, così dice
 * da dove viene anche fuori dall'archivio.
 */
export function percorsoRisorsaPiano (
  registro: Registro,
  piano: PianoLezione,
  attivita: Attivita | null,
  nomeOriginale: string,
): string {
  const classe = piano.corsoId ? classeDelCorsoId(registro, piano.corsoId) : null
  const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
  // testo-fisso: una cartella sotto `archivio/`, che non cambia con la lingua
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
 * Sposta un file dell'archivio dove la regola lo metterebbe adesso (per esempio
 * una risorsa passata a un'altra tappa). Torna il percorso nuovo, o `null` se
 * non si è potuto: allora si tiene quello di prima.
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

/** Le cartelle piatte della disposizione vecchia, da svuotare. */
const VECCHIE = ['documenti', 'allegati', 'assenze', 'risorse']

/** La cartella unica della disposizione vecchia. */
const VECCHIA_UNICA = 'documentazione'

/**
 * I nomi dei documenti che il registro stampa, in ogni lingua. Un file va fra
 * le stampe solo se si chiama così *e* nessun JSON lo nomina; nel dubbio va in
 * `archivio/`, che non si cancella.
 */
function documentiGenerati (): string[] {
  return [
    ...new Set([
      ...percorsi.tutte().flatMap((lingua) => Object.values(lingua.documenti)),
      ...nomiDelleSchede(DOCUMENTO_SCHEDE_PRIMA),
    ]),
  ]
}

/**
 * Divide la cartella unica in `archivio/` (caricato) ed `esportazioni/`
 * (stampato). Decidono i JSON: ogni percorso salvato è un caricamento, le stampe
 * non si segnano. Il sottoalbero resta com'è; il riordino è il passo dopo.
 */
async function dividiPerOrigine (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0
  const unica = apparato.Uri.joinPath(radice, VECCHIA_UNICA)
  if (!(await esisteFile(unica))) return 0

  const registro = archivio.registro
  // I percorsi segnati nel registro: sono i file caricati.
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
  const generati = documentiGenerati()
  const inizi = registro.classi.flatMap((classe) =>
    generati.map((documento) => nomeSicuro(`${classe.nome}_${documento}`)),
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
        // Aperto altrove o in sola lettura: resta, si riprova, gli altri vanno avanti.
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
 * Riscrive tutti i percorsi segnati nel registro. Ogni spostamento passa di qui,
 * così nessuno dei posti che tengono un file viene dimenticato.
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

/**
 * Presenze e schede allievo da `docente-di-classe/` alla cartella della materia.
 * Solo per classi con un corso solo: con due, il file parla di entrambe e resta
 * (è una stampa, si rifà al posto giusto).
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
    for (const documento of diventatiDelCorso()) {
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
 * Divide ogni ambito in `classe/` e `allievi/<Cognome Nome>/`, svuotando le
 * cartelle per tipo di documento. Di chi è un file lo dice il nome (lo scrive
 * `nomeFileArchivio`); se non nomina nessun iscritto è della classe. `foto/` resta.
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
      // Aperto altrove o in sola lettura: resta, si riprova, gli altri vanno avanti.
    }
  }

  // Anche la cartella unica: può restare qualcosa che il passo prima non ha spostato.
  for (const [radiceNome, classe] of [VECCHIA_UNICA, ARCHIVIO, ESPORTAZIONI].flatMap(
    (nome) => archivio.registro.classi.map((c) => [nome, c] as const),
  )) {
    const nomeClasse = nomeSicuro(classe.nome)
    const cartellaClasse = apparato.Uri.joinPath(radice, radiceNome, nomeClasse)
    // Il nome di ognuno come compare nei nomi dei suoi file.
    const iscritti = classe.allievi.map((allievo) => nomeSicuro(nomeCompleto(allievo)))
    const diChi = (file: string) => iscritti.find((nome) => file.includes(nome)) ?? null

    for (const ambito of await sottocartelleDi(cartellaClasse)) {
      if (ambito === FOTO) continue
      const cartellaAmbito = apparato.Uri.joinPath(cartellaClasse, ambito)

      for (const dentro of await sottocartelleDi(cartellaAmbito)) {
        if (dentro === DEGLI_ALLIEVI) continue

        // Cartelle per documento dentro `classe/`: si svuotano in `classe/`.
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

        // Una cartella per documento: i file vanno in `classe/` o `allievi/`,
        // restando nella radice in cui stanno.
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

      // I file sciolti nella cartella dell'ambito, allo stesso modo.
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
 * Da `<radice>/<classe>/<materia>/` a `<radice>/<materia>/<classe>/`. Si
 * riconosce dal primo livello che porta il nome di una classe; `foto/` va sotto
 * `docente-di-classe/<classe>/foto/`.
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
        // Aperto altrove o in sola lettura: resta, si riprova, gli altri vanno avanti.
      }
    }
  }

  for (const radiceNome of [ARCHIVIO, ESPORTAZIONI]) {
    const dentro = apparato.Uri.joinPath(radice, radiceNome)
    for (const nomeClasse of await sottocartelleDi(dentro)) {
      // Già una materia: a posto.
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
 * Porta nell'archivio i file delle disposizioni vecchie e aggiorna i percorsi nel
 * registro. Interrompibile: quel che resta si riprende la volta dopo; un file
 * sparito lascia il riferimento com'è.
 */
export async function migraArchivio (archivio: Archivio): Promise<number> {
  const radice = cartellaAnno()
  if (!radice) return 0

  // L'ordine conta: ogni passo si aspetta la disposizione lasciata dal precedente.
  const unificate =
    (await portaSottoIlCorso(archivio)) +
    (await dividiPerOrigine(archivio)) +
    (await dividiClasseEAllievi(archivio)) +
    (await portaLaMateriaDavanti(archivio))

  // Le cartelle piatte, se ci sono (di solito no).
  const daFare: string[] = []
  for (const vecchia of VECCHIE) {
    try {
      await apparato.file.stat(apparato.Uri.joinPath(radice, vecchia))
      daFare.push(vecchia)
    } catch {
      // Non c'è.
    }
  }
  if (daFare.length === 0) return unificate

  const registro = archivio.registro
  const spostamenti: Array<{ vecchio: string, nuovo: string }> = []

  // Le consegne tengono file in quattro posti: spunte, documenti, file per tutti, firme.
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
      // testo-fisso: un nome sotto `archivio/`, che non cambia con la lingua
      spostamenti.push({ vecchio: consegna.fileTutti, nuovo: nomeDi(null, 'per tutti', consegna.fileTutti) })
    }
    if (daSpostare(consegna.fileFirme)) {
      // testo-fisso: un nome sotto `archivio/`, che non cambia con la lingua
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

  // I fogli delle assenze: documenti del docente di classe.
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

  // Le risorse dei piani: con i documenti del corso, col nome di piano e tappa.
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
  // Due voci con lo stesso nome (omonimi): la seconda prende un numero.
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

  // Solo se vuote: un file messo lì a mano non si butta.
  for (const vecchia of daFare) {
    await togliSeVuota(apparato.Uri.joinPath(radice, vecchia))
  }

  return spostati + unificate
}

