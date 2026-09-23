// L'archivio documentale: i fogli che la classe porta, e quello che si sta
// guardando.
//
// La matrice risponde a «chi non ha ancora portato la pagella». È la domanda
// giusta quando si raccoglie, ma non è l'unica che ci si fa su questa pagina:
// dopo «chi» viene sempre «che cosa», e fin qui l'unica risposta era aprire il
// file nel lettore del sistema — una finestra per foglio, da ritrovare nella
// barra delle applicazioni, e il registro sepolto sotto. Controllare
// venticinque scansioni così vuol dire aprirne venti e dare per buone le altre
// cinque.
//
// Quindi il foglio si guarda qui dentro, nella cornice, come nella pagina
// Documenti: a sinistra la roba da governare — la matrice e i PDF da dividere —
// e a destra il documento aperto, con le due frecce per passare al prossimo.
// Lo stesso telaio, lo stesso gesto, perché è lo stesso lavoro: controllare una
// cartella prima di consegnarla.
//
// **Un ordine solo, e ci stanno dentro anche i PDF appena caricati.** Un file
// arrivato per posta e non ancora diviso è la stessa cosa di una scansione già
// archiviata, dal punto di vista di chi guarda: è un foglio da leggere per
// decidere che cosa farne. Le frecce quindi scorrono una fila sola — prima quel
// che è archiviato nell'ordine della matrice, poi quel che resta da dividere —
// e la domanda «l'ho già guardato?» ha una risposta.
//
// Di elenchi in pagina non ce n'è nessuno, ed è voluto: qui c'era un riquadro
// «Fogli raccolti» che li metteva in colonna, ed era la matrice riscritta in
// un'altra forma. Le caselle piene *sono* quell'elenco — una per foglio, con
// dentro il nome di chi l'ha portato — e la stessa cosa scritta due volte in
// una pagina fa chiedere in che cosa differiscano.
//
// La cornice compare solo quando c'è un foglio aperto. La differenza con la
// pagina Documenti è la matrice: lì la barra stretta contiene elenchi di righe,
// qui c'è una griglia larga quanto la classe, e tenerla accanto a una cornice
// vuota vorrebbe dire stringerla per niente nove volte su dieci.

import { nomeCompleto } from '../../domain/calculations.js'
import { raccoltiDiClasse } from '../../domain/assignments.js'
import { formattaData, giornoDi } from '../../domain/dates.js'
import { CHI_INSEGNA } from '../../domain/models.js'
import type { Allievo, Consegna, Iso, Smistamento } from '../../domain/models.js'
import { pastiglia, pulsante, quantoMisura, statoVuoto } from '../components/base.js'
import { corniceDocumento } from '../components/frame.js'
import { dimentica } from '../components/thumbnails.js'
import { conferma } from '../components/modal.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'
import { aggiorna, stato, uriDato } from '../state.js'

import { sfoglioSmistamento } from './pageBrowser.js'

/**
 * Che cosa ci fa un foglio nell'archivio.
 *
 * - `persona`      la scansione di uno — il caso di sempre;
 * - `tutti`        un foglio solo, uguale per tutti: la circolare;
 * - `firme`        il foglio con cui si dimostra di aver consegnato;
 * - `docente`      quel che si raccoglie per sé, non dagli allievi;
 * - `smistamento`  un PDF caricato e non ancora diviso.
 */
type GenereFoglio = 'persona' | 'tutti' | 'firme' | 'docente' | 'smistamento'

/** Un foglio dell'archivio come lo si vede in pagina: di chi è, e se c'è ancora. */
export interface RigaArchivio {
  /** Il percorso dentro l'anno: è quel che la cornice inquadra. */
  file: string
  /** Come si chiamava il file quando è arrivato. */
  nome: string
  /** Di chi è, detto come lo si legge: un nome, o che cosa è per la colonna. */
  etichetta: string
  /** Di quale richiesta è: la pastiglia in testa alla cornice. Null se non si sa. */
  richiesta: string | null
  genere: GenereFoglio
  consegnaId: string | null
  allievoId: string | null
  smistamentoId: string | null
  aggiuntoIl: Iso | null
  /** Quanto misura, in byte; zero quando il file non è nell'inventario. */
  misura: number
  /** Quante volte è stato riscritto: fa ricaricare la cornice. */
  revisione: number
  /** Se il file è ancora dentro il documento dell'anno. */
  presente: boolean
}

/** Quel che la cornice sa inquadrare: il resto si apre con il programma del sistema. */
const INQUADRABILI = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']

/** Vero se quel file la cornice lo sa mostrare. */
export function siGuardaQui (percorso: string): boolean {
  const minuscolo = percorso.toLowerCase()
  return INQUADRABILI.some((estensione) => minuscolo.endsWith(estensione))
}

/** Come si chiama in riga un foglio che non è di nessuno in particolare. */
function etichettaDiColonna (genere: GenereFoglio): string {
  if (genere === 'firme') return 'Foglio firme'
  if (genere === 'tutti') return 'Lo stesso per tutti'
  return 'Raccolto da te'
}

/** Il giorno di un foglio, come si scrive sotto il suo nome. */
function giorno (quando: Iso | null): string | null {
  return quando ? formattaData(giornoDi(quando) ?? '') : null
}

/**
 * Quel che l'inventario sa di un file: misura, revisione, se c'è ancora.
 *
 * Un file che non sta sotto `archivio/` o `quarantena/` non è nell'inventario,
 * e non per questo è sparito — una circolare allegata da un'altra cartella
 * dell'anno sta altrove. Fuori da quelle due cartelle si dà fiducia al
 * registro, e a smentirlo semmai sarà la cornice.
 */
export function inventario (percorso: string): { misura: number, revisione: number, presente: boolean } {
  const suo = stato.archiviati.find((a) => a.percorso === percorso)
  if (suo) return { misura: suo.misura, revisione: suo.revisione, presente: true }
  const dentro = percorso.startsWith('archivio/') || percorso.startsWith('quarantena/')
  return { misura: 0, revisione: 0, presente: !dentro }
}

/**
 * I fogli dell'archivio di una classe, nell'ordine in cui si scorrono.
 *
 * Prima quel che è archiviato, nell'ordine della matrice — le richieste come le
 * elenca, e dentro ognuna le persone come stanno in elenco — e in fondo i PDF
 * caricati che aspettano di essere divisi. L'ordine è quello perché è quello in
 * cui si lavora: si controlla quel che è a posto, e si finisce con quel che
 * resta da decidere.
 *
 * Un foglio che non c'è più resta in elenco, spento. Sparire sarebbe peggio: il
 * registro dice che quella persona ha consegnato, e chi guarda deve poter
 * vedere che del foglio non è rimasto niente — è il momento in cui si richiede
 * la scansione, non quello in cui si finge che tutto sia a posto.
 */
export function righeArchivio (
  consegne: Consegna[],
  allievi: Allievo[],
  smistamenti: Smistamento[] = [],
): RigaArchivio[] {
  const perId = new Map(allievi.map((a) => [a.id, a]))
  const consegnePerId = new Map(consegne.map((c) => [c.id, c]))

  const raccolti = raccoltiDiClasse(consegne, allievi).map((foglio): RigaArchivio => {
    const chi = foglio.allievoId ? perId.get(foglio.allievoId) : undefined
    const consegna = consegnePerId.get(foglio.consegnaId)
    return {
      file: foglio.file,
      nome: foglio.nome,
      etichetta: chi ? nomeCompleto(chi) : etichettaDiColonna(foglio.genere),
      richiesta: consegna?.testo ?? null,
      genere: foglio.genere,
      consegnaId: foglio.consegnaId,
      allievoId: foglio.allievoId,
      smistamentoId: null,
      aggiuntoIl: foglio.aggiuntoIl,
      ...inventario(foglio.file),
    }
  })

  const daDividere = smistamenti.map((smistamento): RigaArchivio => {
    const consegna = smistamento.consegnaId ? consegnePerId.get(smistamento.consegnaId) : undefined
    const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
    return {
      file: smistamento.file,
      nome: smistamento.nome,
      etichetta: smistamento.nome,
      richiesta: `${consegna?.testo ?? 'senza documento'} · ${restano || smistamento.pagine} pagine`,
      genere: 'smistamento',
      consegnaId: smistamento.consegnaId,
      allievoId: null,
      smistamentoId: smistamento.id,
      aggiuntoIl: smistamento.arrivatoIl,
      ...inventario(smistamento.file),
    }
  })

  return [...raccolti, ...daDividere]
}

/**
 * Apre un foglio nella cornice, o la chiude passando `null`.
 *
 * Con il foglio se ne vanno le pagine che se n'erano disegnate: sono decine di
 * megabyte di fotografie, e il PDF che si apre adesso è un altro. Non è solo
 * memoria — un percorso riusato da un file nuovo mostrerebbe le pagine del
 * vecchio.
 */
export function guardaNellArchivio (percorso: string | null): void {
  if (percorso !== stato.anteprimaArchivio) dimentica()
  aggiorna({ anteprimaArchivio: percorso })
}

/** Vero se quel foglio è quello aperto adesso: la riga lo dice accendendosi. */
export function aperto (percorso: string | undefined): boolean {
  return Boolean(percorso) && stato.anteprimaArchivio === percorso
}

/**
 * Dove sta, nell'elenco, il foglio aperto; `-1` se non se ne guarda nessuno.
 *
 * Il percorso da solo non basta: le frecce hanno bisogno di sapere qual è il
 * prossimo, e il «7 di 23» in testa alla cornice è quel che dice a chi controlla
 * una cartella quanto manca alla fine.
 */
export function indiceAperto (righe: RigaArchivio[]): number {
  const percorso = stato.anteprimaArchivio
  return percorso ? righe.findIndex((riga) => riga.file === percorso) : -1
}

// ----------------------------------------------------------------- i gesti

/** L'azione con cui quel foglio si apre nel programma del sistema. */
function apriFuori (riga: RigaArchivio) {
  if (riga.genere === 'smistamento') {
    return { tipo: 'smistamento.apri', smistamentoId: riga.smistamentoId ?? '' } as const
  }
  if (riga.genere === 'firme') {
    return { tipo: 'consegna.firme.apri', consegnaId: riga.consegnaId ?? '' } as const
  }
  if (riga.genere === 'docente') {
    return { tipo: 'consegna.file.apri', consegnaId: riga.consegnaId ?? '', chi: CHI_INSEGNA } as const
  }
  return {
    tipo: 'consegna.documento.apri',
    consegnaId: riga.consegnaId ?? '',
    allievoId: riga.allievoId,
  } as const
}

/** L'azione con cui quel foglio se ne va. */
function buttaVia (riga: RigaArchivio) {
  if (riga.genere === 'smistamento') {
    return { tipo: 'smistamento.elimina', smistamentoId: riga.smistamentoId ?? '' } as const
  }
  if (riga.genere === 'firme') {
    return { tipo: 'consegna.firme.togli', consegnaId: riga.consegnaId ?? '' } as const
  }
  if (riga.genere === 'docente') {
    return { tipo: 'consegna.file.togli', consegnaId: riga.consegnaId ?? '', chi: CHI_INSEGNA } as const
  }
  return {
    tipo: 'consegna.documento.togli',
    consegnaId: riga.consegnaId ?? '',
    allievoId: riga.allievoId,
  } as const
}

/**
 * Butta via il foglio, dopo averlo chiesto.
 *
 * Si chiede sempre, ed è l'unico posto della pagina in cui si chiede: nella
 * matrice il cestino sta accanto alla casella di chi si sta guardando, qui il
 * foglio riempie mezzo schermo e il pulsante è lontano dalla riga da cui viene.
 * Un documento raccolto è spesso l'unica copia che ne esiste.
 */
async function buttaViaChiedendo (riga: RigaArchivio): Promise<void> {
  const sicuro = await conferma({
    titolo: `Buttare via «${riga.etichetta}»?`,
    testo:
      riga.genere === 'smistamento'
        ? `«${riga.nome}» va nel cestino con tutto quel che resta da dividere. Le pagine già ` +
          'assegnate restano dove sono: quelle sono archiviate.'
        : `${riga.nome} esce dall’archivio e la spunta di questa richiesta torna indietro. ` +
          'Il file va nel cestino del documento: è spesso l’unica copia che esiste.',
    testoConferma: 'Butta via',
    pericolo: true,
  })
  if (!sicuro) return
  // Prima si chiude la cornice: il foglio che si sta buttando non deve restare
  // inquadrato mentre sparisce, con le frecce puntate su un elenco più corto.
  if (aperto(riga.file)) guardaNellArchivio(null)
  await azione(buttaVia(riga))
}

// -------------------------------------------------------------- l'anteprima

/** Il passo avanti e il passo indietro nell'elenco dei fogli. */
function scorri (righe: RigaArchivio[], indice: number, passo: -1 | 1): Figlio {
  const prossima = righe[indice + passo]
  const avanti = passo === 1
  return pulsante({
    simbolo: avanti ? 'giu' : 'su',
    variante: 'fantasma',
    titolo: prossima
      ? `${avanti ? 'Il foglio dopo' : 'Il foglio prima'}: ${prossima.etichetta}`
      : `Non c’è nessun foglio ${avanti ? 'dopo' : 'prima'} di questo`,
    disabilitato: !prossima,
    al: () => guardaNellArchivio(prossima?.file ?? null),
  })
}

/**
 * Il foglio aperto: testata con i suoi gesti, e sotto il documento vero.
 *
 * In testa c'è di chi è e di quale richiesta, perché una scansione da sola non
 * lo dice — sono venticinque fogli che si somigliano tutti — e i gesti che lo
 * riguardano: scorrere, aprirlo fuori, buttarlo via. Erano gesti che stavano
 * solo nella casella di partenza, e chi guardava un foglio sbagliato doveva
 * ritrovare quella casella in una griglia di venticinque righe.
 */
export function corniceArchivio (
  righe: RigaArchivio[],
  indice: number,
  allievi: Allievo[],
  richieste: Consegna[],
  comandiPdf: (smistamento: Smistamento) => Figlio[],
  codaDiLettura: () => Figlio,
): Figlio {
  const riga = righe[indice]
  const indirizzo = uriDato(riga.file)
  const quando = giorno(riga.aggiuntoIl)
  // Un PDF ancora da dividere si guarda a pagine, non come un foglio solo: è
  // lì che sta il lavoro, e le pagine si prendono con il mouse. Il lettore
  // resta a un clic per quando bisogna proprio leggere.
  const daDividere = riga.genere === 'smistamento'
    ? stato.registro.smistamenti.find((s) => s.id === riga.smistamentoId) ?? null
    : null
  const aPagine = daDividere !== null && stato.sfoglioArchivio === 'pagine'

  return h(
    'div',
    { class: 'archivio__anteprima' },
    h(
      'header',
      { class: 'archivio__testa' },
      h('h3', { class: 'archivio__titolo' }, riga.etichetta),
      riga.genere === 'smistamento' && riga.richiesta
        ? h('span', { class: 'testo-quieto' }, riga.richiesta)
        : null,
      riga.genere === 'smistamento'
        ? pastiglia('da dividere', 'attenzione', 'documento')
        : riga.richiesta
          ? pastiglia(riga.richiesta, 'neutro', 'documento')
          : null,
      quando ? h('span', { class: 'testo-quieto' }, `del ${quando}`) : null,
      riga.misura > 0 ? h('span', { class: 'testo-quieto' }, quantoMisura(riga.misura)) : null,
      // I gesti che riguardano il PDF intero — dove cade il taglio, la lettura
      // delle scansioni, le proposte da confermare — stanno qui e non in un
      // pannello accanto: sono gesti su *questo* file, ed è questo file che si
      // sta guardando.
      ...(daDividere ? comandiPdf(daDividere) : []),
      h('span', { class: 'archivio__conto' }, `${indice + 1} di ${righe.length}`),
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
      scorri(righe, indice, -1),
      scorri(righe, indice, 1),
      pulsante({
        simbolo: 'esporta',
        variante: 'fantasma',
        titolo: 'Apre questo foglio nel programma del sistema',
        al: () => azione(apriFuori(riga)),
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: `Butta via «${riga.etichetta}»`,
        al: () => buttaViaChiedendo(riga),
      }),
      pulsante({
        testo: 'Chiudi',
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: 'Torna alla matrice a schermo intero',
        al: () => guardaNellArchivio(null),
      }),
    ),
    !riga.presente || !indirizzo
      ? statoVuoto({
          simbolo: 'avviso',
          titolo: 'Il file non è più qui',
          testo:
            `Il registro lo dà per arrivato, ma «${riga.nome}» non è più dentro il documento ` +
            'dell’anno. Rifai la scansione, o togli la spunta.',
        })
      : aPagine && daDividere
        ? sfoglioSmistamento({
            smistamento: daDividere,
            allievi,
            richieste,
            indirizzo,
            // La stessa chiave della cornice, e per la stessa ragione: un PDF
            // riscritto sta allo stesso percorso di prima, e le fotografie già
            // disegnate sarebbero quelle di ieri.
            chiave: `sfoglio|${riga.file}|${riga.misura}|${riga.revisione}`,
            coda: codaDiLettura(),
          })
        : siGuardaQui(riga.file)
          ? corniceDocumento({
              indirizzo: `${indirizzo}?v=${riga.revisione}-${riga.misura}`,
              // La revisione dentro la chiave e non solo nell'indirizzo: una
              // scansione rifatta meglio sta allo stesso percorso di prima, e
              // senza un pezzo che cambia il lettore terrebbe in mostra quella
              // di ieri dicendo che è quella di adesso.
              chiave: `archivio|${riga.file}|${riga.misura}|${riga.revisione}`,
              titolo: riga.etichetta,
            })
          : statoVuoto({
              simbolo: 'documento',
              titolo: 'Questo non si guarda da qui',
              testo: `«${riga.nome}» non è un PDF né un’immagine: si apre con il programma del sistema.`,
              azione: pulsante({
                testo: 'Apri fuori',
                simbolo: 'esporta',
                variante: 'primario',
                al: () => azione(apriFuori(riga)),
              }),
            }),
  )
}

// ------------------------------------------------------------------ il telaio

/**
 * Il telaio della pagina: i riquadri, e accanto il foglio aperto.
 *
 * Due colonne solo quando c'è qualcosa da guardare. A cornice chiusa la matrice
 * prende tutta la larghezza — che è quel che le serve, perché ha una colonna
 * per richiesta — e non resta mezza pagina a dire «non stai guardando niente».
 *
 * I riquadri stanno dentro la stessa barra nei due casi, e non è un dettaglio
 * di marcatura: la barra è la scatola che scorre, e senza di lei la pagina a
 * cornice chiusa scorreva tutta intera. Erano due comportamenti diversi per la
 * stessa pagina — si apriva un foglio e la rotella cambiava mestiere, si
 * chiudeva e tornava indietro, portandosi via il punto in cui si era. Una sola
 * scatola che scorre, sempre la stessa, e la matrice resta dov'era.
 */
export function pannelloArchivio (
  riquadri: Figlio,
  anteprima: Figlio,
  /**
   * Che cosa si sta guardando, per ritrovare lo scorrimento dopo un ridisegno.
   *
   * La barra è la scatola che scorre, e la matrice dei documenti è alta quanto
   * la classe e larga quanto le richieste: archiviando una pagina trascinata,
   * il ridisegno la riportava in cima e a sinistra, e la casella che si era
   * appena colpita spariva dalla vista. La chiave dice *quale* matrice — con
   * un'altra classe si riparte dall'alto, com'è giusto.
   *
   * Senza, non si conserva niente: chi non ne ha bisogno non deve inventarsi
   * un nome.
   */
  chiave?: string,
): HTMLElement {
  const barra = h(
    'div',
    { class: 'archivio__barra', ...(chiave ? { dataset: { scorrimento: chiave } } : {}) },
    riquadri,
  )
  if (!anteprima) return h('div', { class: 'archivio' }, barra)
  return h(
    'div',
    { class: 'archivio archivio--con-foglio' },
    barra,
    h('main', { class: 'archivio__corpo' }, anteprima),
  )
}
