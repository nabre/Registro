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
import { icona } from './components/icons.js'
import { menuSotto, type ElementoMenu } from './components/menu.js'
import { apriPalette } from './components/palette.js'
import {
  classeDelFascicolo,
  corsoDelContesto,
  nomeDelCorso,
  scegliClasseDelFascicolo,
  scegliCorso,
  siFiltraLAgenda,
  siLavoraSuUnCorso,
  siLavoraSuUnaClasse,
} from './context.js'
import { h, type Figlio } from './dom.js'
import {
  gruppiDiPagine,
  nomeDelPosto,
  vaiA,
  type Pagina,
} from './pages.js'
import { azione } from './bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiNelSemestre,
  stato,
} from './state.js'

/** Un comando compatto: icona e nome affiancati, motivo del no nel titolo. */
function pulsanteComando (comando: ComandoUI): HTMLElement {
  const impedito = impedimentoDi(comando)
  const aiuto = aiutoDi(comando)
  const titolo = titoloDi(comando)
  const acceso = comando.acceso?.() ?? false
  // Il motivo del no vince sull'aiuto: chi si ferma sopra un pulsante spento
  // sta chiedendo proprio quello. La scorciatoia si legge in coda, dov'è in
  // ogni altro programma.
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
      dataset: { fuoco: `comando-${comando.id}` },
      disabled: Boolean(impedito),
      attr: {
        title: spiegazione ? `${titolo} — ${spiegazione}` : titolo,
        // Spento ma non invisibile ai lettori di schermo: `disabled` toglie
        // già il pulsante dalla tabulazione, e il titolo dice perché.
        'aria-label': titolo,
        // Un comando che mette lo schermo in uno stato è un interruttore, e si
        // annuncia come tale: `aria-pressed` è quel che un lettore di schermo
        // legge come «attivo».
        'aria-pressed': comando.acceso ? String(acceso) : null,
      },
      onclick: () => {
        // Dallo stesso passaggio della palette e delle scorciatoie, anche se
        // qui il pulsante è già spento quando non si può: il controllo sta in
        // un posto solo, e non in tre che devono restare d'accordo.
        const esito = eseguiComando(comando)
        // Lo stesso giro di `pulsante()`: un comando che parla con l'host —
        // esportare, spedire, aprire un file — tiene la sua rotella finché la
        // risposta non è tornata.
        if (esito instanceof Promise) void conAttesa(bottone, esito)
      },
    },
    icona(comando.simbolo),
    h('span', { class: 'comando__testo' }, titolo),
  )
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

/** Una voce di menu che porta in una pagina: spenta se adesso non ci si può andare. */
function voceDiPagina (pagina: Pagina): ElementoMenu {
  const impedito = pagina.impedimento?.() ?? null
  return {
    testo: pagina.titolo,
    simbolo: pagina.simbolo,
    disabilitato: Boolean(impedito),
    titolo: impedito ?? pagina.aiuto,
    accesa: pagina.attiva(),
    al: () => vaiA(pagina),
  }
}

/**
 * Il menu «File»: quel che si fa al registro, non alla pagina.
 *
 * Nasce dai comandi che si dichiarano `'app'`, raccolti nei loro gruppi: il
 * documento, l'anno, la posta, la manutenzione. Un comando aggiunto là compare
 * qui senza che nessuno debba ricordarsene.
 *
 * In fondo le due pagine del programma — impostazioni e guida. Non sono un
 * mestiere e non meritano una scheda loro: si aprono una volta ogni tanto, e
 * quando le si cerca le si cerca qui, dov'è tutto quel che riguarda il
 * registro intero.
 */
function menuDelProgramma (bottone: HTMLElement): void {
  const elementi: ElementoMenu[] = []
  for (const gruppo of gruppiDelMenu()) {
    if (elementi.length > 0) elementi.push('separatore')
    elementi.push({ titolo: gruppo.titolo })
    elementi.push(...gruppo.comandi.map(voceDiComando))
  }
  if (stato.documenti.elenco.length) {
    elementi.push('separatore', { titolo: 'Registri recenti e preferiti' })
    elementi.push(...stato.documenti.elenco.map((file): ElementoMenu => ({
      testo: `${file.preferito ? '★ ' : ''}${file.nome}${file.mancante ? ' — non disponibile' : ''}`,
      titolo: file.percorso,
      descrizione: file.cartella,
      simbolo: 'documento',
      disabilitato: file.mancante,
      al: () => { void azione({ tipo: 'documento.apri', percorso: file.percorso }) },
    })))
  }
  const programma = gruppiDiPagine().find((gruppo) => gruppo.gruppo === 'sistema')
  if (programma) {
    if (elementi.length > 0) elementi.push('separatore')
    elementi.push({ titolo: programma.titolo })
    elementi.push(...programma.pagine.map(voceDiPagina))
  }
  menuSotto(bottone, elementi)
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
        title: 'I comandi dello schermo per la classe',
        'aria-pressed': String(scelta),
      },
      onclick: () => aggiorna({ schedaComandi: scelta ? 'pagina' : 'schermo' }),
    },
    icona('schermo', 'icona--minuta'),
    h('span', { class: 'barra-comandi__tendina-testo' }, 'Proiezione'),
  )
}

/**
 * La tendina «File», per la barra del titolo.
 *
 * Il pulsante lo costruisce questo file e non `titleBar.ts` perché quel che
 * apre — i comandi del programma, i recenti, le pagine di sistema — nasce da
 * `gruppiDelMenu()`, che sta qui insieme al resto dei comandi. La barra del
 * titolo dice dove va; questo file dice che cos'è.
 */
export function tendinaDelProgramma (): HTMLElement {
  return pulsanteTendina({
    classe: 'barra-comandi__programma',
    // «File» e non «Registro»: è la tendina del documento — aprire, salvare,
    // archiviare — ed è il nome che quel menu porta in ogni altro programma.
    // «Registro» lo si leggeva come il nome dell'applicazione, e chi cercava
    // dove si salva non provava a premerlo.
    testo: 'File',
    simbolo: 'agenda',
    titolo: 'Il documento, l’anno, la posta: quel che si fa al registro intero',
    apri: menuDelProgramma,
  })
}

/** La ricerca di pagine e comandi, per la barra del titolo. */
export function pulsanteCerca (): HTMLElement {
  return h(
    'button',
    {
      class: 'barra-comandi__cerca',
      type: 'button',
      attr: { title: 'Cerca una pagina o un comando (Ctrl+K)', 'aria-label': 'Cerca' },
      onclick: () => apriPalette(),
    },
    icona('lente', 'icona--minuta'),
    h('span', null, 'Cerca'),
    h('kbd', null, 'Ctrl+K'),
  )
}

/** Un pulsante che apre una tendina: testo, freccia, e il menu che gli appartiene. */
function pulsanteTendina (opzioni: {
  classe: string
  testo: string
  simbolo: Parameters<typeof icona>[0]
  titolo: string
  apri: (bottone: HTMLElement) => void
}): HTMLElement {
  const bottone = h(
    'button',
    {
      class: ['barra-comandi__tendina', opzioni.classe],
      type: 'button',
      dataset: { fuoco: `menu-${opzioni.testo}` },
      attr: {
        title: opzioni.titolo,
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
      },
      onclick: () => opzioni.apri(bottone),
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'ArrowDown') {
          evento.preventDefault()
          opzioni.apri(bottone)
        }
      },
    },
    icona(opzioni.simbolo, 'icona--minuta'),
    h('span', { class: 'barra-comandi__tendina-testo' }, opzioni.testo),
    icona('giu', 'icona--minuta'),
  )
  return bottone
}

// ------------------------------------------------------------- i controlli

/**
 * Quel che nella barra non è un comando ma una scelta: il corso, l'anno, il
 * semestre.
 *
 * Non sono cose che si fanno: sono cose che si scelgono, e una palette che
 * elencasse «Corso: DIC4a» fra i comandi direbbe una bugia. Stanno nella riga
 * della navigazione perché è lì che appartengono: cambiano *che cosa* le
 * pagine mostrano, non che cosa fanno.
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
        // Cambiare corso rifà tutta la finestra, questa tendina compresa:
        // senza una chiave di fuoco, il secondo cambio andrebbe fatto
        // ricliccando, perché il primo si sarebbe portato via il fuoco.
        dataset: { fuoco: `barra-comandi-${opzioni.nome}` },
        value: opzioni.valore,
        onchange: (evento: Event) => opzioni.al((evento.target as HTMLSelectElement).value),
      },
      ...opzioni.figli,
    ),
  )
}

/**
 * Il corso su cui sono puntate le pagine: un elenco solo, «DIC4a · Matematica».
 *
 * I corsi con ore nel semestre scelto, ognuno con classe e materia scritte per
 * intero. Erano raccolti per materia — la materia come titolo del gruppo, la
 * classe come riga — e chi cercava «la quarta» doveva sapere in quale gruppo
 * guardare. Le due cose che identificano un corso stanno adesso sulla stessa
 * riga, in ordine alfabetico di classe, che è l'ordine in cui le si nomina.
 *
 * Sceglierne uno sistema anche il filtro per classe, perché le pagine filtrano
 * per tutti e due. È l'unica tendina del corso che esista: le pagine non ne
 * hanno più una loro, e questa comanda su tutte.
 *
 * Compare soltanto dove il corso è davvero il filtro — `siLavoraSuUnCorso()` —
 * e non in ogni pagina. Nel calendario, nelle pendenze, in Corsi e in Classi
 * non cambiava niente di quel che si stava guardando: restava lì a dire un
 * nome, e con lui la domanda «allora perché questa pagina non me lo filtra?».
 * Il corso scelto non si perde quando la tendina sparisce: torna scritto
 * appena si rientra in una pagina del corso.
 */
function sceltaCorso (): Figlio {
  if (!siLavoraSuUnCorso()) return null
  const corrente = corsoDelContesto()
  // Il corso aperto resta in elenco anche se le sue ore cadono tutte
  // nell'altro semestre: è quello che le pagine stanno mostrando, e una
  // tendina che non lo elenca porterebbe scritto il nome di un altro.
  const nelSemestre = corsiNelSemestre()
  const corsi =
    corrente && !nelSemestre.some((c) => c.id === corrente.id)
      ? [...nelSemestre, corrente]
      : nelSemestre
  if (corsi.length === 0) return null

  return scelta({
    nome: 'corso',
    etichetta: 'Corso',
    titolo: 'Il corso su cui sono puntate le pagine del registro',
    valore: corrente?.id ?? '',
    al: scegliCorso,
    figli: corsi
      .map((corso) => ({ corso, nome: nomeDelCorso(corso) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
      .map(({ corso, nome }) =>
        h('option', { value: corso.id, selected: corso.id === corrente?.id }, nome),
      ),
  })
}

/**
 * La classe su cui è puntato il pannello del docente di classe.
 *
 * Solo le classi con la spunta «sono docente di classe»: le altre non hanno un
 * fascicolo da aprire, e elencarle qui vorrebbe dire una tendina in cui metà
 * delle voci portano su una pagina vuota. È la tendina che nel pannello fa il
 * lavoro che altrove fa quella del corso — dice su chi si sta lavorando, e lo
 * cambia — ed è per questo che le due non compaiono mai insieme.
 *
 * Con una classe sola resta lo stesso: è quella che dice di chi è il fascicolo
 * che si ha davanti, e senza non ci sarebbe scritto da nessuna parte.
 */
function sceltaClasse (): Figlio {
  if (!siLavoraSuUnaClasse()) return null
  const classi = classiDiCuiSonoDocente()
  if (classi.length === 0) return null
  const corrente = classeDelFascicolo()

  return scelta({
    nome: 'classe',
    etichetta: 'Classe',
    titolo: 'La classe di cui si sta guardando il fascicolo',
    valore: corrente?.id ?? '',
    al: scegliClasseDelFascicolo,
    figli: classi.map((classe) =>
      h('option', { value: classe.id, selected: classe.id === corrente?.id }, classe.nome),
    ),
  })
}

/**
 * Il filtro del calendario: un corso alla volta, o tutti.
 *
 * Sta nella riga delle scelte come le altre tendine — è lì che si cerca «che
 * cosa sto guardando» — ma non dice la stessa cosa di quella del corso delle
 * pagine del registro, e infatti scrive in un campo diverso. Quella dice su che
 * cosa sono puntate le pagine e le segue fra una e l'altra; questa restringe la
 * settimana e resta al calendario: si torna nel registro e ci si ritrova il
 * corso di prima, non quello che si era messo qui per guardare un'ora altrui.
 * Le due non compaiono mai insieme, così non c'è modo di scambiarle.
 *
 * Un filtro solo, e non anche quello per classe. La classe è già scritta nel
 * nome di ogni corso — «DIC4a · Matematica» — e una seconda tendina serviva
 * soltanto ad accorciare la prima: due gesti per restringere una volta, con la
 * seconda che si azzerava sotto le dita ogni volta che si toccava la prima.
 */
function filtriAgenda (): Figlio[] {
  if (!siFiltraLAgenda()) return []
  const corsi = corsiDellAnnoAperto()
  if (corsi.length === 0) return []

  return [
    scelta({
      nome: 'corso-agenda',
      etichetta: 'Corso',
      titolo: 'Restringe il calendario a un corso. Non cambia il corso del registro.',
      valore: stato.filtroCorsoAgendaId ?? '',
      al: (valore) => aggiorna({ filtroCorsoAgendaId: valore || null }),
      figli: [
        h('option', { value: '', selected: stato.filtroCorsoAgendaId === null }, 'Tutti i corsi'),
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
 * L'anno in uso e il periodo dei conti: due scelte, non due comandi.
 *
 * L'anno c'è anche quando è uno solo. Compariva da due in su — una tendina con
 * una voce sola non si cambia — ma è quella che dice di quale anno è tutto
 * quel che si sta guardando, e senza non c'era scritto da nessuna parte.
 */
function sceltaAnno (): Figlio {
  const anno = annoCorrente()
  if (!anno) return null

  return h(
    'div',
    { class: 'barra-comandi__scelte' },
    // L'anno non si sceglie da un elenco: è il documento aperto, e per
    // cambiarlo se ne apre un altro — dai recenti, qui accanto, o dal dialogo
    // di apertura. Qui si dice soltanto di quale anno è quel che si guarda.
    h(
      'div',
      { class: 'barra-comandi__scelta barra-comandi__scelta--ferma' },
      h('span', { class: 'barra-comandi__etichetta' }, 'Anno'),
      h('strong', { title: 'L’anno scolastico in uso' }, anno.etichetta),
    ),
    anno.semestri.length > 0
      ? scelta({
          nome: 'periodo',
          etichetta: 'Periodo',
          titolo: 'I conteggi — medie, assenze, ore — si fermano a questo periodo',
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
            h('option', { value: '', selected: stato.semestreId === null }, 'Anno intero'),
          ],
        })
      : null,
  )
}

/**
 * L'interruttore dello schermo per la classe.
 *
 * Sta qui e non fra le azioni di una pagina perché non appartiene a nessuna:
 * lo schermo è acceso o spento mentre si lavora su qualunque cosa, e chi sta
 * davanti alla classe deve poterlo leggere senza girarsi. Acceso, porta il
 * punto verde, e accanto al contesto compare il pulsante «Proiezione»,
 * con dentro tutti i suoi comandi.
 */
function interruttoreProiezione (): Figlio {
  const comando = comandoPerId('proiezione.schermo')
  if (!comando) return null
  const accesa = stato.proiezione.aperta

  const bottone = h(
    'button',
    {
      class: ['barra-comandi__schermo', accesa && 'barra-comandi__schermo--acceso'],
      type: 'button',
      attr: {
        title: aiutoDi(comando) ?? titoloDi(comando),
        'aria-label': titoloDi(comando),
        'aria-pressed': String(accesa),
      },
      onclick: () => {
        const esito = eseguiComando(comando)
        if (esito instanceof Promise) void conAttesa(bottone, esito)
      },
    },
    icona('schermo', 'icona--minuta'),
    h('span', null, titoloDi(comando)),
  )
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
  return h(
    'div',
    { class: 'barra-comandi__navigazione' },
    // La navigazione, il menu «File», il nome della pagina e la ricerca stanno
    // in cima, nella barra del titolo: parlano del registro intero. Qui resta
    // il contesto — di quale corso, di quale classe, di quale periodo è quel
    // che si sta guardando — e gli interruttori di quel che si tiene acceso
    // mentre si lavora.
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
    interruttoreProiezione(),
    // Accanto allo schermo per la classe, e non fra le azioni di una pagina:
    // sono le due cose che si accendono mentre si lavora su qualunque cosa, e
    // chi le cerca le cerca nello stesso posto.
    interruttoreAssistente(),
    // L'interruttore compare solo se c'è qualcosa da nascondere: su una pagina
    // senza azioni sarebbe un pulsante che non fa niente.
    conAzioni
      ? h(
          'button',
          {
            class: 'barra-comandi__interruttore',
            type: 'button',
            dataset: { fuoco: 'mostra-azioni' },
            attr: {
              title: nascoste ? 'Mostra le azioni (Ctrl+B)' : 'Nascondi le azioni (Ctrl+B)',
              'aria-label': nascoste ? 'Mostra le azioni' : 'Nascondi le azioni',
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
      attr: { role: 'region', 'aria-label': `Azioni: ${di}` },
    },
    ...gruppi.map(riquadro),
  )
}

export function barraComandi (): Figlio {
  // A schermo acceso, con la scheda «Proiezione» scelta, la riga mostra i
  // comandi dello schermo invece di quelli della pagina. Lo schermo spento
  // vince sulla scelta: la scheda non c'è più, e restare sui suoi comandi
  // vorrebbe dire una riga di pulsanti tutti spenti.
  const schermo = stato.proiezione.aperta && stato.schedaComandi === 'schermo'
  const gruppi = schermo ? gruppiDi('schermo') : gruppiDellaPagina(stato.vista)
  const nascoste = stato.azioniNascoste

  return h(
    'div',
    { class: 'barra-comandi' },
    rigaNavigazione(nascoste, gruppi.length > 0),
    gruppi.length === 0 ? null : rigaAzioni(gruppi, schermo ? 'Proiezione' : nomeDelPosto()),
  )
}
