import { confrontaNomi } from '../domain/text.js'
import { interruttoreAssistente } from './assistant.js'
// Navbar: File, destinazioni e contesto; sotto, azioni compatte della pagina.

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
import { conAttesa } from './components/base.js'
import { icona, type NomeIcona } from './components/icons.js'
import { alternaMenuSotto, menuSotto, tendinaAperta, type ElementoMenu } from './components/menu.js'
import { notifica } from './components/notifications.js'
import {
  classeDelFascicolo,
  classeDellaPaginaClassi,
  corsoDelContesto,
  nomeDelCorso,
  scegliClasseDelFascicolo,
  scegliCorso,
  siFiltraLAgenda,
  siLavoraSuUnCorso,
  siLavoraSuUnaClasse,
} from './context.js'
import { h, type Figlio } from './dom.js'
import { nomeDelPosto } from './pages.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './commandBar.testi.js'
import { azione } from './bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiNelSemestre,
  stato,
} from './state.js'

/**
 * I comandi partiti e non ancora tornati, per id. Fuori dal DOM perché la barra
 * si ridisegna mentre il comando è in volo, e il pulsante che rinasce deve
 * nascere spento (se no un secondo clic lo rilancia).
 */
const comandiInVolo = new Map<string, { bottone: HTMLButtonElement, spento: boolean } | null>()

/** Il pulsante appena nato di un comando in volo: spento, con la sua rotella. */
function rinasceInVolo (id: string, bottone: HTMLButtonElement): void {
  if (!comandiInVolo.has(id)) return
  comandiInVolo.set(id, { bottone, spento: bottone.disabled })
  bottone.disabled = true
  bottone.classList.add('in-corso')
  bottone.setAttribute('aria-busy', 'true')
}

/** Esegue il comando dal suo pulsante, e se parla con l'host lo tiene in volo. */
function eseguiDalPulsante (comando: ComandoUI, bottone: HTMLButtonElement): void {
  // Passa da `eseguiComando` come palette e scorciatoie: il controllo sta in un posto solo.
  const esito = eseguiComando(comando)
  // Un comando che parla con l'host tiene la rotella finché la risposta torna.
  if (!(esito instanceof Promise)) return
  comandiInVolo.set(comando.id, null)
  const torna = () => {
    const rinato = comandiInVolo.get(comando.id)
    comandiInVolo.delete(comando.id)
    if (!rinato) return
    rinato.bottone.disabled = rinato.spento
    rinato.bottone.classList.remove('in-corso')
    rinato.bottone.removeAttribute('aria-busy')
  }
  void conAttesa(bottone, esito).then(torna, torna)
}

/** Un comando compatto: icona e nome affiancati, motivo del no nel titolo. */
function pulsanteComando (comando: ComandoUI): HTMLElement {
  const impedito = impedimentoDi(comando)
  const aiuto = aiutoDi(comando)
  const titolo = titoloDi(comando)
  const acceso = comando.acceso?.() ?? false
  // Il motivo del no vince sull'aiuto; la scorciatoia in coda, come altrove.
  const spiegazione = [impedito ?? aiuto, comando.scorciatoia && `(${comando.scorciatoia})`]
    .filter(Boolean)
    .join(' ')

  const bottone = h(
    'button',
    {
      class: [
        'comando',
        primarioDi(comando) && 'comando--primario',
        acceso && 'comando--acceso',
      ],
      type: 'button',
      // testo-fisso: chiave di fuoco, non si legge
      dataset: { fuoco: `comando-${comando.id}` },
      disabled: Boolean(impedito),
      attr: {
        title: spiegazione ? `${titolo} — ${spiegazione}` : titolo,
        // `disabled` toglie già il pulsante dalla tabulazione; il titolo dice perché.
        'aria-label': titolo,
        // Un comando con stato è un interruttore: `aria-pressed` lo annuncia attivo.
        'aria-pressed': comando.acceso ? String(acceso) : null,
      },
      onclick: () => eseguiDalPulsante(comando, bottone),
    },
    icona(comando.simbolo),
    h('span', { class: 'comando__testo' }, titolo),
  )
  rinasceInVolo(comando.id, bottone)
  return bottone
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
 * nuova si vede subito. Il pulsante si cerca di nuovo (il ridisegno l'ha
 * rifatto) e il fuoco torna sulla riga su cui si è agito.
 */
function riapriSotto (fuoco: string, elementi: () => ElementoMenu[]): Riapri {
  return (percorso) => requestAnimationFrame(() => {
    const bottone = document.querySelector<HTMLElement>(`[data-fuoco="${fuoco}"]`)
    if (bottone) menuSotto(bottone, elementi(), percorso)
  })
}

const riapriMenuFile = riapriSotto(FUOCO_FILE, () => elementiDelProgramma())

/**
 * Cambia subito l'elenco che si vede: l'host lo rispedisce comunque e vince,
 * qui si anticipa perché il menu riaperto mostri già com'è andata.
 */
function anticipaElenco (cambia: (elenco: DocumentoInElenco[]) => DocumentoInElenco[]): void {
  aggiorna({ documenti: { ...stato.documenti, elenco: cambia(stato.documenti.elenco) } })
}

/**
 * Il tasto destro su un registro recente: preferito sì o no, e fuori
 * dall'elenco. «Togli dall'elenco» non tocca il file; su quello aperto è
 * spento, perché tornerebbe da sé.
 */
function menuDelRecente (file: DocumentoInElenco, riapri: Riapri): ElementoMenu[] {
  const t = testi()
  return [
    { titolo: file.etichetta ?? file.nome },
    {
      testo: file.preferito ? t.togliDaiPreferiti : t.aggiungiAiPreferiti,
      simbolo: file.preferito ? 'stella' : 'stellaPiena',
      al: async () => {
        const preferito = !file.preferito
        anticipaElenco((elenco) =>
          elenco.map((voce) => (voce.percorso === file.percorso ? { ...voce, preferito } : voce)))
        riapri(file.percorso)
        await azione({ tipo: 'documento.preferito', percorso: file.percorso, preferito })
      },
    },
    'separatore',
    {
      testo: t.togliDallElenco,
      simbolo: 'chiudi',
      disabilitato: file.aperto,
      titolo: file.aperto ? t.eQuelloAperto : t.togliRiga,
      al: async () => {
        anticipaElenco((elenco) => elenco.filter((voce) => voce.percorso !== file.percorso))
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
    ...(preferiti.length ? [{ titolo: t.preferiti }, ...preferiti.map(riga)] : []),
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
  return [...vociRecenti(riapriSotto(FUOCO_ANNO, elementiDeiRegistri)), 'separatore', ...altri]
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
  const esci = gruppi.flatMap((gruppo) => gruppo.comandi).find((comando) => comando.id === ESCI)
  const elementi: ElementoMenu[] = []
  let recentiMessi = false

  const aggiungiGruppo = (gruppo: { titolo: string, comandi: ComandoUI[] }): void => {
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
function schedaProiezione (): Figlio {
  if (!stato.proiezione.aperta) return null
  const scelta = stato.schedaComandi === 'schermo'

  return h(
    'button',
    {
      class: [
        'barra-comandi__tendina',
        'barra-comandi__scheda--schermo',
        scelta && 'barra-comandi__scheda--attiva',
      ],
      type: 'button',
      dataset: { fuoco: 'scheda-proiezione' },
      attr: {
        title: testi().comandiSchermo,
        'aria-pressed': String(scelta),
      },
      onclick: () => aggiorna({ schedaComandi: scelta ? 'pagina' : 'schermo' }),
    },
    icona('schermo', 'icona--minuta'),
    h('span', { class: 'barra-comandi__tendina-testo' }, testi().proiezione),
  )
}

/**
 * La tendina «File» per la barra del titolo. Sta qui perché quel che apre
 * nasce da `gruppiDelMenu()`.
 */
export function tendinaDelProgramma (): HTMLElement {
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
  classe: string
  /** Il nome con cui ritrovare il pulsante dopo il ridisegno: vedi `ricordaFuoco`. */
  fuoco: string
  testo: string
  titolo: string
  apri: (bottone: HTMLElement) => void
}): HTMLElement {
  const { fuoco } = opzioni
  const bottone = h(
    'button',
    {
      class: ['barra-comandi__tendina', opzioni.classe],
      type: 'button',
      dataset: { fuoco },
      attr: {
        title: opzioni.titolo,
        'aria-haspopup': 'menu',
        // Aperto se il menu pende da questo pulsante o da quello di prima del
        // ridisegno: il menu sopravvive al ridisegno, il pulsante no.
        'aria-expanded': String(tendinaAperta(fuoco)),
      },
      onclick: () => opzioni.apri(bottone),
      onkeydown: (evento: KeyboardEvent) => {
        // Freccia giù apre soltanto: con il menu aperto non lo richiude.
        if (evento.key === 'ArrowDown' && bottone.getAttribute('aria-expanded') !== 'true') {
          evento.preventDefault()
          opzioni.apri(bottone)
        }
      },
    },
    h('span', { class: 'barra-comandi__tendina-testo' }, opzioni.testo),
    icona('giu', 'icona--minuta'),
  )
  return bottone
}

// ------------------------------------------------------------- i controlli

/**
 * Una scelta della barra (corso, anno, semestre): cambia che cosa le pagine
 * mostrano, quindi non è un comando e non sta nella palette.
 */
function scelta (opzioni: {
  /** Il nome con cui ritrovare il fuoco dopo il ridisegno: vedi `ricordaFuoco`. */
  nome: string
  etichetta: string
  titolo: string
  valore: string
  al: (valore: string) => void
  figli: Figlio[]
}): HTMLElement {
  return h(
    'label',
    { class: 'barra-comandi__scelta', attr: { title: opzioni.titolo } },
    h('span', { class: 'barra-comandi__scelta-nome' }, opzioni.etichetta),
    h(
      'select',
      {
        class: 'campo__controllo campo__controllo--selezione',
        // Cambiare corso rifà la finestra, tendina compresa: la chiave di fuoco
        // permette un secondo cambio senza ricliccare.
        // testo-fisso: chiave di fuoco, non si legge
        dataset: { fuoco: `barra-comandi-${opzioni.nome}` },
        value: opzioni.valore,
        onchange: (evento: Event) => opzioni.al((evento.target as HTMLSelectElement).value),
      },
      ...opzioni.figli,
    ),
  )
}

/**
 * Il corso su cui sono puntate le pagine: un elenco solo, «DIC4a · Matematica»,
 * dei corsi con ore nel semestre, in ordine di classe. Sceglierne uno sistema
 * anche il filtro per classe. Compare solo dove il corso è il filtro
 * (`siLavoraSuUnCorso()`); la scelta resta anche quando la tendina sparisce.
 */
function sceltaCorso (): Figlio {
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
    figli: corsi
      .map((corso) => ({ corso, nome: nomeDelCorso(corso) }))
      .sort((a, b) => confrontaNomi(a.nome, b.nome))
      .map(({ corso, nome }) =>
        h('option', { value: corso.id, selected: corso.id === corrente?.id }, nome),
      ),
  })
}

/**
 * La classe del pannello del docente di classe: solo quelle con la spunta, le
 * altre non hanno fascicolo. Fa qui il lavoro della tendina del corso, quindi
 * le due non compaiono insieme; resta anche con una classe sola, per dire di
 * chi è il fascicolo.
 */
function sceltaClasse (): Figlio {
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
    figli: classi.map((classe) =>
      h('option', { value: classe.id, selected: classe.id === corrente?.id }, classe.nome),
    ),
  })
}

/**
 * La classe della pagina Classi, nella stessa riga delle altre tendine: tutte
 * le classi dell'anno, archiviate in fondo.
 */
function sceltaClasseDellaPagina (): Figlio {
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
    al: (valore) => aggiorna({ classeId: valore }),
    figli: classi.map((classe) =>
      h(
        'option',
        { value: classe.id, selected: classe.id === corrente.id },
        classe.archiviata ? t.archiviata(classe.nome) : classe.nome,
      ),
    ),
  })
}

/**
 * Il filtro del calendario: un corso alla volta, o tutti. Scrive in un campo
 * suo: restringe la settimana e resta al calendario, senza toccare il corso
 * delle pagine del registro (le due tendine non compaiono insieme). Niente
 * filtro per classe: la classe è già nel nome di ogni corso.
 */
function filtriAgenda (): Figlio[] {
  if (!siFiltraLAgenda()) return []
  const corsi = corsiDellAnnoAperto()
  if (corsi.length === 0) return []
  const t = testi()

  return [
    scelta({
      nome: 'corso-agenda',
      etichetta: t.corso,
      titolo: t.corsoAgendaTitolo,
      valore: stato.filtroCorsoAgendaId ?? '',
      al: (valore) => aggiorna({ filtroCorsoAgendaId: valore || null }),
      figli: [
        h('option', { value: '', selected: stato.filtroCorsoAgendaId === null }, t.tuttiICorsi),
        ...corsi.map((corso) =>
          h(
            'option',
            { value: corso.id, selected: corso.id === stato.filtroCorsoAgendaId },
            nomeDelCorso(corso),
          ),
        ),
      ],
    }),
  ]
}

/**
 * L'anno in uso e il periodo dei conti. L'anno si mostra anche quando è uno
 * solo: dice di quale anno è quel che si guarda.
 */
function sceltaAnno (): Figlio {
  const anno = annoCorrente()
  if (!anno) return null
  const t = testi()

  return h(
    'div',
    { class: 'barra-comandi__scelte' },
    // L'anno non si sceglie qui: è il documento aperto, e si cambia aprendone un
    // altro (menu «File», voce dell'anno nella barra di stato, dialogo di apertura).
    h(
      'div',
      { class: 'barra-comandi__scelta barra-comandi__scelta--ferma' },
      h('span', { class: 'barra-comandi__etichetta' }, t.anno),
      h('strong', { title: t.annoTitolo }, anno.etichetta),
    ),
    anno.semestri.length > 0
      ? scelta({
          nome: 'periodo',
          etichetta: parole().periodo,
          titolo: t.periodoTitolo,
          valore: stato.semestreId ?? '',
          al: (valore) => aggiorna({ semestreId: valore || null }),
          figli: [
            ...anno.semestri.map((semestre) =>
              h(
                'option',
                { value: semestre.id, selected: semestre.id === stato.semestreId },
                semestre.etichetta,
              ),
            ),
            h('option', { value: '', selected: stato.semestreId === null }, t.annoIntero),
          ],
        })
      : null,
    // Dopo il periodo, le tendine di una pagina sola: mappa e pagina Classi.
    sceltaClasseMappa(),
    sceltaClasseDellaPagina(),
  )
}

/**
 * La classe della mappa: accanto a «Periodo», e solo sulla mappa. Scrive in
 * un campo suo (`classeMappaId`): restringere i punti non restringe le
 * pagine di corso, che hanno il loro filtro.
 */
function sceltaClasseMappa (): Figlio {
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
    figli: [
      h('option', { value: '', selected: stato.classeMappaId === null }, t.tutteLeClassi),
      ...classi.map((classe) =>
        h('option', { value: classe.id, selected: classe.id === stato.classeMappaId }, classe.nome),
      ),
    ],
  })
}

/**
 * L'interruttore dello schermo per la classe: non è di nessuna pagina e si
 * legge senza girarsi. Acceso, porta il punto verde e fa comparire il pulsante
 * «Proiezione» con i suoi comandi.
 */
function interruttoreProiezione (): Figlio {
  return interruttore('proiezione.schermo', 'schermo', stato.proiezione.aperta)
}

/**
 * L'interruttore della modifica, accanto a quello dello schermo: è un modo del
 * registro e non di una pagina, quindi si legge da ovunque.
 */
function interruttoreModifica (): Figlio {
  return interruttore('calendario.editor', 'matita', stato.editorCalendario)
}

/** Un interruttore della riga di sopra: acceso ha il punto, e lo dice a chi legge. */
function interruttore (id: string, simbolo: NomeIcona, accesa: boolean): Figlio {
  const comando = comandoPerId(id)
  if (!comando) return null
  const impedito = !accesa ? impedimentoDi(comando) : null

  const bottone = h(
    'button',
    {
      class: ['barra-comandi__schermo', accesa && 'barra-comandi__schermo--acceso'],
      type: 'button',
      disabled: impedito !== null,
      // Come i pulsanti dei comandi: il fuoco si ritrova dopo il ridisegno.
      // testo-fisso: chiave di fuoco, non si legge
      dataset: { fuoco: `comando-${id}` },
      attr: {
        title: impedito ?? aiutoDi(comando) ?? titoloDi(comando),
        'aria-label': titoloDi(comando),
        'aria-pressed': String(accesa),
      },
      onclick: () => eseguiDalPulsante(comando, bottone),
    },
    icona(simbolo, 'icona--minuta'),
    h('span', null, titoloDi(comando)),
  )
  rinasceInVolo(id, bottone)
  return bottone
}

// ------------------------------------------------------------- le due righe

/** Un riquadro della riga: i comandi che si fanno per lo stesso motivo. */
function riquadro (gruppo: { titolo: string, comandi: ComandoUI[] }): HTMLElement {
  return h(
    'div',
    { class: 'barra-comandi__gruppo', attr: { role: 'group', 'aria-label': gruppo.titolo } },
    h('div', { class: 'barra-comandi__comandi' }, ...gruppo.comandi.map(pulsanteComando)),
  )
}

/** La riga di sopra: dove si è, dove si va, su che cosa. */
function rigaNavigazione (nascoste: boolean, conAzioni: boolean): Figlio {
  const t = testi()
  return h(
    'div',
    { class: 'barra-comandi__navigazione' },
    // Menu «File», storia e nome della pagina stanno nella barra del titolo, la
    // navigazione nella barra laterale, la ricerca su Ctrl+K. Qui restano il
    // contesto e gli interruttori di quel che si tiene acceso mentre si lavora.
    h(
      'div',
      { class: 'barra-comandi__contesto' },
      sceltaCorso(),
      sceltaClasse(),
      ...filtriAgenda(),
      sceltaAnno(),
    ),
    schedaProiezione(),
    h('span', { class: 'barra-comandi__spazio' }),
    interruttoreModifica(),
    interruttoreProiezione(),
    // Accanto allo schermo per la classe: si accendono entrambi mentre si lavora
    // su qualunque cosa.
    interruttoreAssistente(),
    // Solo se c'è qualcosa da nascondere.
    conAzioni
      ? h(
          'button',
          {
            class: 'barra-comandi__interruttore',
            type: 'button',
            dataset: { fuoco: 'mostra-azioni' },
            attr: {
              title: nascoste ? t.mostraAzioniTitolo : t.nascondiAzioniTitolo,
              'aria-label': nascoste ? t.mostraAzioni : t.nascondiAzioni,
              'aria-expanded': String(!nascoste),
              'aria-controls': 'azioni-pagina',
            },
            onclick: () => aggiorna({ azioniNascoste: !nascoste }),
          },
          icona(nascoste ? 'giu' : 'su'),
        )
      : null,
  )
}

/** La riga di sotto: le azioni della pagina aperta, o quelle dello schermo. */
function rigaAzioni (
  gruppi: Array<{ titolo: string, comandi: ComandoUI[] }>,
  di: string,
): Figlio {
  return h(
    'div',
    {
      id: 'azioni-pagina',
      hidden: stato.azioniNascoste,
      class: 'barra-comandi__corpo',
      attr: { role: 'region', 'aria-label': testi().azioniDi(di) },
    },
    ...gruppi.map(riquadro),
  )
}

export function barraComandi (): Figlio {
  // Guida e impostazioni non hanno la barra (nessuna azione, nessun contesto),
  // salvo a schermo acceso: i comandi della proiezione stanno solo qui.
  const senzaBarra = stato.vista === 'guida' || stato.vista === 'impostazioni'
  if (senzaBarra && !stato.proiezione.aperta) return null

  // Con la scheda «Proiezione» scelta la riga mostra i comandi dello schermo;
  // a schermo spento la scheda non c'è e tornano quelli della pagina.
  const schermo = stato.proiezione.aperta && stato.schedaComandi === 'schermo'
  const gruppi = schermo ? gruppiDi('schermo') : gruppiDellaPagina(stato.vista)
  const nascoste = stato.azioniNascoste

  return h(
    'div',
    { class: 'barra-comandi' },
    rigaNavigazione(nascoste, gruppi.length > 0),
    gruppi.length === 0 ? null : rigaAzioni(gruppi, schermo ? testi().proiezione : nomeDelPosto()),
  )
}
