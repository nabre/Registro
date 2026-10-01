// La scheda completa del corso e quella ristretta alle supplenze.

import {
  confrontaLezioni,
  inizioLezione,
  mediaAllievo,
  minutiDiAttivita,
  nomeCompleto,
} from '#core/dominio/calculations.js'
import { classeDelCorsoId, nomeDelPiano, registroDelCorso } from '#core/dominio/courses.js'
import { nomeSegnoScritto } from '#core/dominio/observations.js'
import { recuperiDelMomento } from '#core/dominio/retakes.js'
import { avanzamentoConsegna, dataConsegna, scadenzaConsegna } from '#core/dominio/assignments.js'
import {
  etichettaSemestre,
  formattaData,
  formattaDurata,
  nelSemestre,
  oggi,
} from '#core/dominio/dates.js'
import type { Attivita, Corso, Lezione, Registro, Semestre } from '#core/dominio/models.js'
import type { DatiRapporto } from '#core/dominio/reports.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './reportData.testi.js'
import { aChiConsegna, perQuando, vuoto, colonne, comuni, nomeAspetto } from './common.js'
import { datiPresenze } from './classes.js'
import { datiValutazioni, resiUnoPerUno } from './assessments.js'
import { datiDiario } from './lesson.js'

/**
 * La scheda completa del corso: un unico documento che raccoglie
 * presenze, valutazioni, diario delle lezioni, piani lezione, pendenze e check.
 */
export function datiCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  // Solo le ore confermate svolte, come nelle parti che la scheda raccoglie.
  const lezioni = registroDelCorso(registro, corso.id)
    .filter((l) => l.stato === 'svolta' && (!semestre || nelSemestre(semestre, l.data)))
    .sort(confrontaLezioni)

  const dp = datiPresenze(registro, corso, semestre)
  const dv = datiValutazioni(registro, corso, semestre)
  const dd = datiDiario(registro, corso, semestre)

  const momenti = registro.valutazioni
    .filter((v) => v.corsoId === corso.id)
    .filter((v) => !semestre || (v.data >= semestre.inizio && v.data <= semestre.fine))

  const medieStudenti = (classe?.allievi ?? [])
    .map((a) => mediaAllievo(momenti, a.id).media)
    .filter((m): m is number => m !== null)
  const mediaClasse = medieStudenti.length > 0
    ? (medieStudenti.reduce((s, m) => s + m, 0) / medieStudenti.length).toFixed(2)
    : '—'

  dati.valori = {
    ...dp.valori,
    ...dv.valori,
    ...dd.valori,
    ...comuni(registro, t.titoli.corso, etichettaSemestre(semestre), [corso.id]),
    media: mediaClasse,
  }

  dati.elenchi = {
    ...dp.elenchi,
  }

  dati.tabelle.presenze = dp.tabelle.presenze
  dati.tabelle.orario = dp.tabelle.orario
  dati.tabelle.sospensioni = dp.tabelle.sospensioni
  dati.tabelle.voti = dv.tabelle.voti
  dati.grafici.andamento = dv.grafici.andamento
  dati.tabelle.diario = dd.tabelle.diario

  // Osservazioni di tutte le lezioni del corso per le persone in formazione
  const osservazioniLezioni: string[][] = []
  for (const lezione of lezioni) {
    for (const oss of (lezione.osservazioni ?? [])) {
      const allievo = classe?.allievi.find((a) => a.id === oss.allievoId)
      osservazioniLezioni.push([
        formattaData(lezione.data),
        inizioLezione(lezione) ?? '',
        allievo ? nomeCompleto(allievo) : t.tuttaLaClasse,
        t.tipoOsservazione(oss.tipo),
        oss.testo,
      ])
    }
  }
  dati.tabelle.osservazioni = {
    ...colonne((c) => [c.data, c.ora, c.pif, c.tipo, c.annotazione]),
    pesi: [2, 1, 4, 3, 6],
    righe: osservazioniLezioni,
  }

  // Giudizi +/- della matrice del comportamento per ogni lezione e persona in formazione
  const giudiziLezioni: string[][] = []
  for (const lezione of lezioni) {
    for (const cella of (lezione.matrice ?? [])) {
      const allievo = classe?.allievi.find((a) => a.id === cella.allievoId)
      const segno = cella.segno === 'positivo'
        ? `+ (${nomeSegnoScritto(cella.segno)})`
        : cella.segno === 'negativo'
          ? `- (${nomeSegnoScritto(cella.segno)})`
          : (nomeSegnoScritto(cella.segno) ?? '')
      giudiziLezioni.push([
        formattaData(lezione.data),
        allievo ? nomeCompleto(allievo) : '',
        nomeAspetto(registro, cella.aspetto),
        segno,
        cella.nota ?? '',
      ])
    }
  }
  dati.tabelle.comportamento = {
    ...colonne((c) => [c.data, c.pif, c.aspetto, c.comeEAndata, c.annotazione]),
    pesi: [2, 4, 4, 3, 5],
    righe: giudiziLezioni,
  }

  // I piani lezione del corso nell'ordine delle lezioni che li usano: chi
  // sfoglia la scheda segue il corso giorno per giorno. Contano le ore non
  // annullate del periodo, anche quelle ancora da fare, che una data ce l'hanno
  // già. I piani senza lezione (bozze) vanno in fondo, nell'ordine di sempre.
  const pianiCorso = registro.piani.filter(
    (p) => p.corsoId === corso.id || lezioni.some((l) => l.pianoId === p.id),
  )
  const oreDelPeriodo = registroDelCorso(registro, corso.id)
    .filter((l) => l.stato !== 'annullata' && (!semestre || nelSemestre(semestre, l.data)))
  const pianiPerData = pianiCorso
    .map((piano, i) => ({ piano, i, ore: oreDelPeriodo.filter((l) => l.pianoId === piano.id) }))
    .sort((a, b) => {
      const primaA = a.ore[0]
      const primaB = b.ore[0]
      if (primaA && primaB) return confrontaLezioni(primaA, primaB) || a.i - b.i
      if (primaA) return -1
      if (primaB) return 1
      return a.i - b.i
    })
  /** Le date delle ore di un piano, o «bozza» se nessuna ora lo usa. */
  const dateDi = (ore: readonly Lezione[]) =>
    ore.length > 0 ? [...new Set(ore.map((l) => formattaData(l.data)))].join(', ') : t.bozza
  const tappa = (attivita: Attivita, i: number): string[] => [
    String(i + 1),
    [attivita.titolo || parole().senzaTitolo, attivita.descrizione].filter(Boolean).join(' — '),
    t.tipoAttivita(attivita.tipo),
    formattaDurata(minutiDiAttivita(attivita.durataUd, registro.impostazioni.minutiUd)),
    attivita.raggruppamento ? t.raggruppamento(attivita.raggruppamento) : '',
    attivita.valutazione
      ? `${t.tipoValutazione(attivita.valutazione.tipo)}${attivita.valutazione.peso !== 1 ? ` · ${t.pesoDi(attivita.valutazione.peso)}` : ''}`
      : '',
  ]

  dati.tabelle.piani = {
    ...colonne((c) => [c.data, c.titolo, c.ud, c.obiettivi, c.prerequisiti]),
    pesi: [3, 5, 2, 5, 4],
    righe: pianiPerData.map(({ piano, ore }) => [
      dateDi(ore),
      nomeDelPiano(registro, piano),
      formattaDurata(
        minutiDiAttivita(
          piano.attivita.reduce((s, a) => s + (a.durataUd || 0), 0),
          registro.impostazioni.minutiUd,
        ),
      ),
      piano.obiettivi.join('; ') || '—',
      piano.prerequisiti || '—',
    ]),
  }

  // La scaletta di tutti i piani in una tabella, nello stesso ordine.
  dati.tabelle.scaletta = {
    ...colonne((c) => [c.data, c.titolo, c.numero, c.attivita, c.tipo, c.durata, c.come, c.prova]),
    pesi: [3, 4, 1, 5, 2, 2, 2, 2],
    righe: pianiPerData.flatMap(({ piano, ore }) =>
      piano.attivita.map((attivita, i) => [dateDi(ore), nomeDelPiano(registro, piano), ...tappa(attivita, i)]),
    ),
  }

  // E piano per piano, per `ripeti: piani`: la data e il titolo in testa, la
  // scaletta sotto, così un piano non si legge mescolato al successivo. La
  // tabella c'è sempre, anche vuota: senza, il giro prenderebbe quella di tutti.
  dati.gruppi = {
    piani: pianiPerData.map(({ piano, ore }) => ({
      valori: {
        piano: nomeDelPiano(registro, piano),
        dataPiano: dateDi(ore),
        // La riga in testa: la data davanti, se c'è; una bozza dice già
        // «bozza» nel suo nome.
        intestazionePiano: ore.length > 0
          ? `${dateDi(ore)} · ${nomeDelPiano(registro, piano)}`
          : nomeDelPiano(registro, piano),
        obiettiviPiano: piano.obiettivi.join('; '),
      },
      tabelle: {
        scaletta: {
          ...colonne((c) => [c.numero, c.attivita, c.tipo, c.durata, c.come, c.prova]),
          pesi: [1, 6, 2, 2, 2, 2],
          righe: piano.attivita.map(tappa),
        },
      },
    })),
  }

  // Pendenze del corso: recuperi aperti, verifiche da ridare, consegne aperte
  const righePendenze: string[][] = []

  const recuperi = momenti.flatMap((m) => recuperiDelMomento(registro, m, classe, oggi()))
  // Come nel todo: aperto finché non è dispensato, o fatto e ridato.
  const aperti = recuperi.filter(
    (r) => r.stato !== 'dispensato' && !(r.stato === 'fatto' && r.riconsegnataIl),
  )
  for (const r of aperti) {
    righePendenze.push([
      t.pendenzeTipo.recupero,
      r.momento.titolo,
      nomeCompleto(r.allievo),
      r.previstoIl ? formattaData(r.previstoIl) : '',
      t.statiRecupero[r.stato],
    ])
  }

  const daRiconsegnare = momenti.filter((m) => !resiUnoPerUno(m, classe))
  for (const m of daRiconsegnare) {
    righePendenze.push([
      t.pendenzeTipo.momento,
      m.titolo,
      t.tuttaLaClasse,
      formattaData(m.data),
      t.daRiconsegnare,
    ])
  }

  const consegneCorso = (registro.consegne ?? []).filter((c) => c.corsoId === corso.id)
  const nomiCorso = new Map((classe?.allievi ?? []).map((a) => [a.id, nomeCompleto(a)]))
  for (const c of consegneCorso) {
    // Come nel todo: chi frequenta, fra quelli a cui tocca.
    const { fatte, destinatari, completa } = avanzamentoConsegna(c, classe)
    if (!completa) {
      righePendenze.push([
        t.pendenzeTipo.consegna,
        c.testo,
        aChiConsegna(c, nomiCorso),
        perQuando(registro, c),
        `${fatte}/${destinatari.length}`,
      ])
    }
  }

  dati.tabelle.pendenze = {
    ...colonne((c) => [c.tipo, c.titolo, c.pif, c.data, c.stato]),
    pesi: [3, 5, 4, 2, 2],
    righe: righePendenze,
  }

  // Check del corso
  if (dv.tabelle.check && dv.tabelle.check.righe && dv.tabelle.check.righe.length > 0) {
    dati.tabelle.check = dv.tabelle.check
  } else {
    dati.tabelle.check = { ...colonne((c) => [c.pif]), righe: [] }
  }

  return dati
}

/**
 * La scheda del corso ristretta alle ore tenute come supplente: le stesse
 * parti, ma contano solo le lezioni segnate `supplenza` e quel che nasce da
 * loro (prove fatte in quelle ore, consegne date o raccolte lì, piani usati).
 * Si restringe il registro invece di riscrivere la scheda, così le due non
 * possono raccontare in due modi diversi.
 */
export function datiSupplenze (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const sue = new Set(
    registro.lezioni.filter((l) => l.corsoId === corso.id && l.supplenza === true).map((l) => l.id),
  )
  const delCorso = (corsoId: string | null) => corsoId === corso.id
  const ristretto: Registro = {
    ...registro,
    lezioni: registro.lezioni.filter((l) => !delCorso(l.corsoId) || sue.has(l.id)),
    valutazioni: registro.valutazioni.filter(
      (v) => !delCorso(v.corsoId) || (v.lezioneId !== null && sue.has(v.lezioneId)),
    ),
    // I giorni si leggono sul registro intero: legata a un'ora non di
    // supplenza, nel registro ristretto la consegna perderebbe il «per quando».
    consegne: (registro.consegne ?? [])
      .filter(
        (c) =>
          !delCorso(c.corsoId) ||
          (c.dataLezioneId !== null && sue.has(c.dataLezioneId)) ||
          (c.scadenzaLezioneId !== null && sue.has(c.scadenzaLezioneId)),
      )
      .map((c) => ({
        ...c,
        data: dataConsegna(registro, c),
        scadenza: scadenzaConsegna(registro, c),
      })),
    // Un piano del corso resta solo se una supplenza l'ha usato.
    piani: registro.piani.filter(
      (p) =>
        !delCorso(p.corsoId) ||
        registro.lezioni.some((l) => sue.has(l.id) && l.pianoId === p.id),
    ),
  }
  const dati = datiCorso(ristretto, corso, semestre)
  dati.valori.titolo = testi().titoli.supplenze
  return dati
}
