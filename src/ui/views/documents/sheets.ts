// I mattoni della pagina Documenti: un foglio, la sua riga, i suoi gesti.
// Trovare il file nella cartella, aprirlo, rifarlo, buttarlo, spuntarlo; e il
// registro delle righe disegnate, da cui vengono il conto in testa alle schede,
// la casella «tutti» e l'ordine dell'anteprima. `cards.ts` dichiara solo nome,
// foglio e azione che lo rifà.

import {
  collocazioneDi,
  percorsoDi,
  radiceDi,
  type ContestoRapporto,
  type GenereRapporto,
} from '../../../domain/locations.js'
import { dataDalNome, formattaData } from '../../../domain/dates.js'
import { pulsante, quantoMisura, scheda } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import type { Azione } from '../../../protocol.js'
import { aggiorna, sceltiPresenti, stato } from '../../state.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './sheets.testi.js'

/**
 * Un documento visto da questa pagina: dove dovrebbe stare e che cosa c'è.
 * Il percorso atteso lo dà il dominio; qui si legge l'inventario dello stato.
 */
export interface Foglio {
  /** Il file trovato nella cartella, o `null` se quel foglio non c'è. */
  trovato: string | null
  misura: number
  /**
   * Quante volte l'host lo ha riscritto da quando l'anno è aperto: il percorso
   * resta lo stesso, e senza un numero che cambia il lettore PDF mostra la copia
   * in memoria.
   */
  revisione: number
}

const MANCA: Foglio = { trovato: null, misura: 0, revisione: 0 }

/** Il foglio che sta a un percorso preciso, o `MANCA` se là non c'è niente. */
export function fileEsportato (percorso: string): Foglio {
  const voce = stato.esportati.find((e) => e.percorso === percorso)
  return voce ? { trovato: voce.percorso, misura: voce.misura, revisione: voce.revisione } : MANCA
}

/**
 * Una riga appena disegnata: il suo foglio e i suoi gesti. Unica fonte per il
 * conto delle schede, la casella «tutti» e l'ordine dell'anteprima.
 */
export interface Riga {
  foglio: Foglio
  /** Come si chiama il foglio quando lo si nomina: «la scheda di Rossi Mario». */
  nome: string
  /** L'azione che lo rifà, o `null` per un foglio che nessuno sa più rifare. */
  rifai: Azione | null
  /** Perché adesso non si può rifare, o `null` se si può. */
  bloccato: string | null
  /**
   * Come si butta via quando togliere il file non basta (una composizione perde
   * anche la sua ricetta); serve anche al cestino in testa alla cornice.
   */
  butta: (() => Promise<void> | void) | null
}

/** Le righe disegnate in questo giro, in ordine; si svuota a ogni ridisegno. */
let disegnate: Riga[] = []

/** Dimentica le righe del giro di prima: la pagina lo fa prima di disegnare. */
export function azzeraRighe (): void {
  disegnate = []
}

/**
 * Quelle che si possono aprire nella cornice (PDF e CSV già fatti): l'elenco
 * che l'anteprima scorre con le frecce.
 */
export function apribili (righe: Riga[] = disegnate): Riga[] {
  return righe.filter((riga) => riga.foglio.trovato !== null && guardabile(riga.foglio.trovato))
}

/** Se un documento si può guardare nella cornice: PDF inquadrato o CSV disegnato come tabella. */
function guardabile (percorso: string): boolean {
  return percorso.endsWith('.pdf') || percorso.endsWith('.csv')
}

/**
 * Quelli che si possono mettere in una composizione: solo i PDF. La casella
 * «tutti» e il Maiusc+clic leggono questo, altrimenti spunterebbero fogli che
 * l'host scarta in silenzio.
 */
function combinabili (righe: Riga[] = disegnate): Riga[] {
  return apribili(righe).filter((riga) => riga.foglio.trovato?.endsWith('.pdf'))
}

/**
 * I documenti spuntati nell'ordine della pagina, non in quello dei clic: chi
 * consegna si aspetta l'ordine che vede. Le spunte di altre schede, di cui qui
 * non si conosce la riga, vanno in coda nell'ordine di scelta; la modale
 * mostra l'elenco intero prima di comporre.
 */
export function sceltiInOrdine (): Array<{ percorso: string, nome: string }> {
  const scelti = sceltiPresenti()
  const inPagina = new Map<string, string>()
  for (const riga of apribili()) {
    const percorso = riga.foglio.trovato as string
    if (!inPagina.has(percorso) && scelti.includes(percorso)) inPagina.set(percorso, riga.nome)
  }
  return [
    ...[...inPagina].map(([percorso, nome]) => ({ percorso, nome })),
    ...scelti
      .filter((percorso) => !inPagina.has(percorso))
      .map((percorso) => ({ percorso, nome: nomeDelFile(percorso) })),
  ]
}

/** Come si chiama un foglio di cui si ha solo il percorso: il nome del file. */
function nomeDelFile (percorso: string): string {
  return (percorso.split('/').pop() ?? percorso).replace(/\.pdf$/i, '')
}


/**
 * Cerca nella cartella il documento di un rapporto. Di norma per nome esatto;
 * fascicolo e parete di ritratti portano la data nel nome, quindi si cercano
 * per prefisso e si prende l'ultimo (`aammgg`, cioè il più recente).
 */
export function foglio (
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto = {},
  estensione = 'pdf',
): Foglio {
  const dove = collocazioneDi(stato.registro, genere, id, {
    semestreId: stato.semestreId,
    ...contesto,
  })
  if (!dove) return MANCA

  if (!dove.datato) return fileEsportato(percorsoDi(dove, estensione))

  const radice = radiceDi(dove)
  const suoi = stato.esportati
    .filter((e) => e.percorso.startsWith(radice) && e.percorso.endsWith(`.${estensione}`))
    .sort((a, b) => a.percorso.localeCompare(b.percorso))
  const ultimo = suoi[suoi.length - 1]
  return ultimo
    ? { trovato: ultimo.percorso, misura: ultimo.misura, revisione: ultimo.revisione }
    : MANCA
}

/**
 * Il giorno che un documento datato porta nel nome (solo fascicolo e parete di
 * ritratti), scritto come le date del registro.
 */
export function quandoFattoIl (percorso: string): string | null {
  const giorno = dataDalNome(percorso)
  return giorno ? formattaData(giorno) : null
}

/**
 * Guarda un documento nella cornice accanto (PDF, o CSV disegnato come
 * tabella); altrimenti con il programma del sistema.
 */
function guarda (percorso: string | null): Promise<unknown> | void {
  if (!percorso) return
  if (guardabile(percorso)) {
    aggiorna({ anteprima: percorso })
    return
  }
  return azione({ tipo: 'esportazione.apri', percorso })
}

/**
 * Rifà un documento e lo mostra nella cornice. Il percorso lo restituisce
 * l'host, che conosce la regola dei nomi; quel che la cornice non sa mostrare
 * lo apre il programma del sistema.
 */
export async function rifaiEGuarda (comando: Azione): Promise<void> {
  const risposta = await azione(comando)
  const fatto = risposta.documento
  if (!risposta.ok || !fatto || !guardabile(fatto)) return
  aggiorna({ anteprima: fatto })
}

/**
 * I gesti su un documento: guardare (il file nella cartella, non quel che il
 * registro comporrebbe adesso), rifare, buttare via. Li usano le file di
 * documenti e le celle della matrice delle lezioni.
 */
interface Gesti {
  foglio: Foglio
  /**
   * L'azione che rifà il documento. Manca per i PDF sotto
   * `esportazioni/composizioni/` senza il loro elenco: si guardano e si buttano.
   */
  rifai?: Azione
  /** Come si chiama il foglio quando lo si nomina: nei titoli e nella domanda. */
  nome: string
  /**
   * Perché adesso non si può rifare, o `null` se si può: un'ora non ancora
   * svolta darebbe un verbale vuoto.
   */
  bloccato?: string | null
  /** Un gesto in più che vale solo per questo documento, in coda agli altri. */
  altro?: Figlio
  /**
   * Come si butta via quando non basta togliere il file: una composizione è PDF
   * più ricetta, e vanno tolti insieme.
   */
  butta?: () => Promise<void> | void
}

/**
 * Butta via un documento, dopo averlo chiesto: dal cestino della riga o da
 * quello dell'anteprima. Spegne la cornice se mostrava proprio quello.
 */
export async function buttaVia (percorso: string | null, nome: string): Promise<void> {
  if (!percorso) return
  const t = testi()
  const sicuro = await conferma({
    titolo: t.buttareTitolo(nome),
    testo: t.buttareTesto,
    testoConferma: parole().buttaVia,
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'esportazione.elimina', percorso })
  if (risposta.ok && stato.anteprima === percorso) aggiorna({ anteprima: null })
}

// ------------------------------------------------------------- la scelta

/**
 * L'ultimo documento spuntato, per la scelta a intervallo con Maiusc. Fuori
 * dallo stato perché non si vede, ma sopravvive ai ridisegni.
 */
let ultimaScelta: string | null = null

function scelto (percorso: string | null): boolean {
  return percorso !== null && stato.documentiScelti.includes(percorso)
}

/** Spunta o toglie la spunta a un documento. */
function alterna (percorso: string): void {
  const scelti = scelto(percorso)
    ? stato.documentiScelti.filter((p) => p !== percorso)
    : [...stato.documentiScelti, percorso]
  ultimaScelta = scelti.includes(percorso) ? percorso : null
  aggiorna({ documentiScelti: scelti })
}

/**
 * Spunta tutto fra l'ultimo scelto e questo, nell'ordine della pagina; senza un
 * ultimo scelto vale come una spunta normale.
 */
function scegliFino (percorso: string): void {
  const elenco = combinabili()
  const da = ultimaScelta ? elenco.findIndex((r) => r.foglio.trovato === ultimaScelta) : -1
  const a = elenco.findIndex((r) => r.foglio.trovato === percorso)
  if (da < 0 || a < 0) {
    alterna(percorso)
    return
  }
  const dentro = elenco
    .slice(Math.min(da, a), Math.max(da, a) + 1)
    .map((r) => r.foglio.trovato as string)
  ultimaScelta = percorso
  aggiorna({ documentiScelti: [...new Set([...stato.documentiScelti, ...dentro])] })
}

/**
 * La casella con cui un documento entra in una composizione (anche Ctrl per
 * una riga, Maiusc per un intervallo). Senza niente da scegliere resta il posto
 * vuoto, per tenere incolonnate le caselle.
 */
function spunta (foglio: Foglio, nome: string): Figlio {
  const percorso = foglio.trovato
  if (!percorso || !percorso.endsWith('.pdf')) {
    return h('span', { class: 'documenti__spunta documenti__spunta--vuota' })
  }
  return h('input', {
    class: 'documenti__spunta',
    type: 'checkbox',
    checked: scelto(percorso),
    attr: { title: testi().metti(nome) },
    onchange: () => alterna(percorso),
  })
}

/** Vero quando il file di questa riga è quello aperto nella cornice. */
function aperto (foglio: Foglio): boolean {
  return foglio.trovato !== null && foglio.trovato === stato.anteprima
}

/**
 * Segna una riga fra quelle mostrate. Lo fanno tutte le righe e celle, anche
 * dei fogli non ancora fatti: servono al «18 di 24» in testa alla scheda.
 */
function annuncia (opzioni: Gesti): void {
  disegnate.push({
    foglio: opzioni.foglio,
    nome: opzioni.nome,
    rifai: opzioni.rifai ?? null,
    bloccato: opzioni.bloccato ?? null,
    butta: opzioni.butta ?? null,
  })
}

/** Lo stato del file e i tre pulsanti, nell'ordine in cui si usano. */
function gestiFoglio (opzioni: Gesti): Figlio[] {
  const { trovato, misura } = opzioni.foglio
  const giorno = trovato ? quandoFattoIl(trovato) : null
  annuncia(opzioni)
  const t = testi()
  const quando = giorno ? t.del(giorno) : quantoMisura(misura)

  return [
    // Lo stato del file è un punto pieno o vuoto, che si conta a colpo d'occhio;
    // misura e giorno stanno nel titolo e in testa alla cornice.
    h('span', {
      class: ['documenti__punto', trovato ? 'documenti__punto--pronto' : 'documenti__punto--manca'],
      attr: {
        role: 'img',
        'aria-label': trovato ? t.nellaCartella(quando) : t.daFare,
        title: trovato ? t.nellaCartellaTitolo(quando) : t.nonAncora,
      },
    }),
    pulsante({
      simbolo: 'lente',
      variante: 'fantasma',
      // Il pulsante del foglio già nella cornice resta acceso: dice a quale riga appartiene.
      classe: aperto(opzioni.foglio)
        ? 'pulsante--minuto pulsante--acceso documenti__apri'
        : 'pulsante--minuto documenti__apri',
      titolo: !trovato
        ? t.nonAncoraNome(opzioni.nome)
        : aperto(opzioni.foglio)
          ? t.aperto(opzioni.nome)
          : guardabile(trovato)
            ? t.guardaQui(opzioni.nome)
            : t.apreFuori(opzioni.nome),
      disabilitato: !trovato,
      al: () => guarda(trovato),
    }),
    pulsante({
      simbolo: trovato ? 'ricarica' : 'esporta',
      variante: 'fantasma',
      classe: 'pulsante--minuto',
      titolo:
        opzioni.bloccato ??
        (trovato
          ? t.rifa(opzioni.nome)
          : t.fa(opzioni.nome)),
      // Un documento che adesso non si può fare tiene il pulsante spento e dice
      // perché nel titolo, invece di nascondere il gesto.
      disabilitato: Boolean(opzioni.bloccato) || !opzioni.rifai,
      al: () => (opzioni.rifai ? rifaiEGuarda(opzioni.rifai) : undefined),
    }),
    pulsante({
      simbolo: 'cestino',
      variante: 'fantasma',
      // Visibile solo con la riga sotto il puntatore o a fuoco: gesto raro, da non
      // offrire in ogni riga.
      classe: 'pulsante--minuto documenti__gesto-raro',
      titolo: t.buttaDallaCartella(opzioni.nome),
      disabilitato: !trovato && !opzioni.butta,
      al: () => opzioni.butta?.() ?? buttaVia(trovato, opzioni.nome),
    }),
    opzioni.altro ?? null,
  ]
}

/**
 * Il clic sulla riga apre il documento, ovunque lo si dia; un clic su un
 * pulsante resta del pulsante. La lente resta il gesto per i lettori di schermo.
 */
function alClicSullaRiga (opzioni: Gesti): (evento: MouseEvent) => void {
  return (evento) => {
    const percorso = opzioni.foglio.trovato
    if (!percorso) return
    const dentro = evento.target as HTMLElement | null
    if (dentro?.closest('button') || dentro?.closest('input')) return
    // Ctrl spunta, Maiusc spunta fino a qui, come negli elenchi di file.
    if (evento.shiftKey && percorso.endsWith('.pdf')) {
      // Toglie la selezione di testo che il Maiusc porta con sé.
      document.getSelection()?.removeAllRanges()
      scegliFino(percorso)
      return
    }
    if ((evento.ctrlKey || evento.metaKey) && percorso.endsWith('.pdf')) {
      alterna(percorso)
      return
    }
    void guarda(percorso)
  }
}

/** Una riga di documento in una fila: il nome, come sta, i gesti. */
export function rigaFoglio (
  opzioni: Gesti & {
    etichetta: Figlio
    /** Pastiglie che riguardano il contenuto, non il file: «annullata», «nessun voto». */
    segni?: Figlio
  },
): HTMLElement {
  const gesti = gestiFoglio(opzioni)
  const suo = opzioni.foglio.trovato
  // Il nome Ã¨ il gesto principale e resta raggiungibile senza puntatore. La
  // lente offre lo stesso gesto con un'etichetta piÃ¹ descrittiva.
  const etichetta = h(
    'button',
    {
      class: 'pulsante pulsante--fantasma documenti__nome documenti__nome-apri',
      type: 'button',
      disabled: !suo,
      onclick: () => guarda(suo),
    },
    opzioni.etichetta,
  )

  return h(
    'li',
    {
      class: [
        'documenti__riga',
        Boolean(suo) && 'documenti__riga--apribile',
        aperto(opzioni.foglio) && 'documenti__riga--aperta',
        scelto(suo) && 'documenti__riga--scelta',
      ],
      // La riga aperta è quella corrente dell'elenco, per tastiera e lettori di schermo.
      attr: { 'aria-current': aperto(opzioni.foglio) ? 'true' : null },
      onclick: alClicSullaRiga(opzioni),
    },
    spunta(opzioni.foglio, opzioni.nome),
    etichetta,
    opzioni.segni ?? null,
    ...gesti,
  )
}

/**
 * La stessa terna dentro una cella di matrice, senza nome: la riga dice già di
 * che ora si parla.
 */
export function cellaFoglio (opzioni: Gesti): HTMLElement {
  const gesti = gestiFoglio(opzioni)

  return h(
    'td',
    {
      class: [
        'documenti__cella',
        Boolean(opzioni.foglio.trovato) && 'documenti__cella--apribile',
        aperto(opzioni.foglio) && 'documenti__cella--aperta',
        scelto(opzioni.foglio.trovato) && 'documenti__cella--scelta',
      ],
      attr: { 'aria-current': aperto(opzioni.foglio) ? 'true' : null },
      onclick: alClicSullaRiga(opzioni),
    },
    h('div', { class: 'documenti__gesti' }, spunta(opzioni.foglio, opzioni.nome), ...gesti),
  )
}

/**
 * Il nome di un documento nella sua riga o cella. Testo e non collegamento:
 * la pagina non porta altrove; il clic lo gestisce la riga, che apre il
 * documento nella cornice.
 */
export function nome (testo: string): HTMLElement {
  return h('span', { class: 'documenti__nome' }, testo)
}

/**
 * Una scheda di documenti con in testa i gesti comuni. Il contenuto arriva come
 * funzione perché le righe si annunciano in `disegnate` mentre si disegnano, e
 * solo dopo la testata sa quali fogli sono suoi.
 */
export function schedaDiFogli (opzioni: {
  titolo: string
  /**
   * Che cosa c'è in questa scheda, in una riga. Funzione perché il conto lo
   * sanno le righe, dopo averle disegnate.
   */
  sottotitolo?: (suoi: Riga[]) => string
  /**
   * La spiegazione dietro la «i» accanto al titolo; il sottotitolo resta per
   * quel che cambia (classe, semestre, conto).
   */
  aiuto?: Figlio
  contenuto: () => Figlio
}): HTMLElement {
  const inizio = disegnate.length
  const contenuto = opzioni.contenuto()
  const suoi = disegnate.slice(inizio)

  return scheda({
    titolo: opzioni.titolo,
    sottotitolo: opzioni.sottotitolo?.(suoi),
    aiuto: opzioni.aiuto,
    azioni: casellaDiScheda(suoi),
    contenuto,
  })
}

/**
 * La casella «tutti» in testa a una scheda, incolonnata con quelle delle righe.
 * Combinare le spunte è invece un comando della pagina: le spunte attraversano
 * le tre schede.
 */
function casellaDiScheda (suoi: Riga[]): Figlio {
  const percorsi = combinabili(suoi).map((riga) => riga.foglio.trovato as string)
  if (percorsi.length === 0) return null
  const quanti = percorsi.filter((percorso) => scelto(percorso)).length
  const tutti = quanti === percorsi.length

  return h('input', {
    class: 'documenti__spunta',
    type: 'checkbox',
    checked: tutti,
    // A metà strada la casella è indeterminata: né «nessuno» né «tutti».
    indeterminate: quanti > 0 && !tutti,
    attr: {
      title: tutti ? testi().togliTutte : testi().spuntaTutti(percorsi.length),
    },
    onchange: () => {
      ultimaScelta = null
      aggiorna({
        documentiScelti: tutti
          ? stato.documentiScelti.filter((p) => !percorsi.includes(p))
          : [...new Set([...stato.documentiScelti, ...percorsi])],
      })
    },
  })
}

/**
 * Quanti fogli di una scheda stanno già nella cartella: il suo sottotitolo.
 * Si conta sulle righe appena disegnate, non su un elenco a parte.
 */
export function conto (cosa: string): (suoi: Riga[]) => string {
  return (suoi) => {
    if (suoi.length === 0) return cosa
    const pronti = suoi.filter((riga) => riga.foglio.trovato).length
    // Senza `cosa` (scheda spiegata dietro la «i») niente separatore davanti al conto.
    const quanti = testi().pronti(pronti, suoi.length)
    return cosa ? `${cosa} · ${quanti}` : quanti
  }
}
