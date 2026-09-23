// Il PDF di classe che entra, e le pagine che ne escono.
//
// Si trascina un PDF nell'archivio documentale — o lo si sceglie con «Carica
// dei PDF», che sta fra i comandi della pagina — e da quel momento è un foglio
// dell'archivio come gli altri: si apre, si guarda, e le sue pagine si
// prendono con il mouse e si lasciano cadere sulla casella di chi sono.
//
// **Qui c'era la scheda «Da smistare», e non c'è più.** Era un pannello con
// dentro una riga per PDF, e sotto ogni riga la sua bozza: un blocco di pagine
// per volta, con una tendina di venticinque nomi, due campi numerici per
// l'intervallo e cinque pulsanti. Diceva tutto e non mostrava niente — per
// sapere che cosa ci fosse sulla pagina 7 bisognava aprirla altrove — e la
// matrice, che è la ragione della pagina, finiva spinta in cima da un pannello
// più alto di lei.
//
// Adesso il posto in cui si guarda un PDF è uno solo: la cornice, con le sue
// pagine. Quel che resta qui è quel che riguarda il file *intero* — farlo
// entrare, dire dove si taglia, leggerne le scansioni, confermare in blocco
// quel che il registro ha riconosciuto — e sta in testa alla cornice, accanto
// al nome del PDF che si sta guardando.
//
// La lettura delle scansioni non è istantanea: decine di secondi a pagina. Per
// questo non si aspetta un pulsante, si mette in coda — e la coda si vede,
// perché un lavoro che dura minuti e non si mostra è indistinguibile da un
// programma rotto.

import { avanzamentoConsegna, consegneDocumento } from '../../domain/assignments.js'
import type { Classe, Consegna, Divisione, Smistamento } from '../../domain/models.js'
import { smistamentiDellaClasse } from '../../domain/sorting.js'
import { pastiglia, pulsante } from '../components/base.js'
import { eseguiOAvvisa } from '../components/filters.js'
import { conferma } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { classiDiCuiSonoDocente, corsiDi, stato } from '../state.js'

import { guardaNellArchivio } from './archive.js'
import { portaPagine } from './pageBrowser.js'

const esegui = eseguiOAvvisa

/**
 * Le richieste di documenti ancora aperte di una classe.
 *
 * Aperte vuol dire che manca ancora il foglio di qualcuno: sono quelle a cui
 * lo smistatore prova ad assegnare le pagine, ed è l'elenco che si propone a
 * chi lascia cadere un PDF.
 */
function richiesteAperte (classe: Classe): Consegna[] {
  return consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => !avanzamentoConsegna(c, classe).completa,
  )
}

/**
 * Dove si va a guardare un PDF che entra: l'archivio documentale, o la matrice
 * delle assenze.
 *
 * Le due pagine del docente di classe hanno la stessa forma — una matrice e,
 * accanto, il foglio che si sta guardando — ma ognuna ha la sua cornice e il
 * suo foglio aperto. Quel che cambia è solo questo, e passa da qui: il resto
 * del giro — trascinare un file, depositarlo, aprirne le pagine — è lo stesso
 * lavoro e sta scritto una volta sola.
 */
export interface Vetrina {
  /** Il percorso aperto adesso in quella cornice: si legge a ogni disegno. */
  aperto: () => string | null
  /** Ci porta davanti un foglio, o chiude la cornice con `null`. */
  apri: (percorso: string | null) => void
}

/** La cornice dell'archivio documentale: la vetrina di sempre. */
const VETRINA_ARCHIVIO: Vetrina = {
  aperto: () => stato.anteprimaArchivio,
  apri: guardaNellArchivio,
}

/** I PDF di questa classe che aspettano ancora di essere divisi. */
export function pdfInAttesa (classe: Classe): Smistamento[] {
  return smistamentiDellaClasse(
    stato.registro.smistamenti,
    classe.id,
    richiesteAperte(classe).map((c) => c.id),
  )
}

/**
 * Quante pagine di questi PDF sono ancora attive: quelle non archiviate.
 *
 * Non c'è niente da filtrare per saperlo — una pagina finita nel fascicolo di
 * qualcuno esce dalle letture nel momento in cui ci finisce — ma il conto va
 * detto qui lo stesso: è quel che si scrive sul pulsante, ed è la misura di
 * quanto durerà la coda.
 */
function pagineAttive (smistamenti: Smistamento[]): number {
  return smistamenti.reduce((quante, smistamento) => quante + smistamento.letture.length, 0)
}

// ------------------------------------------------------- quel che si vede

/**
 * I PDF in attesa, in una riga sola: nome, pagine rimaste, e un clic per
 * aprirli.
 *
 * Una riga di pastiglie e non un elenco: sono file che stanno lì un giorno o
 * due, e il loro posto vero è la cornice — qui c'è solo la porta. Quando non
 * ce n'è nessuno la riga non compare, e la matrice comincia subito.
 */
export function pdfDaDividere (classe: Classe, vetrina: Vetrina = VETRINA_ARCHIVIO): Figlio {
  const suoi = pdfInAttesa(classe)
  if (suoi.length === 0) return null

  return h(
    'div',
    { class: 'da-dividere' },
    h('span', { class: 'da-dividere__titolo' }, suoi.length === 1 ? 'Da dividere' : `Da dividere (${suoi.length})`),
    ...suoi.map((smistamento) => {
      const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
      return h(
        'button',
        {
          class: [
            'da-dividere__pdf',
            vetrina.aperto() === smistamento.file && 'da-dividere__pdf--aperto',
          ],
          type: 'button',
          attr: {
            title: `Guarda «${smistamento.nome}» a pagine e trascinale sulla casella di chi sono`,
          },
          onclick: () => vetrina.apri(smistamento.file),
        },
        h('span', { class: 'da-dividere__nome' }, smistamento.nome),
        h(
          'span',
          { class: 'da-dividere__conto' },
          `${restano || smistamento.pagine} pagine`,
        ),
      )
    }),
    h(
      'span',
      { class: 'testo-quieto da-dividere__aiuto' },
      'trascina qui i PDF di classe, o usa «Carica dei PDF»',
    ),
  )
}

/**
 * I gesti che riguardano il PDF intero, in testa alla cornice che lo mostra.
 *
 * Sono quelli che non si fanno con il mouse sulle pagine: far leggere le
 * scansioni mute, rileggerle quando il modello ha letto male, e archiviare in
 * un colpo solo tutte le pagine di cui il nome è già stato riconosciuto. Il
 * resto — queste pagine a questa persona — si fa trascinando, o con il tasto
 * destro sulla pagina.
 *
 * Qui c'era anche la tendina del taglio — automatica, a blocchi, a mano — e non
 * c'è più: decideva soltanto le proposte, cioè un aiuto, e stava in mezzo ai
 * gesti veri come se fosse una decisione da prendere ogni volta. Le proposte si
 * accettano o si ignorano guardando le pagine, che è più rapido di qualunque
 * regola dichiarata in anticipo.
 */
/**
 * La tendina che manda un PDF a un'altra classe — o gliene dà una la prima volta.
 *
 * Nasce dalla scansione che attraversa due classi: si divide quel che è della
 * prima, si arriva in fondo alle sue persone, e restano pagine. Sono di
 * un'altra classe, e il PDF deve poterci andare senza ricominciare da capo.
 *
 * Le pagine già collocate non si muovono — sono documenti di qualcuno, non più
 * pagine di questo mucchio — e il titolo lo dice, perché è la cosa che chi sta
 * per premere ha bisogno di sapere: uno spostamento che disfacesse mezz'ora di
 * lavoro non lo tenterebbe nessuno.
 *
 * `null` quando non c'è dove andare: con una classe sola la tendina avrebbe una
 * voce sola, e sarebbe quella in cui si è già.
 *
 * Una tendina e non dei pulsanti: le classi possono essere sei, e sei bersagli
 * per riga sono un elenco che si legge, per una domanda che se ne merita uno.
 */
export function spostaInClasse (smistamento: Smistamento, invito: string): Figlio {
  const altre = classiDiCuiSonoDocente().filter((classe) => classe.id !== smistamento.classeId)
  if (altre.length === 0) return null

  return h(
    'select',
    {
      class: 'sposta-classe',
      attr: {
        'aria-label': `${invito} — «${smistamento.nome}»`,
        title:
          'Manda a un’altra classe le pagine che restano di questo PDF. Quelle già archiviate ' +
          'restano dove sono, e il registro rifà le proposte con i nomi della classe nuova.',
      },
      onchange: (evento: Event) => {
        const bersaglio = evento.target as HTMLSelectElement
        const scelto = bersaglio.value
        // La tendina torna alla domanda: se l'azione non passa, resta com'era
        // invece di mostrare una classe in cui il PDF non è andato.
        bersaglio.value = ''
        if (!scelto) return
        // `void`: si sceglie e si va avanti. Lo spostamento si annuncia da sé
        // — `esegui` mostra l'esito — e la tendina non ha niente da aspettare.
        void esegui({
          tipo: 'smistamento.attribuisci',
          smistamentoId: smistamento.id,
          classeId: scelto,
        })
      },
    },
    h('option', { value: '', selected: true }, invito),
    ...altre.map((classe) => h('option', { value: classe.id }, classe.nome)),
  )
}

export function comandiDelPdf (smistamento: Smistamento): Figlio[] {
  const proposte = smistamento.blocchi.filter((b) => b.allievoId).length
  const daLeggere = smistamento.letture.filter((l) => l.lettura === 'niente').length
  const inCoda = stato.lavoro.coda.some((voce) => voce.smistamentoId === smistamento.id) ||
    stato.lavoro.corrente?.smistamentoId === smistamento.id
  const tutte = smistamento.letture.map((l) => l.numero)

  return [
    proposte > 0 && smistamento.consegnaId
      ? pulsante({
          testo: `Conferma ${proposte} proposte`,
          simbolo: 'spunta',
          variante: 'primario',
          titolo: 'Archivia in un gesto le pagine di cui il registro ha già letto il nome',
          al: () => esegui({ tipo: 'smistamento.confermaTutto', smistamentoId: smistamento.id }),
        })
      : null,
    !stato.ocrAttivo
      ? pulsante({
          testo: 'Lettura spenta',
          simbolo: 'impostazioni',
          variante: 'fantasma',
          titolo:
            'La lettura automatica delle scansioni è spenta: apre le impostazioni su «registroDocenti.ocr.attivo».',
          al: () => esegui({ tipo: 'smistamento.impostazioni' }),
        })
      : inCoda
        ? pulsante({
            testo: 'In lettura…',
            simbolo: 'ricarica',
            variante: 'sottile',
            disabilitato: true,
            titolo: 'Le pagine di questo PDF sono in coda: la barra qui accanto dice a che punto è',
          })
        : daLeggere > 0
          ? pulsante({
              testo: `Leggi le scansioni (${daLeggere})`,
              simbolo: 'ricarica',
              variante: 'sottile',
              titolo:
                'Mette in coda le pagine senza testo: qualche decina di secondi per pagina, e i ' +
                'nomi letti diventano proposte.',
              al: () => esegui({ tipo: 'smistamento.leggiTutto', smistamentoId: smistamento.id }),
            })
          : null,
    // «Rileggi» sta accanto a «Leggi le scansioni» e non al posto suo.
    //
    // Prima compariva soltanto quando non restava più niente da leggere, e
    // così il caso vero non aveva risposta: un PDF in cui il modello ha letto
    // male ventotto pagine su trenta mostra «Leggi le scansioni (2)», e le
    // ventotto sbagliate si potevano rifare solo una per una dal tasto destro.
    // Sono due domande diverse — «leggi quel che non hai letto» e «rifai tutto
    // da capo, con il modello che c'è adesso» — e stanno bene una accanto
    // all'altra.
    stato.ocrAttivo && !inCoda && tutte.length > 0
      ? pulsante({
          testo: daLeggere > 0 ? 'Rileggi' : `Rileggi le ${tutte.length} pagine`,
          simbolo: 'ricarica',
          variante: 'fantasma',
          titolo:
            `Rilegge con l’OCR le ${tutte.length} pagine ancora da smistare di questo PDF, ` +
            'anche quelle che un testo ce l’hanno già: serve quando quel testo non dice niente ' +
            'di utile, o quando il modello è cambiato. Le pagine già archiviate restano dove sono.',
          al: () =>
            esegui({
              tipo: 'smistamento.leggiPagine',
              smistamentoId: smistamento.id,
              pagine: tutte,
            }),
        })
      : null,
    // In coda ai gesti sul file intero, e non fra le pagine: riguarda il PDF
    // tutto, come «Rileggi» e «Conferma le proposte». Compare solo finché resta
    // qualcosa da collocare — a mucchio finito non c'è più niente da spostare.
    smistamento.blocchi.length > 0 ? spostaInClasse(smistamento, 'Sposta in…') : null,
  ]
}

/**
 * «Rileggi le scansioni», fra i comandi della pagina: tutti i PDF della
 * classe, tutte le pagine che restano da smistare, rimesse in coda.
 *
 * È il comando generale, e l'unico che non chiede prima quale file aprire.
 * Serve al momento in cui la lettura automatica cambia sotto i piedi — la si
 * accende dopo aver già caricato mezza segreteria, si scarica un modello che
 * legge meglio — e da lì la domanda non è più «questo PDF», è «tutto quel che
 * ho in ballo».
 *
 * Si chiede conferma, e non per prudenza rituale: la coda è di decine di
 * secondi a pagina, e su cinque scansioni di classe sono minuti in cui la
 * macchina è occupata. Chi preme deve sapere quanto ha chiesto prima che parta.
 */
export async function rileggiScansioni (classe: Classe): Promise<void> {
  const suoi = pdfInAttesa(classe)
  const pagine = pagineAttive(suoi)
  if (pagine === 0) {
    notifica('In questa classe non c’è nessun PDF da dividere: niente da rileggere.', 'avviso')
    return
  }

  const sicuro = await conferma({
    titolo: pagine === 1 ? 'Rileggere quella pagina?' : `Rileggere ${pagine} pagine?`,
    testo:
      `${suoi.length === 1 ? 'Il PDF' : `I ${suoi.length} PDF`} ancora da dividere di ` +
      `${classe.nome} ${suoi.length === 1 ? 'torna' : 'tornano'} in coda di lettura, dalla prima ` +
      'pagina all’ultima — anche quelle che un testo ce l’hanno già. Sono decine di secondi per ' +
      'pagina, e la coda si può fermare. Le pagine già archiviate restano dove sono, e le ' +
      'proposte di adesso vengono rifatte.',
    testoConferma: 'Rileggi',
  })
  if (!sicuro) return

  await esegui(
    { tipo: 'smistamento.rileggiAttive', smistamentiId: suoi.map((s) => s.id) },
    `${pagine} pagine in coda: i nomi letti diventano proposte, una pagina alla volta.`,
  )
}

/**
 * La coda di lettura: che cosa sta macinando la macchina e che cosa aspetta.
 *
 * Una barra che scorre senza dire una percentuale sul singolo foglio, perché
 * quella non c'è: un OCR impiega quel che impiega, e inventare una stima
 * vorrebbe dire mentire a chi la guarda. Quel che si dice è vero — quante
 * pagine sono fatte, quante ne restano — e c'è il modo di fermare tutto.
 */
export function codaLettura (): Figlio {
  const { corrente, fatte, totale, coda } = stato.lavoro
  if (!corrente && coda.length === 0) return null

  return h(
    'div',
    { class: 'lavoro-ocr' },
    h(
      'div',
      { class: 'lavoro-ocr__testata' },
      h('span', null, corrente ? `Sto leggendo ${corrente.etichetta}` : 'Lettura in avvio…'),
      totale > 0 ? pastiglia(`${fatte} di ${totale}`, 'informativo') : null,
      coda.length > 0 ? pastiglia(`${coda.length} in coda`, 'neutro') : null,
      pulsante({
        testo: 'Ferma',
        simbolo: 'chiudi',
        variante: 'fantasma',
        classe: 'lavoro-ocr__ferma',
        titolo: 'Svuota la coda: la pagina in corso finisce, il resto non parte',
        al: () => esegui({ tipo: 'smistamento.fermaLettura' }),
      }),
    ),
    h('div', { class: 'barra-lavoro' }, h('span', null)),
    coda.length > 0
      ? h(
          'ul',
          { class: 'lavoro-ocr__coda' },
          ...coda.slice(0, 6).map((voce) => h('li', { class: 'testo-quieto' }, voce.etichetta)),
          coda.length > 6
            ? h('li', { class: 'testo-quieto' }, `…e altre ${coda.length - 6}`)
            : null,
        )
      : null,
  )
}

// --------------------------------------------------------- far entrare i PDF

/** I byte di un file trascinato, in base64: è così che passano il ponte. */
async function inBase64 (file: File): Promise<string> {
  const byte = new Uint8Array(await file.arrayBuffer())
  let testo = ''
  // A pezzi, e non con lo spread: un PDF di quattro megabyte diventa quattro
  // milioni di argomenti, e `String.fromCharCode` li rifiuta.
  const PASSO = 8192
  for (let i = 0; i < byte.length; i += PASSO) {
    testo += String.fromCharCode(...byte.subarray(i, i + PASSO))
  }
  return btoa(testo)
}

/**
 * Come si entra: senza domande.
 *
 * Qui c'era una modale con due tendine — a quale documento appartiene, dove si
 * taglia — e nessuna delle due domande aveva una risposta al momento di
 * chiederla. Il documento si sa quando si guarda la pagina, ed è la casella su
 * cui la si lascia cadere a dirlo; il taglio si vede dalle proposte, e si
 * corregge in un gesto dalla tendina in testa alla cornice. Chiederle prima
 * voleva dire farsi rispondere a caso, e archiviare mezzo PDF sotto il nome
 * dell'altra pratica.
 *
 * Quel che passa dal pannello è quindi solo la classe da cui il file è entrato:
 * il resto lo scopre il registro leggendo, o lo decide chi trascina.
 */
const COME_ENTRA: Divisione = { modo: 'nomi' }

/**
 * «Carica dei PDF», che sta fra i comandi della pagina.
 *
 * Il gesto normale è trascinare — il file arriva per mail, lo si tira dentro —
 * ma un comando ci vuole lo stesso: c'è chi il trascinamento non lo usa, e un
 * gesto che esiste solo se lo si indovina non esiste.
 */
export async function caricaPdf (classe: Classe, vetrina: Vetrina = VETRINA_ARCHIVIO): Promise<void> {
  const primaDi = new Set(pdfInAttesa(classe).map((s) => s.id))
  const esito = await esegui({
    tipo: 'smistamento.carica',
    consegnaId: null,
    classeId: classe.id,
    divisione: COME_ENTRA,
  })
  if (esito.ok) apriIlNuovo(classe, primaDi, vetrina)
}

/**
 * Fa di un elemento un bersaglio per i PDF trascinati da fuori.
 *
 * `dragover` va fermato a ogni evento e non solo all'ingresso: il browser lo
 * rimanda di continuo mentre il puntatore si muove, e basta che uno passi per
 * far riapparire il divieto sotto il cursore. `dragleave` scatta anche
 * passando sopra un figlio, e per questo si conta invece di spegnere e basta —
 * una cornice che lampeggia mentre si attraversa la pagina fa lasciare il file
 * un istante prima, fuori bersaglio.
 *
 * Le pagine prese dallo sfoglio attraversano la pagina per andare sulla
 * matrice, e qui non hanno niente da fare: questa è la porta dei file che
 * entrano, non delle pagine che escono.
 */
export function rendiBersaglio (
  elemento: HTMLElement,
  classe: Classe,
  vetrina: Vetrina = VETRINA_ARCHIVIO,
): void {
  let dentro = 0
  const acceso = (attivo: boolean) => elemento.classList.toggle('archivio--in-arrivo', attivo)

  elemento.addEventListener('dragenter', (evento: DragEvent) => {
    if (portaPagine(evento)) return
    evento.preventDefault()
    dentro += 1
    acceso(true)
  })
  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
  })
  elemento.addEventListener('dragleave', () => {
    dentro = Math.max(0, dentro - 1)
    if (dentro === 0) acceso(false)
  })
  elemento.addEventListener('drop', (evento: DragEvent) => {
    if (portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    dentro = 0
    acceso(false)
    const file = [...(evento.dataTransfer?.files ?? [])]
    if (file.length === 0) {
      notifica('Da lì non è arrivato nessun file: trascinane uno dal gestore file.', 'avviso')
      return
    }
    void deposita(file, classe, vetrina)
  })
}

/**
 * Uno per uno: si chiede il documento e si manda all'host, e il primo che
 * entra si apre da sé.
 *
 * Aprirlo non è un vezzo: chi lascia cadere un PDF lo fa per dividerlo, e la
 * cosa successiva che vuole è guardarne le pagine. Prima restava una riga in
 * un pannello, e bisognava sapere che il nome del file era un pulsante.
 */
async function deposita (file: File[], classe: Classe, vetrina: Vetrina): Promise<void> {
  const primaDi = new Set(pdfInAttesa(classe).map((s) => s.id))

  for (const uno of file) {
    if (!uno.name.toLowerCase().endsWith('.pdf')) {
      notifica(`«${uno.name}» non è un PDF: lo smistamento lavora solo su quelli.`, 'avviso')
      continue
    }
    notifica(`«${uno.name}»: lo sto leggendo…`, 'info')
    await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: null,
      classeId: classe.id,
      nome: uno.name,
      contenuto: await inBase64(uno),
      divisione: COME_ENTRA,
    })
  }

  apriIlNuovo(classe, primaDi, vetrina)
}

/**
 * Apre le pagine del PDF appena entrato.
 *
 * Non è un vezzo: chi porta dentro un PDF lo fa per dividerlo, e la cosa
 * successiva che vuole è vederne le pagine. Prima restava una riga in un
 * pannello, e bisognava sapere che il nome del file era un pulsante.
 */
function apriIlNuovo (classe: Classe, primaDi: Set<string>, vetrina: Vetrina): void {
  const nuovo = pdfInAttesa(classe).find((s) => !primaDi.has(s.id))
  if (nuovo) vetrina.apri(nuovo.file)
}
