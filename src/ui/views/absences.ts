// I periodi di assenze del docente di classe: i fogli, la mail, le firme.
//
// La forma è quella dei documenti — allievi in riga, caselle in colonna —
// perché la domanda è la stessa e si legge nello stesso modo: per colonna si
// vede a che punto è la classe, per riga a che punto è uno. Quel che cambia
// sono le colonne, che qui non sono cose diverse ma la stessa cosa a tre
// momenti: il foglio che parte, la mail che chiede la firma, il foglio che
// torna firmato. Guardata così, la casella scura dice sempre la prossima mossa.
//
// Un periodo per volta: cinque colonne per venticinque nomi riempiono lo
// schermo, e due matrici aperte sono una pagina in cui non si trova più niente.
//
// **E i PDF entrano come nell'archivio documentale.** La scuola stampa i
// rapporti di tutta la classe in un file solo: lo si trascina sulla pagina — o
// lo si sceglie con «Carica dei PDF» — e da quel momento è una voce come le
// altre, che si apre nella cornice e si guarda a pagine. Le pagine si prendono
// con il mouse e si posano sulla casella di chi sono, che è anche il solo modo
// di dire *che cosa* sono: assenze o ritardi, vergini o firmati, si somigliano
// riga per riga, e indovinarlo vorrebbe dire mandare all'azienda il foglio
// dell'altra colonna. Prima l'unica via era il dialogo, un file per casella, e
// per usarlo bisognava ritagliare il PDF fuori dal registro.
//
// **E il foglio si guarda qui dentro**, nella cornice accanto alla matrice,
// come nell'archivio documentale. Dopo «chi» viene sempre «che cosa», e qui
// viene prima di spedire: un rapporto che parte per l'azienda va guardato, e
// fin qui costava una finestra del lettore di sistema per foglio — venticinque
// finestre da ritrovare nella barra delle applicazioni. Stesso telaio, stessi
// gesti: le frecce scorrono i fogli del periodo nell'ordine della matrice, il
// «7 di 23» dice quanto manca, e la casella da cui si è partiti resta accesa.

import {
  avanzamentoAssenze,
  daSpedire,
  destinatariAssenze,
  etichettaFoglio,
  faseRiga,
  foglioDi,
  periodoDetto,
  raggiungibile,
  rigaDi,
  righeVive,
  TIPI_RAPPORTO,
  vergini,
  type RichiestaFirma,
} from '../../domain/absences.js'
import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import type { SegnalazioneAssenza } from '../../domain/alerts.js'
import { PIF, Uno } from '../../domain/lexicon.js'
import { formattaData, giornoDi } from '../../domain/dates.js'
import type {
  Allievo,
  BloccoAssenze,
  Classe,
  Istante,
  Smistamento,
  TipoRapporto,
} from '../../domain/models.js'
import {
  conAttesa,
  pastiglia,
  pulsante,
  quantoMisura,
  scheda,
  statoVuoto,
  titoloGruppo,
} from '../components/base.js'
import { corniceDocumento } from '../components/frame.js'
import { sintesiIncassata } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { dimentica } from '../components/thumbnails.js'
import { conferma } from '../components/modal.js'
import { h, type Figlio } from '../dom.js'
import { tabella } from '../components/table.js'
import { moduloBloccoAssenze, moduloImportaAssenze } from '../forms.js'
import { azione } from '../bridge.js'
import { aggiorna, fascicoloDi, stato, toccaIlSemestreScelto, uriDato } from '../state.js'

import { inventario, pannelloArchivio, siGuardaQui } from './archive.js'
import { accettaPagineAssenze, sfoglioSmistamento } from './pageBrowser.js'
import {
  caricaPdf,
  codaLettura,
  comandiDelPdf,
  pdfDaDividere,
  pdfInAttesa,
  rendiBersaglio,
  type Vetrina,
} from './sorting.js'

/** Le cinque colonne della matrice, nell'ordine in cui si percorrono. */
interface Colonna {
  chiave: string
  titolo: string
  breve: string
}

const COLONNE: Colonna[] = [
  { chiave: 'vergine-assenze', titolo: 'Assenze da spedire', breve: 'ass.' },
  { chiave: 'vergine-ritardi', titolo: 'Ritardi da spedire', breve: 'rit.' },
  { chiave: 'invio', titolo: 'Richiesta di firma spedita', breve: 'mail' },
  { chiave: 'firmato-assenze', titolo: 'Assenze firmate', breve: 'ass. ✓' },
  { chiave: 'firmato-ritardi', titolo: 'Ritardi firmati', breve: 'rit. ✓' },
]

// ------------------------------------------------- i fogli del periodo

/**
 * Un foglio del periodo come lo si guarda in pagina: di chi è, che cos’è, e
 * se il file c’è ancora.
 *
 * È la stessa cosa che l’archivio documentale chiama `RigaArchivio`, e per lo
 * stesso mestiere: la cornice inquadra un percorso, le frecce scorrono un
 * elenco, e il «7 di 23» dice quanto manca alla fine. Qui l’elenco non sono i
 * documenti che la classe porta ma i rapporti che l’azienda firma, e la
 * differenza finisce lì: chi controlla venticinque scansioni prima di spedirle
 * fa lo stesso lavoro di chi ne controlla venticinque prima di archiviarle.
 */
interface FoglioInPagina {
  /** Il percorso dentro l’anno: è quel che la cornice inquadra. */
  file: string
  /** Come si chiamava il file quando è arrivato. */
  nome: string
  /** Di chi è, per esteso: è il titolo in testa alla cornice. */
  etichetta: string
  /** Che foglio è: «assenze», «ritardi firmati». */
  che: string
  allievoId: string
  genere: TipoRapporto
  firmato: boolean
  aggiuntoIl: Istante | null
  /** Quanto misura, in byte; zero quando il file non è nell’inventario. */
  misura: number
  /** Quante volte è stato riscritto: fa ricaricare la cornice. */
  revisione: number
  /** Se il file è ancora dentro il documento dell’anno. */
  presente: boolean
  /**
   * Il PDF di classe da cui non è ancora uscito niente, se questa voce è uno
   * di quelli.
   *
   * In fila con i fogli e non in un elenco a parte: un PDF arrivato per posta e
   * non ancora diviso è, per chi guarda, la stessa cosa di un rapporto già
   * archiviato — un foglio da leggere per decidere che cosa farne — e le frecce
   * devono poter scorrere una fila sola. È la stessa scelta dell’archivio
   * documentale, e per la stessa ragione.
   */
  smistamentoId?: string
}

/** Le quattro caselle di una riga, nell’ordine in cui stanno in colonna. */
const CASELLE: Array<{ genere: TipoRapporto, firmato: boolean }> = [
  { genere: 'assenze', firmato: false },
  { genere: 'ritardi', firmato: false },
  { genere: 'assenze', firmato: true },
  { genere: 'ritardi', firmato: true },
]

/**
 * I fogli caricati in un periodo, nell’ordine in cui si scorrono.
 *
 * L’ordine è quello della matrice — le persone come stanno in elenco, e dentro
 * ognuna le sue caselle da sinistra a destra — perché è quello in cui si
 * guarda: si scende una riga per volta, e le frecce fanno quel che farebbe il
 * dito seguendo la griglia. Un foglio che non c’è più resta in elenco: il
 * registro dice che quel rapporto è stato caricato, e chi guarda deve poter
 * vedere che del file non è rimasto niente.
 */
function fogliDelPeriodo (
  blocco: BloccoAssenze,
  allievi: Allievo[],
  daDividere: Smistamento[] = [],
): FoglioInPagina[] {
  const elenco: FoglioInPagina[] = []
  for (const allievo of allievi) {
    const riga = rigaDi(blocco, allievo.id)
    if (!riga) continue
    for (const casella of CASELLE) {
      const foglio = foglioDi(riga, casella.genere, casella.firmato)
      if (!foglio) continue
      elenco.push({
        file: foglio.file,
        nome: foglio.nome,
        etichetta: nomeCompleto(allievo),
        che: etichettaFoglio(casella.genere, casella.firmato),
        allievoId: allievo.id,
        genere: casella.genere,
        firmato: casella.firmato,
        aggiuntoIl: foglio.aggiuntoIl ?? null,
        ...inventario(foglio.file),
      })
    }
  }

  // In fondo quel che resta da decidere, come nell’archivio: prima si controlla
  // quel che è a posto, e si finisce con il mucchio da dividere.
  for (const smistamento of daDividere) {
    const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
    elenco.push({
      file: smistamento.file,
      nome: smistamento.nome,
      etichetta: smistamento.nome,
      che: `da dividere · ${restano || smistamento.pagine} pagine`,
      allievoId: '',
      genere: 'assenze',
      firmato: false,
      aggiuntoIl: smistamento.arrivatoIl,
      smistamentoId: smistamento.id,
      ...inventario(smistamento.file),
    })
  }
  return elenco
}

/**
 * Apre un foglio nella cornice, o la chiude passando `null`.
 *
 * Con il foglio se ne vanno le pagine che se n’erano disegnate, come
 * nell’archivio: sono decine di megabyte di fotografie, e un percorso riusato
 * da una scansione rifatta mostrerebbe quella di ieri.
 */
function guardaIlFoglio (percorso: string | null): void {
  if (percorso !== stato.anteprimaAssenze) dimentica()
  aggiorna({ anteprimaAssenze: percorso })
}

/**
 * La cornice di questa pagina, per chi porta dentro i PDF.
 *
 * Il giro dei file che entrano — trascinarli, sceglierli, aprirne le pagine —
 * è quello dell’archivio documentale e sta scritto una volta sola: qui si dice
 * soltanto dove il PDF appena entrato si va a guardare.
 */
const VETRINA_ASSENZE: Vetrina = {
  aperto: () => stato.anteprimaAssenze,
  apri: guardaIlFoglio,
}

/** Vero se quel foglio è quello aperto adesso: la casella lo dice accendendosi. */
function apertoQui (percorso: string | undefined): boolean {
  return Boolean(percorso) && stato.anteprimaAssenze === percorso
}

/** Dove sta, nell’elenco, il foglio aperto; `-1` se non se ne guarda nessuno. */
function indiceAperto (fogli: FoglioInPagina[]): number {
  const percorso = stato.anteprimaAssenze
  return percorso ? fogli.findIndex((foglio) => foglio.file === percorso) : -1
}

/**
 * Una casella di foglio: aperta se il file c'è, da riempire se manca.
 *
 * Un clic fa quel che serve in quel momento — apre il PDF, o lo chiede — e il
 * cestino accanto, che compare passando sulla riga, lo toglie. È lo stesso
 * gesto della matrice dei documenti, e volutamente: sono due matrici della
 * stessa pagina, e due modi di spuntare sarebbero due modi di sbagliarsi.
 */
function cellaFoglio (
  classe: Classe,
  blocco: BloccoAssenze,
  allievo: Allievo,
  genere: TipoRapporto,
  firmato: boolean,
) {
  const riga = rigaDi(blocco, allievo.id)
  const foglio = foglioDi(riga, genere, firmato)
  const atteso = firmato && foglioDi(riga, genere, false) !== null

  const comando = {
    classeId: classe.id,
    bloccoId: blocco.id,
    allievoId: allievo.id,
    genere,
    firmato,
  }

  const cella = h(
    'td',
    { class: 'tabella__cella' },
    h(
      'div',
      { class: 'cella-documento__gruppo' },
      h(
        'button',
        {
          class: [
            'cella-documento',
            foglio
              ? 'cella-documento--consegnato'
              : atteso
                ? 'cella-documento--atteso'
                : 'cella-documento--fuori',
            foglio && apertoQui(foglio.file) && 'cella-documento--aperta',
          ],
          type: 'button',
          attr: {
            title: foglio
              ? `Guarda ${foglio.nome}`
              : `${etichettaFoglio(genere, firmato)} di ${nomeCompleto(allievo)}: scegli il file`,
          },
          // Il foglio si apre nella cornice qui accanto e non nel lettore del
          // sistema: prima di spedire venticinque rapporti bisogna guardarli,
          // e una finestra per foglio da ritrovare nella barra delle
          // applicazioni vuol dire aprirne venti e dare per buoni gli altri
          // cinque. Il programma del sistema resta a un clic, in testa alla
          // cornice, per chi deve annotarlo o stamparlo.
          onclick: (evento: MouseEvent) => {
            if (foglio) {
              guardaIlFoglio(foglio.file)
              return
            }
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione({ tipo: 'assenze.foglio.aggiungi', ...comando }),
            )
          },
        },
        icona(foglio ? (firmato ? 'firma' : 'documento') : 'piu', 'icona--minuta'),
      ),
      foglio
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: `Togli ${foglio.nome}`,
            classe: 'cella-documento__modifica',
            al: () => {
              // Prima si chiude la cornice: il foglio che si sta buttando non
              // deve restare inquadrato mentre sparisce, con le frecce puntate
              // su un elenco più corto.
              if (apertoQui(foglio.file)) guardaIlFoglio(null)
              return azione({ tipo: 'assenze.foglio.togli', ...comando })
            },
          })
        : null,
    ),
  )

  // La casella prende anche le pagine di un PDF di classe: i rapporti della
  // scuola arrivano in un file solo, e il gesto che li archivia è prenderne le
  // pagine e posarle su chi sono. Che cosa siano — assenze o ritardi, vergini
  // o firmati — lo dice la casella, ed è l’unica cosa che il file non può
  // sapere.
  accettaPagineAssenze(cella, {
    classeId: classe.id,
    bloccoId: blocco.id,
    allievoId: allievo.id,
    genere,
    firmato,
    etichetta: `${nomeCompleto(allievo)} · ${etichettaFoglio(genere, firmato)}`,
  })
  return cella
}

/**
 * La casella della mail. Non è un file ma un fatto: o è partita, o non è
 * ancora partita, o è andata storta — e in quest'ultimo caso il motivo si legge
 * passandoci sopra, perché è quasi sempre un indirizzo sbagliato e si corregge
 * sulla scheda personale.
 */
function cellaInvio (classe: Classe, blocco: BloccoAssenze, allievo: Allievo) {
  const riga = rigaDi(blocco, allievo.id)
  const pronti = vergini(riga).length
  const invio = riga?.invio ?? null
  const partita = Boolean(invio && !invio.errore)
  const { indirizzi, senzaIndirizzo } = destinatariAssenze(blocco, allievo, fascicoloDi(classe.id))

  const spedisci = async () => {
    if (indirizzi.length === 0) {
      void azione({
        tipo: 'sistema.messaggio',
        livello: 'avviso',
        testo:
          `Non si sa a chi scrivere per ${nomeCompleto(allievo)}: manca ` +
          `${senzaIndirizzo.join(', ')}. L’indirizzo del datore di lavoro sta nella sua scheda.`,
      })
      return
    }
    const sicuro = await conferma({
      titolo: partita
        ? `Rifare la bozza per ${nomeCompleto(allievo)}?`
        : `Preparare la bozza per ${indirizzi.join(', ')}?`,
      testo:
        `${pronti} fogli in allegato. La bozza si apre nel programma di posta, e a spedirla sei tu.` +
        (partita ? '\n\nLa richiesta era già partita: arriverà una seconda volta.' : ''),
      testoConferma: 'Prepara',
    })
    if (!sicuro) return
    await azione({
      tipo: 'assenze.invia',
      classeId: classe.id,
      bloccoId: blocco.id,
      allieviIds: [allievo.id],
    })
  }

  if (pronti === 0 && !invio) {
    return h(
      'td',
      { class: 'tabella__cella' },
      h('span', { class: 'cella-documento cella-documento--vuota' }, '—'),
    )
  }

  return h(
    'td',
    { class: 'tabella__cella' },
    h(
      'div',
      // La busta e il visto stanno affiancati, come il documento e il suo
      // cestino nelle altre caselle: sono lo stesso gesto in due tempi —
      // preparo la mail, poi dico che è partita — e su due righe la casella
      // di chi riguarda diventava alta il doppio delle altre.
      { class: 'cella-documento__gruppo' },
      h(
        'button',
        {
          class: [
            'cella-documento',
            invio?.errore
              ? 'cella-documento--scaduto'
              : partita
                ? 'cella-documento--consegnato'
                : 'cella-documento--atteso',
          ],
          type: 'button',
          attr: {
            title: invio?.errore
              ? `Non partita: ${invio.errore}\nRiprova`
              : partita
                ? `Spedita il ${formattaData(giornoDi(invio?.inviatoIl) ?? '')} a ${invio?.destinatari.join(', ')}\nRispedisci`
                : indirizzi.length === 0
                  ? `Manca l’indirizzo: ${senzaIndirizzo.join(', ')}`
                  : `Spedisci a ${indirizzi.join(', ')}`,
          },
          onclick: (evento: MouseEvent) =>
            void conAttesa(evento.currentTarget as HTMLButtonElement, spedisci()),
        },
        icona(invio?.errore ? 'avviso' : partita ? 'spunta' : 'posta', 'icona--minuta'),
      ),
      // Il visto accanto alla busta: la bozza la apre il pulsante grande, che
      // sia partita lo dice questo. Il registro non domanda più «l'hai
      // spedita?» subito dopo l'apertura — quando nessuno l'aveva mandata.
      pronti > 0 || partita
        ? pulsante({
            simbolo: 'spunta',
            variante: partita ? 'sottile' : 'fantasma',
            classe: 'cella-documento__modifica',
            titolo: partita
              ? `Riporta da mandare la richiesta di ${nomeCompleto(allievo)}`
              : `Segna spedita la richiesta di ${nomeCompleto(allievo)}`,
            al: () =>
              azione({
                tipo: 'assenze.spunta',
                classeId: classe.id,
                bloccoId: blocco.id,
                allievoId: allievo.id,
                spedita: !partita,
              }),
          })
        : null,
    ),
  )
}

/** In che fase sta un allievo, detto in una pastiglia. */
function pastigliaFase (blocco: BloccoAssenze, allievo: Allievo) {
  switch (faseRiga(rigaDi(blocco, allievo.id))) {
    case 'firmato':
      return pastiglia('firmato', 'positivo', 'spunta')
    case 'in-attesa':
      return pastiglia('in attesa', 'informativo')
    case 'da-spedire':
      return pastiglia('da spedire', 'attenzione')
    default:
      return h('span', { class: 'testo-quieto' }, '—')
  }
}

function tabellaAssenze (classe: Classe, blocco: BloccoAssenze, allievi: Allievo[]) {
  return tabella({
    variante: ['documenti', 'assenze'],
    griglia: true,
    scorrimento: `assenze:${classe.id}:${blocco.id}`,
    intestazione: [
      h('th', { class: 'tabella__nome' }, Uno(PIF)),
      ...COLONNE.map((colonna) =>
        h(
          'th',
          { class: 'tabella__richiesta', attr: { title: colonna.titolo } },
          h('span', { class: 'tabella__richiesta-titolo' }, colonna.breve),
        ),
      ),
      h('th', { class: 'tabella__media' }, 'Stato'),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        { class: faseRiga(rigaDi(blocco, allievo.id)) === 'fuori' ? 'tabella__riga--spenta' : undefined },
        // `th scope="row"` e non `td`: in una matrice la cella letta da chi
        // usa uno schermo vocale dice «presente» e basta, e **di chi** lo
        // dica lo sa solo l'intestazione di riga. Lo stile non cambia:
        // `.tabella th, .tabella td` è già comune.
        h(
          'th',
          { class: 'tabella__nome', attr: { scope: 'row' } },
          h('span', null, nomeCompleto(allievo)),
          raggiungibile(allievo)
            ? null
            : h(
                'small',
                {
                  class: 'testo-negativo',
                  attr: { title: 'Senza l’indirizzo del datore l’e-mail non parte' },
                },
                ' senza datore',
              ),
        ),
        ...TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, false)),
        cellaInvio(classe, blocco, allievo),
        ...TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, true)),
        h('td', { class: 'tabella__media' }, pastigliaFase(blocco, allievo)),
      ),
    ),
  })
}

/** Una riga dell'elenco dei periodi: come va, e un clic per aprirlo. */
function rigaPeriodo (classe: Classe, blocco: BloccoAssenze, aperto: boolean) {
  const conto = avanzamentoAssenze(blocco)
  return h(
    'li',
    { class: ['periodo-assenze', aperto && 'periodo-assenze--aperto'] },
    h(
      'button',
      {
        class: 'documento__titolo',
        type: 'button',
        attr: { title: 'Apri il periodo' },
        onclick: () => aggiorna({ bloccoAssenzeId: blocco.id }),
      },
      icona('calendario', 'icona--minuta'),
      h('span', null, periodoDetto(blocco)),
    ),
    h(
      'small',
      { class: 'testo-quieto' },
      conto.interessati === 0
        ? 'nessun foglio caricato'
        : `${conto.firmate}/${conto.interessati} firmati · ${conto.inviate} spediti`,
    ),
    conto.falliti > 0 ? pastiglia(`${conto.falliti} non partite`, 'negativo', 'avviso') : null,
    conto.completo ? pastiglia('completo', 'positivo', 'spunta') : null,
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: 'Modifica il periodo',
      al: () => moduloBloccoAssenze(classe, blocco),
    }),
  )
}

// -------------------------------------------------------------- la cornice

/** Il passo avanti e il passo indietro nell’elenco dei fogli. */
function scorri (fogli: FoglioInPagina[], indice: number, passo: -1 | 1): Figlio {
  const prossimo = fogli[indice + passo]
  const avanti = passo === 1
  return pulsante({
    simbolo: avanti ? 'giu' : 'su',
    variante: 'fantasma',
    titolo: prossimo
      ? `${avanti ? 'Il foglio dopo' : 'Il foglio prima'}: ${prossimo.etichetta} · ${prossimo.che}`
      : `Non c’è nessun foglio ${avanti ? 'dopo' : 'prima'} di questo`,
    disabilitato: !prossimo,
    al: () => guardaIlFoglio(prossimo?.file ?? null),
  })
}

/**
 * Il foglio aperto: testata con i suoi gesti, e sotto il rapporto vero.
 *
 * È la cornice dell’archivio documentale, con lo stesso telaio e gli stessi
 * gesti — scorrere, aprire fuori, buttare via, chiudere — perché è lo stesso
 * lavoro: controllare una cartella di scansioni prima di mandarla fuori. Qui
 * quel che sta scritto in testa è di chi è il foglio e che foglio è — vergine
 * o firmato — perché due rapporti della stessa persona si somigliano fin quasi
 * alla firma in fondo, ed è esattamente quella che si sta cercando.
 */
function corniceAssenze (
  classe: Classe,
  blocco: BloccoAssenze,
  fogli: FoglioInPagina[],
  indice: number,
  allievi: Allievo[],
): Figlio {
  const foglio = fogli[indice]
  // Un PDF ancora da dividere si guarda a pagine e non come un foglio solo: è
  // lì che sta il lavoro, e le pagine si prendono con il mouse e si posano
  // sulla casella di chi sono. Il lettore resta a un clic, per quando bisogna
  // proprio leggere.
  const daDividere = foglio.smistamentoId
    ? stato.registro.smistamenti.find((sm) => sm.id === foglio.smistamentoId) ?? null
    : null
  const aPagine = daDividere !== null && stato.sfoglioArchivio === 'pagine'
  const indirizzo = uriDato(foglio.file)
  const quando = foglio.aggiuntoIl ? formattaData(foglio.aggiuntoIl.slice(0, 10)) : null
  const comando = {
    classeId: classe.id,
    bloccoId: blocco.id,
    allievoId: foglio.allievoId,
    genere: foglio.genere,
    firmato: foglio.firmato,
  }

  // Si chiede, e si chiede qui: nella matrice il cestino sta accanto alla
  // casella che si sta guardando, qui il foglio riempie mezzo schermo e il
  // pulsante è lontano dalla casella da cui viene. Un rapporto firmato è
  // spesso l’unica copia che ne esiste.
  const butta = async () => {
    const sicuro = await conferma({
      titolo: daDividere
        ? `Buttare via «${foglio.nome}»?`
        : `Togliere ${foglio.che} di ${foglio.etichetta}?`,
      testo: daDividere
        ? `«${foglio.nome}» va nel cestino con tutto quel che resta da dividere. Le pagine già ` +
          'assegnate restano dove sono: quelle sono archiviate.'
        : `${foglio.nome} va nel cestino del documento dell’anno` +
          (foglio.firmato
            ? ': è la prova della firma, ed è spesso l’unica copia che esiste.'
            : ', e quella casella torna da riempire.'),
      testoConferma: daDividere ? 'Butta via' : 'Togli',
      pericolo: true,
    })
    if (!sicuro) return
    guardaIlFoglio(null)
    await azione(
      daDividere
        ? { tipo: 'smistamento.elimina', smistamentoId: daDividere.id }
        : { tipo: 'assenze.foglio.togli', ...comando },
    )
  }

  /** Il gesto con cui questa voce si apre nel programma del sistema. */
  const apriFuori = () =>
    azione(
      daDividere
        ? { tipo: 'smistamento.apri', smistamentoId: daDividere.id }
        : { tipo: 'assenze.foglio.apri', ...comando },
    )

  return h(
    'div',
    { class: 'archivio__anteprima' },
    h(
      'header',
      { class: 'archivio__testa' },
      h('h3', { class: 'archivio__titolo' }, foglio.etichetta),
      daDividere
        ? pastiglia(foglio.che, 'attenzione', 'documento')
        : pastiglia(
            foglio.che,
            foglio.firmato ? 'positivo' : 'neutro',
            foglio.firmato ? 'firma' : 'documento',
          ),
      quando ? h('span', { class: 'testo-quieto' }, `del ${quando}`) : null,
      foglio.misura > 0 ? h('span', { class: 'testo-quieto' }, quantoMisura(foglio.misura)) : null,
      // I gesti che riguardano il PDF intero — la lettura delle scansioni, le
      // proposte da confermare — stanno qui e non in un pannello accanto: sono
      // gesti su *questo* file, ed è questo file che si sta guardando.
      ...(daDividere ? comandiDelPdf(daDividere) : []),
      h('span', { class: 'archivio__conto' }, `${indice + 1} di ${fogli.length}`),
      daDividere
        ? pulsante({
            testo: aPagine ? 'Leggi' : 'Pagine',
            simbolo: aPagine ? 'documento' : 'immagine',
            variante: 'sottile',
            titolo: aPagine
              ? 'Apre il PDF nel lettore: pagine intere, zoom, ricerca nel testo'
              : 'Mostra le pagine una per una, da trascinare sulla casella di chi sono',
            al: () => aggiorna({ sfoglioArchivio: aPagine ? 'lettore' : 'pagine' }),
          })
        : null,
      scorri(fogli, indice, -1),
      scorri(fogli, indice, 1),
      pulsante({
        simbolo: 'esporta',
        variante: 'fantasma',
        titolo: 'Apre questo foglio nel programma del sistema',
        al: () => apriFuori(),
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: `Togli ${foglio.nome}`,
        al: () => butta(),
      }),
      pulsante({
        testo: 'Chiudi',
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: 'Torna alla matrice a schermo intero',
        al: () => guardaIlFoglio(null),
      }),
    ),
    !foglio.presente || !indirizzo
      ? statoVuoto({
          simbolo: 'avviso',
          titolo: 'Il file non è più qui',
          testo:
            `Il registro lo dà per caricato, ma «${foglio.nome}» non è più dentro il documento ` +
            'dell’anno. Ricaricalo dalla sua casella, o toglilo.',
        })
      : aPagine && daDividere
        ? sfoglioSmistamento({
            smistamento: daDividere,
            allievi,
            // Nessuna richiesta da proporre: qui le pagine non finiscono in un
            // documento da consegnare ma in una casella della matrice, e quale
            // sia lo dice il posto in cui si lasciano cadere.
            richieste: [],
            indirizzo,
            // La stessa chiave della cornice, e per la stessa ragione: un PDF
            // riscritto sta allo stesso percorso di prima, e le fotografie già
            // disegnate sarebbero quelle di ieri.
            chiave: `sfoglio|${foglio.file}|${foglio.misura}|${foglio.revisione}`,
            coda: codaLettura(),
          })
        : siGuardaQui(foglio.file)
          ? corniceDocumento({
            // La revisione dentro la chiave e non solo nell’indirizzo: un
            // rapporto ricaricato — la scansione rifatta meglio, il foglio
            // tornato firmato — sta allo stesso percorso di prima, e senza un
            // pezzo che cambia il lettore terrebbe in mostra quello di ieri
            // dicendo che è quello di adesso.
              indirizzo: `${indirizzo}?v=${foglio.revisione}-${foglio.misura}`,
              chiave: `assenze|${foglio.file}|${foglio.misura}|${foglio.revisione}`,
              titolo: `${foglio.che} di ${foglio.etichetta}`,
            })
          : statoVuoto({
              simbolo: 'documento',
              titolo: 'Questo non si guarda da qui',
              testo: `«${foglio.nome}» non è un PDF né un’immagine: si apre con il programma del sistema.`,
              azione: pulsante({
                testo: 'Apri fuori',
                simbolo: 'esporta',
                variante: 'primario',
                al: () => apriFuori(),
              }),
            }),
  )
}

/**
 * Le assenze da far firmare: l'elenco dei periodi e la matrice di quello aperto.
 *
 * Sta nel pannello del docente di classe accanto ai documenti perché è lo stesso
 * mestiere — riscuotere fogli da gente che ha altro da fare — ma è una pratica
 * sua: ha un periodo invece di una scadenza, un'azienda invece di una famiglia,
 * e finisce con una firma invece che con una spunta.
 */
export function schedaAssenze (classe: Classe) {
  const fascicolo = fascicoloDi(classe.id)
  // Del periodo scelto, come tutto il resto: un blocco che sta a cavallo di
  // gennaio riguarda tutti e due i semestri e resta in tutti e due — sparire da
  // entrambi sarebbe il modo di perderlo.
  const blocchi = toccaIlSemestreScelto([...fascicolo.assenze]).sort((a, b) =>
    b.dal.localeCompare(a.dal),
  )
  const allievi = ordinaAllievi(allieviAttivi(classe))
  const scelto =
    blocchi.find((b) => b.id === stato.bloccoAssenzeId) ?? blocchi[0] ?? null
  const conto = scelto ? avanzamentoAssenze(scelto) : null
  const pronte = scelto ? daSpedire(scelto) : []

  /**
   * Se per questa riga esce almeno un indirizzo.
   *
   * La stessa regola che applica il gestore — `destinatariAssenze` — e non il
   * solo indirizzo del datore: il periodo può essere impostato per scrivere
   * anche alla persona, al rappresentante legale o ai recapiti del fascicolo.
   * Contando il solo datore, la finestra di conferma prometteva meno bozze di
   * quante ne preparava, e diceva «resta indietro» di qualcuno che invece
   * partiva.
   */
  const haIndirizzo = (riga: { allievoId: string }): boolean => {
    const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
    if (!allievo || !scelto) return false
    return destinatariAssenze(scelto, allievo, fascicolo).indirizzi.length > 0
  }

  const spedibili = pronte.filter(haIndirizzo)

  const spedisciTutte = async () => {
    if (!scelto || spedibili.length === 0) return
    const senzaIndirizzo = pronte.length - spedibili.length
    const sicuro = await conferma({
      titolo: `Preparare ${spedibili.length} richieste di firma?`,
      testo:
        `Una bozza per ${PIF.singolare}, all’azienda, con dentro i suoi fogli. Finiscono tutte in ` +
        'una cartella che si apre da sé: le mandi una a una dal programma di posta.' +
        (senzaIndirizzo > 0
          ? `\n\n${senzaIndirizzo} restano indietro: non hanno nessun indirizzo a cui scrivere.`
          : ''),
      testoConferma: 'Prepara',
    })
    if (!sicuro) return
    await azione({
      tipo: 'assenze.invia',
      classeId: classe.id,
      bloccoId: scelto.id,
      allieviIds: [],
    })
  }

  // I fogli del periodo aperto, nell’ordine della matrice: sono quel che le
  // frecce della cornice scorrono, e il conto del «7 di 23». In coda i PDF di
  // classe non ancora divisi, che si guardano nella stessa cornice.
  const daDividere = pdfInAttesa(classe)
  const fogli = scelto ? fogliDelPeriodo(scelto, allievi, daDividere) : []
  const indice = indiceAperto(fogli)

  const riquadro = scheda({
    titolo: 'Assenze da far firmare',
    sottotitolo: 'un periodo per volta: i fogli che partono, l’e-mail, le firme che tornano',
    azioni: [
      scelto
        ? pulsante({
            testo: 'Carica dei PDF',
            simbolo: 'documento',
            variante: 'sottile',
            titolo:
              'Porta dentro i PDF della scuola: le loro pagine si trascinano poi sulla casella ' +
              'di chi sono. Si possono anche lasciar cadere sulla pagina.',
            al: () => caricaPdf(classe, VETRINA_ASSENZE),
          })
        : null,
      scelto
        ? pulsante({
            testo: 'Importa fogli',
            simbolo: 'esporta',
            variante: 'sottile',
            titolo: 'Prende una cartella di PDF e li assegna dal nome del file',
            al: () => moduloImportaAssenze(classe, scelto),
          })
        : null,
      scelto && pronte.length > 0
        ? pulsante({
            testo: `Prepara invio (${spedibili.length})`,
            disabilitato: spedibili.length === 0,
            titolo: spedibili.length === 0 ? 'Completa gli indirizzi dei datori di lavoro nelle schede personali' : 'Prepara le richieste secondo le impostazioni di posta',
            simbolo: 'posta',
            variante: 'primario',
            al: () => spedisciTutte(),
          })
        : null,
    ].filter(Boolean),
    contenuto:
      blocchi.length === 0
        ? statoVuoto({
            simbolo: 'firma',
            titolo: 'Nessun periodo aperto',
            testo:
              'Un periodo tiene insieme le tre fasi: i fogli di assenze e ritardi che la ' +
              'scuola stampa, l’e-mail che li manda in azienda con la richiesta di firma, e ' +
              'i fogli firmati che tornano indietro. Si comincia da «Nuovo periodo», nella ' +
              'riga dei comandi — il giorno in cui comincia e quello in cui finisce, e ' +
              'nient’altro — e poi si importano i PDF.',
          })
        : h(
            'div',
            null,
            h(
              'ul',
              { class: 'elenco-documenti' },
              ...blocchi.map((blocco) => rigaPeriodo(classe, blocco, blocco.id === scelto?.id)),
            ),
            // I PDF che aspettano di essere divisi: una riga di nomi, non un
            // pannello. Il loro posto vero è la cornice — qui c’è solo la porta.
            pdfDaDividere(classe, VETRINA_ASSENZE),
            // La coda di lettura sta fra le pagine, dove si legge pagina per
            // pagina: qui compare solo quando non c’è nessun PDF aperto, che è
            // l’unico caso in cui non avrebbe dove mostrarsi.
            indice >= 0 ? null : codaLettura(),
            scelto && conto
              ? h(
                  'div',
                  null,
                  sintesiIncassata(
                    { etichetta: 'con assenze', valore: String(conto.interessati) },
                    {
                      etichetta: 'spediti',
                      valore: `${conto.inviate}/${conto.interessati}`,
                      tono: conto.inviate === conto.interessati ? 'positivo' : 'attenzione',
                    },
                    {
                      etichetta: 'firmati',
                      valore: `${conto.firmate}/${conto.interessati}`,
                      tono: conto.completo ? 'positivo' : 'attenzione',
                    },
                    conto.falliti > 0 ? { etichetta: 'non partite', valore: String(conto.falliti), tono: 'negativo' } : null,
                  ),
                  allievi.length === 0
                    ? h(
                        'p',
                        { class: 'testo-quieto' },
                        `La matrice compare quando la classe ha delle ${PIF.plurale} che frequentano.`,
                      )
                    : tabellaAssenze(classe, scelto, allievi),
                  righeVive(scelto).length === 0
                    ? h(
                        'p',
                        { class: 'campo__aiuto' },
                        'Nessun foglio caricato: trascina qui il PDF della scuola e posa le sue ' +
                          'pagine sulla casella di chi sono; «Importa fogli» prende una cartella ' +
                          'intera e assegna ciascun file dal suo nome; il « + » di una casella ne ' +
                          'aggiunge uno solo.',
                      )
                    : null,
                )
              : null,
          ),
  })

  // Lo stesso telaio dell’archivio documentale: a sinistra la matrice, a destra
  // il foglio aperto. A cornice chiusa è una colonna sola e la matrice prende
  // tutta la larghezza — ne ha bisogno, cinque colonne per venticinque nomi —
  // e non resta mezza pagina a dire «non stai guardando niente».
  const pannello = pannelloArchivio(
    riquadro,
    scelto && indice >= 0 ? corniceAssenze(classe, scelto, fogli, indice, allievi) : null,
    `assenze:${classe.id}`,
  )
  // Tutta la pagina è bersaglio per i PDF trascinati da fuori, come
  // nell’archivio: chi lascia cadere un file punta alla pagina, non a un
  // rettangolo di tre centimetri.
  rendiBersaglio(pannello, classe, VETRINA_ASSENZE)
  return pannello
}

// ------------------------------------------------- le richieste di firma nel todo

/**
 * Una richiesta di firma come riga d'elenco, per il todo.
 *
 * Nasce dal caricamento di un foglio e non da un gesto in più: appena i
 * rapporti della scuola entrano nel registro, quella pratica è un lavoro
 * aperto. Fin qui si vedeva solo aprendo la classe, e le richieste restavano
 * ferme per settimane senza che niente le reclamasse.
 *
 * Ha due gesti, e sono quelli che la chiudono: mandare la mail, e caricare il
 * foglio che torna firmato. Il secondo è la riconsegna di questa pratica, e sta
 * qui dentro come sta il campo della data in una prova da riconsegnare.
 */
function rigaRichiesta (richiesta: RichiestaFirma): HTMLElement {
  const partita = richiesta.fase === 'in-attesa'
  const chiusa = richiesta.fase === 'firmato'
  const etichetta = richiesta.errore
    ? { testo: 'non partita', tono: 'negativo' as const }
    : chiusa
      ? { testo: 'firmato', tono: 'positivo' as const }
      : partita
        ? { testo: 'in attesa della firma', tono: 'informativo' as const }
        : { testo: 'da spedire', tono: 'attenzione' as const }

  return h(
    'article',
    {
      class: [
        'richiesta',
        `richiesta--${richiesta.fase}`,
        richiesta.errore && 'richiesta--tardi',
      ],
    },
    h(
      'header',
      { class: 'richiesta__testata' },
      // Il nome porta alla matrice del periodo, che è dove il lavoro si fa: da
      // lì si carica un foglio, si rilegge la mail, si guarda tutta la classe.
      //
      // Servono tutte e tre le chiavi, e ognuna per un motivo diverso:
      // `classeId` perché è quella che `classeDelFascicolo()` legge — con il
      // solo `filtroClasseId` si apriva la prima classe di cui si è docente,
      // non quella su cui si è premuto; `filtroClasseId` perché è il filtro
      // che le pagine del corso si portano dietro uscendo di qui;
      // `bloccoAssenzeId` perché senza si arriva sulla classe giusta e sul
      // periodo sbagliato, che di un elenco di richieste è metà del lavoro.
      h(
        'button',
        {
          class: 'richiesta__allievo',
          attr: { type: 'button', title: 'Apri il periodo di quella classe' },
          onclick: () =>
            aggiorna({
              vista: 'docenteClasse',
              schedaDocente: 'assenze',
              classeId: richiesta.classeId,
              filtroClasseId: richiesta.classeId,
              bloccoAssenzeId: richiesta.bloccoId,
            }),
        },
        nomeCompleto(richiesta.allievo),
      ),
      h(
        'span',
        { class: 'richiesta__dove testo-quieto' },
        `${richiesta.classe} · ${richiesta.periodo} · ${richiesta.tipi.join(' e ')}`,
      ),
      pastiglia(etichetta.testo, etichetta.tono),
      h(
        'div',
        { class: 'richiesta__azioni' },
        // Da spedire: si prepara l'e-mail di quella persona, con i suoi fogli in
        // allegato. È lo stesso gesto della busta nella matrice.
        richiesta.fase === 'da-spedire'
          ? pulsante({
              testo: 'Prepara l’e-mail',
              simbolo: 'posta',
              variante: 'sottile',
              al: () =>
                azione({
                  tipo: 'assenze.invia',
                  classeId: richiesta.classeId,
                  bloccoId: richiesta.bloccoId,
                  allieviIds: [richiesta.allievo.id],
                }),
            })
          : null,
        // In attesa: quel che chiude la pratica è il foglio che torna firmato,
        // e si carica da qui. Un tasto per rapporto, perché un'azienda può
        // rimandarne indietro uno solo e l'altro resta da avere.
        ...(partita
          ? richiesta.daFirmare.map((tipo) =>
              pulsante({
                testo: etichettaFoglio(tipo, true),
                simbolo: 'firma',
                variante: 'sottile',
                titolo: `Carica il foglio firmato di ${nomeCompleto(richiesta.allievo)}`,
                al: () =>
                  azione({
                    tipo: 'assenze.foglio.aggiungi',
                    classeId: richiesta.classeId,
                    bloccoId: richiesta.bloccoId,
                    allievoId: richiesta.allievo.id,
                    genere: tipo,
                    firmato: true,
                  }),
              }),
            )
          : []),
        // Il visto: la mail l'ha mandata chi sta davanti allo schermo, e lo
        // dice qui. Su una già partita lo stesso tasto la riporta da mandare.
        chiusa
          ? null
          : pulsante({
              simbolo: 'spunta',
              variante: partita ? 'sottile' : 'fantasma',
              titolo: partita
                ? 'Riporta da mandare: l’e-mail non è partita'
                : 'Segna spedita: l’hai mandata dal programma di posta',
              al: () =>
                azione({
                  tipo: 'assenze.spunta',
                  classeId: richiesta.classeId,
                  bloccoId: richiesta.bloccoId,
                  allievoId: richiesta.allievo.id,
                  spedita: !partita,
                }),
            }),
      ),
    ),
    richiesta.errore
      ? h('p', { class: 'richiesta__guasto testo-negativo' }, richiesta.errore)
      : null,
  )
}

/** Un mucchio di richieste con il suo titolo, come i gruppi del todo. */
export function gruppoRichiesteFirma (titolo: string, righe: RichiestaFirma[]): Figlio {
  if (righe.length === 0) return null
  return h(
    'section',
    { class: 'riconsegne__gruppo' },
    titolo ? titoloGruppo(titolo, righe.length) : null,
    ...righe.map((riga) => rigaRichiesta(riga)),
  )
}

// ------------------------------------------------- le assenze oltre la soglia

/**
 * Una persona oltre la soglia di assenza, in un corso.
 *
 * Non c'è niente da spuntare: non è un lavoro che si chiude con un gesto, è un
 * caso che si guarda. I due pulsanti portano nei due posti in cui lo si guarda
 * davvero — la scheda della persona, dove ci sono le sue ore una per una, e il
 * corso, dove la stessa percentuale sta in una tabella accanto a quella degli
 * altri.
 *
 * La riga sparisce da sé quando la percentuale rientra: è un conto, non uno
 * stato, e non va chiuso a mano. Fin qui arriva la voce 6 delle lacune; il
 * registro di chi è già stato segnalato — e quando — resta da fare, ed è l'altra
 * metà.
 */
function rigaSegnalazione (segnalazione: SegnalazioneAssenza): Figlio {
  return h(
    'div',
    { class: 'richiesta' },
    h(
      'div',
      { class: 'richiesta__testata' },
      h('strong', { class: 'richiesta__nome' }, segnalazione.allievo),
      h(
        'span',
        { class: 'richiesta__dove testo-quieto' },
        `${segnalazione.corso} · ${segnalazione.periodo} · ` +
          `${segnalazione.udAssenza} UD perse su ${segnalazione.udPreviste}`,
      ),
      pastiglia(
        `${segnalazione.percento}% di assenza`,
        segnalazione.confermata ? 'negativo' : 'attenzione',
      ),
      // Non confermata vuol dire che il numero viene dalle ore previste ma
      // l'appello di quelle ore non c'è: è un caso da guardare prima di
      // segnalarlo, e dirlo qui evita di andarlo a scoprire aprendo il corso.
      segnalazione.confermata
        ? null
        : pastiglia('appelli da completare', 'quiete'),
      h(
        'div',
        { class: 'richiesta__azioni' },
        pulsante({
          testo: 'Apri la scheda',
          simbolo: 'utente',
          variante: 'sottile',
          titolo: 'Le ore di questa persona, una per una',
          al: () =>
            aggiorna({
              vista: 'allievo',
              classeId: segnalazione.classeId,
              allievoId: segnalazione.allievoId,
            }),
        }),
        pulsante({
          testo: 'Apri il corso',
          simbolo: 'libro',
          variante: 'fantasma',
          titolo: 'La stessa percentuale accanto a quella degli altri',
          al: () => aggiorna({ vista: 'corsi', corsoId: segnalazione.corsoId }),
        }),
      ),
    ),
  )
}

/** Il mucchio delle segnalazioni, con il suo titolo: come gli altri gruppi del todo. */
export function gruppoSegnalazioni (titolo: string, righe: SegnalazioneAssenza[]): Figlio {
  if (righe.length === 0) return null
  return h(
    'section',
    { class: 'riconsegne__gruppo' },
    titolo ? titoloGruppo(titolo, righe.length) : null,
    ...righe.map((riga) => rigaSegnalazione(riga)),
  )
}
