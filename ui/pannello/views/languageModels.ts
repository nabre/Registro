// Assistente e modelli, nelle impostazioni del Programma. In testa tre righe
// d'uso — Assistente, Scansioni, Dettatura —, ognuna con il suo interruttore,
// il modello che la fa lavorare e com'è adesso: è l'unico posto in cui un
// modello si sceglie. Sotto, «Sul computer»: la cartella e i file `.gguf` che
// ci sono; poi «Scarica modelli», chiuso, con i consigliati e la ricerca su
// Hugging Face; in fondo le avanzate. Chi conversa deve chiamare gli attrezzi,
// chi legge deve saper guardare: per questo le righe sono separate. Lo scarico
// mostra avanzamento e arresto; l'avanzamento lo spinge l'host (`MessaggioScarico`).

import type { UsoModello, VoceProgramma } from '#contract/protocol.js'
import {
  avviso,
  barra,
  pastiglia,
  pulsante,
  quantoMisura,
  scheda,
  selettore,
  statoVuoto,
} from '#ui/pannello/components/base.js'
import { suggerimento } from '#ui/pannello/components/hint.js'
import { conferma } from '#ui/pannello/components/modal.js'
import { notifica } from '#ui/pannello/components/notifications.js'
import { gestisci, h, type Figlio } from '#ui/pannello/dom.js'
import { isola, isolaPresente, ridisegnaIsola } from '#ui/pannello/islands.js'
import { azione, ascolta, chiedi } from '#ui/pannello/bridge.js'
import { iscriviti, ridisegna, stato } from '#ui/pannello/state.js'
import { parole } from '#core/dominio/words.testi.js'
import { disegnaAvanzate, vociProgramma } from './settings/program.js'
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
 * Se si sta scegliendo «Questo .exe» per il programma di lettura, prima che il
 * dialogo abbia dato un percorso: finché non c'è, vale la scelta di prima.
 */
let versoEseguibile = false

/** Se «Scarica modelli» è aperto: il ridisegno lo ricreerebbe chiuso. */
let scarichiAperti: boolean | null = null

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

/**
 * Le isole della sezione (ADR-48): quel che la pagina dei modelli mostra, e
 * dentro la barra dello scarico, che l'avanzamento rifà quattro volte al
 * secondo senza toccare il resto delle impostazioni.
 */
const ISOLA_MODELLI = 'modelli-llm'
const ISOLA_SCARICHI = 'scarichi'

/**
 * Rifà i modelli dopo una lettura o un gesto: solo la loro isola, se è in
 * pagina. Senza isola si ridisegna tutto come prima (la lettura può arrivare
 * mentre si cambia pagina).
 */
function rifai (): void {
  if (isolaPresente(ISOLA_MODELLI)) ridisegnaIsola(ISOLA_MODELLI)
  else ridisegna()
}

/** Due file della fila uguali, nello stesso ordine. */
function stessaFila (una: readonly string[], altra: readonly string[]): boolean {
  return una.length === altra.length && una.every((file, indice) => file === altra[indice])
}

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
  rifai()
}

/** Il catalogo, e la ricerca se c'è qualcosa da cercare: una chiamata, righe della stessa forma. */
async function leggiCatalogo (): Promise<void> {
  giroCatalogo += 1
  const questo = giroCatalogo
  const esito = await chiedi<typeof catalogo>('llm.catalogo', cercato ? { cerca: cercato } : {})
  if (questo !== giroCatalogo) return
  if (esito.ok && esito.dati) catalogo = esito.dati
  rifai()
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
  rifai()
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
  rifai()
  const risposta = await azione({ tipo: 'llm.scarica', deposito, file, ...(per ? { per } : {}) })
  if (!risposta.ok) {
    if (primo && scarico?.file === file) scarico = null
    if (nuovo) inCoda = inCoda.filter((nome) => nome !== file)
    rifai()
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
    const primaFila = inCoda
    inCoda = avanzamento.coda
    if (!avanzamento.finito) {
      const prima = scarico
      scarico = { file: avanzamento.file, byte: avanzamento.byte, totale: avanzamento.totale }
      // Il numero si segna sempre, il ridisegno solo se la pagina dei modelli è in
      // vista: l'ascolto dura per tutta la vita del pannello. Tornando qui, il
      // ridisegno legge `scarico` già aggiornato.
      if (!modelliInVista()) return
      // Solo i byte: si rifà la barra, quattro volte al secondo. Un file nuovo o
      // la fila cambiata cambiano anche i pulsanti delle righe («In fila»).
      const soloNumeri = prima?.file === scarico.file && stessaFila(primaFila, inCoda)
      if (soloNumeri && isolaPresente(ISOLA_SCARICHI)) ridisegnaIsola(ISOLA_SCARICHI)
      else rifai()
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

/** Una voce del programma per chiave, come l'ha mandata l'host. */
function voceDi (chiave: string): VoceProgramma | undefined {
  return stato.programma.find((voce) => voce.chiave === chiave)
}

/** La riga di un'impostazione dentro una riga d'uso: la stessa dell'elenco, con la sua ancora. */
function voceQui (chiave: string): Figlio {
  const voce = voceDi(chiave)
  return voce ? vociProgramma(voce) : null
}

/** Una tendina di file `.gguf`, con «nessuno» in testa. */
function tendinaModelli (
  etichetta: string,
  scelto: string,
  nomi: readonly string[],
  vuoto: string,
  al: (nome: string) => void,
  fuoco: string,
): HTMLElement {
  // Un file scelto che non c'è più resta in elenco: sparirebbe senza dirlo.
  const tutti = scelto && !nomi.includes(scelto) ? [...nomi, scelto] : nomi
  const tendina = h(
    'select',
    {
      class: 'campo__controllo campo__controllo--selezione',
      dataset: { fuoco },
      attr: { 'aria-label': etichetta },
      onchange: (evento: Event) => al((evento.target as HTMLSelectElement).value),
    },
    h('option', { value: '' }, vuoto),
    ...tutti.map((nome) =>
      h('option', { value: nome, attr: { selected: nome === scelto ? '' : null } }, nome)),
  )
  tendina.value = scelto
  return h('label', { class: 'modelli-llm__campo' }, h('span', null, etichetta), tendina)
}

/** Com'è un uso adesso: pronto, o che cosa manca e dove si rimedia. */
function statoDellUso (uso: StatoUso): Figlio[] {
  const t = testi()
  return [
    h(
      'div',
      { class: 'modelli-llm__stato' },
      uso.pronto
        ? pastiglia(t.statoPronto, 'positivo', 'spunta')
        : pastiglia(uso.attivo ? t.mancaQualcosa : t.spento, 'neutro'),
    ),
    uso.pronto || !uso.motivo ? null : h('p', { class: 'modelli-llm__motivo' }, uso.motivo),
  ]
}

/** La testata di una riga d'uso: il nome, e dietro la «i» a che cosa serve. */
function testataUso (titolo: string, spiegazione: string): HTMLElement {
  return h('h4', { class: 'modelli-llm__uso-titolo' }, titolo, suggerimento(spiegazione, { etichetta: titolo }))
}

/**
 * La riga dell'assistente: l'interruttore, il modello che conversa, e com'è.
 * `data-voce` porta qui chi cerca `assistente.modello`.
 */
function rigaAssistente (uso: StatoUso, modelli: ModelloLocale[]): HTMLElement {
  const t = testi()
  return h(
    'section',
    { class: 'modelli-llm__uso', dataset: { voce: 'assistente' } },
    testataUso(t.assistente, t.assistenteAiuto),
    voceQui('registroDocenti.assistente.attivo'),
    h(
      'div',
      { class: 'modelli-llm__campi', dataset: { voce: 'registroDocenti.assistente.modello' } },
      tendinaModelli(
        t.modelloPer(t.assistente),
        uso.modello,
        modelli.filter((m) => !m.proiettore).map((m) => m.nome),
        t.nessuno,
        (nome) => void scegli('assistente', nome),
        'modello-assistente', // testo-fisso: chiave di fuoco, non si legge
      ),
    ),
    ...statoDellUso(uso),
  )
}

/**
 * Il programma che fa leggere le scansioni: lo scarica il registro, questo
 * `.exe`, o niente. «Questo .exe» mostra il percorso e «Sfoglia…»; finché il
 * dialogo non dà un file vale la scelta di prima.
 */
function sceltaLettore (): Figlio {
  const voce = voceDi('registroDocenti.ocr.lettore')
  if (!voce) return null
  const t = testi()
  const scritto = String(voce.valore)
  type Modo = 'registro' | 'eseguibile' | 'nessuno'
  const salvato: Modo = scritto === '' ? 'registro' : scritto === 'nessuno' ? 'nessuno' : 'eseguibile'
  const modo: Modo = versoEseguibile ? 'eseguibile' : salvato
  const sfoglia = (): Promise<unknown> =>
    azione({ tipo: 'programma.sfoglia', chiave: voce.chiave }).then(() => {
      // Scelto o annullato, il campo torna a dire quel che è scritto.
      versoEseguibile = false
      rifai()
    })
  return h(
    'div',
    { class: 'modelli-llm__lettore', dataset: { voce: voce.chiave } },
    h(
      'span',
      { class: 'voce-opzione__nome' },
      voce.etichetta,
      suggerimento(voce.descrizione, { etichetta: voce.etichetta }),
    ),
    selettore<Modo>(
      modo,
      [
        { valore: 'registro', testo: t.lettoreRegistro },
        { valore: 'eseguibile', testo: t.lettoreEseguibile },
        { valore: 'nessuno', testo: t.lettoreNessuno },
      ],
      (scelto) => {
        versoEseguibile = scelto === 'eseguibile' && salvato !== 'eseguibile'
        if (scelto === 'eseguibile') {
          rifai()
          return
        }
        void azione({
          tipo: 'programma.salva',
          chiave: voce.chiave,
          valore: scelto === 'nessuno' ? 'nessuno' : '',
        })
      },
      voce.etichetta,
    ),
    modo === 'eseguibile'
      ? h(
          'div',
          { class: 'modelli-llm__percorso' },
          h(
            'code',
            { class: ['modelli-llm__nome', salvato !== 'eseguibile' && 'testo-quieto'] },
            salvato === 'eseguibile' ? scritto : t.lettoreNonScelto,
          ),
          pulsante({ testo: parole().sfoglia, simbolo: 'cartella', variante: 'sottile', al: sfoglia }),
        )
      : null,
  )
}

/**
 * La riga delle scansioni: l'interruttore, il modello che guarda con il suo
 * proiettore (`mmproj`), il programma che li fa girare, e com'è.
 */
function rigaScansioni (uso: StatoUso, modelli: ModelloLocale[]): HTMLElement {
  const t = testi()
  return h(
    'section',
    { class: 'modelli-llm__uso', dataset: { voce: 'scansioni' } },
    testataUso(t.lettura, t.letturaAiuto),
    voceQui('registroDocenti.ocr.attivo'),
    h(
      'div',
      { class: 'modelli-llm__campi' },
      h(
        'div',
        { dataset: { voce: 'registroDocenti.ocr.modello' } },
        tendinaModelli(
          t.modelloPer(t.lettura),
          uso.modello,
          modelli.filter((m) => !m.proiettore).map((m) => m.nome),
          t.nessuno,
          (nome) => void scegli('ocr', nome),
          'modello-ocr', // testo-fisso: chiave di fuoco, non si legge
        ),
      ),
      h(
        'div',
        { dataset: { voce: 'registroDocenti.ocr.proiettore' } },
        tendinaModelli(
          t.proiettorePer(t.lettura),
          uso.proiettore ?? '',
          modelli.filter((m) => m.proiettore).map((m) => m.nome),
          t.nessunProiettore,
          (nome) => void scegli('ocr', uso.modello, nome),
          'proiettore-ocr', // testo-fisso: chiave di fuoco, non si legge
        ),
      ),
    ),
    sceltaLettore(),
    ...statoDellUso(uso),
  )
}

/**
 * La riga della dettatura: l'interruttore e il modello della voce, che
 * voicebox tiene per conto suo (niente `.gguf` qui). Com'è lo sa solo voicebox
 * quando si detta: qui si dice acceso o spento, e che cosa serve.
 */
function rigaDettatura (): HTMLElement {
  const t = testi()
  const acceso = voceDi('registroDocenti.dettatura.attivo')
  const vale = acceso?.valore === true && !acceso.sospesa
  return h(
    'section',
    { class: 'modelli-llm__uso', dataset: { voce: 'dettatura' } },
    testataUso(t.dettatura, t.dettaturaAiuto),
    voceQui('registroDocenti.dettatura.attivo'),
    voceQui('registroDocenti.dettatura.taglia'),
    h(
      'div',
      { class: 'modelli-llm__stato' },
      pastiglia(vale ? t.statoAcceso : t.spento, vale ? 'informativo' : 'neutro'),
    ),
    vale ? h('p', { class: 'modelli-llm__motivo' }, t.dettaturaNota) : null,
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
    // Si sceglie nelle righe d'uso, in testa: qui solo quanto pesa e il cestino.
    h(
      'div',
      { class: 'modelli-llm__riga-azioni' },
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
    azioni: pulsante({ testo: parole().chiudi, al: () => { aperto = null; rifai() } }),
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
    // `data-fuoco` perché una lettura finita rifà l'isola dei modelli, e senza
    // `ricordaFuoco` la casella si perderebbe.
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
          al: (evento) => {
            // La casella viva, accanto al pulsante: `casella` è quella di questo
            // disegno, e dopo un ridisegno può essere la copia scartata.
            const viva = (evento.currentTarget as HTMLElement).closest('.modelli-llm__cerca')
              ?.querySelector<HTMLInputElement>('input')
            cercato = (viva ?? casella).value
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

  // La zona viva dall'evento: un ridisegno può aver tenuto quella di prima.
  const viva = (evento: Event) => evento.currentTarget as HTMLElement
  gestisci(zona, 'dragover', (evento) => {
    // Fermato qui, altrimenti la guardia di `main.ts` (che impedisce a un file
    // lasciato fuori bersaglio di portare via il registro) lo prende.
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    viva(evento).classList.add('modelli-llm__zona--attiva')
  })
  gestisci(zona, 'dragleave', (evento) => viva(evento).classList.remove('modelli-llm__zona--attiva'))
  gestisci(zona, 'drop', (evento) => {
    evento.preventDefault()
    viva(evento).classList.remove('modelli-llm__zona--attiva')
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
 * La prima volta che si entra nella sezione si chiedono l'elenco e il catalogo
 * e ci si mette in ascolto dello scarico. Lo fa un iscritto allo stato e non il
 * disegno: il disegno si rifà a ogni gesto e non deve far partire letture.
 */
iscriviti(() => {
  if (chiesto || !modelliInVista()) return
  chiesto = true
  ascoltaScarico()
  void leggi()
  void leggiCatalogo()
})

/**
 * Se la sezione dei modelli è in pagina: le impostazioni sull'area Programma,
 * dove scorre con le altre.
 */
export function modelliInVista (): boolean {
  return stato.vista === 'impostazioni' && stato.areaImpostazioni === 'programma'
}

/**
 * Assistente e modelli dentro la sezione delle impostazioni: le righe d'uso,
 * i file sul computer, gli scarichi e le avanzate.
 */
export function contenutoModelliLinguistici (): Figlio[] {
  // In un'isola con la classe della colonna che la ospita: stessi spazi, e il
  // vuoto resta figlio di una `.colonna` (il suo riquadro tratteggiato).
  return [isola(ISOLA_MODELLI, modelli, { class: 'colonna' })]
}

/** «Scarica modelli»: i consigliati, il deposito aperto e la ricerca, in un gruppo che si apre. */
function scaricaModelli (locali: number): HTMLElement {
  const t = testi()
  // Aperto da sé la prima volta se non c'è ancora niente, o se si stava guardando un deposito.
  const aprilo = scarichiAperti ?? (locali === 0 || aperto !== null || cercato !== '')
  return h(
    'details',
    {
      class: 'gruppo-opzioni gruppo-opzioni--avanzate modelli-llm__scarichi',
      dataset: { voce: 'scaricaModelli' },
      open: aprilo,
      ontoggle: (evento: Event) => {
        scarichiAperti = (evento.currentTarget as HTMLDetailsElement).open
      },
    },
    h('summary', { class: 'gruppo-opzioni__titolo' }, t.scaricaModelli),
    h('p', { class: 'modelli-llm__nota' }, t.scaricaModelliAiuto),
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
  )
}

function modelli (): Figlio {
  const t = testi()
  if (!dati) {
    return statoVuoto(erroreElenco
      ? {
          simbolo: 'bot',
          titolo: t.elencoNonLettoTitolo,
          testo: erroreElenco,
          azione: pulsante({ testo: parole().riprova, simbolo: 'ricarica', al: () => leggi() }),
        }
      : {
          simbolo: 'bot',
          titolo: t.staGuardando,
        })
  }

  // I modelli usabili e gli scarichi interrotti si contano a parte.
  const locali = dati.modelli.filter((modello) => !modello.incompiuto)
  const aMeta = dati.modelli.filter((modello) => modello.incompiuto)
  const cartella = voceDi('registroDocenti.modelli.cartella')
  const avanzate = stato.programma.filter((voce) => voce.chiave === 'registroDocenti.dettatura.porta')

  return h(
    'div',
    { class: 'modelli-llm' },
    // Lo stato e i gesti: lo scarico in corso, poi i tre usi.
    isola(ISOLA_SCARICHI, rigaScarico),
    scheda({
      titolo: t.chiRisponde,
      aiuto: t.chiRispondeAiuto,
      contenuto: h(
        'div',
        { class: 'modelli-llm__usi' },
        rigaAssistente(dati.assistente, locali),
        rigaScansioni(dati.ocr, locali),
        rigaDettatura(),
      ),
    }),
    // La cartella una volta sola: il campo, e dove stanno davvero quando la decide il registro.
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
        cartella ? vociProgramma(cartella) : null,
        cartella && String(cartella.valore) === ''
          ? h('p', { class: 'modelli-llm__cartella' }, t.stannoIn(dati.cartella))
          : null,
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
    scaricaModelli(locali.length),
    disegnaAvanzate({ id: 'modelli' }, avanzate),
  )
}
