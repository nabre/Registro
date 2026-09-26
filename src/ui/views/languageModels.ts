// I modelli del linguaggio: quelli che ci sono, quelli che si possono avere.
// I modelli sono file `.gguf`: si scaricano (consigliati o cercati su Hugging
// Face), si trascinano nella pagina o si scelgono con il dialogo di sistema.
// Conversare e leggere scansioni sono due righe separate: chi conversa deve
// chiamare gli attrezzi, chi legge deve saper guardare. Lo scarico mostra
// avanzamento e arresto; l'avanzamento lo spinge l'host (`MessaggioScarico`).

import type { UsoModello } from '../../protocol.js'
import {
  avviso,
  barra,
  pastiglia,
  pulsante,
  quantoMisura,
  scheda,
  statoVuoto,
} from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { conferma } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { azione, ascolta, chiedi } from '../bridge.js'
import { aggiorna, stato } from '../state.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './languageModels.testi.js'

// ------------------------------------------------------------------ memoria
//
// Stato della pagina fra un ridisegno e l'altro, fuori dallo stato
// dell'interfaccia: file su disco e ricerca in corso, finiscono col pannello.

interface ModelloLocale {
  nome: string
  byte: number
  proiettore: boolean
  /** Uno scarico mai finito: si può soltanto buttare, o riprendere. */
  incompiuto?: boolean
  /**
   * Da dove veniva un file a metà: serve a «Riprendi». Se manca (file copiato a
   * mano) resta solo «Butta».
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

/** Quel che aspetta il suo turno dietro lo scarico in corso. */
let inCoda: string[] = []

/** Se si è già chiesto l'elenco: non si richiede a ogni ridisegno. */
let chiesto = false

/** Se si è già in ascolto dell'avanzamento. Una volta per vita del pannello. */
let inAscolto = false

/**
 * Perché l'elenco non si è letto: senza, una lettura fallita lascerebbe la
 * pagina in attesa per sempre, senza modo di riprovare.
 */
let erroreElenco = ''

/**
 * Il numero dell'ultima domanda al catalogo e dell'ultimo deposito aperto: con
 * due domande in volo vince l'ultima chiesta, non l'ultima arrivata. Come in
 * `forms/calendar.ts`.
 */
let giroCatalogo = 0
let giroDeposito = 0

// ------------------------------------------------------------- le domande

/** Rilegge l'elenco dei modelli e ridisegna. */
async function leggi (): Promise<void> {
  const esito = await chiedi<DatiModelli>('llm.modelli')
  if (esito.ok && esito.dati) {
    dati = esito.dati
    erroreElenco = ''
  } else {
    erroreElenco = esito.errori.join(' ') || testi().elencoNonLetto
  }
  aggiorna({})
}

/** Il catalogo, e la ricerca se c'è qualcosa da cercare: una chiamata, righe della stessa forma. */
async function leggiCatalogo (): Promise<void> {
  giroCatalogo += 1
  const questo = giroCatalogo
  const esito = await chiedi<typeof catalogo>('llm.catalogo', cercato ? { cerca: cercato } : {})
  if (questo !== giroCatalogo) return
  if (esito.ok && esito.dati) catalogo = esito.dati
  aggiorna({})
}

/** I file veri di un deposito: i nomi cambiano, e si chiedono quando servono. */
async function apri (deposito: string, taglio: string): Promise<void> {
  giroDeposito += 1
  const questo = giroDeposito
  const esito = await chiedi<{
    file: FileRemoto[]
    consigliato: string
    proiettore: string
    motivo: string
  }>('llm.file', { deposito, taglio })
  if (questo !== giroDeposito) return
  if (!esito.ok || !esito.dati) {
    notifica(testi().fileNonLetti, 'errore')
    return
  }
  aperto = { deposito, ...esito.dati }
  aggiorna({})
}

/**
 * Che cosa si cerca fra i depositi e quale deposito è aperto: li legge la
 * veduta dell'assistente per chiamare `llm.catalogo` (`cerca`) e `llm.file`
 * (`deposito`, `taglio`) su quel che si ha davanti. Variabili del modulo e non
 * stato: valgono per la pagina di adesso.
 */
export function ricercaDeiModelli (): string {
  return cercato.trim()
}

export function depositoAperto (): { deposito: string, consigliato: string } | null {
  return aperto ? { deposito: aperto.deposito, consigliato: aperto.consigliato } : null
}

// -------------------------------------------------------------- i gesti

async function scarica (deposito: string, file: string, per?: UsoModello): Promise<void> {
  // Lo scarico si segna subito, prima del primo avanzamento, così il pulsante
  // cambia e non si preme due volte; se un altro scende già, va in fila. Un
  // doppione lo rifiuta l'host: qui non si segna.
  const nuovo = !giaChiesto(file)
  const primo = scarico === null
  if (primo) scarico = { file, byte: 0, totale: 0 }
  else if (nuovo) inCoda = [...inCoda, file]
  aggiorna({})
  const risposta = await azione({ tipo: 'llm.scarica', deposito, file, ...(per ? { per } : {}) })
  if (!risposta.ok) {
    if (primo && scarico?.file === file) scarico = null
    if (nuovo) inCoda = inCoda.filter((nome) => nome !== file)
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
  if (!risposta.ok) return
  await leggi()
}

async function elimina (nome: string): Promise<void> {
  // Un file da gigabyte che non passa dal cestino: si chiede, dicendo quanto
  // costerebbe rifarlo.
  const sicuro = await conferma({
    titolo: testi().togliere(nome),
    testo: testi().togliereTesto,
    testoConferma: parole().togli,
    pericolo: true,
  })
  if (!sicuro) return
  await azione({ tipo: 'llm.elimina', nome })
  await leggi()
}

async function porta (percorso: string): Promise<void> {
  await azione({ tipo: 'llm.importa', file: percorso })
  await leggi()
}

// ------------------------------------------------------ l'avanzamento

/**
 * Il percorso di un file trascinato nella finestra. Nel browser un `File` ha
 * solo il contenuto; il percorso lo dà il guscio attraverso il preload, così
 * i gigabyte non passano dalla pagina.
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
    inCoda = avanzamento.coda
    if (!avanzamento.finito) {
      scarico = { file: avanzamento.file, byte: avanzamento.byte, totale: avanzamento.totale }
      // Il numero si segna sempre, il ridisegno solo se la pagina dei modelli è in
      // vista: l'ascolto dura per tutta la vita del pannello e altrimenti
      // ridisegnerebbe il registro quattro volte al secondo. Tornando qui, il
      // ridisegno legge `scarico` già aggiornato.
      if (modelliInVista()) aggiorna({})
      return
    }
    scarico = null
    if (avanzamento.motivo) notifica(avanzamento.motivo, 'avviso')
    else if (avanzamento.nome) notifica(testi().pronto(avanzamento.nome))
    // L'elenco si rilegge solo alla fine dello scarico.
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
  // Un proiettore è metà di un modello, non si sceglie in tendina.
  const scegliibili = modelli.filter((m) => !m.proiettore)
  const t = testi()
  const tendina = h('select', {
    class: 'campo__controllo campo__controllo--selezione',
    attr: { 'aria-label': t.modelloPer(titolo) },
    onchange: (evento: Event) => {
      void scegli(uso, (evento.target as HTMLSelectElement).value)
    },
  },
  h('option', { value: '' }, t.nessuno),
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
      h('h4', null, titolo, suggerimento(spiegazione, { etichetta: titolo })),
    ),
    tendina,
    stato.pronto
      ? pastiglia(t.statoPronto, 'positivo', 'spunta')
      : pastiglia(stato.attivo ? t.mancaQualcosa : t.spento, 'neutro'),
    stato.pronto ? null : h('p', { class: 'modelli-llm__motivo' }, stato.motivo),
  )
}

/**
 * La riga di uno scarico lasciato a metà: non si usa (pesi troncati), si butta
 * o si riprende dal punto in cui era arrivato. Si mostra perché non restino
 * gigabyte invisibili.
 */
function rigaIncompiuta (modello: ModelloLocale): Figlio {
  // In una costante: nella callback il campo opzionale tornerebbe «forse non c'è».
  const sorgente = modello.sorgente
  const t = testi()
  return h(
    'li',
    { class: ['modelli-llm__riga', 'modelli-llm__riga--incompiuta'] },
    h(
      'div',
      { class: 'modelli-llm__riga-testi' },
      h('span', { class: 'modelli-llm__nome' }, modello.nome.replace(/\.ipull$/i, '')),
      h('span', { class: 'modelli-llm__peso' }, quantoMisura(modello.byte)),
      pastiglia(t.scesoAMeta, 'attenzione'),
      h('p', { class: 'modelli-llm__nota' }, sorgente ? t.riprendibile : t.senzaSorgente),
    ),
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
      // Riprendi: la libreria che scarica riparte da dove era arrivata (il file a
      // metà sa quali pezzi ha).
      sorgente
        ? pulsante({
            testo: t.riprendi,
            // «giù» esiste in `TRACCIATI`: essendo un `Record<string, string>`, un nome
            // inesistente compilerebbe e mostrerebbe la «i» di informazione.
            simbolo: 'giu',
            titolo: t.riparte(sorgente.deposito),
            disabilitato: giaChiesto(sorgente.file),
            al: () => scarica(sorgente.deposito, sorgente.file, sorgente.per),
          })
        : null,
      pulsante({
        testo: t.butta,
        simbolo: 'cestino',
        variante: 'pericolo',
        // Spento mentre quel file scende o aspetta: il `.ipull` è il file in scrittura.
        // L'host lo rifiuterebbe comunque.
        disabilitato: giaChiesto(modello.nome.replace(/\.ipull$/i, ''))
          || (sorgente !== undefined && giaChiesto(sorgente.file)),
        al: () => elimina(modello.nome),
      }),
    ),
  )
}

/** La riga di un modello sul disco. */
function rigaModello (modello: ModelloLocale): Figlio {
  if (modello.incompiuto) return rigaIncompiuta(modello)
  const t = testi()
  return h(
    'li',
    { class: 'modelli-llm__riga' },
    h(
      'div',
      { class: 'modelli-llm__riga-testi' },
      h('span', { class: 'modelli-llm__nome' }, modello.nome),
      h('span', { class: 'modelli-llm__peso' }, quantoMisura(modello.byte)),
      modello.proiettore ? pastiglia(t.proiettore, 'informativo') : null,
    ),
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
      modello.proiettore
        ? pulsante({
            testo: t.usaloPerScansioni,
            titolo: t.usaloPerScansioniAiuto,
            al: () => scegli('ocr', dati?.ocr.modello ?? '', modello.nome),
          })
        : h(
            'div',
            { class: 'modelli-llm__riga-azioni' },
            pulsante({ testo: t.allAssistente, al: () => scegli('assistente', modello.nome) }),
            pulsante({ testo: t.alleScansioni, al: () => scegli('ocr', modello.nome) }),
          ),
      pulsante({
        simbolo: 'cestino',
        variante: 'pericolo',
        titolo: t.togli(modello.nome),
        al: () => elimina(modello.nome),
      }),
    ),
  )
}

/**
 * La barra dello scarico in corso, con il gesto per fermarlo, e sotto la fila
 * di quel che aspetta: ognuno si toglie da sé, senza toccare chi scende.
 */
function rigaScarico (): Figlio {
  if (!scarico) return null
  // In una costante: al clic `scarico` può essere già un altro.
  const inCorsoOra = scarico.file
  const quota = scarico.totale > 0 ? scarico.byte / scarico.totale : 0
  const t = testi()
  return scheda({
    titolo: t.staScendendo,
    classe: 'modelli-llm__scarico',
    azioni: pulsante({
      testo: t.ferma,
      variante: 'pericolo',
      titolo: inCoda.length > 0 ? t.fermaAiuto : undefined,
      // Con il nome mostrato dalla barra: se nel frattempo ne è partito un altro,
      // l'host non ferma quello.
      al: async () => {
        await azione({ tipo: 'llm.annulla', file: inCorsoOra })
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
          ? t.diTotale(quantoMisura(scarico.byte), quantoMisura(scarico.totale))
          : t.siStaCollegando,
      ),
      inCoda.length > 0
        ? h(
            'div',
            null,
            h('h4', null, t.inCoda(inCoda.length)),
            h(
              'ul',
              { class: 'modelli-llm__elenco' },
              ...inCoda.map((file) =>
                h(
                  'li',
                  { class: 'modelli-llm__riga' },
                  h(
                    'div',
                    { class: 'modelli-llm__riga-testi' },
                    h('span', { class: 'modelli-llm__nome' }, file),
                  ),
                  pulsante({
                    simbolo: 'cestino',
                    titolo: t.togliDallaCoda(file),
                    al: async () => {
                      await azione({ tipo: 'llm.annulla', file })
                    },
                  }),
                ),
              ),
            ),
          )
        : null,
    ),
  })
}

/** Se quel file sta già scendendo o aspetta: il suo «Scarica» non serve più. */
function giaChiesto (file: string): boolean {
  return scarico?.file === file || inCoda.includes(file)
}

/** Una voce del catalogo consigliato. */
function rigaConsigliata (voce: Consigliato): Figlio {
  const t = testi()
  const perChe = voce.perChe === 'assistente' ? t.perAssistente : t.perScansioni
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
        testo: scarico ? t.mettiInCoda : parole().scarica,
        variante: 'primario',
        al: async () => {
          // Si apre il deposito prima di scaricare: i nomi dei file cambiano a ogni
          // ripubblicazione, e quello giusto lo dice l'albero di oggi.
          await apri(voce.deposito, voce.taglio)
          const file = aperto?.consigliato
          if (!file) {
            notifica(t.nessunFileUsabile, 'avviso')
            return
          }
          await scarica(voce.deposito, file, voce.perChe)
          // Il modello che guarda sta in due file: il proiettore si prende insieme,
          // perché senza il modello risponde inventando.
          if (voce.perChe === 'ocr' && aperto?.proiettore) {
            notifica(t.scaricaProiettore, 'info')
          }
        },
      }),
      pulsante({ testo: t.vediFile, al: () => apri(voce.deposito, voce.taglio) }),
    ),
  )
}

/** I file del deposito aperto: quale scaricare, e quanto pesa. */
function riquadroDeposito (): Figlio {
  if (!aperto) return null
  const t = testi()
  if (aperto.motivo) return avviso(aperto.motivo, 'attenzione')
  if (aperto.file.length === 0) return avviso(t.nessunGguf(aperto.deposito), 'attenzione')

  return scheda({
    titolo: aperto.deposito,
    aiuto: t.tagli,
    azioni: pulsante({ testo: parole().chiudi, al: () => { aperto = null; aggiorna({}) } }),
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
            file.proiettore ? pastiglia(t.proiettore, 'informativo') : null,
            file.percorso === aperto?.consigliato ? pastiglia(t.consigliato, 'positivo') : null,
          ),
          pulsante({
            testo: giaChiesto(file.percorso)
              ? t.inFila
              : scarico ? t.mettiInCoda : parole().scarica,
            disabilitato: giaChiesto(file.percorso),
            al: () => scarica(aperto?.deposito ?? '', file.percorso),
          }),
        ),
      ),
    ),
  })
}

/** La casella di ricerca e quel che ha trovato. */
function riquadroRicerca (): Figlio {
  const t = testi()
  const casella = h('input', {
    class: 'campo__controllo',
    type: 'search',
    value: cercato,
    attr: {
      placeholder: t.cercaSegnaposto,
      'aria-label': t.cercaEtichetta,
      autocomplete: 'off',
    },
    // `data-fuoco` perché uno scarico in corso ridisegna la pagina quattro volte
    // al secondo (`ascoltaScarico`), e senza `ricordaFuoco` perderebbe la casella.
    dataset: { fuoco: 'ricerca-modelli' },
    // `input` e non `change`, che arriva solo al `blur`: altrimenti il ridisegno
    // rinascerebbe con il valore vecchio.
    oninput: (evento: Event) => { cercato = (evento.target as HTMLInputElement).value },
  })

  return scheda({
    titolo: t.cercaTitolo,
    sottotitolo: t.cercaSottotitolo,
    contenuto: h(
      'div',
      null,
      h(
        'div',
        { class: 'modelli-llm__cerca' },
        casella,
        pulsante({
          testo: parole().cerca,
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
                    t.scarichi(trovato.scarichi),
                  ),
                  trovato.ristretto ? pastiglia(t.chiedePermesso, 'attenzione') : null,
                ),
                pulsante({
                  testo: t.vediFile,
                  disabilitato: trovato.ristretto,
                  titolo: trovato.ristretto ? t.condizioni : undefined,
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
  const t = testi()
  const zona = h(
    'div',
    { class: 'modelli-llm__zona' },
    h('p', null, t.trascinaQui),
    pulsante({
      testo: t.caricaFile,
      simbolo: 'cartella',
      // Il percorso vuoto fa aprire all'host il dialogo di sistema, che il webview
      // non può aprire da sé.
      al: () => porta(''),
    }),
  )

  zona.addEventListener('dragover', (evento: DragEvent) => {
    // Fermato qui, altrimenti la guardia di `main.ts` (che impedisce a un file
    // lasciato fuori bersaglio di portare via il registro) lo prende.
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
      notifica(t.fileIlleggibile, 'avviso')
      return
    }
    void porta(percorso)
  })

  return zona
}

// --------------------------------------------------------------- la vista

/**
 * Se la sezione dei modelli è in vista: le impostazioni del programma su
 * «Modelli linguistici».
 */
export function modelliInVista (): boolean {
  return stato.vista === 'impostazioni' &&
    stato.ambitoImpostazioni === 'programma' &&
    stato.schedaProgramma === 'modelli'
}

/**
 * I modelli dentro la sezione delle impostazioni: quali ci sono, chi risponde
 * con quale, i consigliati e la ricerca. Le voci della sezione seguono sotto.
 */
export function contenutoModelliLinguistici (): Figlio[] {
  ascoltaScarico()
  if (!chiesto) {
    chiesto = true
    void leggi()
    void leggiCatalogo()
  }

  const t = testi()
  if (!dati) {
    return [statoVuoto(erroreElenco
      ? {
          simbolo: 'bot',
          titolo: t.elencoNonLettoTitolo,
          testo: erroreElenco,
          azione: pulsante({ testo: parole().riprova, simbolo: 'ricarica', al: () => leggi() }),
        }
      : {
          simbolo: 'bot',
          titolo: t.staGuardando,
        })]
  }

  // I modelli usabili e gli scarichi interrotti si contano a parte.
  const locali = dati.modelli.filter((modello) => !modello.incompiuto)
  const aMeta = dati.modelli.filter((modello) => modello.incompiuto)

  return [h(
    'div',
    { class: 'modelli-llm' },
    rigaScarico(),
    scheda({
      titolo: t.chiRisponde,
      aiuto: t.chiRispondeAiuto,
      contenuto: h(
        'div',
        { class: 'modelli-llm__usi' },
        rigaUso('assistente', t.assistente, t.assistenteAiuto, dati.assistente, locali),
        rigaUso('ocr', t.lettura, t.letturaAiuto, dati.ocr, locali),
      ),
    }),
    scheda({
      titolo: t.sulComputer,
      sottotitolo: t.quantiFile(locali.length),
      azioni: pulsante({
        testo: t.ricarica,
        simbolo: 'ricarica',
        variante: 'sottile',
        al: () => leggi(),
      }),
      contenuto: h(
        'div',
        null,
        h('p', { class: 'modelli-llm__cartella' }, t.stannoIn(dati.cartella)),
        aMeta.length > 0
          ? h('ul', { class: 'modelli-llm__elenco' }, ...aMeta.map((m) => rigaModello(m)))
          : null,
        locali.length === 0
          ? statoVuoto({
              simbolo: 'bot',
              titolo: t.nessunModello,
              testo: t.nessunModelloTesto,
            })
          : h('ul', { class: 'modelli-llm__elenco' }, ...locali.map((m) => rigaModello(m))),
        zonaTrascinamento(),
      ),
    }),
    scheda({
      titolo: t.consigliati,
      aiuto: t.consigliatiAiuto,
      contenuto: catalogo
        ? h(
            'ul',
            { class: 'modelli-llm__elenco' },
            ...catalogo.consigliati.map((voce) => rigaConsigliata(voce)),
          )
        : h('p', { class: 'modelli-llm__nota' }, t.leggendoCatalogo),
    }),
    riquadroDeposito(),
    riquadroRicerca(),
  )]
}
