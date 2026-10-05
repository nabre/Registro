import { inizioLezione, lezioneFinita } from '#core/dominio/calculations.js'
import { raggruppamentoDeiCorsi, type RaggruppamentoCorsi } from '#core/dominio/courses.js'
import type { Corso } from '#core/dominio/models.js'
import { confrontaNomi } from '#core/dominio/text.js'
import { interruttoreAssistente } from './assistant.js'
// Navbar: File, destinazioni e contesto; sotto, azioni compatte della pagina.

import {
  useSyncExternalStore,
  type KeyboardEvent as EventoTastiera,
  type MouseEvent as EventoMouse,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  aiutoDi,
  comandoPerId,
  eseguiComando,
  gruppiDelMenu,
  gruppiDellaPagina,
  gruppiDi,
  impedimentoDi,
  primarioDi,
  titoloDi,
  type ComandoUI,
} from './commands.js'
import { Icona, type NomeIcona } from './components/icons.js'
import {
  alternaMenuSotto,
  menuSotto,
  tendinaAperta,
  type ElementoMenu,
} from './components/menu.js'
import { notifica } from './components/notifications.js'
import { avvisoRiservato, segnaBlocco, statoDelloSchermo } from './components/projection.js'
import {
  classeDelFascicolo,
  classeDellaPaginaClassi,
  corsoDelContesto,
  lezioneDelContesto,
  nomeDelCorso,
  scegliClasseDelFascicolo,
  scegliCorso,
  siFiltraLAgenda,
  siLavoraSuUnCorso,
  siLavoraSuUnaClasse,
} from './context.js'
import { classi } from './classNames.js'
import { nomeDelPosto } from './pages.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './commandBar.testi.js'
import { azione } from './bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiNelSemestre,
  classePerId,
  coloreDiCorso,
  materiaPerId,
  nomeClasse,
  nomeMateria,
  stato,
  vai,
} from './state.js'
import { nomeSemestre } from '#core/dominio/dates.js'

// ------------------------------------------------------- i comandi in volo

/** Quanto aspettare prima della rotella: le azioni istantanee non lampeggiano. */
const RITARDO_ROTELLA = 150

/** Un comando partito e non ancora tornato: la rotella compare dopo `RITARDO_ROTELLA`. */
interface InVolo {
  rotella: boolean
}

/**
 * I comandi partiti e non ancora tornati, per id. Di modulo e non del
 * pulsante: la barra si ridisegna, e può sparire e tornare, mentre il comando
 * è in volo, e il pulsante deve restare spento (se no un secondo clic lo
 * rilancia) finché la risposta torna. Ogni cambio è un oggetto nuovo, così chi
 * guarda (`useInVolo`) lo vede.
 */
const comandiInVolo = new Map<string, InVolo>()

/** I pulsanti che guardano i comandi in volo. */
const guardiani = new Set<() => void>()

function avvisaGuardiani (): void {
  for (const guarda of [...guardiani]) guarda()
}

function guarda (avvisami: () => void): () => void {
  guardiani.add(avvisami)
  return () => { guardiani.delete(avvisami) }
}

/** Se il comando è in volo, e se mostra già la rotella. */
function useInVolo (id: string): InVolo | undefined {
  return useSyncExternalStore(guarda, () => comandiInVolo.get(id))
}

/**
 * Esegue il comando dal suo pulsante, e se parla con l'host lo tiene in volo:
 * ogni pulsante di quel comando resta spento, e dopo un attimo mostra la
 * rotella, finché la risposta torna.
 */
function eseguiDalPulsante (comando: ComandoUI): void {
  // Passa da `eseguiComando` come palette e scorciatoie: il controllo sta in un posto solo.
  const esito = eseguiComando(comando)
  // Un comando che parla con l'host tiene la rotella finché la risposta torna.
  if (!(esito instanceof Promise)) return
  const id = comando.id
  const proprio: InVolo = { rotella: false }
  comandiInVolo.set(id, proprio)
  avvisaGuardiani()
  const rotella = setTimeout(() => {
    if (comandiInVolo.get(id) !== proprio) return
    comandiInVolo.set(id, { rotella: true })
    avvisaGuardiani()
  }, RITARDO_ROTELLA)
  const torna = () => {
    clearTimeout(rotella)
    comandiInVolo.delete(id)
    avvisaGuardiani()
  }
  esito.then(torna, torna)
}

/** Il pulsante di un comando nella riga delle azioni (vedi `pulsanteComando`). */
function PulsanteComando ({ comando }: { comando: ComandoUI }): ReactElement {
  const inVolo = useInVolo(comando.id)
  const impedito = impedimentoDi(comando)
  const aiuto = aiutoDi(comando)
  const titolo = titoloDi(comando)
  const acceso = comando.acceso?.() ?? false
  const spento = Boolean(impedito) || inVolo !== undefined
  // Il motivo del no vince sull'aiuto; la scorciatoia in coda, come altrove.
  // Sul pulsante non si scrive: lo affollerebbe, e la dicono il titolo e il menu.
  const spiegazione = [
    impedito ?? aiuto,
    comando.scorciatoia && `(${comando.scorciatoia})`,
  ]
    .filter(Boolean)
    .join(' ')
  // Le schede della proiezione hanno uno stato in più dei comandi: lo dice
  // `segnaBlocco`, che per gli altri pulsanti torna `null`.
  const blocco = segnaBlocco(comando, spento)

  return (
    <button
      className={classi(
        'comando',
        primarioDi(comando) && 'comando--primario',
        acceso && 'comando--acceso',
        ...(blocco?.classi ?? []),
        inVolo?.rotella && 'in-corso',
      )}
      type="button"
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco={`comando-${comando.id}`}
      disabled={spento}
      aria-busy={inVolo?.rotella ? true : undefined}
      title={blocco?.titolo ?? (spiegazione ? `${titolo} — ${spiegazione}` : titolo)}
      // `disabled` toglie già il pulsante dalla tabulazione; il titolo dice perché.
      aria-label={titolo}
      // Un comando con stato è un interruttore: `aria-pressed` lo annuncia attivo.
      aria-pressed={comando.acceso ? acceso : undefined}
      onClick={() => eseguiDalPulsante(comando)}
    >
      <Icona nome={comando.simbolo} />
      <span className="comando__testo">{titolo}</span>
    </button>
  )
}

/** Un comando compatto: icona sopra e nome sotto, motivo del no nel titolo. */
function pulsanteComando (comando: ComandoUI): ReactElement {
  return <PulsanteComando key={comando.id} comando={comando} />
}

// ------------------------------------------------------- il menu e le pagine

/** Una voce di menu che esegue un comando: spenta se adesso non si può. */
function voceDiComando (comando: ComandoUI): ElementoMenu {
  const impedito = impedimentoDi(comando)
  return {
    testo: titoloDi(comando),
    simbolo: comando.simbolo,
    disabilitato: Boolean(impedito),
    titolo: impedito ?? aiutoDi(comando) ?? undefined,
    scorciatoia: comando.scorciatoia,
    accesa: comando.acceso?.() ?? false,
    al: () => void eseguiComando(comando),
  }
}

/** Il comando che chiude il menu, come in ogni programma: da solo, in fondo. */
const ESCI = 'finestra.esci'

type DocumentoInElenco = (typeof stato.documenti.elenco)[number]

/** Riapre un menu dei registri, col fuoco sulla riga del file dato. */
type Riapri = (percorso?: string) => void

/** Il nome di fuoco del pulsante «File», per ritrovarlo dopo un ridisegno. È una chiave, non segue la lingua. */
const FUOCO_FILE = 'menu-File'

/** Il nome di fuoco della voce dell'anno, in fondo a destra nella barra di stato. */
export const FUOCO_ANNO = 'stato-anno'

/**
 * Riapre il menu dei registri dopo un gesto col tasto destro, così la stella
 * nuova si vede subito. Il pulsante si cerca di nuovo (il ridisegno può
 * averlo rifatto) e il fuoco torna sulla riga su cui si è agito.
 */
function riapriSotto (fuoco: string, elementi: () => ElementoMenu[]): Riapri {
  return (percorso) =>
    requestAnimationFrame(() => {
      const bottone = document.querySelector<HTMLElement>(
        `[data-fuoco="${fuoco}"]`,
      )
      if (bottone) menuSotto(bottone, elementi(), percorso)
    })
}

const riapriMenuFile = riapriSotto(FUOCO_FILE, () => elementiDelProgramma())

/**
 * Cambia subito l'elenco che si vede: l'host lo rispedisce comunque e vince,
 * qui si anticipa perché il menu riaperto mostri già com'è andata.
 */
function anticipaElenco (
  cambia: (elenco: DocumentoInElenco[]) => DocumentoInElenco[],
): void {
  aggiorna({
    documenti: { ...stato.documenti, elenco: cambia(stato.documenti.elenco) },
  })
}

/**
 * Il tasto destro su un registro recente: preferito sì o no, e fuori
 * dall'elenco. «Togli dall'elenco» non tocca il file; su quello aperto è
 * spento, perché tornerebbe da sé.
 */
function menuDelRecente (
  file: DocumentoInElenco,
  riapri: Riapri,
): ElementoMenu[] {
  const t = testi()
  return [
    { titolo: file.etichetta ?? file.nome },
    {
      testo: file.preferito ? t.togliDaiPreferiti : t.aggiungiAiPreferiti,
      simbolo: file.preferito ? 'stella' : 'stellaPiena',
      al: async () => {
        const preferito = !file.preferito
        anticipaElenco((elenco) =>
          elenco.map((voce) =>
            voce.percorso === file.percorso ? { ...voce, preferito } : voce,
          ),
        )
        riapri(file.percorso)
        await azione({
          tipo: 'documento.preferito',
          percorso: file.percorso,
          preferito,
        })
      },
    },
    'separatore',
    {
      testo: t.togliDallElenco,
      simbolo: 'chiudi',
      disabilitato: file.aperto,
      titolo: file.aperto ? t.eQuelloAperto : t.togliRiga,
      al: async () => {
        anticipaElenco((elenco) =>
          elenco.filter((voce) => voce.percorso !== file.percorso),
        )
        riapri()
        await azione({ tipo: 'documento.dimentica', percorso: file.percorso })
      },
    },
  ]
}

/**
 * Una riga dell'elenco: il clic apre il file, il tasto destro lo gestisce. In
 * testa l'anno scritto nel file, sotto nome e cartella per distinguere due
 * copie; un file mai riaperto mostra solo il nome.
 */
function voceDelRecente (file: DocumentoInElenco, riapri: Riapri): ElementoMenu {
  const nome = file.etichetta ?? file.nome
  const t = testi()
  return {
    testo: `${nome}${file.mancante ? t.nonDisponibile : ''}`,
    titolo: t.recenteTitolo(file.percorso),
    // Il nome del file com'è sul disco, estensione compresa.
    descrizione: file.etichetta
      ? `${file.percorso.split(/[\\/]/).pop() ?? file.nome} · ${file.cartella}`
      : file.cartella,
    simbolo: file.preferito ? 'stellaPiena' : 'documento',
    // Smorzato e non spento: un pulsante spento non riceve il tasto destro, e un
    // file sparito è proprio quello da togliere.
    smorzato: file.mancante,
    accesa: file.aperto,
    chiave: file.percorso,
    al: () => {
      if (file.mancante) {
        notifica(t.fileSparito, 'avviso')
        return
      }
      void azione({ tipo: 'documento.apri', percorso: file.percorso })
    },
    menuDestro: () => menuDelRecente(file, riapri),
  }
}

/**
 * I registri preferiti e recenti come voci del menu, quello aperto spuntato:
 * i preferiti in cima, poi i recenti. La stella è l'icona della riga, così i
 * nomi restano allineati.
 */
function vociRecenti (riapri: Riapri = riapriMenuFile): ElementoMenu[] {
  const riga = (file: DocumentoInElenco) => voceDelRecente(file, riapri)
  const preferiti = stato.documenti.elenco.filter((file) => file.preferito)
  const recenti = stato.documenti.elenco.filter((file) => !file.preferito)
  const t = testi()
  return [
    ...(preferiti.length
      ? [{ titolo: t.preferiti }, ...preferiti.map(riga)]
      : []),
    ...(recenti.length ? [{ titolo: t.recenti }, ...recenti.map(riga)] : []),
  ]
}

/**
 * Le righe del menu dell'anno: i registri, e sotto aprirne, crearne o chiudere
 * quello aperto.
 */
function elementiDeiRegistri (): ElementoMenu[] {
  const altri = ['file.apri', 'file.nuovoAnno', 'file.chiudi']
    .map((id) => comandoPerId(id))
    .filter((comando): comando is ComandoUI => comando !== null)
    .map(voceDiComando)
  return [
    ...vociRecenti(riapriSotto(FUOCO_ANNO, elementiDeiRegistri)),
    'separatore',
    ...altri,
  ]
}

/**
 * Il menu dei registri dalla voce dell'anno in fondo a destra: lo stesso
 * elenco del menu «File», dove si legge di quale anno è la pagina.
 */
export function menuDeiRegistri (bottone: HTMLElement): void {
  alternaMenuSotto(bottone, elementiDeiRegistri())
}

/**
 * Il menu «File»: i comandi `'app'` senza `fuoriMenu`, nei loro gruppi.
 * L'ordine di ogni menu «File»: nuovo e apri, i recenti, salva, chiudi e la
 * cartella; «Esci» da solo in fondo, lontano da un clic sbagliato.
 */
function elementiDelProgramma (): ElementoMenu[] {
  const gruppi = gruppiDelMenu()
  const esci = gruppi
    .flatMap((gruppo) => gruppo.comandi)
    .find((comando) => comando.id === ESCI)
  const elementi: ElementoMenu[] = []
  let recentiMessi = false

  const aggiungiGruppo = (gruppo: {
    titolo: string;
    comandi: ComandoUI[];
  }): void => {
    const comandi = gruppo.comandi.filter((comando) => comando.id !== ESCI)
    if (!comandi.length) return
    elementi.push('separatore', { titolo: gruppo.titolo })
    // I recenti dopo «Apri», dentro il gruppo del documento; il resto sotto una linea.
    const dopo = comandi.findIndex((comando) => comando.id === 'file.apri') + 1
    if (dopo === 0) {
      elementi.push(...comandi.map(voceDiComando))
      return
    }
    recentiMessi = true
    elementi.push(...comandi.slice(0, dopo).map(voceDiComando))
    elementi.push('separatore', ...vociRecenti(), 'separatore')
    elementi.push(...comandi.slice(dopo).map(voceDiComando))
  }

  gruppi.forEach(aggiungiGruppo)
  // Se «Apri» manca, i recenti vanno in coda.
  if (!recentiMessi) elementi.push('separatore', ...vociRecenti())
  if (esci) elementi.push('separatore', voceDiComando(esci))

  // Il primo gruppo apre con un separatore: un menu non comincia con una linea.
  while (elementi[0] === 'separatore') elementi.shift()
  return elementi
}

function menuDelProgramma (bottone: HTMLElement): void {
  alternaMenuSotto(bottone, elementiDelProgramma())
}

/** Il pulsante Proiezione apre i comandi dello schermo senza cambiare pagina. */
function schedaProiezione (): ReactNode {
  if (!stato.proiezione.aperta) return null
  const scelta = stato.schedaComandi === 'schermo'
  // Anche dalla riga della pagina si deve capire com'è lo schermo: in pausa
  // l'icona lo dice, e coi dati riservati in vista la scheda prende l'avviso.
  const sospesa = stato.proiezione.impostazioni.sospesa
  const avviso = avvisoRiservato(stato.proiezione.impostazioni)

  return (
    <button
      className={classi(
        'barra-comandi__tendina',
        'barra-comandi__scheda--schermo',
        scelta && 'barra-comandi__scheda--attiva',
        sospesa && 'barra-comandi__scheda--sospesa',
        avviso && 'barra-comandi__scheda--riservata',
      )}
      type="button"
      data-fuoco="scheda-proiezione"
      title={[testi().comandiSchermo, avviso].filter(Boolean).join('\n')}
      aria-pressed={scelta}
      onClick={() => aggiorna({ schedaComandi: scelta ? 'pagina' : 'schermo' })}
    >
      <Icona nome={sospesa ? 'pausa' : 'schermo'} classe="icona--minuta" />
      <span className="barra-comandi__tendina-testo">{testi().proiezione}</span>
    </button>
  )
}

/**
 * La tendina «File» per la barra del titolo. Sta qui perché quel che apre
 * nasce da `gruppiDelMenu()`.
 */
export function tendinaDelProgramma (): ReactElement {
  const t = testi()
  return pulsanteTendina({
    classe: 'barra-comandi__programma',
    fuoco: FUOCO_FILE,
    // «File» e non «Registro»: è il nome che la tendina del documento porta in
    // ogni programma, e «Registro» si leggeva come il nome dell'applicazione.
    testo: t.file,
    titolo: t.fileTitolo,
    apri: menuDelProgramma,
  })
}

/**
 * Un pulsante che apre una tendina: testo e freccia, senza icona, come in una
 * barra dei menu. Ripremuto con il menu aperto lo richiude (`alternaMenuSotto`).
 */
function pulsanteTendina (opzioni: {
  classe: string;
  /** Il nome con cui ritrovare il pulsante dopo il ridisegno: vedi `ricordaFuoco`. */
  fuoco: string;
  testo: string;
  titolo: string;
  apri: (bottone: HTMLElement) => void;
}): ReactElement {
  const { fuoco } = opzioni
  return (
    <button
      className={classi('barra-comandi__tendina', opzioni.classe)}
      type="button"
      data-fuoco={fuoco}
      title={opzioni.titolo}
      aria-haspopup="menu"
      // Aperto se il menu pende da questo pulsante: il menu sopravvive al ridisegno.
      aria-expanded={tendinaAperta(fuoco)}
      onClick={(evento: EventoMouse<HTMLButtonElement>) => opzioni.apri(evento.currentTarget)}
      onKeyDown={(evento: EventoTastiera<HTMLButtonElement>) => {
        // Freccia giù apre soltanto: con il menu aperto non lo richiude.
        if (
          evento.key === 'ArrowDown' &&
          evento.currentTarget.getAttribute('aria-expanded') !== 'true'
        ) {
          evento.preventDefault()
          opzioni.apri(evento.currentTarget)
        }
      }}
    >
      <span className="barra-comandi__tendina-testo">{opzioni.testo}</span>
      <Icona nome="giu" classe="icona--minuta" />
    </button>
  )
}

// ------------------------------------------------------------- i controlli

/** Una voce di una scelta della barra; `gruppo` le raccoglie sotto un titoletto. */
interface VoceScelta {
  valore: string;
  testo: string;
  gruppo?: string;
  /** Icona e colore del titoletto del gruppo (la materia, la classe). */
  gruppoSimbolo?: NomeIcona;
  gruppoColore?: string;
  /** Icona e colore della voce (il corso). */
  simbolo?: NomeIcona;
  colore?: string;
  /** Il nome sul pulsante quando la voce è scelta: fuori dal menu il titoletto non c'è più. */
  intero?: string;
}

/**
 * Una scelta della barra (periodo, classe, corso): cambia che cosa le pagine
 * mostrano, quindi non è un comando e non sta nella palette. Un pulsante con
 * nome e valore che apre la tendina del programma, come il titolo del Registro
 * nella barra laterale: più leggibile di un `select`, e con i titoletti.
 */
function scelta (opzioni: {
  /** Il nome con cui ritrovare il fuoco dopo il ridisegno: vedi `ricordaFuoco`. */
  nome: string;
  etichetta: string;
  titolo: string;
  valore: string;
  al: (valore: string) => void;
  voci: VoceScelta[];
}): ReactElement {
  const scelta = opzioni.voci.find((voce) => voce.valore === opzioni.valore)
  const mostrato = scelta?.intero ?? scelta?.testo
  const voci = (): ElementoMenu[] => {
    const elementi: ElementoMenu[] = []
    let gruppo: string | undefined
    for (const voce of opzioni.voci) {
      if (voce.gruppo !== undefined && voce.gruppo !== gruppo) {
        elementi.push({
          titolo: voce.gruppo,
          ...(voce.gruppoSimbolo ? { simbolo: voce.gruppoSimbolo } : {}),
          ...(voce.gruppoColore ? { colore: voce.gruppoColore } : {}),
        })
      }
      gruppo = voce.gruppo
      elementi.push({
        testo: voce.testo,
        accesa: voce.valore === opzioni.valore,
        // La riga si ritrova per valore, anche quella vuota («tutti»).
        // testo-fisso: chiave della riga, non si legge
        chiave: voce.valore || 'tutti',
        rientro: voce.gruppo !== undefined,
        ...(voce.simbolo ? { simbolo: voce.simbolo } : {}),
        ...(voce.colore ? { colore: voce.colore } : {}),
        al: () => opzioni.al(voce.valore),
      })
    }
    return elementi
  }
  return (
    <button
      key={opzioni.nome}
      type="button"
      className="barra-comandi__scelta barra-comandi__scelta--tendina"
      // Cambiare corso rifà la finestra, pulsante compreso: la chiave di fuoco
      // permette un secondo cambio senza ricliccare.
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco={`barra-comandi-${opzioni.nome}`}
      data-valore={opzioni.valore}
      title={opzioni.titolo}
      aria-haspopup="menu"
      aria-label={`${opzioni.etichetta}: ${mostrato ?? ''}`}
      onClick={(evento) => alternaMenuSotto(evento.currentTarget, voci())}
    >
      <span className="barra-comandi__scelta-nome">{opzioni.etichetta}</span>
      {/* Un valore che non c'è fra le voci (un filtro di un altro anno) resta in bianco. */}
      <strong className="barra-comandi__scelta-valore">{mostrato ?? '—'}</strong>
      <Icona nome="giu" classe="barra-comandi__scelta-freccia" />
    </button>
  )
}

/**
 * Il corso su cui sono puntate le pagine: un elenco solo, «DIC4a · Matematica»,
 * dei corsi con ore nel semestre, in ordine di classe. Sceglierne uno sistema
 * anche il filtro per classe. Compare solo dove il corso è il filtro
 * (`siLavoraSuUnCorso()`); la scelta resta anche quando la tendina sparisce.
 */
function sceltaCorso (): ReactNode {
  if (!siLavoraSuUnCorso()) return null
  const corrente = corsoDelContesto()
  // Il corso aperto resta in elenco anche se le sue ore sono tutte nell'altro
  // semestre: la tendina deve portare il suo nome.
  const nelSemestre = corsiNelSemestre()
  const corsi =
    corrente && !nelSemestre.some((c) => c.id === corrente.id)
      ? [...nelSemestre, corrente]
      : nelSemestre
  if (corsi.length === 0) return null

  const t = testi()
  return scelta({
    nome: 'corso',
    etichetta: t.corso,
    titolo: t.corsoTitolo,
    valore: corrente?.id ?? '',
    al: scegliCorso,
    // Per materia o per classe, chi fa meno gruppi: come nella barra laterale.
    voci: vociDeiCorsi(corsi),
  })
}

/** Le voci dei corsi, raggruppate come dice `raggruppamentoDeiCorsi`, in ordine di gruppo e di nome. */
function vociDeiCorsi (corsi: readonly Corso[]): VoceScelta[] {
  const per = raggruppamentoDeiCorsi(corsi)
  return corsi
    .map((corso) => voceDiCorso(corso, nomeDelCorso(corso), per))
    .sort((a, b) => confrontaNomi(a.gruppo ?? '', b.gruppo ?? '') || confrontaNomi(a.testo, b.testo))
}

/**
 * Un corso fra le voci: sotto il titoletto della materia la classe, o sotto
 * quello della classe la materia; scelto, il nome intero.
 */
function voceDiCorso (corso: Corso, nome: string, per: RaggruppamentoCorsi): VoceScelta {
  const materia = nomeMateria(corso.materiaId)
  const classe = nomeClasse(corso.classeId)
  if (!materia || !classe) return { valore: corso.id, testo: nome }
  // Il titoletto nel colore della materia o della classe; la voce in quello del corso.
  const colore = coloreDiCorso(corso)
  const coloreMateria = materiaPerId(corso.materiaId)?.colore
  const coloreClasse = classePerId(corso.classeId)?.colore
  return per === 'materia'
    ? {
        valore: corso.id, testo: classe, gruppo: materia, intero: nome,
        gruppoSimbolo: 'libro', ...(coloreMateria ? { gruppoColore: coloreMateria } : {}),
        simbolo: 'classi', colore,
      }
    : {
        valore: corso.id, testo: materia, gruppo: classe, intero: nome,
        gruppoSimbolo: 'classi', ...(coloreClasse ? { gruppoColore: coloreClasse } : {}),
        simbolo: 'libro', colore,
      }
}

/**
 * La classe del pannello del docente di classe: solo quelle con la spunta, le
 * altre non hanno fascicolo. Fa qui il lavoro della tendina del corso, quindi
 * le due non compaiono insieme; resta anche con una classe sola, per dire di
 * chi è il fascicolo.
 */
function sceltaClasse (): ReactNode {
  if (!siLavoraSuUnaClasse()) return null
  const classi = classiDiCuiSonoDocente()
  if (classi.length === 0) return null
  const corrente = classeDelFascicolo()

  const t = testi()
  return scelta({
    nome: 'classe',
    etichetta: t.classe,
    titolo: t.classeFascicoloTitolo,
    valore: corrente?.id ?? '',
    al: scegliClasseDelFascicolo,
    voci: classi.map((classe) => ({ valore: classe.id, testo: classe.nome })),
  })
}

/**
 * La classe della pagina Classi, nella stessa riga delle altre tendine: tutte
 * le classi dell'anno, archiviate in fondo.
 */
function sceltaClasseDellaPagina (): ReactNode {
  if (stato.vista !== 'classi') return null
  const classi = classiDellAnno()
  const corrente = classeDellaPaginaClassi()
  if (!corrente) return null
  const t = testi()
  return scelta({
    nome: 'classePagina',
    etichetta: t.classe,
    titolo: t.classePaginaTitolo,
    valore: corrente.id,
    al: (valore) => vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: valore } }),
    voci: classi.map((classe) => ({
      valore: classe.id,
      testo: classe.archiviata ? t.archiviata(classe.nome) : classe.nome,
    })),
  })
}

/**
 * Il filtro del calendario: un corso alla volta, o tutti. Scrive in un campo
 * suo: restringe la settimana e resta al calendario, senza toccare il corso
 * delle pagine del registro (le due tendine non compaiono insieme). Niente
 * filtro per classe: la classe è già nel nome di ogni corso.
 */
function filtriAgenda (): ReactNode {
  if (!siFiltraLAgenda()) return null
  const corsi = corsiDellAnnoAperto()
  if (corsi.length === 0) return null
  const t = testi()

  return scelta({
    nome: 'corso-agenda',
    etichetta: t.corso,
    titolo: t.corsoAgendaTitolo,
    valore: stato.filtroCorsoAgendaId ?? '',
    al: (valore) => aggiorna({ filtroCorsoAgendaId: valore || null }),
    voci: [
      { valore: '', testo: t.tuttiICorsi },
      ...vociDeiCorsi(corsi),
    ],
  })
}

/**
 * L'anno in uso: si mostra anche quando è uno solo, e anche nella Dashboard,
 * perché dice di quale anno è quel che si guarda. Non si sceglie qui: è il
 * documento aperto, e si cambia aprendone un altro (menu «File», voce dell'anno
 * nella barra di stato, dialogo di apertura).
 */
function sceltaAnno (): ReactNode {
  const anno = annoCorrente()
  if (!anno) return null
  const t = testi()
  return (
    <div className="barra-comandi__scelta barra-comandi__scelta--ferma">
      <span className="barra-comandi__etichetta">{t.anno}</span>
      <strong title={t.annoTitolo}>{anno.etichetta}</strong>
    </div>
  )
}

/** Il periodo dei conti: un semestre o l'anno intero. */
function sceltaPeriodo (): ReactNode {
  const anno = annoCorrente()
  if (!anno || anno.semestri.length === 0) return null
  const t = testi()
  return scelta({
    nome: 'periodo',
    etichetta: parole().periodo,
    titolo: t.periodoTitolo,
    valore: stato.semestreId ?? '',
    al: (valore) => aggiorna({ semestreId: valore || null }),
    voci: [
      ...anno.semestri.map((semestre) => ({ valore: semestre.id, testo: nomeSemestre(semestre) })),
      { valore: '', testo: t.annoIntero },
    ],
  })
}

/**
 * La classe della mappa: al posto della classe, e solo sulla mappa. Scrive in
 * un campo suo (`classeMappaId`): restringere i punti non restringe le
 * pagine di corso, che hanno il loro filtro.
 */
function sceltaClasseMappa (): ReactNode {
  if (stato.vista !== 'mappa') return null
  const classi = classiDellAnno().filter((c) => !c.archiviata)
  if (classi.length < 2) return null
  const t = testi()
  return scelta({
    nome: 'classeMappa',
    etichetta: t.classe,
    titolo: t.classeMappaTitolo,
    valore: stato.classeMappaId ?? '',
    al: (valore) => aggiorna({ classeMappaId: valore || null }),
    voci: [
      { valore: '', testo: t.tutteLeClassi },
      ...classi.map((classe) => ({ valore: classe.id, testo: classe.nome })),
    ],
  })
}

/**
 * Nella pagina di una lezione, a che punto è il suo tempo: passata (la si
 * può concludere), in corso o da venire. Non si preme: si legge.
 */
function tempoDellOra (): ReactNode {
  if (stato.vista !== 'lezione') return null
  const lezione = lezioneDelContesto()
  if (!lezione) return null
  const t = testi()
  // L'orologio del pannello, come il resto della pagina.
  const giorno = stato.adessoData
  const ora = stato.adessoOra
  const inizio = inizioLezione(lezione)
  const [testo, titolo, tono] = lezioneFinita(lezione, giorno, ora)
    ? [t.oraPassata, t.oraPassataTitolo, 'passata']
    : lezione.data === giorno && inizio !== null && inizio <= ora
      ? [t.oraInCorso, t.oraInCorsoTitolo, 'in-corso']
      : [t.oraFutura, t.oraFuturaTitolo, 'futura']
  return (
    // testo-fisso: classe CSS
    <span className={classi('barra-comandi__tempo', `barra-comandi__tempo--${tono}`)} title={titolo}>
      <Icona nome={tono === 'passata' ? 'spunta' : 'orologio'} classe="icona--minuta" />
      <span>{testo}</span>
    </span>
  )
}

/**
 * L'interruttore dello schermo per la classe: non è di nessuna pagina e si
 * legge senza girarsi. Acceso, porta il punto verde e fa comparire il pulsante
 * «Proiezione» con i suoi comandi.
 */
function interruttoreProiezione (): ReactNode {
  return interruttore('proiezione.schermo', 'schermo', stato.proiezione.aperta)
}

/**
 * L'interruttore della modifica, accanto a quello dello schermo: compare solo nella
 * pagina del calendario per gestire le lezioni nel calendario.
 */
function interruttoreModifica (): ReactNode {
  if (stato.vista !== 'calendario') return null
  return interruttore('calendario.editor', 'matita', stato.editorCalendario)
}

/** Un interruttore della riga di sopra: acceso ha il punto, e lo dice a chi legge. */
function interruttore (id: string, simbolo: NomeIcona, accesa: boolean): ReactNode {
  const comando = comandoPerId(id)
  if (!comando) return null
  return <Interruttore key={id} comando={comando} simbolo={simbolo} accesa={accesa} />
}

function Interruttore ({ comando, simbolo, accesa }: {
  comando: ComandoUI
  simbolo: NomeIcona
  accesa: boolean
}): ReactElement {
  const inVolo = useInVolo(comando.id)
  const impedito = !accesa ? impedimentoDi(comando) : null

  return (
    <button
      className={classi(
        'barra-comandi__schermo',
        accesa && 'barra-comandi__schermo--acceso',
        inVolo?.rotella && 'in-corso',
      )}
      type="button"
      disabled={impedito !== null || inVolo !== undefined}
      aria-busy={inVolo?.rotella ? true : undefined}
      // Come i pulsanti dei comandi: il fuoco si ritrova dopo il ridisegno.
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco={`comando-${comando.id}`}
      title={impedito ?? aiutoDi(comando) ?? titoloDi(comando)}
      aria-label={titoloDi(comando)}
      aria-pressed={accesa}
      onClick={() => eseguiDalPulsante(comando)}
    >
      <Icona nome={simbolo} classe="icona--minuta" />
      <span>{titoloDi(comando)}</span>
    </button>
  )
}

// ------------------------------------------------------------- le due righe

/** Un riquadro della riga: i comandi che si fanno per lo stesso motivo. */
function riquadro (gruppo: {
  titolo: string;
  comandi: ComandoUI[];
}): ReactElement {
  return (
    <div key={gruppo.titolo} className="barra-comandi__gruppo" role="group" aria-label={gruppo.titolo}>
      <div className="barra-comandi__comandi">
        {gruppo.comandi.map(pulsanteComando)}
      </div>
    </div>
  )
}

/** La riga di sopra: dove si è, dove si va, su che cosa. */
function rigaNavigazione (nascoste: boolean, conAzioni: boolean): ReactElement {
  const t = testi()
  return (
    <div className="barra-comandi__navigazione">
      {/* Menu «File», storia e nome della pagina stanno nella barra del titolo, la
          navigazione nella barra laterale, la ricerca su Ctrl+K. Qui restano il
          contesto e gli interruttori di quel che si tiene acceso mentre si lavora. */}
      <div className="barra-comandi__contesto">
        {/* Sempre nello stesso ordine: anno, periodo, classe, corso. Un filtro che
            la pagina non prevede manca, e il seguente prende il suo posto. */}
        {sceltaAnno()}
        {sceltaPeriodo()}
        {sceltaClasse()}
        {sceltaClasseMappa()}
        {sceltaClasseDellaPagina()}
        {sceltaCorso()}
        {filtriAgenda()}
      </div>
      {schedaProiezione()}
      {tempoDellOra()}
      <span className="barra-comandi__spazio" />
      {interruttoreModifica()}
      {interruttoreProiezione()}
      {/* Accanto allo schermo per la classe: si accendono entrambi mentre si lavora
          su qualunque cosa. */}
      {interruttoreAssistente()}
      {/* Solo se c'è qualcosa da nascondere. */}
      {conAzioni
        ? (
            <button
              className="barra-comandi__interruttore"
              type="button"
              data-fuoco="mostra-azioni"
              title={nascoste ? t.mostraAzioniTitolo : t.nascondiAzioniTitolo}
              aria-label={nascoste ? t.mostraAzioni : t.nascondiAzioni}
              aria-expanded={!nascoste}
              aria-controls="azioni-pagina"
              onClick={() => aggiorna({ azioniNascoste: !nascoste })}
            >
              <Icona nome={nascoste ? 'giu' : 'su'} />
            </button>
          )
        : null}
    </div>
  )
}

/** La riga di sotto: le azioni della pagina aperta, o quelle dello schermo. */
function rigaAzioni (
  gruppi: Array<{ titolo: string; comandi: ComandoUI[] }>,
  di: string,
  schermo: boolean,
): ReactElement {
  return (
    <div
      id="azioni-pagina"
      hidden={stato.azioniNascoste}
      className="barra-comandi__corpo"
      role="region"
      aria-label={testi().azioniDi(di)}
    >
      {/* Davanti ai comandi dello schermo, com'è lo schermo: la classe lo guarda
          alle spalle di chi ha il registro davanti. */}
      {schermo ? statoDelloSchermo() : null}
      {gruppi.map(riquadro)}
    </div>
  )
}

export function barraComandi (): ReactNode {
  // Guida e impostazioni non hanno la barra (nessuna azione, nessun contesto),
  // salvo a schermo acceso: i comandi della proiezione stanno solo qui.
  const senzaBarra = stato.vista === 'guida' || stato.vista === 'impostazioni'
  if (senzaBarra && !stato.proiezione.aperta) return null

  // Con la scheda «Proiezione» scelta la riga mostra i comandi dello schermo;
  // a schermo spento la scheda non c'è e tornano quelli della pagina.
  const schermo = stato.proiezione.aperta && stato.schedaComandi === 'schermo'
  const gruppi = schermo ? gruppiDi('schermo') : gruppiDellaPagina(stato.vista)
  const nascoste = stato.azioniNascoste

  return (
    <div
      // A scheda «Proiezione» scelta la barra prende la tinta della sua icona:
      // si vede a colpo d'occhio che i comandi sono dello schermo, non della pagina.
      className={classi('barra-comandi', schermo && 'barra-comandi--schermo')}
      data-telaio="barra-comandi"
    >
      {rigaNavigazione(nascoste, gruppi.length > 0)}
      {gruppi.length === 0
        ? null
        : rigaAzioni(gruppi, schermo ? testi().proiezione : nomeDelPosto(), schermo)}
    </div>
  )
}
