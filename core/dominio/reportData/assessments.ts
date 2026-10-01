// I rapporti delle valutazioni: la griglia di un corso, un momento di valutazione.

import {
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  mediaAllievo,
  notaFineSemestre,
  nomeCompleto,
  ordinaAllievi,
} from '#core/dominio/calculations.js'
import { classeDelCorsoId, materiaDelCorso } from '#core/dominio/courses.js'
import { percento } from '#core/dominio/text.js'
import { recuperiDelMomento, rigaDelRecupero } from '#core/dominio/retakes.js'
import { riconsegneDegliAllievi } from '#core/dominio/returns.js'
import { dataSpunta } from '#core/dominio/check.js'
import { etichettaSemestre, formattaData, oggi } from '#core/dominio/dates.js'
import type {
  Classe,
  Corso,
  MomentoValutazione,
  Iso,
  Registro,
  Scala,
  Semestre,
} from '#core/dominio/models.js'
import type { Andamento, DatiRapporto } from '#core/dominio/reports.js'
import { testi } from './reportData.testi.js'
import { vuoto, colonne, comuni, periodoDi } from './common.js'

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

  // L'andamento del corso: una prova dopo l'altra, la media della classe.
  dati.grafici.andamento = andamentoCorso(
    registro,
    momenti,
    mediaDelCorso(momenti, classe?.allievi ?? []),
  )

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

  // La lista di controllo del corso, se c'è: chi ha firmato, portato, completato.
  const checkCorso = registro.check?.find((c) => c.corsoId === corso.id)
  if (checkCorso && checkCorso.colonne.length > 0) {
    dati.tabelle.check = {
      ...colonne((c) => [c.pif, ...checkCorso.colonne.map((col) => col.titolo)]),
      pesi: [4, ...checkCorso.colonne.map(() => 2)],
      righe: (classe?.allievi ?? []).map((allievo) => [
        nomeCompleto(allievo),
        ...checkCorso.colonne.map((col) => {
          const spunta = checkCorso.spunte.find(
            (s) => s.allievoId === allievo.id && s.colonnaId === col.id,
          )
          if (!spunta) return ''
          const giorno = dataSpunta(registro, spunta)
          return giorno ? `✓ ${formattaData(giorno)}` : '✓'
        }),
      ]),
    }
  } else {
    dati.tabelle.check = { ...colonne((c) => [c.pif]), righe: [] }
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
export function resiUnoPerUno (momento: MomentoValutazione, classe: Classe | null): boolean {
  const suoi = riconsegneDegliAllievi(momento, classe)
  return suoi.length > 0 && suoi.every((riga) => riga.riconsegnataIl !== null)
}

/**
 * L'asse dei voti di un andamento: la scala delle impostazioni, allargata se un
 * voto ne esce (una prova con una scala sua), con un numero a ogni voto intero
 * — al mezzo punto se la scala è corta, più radi se è lunga.
 */
function asseDeiVoti (scala: Scala, valori: number[]): { da: number, a: number, tacche: number[] } {
  const da = Math.min(scala.min, ...valori)
  const a = Math.max(scala.max, ...valori)
  const ampiezza = a - da
  const passo = ampiezza <= 3 ? 0.5 : ampiezza <= 12 ? 1 : Math.ceil(ampiezza / 10)
  const tacche: number[] = []
  // Contate in passi interi dal primo multiplo: niente 3.0000000004.
  for (let i = Math.ceil(da / passo); i * passo <= a + 1e-9; i += 1) tacche.push(i * passo)
  return { da, a, tacche }
}

/** La riga della sufficienza e, se c'è, quella della media. */
function lineeDiRiferimento (scala: Scala, media: number | null): Andamento['linee'] {
  const t = testi()
  return [
    { valore: scala.sufficienza, etichetta: t.lineaSufficienza(formattaVoto(scala.sufficienza)), tipo: 'soglia' },
    ...(media === null
      ? []
      : [{ valore: media, etichetta: t.lineaMedia(media.toFixed(2)), tipo: 'media' as const }]),
  ]
}

/**
 * I voti di una persona nel tempo: un punto per prova, alla data in cui l'ha
 * fatta — il giorno del recupero, per chi l'ha rifatta —, con la sufficienza e
 * la sua media pesata. Un corso solo: la linea fra due materie non dice niente.
 */
export function andamentoAllievo (
  registro: Registro,
  momenti: MomentoValutazione[],
  allievoId: string,
  media: number | null,
): Andamento {
  const scala = registro.impostazioni.scala
  const punti = momenti
    .flatMap((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievoId)
      if (!voto || voto.assente || typeof voto.valore !== 'number') return []
      const data = rigaDelRecupero(momento, allievoId)?.previstoIl ?? momento.data
      return [{ data, giorno: formattaData(data, 'corto'), valore: voto.valore, ordine: momento.data }]
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.ordine.localeCompare(b.ordine))
    .map(({ data, giorno, valore }) => ({ data, giorno, valore }))
  return {
    genere: 'andamento',
    unita: testi().unitaAndamentoAllievo,
    ...asseDeiVoti(scala, punti.map((p) => p.valore)),
    soglia: scala.sufficienza,
    linee: lineeDiRiferimento(scala, media),
    punti,
  }
}

/**
 * L'andamento di un corso: per ogni prova la media della classe, con la barra
 * dal voto più basso al più alto, e la media del corso. Si vede se le prove
 * vanno meglio o peggio, e quanto la classe è stretta o sparpagliata.
 */
function andamentoCorso (
  registro: Registro,
  momenti: MomentoValutazione[],
  media: number | null,
): Andamento {
  const scala = registro.impostazioni.scala
  const punti = [...momenti]
    .sort((a, b) => a.data.localeCompare(b.data))
    .flatMap((momento) => {
      const conti = distribuzione(momento)
      if (conti.media === null || conti.minimo === null || conti.massimo === null) return []
      return [{
        data: momento.data,
        giorno: formattaData(momento.data, 'corto'),
        valore: conti.media,
        minimo: conti.minimo,
        massimo: conti.massimo,
      }]
    })
  return {
    genere: 'andamento',
    unita: testi().unitaAndamentoCorso,
    ...asseDeiVoti(scala, punti.flatMap((p) => [p.minimo, p.massimo])),
    soglia: scala.sufficienza,
    linee: lineeDiRiferimento(scala, media),
    punti,
  }
}

/**
 * La media del corso: la media delle medie di chi ha almeno un voto, come la
 * riga in fondo alla griglia. Nulla senza voti.
 */
function mediaDelCorso (
  momenti: MomentoValutazione[],
  allievi: readonly { id: string }[],
): number | null {
  const medie = allievi
    .map((a) => mediaAllievo(momenti, a.id).media)
    .filter((m): m is number => m !== null)
  return medie.length === 0 ? null : medie.reduce((s, m) => s + m, 0) / medie.length
}
