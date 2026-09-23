// I modelli dei rapporti, dentro il registro.
//
// L'impaginazione dei PDF sta in `templates/`, in file di testo che si
// modificano a mano: è una scelta vecchia e resta giusta — cambiare la testata
// di un verbale non deve costare una ricompilazione, e i modelli sopravvivono
// agli aggiornamenti perché stanno fuori dal programma. Quel che non reggeva
// era il *come* ci si arrivava: un pulsante che apriva la cartella nel gestore
// di file, e da lì in poi il registro non c'era più.
//
// Tre cose mancavano, e sono le tre che questa pagina porta.
//
//   **Quale file.** Tredici nomi in una cartella non dicono che cosa fanno:
//   `_stile.tpl` e `momento-valutazione.tpl` si somigliano abbastanza da
//   sembrare la stessa specie di cosa, e non lo sono — uno vale per tutti i
//   fogli, l'altro per uno solo. L'elenco a sinistra li divide per quello: gli
//   strati comuni in alto, i rapporti sotto, e ognuno con la riga che dice che
//   cosa cambia toccandolo.
//
//   **Che cosa si può scrivere.** I nomi che un rapporto sa riempire —
//   `{{presenze}}`, `tabella: voti` — stavano in una funzione del dominio, e
//   per conoscerli bisognava leggere il codice. Adesso li chiede l'host, che li
//   ricava dai dati veri di quel rapporto: sono accanto all'editor, e si
//   incollano premendoli.
//
//   **Se è venuto come si pensava.** Il lettore dei modelli non cade mai: una
//   riga che non capisce la salta. È la regola giusta — un refuso non deve
//   impedire di stampare il verbale — e ha un prezzo: il refuso non si vede,
//   e si scopre il giorno dopo guardando un PDF a cui manca una tabella. Qui i
//   problemi si leggono riga per riga mentre si scrive, e il pulsante «Prova»
//   compone il foglio sui dati veri del registro senza scrivere niente da
//   nessuna parte.
//
// L'editor non passa dal ridisegno. Il pannello rifà la vista intera a ogni
// cambiamento — l'orologio batte il minuto, l'host rispinge lo stato — e una
// `<textarea>` ricostruita mentre ci si scrive dentro perderebbe il punto in
// cui si era. Il campo di ogni modello si costruisce una volta e si tiene da
// parte: il ridisegno lo rimette dov'era, con dentro quel che si stava
// scrivendo.

import type { RuoloModello } from '../../domain/templateCatalog.js'
import { formaModello, verificaModello, type Problema } from '../../domain/templateCheck.js'
import type { NomiModello, VoceModello } from '../../protocol.js'
import {
  avviso,
  pastiglia,
  quantoMisura,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { conferma } from '../components/modal.js'
import { impostaCaratteri, pagineDaByte } from '../components/thumbnails.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { impronta } from '../../domain/text.js'
import { azione, chiedi } from '../bridge.js'
import { aggiorna, stato } from '../state.js'

// ------------------------------------------------------------------ memoria
//
// Quel che la pagina si tiene fra un ridisegno e l'altro. Non sta nello stato
// dell'interfaccia perché non è stato del registro: è un file aperto e il
// lavoro a metà che ci si sta facendo sopra, e finisce quando si chiude il
// pannello — come un editor che non ha salvato.

/** Il testo di ogni modello com'era su disco all'ultima lettura. */
const suDisco = new Map<string, string>()

/** Il campo di ogni modello, costruito una volta: dentro c'è quel che si scrive. */
const campi = new Map<string, HTMLTextAreaElement>()

/** I nomi che ogni rapporto sa riempire, come li ha detti l'host. */
const nomiDi = new Map<string, NomiModello>()

/** Quelli che si stanno leggendo adesso: non si chiedono due volte. */
const inLettura = new Set<string>()

/** L'anteprima aperta: di quale modello, le sue pagine, quante erano. */
let anteprima: { nome: string, pagine: string[], totale: number } | null = null

/** Dove la pagina scrive l'elenco dei problemi, per aggiornarlo senza ridisegnare. */
let riquadroProblemi: HTMLElement | null = null

/** Dove sta la pastiglia «da salvare»: stessa ragione. */
let segnoModifiche: HTMLElement | null = null

// ------------------------------------------------------------- quale modello

/** I file della cartella, come li ha detti l'host. */
function elenco (): VoceModello[] {
  return stato.modelli
}

/**
 * Il modello aperto adesso.
 *
 * Quello scelto se c'è ancora — la cartella può essere cambiata da fuori — e
 * altrimenti il primo: una pagina che si apre su niente costringerebbe a
 * scegliere prima di aver capito che cosa c'è da scegliere.
 */
export function modelloAperto (): VoceModello | null {
  const voci = elenco()
  return voci.find((voce) => voce.nome === stato.modelloScelto) ?? voci[0] ?? null
}

/** Il testo che si sta scrivendo, o quello letto se non si è toccato niente. */
function bozzaDi (nome: string): string {
  return campi.get(nome)?.value ?? suDisco.get(nome) ?? ''
}

/** Vero se quel che si sta scrivendo è diverso da quel che c'è su disco. */
function daSalvare (nome: string): boolean {
  const letto = suDisco.get(nome)
  return letto !== undefined && bozzaDi(nome) !== letto
}

/** Vero se il modello aperto ha modifiche non salvate: lo legge la barra. */
export function modelloDaSalvare (): boolean {
  const aperto = modelloAperto()
  return aperto ? daSalvare(aperto.nome) : false
}

/**
 * Chiede all'host il testo di un modello e i nomi del suo rapporto.
 *
 * Una volta sola per modello: il testo poi vive nel campo, e rileggerlo a ogni
 * ridisegno vorrebbe dire cancellare quel che si sta scrivendo ogni minuto.
 * Chi vuole rileggerlo davvero usa «Ricarica», che butta via la bozza dicendolo.
 */
async function leggi (nome: string): Promise<void> {
  if (inLettura.has(nome)) return
  inLettura.add(nome)
  try {
    // Una domanda e non un'azione: leggere un modello non cambia niente, e
    // prima era una scrittura solo perché il canale non sapeva fare altro —
    // con tre campi di ritorno (`testo`, `nomi`, `pdf`) buoni per queste due
    // chiamate sole, appesi alla busta di tutte e centoquaranta.
    const esito = await chiedi<{ testo: string, nomi: NomiModello }>('modelli.leggi', { nome })
    if (!esito.ok || !esito.dati) {
      notifica((esito.errori.length > 0 ? esito.errori : ['Il modello non si è letto.']).join(' '), 'errore')
      return
    }
    suDisco.set(nome, esito.dati.testo)
    nomiDi.set(nome, esito.dati.nomi)
    // Il campo si costruisce qui e non nel disegno: il disegno lo trova già
    // pronto, e chi stava scrivendo in un altro modello non se lo vede rifare.
    campi.set(nome, campoDi(nome, esito.dati.testo))
    aggiorna({})
  } finally {
    inLettura.delete(nome)
  }
}

// ------------------------------------------------------------------- l'editor

/** Il campo di testo di un modello: si costruisce una volta e poi resta. */
function campoDi (nome: string, testo: string): HTMLTextAreaElement {
  const campo = h('textarea', {
    class: 'modelli__sorgente',
    attr: {
      spellcheck: 'false',
      autocapitalize: 'off',
      autocomplete: 'off',
      'aria-label': `Sorgente del modello ${nome}`,
      // Il ridisegno rimette il fuoco dov'era guardando questa chiave: senza,
      // un'ora che scocca mentre si scrive porterebbe via il cursore.
      'data-fuoco': `modello-${nome}`,
    },
  })
  campo.value = testo
  // Si controlla mentre si scrive, e si aggiorna solo il riquadro dei
  // problemi: un ridisegno della vista a ogni tasto battuto costerebbe il
  // punto in cui si sta scrivendo, ed è esattamente quel che non deve
  // succedere in un editor.
  campo.addEventListener('input', () => aggiornaProblemi(nome))
  return campo
}

/**
 * I problemi del testo di adesso, con i nomi veri di quel rapporto.
 *
 * La grammatica la dice il nome: `_blocchi.tpl` e `_testi.tpl` non sono
 * modelli di rapporto e non si leggono con le stesse regole, e la firma delle
 * e-mail è HTML — lì non c'è niente da dire.
 */
function problemiDi (nome: string): Problema[] {
  const nomi = nomiDi.get(nome)
  return verificaModello(bozzaDi(nome), {
    modelli: nomi?.modelli ?? [],
    immagini: nomi?.immagini ?? [],
    valori: nomi?.valori ?? [],
    elenchi: nomi?.elenchi ?? [],
    tabelle: nomi?.tabelle ?? [],
    grafici: nomi?.grafici ?? [],
    gallerie: nomi?.gallerie ?? [],
    gruppi: nomi?.gruppi ?? [],
    blocchi: nomi?.blocchi ?? [],
    frasi: nomi?.frasi ?? [],
  }, formaModello(nome))
}

/** Riscrive il riquadro dei problemi e la pastiglia delle modifiche, senza ridisegnare. */
function aggiornaProblemi (nome: string): void {
  if (riquadroProblemi) rimpiazza(riquadroProblemi, elencoProblemi(nome))
  if (segnoModifiche) rimpiazza(segnoModifiche, segnoDelloStato(nome))
}

/**
 * I problemi, o la riga che dice che non ce ne sono.
 *
 * Premendo una riga si va al punto: in un file di duecento righe, «riga 74» è
 * un numero da contare a mano, e contarlo è il lavoro che fa passare la voglia
 * di correggere un modello.
 */
function elencoProblemi (nome: string): Figlio {
  // La firma delle e-mail è HTML: il registro non la legge riga per riga e non
  // ha niente da dirne. Dire «nessun problema» sarebbe dire di aver guardato.
  if (formaModello(nome) === 'libero') {
    return h(
      'p',
      { class: 'modelli__attesa' },
      'È HTML, e il registro non lo controlla: lo spedisce com’è, in fondo alle e-mail.',
    )
  }

  const problemi = problemiDi(nome)
  if (problemi.length === 0) {
    return h('p', { class: 'modelli__nessun-problema' }, 'Nessun problema: il registro capisce tutto.')
  }

  return h(
    'ul',
    { class: 'modelli__problemi' },
    ...problemi.map((problema) =>
      h(
        'li',
        { class: ['modelli__problema', `modelli__problema--${problema.gravita}`] },
        h(
          'button',
          {
            class: 'modelli__riga-problema',
            type: 'button',
            onclick: () => vaiAllaRiga(nome, problema.riga),
          },
          h('span', { class: 'modelli__numero-riga' }, `riga ${problema.riga}`),
          h('span', { class: 'modelli__testo-problema' }, problema.testo),
        ),
      ),
    ),
  )
}

/** Porta il cursore all'inizio di una riga, e ce lo fa vedere. */
function vaiAllaRiga (nome: string, riga: number): void {
  const campo = campi.get(nome)
  if (!campo) return
  const righe = campo.value.split('\n')
  const dove = righe.slice(0, riga - 1).reduce((somma, testo) => somma + testo.length + 1, 0)
  campo.focus()
  campo.setSelectionRange(dove, dove + (righe[riga - 1]?.length ?? 0))
  // Il campo scorre da sé fino alla selezione solo se ha il fuoco: ce l'ha
  // appena preso, e questo lo porta a metà finestra invece che al bordo.
  const altezzaRiga = campo.scrollHeight / Math.max(1, righe.length)
  campo.scrollTop = Math.max(0, (riga - 1) * altezzaRiga - campo.clientHeight / 2)
}

/** Come sta il modello: salvato, da salvare, arretrato, o mai toccato. */
function segnoDelloStato (nome: string): Figlio {
  const voce = elenco().find((candidato) => candidato.nome === nome)
  if (daSalvare(nome)) return pastiglia('da salvare', 'attenzione')
  // Arretrato prima di «modificato»: sono tutti e due veri, ma il secondo lo
  // si sa già — è stato chi guarda a modificarlo — mentre il primo è la sola
  // cosa che il registro sa e lui no.
  if (voce?.arretrato) {
    return pastiglia('la copia di serie è cambiata', 'attenzione')
  }
  if (voce?.modificato) return pastiglia('modificato', 'informativo')
  return pastiglia('di serie', 'quiete')
}

// ------------------------------------------------------------------- i gesti
//
// Stanno qui e non nella riga delle azioni per metà: la riga li invoca — vedi
// `commands.ts` — e qui c'è che cosa fanno. Le due superfici non li ripetono.

/** Scrive il modello aperto. */
export async function salvaModello (): Promise<void> {
  const aperto = modelloAperto()
  if (!aperto) return
  const testo = bozzaDi(aperto.nome)
  const letto = suDisco.get(aperto.nome)
  const risposta = await azione({
    tipo: 'modello.salva',
    nome: aperto.nome,
    testo,
    ...(letto === undefined ? {} : { attesoSuDisco: impronta(letto) }),
  })
  if (!risposta.ok) return
  suDisco.set(aperto.nome, testo)
  aggiorna({})
}

/**
 * Rimette il modello di serie.
 *
 * Si chiede conferma qui e non nell'host: la domanda si fa dove si vede che
 * cosa si sta per buttare via, e un dialogo di sistema a metà di un'azione
 * sarebbe la stessa domanda posta due volte.
 */
export async function ripristinaAperto (): Promise<void> {
  const aperto = modelloAperto()
  if (!aperto) return
  const sicuro = await conferma({
    titolo: `Rimettere «${aperto.titolo}» com’era?`,
    testo:
      'Il modello torna alla copia di serie del registro. Quel che è stato scritto dentro va perso, ' +
      'e i rapporti che lo usano tornano a uscire come uscivano appena installato il registro.',
    testoConferma: 'Rimetti quello di serie',
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'modello.ripristina', nome: aperto.nome })
  if (!risposta.ok) return
  suDisco.delete(aperto.nome)
  campi.delete(aperto.nome)
  anteprima = null
  await leggi(aperto.nome)
}

/** Rilegge il file da disco, buttando via la bozza. */
export async function ricaricaAperto (): Promise<void> {
  const aperto = modelloAperto()
  if (!aperto) return
  if (daSalvare(aperto.nome)) {
    const sicuro = await conferma({
      titolo: 'Rileggere il file dal disco?',
      testo: 'Quel che si è scritto e non salvato va perso.',
      testoConferma: 'Rileggi',
      pericolo: true,
    })
    if (!sicuro) return
  }
  campi.delete(aperto.nome)
  suDisco.delete(aperto.nome)
  await leggi(aperto.nome)
}

/**
 * Compone il foglio con quel che si sta scrivendo e lo mostra.
 *
 * Il PDF non tocca il disco: arriva in base64 e si disegna qui dentro con lo
 * stesso lettore che disegna le scansioni da smistare. Un foglio di prova
 * salvato fra le esportazioni sarebbe un documento in più da spiegare a chi
 * apre quella cartella per consegnare.
 */
export async function provaAperto (): Promise<void> {
  const aperto = modelloAperto()
  if (!aperto) return
  const esito = await chiedi<{ pdf: string }>('modelli.prova', {
    nome: aperto.nome,
    bozza: bozzaDi(aperto.nome),
  })
  if (!esito.ok || !esito.dati) {
    if (esito.errori.length > 0) notifica(esito.errori.join(' '), 'errore')
    return
  }

  const grezzo = atob(esito.dati.pdf)
  const byte = new Uint8Array(grezzo.length)
  for (let i = 0; i < grezzo.length; i += 1) byte[i] = grezzo.charCodeAt(i)

  // I caratteri standard del PDF stanno accanto ai bundle: senza dirlo a
  // pdfjs, un foglio che nomina Helvetica senza portarsela dentro viene
  // disegnato con un carattere di ripiego — e l'anteprima mostrerebbe una
  // pagina che non è quella che si stamperebbe.
  if (stato.radiceApp) impostaCaratteri(stato.radiceApp)

  try {
    const disegnate = await pagineDaByte(byte, 700)
    anteprima = { nome: aperto.nome, pagine: disegnate.pagine, totale: disegnate.totale }
    aggiorna({})
  } catch (errore) {
    notifica(`L’anteprima non si è disegnata: ${(errore as Error).message}`, 'errore')
  }
}

/** Porta un'immagine dentro `templates/`: il logo della sede. */
export function portaImmagine (): Promise<unknown> {
  return azione({ tipo: 'modello.immagine' })
}

/** Apre `templates/` nel gestore di file: per chi ci vuole guardare dentro. */
export function apriCartellaModelli (): Promise<unknown> {
  return azione({ tipo: 'rapporto.modelli' })
}

// ------------------------------------------------------------------- l'elenco

const TITOLI_RUOLO: Record<RuoloModello, string> = {
  comune: 'Sotto tutti i rapporti',
  rapporto: 'Un rapporto per volta',
  posta: 'Posta',
  immagine: 'Immagini',
}

const ORDINE_RUOLI: readonly RuoloModello[] = ['comune', 'rapporto', 'posta', 'immagine']

function rigaElenco (voce: VoceModello): HTMLElement {
  const aperto = modelloAperto()
  const scelto = aperto?.nome === voce.nome
  return h(
    'button',
    {
      class: ['modelli__voce', scelto && 'modelli__voce--scelta'],
      type: 'button',
      attr: { 'aria-current': scelto ? 'true' : 'false' },
      onclick: () => aggiorna({ modelloScelto: voce.nome }),
    },
    h(
      'span',
      { class: 'modelli__voce-testata' },
      h('span', { class: 'modelli__voce-titolo' }, voce.titolo),
      daSalvare(voce.nome)
        ? h('span', { class: 'modelli__pallino', attr: { title: 'Da salvare' } })
        : voce.arretrato
          ? h('span', {
              class: 'modelli__pallino modelli__pallino--arretrato',
              attr: {
                title:
                  'La copia di serie è cambiata da quando questo è stato salvato: ' +
                  'confrontalo, o rimettilo di serie',
              },
            })
          : voce.modificato
            ? h('span', { class: 'modelli__pallino modelli__pallino--fermo', attr: { title: 'Modificato' } })
            : null,
    ),
    h('span', { class: 'modelli__voce-aiuto' }, voce.aiuto),
    h('span', { class: 'modelli__voce-file' }, `${voce.file} · ${quantoMisura(voce.misura)}`),
  )
}

function colonnaElenco (): HTMLElement {
  const voci = elenco()
  return h(
    'nav',
    { class: 'modelli__elenco', attr: { 'aria-label': 'Modelli' } },
    ...ORDINE_RUOLI.flatMap((ruolo) => {
      const suoi = voci.filter((voce) => voce.ruolo === ruolo)
      if (suoi.length === 0) return []
      return [
        h('h3', { class: 'modelli__gruppo' }, TITOLI_RUOLO[ruolo]),
        ...suoi.map(rigaElenco),
      ]
    }),
  )
}

// ------------------------------------------------------------------- i nomi

/** Un nome che si incolla nel punto in cui si sta scrivendo. */
function pastigliaNome (nome: string, testo: string, inserto: string): HTMLElement {
  return h(
    'button',
    {
      class: 'modelli__nome',
      type: 'button',
      attr: { title: `Inserisci ${inserto}` },
      onclick: () => inserisci(nome, inserto),
    },
    testo,
  )
}

/** Mette del testo dove sta il cursore, e lascia il fuoco dov'era. */
function inserisci (nome: string, testo: string): void {
  const campo = campi.get(nome)
  if (!campo) return
  const da = campo.selectionStart ?? campo.value.length
  const a = campo.selectionEnd ?? da
  campo.value = `${campo.value.slice(0, da)}${testo}${campo.value.slice(a)}`
  campo.focus()
  campo.setSelectionRange(da + testo.length, da + testo.length)
  aggiornaProblemi(nome)
}

/**
 * I nomi che quel rapporto sa riempire.
 *
 * Non una tabella scritta a mano da qualche parte: sono le chiavi dei dati
 * veri, prodotte dal dominio e passate dall'host. È la differenza fra un
 * elenco che resta indietro e uno che non può.
 */
function riquadroNomi (voce: VoceModello): Figlio {
  const nomi = nomiDi.get(voce.nome)
  if (!nomi) return null

  const gruppi: Array<[string, string[], (n: string) => string]> = [
    ['Segnaposto', nomi.valori, (n) => `{{${n}}}`],
    ['Frasi', nomi.frasi, (n) => `{{frase.${n}}}`],
    ['Tabelle', nomi.tabelle, (n) => `tabella: ${n}`],
    ['Elenchi', nomi.elenchi, (n) => `elenco: ${n}`],
    ['Grafici', nomi.grafici, (n) => `grafico: ${n}`],
    ['Ritratti', nomi.gallerie, (n) => `galleria: ${n}`],
    ['Gruppi da ripetere', nomi.gruppi, (n) => `ripeti: ${n}`],
    ['Blocchi', nomi.blocchi, (n) => `usa: ${n}`],
    ['Immagini', nomi.immagini, (n) => `immagine: ${n} | altezza 14 | destra`],
  ]

  const pieni = gruppi.filter(([, elementi]) => elementi.length > 0)
  if (pieni.length === 0) return null

  return scheda({
    titolo: 'Che cosa si può mettere dentro',
    sottotitolo:
      voce.ruolo === 'comune'
        ? 'i nomi di questo rapporto d’esempio: gli altri ne hanno di loro'
        : 'i nomi che questo rapporto sa riempire, presi dai dati veri',
    classe: 'modelli__nomi',
    contenuto: pieni.map(([titolo, elementi, forma]) =>
      h(
        'div',
        { class: 'modelli__gruppo-nomi' },
        h('h4', { class: 'modelli__titolo-nomi' }, titolo),
        h(
          'div',
          { class: 'modelli__pastiglie' },
          ...elementi.map((elemento) =>
            pastigliaNome(voce.nome, elemento, forma(elemento)),
          ),
        ),
      ),
    ),
  })
}

// ---------------------------------------------------------------- l'anteprima

function riquadroAnteprima (voce: VoceModello): Figlio {
  if (!anteprima || anteprima.nome !== voce.nome) {
    return scheda({
      titolo: 'Anteprima',
      classe: 'modelli__anteprima',
      contenuto: statoVuoto({
        simbolo: 'documento',
        titolo: 'Nessuna prova ancora',
        testo:
          voce.genere === null
            ? 'Questo file non compone un PDF: è la firma che va in fondo alle e-mail.'
            : 'Premendo «Prova» il registro compone il foglio con i dati veri di un corso e lo mostra qui, senza scrivere niente su disco.',
      }),
    })
  }

  const mostrate = anteprima.pagine.length
  return scheda({
    titolo: 'Anteprima',
    sottotitolo:
      anteprima.totale > mostrate
        ? `prime ${mostrate} pagine di ${anteprima.totale}`
        : `${mostrate} ${mostrate === 1 ? 'pagina' : 'pagine'}`,
    classe: 'modelli__anteprima',
    contenuto: h(
      'div',
      { class: 'modelli__pagine' },
      ...anteprima.pagine.map((immagine, indice) =>
        h('img', {
          class: 'modelli__pagina',
          attr: { src: immagine, alt: `Pagina ${indice + 1} dell’anteprima` },
        }),
      ),
    ),
  })
}

// ------------------------------------------------------------------ la pagina

function corpo (voce: VoceModello): Figlio {
  if (voce.ruolo === 'immagine') {
    return scheda({
      titolo: voce.file,
      sottotitolo: `${quantoMisura(voce.misura)} · sta in templates/`,
      classe: 'modelli__editor',
      contenuto: statoVuoto({
        simbolo: 'immagine',
        titolo: 'Un’immagine non si modifica qui',
        testo:
          'Si sostituisce portandone dentro un’altra con lo stesso nome — «Porta un’immagine» ' +
          'nella riga delle azioni — oppure si apre la cartella e si lavora di lì.',
      }),
    })
  }

  const testo = suDisco.get(voce.nome)
  if (testo === undefined) {
    // Il testo si chiede alla prima volta che si apre quel modello, e il
    // disegno non aspetta: la richiesta parte, e quando torna la vista si rifà.
    void leggi(voce.nome)
    return scheda({
      titolo: voce.titolo,
      classe: 'modelli__editor',
      contenuto: h('p', { class: 'modelli__attesa' }, 'Lettura del modello…'),
    })
  }

  const campo = campi.get(voce.nome) ?? campoDi(voce.nome, testo)
  campi.set(voce.nome, campo)
  segnoModifiche = h('div', { class: 'modelli__segno' }, segnoDelloStato(voce.nome))
  riquadroProblemi = h('div', { class: 'modelli__riquadro-problemi' }, elencoProblemi(voce.nome))

  return [
    scheda({
      titolo: voce.titolo,
      sottotitolo: `${voce.file} · ${voce.aiuto}`,
      azioni: segnoModifiche,
      classe: 'modelli__editor',
      contenuto: [
        voce.suDisco
          ? null
          : avviso(
              'Questo file non c’è ancora in templates/: vale la copia di serie del registro. ' +
                'Salvando lo si scrive, e da lì in poi comanda quel che c’è su disco.',
            ),
        campo,
        riquadroProblemi,
      ],
    }),
    riquadroNomi(voce),
    riquadroAnteprima(voce),
  ]
}

export function vistaModelli (): Figlio {
  const voci = elenco()
  const aperto = modelloAperto()

  return h(
    'div',
    { class: 'vista vista--modelli' },
    testataVista({
      compatta: true,
      titolo: 'Modelli',
      sottotitolo: 'come sono fatti i fogli che il registro stampa',
    }),
    voci.length === 0
      ? statoVuoto({
          simbolo: 'documento',
          titolo: 'Nessun modello',
          testo:
            'I modelli stanno in templates/, accanto al documento dell’anno. Il registro ci scrive ' +
            'quelli di serie al primo rapporto: apri un documento e stampa qualcosa, e compariranno qui.',
        })
      : h(
          'div',
          { class: 'modelli__lavoro' },
          h(
            'aside',
            { class: 'modelli__barra', dataset: { scorrimento: 'modelli:barra' } },
            colonnaElenco(),
          ),
          h('main', { class: 'modelli__corpo' }, aperto ? corpo(aperto) : null),
        ),
  )
}
