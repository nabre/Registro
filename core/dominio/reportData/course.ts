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
import type { Corso, Registro, Semestre } from '#core/dominio/models.js'
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

  // Tutti i piani lezione del corso
  const pianiCorso = registro.piani.filter(
    (p) => p.corsoId === corso.id || lezioni.some((l) => l.pianoId === p.id),
  )
  dati.tabelle.piani = {
    ...colonne((c) => [c.titolo, c.ud, c.obiettivi, c.prerequisiti, c.stato]),
    pesi: [5, 2, 5, 4, 3],
    righe: pianiCorso.map((p) => {
      const lezioniConPiano = lezioni.filter((l) => l.pianoId === p.id)
      const durata = formattaDurata(
        minutiDiAttivita(
          p.attivita.reduce((s, a) => s + (a.durataUd || 0), 0),
          registro.impostazioni.minutiUd,
        ),
      )
      const stato = lezioniConPiano.length > 0
        ? lezioniConPiano.map((l) => formattaData(l.data)).join(', ')
        : t.bozza
      return [
        nomeDelPiano(registro, p),
        durata,
        p.obiettivi.join('; ') || '—',
        p.prerequisiti || '—',
        stato,
      ]
    }),
  }

  // Scaletta dettagliata di tutte le attività dei piani del corso
  const attivitaTuttiIPiani: string[][] = []
  for (const piano of pianiCorso) {
    for (const [i, attivita] of piano.attivita.entries()) {
      attivitaTuttiIPiani.push([
        nomeDelPiano(registro, piano),
        String(i + 1),
        [attivita.titolo || parole().senzaTitolo, attivita.descrizione].filter(Boolean).join(' — '),
        t.tipoAttivita(attivita.tipo),
        formattaDurata(minutiDiAttivita(attivita.durataUd, registro.impostazioni.minutiUd)),
        attivita.raggruppamento ? t.raggruppamento(attivita.raggruppamento) : '',
        attivita.valutazione
          ? `${t.tipoValutazione(attivita.valutazione.tipo)}${attivita.valutazione.peso !== 1 ? ` · ${t.pesoDi(attivita.valutazione.peso)}` : ''}`
          : '',
      ])
    }
  }
  dati.tabelle.scaletta = {
    ...colonne((c) => [c.titolo, c.numero, c.attivita, c.tipo, c.durata, c.come, c.prova]),
    pesi: [4, 1, 5, 2, 2, 2, 2],
    righe: attivitaTuttiIPiani,
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
