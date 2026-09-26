// L'archivio documentale: i fogli che la classe porta, e quello che si guarda.
// A sinistra la matrice e i PDF da dividere, a destra il foglio aperto nella
// cornice, con le frecce per il prossimo (stesso telaio della pagina Documenti).
// Le frecce scorrono una fila sola: prima l'archiviato nell'ordine della
// matrice, poi i PDF da dividere. La cornice compare solo con un foglio aperto,
// così la matrice ha tutta la larghezza.

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
import { parole } from '../../domain/words.testi.js'
import { testi } from './archive.testi.js'

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
function siGuardaQui (percorso: string): boolean {
  const minuscolo = percorso.toLowerCase()
  return INQUADRABILI.some((estensione) => minuscolo.endsWith(estensione))
}

/** Come si chiama in riga un foglio che non è di nessuno in particolare. */
function etichettaDiColonna (genere: GenereFoglio): string {
  const t = testi()
  if (genere === 'firme') return t.foglioFirme
  if (genere === 'tutti') return t.perTutti
  return t.raccoltoDaTe
}

/** Il giorno di un foglio, come si scrive sotto il suo nome. */
function giorno (quando: Iso | null): string | null {
  return quando ? formattaData(giornoDi(quando) ?? '') : null
}

/**
 * Quel che l'inventario sa di un file: misura, revisione, se c'è ancora. Solo
 * `archivio/` e `quarantena/` sono inventariati; fuori di lì si crede al
 * registro, e semmai lo smentisce la cornice.
 */
export function inventario (
  percorso: string,
): { misura: number, revisione: number, presente: boolean } {
  const suo = stato.archiviati.find((a) => a.percorso === percorso)
  if (suo) return { misura: suo.misura, revisione: suo.revisione, presente: true }
  const dentro = percorso.startsWith('archivio/') || percorso.startsWith('quarantena/')
  return { misura: 0, revisione: 0, presente: !dentro }
}

/**
 * I fogli dell'archivio di una classe nell'ordine in cui si scorrono:
 * l'archiviato nell'ordine della matrice (richieste, poi persone), in fondo i
 * PDF da dividere. Un foglio il cui file non c'è più resta, spento, per
 * vedere che va richiesto.
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
      richiesta:
        `${consegna?.testo ?? testi().senzaDocumento} · ` +
        testi().pagine(restano || smistamento.pagine),
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
 * Apre un foglio nella cornice, o la chiude con `null`. Cambiando foglio si
 * scordano le pagine disegnate: pesano, e un percorso riusato mostrerebbe le
 * pagine del file vecchio.
 */
export function guardaNellArchivio (percorso: string | null): void {
  if (percorso !== stato.anteprimaArchivio) dimentica()
  aggiorna({ anteprimaArchivio: percorso })
}

/** Vero se quel foglio è quello aperto adesso: la riga lo dice accendendosi. */
export function aperto (percorso: string | undefined): boolean {
  return Boolean(percorso) && stato.anteprimaArchivio === percorso
}

/** Dove sta nell'elenco il foglio aperto (per le frecce e il «7 di 23»); `-1` se nessuno. */
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
 * Butta via il foglio dopo averlo chiesto: qui il pulsante è lontano dalla
 * casella, e un documento raccolto è spesso l'unica copia.
 */
async function buttaViaChiedendo (riga: RigaArchivio): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.buttareTitolo(riga.etichetta),
    testo:
      riga.genere === 'smistamento'
        ? t.buttareSmistamento(riga.nome)
        : t.buttareFoglio(riga.nome),
    testoConferma: parole().buttaVia,
    pericolo: true,
  })
  if (!sicuro) return
  // Prima si chiude la cornice, se inquadrava il foglio che si sta buttando.
  if (aperto(riga.file)) guardaNellArchivio(null)
  await azione(buttaVia(riga))
}

// -------------------------------------------------------------- l'anteprima

/** Come si scorre un elenco: che cosa sono le voci, come si dicono, come si aprono. */
interface ComeSiScorre<T> {
  /** Che cosa si scorre, al singolare: «foglio», «documento». */
  cosa: 'foglio' | 'documento'
  /** Come si dice la voce nel titolo della freccia. */
  detto: (voce: T) => string
  /** Apre la voce, o chiude la cornice passando `null`. */
  apri: (voce: T | null) => void
  /** Il titolo delle frecce quando quel che si guarda non sta nell'elenco. */
  fuoriElenco?: string
}

/**
 * Il passo avanti e indietro in un elenco di fogli, uguale in ogni cornice.
 * Con indice negativo (quel che si guarda non è nell'elenco) le frecce ci sono,
 * spente, e dicono perché.
 */
export function scorri<T> (
  elenco: T[],
  indice: number,
  passo: -1 | 1,
  come: ComeSiScorre<T>,
): Figlio {
  const prossima = indice >= 0 ? elenco[indice + passo] : undefined
  const avanti = passo === 1
  const frecce = testi().scorri[come.cosa]
  return pulsante({
    simbolo: avanti ? 'giu' : 'su',
    variante: 'fantasma',
    titolo: prossima
      ? (avanti ? frecce.dopo : frecce.prima)(come.detto(prossima))
      : indice < 0 && come.fuoriElenco
        ? come.fuoriElenco
        : avanti ? frecce.nessunoDopo : frecce.nessunoPrima,
    disabilitato: !prossima,
    al: () => come.apri(prossima ?? null),
  })
}

/** Il foglio che una cornice inquadra: quel che se ne sa per mostrarlo. */
interface FoglioInCornice {
  /** Il percorso dentro l'anno. */
  file: string
  /** Come si chiamava il file quando è arrivato. */
  nome: string
  aggiuntoIl: string | null
  misura: number
  revisione: number
  presente: boolean
}

/** Quel che distingue una cornice dall'altra: il resto è lo stesso telaio. */
interface OpzioniCorniceFoglio {
  foglio: FoglioInCornice
  /** Il titolo in testa: di chi è. */
  titolo: string
  /** Una riga quieta subito dopo il titolo, se serve. */
  nota?: string | null
  /** La pastiglia che dice che foglio è. */
  pastiglia: Figlio
  /** Il PDF da dividere, se il foglio è uno di quelli. */
  daDividere: Smistamento | null
  /** I gesti sul PDF intero, quando è da dividere. */
  comandiPdf: (smistamento: Smistamento) => Figlio[]
  /** Dove sta nell'elenco, da 0, e quanto è lungo l'elenco. */
  indice: number
  totale: number
  /** La freccia per quel passo: di solito `scorri`. */
  freccia: (passo: -1 | 1) => Figlio
  /** Il titolo del cestino. */
  titoloCestino: string
  apriFuori: () => void | Promise<unknown>
  butta: () => void | Promise<unknown>
  chiudi: () => void
  /** Che cosa dire quando il file non c'è più. */
  manca: string
  /** Le richieste da proporre sfogliando le pagine, e a chi possono andare. */
  richieste: Consegna[]
  allievi: Allievo[]
  /** La coda di lettura sotto le pagine. */
  coda: () => Figlio
  /** Il prefisso della chiave del lettore: dice di quale pagina è il telaio. */
  chiave: string
  /** Il titolo del lettore. */
  titoloLettore: string
}

/**
 * Il foglio aperto: testata con i suoi gesti, e sotto il documento. Telaio
 * comune all'archivio documentale e ai rapporti di assenza; cambiano le parole
 * e i gesti sul registro.
 */
export function corniceFoglio (o: OpzioniCorniceFoglio): HTMLElement {
  const foglio = o.foglio
  const indirizzo = uriDato(foglio.file)
  const quando = giorno(foglio.aggiuntoIl)
  const daDividere = o.daDividere
  // Un PDF da dividere si guarda a pagine, da prendere con il mouse; il lettore
  // resta a un clic.
  const aPagine = daDividere !== null && stato.sfoglioArchivio === 'pagine'
  const t = testi()

  return h(
    'div',
    { class: 'archivio__anteprima' },
    h(
      'header',
      { class: 'archivio__testa' },
      h('h3', { class: 'archivio__titolo' }, o.titolo),
      o.nota ? h('span', { class: 'testo-quieto' }, o.nota) : null,
      o.pastiglia,
      quando ? h('span', { class: 'testo-quieto' }, t.del(quando)) : null,
      foglio.misura > 0 ? h('span', { class: 'testo-quieto' }, quantoMisura(foglio.misura)) : null,
      // I gesti sul PDF intero (taglio, lettura delle scansioni, proposte) stanno
      // qui: riguardano il file che si sta guardando.
      ...(daDividere ? o.comandiPdf(daDividere) : []),
      h('span', { class: 'archivio__conto' }, t.conto(o.indice + 1, o.totale)),
      daDividere
        ? pulsante({
            testo: aPagine ? t.leggi : t.pagineTasto,
            simbolo: aPagine ? 'documento' : 'immagine',
            variante: 'sottile',
            titolo: aPagine ? t.apreLettore : t.mostraPagine,
            al: () => aggiorna({ sfoglioArchivio: aPagine ? 'lettore' : 'pagine' }),
          })
        : null,
      o.freccia(-1),
      o.freccia(1),
      pulsante({
        simbolo: 'esporta',
        variante: 'fantasma',
        titolo: t.apriSistema,
        al: () => o.apriFuori(),
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: o.titoloCestino,
        al: () => o.butta(),
      }),
      pulsante({
        testo: parole().chiudi,
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: t.tornaMatrice,
        al: () => o.chiudi(),
      }),
    ),
    !foglio.presente || !indirizzo
      ? statoVuoto({ simbolo: 'avviso', titolo: t.fileSparito, testo: o.manca })
      : aPagine && daDividere
        ? sfoglioSmistamento({
            smistamento: daDividere,
            allievi: o.allievi,
            richieste: o.richieste,
            indirizzo,
            // Revisione nella chiave, come nella cornice: un PDF riscritto sta allo stesso
            // percorso, e le fotografie sarebbero quelle vecchie.
            chiave: `sfoglio|${foglio.file}|${foglio.misura}|${foglio.revisione}`,
            coda: o.coda(),
          })
        : siGuardaQui(foglio.file)
          ? corniceDocumento({
              indirizzo: `${indirizzo}?v=${foglio.revisione}-${foglio.misura}`,
              // La revisione dentro la chiave e non solo nell'indirizzo: una scansione rifatta
              // sta allo stesso percorso, e il lettore mostrerebbe quella vecchia.
              chiave: `${o.chiave}|${foglio.file}|${foglio.misura}|${foglio.revisione}`,
              titolo: o.titoloLettore,
            })
          : statoVuoto({
              simbolo: 'documento',
              titolo: t.nonSiGuarda,
              testo: t.nonPdf(foglio.nome),
              azione: pulsante({
                testo: t.apriFuori,
                simbolo: 'esporta',
                variante: 'primario',
                al: () => o.apriFuori(),
              }),
            }),
  )
}

/**
 * Il foglio aperto nell'archivio documentale: in testa di chi è e di quale
 * richiesta, con i gesti (scorrere, aprire fuori, buttare via).
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
  const smistamento = riga.genere === 'smistamento'
  const t = testi()
  return corniceFoglio({
    foglio: riga,
    titolo: riga.etichetta,
    nota: smistamento ? riga.richiesta : null,
    pastiglia: smistamento
      ? pastiglia(t.daDividere, 'attenzione', 'documento')
      : riga.richiesta
        ? pastiglia(riga.richiesta, 'neutro', 'documento')
        : null,
    daDividere: smistamento
      ? stato.registro.smistamenti.find((s) => s.id === riga.smistamentoId) ?? null
      : null,
    comandiPdf,
    indice,
    totale: righe.length,
    freccia: (passo) => scorri(righe, indice, passo, {
      cosa: 'foglio',
      detto: (prossima) => prossima.etichetta,
      apri: (prossima) => guardaNellArchivio(prossima?.file ?? null),
    }),
    titoloCestino: t.buttaViaTitolo(riga.etichetta),
    apriFuori: () => azione(apriFuori(riga)),
    butta: () => buttaViaChiedendo(riga),
    chiudi: () => guardaNellArchivio(null),
    manca: t.manca(riga.nome),
    richieste,
    allievi,
    coda: codaDiLettura,
    chiave: 'archivio',
    titoloLettore: riga.etichetta,
  })
}

// ------------------------------------------------------------------ il telaio

/**
 * Il telaio della pagina: i riquadri, e accanto il foglio aperto. Due colonne
 * solo con un foglio aperto. I riquadri stanno sempre nella stessa barra, che
 * è la scatola che scorre: aprire o chiudere un foglio non cambia lo scorrimento.
 */
export function pannelloArchivio (
  riquadri: Figlio,
  anteprima: Figlio,
  /**
   * La chiave per ritrovare lo scorrimento dopo un ridisegno (archiviare una
   * pagina ridisegna la matrice); con un'altra classe si riparte dall'alto.
   * Senza, non si conserva niente.
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
