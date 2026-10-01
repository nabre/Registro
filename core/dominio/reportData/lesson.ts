// I rapporti di una lezione: il verbale di un'ora, la scaletta, il diario del corso.

import {
  confrontaLezioni,
  inizioLezione,
  minutiDiAttivita,
  contaUd,
  nomeCompleto,
  riepilogaPresenze,
  siglaPresenza,
  statoUd,
  unitaDidattiche,
  minutiRitardoOra,
} from '#core/dominio/calculations.js'
import { classeDelCorsoId, materiaDelCorso, registroDelCorso } from '#core/dominio/courses.js'
import { percento } from '#core/dominio/text.js'
import { matriceDelCorsoNelPeriodo } from '#core/dominio/courseMatrix.js'
import { nomeSegnoScritto } from '#core/dominio/observations.js'
import { vociDiLista } from '#core/dominio/lists.js'
import { dataConsegna } from '#core/dominio/assignments.js'
import {
  durataMinuti,
  etichettaSemestre,
  formattaData,
  formattaDurata,
  formattaUd,
  nelSemestre,
} from '#core/dominio/dates.js'
import type {
  CellaOsservata,
  Consegna,
  Corso,
  Lezione,
  PianoLezione,
  Registro,
  Semestre,
} from '#core/dominio/models.js'
import type { DatiRapporto } from '#core/dominio/reports.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './reportData.testi.js'
import {
  aChiConsegna,
  perQuando,
  vuoto,
  colonne,
  comuni,
  legenda,
  periodoDi,
  nomeAspetto,
} from './common.js'

/** L'orario di un'ora come lo si legge: gli slot in fila, le pause dichiarate. */
function orarioDi (lezione: Lezione): string {
  const pausa = testi().pausa
  return lezione.slot
    .map((s) => `${s.inizio}–${s.fine}${s.tipo === 'pausa' ? ` (${pausa})` : ''}`)
    .join(', ')
}

/** Il verbale di un'ora: quel che si è fatto, chi c'era, che cosa se ne è detto. */
export function datiLezione (
  registro: Registro,
  lezione: Lezione,
  consegne: Consegna[] = [],
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, lezione.corsoId)
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  const piano = registro.piani.find((p) => p.id === lezione.pianoId) ?? null
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const { minutiUd } = registro.impostazioni
  const ud = unitaDidattiche(lezione, minutiUd)
  // Nel piano le durate si leggono in minuti, come è stata scritta la scaletta.
  const minutiPerUd =
    ud.length > 0
      ? ud.reduce((somma, u) => somma + durataMinuti(u.inizio, u.fine), 0) / ud.length
      : minutiUd

  dati.valori = {
    ...comuni(registro, t.titoli.verbale, periodoDi(registro, lezione.data), [lezione.corsoId]),
    classe: classe?.nome ?? '',
    // La materia per conto suo, accanto alla classe: su un verbale sono due
    // informazioni diverse (a chi, di che cosa).
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    data: formattaData(lezione.data),
    orario: orarioDi(lezione),
    aula: lezione.aula ?? '',
    stato: t.statoLezione(lezione.stato),
    durata: formattaUd(ud.length),
    argomenti: lezione.argomenti ?? '',
    consuntivo: lezione.consuntivo ?? '',
    materiali: lezione.materiali ?? '',
    // I numeri dell'appello, per le frasi di `_testi.tpl`. Le due righe già
    // composte servono ai modelli che le chiamano per nome.
    presenti: String(riepilogo.presenti),
    conAppello: String(riepilogo.totale - riepilogo.senzaAppello),
    assenti: String(riepilogo.assenti),
    parziali: String(riepilogo.parziali),
    ritardi: String(riepilogo.ritardi),
    // Vuoto e non «0»: così il `se:` di un modello fa sparire la riga.
    udSenzaAppello: riepilogo.udSenzaAppello > 0 ? String(riepilogo.udSenzaAppello) : '',
    presenze: t.riepilogoPresenze(
      riepilogo.presenti,
      riepilogo.totale - riepilogo.senzaAppello,
      riepilogo.assenti,
      riepilogo.parziali,
      riepilogo.ritardi,
    ),
    // Un appello a metà si dichiara: caselle vuote taciute passerebbero per
    // presenze.
    appelloIncompleto:
      riepilogo.udSenzaAppello > 0 ? t.appelloIncompleto(riepilogo.udSenzaAppello) : '',
  }

  // L'appello come a schermo: una riga per allievo, una colonna per UD, le
  // stesse sigle. Le colonne portano l'ora d'inizio della UD.
  dati.tabelle.presenze = {
    ...colonne((c) => [c.pif, ...ud.map((u) => u.inizio), c.minuti, c.nota]),
    pesi: [5, ...ud.map(() => 1), 1, 4],
    righe: (classe?.allievi ?? []).map((allievo) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      return [
        nomeCompleto(allievo),
        ...ud.map((_, i) => siglaPresenza(statoUd(presenza, i))),
        minutiRitardoOra(presenza) ? String(minutiRitardoOra(presenza)) : '',
        presenza?.nota ?? '',
      ]
    }),
  }

  // La legenda: il foglio esce dal registro e lo legge chi non ha visto la griglia.
  legenda(dati)

  if (piano) {
    dati.elenchi.obiettivi = piano.obiettivi
    dati.tabelle.scaletta = {
      ...colonne((c) => [c.numero, c.attivita, c.tipo, c.durata, c.svolta]),
      pesi: [1, 6, 3, 2, 2],
      righe: piano.attivita.map((attivita, i) => {
        const stato = lezione.avanzamento.find((a) => a.attivitaId === attivita.id)?.stato ?? 'da-fare'
        return [
          String(i + 1),
          attivita.titolo || parole().senzaTitolo,
          t.tipoAttivita(attivita.tipo),
          formattaDurata(minutiDiAttivita(attivita.durataUd, minutiPerUd)),
          t.statiAttivita[stato] ?? stato,
        ]
      }),
    }
  }

  dati.tabelle.consegne = {
    ...colonne((c) => [c.tipo, c.cheCosa, c.aChi, c.perQuando]),
    pesi: [2, 6, 3, 2],
    righe: consegne.map((consegna) => [
      t.tipoConsegna(consegna.tipo),
      consegna.testo,
      aChiConsegna(consegna, nomi),
      perQuando(registro, consegna),
    ]),
  }

  dati.tabelle.osservazioni = {
    ...colonne((c) => [c.tipo, c.chi, c.cheCosa]),
    pesi: [2, 3, 8],
    righe: lezione.osservazioni.map((osservazione) => [
      t.tipoOsservazione(osservazione.tipo),
      osservazione.allievoId
        ? nomi.get(osservazione.allievoId) ?? osservazione.allievoId
        : t.classe,
      osservazione.testo,
    ]),
  }

  // Le caselle segnate sulla matrice del comportamento, in chiaro (le vuote
  // non si salvano). Colonne come nella griglia: chi, che aspetto, com'è
  // andata, la riga accanto.
  dati.tabelle.comportamento = {
    ...colonne((c) => [c.pif, c.aspetto, c.comeEAndata, c.annotazione]),
    pesi: [4, 3, 3, 6],
    righe: celleOrdinate(registro, lezione.matrice ?? [], nomi).map((cella) => [
      nomi.get(cella.allievoId) ?? cella.allievoId,
      nomeAspetto(registro, cella.aspetto),
      nomeSegnoScritto(cella.segno),
      cella.nota ?? '',
    ]),
  }

  return dati
}

/**
 * Le caselle di un'ora per persona, e dentro la persona nell'ordine della
 * lista degli aspetti, come le colonne della griglia a schermo.
 */
function celleOrdinate (
  registro: Registro,
  celle: CellaOsservata[],
  nomi: Map<string, string>,
): CellaOsservata[] {
  const ordine = vociDiLista(registro.impostazioni, 'aspettoOsservato').map((voce) => voce.valore)
  const quanto = (aspetto: string) => {
    const dove = ordine.indexOf(aspetto)
    // Gli aspetti tolti dalle impostazioni vanno in fondo: il segnato resta.
    return dove < 0 ? ordine.length : dove
  }
  return [...celle].sort(
    (a, b) =>
      (nomi.get(a.allievoId) ?? '').localeCompare(nomi.get(b.allievoId) ?? '', 'it') ||
      quanto(a.aspetto) - quanto(b.aspetto),
  )
}

/** La scaletta di un'ora, da portare in aula stampata. */
export function datiPiano (registro: Registro, piano: PianoLezione): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
  const classe = piano.corsoId ? classeDelCorsoId(registro, piano.corsoId) : null
  // Le ore che lo usano in ordine di data e d'ora; un'ora annullata non lo usa più.
  const usi = registro.lezioni
    .filter((l) => l.pianoId === piano.id && l.stato !== 'annullata')
    .sort(confrontaLezioni)

  dati.valori = {
    ...comuni(
      registro,
      t.titoli.piano,
      etichettaSemestre(null),
      piano.corsoId ? [piano.corsoId] : [],
    ),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    data: usi[0] ? formattaData(usi[0].data) : '',
    // Tutte, per il piano usato in più ore: il foglio dice quando serve.
    date: [...new Set(usi.map((l) => formattaData(l.data)))].join(', '),
    durata: formattaDurata(
      minutiDiAttivita(
        piano.attivita.reduce((somma, a) => somma + a.durataUd, 0),
        registro.impostazioni.minutiUd,
      ),
    ),
    prerequisiti: piano.prerequisiti ?? '',
    etichette: piano.tag.join(', '),
  }

  dati.elenchi.obiettivi = piano.obiettivi
  dati.tabelle.scaletta = {
    ...colonne((c) => [c.numero, c.attivita, c.tipo, c.durata, c.come, c.prova]),
    pesi: [1, 6, 3, 2, 3, 3],
    righe: piano.attivita.map((attivita, i) => [
      String(i + 1),
      [attivita.titolo || parole().senzaTitolo, attivita.descrizione].filter(Boolean).join(' — '),
      t.tipoAttivita(attivita.tipo),
      formattaDurata(minutiDiAttivita(attivita.durataUd, registro.impostazioni.minutiUd)),
      attivita.raggruppamento ? t.raggruppamento(attivita.raggruppamento) : '',
      attivita.valutazione
        ? `${t.tipoValutazione(attivita.valutazione.tipo)}${attivita.valutazione.peso !== 1 ? ` · ${t.pesoDi(attivita.valutazione.peso)}` : ''}`
        : '',
    ]),
  }

  dati.tabelle.materiali = {
    ...colonne((c) => [c.dove, c.materiale, c.origine]),
    pesi: [3, 5, 6],
    righe: [
      ...piano.risorse.map((r) => [t.tuttaLOra, r.titolo, r.url ?? r.nome ?? '']),
      ...piano.attivita.flatMap((a) =>
        a.risorse.map((r) => [a.titolo || t.unaTappa, r.titolo, r.url ?? r.nome ?? '']),
      ),
    ],
  }

  return dati
}

/**
 * Il diario cumulativo delle lezioni di un corso nel periodo scelto:
 * argomenti, compiti, assenze e note lezione per lezione.
 */
export function datiDiario (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  const lezioni = registroDelCorso(registro, corso.id)
    // Solo le ore confermate svolte: il diario racconta quel che è stato fatto.
    .filter((l) => l.stato === 'svolta' && (!semestre || nelSemestre(semestre, l.data)))
    .sort(confrontaLezioni)

  // I totali come a schermo; le righe del diario sono le sole svolte (sopra).
  const { matrice } = matriceDelCorsoNelPeriodo(registro, corso, semestre)
  const totali = matrice.classe

  dati.valori = {
    ...comuni(registro, t.titoli.diario, etichettaSemestre(semestre), [corso.id]),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    quanti: String(lezioni.length),
    udSvolte: String(matrice.ud),
    presenzaMedia: percento(totali.presenza),
  }

  const { minutiUd } = registro.impostazioni
  dati.tabelle.diario = {
    ...colonne((c) => [
      c.numero, c.data, c.ora, c.durata, c.argomenti, c.compiti, c.presenze, c.nota,
    ]),
    pesi: [1, 2, 1, 1, 5, 4, 3, 3],
    righe: lezioni.map((lezione, i) => {
      const ud = contaUd(lezione, minutiUd)
      const consegne = (registro.consegne ?? [])
        .filter(
          (c) =>
            c.corsoId === corso.id &&
            (c.dataLezioneId === lezione.id ||
              c.scadenzaLezioneId === lezione.id ||
              dataConsegna(registro, c) === lezione.data),
        )
        .map((c) => c.testo)
        .join('; ')

      const assenti = (classe?.allievi ?? []).filter((a) => {
        const p = lezione.presenze.find((pr) => pr.allievoId === a.id)
        return p && p.stati.some((s) => s === 'assente')
      })
      const testoPresenze = assenti.length === 0
        ? t.tuttiPresenti
        : `${assenti.length} ${t.assentiN(assenti.length)}: ${assenti.map((a) => a.cognome).join(', ')}`

      const nota = [lezione.consuntivo, lezione.materiali].filter(Boolean).join(' — ')

      return [
        String(i + 1),
        formattaData(lezione.data),
        inizioLezione(lezione) ?? '',
        formattaUd(ud),
        lezione.argomenti ?? '',
        consegne,
        testoPresenze,
        nota,
      ]
    }),
  }

  return dati
}
