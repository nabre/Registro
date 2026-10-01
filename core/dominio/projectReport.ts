// I dati dei due rapporti del progetto (ADR-54): quello della classe e quello
// di una persona sola. Stanno qui e non in `reportData.ts` perché leggono il
// progetto da un posto solo, con le letture di `projects.ts`; il giro comune
// (testata, nomi delle colonne, legenda dell'appello) è quello degli altri
// rapporti.

import {
  distribuzione,
  formattaVoto,
  mediaAllievo,
  minutiDiAttivita,
  nomeCompleto,
  ordinaAllievi,
  siglaPresenza,
  statoUd,
  unitaDidattiche,
} from './calculations.js'
import { classeDelCorsoId, materiaDelCorso } from './courses.js'
import { formattaData, formattaDurata, giornoDi, oggi } from './dates.js'
import type {
  Allievo,
  Attivita,
  CellaProgetto,
  CompitoProgetto,
  Iso,
  Lezione,
  MomentoValutazione,
  Progetto,
  Registro,
  TipoOsservazione,
} from './models.js'
import {
  allieviNominati,
  fineDelCompito,
  fineEffettiva,
  giornoDellaVoce,
  lezioniDelProgetto,
  presenzeNelProgetto,
  progressione,
  quadroDelProgetto,
  statoCompitoPerAllievo,
  type Periodo,
  type PresenzeNelProgetto,
  type QuadroDelProgetto,
} from './projects.js'
import { colonne, legenda, valoriComuni } from './reportData.js'
import { percento } from './text.js'
import type { DatiRapporto } from './reports.js'
import { parole } from './words.testi.js'
import { testi as testiRapporti } from './reportData.testi.js'
import { testi } from './projectReport.testi.js'

/** Un rapporto vuoto su cui i costruttori scrivono. */
function vuoto (): DatiRapporto {
  return { valori: {}, elenchi: {}, tabelle: {}, grafici: {} }
}

/** Una data salvata, come la scrivono tutti i rapporti; vuota se non c'è. */
function data (iso: Iso | null | undefined): string {
  return iso ? formattaData(iso) : ''
}

/**
 * Un periodo in parole: non si scrive, lo danno le ore con tappe del progetto
 * o della fase (`periodoDelProgetto`, `periodoDellaFase`). Un giorno solo si
 * dice una volta.
 */
function inParole (periodo: Periodo | null): string {
  const t = testi()
  if (!periodo) return t.nessunaLezione
  if (periodo.inizio === periodo.fine) return formattaData(periodo.inizio)
  return t.periodo(formattaData(periodo.inizio), formattaData(periodo.fine))
}

/** Testata, classe, materia e progetto: quel che i due fogli dicono in cima. */
function testata (
  registro: Registro,
  progetto: Progetto,
  quadro: QuadroDelProgetto,
  titolo: string,
): Record<string, string> {
  const corso = registro.corsi.find((c) => c.id === progetto.corsoId) ?? null
  const classe = classeDelCorsoId(registro, progetto.corsoId)
  return {
    ...valoriComuni(registro, titolo, inParole(quadro.periodo), [progetto.corsoId]),
    // Quanto se n'è fatto, dal consuntivo delle ore; vuoto finché non ha ore.
    avanzamento: quadro.periodo ? percento(quadro.quota) : '',
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    progetto: progetto.titolo,
    stato: testi().statiProgetto[progetto.stato] ?? progetto.stato,
    descrizione: progetto.descrizione ?? '',
    note: progetto.note ?? '',
  }
}

/** La scala dal basso, ogni livello con la sua descrizione se ce l'ha. */
function legendaDeiLivelli (progetto: Progetto): string[] {
  return progetto.livelli.map((l) => (l.descrizione?.trim() ? `${l.testo} — ${l.descrizione.trim()}` : l.testo))
}

/** Come si legge il livello di una cella: il testo della scala, o «nota» se ha solo quella. */
function livelloDi (progetto: Progetto, cella: CellaProgetto): string {
  if (cella.livello === null) return testi().soloNota
  return progetto.livelli.find((l) => l.valore === cella.livello)?.testo ?? cella.livello
}

/** Le fasi di un'ora che lavorano per il progetto: titolo, tipo e durata. */
function fasiDi (registro: Registro, attivita: Attivita[]): string {
  const t = testiRapporti()
  return attivita
    .map((a) => {
      const durata = formattaDurata(minutiDiAttivita(a.durataUd, registro.impostazioni.minutiUd))
      return `${a.titolo || parole().senzaTitolo} (${t.tipoAttivita(a.tipo)}, ${durata})`
    })
    .join('; ')
}

/** Quanto tempo un'ora ha dato al progetto: la somma delle sue fasi. */
function durataDi (registro: Registro, attivita: Attivita[]): string {
  const ud = attivita.reduce((somma, a) => somma + a.durataUd, 0)
  return ud > 0 ? formattaDurata(minutiDiAttivita(ud, registro.impostazioni.minutiUd)) : ''
}

/**
 * Le persone del rapporto di classe: le attive, e chi non lo è più ma il
 * progetto nomina ancora (un ritirato a metà ha i suoi livelli).
 */
function allieviDelProgetto (registro: Registro, progetto: Progetto): Allievo[] {
  const classe = classeDelCorsoId(registro, progetto.corsoId)
  if (!classe) return []
  const nominati = allieviNominati(progetto)
  return ordinaAllievi(classe.allievi.filter((a) => a.attivo || nominati.has(a.id)))
}

/** La fine che vale per un allievo, con la proroga dichiarata. */
function fineDi (registro: Registro, compito: CompitoProgetto, allievoId: string): string {
  const fine = fineEffettiva(registro, compito, allievoId)
  if (!fine) return ''
  const prorogata = compito.proroghe.some((p) => p.allievoId === allievoId)
  return prorogata ? testi().prorogata(formattaData(fine)) : formattaData(fine)
}

/** Le osservazioni scritte nelle ore del progetto, per giorno. */
function osservazioniDelleLezioni (
  lezioni: Lezione[],
): Array<{ data: Iso, allievoId: string | null, tipo: TipoOsservazione, testo: string }> {
  return lezioni.flatMap((lezione) =>
    lezione.osservazioni.map((o) => ({
      data: lezione.data,
      allievoId: o.allievoId,
      tipo: o.tipo,
      testo: o.testo,
    })))
}

/** La media di un momento, come la scrive la scheda della prova. */
function mediaDel (momento: MomentoValutazione): string {
  const media = distribuzione(momento).media
  return media === null ? '' : formattaVoto(media)
}

/** Le prove di un elenco di momenti, una riga ciascuna, con la media. */
function righeDeiMomenti (momenti: MomentoValutazione[]): string[][] {
  const tr = testiRapporti()
  return momenti.map((momento) => [
    formattaData(momento.data),
    momento.titolo,
    tr.tipoValutazione(momento.tipo),
    String(momento.peso),
    String(momento.voti.filter((v) => v.valore !== null).length),
    mediaDel(momento),
  ])
}

/** I conti dell'appello di una persona: UD con appello, perse, quota, ritardi. */
function contiPresenze (p: PresenzeNelProgetto | undefined): string[] {
  if (!p) return ['', '', '', '']
  return [
    String(p.udTotali),
    String(p.udAssenza),
    p.udTotali === 0 ? '' : percento(p.udAssenza / p.udTotali),
    String(p.ritardi),
  ]
}

/**
 * Il rapporto di classe di un progetto: la testata, criteri e scala, le lezioni
 * in cui si è lavorato, i compiti persona per persona, la matrice con
 * l'ultimo livello e la progressione, le valutazioni, i giudizi e le risorse.
 * `giorno` decide che cosa è scaduto: di norma oggi.
 */
export function datiProgetto (
  registro: Registro,
  progetto: Progetto,
  giorno: Iso = oggi(),
): DatiRapporto {
  const t = testi()
  const tr = testiRapporti()
  const dati = vuoto()
  const quadro = quadroDelProgetto(registro, progetto)
  const lezioni = lezioniDelProgetto(registro, progetto)
  const momenti = quadro.momenti
  const allievi = allieviDelProgetto(registro, progetto)
  const nomi = new Map(allievi.map((a) => [a.id, nomeCompleto(a)]))
  const classe = classeDelCorsoId(registro, progetto.corsoId)
  for (const a of classe?.allievi ?? []) if (!nomi.has(a.id)) nomi.set(a.id, nomeCompleto(a))

  dati.valori = {
    ...testata(registro, progetto, quadro, tr.titoli.progettoClasse),
    quanti: String(lezioni.length),
    allievi: String(allievi.length),
  }

  dati.elenchi.obiettivi = progetto.obiettivi
  // La scala dal basso, come la si legge nella matrice.
  dati.elenchi.livelli = legendaDeiLivelli(progetto)

  dati.tabelle.criteri = {
    ...colonne((c) => [c.criterio, c.descrizione]),
    pesi: [3, 8],
    righe: progetto.criteri.map((c) => [c.titolo, c.descrizione ?? '']),
  }

  dati.tabelle.lezioni = {
    ...colonne((c) => [c.numero, c.data, c.stato, c.fasi, c.durata, c.argomenti, c.consuntivo]),
    pesi: [1, 2, 2, 6, 2, 5, 5],
    righe: lezioni.map(({ lezione, attivita }, i) => [
      String(i + 1),
      formattaData(lezione.data),
      tr.statoLezione(lezione.stato),
      fasiDi(registro, attivita),
      durataDi(registro, attivita),
      lezione.argomenti ?? '',
      lezione.consuntivo ?? '',
    ]),
  }

  // Fase per fase: che cosa è, quando, quanto se n'è fatto, le tappe ora per
  // ora e le prove nate lì. Il modello ci gira sopra con `ripeti: fasi`.
  dati.gruppi = {
    fasi: quadro.fasi.map((q) => ({
      valori: {
        fase: t.fase(q.numero, q.fase.titolo),
        descrizioneFase: q.fase.descrizione ?? '',
        periodoFase: inParole(q.periodo),
        avanzamentoFase: q.attivita.length === 0 ? '' : percento(q.quota),
      },
      tabelle: {
        attivitaFase: {
          ...colonne((c) => [c.data, c.attivita, c.svolta, c.nota]),
          pesi: [2, 7, 2, 6],
          righe: q.attivita.map((a) => [
            formattaData(a.data),
            a.titolo || parole().senzaTitolo,
            tr.statiAttivita[a.stato] ?? a.stato,
            a.nota ?? '',
          ]),
        },
        momentiFase: {
          ...colonne((c) => [c.data, c.titolo, c.tipo, c.peso, c.voti, c.media]),
          pesi: [2, 6, 3, 1, 1, 2],
          righe: righeDeiMomenti(q.momenti),
        },
      },
    })),
  }

  // Le presenze nelle sole ore del progetto, con le regole dell'appello: di
  // chi frequenta.
  dati.tabelle.presenze = {
    ...colonne((c) => [c.pif, c.udConAppello, c.udAssenza, c.percAssenza, c.ritardi]),
    pesi: [5, 2, 2, 2, 2],
    righe: allievi.flatMap((a) => {
      const p = quadro.presenze.find((voce) => voce.allievoId === a.id)
      return p ? [[nomeCompleto(a), ...contiPresenze(p)]] : []
    }),
  }

  dati.tabelle.compiti = {
    ...colonne((c) => [c.compito, c.descrizione, c.fine, c.iniziati, c.fatti]),
    pesi: [4, 6, 2, 2, 2],
    righe: progetto.compiti.map((compito) => [
      compito.titolo,
      compito.descrizione ?? '',
      data(fineDelCompito(registro, compito)),
      t.suTanti(compito.inizi.length, allievi.length),
      t.suTanti(compito.fatti.length, allievi.length),
    ]),
  }

  // Una riga per persona, una colonna per compito: quando ha cominciato, entro
  // quando (con la proroga), a che punto è.
  dati.tabelle.statoCompiti = {
    ...colonne((c) => [c.pif, ...progetto.compiti.map((compito) => compito.titolo)]),
    pesi: [4, ...progetto.compiti.map(() => 4)],
    righe: progetto.compiti.length === 0
      ? []
      : allievi.map((allievo) => [
          nomeCompleto(allievo),
          ...progetto.compiti.map((compito) => {
            const inizio = compito.inizi.find((i) => i.allievoId === allievo.id)
            const stato = statoCompitoPerAllievo(registro, compito, allievo.id, giorno)
            return t.casellaCompito(
              inizio ? formattaData(giornoDellaVoce(registro, inizio)) : '',
              fineDi(registro, compito, allievo.id),
              t.statiCompito[stato],
            )
          }),
        ]),
  }

  // La matrice riassuntiva: l'ultimo livello di ogni coppia. Il percorso per
  // arrivarci sta nella tabella sotto, che non ci starebbe in una casella.
  const percorsi = new Map(allievi.map((a) => [a.id, progressione(registro, progetto, a.id)]))
  dati.tabelle.matrice = {
    ...colonne((c) => [c.pif, ...progetto.criteri.map((criterio) => criterio.titolo)]),
    pesi: [4, ...progetto.criteri.map(() => 3)],
    righe: progetto.criteri.length === 0
      ? []
      : allievi.map((allievo) => [
          nomeCompleto(allievo),
          ...(percorsi.get(allievo.id) ?? []).map(({ celle }) => {
            const ultima = celle[celle.length - 1]
            return ultima ? livelloDi(progetto, ultima) : ''
          }),
        ]),
  }

  dati.tabelle.progressione = {
    ...colonne((c) => [c.pif, c.criterio, c.ultimoLivello, c.progressione]),
    pesi: [4, 3, 3, 9],
    righe: allievi.flatMap((allievo) =>
      (percorsi.get(allievo.id) ?? [])
        .filter(({ celle }) => celle.length > 0)
        .map(({ criterio, celle }) => [
          nomeCompleto(allievo),
          criterio.titolo,
          livelloDi(progetto, celle[celle.length - 1]),
          celle
            .map((cella) =>
              t.passo(formattaData(giornoDellaVoce(registro, cella)), livelloDi(progetto, cella)))
            .join(' → '),
        ])),
  }

  dati.tabelle.momenti = {
    ...colonne((c) => [c.data, c.titolo, c.tipo, c.peso, c.voti, c.media]),
    pesi: [2, 6, 3, 1, 1, 2],
    righe: righeDeiMomenti(momenti),
  }

  dati.tabelle.voti = {
    ...colonne((c) => [c.pif, ...momenti.map((m) => `${formattaData(m.data)} ${m.titolo}`), c.media]),
    pesi: [4, ...momenti.map(() => 2), 2],
    righe: momenti.length === 0
      ? []
      : allievi.map((allievo) => {
          const media = mediaAllievo(momenti, allievo.id).media
          return [
            nomeCompleto(allievo),
            ...momenti.map((momento) => {
              const voto = momento.voti.find((v) => v.allievoId === allievo.id)
              if (voto?.valore !== null && voto?.valore !== undefined) return String(voto.valore)
              return voto?.assente ? tr.assente : ''
            }),
            media === null ? '' : media.toFixed(2),
          ]
        }),
  }

  // I giudizi in ordine di giorno: quelli sulla classe e quelli sulle persone.
  dati.tabelle.giudizi = {
    ...colonne((c) => [c.data, c.chi, c.giudizio]),
    pesi: [2, 4, 10],
    righe: [...progetto.giudizi]
      .sort((a, b) => giornoDellaVoce(registro, a).localeCompare(giornoDellaVoce(registro, b)))
      .map((g) => [
        formattaData(giornoDellaVoce(registro, g)),
        g.allievoId ? nomi.get(g.allievoId) ?? g.allievoId : t.classe,
        g.testo,
      ]),
  }

  dati.tabelle.annotazioni = {
    ...colonne((c) => [c.data, c.tipo, c.chi, c.cheCosa]),
    pesi: [2, 2, 4, 10],
    righe: osservazioniDelleLezioni(lezioni.map((l) => l.lezione)).map((o) => [
      formattaData(o.data),
      tr.tipoOsservazione(o.tipo),
      o.allievoId ? nomi.get(o.allievoId) ?? o.allievoId : t.classe,
      o.testo,
    ]),
  }

  dati.tabelle.risorse = {
    ...colonne((c) => [c.materiale, c.origine]),
    pesi: [5, 8],
    righe: progetto.risorse.map((r) => [r.titolo, r.url ?? r.nome ?? '']),
  }

  return dati
}

/**
 * Il rapporto di una persona sola nel progetto: i suoi compiti, la sua
 * progressione criterio per criterio, i voti, i giudizi su di lei e le
 * presenze nelle ore del progetto.
 */
export function datiProgettoAllievo (
  registro: Registro,
  progetto: Progetto,
  allievo: Allievo,
  giorno: Iso = oggi(),
): DatiRapporto {
  const t = testi()
  const tr = testiRapporti()
  const dati = vuoto()
  const quadro = quadroDelProgetto(registro, progetto)
  const lezioni = lezioniDelProgetto(registro, progetto)
  const momenti = quadro.momenti
  const media = mediaAllievo(momenti, allievo.id).media

  dati.valori = {
    ...testata(registro, progetto, quadro, tr.titoli.progettoAllievo),
    allievo: nomeCompleto(allievo),
    media: media === null ? '' : media.toFixed(2),
  }
  // Le sue presenze nell'intero progetto, per i campi in testa alla sezione.
  const [suePresenze] = presenzeNelProgetto(registro, progetto, [allievo.id])
  if (suePresenze && suePresenze.udTotali > 0) {
    dati.valori.udAssenza = String(suePresenze.udAssenza)
    dati.valori.assenza = percento(suePresenze.udAssenza / suePresenze.udTotali)
    dati.valori.ritardi = String(suePresenze.ritardi)
  }

  // Fase per fase: quando, quanto se n'è fatto, e se c'era.
  dati.tabelle.fasi = {
    ...colonne((c) => [
      c.fase, c.periodo, c.avanzamento, c.udConAppello, c.udAssenza, c.percAssenza, c.ritardi,
    ]),
    pesi: [5, 4, 2, 2, 2, 2, 2],
    righe: quadro.fasi.map((q) => [
      t.fase(q.numero, q.fase.titolo),
      inParole(q.periodo),
      q.attivita.length === 0 ? '' : percento(q.quota),
      ...contiPresenze(presenzeNelProgetto(registro, progetto, [allievo.id], { faseId: q.fase.id })[0]),
    ]),
  }

  dati.elenchi.obiettivi = progetto.obiettivi
  dati.elenchi.livelli = legendaDeiLivelli(progetto)

  dati.tabelle.compiti = {
    ...colonne((c) => [c.compito, c.inizio, c.fine, c.fineEffettiva, c.stato, c.fattoIl]),
    pesi: [5, 2, 2, 3, 2, 2],
    righe: progetto.compiti.map((compito) => {
      const inizio = compito.inizi.find((i) => i.allievoId === allievo.id)
      const fatto = compito.fatti.find((f) => f.allievoId === allievo.id)
      const stato = statoCompitoPerAllievo(registro, compito, allievo.id, giorno)
      return [
        compito.titolo,
        inizio ? formattaData(giornoDellaVoce(registro, inizio)) : '',
        data(fineDelCompito(registro, compito)),
        fineDi(registro, compito, allievo.id),
        t.statiCompito[stato],
        data(fatto ? giornoDi(fatto.fattoIl) : null),
      ]
    }),
  }

  // Criterio per criterio, dal primo giorno all'ultimo: è il percorso, non
  // solo dove è arrivato.
  dati.tabelle.progressione = {
    ...colonne((c) => [c.criterio, c.data, c.livello, c.nota]),
    pesi: [4, 2, 3, 8],
    righe: progressione(registro, progetto, allievo.id).flatMap(({ criterio, celle }) =>
      celle.map((cella) => [
        criterio.titolo,
        formattaData(giornoDellaVoce(registro, cella)),
        cella.livello === null ? '' : livelloDi(progetto, cella),
        cella.nota ?? '',
      ])),
  }

  dati.tabelle.voti = {
    ...colonne((c) => [c.data, c.prova, c.tipo, c.peso, c.voto, c.nota]),
    pesi: [2, 6, 3, 1, 1, 6],
    righe: momenti.map((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievo.id)
      return [
        formattaData(momento.data),
        momento.titolo,
        tr.tipoValutazione(momento.tipo),
        String(momento.peso),
        voto?.valore !== null && voto?.valore !== undefined
          ? String(voto.valore)
          : voto?.assente ? tr.assente : '',
        voto?.nota ?? '',
      ]
    }),
  }

  dati.tabelle.giudizi = {
    ...colonne((c) => [c.data, c.giudizio]),
    pesi: [2, 12],
    righe: progetto.giudizi
      .filter((g) => g.allievoId === allievo.id)
      .sort((a, b) => giornoDellaVoce(registro, a).localeCompare(giornoDellaVoce(registro, b)))
      .map((g) => [formattaData(giornoDellaVoce(registro, g)), g.testo]),
  }

  dati.tabelle.annotazioni = {
    ...colonne((c) => [c.data, c.tipo, c.cheCosa]),
    pesi: [2, 2, 10],
    righe: osservazioniDelleLezioni(lezioni.map((l) => l.lezione))
      .filter((o) => o.allievoId === allievo.id)
      .map((o) => [formattaData(o.data), tr.tipoOsservazione(o.tipo), o.testo]),
  }

  // L'appello delle sole ore del progetto, con le sigle della griglia: una
  // casella per UD, come la scheda personale. Un'ora annullata non ha appello.
  const { minutiUd } = registro.impostazioni
  dati.tabelle.presenze = {
    ...colonne((c) => [c.data, c.fasi, c.presenze, c.minuti, c.nota]),
    pesi: [2, 7, 3, 1, 4],
    righe: lezioni.filter(({ lezione }) => lezione.stato !== 'annullata').map(({ lezione, attivita }) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      const ud = unitaDidattiche(lezione, minutiUd)
      return [
        formattaData(lezione.data),
        fasiDi(registro, attivita),
        ud.map((_, i) => siglaPresenza(statoUd(presenza, i))).join(' '),
        presenza?.minuti ? String(presenza.minuti) : '',
        presenza?.nota ?? '',
      ]
    }),
  }
  legenda(dati)

  return dati
}

