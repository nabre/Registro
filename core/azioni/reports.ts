// I rapporti in PDF (verbale, piano, valutazioni, presenze, fascicolo, scheda).
// Modelli e dati stanno altrove (`core/dati/templates.ts`, `core/dominio/reportData/`):
// qui il giro comune — trova, componi, scrivi. La rigenerazione automatica sta
// in `reportsRefresh.ts`.

import { depositaGenerato } from '#core/dati/exports.js'
import {
  ESPORTAZIONI,
  collocazioneDi,
  fogliDeiProgettiOrfani,
  fogliFratelli,
  percorsoDi,
  precedentiDi,
  type Collocazione,
  type ContestoRapporto,
  type GenereRapporto,
} from '#core/dominio/locations.js'
import { blocchi, modello, paroleDeiModelli } from '#core/dati/templates.js'
import type { CartaIntestata, Intestazione } from '#core/dominio/models.js'
import type { Lingua } from '#core/i18n/index.js'
import { CHIAVE_CARTA } from '#core/dominio/reportData/index.js'
import { NOME_LOGO, conIntestazione } from '#core/dominio/reports.js'
import { componiPdf } from '#core/dati/reportsPdf.js'
import { contenutoDi, deposito } from '#core/dati/store.js'
import {
  datiAllievo,
  datiCorso,
  datiSupplenze,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
  datiDiario,
} from '#core/dominio/reportData/index.js'
import { datiProgetto, datiProgettoAllievo } from '#core/dominio/projectReport.js'
import { allieviNominati, progettiDelCorso, progettoNelCorsoPerId } from '#core/dominio/projects.js'
import {
  classeDelCorsoId,
  corsiDellaClasse,
  pianiDelCorso,
  registroDelCorso,
} from '#core/dominio/courses.js'
import { ordinaAllievi } from '#core/dominio/calculations.js'
import { nelSemestre } from '#core/dominio/dates.js'
import type { Archivio } from '#core/dati/archive.js'
import type { Corso, Registro, Semestre } from '#core/dominio/models.js'
import type { Blocchi, DatiRapporto, Modello } from '#core/dominio/reports.js'
import { cestina, conMessaggio, motivoSicuro, rifiuta, rifiutaCon, type Parte } from './context.js'
import { testi } from './reports.testi.js'

/** Il modello e i dati di un rapporto. */
interface Pezzi {
  modello: string
  dati: DatiRapporto
}

/** Che cosa serve per scrivere il file: il modello, i dati e dove va a finire. */
interface Preparato extends Pezzi {
  /** Il posto lo decide il dominio, lo stesso che legge la pagina Documenti. */
  dove: Collocazione
  /** I PDF vivi accanto che portano « (N)» come i doppioni (`fogliFratelli`). */
  gemelle?: string[] | null
  /** Di che cosa è il foglio: `genere|id`. */
  chiave?: string
}

/**
 * Le immagini di un rapporto, tutte dentro il documento: `NOME_LOGO` è il logo
 * dell'intestazione, un percorso con barre è un file dell'anno (es. una foto),
 * un nome secco non è niente. Un'immagine che manca non ferma il foglio.
 */
export function immaginiDelDocumento (
  carta: CartaIntestata,
): (nome: string) => Promise<Uint8Array | null> {
  return async (nome) => {
    if (nome === NOME_LOGO) return carta.logo ? contenutoDi(carta.logo) : null
    if (!nome.includes('/')) return null
    return contenutoDi(nome)
  }
}

/** I dati di un rapporto con accanto le parole e i pezzi comuni. */
type DatiComposti = DatiRapporto & {
  frasi: Record<string, string>
  colonne: Record<string, string>
  blocchi: Blocchi
}

/**
 * Un modello pronto per il documento: carta intestata, parole e pezzi comuni.
 * La carta l'hanno già scelta i dati (`CHIAVE_CARTA`): qui la si ritrova.
 */
export function impaginazioneDi (
  nome: string,
  dati: DatiRapporto,
  intestazione: Intestazione,
  inLingua?: Lingua,
): { impaginazione: Modello, dati: DatiComposti, carta: CartaIntestata } | null {
  const trovato = modello(nome)
  if (!trovato) return null
  const scelta = dati.valori[CHIAVE_CARTA]
  const carta = intestazione.carte.find((c) => c.id === scelta) ?? intestazione.carte[0]
  // Le parole comuni si aggiungono ai dati, non li sostituiscono.
  const parole = paroleDeiModelli(inLingua)
  return {
    impaginazione: conIntestazione(trovato, carta),
    dati: { ...dati, frasi: parole.frasi, colonne: parole.colonne, blocchi: blocchi() },
    carta,
  }
}

/**
 * Se il documento aperto è ancora quello su cui un lavoro è partito. Si
 * ricontrolla a ogni foglio: il cambio di documento può arrivare a metà fila, e
 * `depositaGenerato` scriverebbe nel `.regi` nuovo.
 */
export type Ancora = () => boolean

/** L'ancora di un documento e di un anno, presi da chi la chiede. */
export function stessoDocumento (
  archivio: Archivio,
  documento: string | null,
  anno: string | null,
): Ancora {
  return () =>
    (archivio.documentoAperto?.toString() ?? null) === documento &&
    archivio.registro.annoCorrenteId === anno
}

/** L'ancora del documento aperto adesso. */
function ancoraAdesso (archivio: Archivio): Ancora {
  return stessoDocumento(
    archivio,
    archivio.documentoAperto?.toString() ?? null,
    archivio.registro.annoCorrenteId,
  )
}

/**
 * Com'è andata la scrittura di un rapporto. `interrotto`: il documento è
 * cambiato a metà, e chi scrive una fila si ferma invece di contarlo come errore.
 */
type Scrittura = { relativo: string } | { errore: string, interrotto?: true }

/** Compone un rapporto e lo scrive dove va, senza aprirlo. Comune al pulsante e all'automazione. */
async function scriviRapporto (
  preparato: Preparato,
  ancora: Ancora,
  intestazione: Intestazione,
): Promise<Scrittura> {
  const t = testi()
  const pronto = impaginazioneDi(preparato.modello, preparato.dati, intestazione)
  if (!pronto) return { errore: t.senzaModello(preparato.modello) }
  const { impaginazione, dati } = pronto

  let byte: Uint8Array
  try {
    byte = await componiPdf(impaginazione, dati, immaginiDelDocumento(pronto.carta))
  } catch (errore) {
    return { errore: t.composizioneFallita(motivoSicuro(errore)) }
  }

  const relativo = percorsoDi(preparato.dove)
  // Dopo la composizione (l'attesa lunga, dove il documento può cambiare):
  // fra questa riga e `depositaGenerato` non ci sono attese.
  if (!ancora()) return { errore: t.giroInterrotto, interrotto: true }
  // Solo nel documento: la copia su disco la fa chi lo apre (la cornice della
  // pagina Documenti), non ogni foglio di un giro che nessuno guarda.
  if (!(await depositaGenerato(relativo, byte, precedentiDi(preparato.dove), preparato.gemelle))) {
    return { errore: t.senzaCartella }
  }
  return { relativo }
}

/**
 * I fogli di un corso che invecchiano con i dati (presenze, voti, supplenze,
 * schede di allievi e prove): quelli che l'automazione rifà. Si scrivono, non si aprono.
 */
export function documentiDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  return [
    // Prima la scheda completa del corso, poi i fogli di dettaglio e uno per allievo.
    conPosto(registro, 'corso', corso.id, dove, {
      modello: 'scheda-corso',
      dati: datiCorso(registro, corso, semestre),
    }),
    conPosto(registro, 'presenze', corso.id, dove, {
      modello: 'presenze-classe',
      dati: datiPresenze(registro, corso, semestre),
    }),
    conPosto(registro, 'valutazioni', corso.id, dove, {
      modello: 'valutazioni-classe',
      dati: datiValutazioni(registro, corso, semestre),
    }),
    conPosto(registro, 'diario', corso.id, dove, {
      modello: 'diario-corso',
      dati: datiDiario(registro, corso, semestre),
    }),
    supplenzeDelCorso(registro, corso, semestre),
    // Anche chi si è ritirato: la sua scheda deve mostrare il ritiro.
    ...ordinaAllievi(classe.allievi).map((allievo) =>
      conPosto(registro, 'allievo', allievo.id, dove, {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }),
    ),
    ...fogliDeiProgetti(registro, corso),
    // Una scheda per prova, con la sua distribuzione.
    ...registro.valutazioni
      .filter((momento) => momento.corsoId === corso.id && nelSemestre(semestre, momento.data))
      .map((momento) =>
        conPosto(registro, 'momento', momento.id, dove, {
          modello: 'momento-valutazione',
          dati: datiMomento(registro, momento),
        }),
      ),
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/**
 * I fogli dei progetti del corso: quello della classe e uno per persona (chi
 * frequenta, e chi il progetto nomina ancora). Non hanno periodo: ogni giro li
 * riscrive allo stesso posto.
 */
function fogliDeiProgetti (registro: Registro, corso: Corso): Array<Preparato | null> {
  const classe = classeDelCorsoId(registro, corso.id)
  return progettiDelCorso(registro, corso.id).flatMap((progetto) => {
    const nominati = allieviNominati(progetto)
    const persone = ordinaAllievi((classe?.allievi ?? []).filter((a) => a.attivo || nominati.has(a.id)))
    return [
      conPosto(registro, 'progetto-classe', progetto.id, { corsoId: corso.id }, {
        modello: 'progetto-classe',
        dati: datiProgetto(registro, progetto),
      }),
      ...persone.map((allievo) =>
        conPosto(registro, 'progetto-allievo', progetto.id, { corsoId: corso.id, allievoId: allievo.id }, {
          modello: 'progetto-allievo',
          dati: datiProgettoAllievo(registro, progetto, allievo),
        }),
      ),
    ]
  })
}

/**
 * Toglie i fogli dei progetti di quei corsi che nessun progetto scriverebbe
 * più (rinominato: il titolo è nel nome; o non più integrato lì), così il
 * foglio nuovo non ne ha uno vecchio accanto.
 */
export async function togliProgettiOrfani (registro: Registro, corsiIds: Iterable<string>): Promise<void> {
  const dove = deposito()
  if (!dove) return
  const esistenti = dove.elenca(`${ESPORTAZIONI}/`)
  for (const corsoId of new Set(corsiIds)) {
    for (const percorso of fogliDeiProgettiOrfani(registro, corsoId, esistenti)) await cestina(percorso)
  }
}

/**
 * La scheda delle ore tenute come supplente, se ce n'è motivo: almeno una
 * supplenza svolta nel periodo, come chiede la pagina Documenti per mostrarla.
 * Senza più supplenze si rifà solo quella già nella cartella: tolta l'ultima,
 * racconterebbe ancora ore che non lo sono più.
 */
function supplenzeDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato | null {
  const preparato = conPosto(
    registro,
    'supplenze',
    corso.id,
    { corsoId: corso.id, semestreId: semestre?.id ?? null },
    { modello: 'scheda-corso', dati: datiSupplenze(registro, corso, semestre) },
  )
  if (!preparato) return null
  const svolte = registroDelCorso(registro, corso.id).some(
    (l) => l.supplenza === true && l.stato === 'svolta' && nelSemestre(semestre, l.data),
  )
  return svolte || deposito()?.esiste(percorsoDi(preparato.dove)) ? preparato : null
}

/**
 * Tutti i PDF di un corso, per «Aggiorna tutto»: `documentiDelCorso` più
 * verbali delle ore svolte, piani, ritratti e fascicolo (se docente di classe).
 * Le ore non svolte restano fuori: il verbale uscirebbe vuoto.
 */
function tuttoDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  const verbali = registroDelCorso(registro, corso.id)
    .filter((l) => l.stato === 'svolta' && nelSemestre(semestre, l.data))
    .map((lezione) =>
      conPosto(registro, 'lezione', lezione.id, dove, {
        modello: 'verbale-lezione',
        dati: datiLezione(
          registro,
          lezione,
          registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
        ),
      }),
    )

  // I piani non hanno periodo.
  const piani = pianiDelCorso(registro, corso.id).map((piano) =>
    conPosto(registro, 'piano', piano.id, dove, {
      modello: 'piano-lezione',
      dati: datiPiano(registro, piano),
    }),
  )

  const facce = conPosto(registro, 'foto-classe', corso.id, dove, {
    modello: 'foto-classe',
    dati: datiFotoClasse(registro, classe),
  })

  // Il fascicolo è della classe: solo dove si è docente di classe.
  const fascicolo = classe.docenteDiClasse
    ? conPosto(registro, 'fascicolo', classe.id, dove, {
        modello: 'fascicolo-classe',
        dati: datiFascicolo(registro, classe),
      })
    : null

  return [
    ...documentiDelCorso(registro, corso, semestre),
    ...verbali,
    ...piani,
    facce,
    fascicolo,
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/** Il modello e i dati più il posto; senza posto (oggetto sparito) il foglio salta. */
export function conPosto (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto,
  resto: Pezzi,
): Preparato | null {
  const dove = collocazioneDi(registro, genere, id, contesto)
  if (!dove) return null
  return {
    ...resto,
    dove,
    gemelle: fogliFratelli(registro, genere, id, contesto),
    chiave: `${genere}|${id}`,
  }
}

/** Il semestre scelto dentro l'anno di una classe, o l'anno intero. */
function semestreScelto (
  registro: Registro,
  classeId: string,
  semestreId: string | null,
): Semestre | null {
  const classe = registro.classi.find((c) => c.id === classeId) ?? null
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno?.semestri.find((s) => s.id === semestreId) ?? null
}

/**
 * Scrive una fila di rapporti, uno alla volta (la cartella è sincronizzata), e
 * salva il documento una volta sola alla fine: ogni foglio si compone in più
 * del ritardo del salvataggio, e ne farebbe uno a sé.
 */
export function scriviTutti (
  archivio: Archivio,
  da: Preparato[],
  ancora: Ancora,
  intestazione: Intestazione,
): Promise<{ scritti: number, errori: string[], interrotto: boolean }> {
  return archivio.salvaAllaFine(async () => {
    let scritti = 0
    const errori: string[] = []
    for (const preparato of da) {
      // Un documento cambiato ferma tutta la fila.
      if (!ancora()) {
        return { scritti, errori: [testi().giroInterrotto, ...errori], interrotto: true }
      }
      const esito = await scriviRapporto(preparato, ancora, intestazione)
      if ('errore' in esito && esito.interrotto) {
        return { scritti, errori: [esito.errore, ...errori], interrotto: true }
      }
      if ('errore' in esito) errori.push(esito.errore)
      else scritti += 1
    }
    return { scritti, errori, interrotto: false }
  })
}

export const rapporti = {
  /**
   * Compone un rapporto e torna il percorso, senza aprirlo: lo mostra la
   * cornice della pagina Documenti.
   */
  'rapporto.genera': async (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    const ancora = ancoraAdesso(contesto.archivio)
    const richiesto: ContestoRapporto = {
      corsoId: azione.corsoId ?? null,
      semestreId: azione.semestreId ?? null,
      docenteDiClasse: azione.docenteDiClasse ?? false,
      allievoId: azione.allievoId ?? null,
    }
    const dove = collocazioneDi(registro, azione.genere, azione.id, richiesto)
    let pezzi: Pezzi | null = null

    if (azione.genere === 'corso') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta(t.corsoNonTrovato)
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi = { modello: 'scheda-corso', dati: datiCorso(registro, corso, semestre) }
    }

    // La stessa scheda, con le sole ore tenute come supplente.
    if (azione.genere === 'supplenze') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta(t.corsoNonTrovato)
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi = { modello: 'scheda-corso', dati: datiSupplenze(registro, corso, semestre) }
    }

    if (azione.genere === 'lezione') {
      const lezione = registro.lezioni.find((l) => l.id === azione.id)
      if (!lezione) return rifiuta(t.lezioneNonTrovata)
      const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
      pezzi = { modello: 'verbale-lezione', dati: datiLezione(registro, lezione, consegne) }
    }

    if (azione.genere === 'piano') {
      const piano = registro.piani.find((p) => p.id === azione.id)
      if (!piano) return rifiuta(t.pianoNonTrovato)
      pezzi = { modello: 'piano-lezione', dati: datiPiano(registro, piano) }
    }

    // Valutazioni e presenze sono di un corso: medie e ore non si mescolano fra materie.
    if (azione.genere === 'valutazioni' || azione.genere === 'presenze') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta(t.corsoNonTrovato)
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi =
        azione.genere === 'presenze'
          ? { modello: 'presenze-classe', dati: datiPresenze(registro, corso, semestre) }
          : { modello: 'valutazioni-classe', dati: datiValutazioni(registro, corso, semestre) }
    }

    if (azione.genere === 'diario') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta(t.corsoNonTrovato)
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi = { modello: 'diario-corso', dati: datiDiario(registro, corso, semestre) }
    }

    // Una prova sola: il periodo lo dà la sua data.
    if (azione.genere === 'momento') {
      const momento = registro.valutazioni.find((v) => v.id === azione.id)
      if (!momento) return rifiuta(t.momentoNonTrovato)
      pezzi = { modello: 'momento-valutazione', dati: datiMomento(registro, momento) }
    }

    if (azione.genere === 'fascicolo') {
      const classe = registro.classi.find((c) => c.id === azione.id)
      if (!classe) return rifiuta(t.classeNonTrovata)
      pezzi = { modello: 'fascicolo-classe', dati: datiFascicolo(registro, classe) }
    }

    // I ritratti sono della classe ma si chiedono da un corso, nella cui cartella vanno.
    if (azione.genere === 'foto-classe') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      const classe = corso
        ? classeDelCorsoId(registro, corso.id)
        : registro.classi.find((c) => c.id === azione.id) ?? null
      if (!classe) return rifiuta(t.classeNonTrovata)
      pezzi = { modello: 'foto-classe', dati: datiFotoClasse(registro, classe) }
    }

    // Il progetto nel corso, di tutta la classe o di una persona: l'id è del
    // progetto, `corsoId` il corso in cui è integrato.
    if (azione.genere === 'progetto-classe' || azione.genere === 'progetto-allievo') {
      const progetto = progettoNelCorsoPerId(registro, azione.id, azione.corsoId)
      if (!progetto) return rifiuta(t.progettoNonTrovato)
      if (azione.genere === 'progetto-classe') {
        pezzi = { modello: 'progetto-classe', dati: datiProgetto(registro, progetto) }
      } else {
        const classe = classeDelCorsoId(registro, progetto.corsoId)
        const allievo = classe?.allievi.find((a) => a.id === azione.allievoId) ?? null
        if (!allievo) return rifiuta(t.pifNonTrovato)
        pezzi = {
          modello: 'progetto-allievo',
          dati: datiProgettoAllievo(registro, progetto, allievo),
        }
      }
    }

    if (azione.genere === 'allievo') {
      const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === azione.id)) ?? null
      const allievo = classe?.allievi.find((a) => a.id === azione.id) ?? null
      if (!classe || !allievo) return rifiuta(t.pifNonTrovato)
      const semestre = semestreScelto(registro, classe.id, azione.semestreId ?? null)
      // Il corso indicato, o l'unico della classe; con docenteDiClasse la scheda è della classe.
      const suoi = corsiDellaClasse(registro, classe.id)
      const corso = azione.docenteDiClasse
        ? null
        : suoi.find((c) => c.id === azione.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
      pezzi = {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }
    }

    if (!pezzi || !dove) return rifiuta(t.rapportoSconosciuto)

    const intestazione = registro.impostazioni.intestazione
    const gemelle = fogliFratelli(registro, azione.genere, azione.id, richiesto)
    const esito = await scriviRapporto({ ...pezzi, dove, gemelle }, ancora, intestazione)
    if ('errore' in esito && esito.interrotto) return rifiutaCon('conflitto', esito.errore)
    if ('errore' in esito) return rifiuta(esito.errore)

    if (azione.genere === 'progetto-classe' || azione.genere === 'progetto-allievo') {
      if (azione.corsoId) await togliProgettiOrfani(registro, [azione.corsoId])
    }

    return conMessaggio(t.scritto(esito.relativo), 'info', {
      documento: esito.relativo,
    })
  },

  /**
   * Tutti i PDF di un corso (`tuttoDelCorso`), o di tutti i corsi dell'anno.
   * Non apre niente; se un foglio fallisce va avanti e conta gli errori.
   */
  'rapporto.completo': async (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    // Preso all'ingresso: ogni foglio lo ricontrolla prima di scriversi.
    const ancora = ancoraAdesso(contesto.archivio)
    // Senza un corso indicato: solo quelli dell'anno aperto.
    const dellAnno = (corso: Corso): boolean => {
      const classe = classeDelCorsoId(registro, corso.id)
      return Boolean(classe) && classe?.annoId === registro.annoCorrenteId
    }
    const scelti = azione.corsoId
      ? registro.corsi.filter((c) => c.id === azione.corsoId)
      : registro.corsi.filter(dellAnno)
    if (scelti.length === 0) {
      return rifiuta(azione.corsoId ? t.corsoNonTrovato : t.nessunCorso)
    }

    const da = scelti.flatMap((corso) => {
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
      // Un semestre solo per tutti i corsi.
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      return tuttoDelCorso(registro, corso, semestre)
    })

    // Un foglio una volta sola: due corsi della stessa classe chiedono lo stesso
    // fascicolo. Per cosa e posto, non per posto solo: due cose che finissero
    // allo stesso percorso non devono sparire in silenzio l'una nell'altra.
    const unaVolta = new Map<string, Preparato>()
    for (const preparato of da) {
      unaVolta.set(`${preparato.chiave ?? ''}|${percorsoDi(preparato.dove)}`, preparato)
    }

    const intestazione = registro.impostazioni.intestazione
    const esito = await scriviTutti(contesto.archivio, [...unaVolta.values()], ancora, intestazione)
    if (!esito.interrotto) await togliProgettiOrfani(registro, scelti.map((c) => c.id))
    // Fermato a metà: si dice quanti fogli erano usciti.
    if (esito.interrotto) {
      return rifiutaCon(
        'conflitto',
        esito.scritti > 0 ? `${t.giroInterrotto} ${t.giaScritti(esito.scritti)}` : t.giroInterrotto,
      )
    }
    const dove = scelti.length === 1 ? t.diCorso(scelti[0].titolo) : t.diCorsi(scelti.length)
    // Zero scritti con errori è un fallimento, non un avviso.
    if (esito.scritti === 0 && esito.errori.length > 0) {
      return rifiuta(t.nessunoScritto(dove, esito.errori[0]))
    }
    if (esito.errori.length > 0) {
      return conMessaggio(
        t.scrittiConErrori(esito.scritti, dove, esito.errori.length, esito.errori[0]),
        'avviso',
      )
    }
    return conMessaggio(t.scrittiTutti(esito.scritti, dove), 'info')
  },
} satisfies Parte
