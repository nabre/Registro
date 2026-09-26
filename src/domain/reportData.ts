// Che cosa il registro mette dentro un modello di rapporto: valori, elenchi,
// tabelle. Nel dominio perché è una domanda sul registro; l'impaginazione la
// decide il modello e la disegna `data/reportsPdf.ts`.

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  mediaAllievo,
  minutiDiAttivita,
  contaUd,
  notaFineSemestre,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  siglaPresenza,
  statoUd,
  unitaDidattiche,
} from './calculations.js'
import {
  classeDelCorsoId,
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from './courses.js'
import { LINGUA_PREDEFINITA, lingua, minuscolo, type Lingua } from '../i18n/index.js'
import { Maiuscola } from './lexicon.js'
import { percento } from './text.js'
import { scriviIndirizzo } from './addresses.js'
import { oltreSoglia, percentoAssenza } from './alerts.js'
import { primoTelefono, scriviTelefoni } from './phones.js'
import { matriceCorso, matriceDelCorsoNelPeriodo, udPrevisteDelCorso } from './courseMatrix.js'
import { celleDiAllievo, nomeSegnoScritto } from './observations.js'
import { testoDiVoce, vociDiLista } from './lists.js'
import { recuperiDelMomento, rigaDelRecupero } from './retakes.js'
import { riconsegneDegliAllievi } from './returns.js'
import {
  durataMinuti,
  etichettaSemestre,
  formattaData,
  formattaDurata,
  formattaUd,
  giornoDi,
  nelSemestre,
  oggi,
  semestreDi,
} from './dates.js'
import type {
  Allievo,
  CellaOsservata,
  Classe,
  Consegna,
  Corso,
  MomentoValutazione,
  Iso,
  Lezione,
  PianoLezione,
  Registro,
  Semestre,
} from './models.js'
import { nomiDiSerie, type DatiRapporto, type Tabella } from './reports.js'
import { annoInUso } from './years.js'
import { cartaDeiCorsi } from './letterhead.js'
import { parole } from './words.testi.js'
import { testi } from './reportData.testi.js'

/** Un rapporto vuoto su cui i costruttori scrivono. */
function vuoto (): DatiRapporto {
  return { valori: {}, elenchi: {}, tabelle: {}, grafici: {} }
}

/**
 * I nomi delle colonne in una lingua: quelli dei rapporti sopra le parole di
 * tutti (`parole()`: «Data», «Tipo», «Stato»…).
 */
function nomiDiColonna (scelta: Lingua) {
  return { ...parole.in(scelta), ...testi.in(scelta).colonne }
}

type Colonne = ReturnType<typeof nomiDiColonna>

/**
 * L'intestazione di una tabella nella lingua di stampa, con accanto (fuori
 * dall'italiano) i nomi di serie con cui i modelli scelgono le colonne (vedi
 * `Tabella.chiavi`). La scelta si chiama due volte, una per lingua.
 */
function colonne (scegli: (c: Colonne) => string[]): Pick<Tabella, 'intestazione' | 'chiavi'> {
  const intestazione = scegli(nomiDiColonna(lingua()))
  const chiavi = scegli(nomiDiColonna(LINGUA_PREDEFINITA))
  return chiavi.every((nome, i) => nome === intestazione[i])
    ? { intestazione }
    : { intestazione, chiavi }
}

/**
 * I valori comuni a ogni rapporto, usati dall'intestazione. `periodo` non è
 * mai vuoto: senza semestre è l'anno, e va detto.
 */
function comuni (
  registro: Registro,
  titolo: string,
  periodo: string,
  corsiIds: readonly string[],
): Record<string, string> {
  const anno = annoInUso(registro)
  // La carta intestata la decide il corso del foglio: scuola in cima e, con
  // `carta`, il logo. Chi firma è uno solo per tutte le carte.
  const intestazione = registro.impostazioni.intestazione
  const carta = cartaDeiCorsi(intestazione, corsiIds)
  return {
    titolo,
    anno: anno?.etichetta ?? '',
    periodo,
    generato: formattaData(oggi()),
    sede: carta.sede,
    docente: intestazione.docente,
    [CHIAVE_CARTA]: carta.id,
  }
}

/**
 * La chiave dei valori con l'id della carta intestata: non si stampa, ma dice
 * a chi compone il PDF quale logo mettere, deciso qui insieme alla sede.
 */
export const CHIAVE_CARTA = 'cartaIntestata'

/**
 * La legenda delle sigle dell'appello, per chi non ha visto lo schermo. Le
 * sigle vengono dal codice; la frase la decide `_testi.tpl`
 * (`legenda-presenze`). `{{legendaPresenze}}` è composta qui per i modelli che
 * non usano `_testi.tpl`.
 */
function legenda (dati: DatiRapporto): void {
  const vive = SIGLE_PRESENZA.filter((v) => v.valore !== 'non-impostato')
  for (const voce of vive) {
    const nome = voce.valore.replace(/-(.)/g, (_, c: string) => c.toUpperCase())
    dati.valori[`sigla${Maiuscola(nome)}`] = voce.sigla
    dati.valori[`nome${Maiuscola(nome)}`] = minuscolo(voce.nome)
  }
  dati.valori.legendaPresenze = vive.map((v) => `${v.sigla} ${minuscolo(v.nome)}`).join(' · ')
}

/** Come si chiama il semestre in cui cade un giorno, per la testata. */
function periodoDi (registro: Registro, giorno: Iso): string {
  const anno = annoInUso(registro)
  return etichettaSemestre(anno ? semestreDi(anno, giorno) : null)
}

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
        presenza?.minuti ? String(presenza.minuti) : '',
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
      consegna.a === 'docente'
        ? t.docente
        : consegna.a === 'allievi'
          ? consegna.allieviIds.map((id) => nomi.get(id) ?? id).join(', ')
          : t.tuttaLaClasse,
      consegna.scadenza ? formattaData(consegna.scadenza) : '',
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

/** Come si chiama un aspetto osservato, con le parole delle impostazioni. */
function nomeAspetto (registro: Registro, valore: string): string {
  return testoDiVoce(registro.impostazioni, 'aspettoOsservato', valore)
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
  const usi = registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => a.data.localeCompare(b.data))

  dati.valori = {
    ...comuni(registro, t.titoli.piano, etichettaSemestre(null), piano.corsoId ? [piano.corsoId] : []),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    data: usi[0] ? formattaData(usi[0].data) : '',
    durata: formattaDurata(
      minutiDiAttivita(
        piano.attivita.reduce((somma, a) => somma + a.durataUd, 0),
        registro.impostazioni.minutiUd,
      ),
    ),
    prerequisiti: piano.prerequisiti ?? '',
    note: piano.note ?? '',
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
 * Le valutazioni di un corso in un semestre: la griglia con le medie. Di un
 * corso e non di una classe, perché la media di materie diverse non è la
 * media di niente.
 */
export function datiValutazioni (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  const momenti = registro.valutazioni
    .filter((v) => v.corsoId === corso.id)
    .filter((v) => !semestre || (v.data >= semestre.inizio && v.data <= semestre.fine))
    .sort((a, b) => a.data.localeCompare(b.data))

  dati.valori = {
    ...comuni(registro, t.titoli.valutazioni, etichettaSemestre(semestre), [corso.id]),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    periodo: etichettaSemestre(semestre),
    quanti: String(momenti.length),
  }

  const giorno = oggi()
  // Tutti i recuperi delle prove del periodo: spiegano le caselle vuote.
  const recuperi = momenti.flatMap((momento) =>
    recuperiDelMomento(registro, momento, classe, giorno),
  )

  /** La casella di un allievo in una prova, con quel che il recupero aggiunge. */
  const casella = (momento: MomentoValutazione, allievoId: string): string => {
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    const riga = rigaDelRecupero(momento, allievoId)
    if (voto?.valore !== null && voto?.valore !== undefined) {
      // La «R» dice che il voto viene da un'altra giornata.
      return riga ? t.rifatto(String(voto.valore)) : String(voto.valore)
    }
    if (riga?.dispensato) return t.dispensato
    if (riga?.previstoIl) return t.previstoIl(formattaData(riga.previstoIl))
    if (voto?.assente) return t.assente
    return ''
  }

  // Una colonna per momento, e in fondo la media.
  dati.tabelle.voti = {
    ...colonne((c) => [
      c.pif,
      ...momenti.map((m) => `${formattaData(m.data)} ${m.titolo}`),
      c.media,
      c.notaSemestre,
    ]),
    pesi: [4, ...momenti.map(() => 2), 2, 2],
    righe: (classe?.allievi ?? []).map((allievo) => {
      const suoi = momenti.map((momento) => casella(momento, allievo.id))
      // Media e nota di pagella tutte e due, se no l'arrotondamento lo rifà a
      // mente chi legge.
      const media = mediaAllievo(momenti, allievo.id)
      const nota = notaFineSemestre(
        media.media,
        registro.impostazioni.scala,
        registro.impostazioni.passoFineSemestre,
      )
      return [
        nomeCompleto(allievo),
        ...suoi,
        media.media === null ? '' : media.media.toFixed(2),
        nota === null ? '' : formattaVoto(nota),
      ]
    }),
  }

  // La stessa griglia con le date al posto dei voti: quando ognuno ha fatto la
  // prova e quando l'ha riavuta, le due cose che si contestano. Per chi ha
  // recuperato vale il giorno del recupero.
  const esecuzione = (momento: MomentoValutazione, allievoId: string): string => {
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    const riga = rigaDelRecupero(momento, allievoId)
    if (riga?.dispensato) return t.dispensato
    // Prima il recupero: se la prova è stata rifatta, vale quel giorno.
    if (riga?.previstoIl) return formattaData(riga.previstoIl)
    if (riga) return t.statiRecupero['da-fissare']
    if (voto?.assente) return t.assente
    if (voto?.valore === null || voto === undefined) return ''
    return formattaData(momento.data)
  }

  /** Il giorno in cui quel foglio è tornato in mano a lui, se è tornato. */
  const riconsegna = (momento: MomentoValutazione, allievoId: string): Iso | null => {
    const riga = rigaDelRecupero(momento, allievoId)
    // Prima il recupero: chi ha rifatto la prova ha riavuto quel foglio.
    if (riga) return riga.riconsegnataIl ?? null
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    return voto?.riconsegnataIl ?? null
  }

  dati.tabelle.esecuzioni = {
    ...colonne((c) => [
      c.pif,
      ...momenti.map((m) => m.titolo),
    ]),
    // Colonne larghe: due date per esteso in ogni casella.
    pesi: [4, ...momenti.map(() => 4)],
    righe: (classe?.allievi ?? []).map((allievo) => [
      nomeCompleto(allievo),
      ...momenti.map((momento) => {
        const fatta = esecuzione(momento, allievo.id)
        if (fatta === '') return ''
        const resa = riconsegna(momento, allievo.id)
        // Il trattino dice «non ancora riconsegnata»: è proprio quel che si
        // viene a chiedere.
        return `${fatta} > ${resa ? formattaData(resa) : '-'}`
      }),
    ]),
  }

  dati.tabelle.momenti = {
    ...colonne((c) => [c.data, c.titolo, c.tipo, c.peso, c.voti, c.recuperi, c.riconsegna]),
    pesi: [2, 5, 3, 1, 1, 2, 2],
    righe: momenti.map((momento) => {
      const suoi = recuperi.filter((r) => r.momento.id === momento.id)
      // Aperto anche il recupero valutato ma non ancora ridato, come nel todo.
      const aperti = suoi.filter(
        (r) => r.stato !== 'dispensato' && !(r.stato === 'fatto' && r.riconsegnataIl),
      ).length
      return [
        formattaData(momento.data),
        momento.titolo,
        t.tipoValutazione(momento.tipo),
        String(momento.peso),
        String(momento.voti.filter((v) => v.valore !== null).length),
        suoi.length === 0
          ? ''
          : aperti === 0
            ? t.chiusi(suoi.length)
            : t.apertiDi(aperti, suoi.length),
        // La riconsegna è per allievo: «resa a tutti» solo se qualcuno l'ha
        // davvero riavuta, se no una prova non corretta risulterebbe finita.
        resiUnoPerUno(momento, classe) ? t.resaATutti : t.daRiconsegnare,
      ]
    }),
  }

  // Le prove da rifare, nome per nome: rispondono a «e questo?» davanti a una
  // casella vuota.
  dati.tabelle.recuperi = {
    ...colonne((c) => [c.pif, c.prova, c.siRifaIl, c.voto, c.riconsegnata, c.stato]),
    pesi: [4, 5, 2, 1, 2, 3],
    righe: recuperi.map((recupero) => [
      nomeCompleto(recupero.allievo),
      recupero.momento.titolo,
      recupero.previstoIl ? formattaData(recupero.previstoIl) : '',
      recupero.voto === null ? '' : String(recupero.voto),
      recupero.riconsegnataIl ? formattaData(recupero.riconsegnataIl) : '',
      t.statiRecupero[recupero.stato],
    ]),
  }

  // Chi non ha ancora riavuto la sua prova (mancava alla ridistribuzione).
  dati.tabelle.daRidare = {
    ...colonne((c) => [c.pif, c.prova, c.voto]),
    pesi: [4, 6, 1],
    righe: momenti.flatMap((momento) =>
      riconsegneDegliAllievi(momento, classe, true).map((riga) => [
        nomeCompleto(riga.allievo),
        momento.titolo,
        String(riga.voto),
      ]),
    ),
  }

  return dati
}

/**
 * Una prova sola, per esteso: chi ha preso che cosa, nota, recupero, data di
 * riconsegna, e la forma della distribuzione. È il foglio del giorno della
 * riconsegna o di una contestazione, dove la griglia del corso non ha posto.
 */
export function datiMomento (registro: Registro, momento: MomentoValutazione): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const corso = registro.corsi.find((c) => c.id === momento.corsoId) ?? null
  const classe = corso ? classeDelCorsoId(registro, corso.id) : null
  const conti = distribuzione(momento)
  const scala = momento.scala

  dati.valori = {
    ...comuni(registro, t.titoli.momento, periodoDi(registro, momento.data), [momento.corsoId]),
    classe: classe?.nome ?? '',
    materia: corso ? materiaDelCorso(registro, corso)?.nome ?? '' : '',
    corso: corso?.titolo ?? '',
    prova: momento.titolo,
    data: formattaData(momento.data),
    tipo: t.tipoValutazione(momento.tipo),
    peso: String(momento.peso),
    scala: t.scala(
      formattaVoto(scala.min),
      formattaVoto(scala.max),
      formattaVoto(scala.sufficienza),
    ),
    descrizione: momento.descrizione ?? '',
    voti: String(conti.conteggio),
    media: conti.media === null ? '—' : formattaVoto(conti.media),
    minimo: conti.minimo === null ? '—' : formattaVoto(conti.minimo),
    massimo: conti.massimo === null ? '—' : formattaVoto(conti.massimo),
    // Il conto che si dice ad alta voce riconsegnando, scritto una volta.
    sufficienti:
      conti.conteggio === 0
        ? '—'
        : t.suTanti(conti.sufficienti, conti.conteggio, percento(conti.quotaSufficienti)),
    insufficienti: conti.conteggio === 0 ? '—' : String(conti.insufficienti),
    // Non c'è una data della riconsegna ma una per allievo: qui si dice a che
    // punto è il giro.
    riconsegna: resiUnoPerUno(momento, classe) ? t.tornataATutti : t.nonAncoraATutti,
  }

  // Il disegno lo prepara il dominio: lo stesso a schermo e sul proiettore.
  dati.grafici.distribuzione = distribuzioneAPunti(momento)

  const giorno = oggi()
  const recuperi = recuperiDelMomento(registro, momento, classe, giorno)

  // Una riga per allievo, anche senza voto: la casella vuota è quel che si
  // viene a chiedere.
  dati.tabelle.voti = {
    ...colonne((c) => [c.pif, c.voto, c.recupero, c.riconsegnata, c.nota]),
    pesi: [5, 1, 3, 2, 6],
    righe: ordinaAllievi(classe ? allieviAttivi(classe) : []).map(
      (allievo) => {
        const voto = momento.voti.find((v) => v.allievoId === allievo.id)
        const riga = rigaDelRecupero(momento, allievo.id)
        const recupero = riga?.dispensato
          ? t.statiRecupero.dispensato
          : riga?.previstoIl
            ? t.delGiorno(formattaData(riga.previstoIl))
            : riga
              ? t.statiRecupero['da-fissare']
              : ''
        // La riconsegna del recupero se l'ha rifatta, altrimenti la sua.
        const resa = riga ? riga.riconsegnataIl : voto?.riconsegnataIl ?? null
        return [
          nomeCompleto(allievo),
          voto?.assente
            ? t.assente
            : voto?.valore === null || voto === undefined
              ? ''
              : String(voto.valore),
          recupero,
          resa ? formattaData(resa) : '',
          voto?.nota ?? '',
        ]
      },
    ),
  }

  // Chi la deve rifare: spiega le caselle vuote qui sopra.
  dati.tabelle.recuperi = {
    ...colonne((c) => [c.pif, c.siRifaIl, c.voto, c.riconsegnata, c.stato]),
    pesi: [5, 2, 1, 2, 3],
    righe: recuperi.map((recupero) => [
      nomeCompleto(recupero.allievo),
      recupero.previstoIl ? formattaData(recupero.previstoIl) : '',
      recupero.voto === null ? '' : String(recupero.voto),
      recupero.riconsegnataIl ? formattaData(recupero.riconsegnataIl) : '',
      t.statiRecupero[recupero.stato],
    ]),
  }

  return dati
}

/**
 * Vero se ogni foglio è tornato al suo allievo senza una data di gruppo (chi
 * riconsegna in più volte non la scrive mai).
 */
function resiUnoPerUno (momento: MomentoValutazione, classe: Classe | null): boolean {
  const suoi = riconsegneDegliAllievi(momento, classe)
  return suoi.length > 0 && suoi.every((riga) => riga.riconsegnataIl !== null)
}

/**
 * Il conto delle presenze di un corso in un semestre (con `semestre` nullo
 * l'anno intero, scritto in testata): per semestre, perché chi comincia a
 * mancare dopo gennaio si veda. I numeri sono quelli di `matriceCorso`, come
 * nella vista Corsi.
 */
export function datiPresenze (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  const periodo = etichettaSemestre(semestre)

  // Ore del periodo senza annullate e UD previste: li conta
  // `matriceDelCorsoNelPeriodo`, come segnalazioni e CSV.
  const { lezioni, matrice } = matriceDelCorsoNelPeriodo(registro, corso, semestre)
  const totali = matrice.classe

  dati.valori = {
    ...comuni(registro, t.titoli.presenze, periodo, [corso.id]),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    quanti: String(lezioni.length),
    ud: String(matrice.udPreviste),
    udTenute: String(matrice.ud),
    presenza: percento(totali.presenza),
    assenza: percento(totali.assenza),
  }

  // Due percentuali: «% assenza» sulle ore previste (la cifra che si consegna)
  // e «% appello» sulle UD con l'appello fatto (quanto è affidabile la prima).
  dati.tabelle.presenze = {
    ...colonne((c) => [
      c.pif,
      c.udCorso,
      c.udSeguite,
      c.percPresenza,
      c.udAssenza,
      c.percAssenza,
      c.ritardi,
      c.udConAppello,
      c.percAppello,
    ]),
    pesi: [5, 2, 2, 2, 2, 2, 2, 2, 2],
    righe: [
      ...matrice.righe.map((riga) => [
        nomeCompleto(riga.allievo),
        String(riga.udPreviste),
        String(riga.udPresenza),
        percento(riga.presenzaPreviste),
        String(riga.udAssenza),
        percento(riga.assenza),
        String(riga.ritardi),
        String(riga.udConAppello),
        percento(riga.presenza),
      ]),
      // La riga della classe in fondo: il numero che si legge per primo.
      [
        t.rigaClasse,
        String(totali.udPreviste),
        String(totali.udPresenza),
        percento(totali.presenzaPreviste),
        String(totali.udAssenza),
        percento(totali.assenza),
        String(totali.ritardi),
        String(totali.udConAppello),
        percento(totali.presenza),
      ],
    ],
  }

  // Chi è oltre la soglia, per nome. Vuoto (nessuno, o segnalazione spenta)
  // la sezione sparisce.
  dati.elenchi.oltreSoglia = matrice.righe
    .filter((riga) => sopraLaSoglia(registro, riga.assenza))
    .map(
      (riga) =>
        // `percentoAssenza`: 45 UD su 224 sono il 20,09%, non «20%» sotto
        // «oltre il 20%».
        t.oltreSoglia(
          nomeCompleto(riga.allievo),
          percentoAssenza(riga.assenza, registro.impostazioni.sogliaAssenza),
          riga.udPreviste,
          riga.udAssenza,
        ),
    )
  dati.valori.sogliaAssenza = String(registro.impostazioni.sogliaAssenza)

  // Le due regole si dichiarano sul foglio, se no le due percentuali
  // sembrerebbero in contraddizione. I due numeri anche da soli, per chi
  // riscrive la frase in `_testi.tpl`.
  dati.valori.udPrevisteCorso = String(matrice.udPreviste)
  dati.valori.udACalendario = String(matrice.ud)
  dati.valori.nota = t.notaPresenze(matrice.udPreviste, matrice.ud)

  return dati
}

/**
 * La parete di ritratti di una classe: una faccia, un nome, per imparare i
 * nomi o per una supplenza. Tutti quelli che frequentano, con foto o senza:
 * chi non ce l'ha tiene il posto segnato.
 */
export function datiFotoClasse (registro: Registro, classe: Classe): DatiRapporto {
  const dati = vuoto()
  // Nell'ordine dell'elenco di classe, come il registro delle presenze.
  const attivi = ordinaAllievi(allieviAttivi(classe))

  dati.valori = {
    ...comuni(registro, testi().titoli.foto, etichettaSemestre(null), corsiDellaClasse(registro, classe.id).map((c) => c.id)),
    classe: classe.nome,
    // La parete è della classe, non di un insegnamento: vuoti perché la
    // testata comune li nomina.
    materia: '',
    corso: '',
    allievi: String(attivi.length),
    conFoto: String(attivi.filter((a) => a.foto).length),
  }

  dati.gallerie = {
    allievi: {
      celle: attivi.map((allievo) => ({
        immagine: allievo.foto ?? '',
        titolo: nomeCompleto(allievo),
        sotto: allievo.azienda ?? '',
      })),
    },
  }

  return dati
}

export function datiFascicolo (registro: Registro, classe: Classe): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const fascicolo = registro.fascicoli.find((f) => f.classeId === classe.id) ?? null

  dati.valori = {
    // L'anno intero: recapiti, documenti e comunicazioni non si azzerano a gennaio.
    ...comuni(registro, t.titoli.fascicolo, etichettaSemestre(null), corsiDellaClasse(registro, classe.id).map((c) => c.id)),
    classe: classe.nome,
    // Il fascicolo è della classe: materia e corso esistono vuoti perché la
    // testata li nomina, e un valore assente sembrerebbe dimenticato.
    materia: '',
    corso: '',
    allievi: String(classe.allievi.length),
    corsi: corsiDellaClasse(registro, classe.id)
      .map((c) => c.titolo)
      .join(', '),
  }

  // Chi è e come la si raggiunge: quel che serve a chi subentra.
  dati.tabelle.allievi = {
    ...colonne((c) => [
      c.pif,
      c.nascita,
      c.indirizzo,
      c.email,
      c.rappresentante,
      c.azienda,
      c.datore,
    ]),
    pesi: [4, 2, 5, 4, 4, 3, 4],
    righe: classe.allievi.map((allievo: Allievo) => [
      nomeCompleto(allievo),
      allievo.dataNascita ? formattaData(allievo.dataNascita) : '',
      scriviIndirizzo(allievo.indirizzo),
      allievo.email ?? '',
      allievo.emailTutore ?? '',
      allievo.azienda ?? '',
      allievo.emailDatore ?? '',
    ]),
  }

  dati.tabelle.documenti = {
    ...colonne((c) => [c.documento, c.categoria, c.diChi, c.raccoltoIl]),
    pesi: [5, 3, 4, 2],
    righe: (fascicolo?.documenti ?? []).map((documento) => [
      documento.titolo,
      t.categoria(documento.categoria),
      documento.allievoId
        ? nomeCompleto(classe.allievi.find((a) => a.id === documento.allievoId) ?? ({ cognome: '', nome: '' } as Allievo))
        : t.laClasse,
      documento.aggiuntoIl ? formattaData(giornoDi(documento.aggiuntoIl) ?? documento.aggiuntoIl.slice(0, 10)) : '',
    ]),
  }

  dati.tabelle.assenze = {
    ...colonne((c) => [c.periodo, c.dal, c.al, c.righe]),
    pesi: [5, 2, 2, 2],
    righe: (fascicolo?.assenze ?? []).map((blocco) => [
      blocco.etichetta,
      formattaData(blocco.dal),
      formattaData(blocco.al),
      String(blocco.righe.length),
    ]),
  }

  return dati
}

/**
 * La colonna del corso via, quando il corso è uno solo: lo dicono già testata,
 * sottotitolo e nome del file, e la larghezza serve agli argomenti.
 */
function senzaColonnaCorso (tabella: Tabella): Tabella {
  // Per nome di serie: in un foglio tedesco la colonna si chiama «Kurs».
  const dove = nomiDiSerie(tabella).indexOf(testi.in(LINGUA_PREDEFINITA).colonne.corso)
  if (dove < 0) return tabella
  const togli = <T>(elenco: T[]): T[] => elenco.filter((_, i) => i !== dove)
  return {
    intestazione: togli(tabella.intestazione),
    ...(tabella.chiavi ? { chiavi: togli(tabella.chiavi) } : {}),
    ...(tabella.pesi ? { pesi: togli(tabella.pesi) } : {}),
    ...(tabella.totale ? { totale: togli(tabella.totale) } : {}),
    righe: tabella.righe.map(togli),
  }
}

/** Se un'assenza supera la soglia: la regola sta in `alerts.ts`, come per il todo. */
function sopraLaSoglia (registro: Registro, assenza: number | null): boolean {
  return oltreSoglia(registro.impostazioni.sogliaAssenza, assenza)
}

/** La frase d'avviso quando un'assenza supera la soglia, o vuoto. */
function avvisoAssenza (registro: Registro, assenza: number | null): string {
  if (!sopraLaSoglia(registro, assenza)) return ''
  const soglia = registro.impostazioni.sogliaAssenza
  // Appena oltre, l'intero arrotondato cade sulla soglia (20,09% di 45 UD su
  // 224): un decimale per eccesso, come nella pagina Assenze.
  return testi().avvisoAssenza(percentoAssenza(assenza, soglia), soglia)
}

/**
 * La scheda di un allievo in un corso: medie, prove e assenze di quella
 * materia. `corso` nullo solo se la classe non ne ha nessuno, e allora parla
 * di tutti; altrimenti un corso solo, perché la media di materie diverse non è
 * la media di niente.
 */
export function datiAllievo (
  registro: Registro,
  classe: Classe,
  allievo: Allievo,
  semestre: Semestre | null,
  corso: Corso | null,
): DatiRapporto {
  const t = testi()
  const dati = vuoto()
  const corsi = corso ? [corso] : corsiDellaClasse(registro, classe.id)
  const nelPeriodo = (data: string) => nelSemestre(semestre, data)

  // Le presenze in cifre, dalla stessa matrice della vista Corsi: è il primo
  // numero che si chiede a un colloquio.
  const oreDiCorso = new Map(
    corsi.map((suo) => [
      suo.id,
      registroDelCorso(registro, suo.id).filter(
        (l) => l.stato !== 'annullata' && nelPeriodo(l.data),
      ),
    ]),
  )
  const oreDelPeriodo = corsi.flatMap((suo) => oreDiCorso.get(suo.id) ?? [])
  // Con più corsi il monte ore è la somma dei loro. Il ripiego per un corso
  // senza orario fisso si fa corso per corso, non sulla somma: se no un corso
  // senza orario metterebbe ore al numeratore e niente al denominatore.
  const previste = corsi.reduce((somma, suo) => {
    const daOrario = udPrevisteDelCorso(registro, suo, semestre)
    if (daOrario > 0) return somma + daOrario
    const sue = oreDiCorso.get(suo.id) ?? []
    return somma + sue.reduce((totale, l) => totale + contaUd(l, registro.impostazioni.minutiUd), 0)
  }, 0)
  const riga = matriceCorso([allievo], oreDelPeriodo, [], registro.impostazioni, previste).righe[0]

  dati.valori = {
    ...comuni(registro, t.titoli.scheda, etichettaSemestre(semestre), corsi.map((c) => c.id)),
    classe: classe.nome,
    materia: corso ? materiaDelCorso(registro, corso)?.nome ?? '' : '',
    // Detto per esteso invece che vuoto: il sottotitolo lo mette in fila col
    // periodo.
    corso: corso?.titolo ?? t.tuttiICorsi,
    allievo: nomeCompleto(allievo),
    // Un ritirato lo dice il foglio: la sua scheda si stampa ancora, e i conti
    // si fermano.
    stato: allievo.attivo ? '' : t.ritirato,
    udPreviste: String(riga?.udPreviste ?? 0),
    udSeguite: String(riga?.udPresenza ?? 0),
    udAssenza: String(riga?.udAssenza ?? 0),
    ritardi: String(riga?.ritardi ?? 0),
    assenza: percento(riga?.assenza),
    presenza: percento(riga?.presenzaPreviste),
    appello: percento(riga?.presenza, t.appelloMaiFatto),
    // L'avviso di soglia, come frase fatta che il modello stampa in un
    // riquadro.
    avvisoAssenza: avvisoAssenza(registro, riga?.assenza ?? null),
    nota: t.notaScheda,
    email: allievo.email ?? '',
    // Tutta l'anagrafica: la scheda si porta a un colloquio o si passa a chi
    // subentra.
    indirizzo: scriviIndirizzo(allievo.indirizzo),
    // I pezzi, per chi intesta una busta.
    via: allievo.indirizzo?.via ?? '',
    cap: allievo.indirizzo?.cap ?? '',
    localita: allievo.indirizzo?.localita ?? '',
    // Nel formato che si legge, non in ISO.
    nascita: allievo.dataNascita ? formattaData(allievo.dataNascita) : '',
    datore: allievo.emailDatore ?? '',
    // Il ritratto (`immagine: {{foto}}`): senza foto la riga sparisce da sé.
    foto: allievo.foto ?? '',
    tutore: allievo.emailTutore ?? '',
    azienda: allievo.azienda ?? '',
    indirizzoDatore: scriviIndirizzo(allievo.indirizzoDatore),
    viaDatore: allievo.indirizzoDatore?.via ?? '',
    capDatore: allievo.indirizzoDatore?.cap ?? '',
    localitaDatore: allievo.indirizzoDatore?.localita ?? '',
    periodo: etichettaSemestre(semestre),
    // Il primo numero di ciascuno, per i modelli con una casella sola (l'ordine
    // lo decide l'anagrafica).
    telefono: primoTelefono(allievo, 'pif'),
    telefonoDatore: primoTelefono(allievo, 'datore'),
    // E tutti quanti, per chi li vuole tutti.
    telefoni: scriviTelefoni(allievo, 'pif'),
    telefoniRappresentante: scriviTelefoni(allievo, 'rappresentante'),
    telefoniDatore: scriviTelefoni(allievo, 'datore'),
  }

  // Media, numero di prove e nota del corso della scheda: i tre numeri che si
  // cercano per primi. Con più corsi restano vuoti e il modello mostra la
  // tabella.
  const unico = corsi.length === 1 ? corsi[0] : null
  const suoDelPeriodo = unico
    ? registro.valutazioni.filter((v) => v.corsoId === unico.id && nelPeriodo(v.data))
    : []
  const conto = unico ? mediaAllievo(suoDelPeriodo, allievo.id) : null
  const notaSua = conto
    ? notaFineSemestre(
        conto.media,
        registro.impostazioni.scala,
        registro.impostazioni.passoFineSemestre,
      )
    : null

  dati.valori.prove = conto ? String(conto.conteggio) : ''
  dati.valori.media = conto?.media === null || conto === null ? '' : conto.media.toFixed(2)
  dati.valori.notaSemestre = notaSua === null ? '' : formattaVoto(notaSua)

  dati.tabelle.medie = {
    ...colonne((c) => [c.corso, c.prove, c.media, c.notaSemestre]),
    pesi: [8, 2, 2, 2],
    righe: corsi
      .map((corso) => {
        const suoi = registro.valutazioni.filter(
          (v) => v.corsoId === corso.id && nelPeriodo(v.data),
        )
        const media = mediaAllievo(suoi, allievo.id)
        const nota = notaFineSemestre(
          media.media,
          registro.impostazioni.scala,
          registro.impostazioni.passoFineSemestre,
        )
        return [
          corso.titolo,
          String(media.conteggio),
          media.media === null ? '' : media.media.toFixed(2),
          nota === null ? '' : formattaVoto(nota),
        ]
      })
      .filter((riga) => riga[1] !== '0'),
  }

  dati.tabelle.prove = {
    // Recupero e riconsegna in chiaro: sono le cose che si contestano. Il peso
    // accanto al voto spiega la media.
    ...colonne((c) => [c.data, c.corso, c.prova, c.peso, c.voto, c.recupero, c.riconsegnata]),
    pesi: [2, 4, 5, 1, 1, 3, 2],
    // Numero di prove e media in fondo alla colonna dei voti; con più corsi
    // non c'è.
    ...(conto && conto.media !== null
      ? {
          totale: [
            t.totale,
            '',
            t.prove(conto.conteggio),
            '',
            conto.media.toFixed(2),
            '',
            '',
          ],
        }
      : {}),
    righe: registro.valutazioni
      .filter((v) => corsi.some((c) => c.id === v.corsoId) && nelPeriodo(v.data))
      .filter(
        (v) =>
          v.voti.some((voto) => voto.allievoId === allievo.id) ||
          rigaDelRecupero(v, allievo.id) !== null,
      )
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((momento) => {
        const voto = momento.voti.find((v) => v.allievoId === allievo.id)
        const riga = rigaDelRecupero(momento, allievo.id)
        const recupero = riga?.dispensato
          ? t.statiRecupero.dispensato
          : riga?.previstoIl
            ? t.delGiorno(formattaData(riga.previstoIl))
            : riga
              ? t.statiRecupero['da-fissare']
              : ''
        // La riconsegna del recupero se l'ha rifatta, altrimenti la sua.
        const resa = riga ? riga.riconsegnataIl : voto?.riconsegnataIl ?? null
        return [
          formattaData(momento.data),
          registro.corsi.find((c) => c.id === momento.corsoId)?.titolo ?? '',
          momento.titolo,
          // Peso zero per esteso: uno «0» sembrerebbe un voto mancante.
          momento.peso === 0 ? t.nonConta : String(momento.peso),
          voto?.assente ? t.assente : voto?.valore === null || voto === undefined ? '' : String(voto.valore),
          recupero,
          resa ? formattaData(resa) : '',
        ]
      }),
  }

  // Le presenze come a schermo: una riga per ora, una colonna per UD, le
  // stesse sigle. Così un'ora senza appello si distingue da una regolare, e
  // un'assenza di mezza mattina da una di tutto il giorno.
  const ore = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => l.stato !== 'annullata' && nelPeriodo(l.data))
    .sort((a, b) => a.data.localeCompare(b.data))

  // Colonne dell'ora più lunga del periodo: le caselle che non esistono
  // restano vuote, perché il trattino vuol dire «UD senza appello».
  const { minutiUd } = registro.impostazioni
  const quanteUd = ore.reduce((massimo, l) => Math.max(massimo, contaUd(l, minutiUd)), 0)
  const perUd = <T>(fai: (i: number) => T): T[] =>
    Array.from({ length: quanteUd }, (_, i) => fai(i))

  dati.tabelle.presenze = {
    ...colonne((c) => [c.data, c.corso, ...perUd((i) => String(i + 1)), c.minuti, c.nota]),
    pesi: [2, 4, ...perUd(() => 1), 1, 4],
    righe: ore.map((lezione) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      const sue = contaUd(lezione, minutiUd)
      return [
        formattaData(lezione.data),
        registro.corsi.find((c) => c.id === lezione.corsoId)?.titolo ?? '',
        ...perUd((i) => (i < sue ? siglaPresenza(statoUd(presenza, i)) : '')),
        presenza?.minuti ? String(presenza.minuti) : '',
        presenza?.nota ?? '',
      ]
    }),
  }

  // La legenda delle sigle, come nel verbale.
  legenda(dati)

  // Osservazioni delle ore e note accanto ai voti, insieme in ordine di data.
  const titoloCorso = (corsoId: string) =>
    registro.corsi.find((c) => c.id === corsoId)?.titolo ?? ''

  const daLezioni = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => nelPeriodo(l.data))
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((osservazione) => osservazione.allievoId === allievo.id)
        .map((osservazione) => [
          lezione.data,
          titoloCorso(lezione.corsoId),
          t.tipoOsservazione(osservazione.tipo),
          osservazione.testo,
        ]),
    )

  const daVoti = registro.valutazioni
    .filter((v) => corsi.some((c) => c.id === v.corsoId) && nelPeriodo(v.data))
    .flatMap((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievo.id)
      if (!voto?.nota) return []
      return [[momento.data, titoloCorso(momento.corsoId), t.provaAnnotazione, `${momento.titolo}: ${voto.nota}`]]
    })

  dati.tabelle.annotazioni = {
    ...colonne((c) => [c.data, c.corso, c.tipo, c.annotazione]),
    pesi: [2, 4, 2, 8],
    righe: [...daLezioni, ...daVoti]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, ...resto]) => [formattaData(data), ...resto]),
  }

  // La matrice del comportamento, ora per ora: una riga per casella, in ordine
  // di giorno, con l'annotazione dove c'è.
  dati.tabelle.comportamento = {
    ...colonne((c) => [c.data, c.corso, c.aspetto, c.comeEAndata, c.annotazione]),
    pesi: [2, 4, 3, 3, 6],
    righe: celleDiAllievo(
      corsi.flatMap((suo) => registroDelCorso(registro, suo.id)).filter((l) => nelPeriodo(l.data)),
      allievo.id,
    )
      .reverse()
      .map(({ lezione, cella }) => [
        formattaData(lezione.data),
        titoloCorso(lezione.corsoId),
        nomeAspetto(registro, cella.aspetto),
        nomeSegnoScritto(cella.segno),
        cella.nota ?? '',
      ]),
  }

  // Un corso solo: il nome è già in testata.
  if (corso) {
    for (const nome of ['medie', 'prove', 'presenze', 'annotazioni', 'comportamento']) {
      dati.tabelle[nome] = senzaColonnaCorso(dati.tabelle[nome])
    }
  }

  return dati
}
