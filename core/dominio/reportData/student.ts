// La scheda di un allievo.

import {
  formattaVoto,
  mediaAllievo,
  contaUd,
  notaFineSemestre,
  nomeCompleto,
  siglaPresenza,
  statoUd,
  minutiRitardoOra,
} from '#core/dominio/calculations.js'
import { corsiDellaClasse, materiaDelCorso, registroDelCorso } from '#core/dominio/courses.js'
import { LINGUA_PREDEFINITA } from '#core/i18n/index.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { percento } from '#core/dominio/text.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { primoTelefono, scriviTelefoni } from '#core/dominio/phones.js'
import { matriceCorso, udPrevisteDelCorso } from '#core/dominio/courseMatrix.js'
import { celleDiAllievo, nomeSegnoScritto } from '#core/dominio/observations.js'
import { recuperiDelMomento, rigaDelRecupero } from '#core/dominio/retakes.js'
import { dataConsegna } from '#core/dominio/assignments.js'
import { dataSpunta } from '#core/dominio/check.js'
import {
  etichettaSemestre,
  formattaData,
  giornoDi,
  nelSemestre,
  oggi,
} from '#core/dominio/dates.js'
import type { Allievo, Classe, Corso, Registro, Semestre } from '#core/dominio/models.js'
import { nomiDiSerie, type DatiRapporto, type Tabella } from '#core/dominio/reports.js'
import { testi } from './reportData.testi.js'
import {
  perQuando,
  vuoto,
  colonne,
  comuni,
  legenda,
  nomeAspetto,
  avvisoAssenza,
} from './common.js'

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
    // Su carta solo le ore confermate svolte: una pianificata non è ancora avvenuta.
    .filter((l) => l.stato === 'svolta' && nelPeriodo(l.data))
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
        minutiRitardoOra(presenza) ? String(minutiRitardoOra(presenza)) : '',
        presenza?.nota ?? '',
      ]
    }),
  }

  // La legenda delle sigle, come nel verbale.
  legenda(dati)

  // Il diario delle lezioni con argomenti/tematiche, presenze e compiti per l'allievo
  const L = lessico()
  dati.tabelle.diario = {
    ...colonne((c) => [c.data, c.corso, c.argomenti, c.presenze, c.compiti, c.nota]),
    pesi: [2, 3, 6, 3, 4, 3],
    righe: ore.map((lezione) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      let testoPresenza = '—'
      if (presenza && presenza.stati.length > 0) {
        const assenti = presenza.stati.filter((s) => s === 'assente').length
        const presenti = presenza.stati.filter((s) => s === 'presente').length
        const esonerati = presenza.stati.filter((s) => s === 'esonerato').length
        if (assenti === presenza.stati.length) {
          testoPresenza = L.presenze.assente
        } else if (presenti === presenza.stati.length) {
          testoPresenza = minutiRitardoOra(presenza)
            ? `${L.presenze.ritardo} (${minutiRitardoOra(presenza)}’)`
            : L.presenze.presente
        } else if (esonerati === presenza.stati.length) {
          testoPresenza = L.presenze.esonerato
        } else if (presenza.stati.some((s) => s === 'ritardo')) {
          testoPresenza = minutiRitardoOra(presenza)
            ? `${L.presenze.ritardo} (${minutiRitardoOra(presenza)}’)`
            : L.presenze.ritardo
        } else {
          testoPresenza = `${presenti}/${presenza.stati.length} UD`
        }
      }

      const compiti = (registro.consegne ?? [])
        .filter(
          (c) =>
            c.corsoId === lezione.corsoId &&
            (c.a === 'classe' || (c.a === 'allievi' && c.allieviIds.includes(allievo.id))) &&
            (c.dataLezioneId === lezione.id ||
              c.scadenzaLezioneId === lezione.id ||
              dataConsegna(registro, c) === lezione.data),
        )
        .map((c) => c.testo)
        .join('; ')

      const nota = [presenza?.nota, lezione.consuntivo, lezione.materiali].filter(Boolean).join(' — ')

      return [
        formattaData(lezione.data),
        registro.corsi.find((c) => c.id === lezione.corsoId)?.titolo ?? '',
        lezione.argomenti || '—',
        testoPresenza,
        compiti,
        nota,
      ]
    }),
  }

  // Osservazioni delle ore e note accanto ai voti, insieme in ordine di data.
  const titoloCorso = (corsoId: string) =>
    registro.corsi.find((c) => c.id === corsoId)?.titolo ?? ''

  const daLezioni = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => l.stato === 'svolta' && nelPeriodo(l.data))
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
      corsi
        .flatMap((suo) => registroDelCorso(registro, suo.id))
        .filter((l) => l.stato === 'svolta' && nelPeriodo(l.data)),
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

  // La lista di controllo (check) per questo allievo
  const righeCheck: string[][] = []
  for (const c of corsi) {
    const chk = registro.check?.find((k) => k.corsoId === c.id)
    if (!chk) continue
    for (const col of chk.colonne) {
      const spunta = chk.spunte.find((s) => s.allievoId === allievo.id && s.colonnaId === col.id)
      righeCheck.push([
        c.titolo,
        col.titolo,
        spunta ? formattaData(dataSpunta(registro, spunta)) : '—',
        spunta ? '✓' : '—',
      ])
    }
  }
  dati.tabelle.check = {
    ...colonne((c) => [c.corso, c.titolo, c.data, c.stato]),
    pesi: [4, 6, 2, 2],
    righe: righeCheck,
  }

  // Le consegne e compiti assegnati a questo allievo
  const consegneAllievo = (registro.consegne ?? []).filter(
    (c) =>
      corsi.some((suo) => suo.id === c.corsoId) &&
      (c.a === 'classe' || (c.a === 'allievi' && c.allieviIds.includes(allievo.id))),
  )
  dati.tabelle.consegne = {
    ...colonne((c) => [c.corso, c.tipo, c.cheCosa, c.perQuando, c.stato]),
    pesi: [3, 2, 5, 2, 2],
    righe: consegneAllievo.map((consegna) => {
      const corsoTitolo = registro.corsi.find((co) => co.id === consegna.corsoId)?.titolo ?? ''
      const spunta = consegna.fatte.find((f) => f.chi === allievo.id)
      const stato = spunta
        ? (spunta.fattaIl ? `✓ ${formattaData(giornoDi(spunta.fattaIl) ?? spunta.fattaIl.slice(0, 10))}` : '✓')
        : '—'
      return [
        corsoTitolo,
        t.tipoConsegna(consegna.tipo),
        consegna.testo,
        perQuando(registro, consegna),
        stato,
      ]
    }),
  }

  // I recuperi dell'allievo nelle materie della scheda
  const recuperiAllievo = registro.valutazioni
    .filter((v) => corsi.some((c) => c.id === v.corsoId) && nelPeriodo(v.data))
    .flatMap((m) => {
      const riga = rigaDelRecupero(m, allievo.id)
      if (!riga) return []
      const voto = m.voti.find((v) => v.allievoId === allievo.id)
      const rec = recuperiDelMomento(registro, m, classe, oggi())
        .find((r) => r.allievo.id === allievo.id)
      return [[
        registro.corsi.find((c) => c.id === m.corsoId)?.titolo ?? '',
        m.titolo,
        riga.previstoIl ? formattaData(riga.previstoIl) : '',
        voto?.valore !== null && voto?.valore !== undefined ? String(voto.valore) : '',
        riga.riconsegnataIl ? formattaData(riga.riconsegnataIl) : '',
        t.statiRecupero[rec?.stato ?? 'da-fissare'],
      ]]
    })
  dati.tabelle.recuperi = {
    ...colonne((c) => [c.corso, c.prova, c.siRifaIl, c.voto, c.riconsegnata, c.stato]),
    pesi: [4, 5, 2, 1, 2, 3],
    righe: recuperiAllievo,
  }

  // Documenti e comunicazioni del docente di classe (quando la scheda è generale per allievo)
  const fascicolo = classe.docenteDiClasse
    ? registro.fascicoli.find((f) => f.classeId === classe.id)
    : null
  const documentiAllievo = (!corso && fascicolo)
    ? (fascicolo.documenti ?? []).filter((d) => !d.allievoId || d.allievoId === allievo.id)
    : []
  dati.tabelle.documenti = {
    ...colonne((c) => [c.documento, c.categoria, c.raccoltoIl]),
    pesi: [6, 4, 3],
    righe: documentiAllievo.map((documento) => [
      documento.titolo,
      t.categoria(documento.categoria),
      documento.aggiuntoIl
        ? formattaData(giornoDi(documento.aggiuntoIl) ?? documento.aggiuntoIl.slice(0, 10))
        : '',
    ]),
  }

  const comunicazioniAllievo = (!corso && fascicolo)
    ? (fascicolo.comunicazioni ?? []).filter(
        (com) =>
          com.destinatari.includes(allievo.email ?? '') ||
          com.destinatari.includes(allievo.emailTutore ?? '') ||
          com.destinatari.includes(allievo.emailDatore ?? '') ||
          com.destinatari.some((dest) => dest.includes(allievo.cognome)),
      )
    : []
  dati.tabelle.comunicazioni = {
    ...colonne((c) => [c.data, c.titolo, c.aChi, c.stato]),
    pesi: [2, 5, 4, 3],
    righe: comunicazioniAllievo.map((com) => {
      const data = com.creataIl ? formattaData(giornoDi(com.creataIl) ?? com.creataIl.slice(0, 10)) : ''
      const stato = com.inviataIl
        ? formattaData(giornoDi(com.inviataIl) ?? com.inviataIl.slice(0, 10))
        : com.errore ? t.erroreInvio : t.bozza
      return [data, com.oggetto, com.destinatari.join(', '), stato]
    }),
  }

  // Un corso solo: il nome è già in testata.
  if (corso) {
    for (const nome of [
      'medie',
      'prove',
      'presenze',
      'diario',
      'annotazioni',
      'comportamento',
      'check',
      'consegne',
      'recuperi',
    ]) {
      if (dati.tabelle[nome]) {
        dati.tabelle[nome] = senzaColonnaCorso(dati.tabelle[nome])
      }
    }
  }

  return dati
}
