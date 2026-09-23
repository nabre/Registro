// I modelli del linguaggio: quelli che ci sono, quelli che si possono avere.
//
// È la pagina che rende vera la frase «il registro non installa roba». Il
// modello con cui l'assistente risponde e quello con cui si leggono le
// scansioni sono **file** — `.gguf`, due o quattro gigabyte l'uno — e fino a
// ieri procurarseli voleva dire installare un servizio, aprire un terminale e
// battere un comando che nessuno ha mai scritto in un registro di classe.
//
// Qui si fa in tre modi, e sono i tre modi in cui chi insegna prende un file:
//
//   **si scarica**    dall'elenco dei consigliati, o cercando fra i depositi
//                     pubblici di Hugging Face;
//   **si trascina**   dentro la pagina, se lo si ha già sul disco;
//   **si sceglie**    con il dialogo di sistema, che è il gesto per chi il
//                     trascinamento non lo usa.
//
// ------------------------------------------------------------- due mestieri
//
// Un modello **non** va bene per tutti e due gli usi, e la pagina lo dice senza
// spiegarlo: chi conversa deve saper chiamare gli attrezzi, chi legge le
// scansioni deve saper guardare, e quasi nessun modello piccolo sa fare tutte e
// due le cose. Perciò le due scelte sono due righe separate, ciascuna con il
// proprio elenco e il proprio motivo quando qualcosa manca.
//
// ---------------------------------------------------------- perché non è muta
//
// Quattro gigabyte su una linea di scuola sono venti minuti. Per tutto quel
// tempo la pagina mostra quanto è sceso, quanto manca e il gesto per fermarsi:
// una finestra che non dice niente per venti minuti è una finestra che si
// chiude, e chiuderla a metà di uno scarico è il modo più sicuro di ritrovarsi
// con dei gigabyte a metà e nessun modello.
//
// L'avanzamento arriva dall'host (`MessaggioScarico`), non da un giro di
// domande: chiedere «a che punto sei» due volte al secondo vorrebbe dire una
// conversazione che occupa il canale mentre il disco sta già lavorando.

import type { UsoModello } from '../../protocol.js'
import {
  avviso,
  barra,
  pastiglia,
  pulsante,
  quantoMisura,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { conferma } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { azione, ascolta, chiedi } from '../bridge.js'
import { aggiorna, stato } from '../state.js'

// ------------------------------------------------------------------ memoria
//
// Quel che la pagina si tiene fra un ridisegno e l'altro. Non sta nello stato
// dell'interfaccia perché non è stato del registro: sono file su disco e una
// ricerca in corso, e finiscono quando si chiude il pannello.

interface ModelloLocale {
  nome: string
  byte: number
  proiettore: boolean
  /** Uno scarico mai finito: si può soltanto buttare, o riprendere. */
  incompiuto?: boolean
  /**
   * Da dove veniva, per i file a metà: è quel che rende possibile «Riprendi».
   *
   * Può mancare — uno scarico cominciato prima che il registro segnasse da
   * dove veniva, o un file a metà copiato a mano — e allora resta il solo
   * «Butta», con la riga che spiega dove ritrovarlo.
   */
  sorgente?: { deposito: string, file: string, per?: UsoModello }
}

interface StatoUso {
  attivo: boolean
  modello: string
  proiettore?: string
  pronto: boolean
  motivo: string
}

interface DatiModelli {
  cartella: string
  modelli: ModelloLocale[]
  assistente: StatoUso
  ocr: StatoUso
}

interface FileRemoto {
  percorso: string
  byte: number
  taglio: string
  proiettore: boolean
}

interface Consigliato {
  deposito: string
  titolo: string
  perChe: UsoModello
  taglio: string
  nota: string
}

/** Quel che c'è sul disco, come l'host l'ha detto. `null` finché non si sa. */
let dati: DatiModelli | null = null

/** Un deposito trovato cercando: quello che se ne sa prima di aprirlo. */
interface Trovato {
  id: string
  scarichi: number
  ristretto: boolean
}

/** I consigliati e i trovati dell'ultima ricerca. */
let catalogo: { consigliati: Consigliato[], trovati: Trovato[] } | null = null

/** Quel che si sta cercando: resta scritto nella casella fra un giro e l'altro. */
let cercato = ''

/** Il deposito aperto: i suoi file, e quale conviene. */
let aperto: {
  deposito: string
  file: FileRemoto[]
  consigliato: string
  proiettore: string
  motivo: string
} | null = null

/** Lo scarico in corso, come l'host lo racconta. */
let scarico: { file: string, byte: number, totale: number } | null = null

/** Se si è già chiesto l'elenco: non si richiede a ogni ridisegno. */
let chiesto = false

/** Se si è già in ascolto dell'avanzamento. Una volta per vita del pannello. */
let inAscolto = false

// ------------------------------------------------------------- le domande

/** Rilegge l'elenco dei modelli e ridisegna. */
async function leggi (): Promise<void> {
  const esito = await chiedi<DatiModelli>('llm.modelli')
  if (esito.ok && esito.dati) dati = esito.dati
  aggiorna({})
}

/**
 * Il catalogo, e la ricerca quando c'è qualcosa da cercare.
 *
 * Una chiamata sola per tutte e due: sono righe della stessa forma, e chi
 * guarda sta scegliendo fra loro — separarle vorrebbe dire due riquadri e due
 * modi di premere «Scarica».
 */
async function leggiCatalogo (): Promise<void> {
  const esito = await chiedi<typeof catalogo>('llm.catalogo', cercato ? { cerca: cercato } : {})
  if (esito.ok && esito.dati) catalogo = esito.dati
  aggiorna({})
}

/** I file veri di un deposito: i nomi cambiano, e si chiedono quando servono. */
async function apri (deposito: string, taglio: string): Promise<void> {
  const esito = await chiedi<{
    file: FileRemoto[]
    consigliato: string
    proiettore: string
    motivo: string
  }>('llm.file', { deposito, taglio })
  if (!esito.ok || !esito.dati) {
    notifica('L’elenco dei file non si è letto.', 'errore')
    return
  }
  aperto = { deposito, ...esito.dati }
  aggiorna({})
}

/**
 * Che cosa si sta cercando fra i depositi, e quale deposito si ha aperto.
 *
 * Le legge la veduta dell'assistente, e servono a una cosa sola: rendere
 * chiamabili gli attrezzi di questa pagina. `llm.catalogo` vuole `cerca` e
 * `llm.file` vuole `deposito` e `taglio` — cioè esattamente quel che chi guarda
 * ha già scritto e già aperto. Senza, «quale di questi conviene?» partiva senza
 * il deposito, e il modello ne apriva uno a caso fra quelli dell'elenco.
 *
 * Stanno in variabili di questo modulo e non nello stato, come la ricerca
 * dell'elenco delle persone: sono la pagina che si sta usando adesso, non una
 * preferenza da ritrovare domani.
 */
export function ricercaDeiModelli (): string {
  return cercato.trim()
}

export function depositoAperto (): { deposito: string, consigliato: string } | null {
  return aperto ? { deposito: aperto.deposito, consigliato: aperto.consigliato } : null
}

// -------------------------------------------------------------- i gesti

async function scarica (deposito: string, file: string, per?: UsoModello): Promise<void> {
  // Lo scarico si segna subito, senza aspettare il primo avanzamento: fra il
  // clic e il primo byte passano secondi, e un pulsante premuto che non cambia
  // niente si preme una seconda volta.
  scarico = { file, byte: 0, totale: 0 }
  aggiorna({})
  const risposta = await azione({ tipo: 'llm.scarica', deposito, file, ...(per ? { per } : {}) })
  if (!risposta.ok) {
    scarico = null
    notifica((risposta.errori ?? ['Lo scarico non è partito.']).join(' '), 'errore')
    aggiorna({})
  }
}

async function scegli (uso: UsoModello, modello: string, proiettore?: string): Promise<void> {
  const risposta = await azione({
    tipo: 'llm.scegli',
    uso,
    modello,
    ...(proiettore === undefined ? {} : { proiettore }),
  })
  if (!risposta.ok) {
    notifica((risposta.errori ?? ['La scelta non è stata salvata.']).join(' '), 'errore')
    return
  }
  await leggi()
}

async function elimina (nome: string): Promise<void> {
  // Un file da gigabyte che non passa dal cestino: si chiede, e si dice quanto
  // costerebbe rifarlo.
  const sicuro = await conferma({
    titolo: `Togliere «${nome}»?`,
    testo:
      'Il file viene cancellato dal disco. Per riaverlo bisogna scaricarlo di nuovo, e sono ' +
      'di solito qualche gigabyte.',
    testoConferma: 'Togli',
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'llm.elimina', nome })
  if (!risposta.ok) notifica((risposta.errori ?? ['Non si è potuto togliere.']).join(' '), 'errore')
  await leggi()
}

async function porta (percorso: string): Promise<void> {
  const risposta = await azione({ tipo: 'llm.importa', file: percorso })
  if (!risposta.ok) {
    notifica((risposta.errori ?? ['Il file non è entrato fra i modelli.']).join(' '), 'errore')
  }
  await leggi()
}

// ------------------------------------------------------ l'avanzamento

/**
 * Il percorso di un file trascinato dentro la finestra.
 *
 * Nel browser un file trascinato non ha un percorso: ha un contenuto, e
 * leggerlo qui vorrebbe dire far passare quattro gigabyte attraverso la pagina
 * per poi riscriverli da un'altra parte. Il percorso lo sa il guscio, e lo dice
 * attraverso il preload — l'unica riga di quel file che non sia il canale dei
 * messaggi, con il perché scritto accanto.
 */
function percorsoDelFile (file: File): string {
  const ponte = (window as unknown as { registroFile?: { percorsoDi: (f: File) => string } })
    .registroFile
  return ponte?.percorsoDi(file) ?? ''
}

/** Si mette in ascolto dell'avanzamento, una volta per vita del pannello. */
function ascoltaScarico (): void {
  if (inAscolto) return
  inAscolto = true
  ascolta((messaggio) => {
    if (messaggio.tipo !== 'scarico') return
    const avanzamento = messaggio
    if (!avanzamento.finito) {
      scarico = { file: avanzamento.file, byte: avanzamento.byte, totale: avanzamento.totale }
      // Il numero si segna sempre, il ridisegno solo a chi la barra ce l'ha
      // davanti. L'ascolto è del pannello e non della pagina — si attacca una
      // volta per vita e resta anche dopo essere andati altrove —, e senza
      // questa riga uno scarico da venti minuti ridisegnava tutto il registro
      // quattro volte al secondo mentre si segnavano le assenze. La pagina dei
      // modelli è l'unica che lo mostra, e tornandoci il ridisegno della
      // navigazione legge `scarico` già aggiornato.
      if (stato.vista === 'modelliLinguistici') aggiorna({})
      return
    }
    scarico = null
    if (avanzamento.motivo) notifica(avanzamento.motivo, 'avviso')
    else if (avanzamento.nome) notifica(`«${avanzamento.nome}» è pronto.`)
    // L'elenco cambia solo alla fine: rileggerlo a ogni avanzamento vorrebbe
    // dire una domanda al secondo per un numero che la barra mostra già.
    void leggi()
  })
}

// --------------------------------------------------------------- i pezzi

/** La riga di un uso: quale modello risponde, e che cosa manca. */
function rigaUso (
  uso: UsoModello,
  titolo: string,
  spiegazione: string,
  stato: StatoUso,
  modelli: ModelloLocale[],
): Figlio {
  // Un proiettore non è un modello da scegliere: è la metà di uno. Metterlo in
  // tendina vorrebbe dire offrire di far rispondere l'assistente con dei pesi
  // che non sanno parlare.
  const scegliibili = modelli.filter((m) => !m.proiettore)
  const tendina = h('select', {
    class: 'campo__controllo',
    attr: { 'aria-label': `Modello per ${titolo.toLowerCase()}` },
    onchange: (evento: Event) => {
      void scegli(uso, (evento.target as HTMLSelectElement).value)
    },
  },
  h('option', { value: '' }, '— nessuno —'),
  ...scegliibili.map((m) =>
    h('option', { value: m.nome, attr: { selected: m.nome === stato.modello ? '' : null } }, m.nome),
  ),
  )
  tendina.value = stato.modello

  return h(
    'div',
    { class: 'modelli-llm__uso' },
    h(
      'div',
      { class: 'modelli-llm__uso-testi' },
      h('h4', null, titolo),
      h('p', { class: 'modelli-llm__nota' }, spiegazione),
    ),
    tendina,
    stato.pronto
      ? pastiglia('pronto', 'positivo', 'spunta')
      : pastiglia(stato.attivo ? 'manca qualcosa' : 'spento', 'neutro'),
    stato.pronto ? null : h('p', { class: 'modelli-llm__motivo' }, stato.motivo),
  )
}

/**
 * La riga di uno scarico lasciato a metà.
 *
 * Non si sceglie e non si usa: dei pesi troncati caricati danno un errore che
 * parla di tensori a chi voleva sapere quante assenze ha una classe. Quel che
 * si può fare è buttarli — oppure rifare lo stesso scarico, che riprende da
 * dove era arrivato invece che da capo. Si mostrano perché altrimenti sarebbero
 * gigabyte invisibili: l'applicazione chiusa mentre scaricava lascia il file
 * lì, e prima nessuno poteva accorgersene guardando la pagina.
 */
function rigaIncompiuta (modello: ModelloLocale): Figlio {
  // In una costante: dentro la callback del pulsante il campo opzionale
  // tornerebbe a essere «forse non c'è», e il compilatore ha ragione — una
  // riga si ridisegna, e fra il disegno e il clic passa del tempo.
  const sorgente = modello.sorgente
  return h(
    'li',
    { class: ['modelli-llm__riga', 'modelli-llm__riga--incompiuta'] },
    h(
      'div',
      { class: 'modelli-llm__riga-testi' },
      h('span', { class: 'modelli-llm__nome' }, modello.nome.replace(/\.ipull$/i, '')),
      h('span', { class: 'modelli-llm__peso' }, quantoMisura(modello.byte)),
      pastiglia('sceso a metà', 'attenzione'),
      h(
        'p',
        { class: 'modelli-llm__nota' },
        sorgente
          ? 'Lo scarico non è arrivato in fondo. «Riprendi» riparte da qui e non da capo; '
            + 'buttandolo si libera lo spazio.'
          : 'Lo scarico non è arrivato in fondo, e non si sa da quale deposito veniva: '
            + 'si ritrova nel catalogo qui sotto e si riscarica da lì, oppure si butta.',
      ),
    ),
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
      // Il gesto che mancava. La libreria che scarica riprende da sola dal
      // punto in cui era arrivata — il file a metà dice quali pezzi ha già —
      // e quel che mancava qui era il tasto: senza, riprendere voleva dire
      // ritrovare il deposito a mano nel catalogo, cioè ricordarsi da dove
      // veniva un file sceso ieri.
      sorgente
        ? pulsante({
            testo: 'Riprendi',
            // «giù» e non un nome inventato: `TRACCIATI` è un `Record<string,
            // string>`, quindi un simbolo che non esiste compila e a schermo
            // diventa la «i» di informazione — un tasto che dice un'altra cosa.
            simbolo: 'giu',
            titolo: `Riparte da dov’era: ${sorgente.deposito}`,
            al: () => scarica(sorgente.deposito, sorgente.file, sorgente.per),
          })
        : null,
      pulsante({
        testo: 'Butta',
        simbolo: 'cestino',
        variante: 'pericolo',
        al: () => elimina(modello.nome),
      }),
    ),
  )
}

/** La riga di un modello sul disco. */
function rigaModello (modello: ModelloLocale): Figlio {
  if (modello.incompiuto) return rigaIncompiuta(modello)
  return h(
    'li',
    { class: 'modelli-llm__riga' },
    h(
      'div',
      { class: 'modelli-llm__riga-testi' },
      h('span', { class: 'modelli-llm__nome' }, modello.nome),
      h('span', { class: 'modelli-llm__peso' }, quantoMisura(modello.byte)),
      modello.proiettore ? pastiglia('proiettore', 'informativo') : null,
    ),
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
      modello.proiettore
        ? pulsante({
            testo: 'Usalo per le scansioni',
            titolo: 'Diventa il proiettore del modello che legge le scansioni',
            al: () => scegli('ocr', dati?.ocr.modello ?? '', modello.nome),
          })
        : h(
            'div',
            { class: 'modelli-llm__riga-azioni' },
            pulsante({ testo: 'All’assistente', al: () => scegli('assistente', modello.nome) }),
            pulsante({ testo: 'Alle scansioni', al: () => scegli('ocr', modello.nome) }),
          ),
      pulsante({
        simbolo: 'cestino',
        variante: 'pericolo',
        titolo: `Togli ${modello.nome}`,
        al: () => elimina(modello.nome),
      }),
    ),
  )
}

/** La barra dello scarico in corso, con il gesto per fermarlo. */
function rigaScarico (): Figlio {
  if (!scarico) return null
  const quota = scarico.totale > 0 ? scarico.byte / scarico.totale : 0
  return scheda({
    titolo: 'Sta scendendo',
    classe: 'modelli-llm__scarico',
    azioni: pulsante({
      testo: 'Ferma',
      variante: 'pericolo',
      al: async () => {
        await azione({ tipo: 'llm.annulla' })
      },
    }),
    contenuto: h(
      'div',
      null,
      h('p', { class: 'modelli-llm__nome' }, scarico.file),
      barra(quota),
      h(
        'p',
        { class: 'modelli-llm__nota' },
        scarico.totale > 0
          ? `${quantoMisura(scarico.byte)} di ${quantoMisura(scarico.totale)}`
          : 'Si sta collegando…',
      ),
    ),
  })
}

/** Una voce del catalogo consigliato. */
function rigaConsigliata (voce: Consigliato): Figlio {
  const perChe = voce.perChe === 'assistente' ? 'per l’assistente' : 'per le scansioni'
  return h(
    'li',
    { class: 'modelli-llm__riga' },
    h(
      'div',
      { class: 'modelli-llm__riga-testi' },
      h('span', { class: 'modelli-llm__nome' }, voce.titolo),
      pastiglia(perChe, 'informativo'),
      h('p', { class: 'modelli-llm__nota' }, voce.nota),
    ),
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
      pulsante({
        testo: 'Scarica',
        variante: 'primario',
        disabilitato: scarico !== null,
        al: async () => {
          // Si apre il deposito **prima** di scaricare: i nomi dei file
          // cambiano a ogni ripubblicazione, e quello giusto lo dice l'albero
          // di oggi e non un elenco scritto a mano il mese scorso.
          await apri(voce.deposito, voce.taglio)
          const file = aperto?.consigliato
          if (!file) {
            notifica('Quel deposito non pubblica un file che si possa usare.', 'avviso')
            return
          }
          await scarica(voce.deposito, file, voce.perChe)
          // Il modello che guarda sta in due file: il proiettore si prende
          // insieme, perché senza risponde immaginando — ed è il guasto che
          // non sembra un guasto.
          if (voce.perChe === 'ocr' && aperto?.proiettore) {
            notifica('Dopo questo scarica anche il proiettore, qui sotto.', 'info')
          }
        },
      }),
      pulsante({ testo: 'Vedi i file', al: () => apri(voce.deposito, voce.taglio) }),
    ),
  )
}

/** I file del deposito aperto: quale scaricare, e quanto pesa. */
function riquadroDeposito (): Figlio {
  if (!aperto) return null
  if (aperto.motivo) return avviso(aperto.motivo, 'attenzione')
  if (aperto.file.length === 0) {
    return avviso(`«${aperto.deposito}» non pubblica nessun file .gguf.`, 'attenzione')
  }

  return scheda({
    titolo: aperto.deposito,
    sottotitolo: 'Un modello si pubblica in più tagli: più grande pesa di più e risponde meglio.',
    azioni: pulsante({ testo: 'Chiudi', al: () => { aperto = null; aggiorna({}) } }),
    contenuto: h(
      'ul',
      { class: 'modelli-llm__elenco' },
      ...aperto.file.map((file) =>
        h(
          'li',
          { class: 'modelli-llm__riga' },
          h(
            'div',
            { class: 'modelli-llm__riga-testi' },
            h('span', { class: 'modelli-llm__nome' }, file.percorso),
            h('span', { class: 'modelli-llm__peso' }, quantoMisura(file.byte)),
            file.taglio ? pastiglia(file.taglio, 'neutro') : null,
            file.proiettore ? pastiglia('proiettore', 'informativo') : null,
            file.percorso === aperto?.consigliato ? pastiglia('consigliato', 'positivo') : null,
          ),
          pulsante({
            testo: 'Scarica',
            disabilitato: scarico !== null,
            al: () => scarica(aperto?.deposito ?? '', file.percorso),
          }),
        ),
      ),
    ),
  })
}

/** La casella di ricerca e quel che ha trovato. */
function riquadroRicerca (): Figlio {
  const casella = h('input', {
    class: 'campo__controllo',
    type: 'search',
    value: cercato,
    attr: {
      placeholder: 'Cerca fra i modelli pubblici: «qwen», «vision», «7b»',
      'aria-label': 'Cerca un modello su Hugging Face',
      autocomplete: 'off',
    },
    // Questa casella si scrive mentre la pagina si rifà sotto le dita: uno
    // scarico in corso la ridisegna quattro volte al secondo — vedi
    // `ascoltaScarico` — e senza `data-fuoco` `ricordaFuoco` non la ritrova,
    // quindi il ridisegno la ricreava e le lettere sparivano una a una.
    dataset: { fuoco: 'ricerca-modelli' },
    // `input` e non `change`: `change` arriva al `blur`, e fino ad allora
    // `cercato` restava indietro di tutto quel che si era battuto — così ogni
    // ridisegno rinasceva con il valore di prima, cancellando anche quel poco
    // che il fuoco ritrovato avrebbe salvato.
    oninput: (evento: Event) => { cercato = (evento.target as HTMLInputElement).value },
  })

  return scheda({
    titolo: 'Cerca su Hugging Face',
    sottotitolo:
      'Esce di qui soltanto quel che si scrive in questa casella: la ricerca non sa niente ' +
      'del registro, e quel che scarica entra — non esce.',
    contenuto: h(
      'div',
      null,
      h(
        'div',
        { class: 'modelli-llm__cerca' },
        casella,
        pulsante({
          testo: 'Cerca',
          simbolo: 'lente',
          al: () => {
            cercato = casella.value
            return leggiCatalogo()
          },
        }),
      ),
      catalogo && catalogo.trovati.length > 0
        ? h(
            'ul',
            { class: 'modelli-llm__elenco' },
            ...catalogo.trovati.map((trovato) =>
              h(
                'li',
                { class: 'modelli-llm__riga' },
                h(
                  'div',
                  { class: 'modelli-llm__riga-testi' },
                  h('span', { class: 'modelli-llm__nome' }, trovato.id),
                  h(
                    'span',
                    { class: 'modelli-llm__peso' },
                    `${trovato.scarichi.toLocaleString('it-CH')} scarichi`,
                  ),
                  trovato.ristretto ? pastiglia('chiede il permesso', 'attenzione') : null,
                ),
                pulsante({
                  testo: 'Vedi i file',
                  disabilitato: trovato.ristretto,
                  titolo: trovato.ristretto
                    ? 'Questo deposito chiede di accettare delle condizioni: da qui non si scarica'
                    : undefined,
                  al: () => apri(trovato.id, 'Q4_K_M'),
                }),
              ),
            ),
          )
        : null,
    ),
  })
}

/** La zona in cui si lascia cadere un `.gguf`. */
function zonaTrascinamento (): HTMLElement {
  const zona = h(
    'div',
    { class: 'modelli-llm__zona' },
    h('p', null, 'Trascina qui un file .gguf che hai già, oppure:'),
    pulsante({
      testo: 'Carica un file…',
      simbolo: 'cartella',
      // Il percorso vuoto apre il dialogo di sistema: il webview non lo può
      // aprire da sé, ed è il motivo per cui questo gesto passa dall'host.
      al: () => porta(''),
    }),
  )

  zona.addEventListener('dragover', (evento: DragEvent) => {
    // Fermato qui, altrimenti la guardia di `main.ts` lo prende e il file
    // non arriva mai: quella esiste perché un file lasciato fuori bersaglio non
    // porti via il registro, e questa è la zona che lo accetta davvero.
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    zona.classList.add('modelli-llm__zona--attiva')
  })
  zona.addEventListener('dragleave', () => zona.classList.remove('modelli-llm__zona--attiva'))
  zona.addEventListener('drop', (evento: DragEvent) => {
    evento.preventDefault()
    zona.classList.remove('modelli-llm__zona--attiva')
    const file = Array.from(evento.dataTransfer?.files ?? [])
    if (file.length === 0) return
    const percorso = percorsoDelFile(file[0])
    if (percorso === '') {
      notifica('Quel file non si è potuto leggere: usa «Carica un file…».', 'avviso')
      return
    }
    void porta(percorso)
  })

  return zona
}

// --------------------------------------------------------------- la vista

export function vistaModelliLinguistici (): Figlio {
  ascoltaScarico()
  if (!chiesto) {
    chiesto = true
    void leggi()
    void leggiCatalogo()
  }

  if (!dati) {
    return h('div', { class: 'vista' }, statoVuoto({
      simbolo: 'bot',
      titolo: 'Sto guardando che cosa c’è…',
    }))
  }

  // Quel che si può usare e quel che è rimasto a metà si contano a parte: «due
  // modelli» detto di un modello e di uno scarico interrotto è un conto che fa
  // cercare il secondo modello nella tendina, dove non c'è.
  const locali = dati.modelli.filter((modello) => !modello.incompiuto)
  const aMeta = dati.modelli.filter((modello) => modello.incompiuto)

  return h(
    'div',
    { class: 'vista modelli-llm' },
    testataVista({
      titolo: 'Modelli linguistici',
      sottotitolo:
        'I modelli che girano sulla tua macchina: l’assistente e la lettura delle scansioni ' +
        'lavorano con questi, e niente di quel che leggono esce dal computer.',
      azioni: pulsante({ testo: 'Ricarica', simbolo: 'ricarica', al: () => leggi() }),
      contorno: h('p', { class: 'modelli-llm__cartella' }, `Stanno in ${dati.cartella}`),
    }),
    rigaScarico(),
    scheda({
      titolo: 'Chi risponde',
      sottotitolo:
        'Due mestieri diversi: conversare vuole un modello che sappia chiamare gli strumenti, ' +
        'leggere una scansione vuole un modello che sappia guardare.',
      contenuto: h(
        'div',
        { class: 'modelli-llm__usi' },
        rigaUso(
          'assistente',
          'Assistente',
          'Risponde alle domande sul registro leggendo i dati veri.',
          dati.assistente,
          locali,
        ),
        rigaUso(
          'ocr',
          'Lettura delle scansioni',
          'Legge i nomi sulle pagine che testo non ne hanno. Vuole anche il suo proiettore.',
          dati.ocr,
          locali,
        ),
      ),
    }),
    scheda({
      titolo: 'Sul computer',
      sottotitolo: locali.length === 1 ? 'Un file' : `${locali.length} file`,
      contenuto: h(
        'div',
        null,
        aMeta.length > 0
          ? h('ul', { class: 'modelli-llm__elenco' }, ...aMeta.map((m) => rigaModello(m)))
          : null,
        locali.length === 0
          ? statoVuoto({
              simbolo: 'bot',
              titolo: 'Nessun modello, per ora',
              testo:
                'Se ne scarica uno qui sotto — per cominciare va benissimo il primo dei ' +
                'consigliati — oppure ci si trascina dentro un file .gguf che si ha già.',
            })
          : h('ul', { class: 'modelli-llm__elenco' }, ...locali.map((m) => rigaModello(m))),
        zonaTrascinamento(),
      ),
    }),
    scheda({
      titolo: 'Consigliati',
      sottotitolo:
        'Quattro, e non quaranta: due che conversano e due che guardano, dal più capace al ' +
        'più leggero.',
      contenuto: catalogo
        ? h(
            'ul',
            { class: 'modelli-llm__elenco' },
            ...catalogo.consigliati.map((voce) => rigaConsigliata(voce)),
          )
        : h('p', { class: 'modelli-llm__nota' }, 'Sto leggendo il catalogo…'),
    }),
    riquadroDeposito(),
    riquadroRicerca(),
  )
}
