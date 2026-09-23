// L'assistente dentro il registro: il riquadro a destra, e il suo interruttore.
//
// **Sta a destra, accanto al lavoro, e non è una pagina.** È la differenza che
// decide tutto il resto: una domanda sull'ora che si sta preparando si fa
// *mentre* la si prepara, e una pagina avrebbe costretto a lasciare quel che si
// stava guardando per andare a chiedere — cioè a perdere proprio la cosa di cui
// si voleva chiedere. Il riquadro si apre dal pulsante accanto a «Proietta» e
// resta aperto per tutta l'ora, come lo schermo per la classe: sono due cose
// che si accendono mentre si lavora su qualunque cosa, e per questo i loro due
// interruttori stanno nello stesso posto.
//
// Il riquadro è una colonna della griglia e non un velo sopra la pagina: il
// contenuto si stringe invece di essere coperto. Chi chiede «quante ore ha
// perso la 4a» sta guardando la 4a, e una risposta che le si mette davanti è
// una risposta che va richiusa per poterla usare.
//
// ------------------------------------------------------------------ staccato
//
// Ventitré rem bastano per una domanda corta e non per una risposta lunga, e
// non bastano mai a chi vuole tenere la conversazione aperta **accanto** al
// registro invece che dentro. Il pulsante «Stacca» la porta in una finestra
// sua, che si sposta e si ridimensiona come qualunque altra: la conversazione
// viaggia con lei, e questo riquadro si fa da parte finché non torna.
//
// Da staccato **il riquadro non disegna la conversazione**, e non è un
// dettaglio: due fili aperti sulla stessa chat sarebbero due cronologie
// diverse, ognuna con metà di quel che si è detto. Qui resta una riga che dice
// dov'è andata e il gesto per riprenderla.
//
// Il lavoro vero — i turni, il campo, gli attrezzi che passano — sta in
// `assistant/chat.ts`, che non conosce né questo riquadro né quella finestra:
// è il modulo che vive in tutte e due.

import {
  abbandona,
  collegaRidisegno,
  conversazioneInCorso,
  corpoAssistente,
  metti,
  prendi,
  rimetti,
  svuota,
} from './assistant/chat.js'
import {
  conGruppo,
  contestoSpento,
  conTendina,
  PARTI,
  parteSpente,
  riassunti,
  scorciatoiaDi,
  SCORCIATOIE,
  secondoLeParti,
  statoGruppo,
  tendineDi,
  type PartiContesto,
} from './assistant/parts.js'
import { pulsante, statoVuoto } from './components/base.js'
import { menuSotto, type ElementoMenu } from './components/menu.js'
import { icona } from './components/icons.js'
import { h, type Figlio } from './dom.js'
import { ascolta, azione } from './bridge.js'
import { veduta } from './viewpoint.js'
import { aggiorna, stato } from './state.js'

/**
 * Se la conversazione è in una finestra a parte.
 *
 * Lo dice l'host e non si ricorda: una finestra è aperta adesso o non lo è, e
 * un valore persistito direbbe «staccato» a un registro riaperto in cui quella
 * finestra non esiste più.
 */
let staccato = false

collegaRidisegno(() => aggiorna({}))

ascolta((messaggio) => {
  if (messaggio.tipo !== 'assistente.stato') return
  const prima = staccato
  staccato = messaggio.staccato

  // Rientrata: la conversazione torna con il messaggio, e il riquadro si
  // riapre su quel che si stavano dicendo invece che su una pagina bianca.
  //
  // Si guarda `rientro` e non `storia`, ed è il difetto per cui quel campo
  // esiste: una conversazione vuota è una conversazione, e chi staccava senza
  // aver ancora chiesto niente premeva «Riattacca», vedeva la finestra
  // chiudersi, e non trovava più l'assistente da nessuna parte.
  if (messaggio.rientro) {
    // `giro` c'è quando si riattacca a metà di una risposta: il riquadro
    // riprende il filo dall'host invece di ritrovarsi la domanda interrotta.
    metti(messaggio.storia ?? [], messaggio.bozza ?? '', messaggio.giro)
    aggiorna({ assistenteAperto: true })
    return
  }
  if (prima !== staccato) aggiorna({})
})

/** Se l'assistente è acceso nelle impostazioni del programma. */
function acceso (): boolean {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.assistente.attivo')
  return voce?.valore === true
}

/**
 * Se la dettatura è accesa: è quel che fa comparire il microfono nello
 * scrittoio.
 *
 * Interruttore suo e non quello dell'assistente: vogliono cose diverse — l'uno
 * Ollama, l'altra whisper.cpp e un modello sul disco — e chi ha soltanto il
 * primo non deve vedere un pulsante che non può funzionare.
 */
function dettaturaAccesa (): boolean {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.dettatura.attivo')
  return voce?.valore === true
}

/** Il modello scelto, per scriverlo in testata: si cambia spesso, all'inizio. */
function modelloScelto (): string {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.assistente.modello')
  return typeof voce?.valore === 'string' && voce.valore !== '' ? voce.valore : 'qwen2.5:7b'
}

// --------------------------------------------------- l'apertura e il riquadro

/**
 * Se il riquadro c'è, adesso.
 *
 * Spento nelle impostazioni non è mai aperto, qualunque cosa dica lo stato: è
 * la riga che fa sparire la colonna insieme al pulsante, invece di lasciare a
 * destra ventitré rem che dicono soltanto «spento». Lo legge anche il guscio,
 * ed è il motivo per cui si guarda qui e non si azzera `assistenteAperto`: la
 * colonna deve sparire *e* il contenuto riprendersi il posto, con una riga
 * sola.
 *
 * Lo stato resta com'era apposta. Chi spegne per un'ora e riaccende ritrova il
 * riquadro dov'era, invece di doverlo riaprire perché nel frattempo qualcuno
 * gli aveva scritto «chiuso» sopra.
 */
export function assistenteAperto (): boolean {
  return stato.assistenteAperto && acceso()
}

function imposta (aperto: boolean, restituisciFuoco = false): void {
  aggiorna({ assistenteAperto: aperto })
  if (aperto) {
    // Il fuoco va nel campo: si apre il riquadro per scrivere, e obbligare a un
    // secondo clic per cominciare a battere sarebbe un clic che non serve a
    // niente. Dopo il ridisegno, perché prima il campo non c'è ancora.
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('.assistente__campo')?.focus()
    })
    return
  }
  if (restituisciFuoco) requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-fuoco="apri-assistente"]')?.focus()
  })
}

/**
 * Stacca: la conversazione va all'host e da lì nella finestra nuova.
 *
 * `prendi()` la consegna **e la lascia qui vuota**. Se restasse, chiudendo la
 * finestra ci si ritroverebbe due cronologie che si contraddicono — quella
 * rimasta nel riquadro e quella che torna indietro — e nessuna delle due
 * sarebbe quella giusta.
 */
async function stacca (): Promise<void> {
  const bagaglio = prendi()
  imposta(false)
  const esito = await azione({
    tipo: 'assistente.stacca',
    storia: bagaglio.storia,
    ...(bagaglio.bozza !== '' ? { bozza: bagaglio.bozza } : {}),
    // La domanda ancora senza risposta: l'host tiene il filo da parte e la
    // finestra nuova lo riprende da dove era. Senza, staccare mentre il
    // modello sta leggendo voleva dire ribattere la domanda — ed è proprio
    // mentre la risposta tarda che il riquadro sta stretto.
    ...(bagaglio.giro ? { giro: bagaglio.giro } : {}),
  })
  if (esito.ok) {
    // Presa in carico di là: il filo che `prendi()` aveva lasciato aperto non
    // serve più, e restare iscritti vorrebbe dire due pagine che si scrivono
    // addosso la stessa risposta.
    abbandona()
    return
  }
  // Rifiutata: la conversazione torna dentro il riquadro, che si riapre.
  //
  // Senza questa metà, un rifiuto — l'assistente spento un istante prima, la
  // finestra che non si apre — lasciava il riquadro chiuso **e vuoto** e la
  // conversazione da nessuna parte. Il giro in volo è ancora il nostro:
  // `rimetti` non lo tocca, e la risposta arriva qui come se non fosse
  // successo niente. Il perché lo ha già detto `azione` con una notifica.
  rimetti(bagaglio)
  imposta(true)
}

/**
 * L'interruttore del riquadro, accanto a quello dello schermo per la classe.
 *
 * Sta lì e non fra le azioni di una pagina per la stessa ragione della
 * proiezione: non appartiene a nessuna pagina. Si apre mentre si lavora su
 * qualunque cosa, e chi sta preparando un'ora deve poterlo aprire senza prima
 * andare da un'altra parte.
 *
 * Non passa da `commands.ts` e non è un `ComandoUI`, come non lo sono
 * l'interruttore della sidebar e la scheda «Proiezione»: quelli aprono e
 * chiudono un pezzo della finestra, non fanno accadere niente al registro, e
 * nella palette sarebbero voci che promettono un'azione e muovono un pannello.
 *
 * Da staccato **porta davanti la finestra** invece di aprire il riquadro: è
 * dove la conversazione è finita, e aprire qui un secondo filo vuoto sarebbe
 * la risposta sbagliata alla domanda «dov'è l'assistente».
 */
export function interruttoreAssistente (): Figlio {
  // Spento, il pulsante non c'è. Accanto a «Proietta» ci sarebbe un'icona che
  // apre un riquadro con dentro la scritta «spento»: un gesto che non porta da
  // nessuna parte, in una barra dove ogni altro gesto fa qualcosa. Dove si
  // accende lo dice la sezione «Assistente» delle impostazioni, che è anche
  // l'unico posto in cui la spiegazione sta per intero.
  if (!acceso()) return null

  const aperto = assistenteAperto() && !staccato
  const nome = staccato
    ? 'Porta davanti l’assistente'
    : aperto ? 'Chiudi l’assistente' : 'Assistente'

  return h(
    'button',
    {
      class: [
        'barra-comandi__assistente',
        (aperto || staccato) && 'barra-comandi__assistente--aperto',
      ],
      type: 'button',
      dataset: { fuoco: 'apri-assistente' },
      attr: {
        title: staccato
          ? 'L’assistente è in una finestra a parte: porta davanti quella'
          : aperto
            ? 'Chiude il riquadro dell’assistente'
            : 'Chiedi del registro a parole tue: un modello locale legge e risponde',
        'aria-label': nome,
        'aria-pressed': String(aperto || staccato),
        'aria-expanded': String(aperto),
        'aria-controls': 'riquadro-assistente',
      },
      onclick: () => {
        // Staccato, `assistente.stacca` con una conversazione vuota non la
        // svuota e non la duplica: la finestra c'è già, e l'azione si limita a
        // riportarla davanti. Vedi `PannelloAssistente.apri`.
        if (staccato) void azione({ tipo: 'assistente.stacca', storia: [] })
        else imposta(!aperto)
      },
    },
    icona('bot'),
  )
}

/** Quel che il riquadro mostra mentre la conversazione è in un'altra finestra. */
function altrove (): Figlio {
  return h(
    'div',
    { class: 'assistente' },
    statoVuoto({
      simbolo: 'bot',
      titolo: 'L’assistente è staccato',
      // Il gesto per riprenderla sta **nella finestra**, e la frase lo dice:
      // la conversazione ce l'ha lei, e un «riportalo qui» premuto da questa
      // parte dovrebbe prima farsela dare — un giro in più e un modo in più di
      // perderla. Di qua resta il gesto onesto: portarla davanti.
      testo:
        'La conversazione è in una finestra a parte. Da là, «Riattacca» la riporta qui ' +
        'com’era: quel che vi siete detti viaggia con lei.',
      azione: pulsante({
        testo: 'Porta davanti la finestra',
        simbolo: 'duplica',
        al: () => void azione({ tipo: 'assistente.stacca', storia: [] }),
      }),
    }),
  )
}

/**
 * Che cosa il modello sta per sapere, detto nella riga sotto il nome.
 *
 * Sta scritto lì e non solo nel titolo del pulsante: è quel che cambia la
 * risposta, e chi scrive una domanda deve poterlo leggere senza passare il
 * mouse su niente. Tutto acceso non si dice — è il caso normale, e una riga
 * che lo ripetesse sarebbe rumore su ogni schermata.
 */
function notaContesto (): string {
  const parti = stato.contestoAssistente
  if (contestoSpento(parti)) return ' · senza contesto'
  const spente = parteSpente(parti)
  return spente === 0 ? '' : ` · contesto ridotto (${spente})`
}

// -------------------------------------------- l'interruttore del contesto
//
// Acceso, all'assistente arriva dove si sta guardando: la pagina, la scheda
// aperta, le tendine con dentro anche **che cosa si potrebbe scegliere**, gli
// id già risolti, l'elenco che si ha a schermo. Spento del tutto non arriva
// niente — e l'host butta via quel che teneva, perché una veduta di un minuto
// fa è il modo più sicuro di rispondere con precisione sulla classe sbagliata.
//
// Due ragioni per spegnere qualcosa, e sono diverse. La prima è la domanda
// generale: «come si calcola la quota di assenza» non ha niente a che fare con
// la 4a che si ha davanti, e un contesto pieno di filtri la restringe senza che
// nessuno l'abbia chiesto. La seconda è che dire a un modello il nome della
// classe che si sta guardando è una scelta di chi insegna — il modello gira su
// questa macchina e non esce niente, ma la scelta resta sua.
//
// **Otto interruttori indipendenti, e tre scorciatoie sopra.** Nessuna parte
// ne comanda un'altra: «la pagina che guardo» era il padrone di tutte, e
// spegnerla per non nominare la pagina portava via anche i filtri della barra
// che si erano lasciati accesi apposta. Il gesto di tutti i giorni — tutto,
// solo dove sono, niente — sta in cima al menu; gli otto restano sotto per
// quando serve la precisione. Vedi `assistant/parts.ts`.
/**
 * Il pulsante del contesto, ritrovato dopo un ridisegno.
 *
 * Il menu resta aperto mentre si accendono e si spengono le parti, e ogni
 * spunta rifà la testata: il nodo su cui il menu si era appeso a quel punto è
 * staccato, e un nodo staccato non ha più un rettangolo — il menu si
 * riaprirebbe nell'angolo in alto a sinistra dello schermo. Si ricerca quello
 * vivo, che è nello stesso posto perché la testata è la stessa.
 */
function bottoneDelContesto (): HTMLElement | null {
  return document.querySelector('.riquadro-assistente__contesto')
}

function vociDelContesto (): ElementoMenu[] {
  const parti = stato.contestoAssistente
  // Il valore di adesso sotto ogni voce: un interruttore che dice soltanto
  // «filtri» obbliga a spegnerlo per scoprire che cosa toglieva. La veduta si
  // compone **intera** — non quella ridotta dalle parti — perché qui si deve
  // leggere che cosa si sta togliendo, non quel che resta.
  const adesso = veduta()
  const dentro = riassunti(adesso)
  const tendine = tendineDi(adesso)
  const scorciatoia = scorciatoiaDi(parti)

  // La spunta si mette e il menu resta: le parti si accendono e si spengono
  // guardando l'effetto l'una sull'altra — «senza gli id che cosa resta?» — e
  // un menu che si chiude a ogni spunta obbliga a riaprirlo otto volte per
  // cambiare idea due.
  const scrivi = (nuove: PartiContesto) => {
    aggiorna({ contestoAssistente: nuove })
    queueMicrotask(() => {
      const vivo = bottoneDelContesto()
      if (vivo) menuSotto(vivo, vociDelContesto())
    })
  }

  /** Le tendine di un gruppo, per nome: quelle che la barra mostra adesso. */
  const campiDi = (quale: 'scelte' | 'filtri') =>
    tendine.filter((t) => t.gruppo === quale).map((t) => t.campo)

  /**
   * Un gruppo di tendine, con il suo segno a tre stati e le sue righe dentro.
   *
   * Tre stati e non due: il gruppo acceso a cui manca una tendina non è acceso
   * — sarebbe una spunta piena su un elenco bucato — e non è spento. Il segno
   * di mezzo è un trattino, come in ogni elenco a caselle, e accanto c'è
   * scritto quante ne entrano su quante.
   */
  const gruppo = (quale: 'scelte' | 'filtri'): ElementoMenu[] => {
    const parte = PARTI.find((p) => p.chiave === quale)
    if (!parte) return []
    const campi = campiDi(quale)
    const quanto = statoGruppo(parti, quale, campi)
    const quante = campi.filter((campo) => !parti.tendineSpente.includes(campo)).length
    const vuoto = campi.length === 0
    return [
      {
        testo: parte.testo,
        // Il conto accanto al valore quando non ci sono tutte: «2 su 3» dice
        // con le parole quel che il segno a metà dice con un trattino.
        descrizione: vuoto || quanto === 'tutto'
          ? dentro[quale]
          : `${dentro[quale]} · ${quante} su ${campi.length}`,
        titolo: parte.aiuto,
        simbolo: quanto === 'tutto'
          ? ('spunta' as const)
          : quanto === 'parte' ? ('meno' as const) : undefined,
        accesa: quanto !== 'niente',
        smorzato: vuoto,
        // Premuto quando è a metà accende **tutte**: è quel che la riga
        // promette. Da tutte accese spegne il gruppo, da spento lo riaccende
        // intero.
        al: () => scrivi(conGruppo(parti, quale, campi, quanto !== 'tutto')),
      },
      // Le tendine stanno **dentro** il loro gruppo e non in un elenco a parte
      // in fondo al menu: là erano un secondo elenco di parole simili, e niente
      // diceva guardando che spegnere il gruppo se le porta via tutte.
      ...tendine.filter((t) => t.gruppo === quale).map((tendina): ElementoMenu => {
        const accesa = !parti.tendineSpente.includes(tendina.campo)
        return {
          testo: tendina.campo,
          descrizione: tendina.valore,
          titolo: accesa
            ? `L’assistente sa che «${tendina.campo}» è ${tendina.valore}. Premi per non dirglielo.`
            : `L’assistente non sa niente di «${tendina.campo}». Premi per dirglielo.`,
          simbolo: accesa ? ('spunta' as const) : undefined,
          accesa: accesa && parti[quale],
          rientro: true,
          // Smorzata quando il gruppo è spento: la tendina resta com'era —
          // riaccendendo il gruppo si ritrova la sua spunta — ma adesso non
          // entra, e mostrarla viva sarebbe il menu che smentisce la busta.
          smorzato: !parti[quale],
          al: () => {
            // Accendere una tendina di un gruppo spento accende il gruppo:
            // altrimenti si mette un visto su una riga che non manda niente,
            // ed è il clic che non fa niente più sconcertante del menu.
            const con = conTendina(parti, tendina.campo, !accesa)
            scrivi(!accesa && !parti[quale] ? { ...con, [quale]: true } : con)
          },
        }
      }),
    ]
  }

  /** Una parte semplice: c'è o non c'è, e sotto si legge che cosa porta via. */
  const semplice = (
    chiave: 'pagina' | 'opzioni' | 'periodo' | 'riferimenti' | 'ricerca' | 'visibili',
  ): ElementoMenu => {
    const parte = PARTI.find((p) => p.chiave === chiave)
    return {
      testo: parte?.testo ?? chiave,
      descrizione: dentro[chiave],
      ...(parte ? { titolo: parte.aiuto } : {}),
      // Il visto dice **questa** parte e nient'altro: prima si spegneva da sé
      // quando era spenta «la pagina che guardo», e sette righe senza spunta
      // sotto una riga spenta facevano credere spento quel che nessuno aveva
      // toccato. Adesso le parti non si comandano fra loro.
      simbolo: parti[chiave] ? ('spunta' as const) : undefined,
      accesa: parti[chiave],
      smorzato: dentro[chiave] === 'niente qui',
      al: () => scrivi({ ...parti, [chiave]: !parti[chiave] }),
    }
  }

  return [
    // I tre modi che si vogliono davvero, in cima: «dimmi tutto», «solo dove
    // sono», «niente». Otto interruttori sono la precisione e non sono il gesto
    // di tutti i giorni, e farli a mano vuol dire otto clic guardando ogni
    // volta che cosa si è già spento.
    { titolo: 'In un gesto' },
    ...SCORCIATOIE.map((corta): ElementoMenu => ({
      testo: corta.testo,
      titolo: corta.aiuto,
      simbolo: scorciatoia === corta.chiave ? ('spunta' as const) : undefined,
      accesa: scorciatoia === corta.chiave,
      al: () => scrivi({ ...corta.parti }),
    })),
    'separatore' as const,
    { titolo: 'Che cosa sa della pagina' },
    semplice('pagina'),
    ...gruppo('scelte'),
    ...gruppo('filtri'),
    semplice('opzioni'),
    semplice('periodo'),
    semplice('riferimenti'),
    semplice('ricerca'),
    semplice('visibili'),
  ]
}

/**
 * Il pulsante del contesto: tre stati, e si distinguono senza aprire il menu.
 *
 * Spento del tutto vuol dire che non parte niente, e adesso è uno stato che si
 * chiede — «Niente del tutto», in cima al menu — invece di essere la
 * conseguenza nascosta di aver spento «la pagina che guardo».
 */
function contesto (): Figlio {
  if (staccato) return null
  const parti = stato.contestoAssistente
  const spento = contestoSpento(parti)
  const spente = parteSpente(parti)
  const bottone = pulsante({
    titolo: spento
      ? 'L’assistente non sa niente della pagina. Premi per scegliere che cosa dirgli.'
      : spente === 0
        ? 'L’assistente sa dove stai guardando: pagina, tendine, filtri, id, elenco a schermo. Premi per scegliere.'
        : `L’assistente sa dove stai guardando, meno ${spente} cos${spente === 1 ? 'a' : 'e'}. Premi per scegliere.`,
    simbolo: 'filtro',
    variante: spento ? 'fantasma' : 'sottile',
    premuto: !spento,
    classe: [
      'riquadro-assistente__contesto',
      !spento && spente === 0 ? 'riquadro-assistente__contesto--acceso' : '',
      !spento && spente > 0 ? 'riquadro-assistente__contesto--parziale' : '',
    ].filter(Boolean).join(' '),
    al: () => menuSotto(bottone, vociDelContesto()),
  })
  return bottone
}

/**
 * Il riquadro a destra. Chiuso non disegna niente: non è un pannello nascosto
 * con `hidden`, è una colonna che non c'è — e il contenuto riprende il posto.
 */
export function pannelloAssistente (): Figlio {
  if (!assistenteAperto()) return null

  return h(
    'aside',
    {
      id: 'riquadro-assistente',
      class: 'riquadro-assistente',
      attr: { 'aria-label': 'Assistente' },
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key !== 'Escape') return
        evento.preventDefault()
        imposta(false, true)
      },
    },
    h(
      'header',
      { class: 'riquadro-assistente__testa' },
      h(
        'div',
        { class: 'riquadro-assistente__nome' },
        icona('bot', 'icona--minuta'),
        h('strong', null, 'Assistente'),
      ),
      h(
        'span',
        { class: 'riquadro-assistente__nota' },
        // «Non scrive» e non più «sola lettura»: l'assistente apre le pagine del
        // registro, e una riga che promettesse la sola lettura direbbe il falso
        // la prima volta che il registro si sposta da solo. Quel che la riga
        // deve garantire è l'altra metà, ed è quella vera: non tocca i dati.
        staccato
          ? 'in una finestra a parte'
          : acceso()
            // Lo stato del contesto sta scritto qui e non solo nel titolo del
            // pulsante: è quel che il modello sta per sapere, e chi scrive una
            // domanda deve poterlo leggere senza passare il mouse su niente.
            ? `${modelloScelto()} · non scrive${notaContesto()}`
            : 'spento',
      ),
      // L'interruttore del contesto, accanto alla conversazione e non nelle
      // impostazioni: è una cosa che si cambia **per una domanda** — «lascia
      // stare la pagina, dimmi in generale» — e un interruttore che per essere
      // premuto obbliga ad aprire un'altra pagina è un interruttore che non si
      // preme. Sta qui anche perché è qui che se ne vede l'effetto: la riga
      // sotto la testata dice che cosa il modello sta per sapere.
      contesto(),
      !staccato && conversazioneInCorso()
        ? pulsante({
            titolo: 'Dimentica la conversazione',
            simbolo: 'cestino',
            variante: 'fantasma',
            al: () => svuota(),
          })
        : null,
      !staccato
        ? pulsante({
            titolo: 'Stacca l’assistente in una finestra sua',
            simbolo: 'duplica',
            variante: 'fantasma',
            al: () => void stacca(),
          })
        : null,
      pulsante({
        titolo: 'Chiudi l’assistente',
        simbolo: 'chiudi',
        variante: 'fantasma',
        al: () => imposta(false, true),
      }),
    ),
    staccato
      ? altrove()
      : corpoAssistente({
          acceso: acceso(),
          modello: modelloScelto(),
          dettatura: dettaturaAccesa(),
          // Il contesto si compone **quando si preme Invio**, e parte dentro
          // la busta della domanda.
          //
          // Prima viaggiava per conto suo, come `assistente.contesto`: una
          // scrittura, quindi in coda, mentre la domanda la coda la salta.
          // Bastava un rapporto PDF in corso — dieci secondi — per cambiare
          // corso dalla tendina, scrivere la domanda e sentirsi rispondere
          // **sul corso di prima**, con la classe sbagliata dichiarata per
          // nome. L'altro canale resta: serve alla finestra staccata, che il
          // registro non ce l'ha e non se lo può comporre.
          contesto: () => secondoLeParti(veduta(), stato.contestoAssistente),
          alleImpostazioni: () => aggiorna({
            vista: 'impostazioni',
            schedaProgramma: 'assistente',
          }),
        }),
  )
}
