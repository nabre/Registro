// I rapporti di una classe: le presenze, la foto di classe, il fascicolo.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { classeDelCorsoId, corsiDellaClasse, materiaDelCorso } from '#core/dominio/courses.js'
import { percento } from '#core/dominio/text.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { percentoAssenza } from '#core/dominio/alerts.js'
import { matriceDelCorsoNelPeriodo } from '#core/dominio/courseMatrix.js'
import { avanzamentoConsegna } from '#core/dominio/assignments.js'
import { dataSpunta } from '#core/dominio/check.js'
import {
  etichettaSemestre,
  formattaData,
  formattaDurata,
  giorniBrevi,
  giorniLunghi,
  giornoDi,
} from '#core/dominio/dates.js'
import type { Allievo, Classe, Corso, Registro, Semestre } from '#core/dominio/models.js'
import type { Barre, DatiRapporto } from '#core/dominio/reports.js'
import { annoInUso } from '#core/dominio/years.js'
import { testi } from './reportData.testi.js'
import {
  aChiConsegna,
  perQuando,
  vuoto,
  colonne,
  comuni,
  sopraLaSoglia,
  righeDiClasse,
} from './common.js'

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

  // I conti (assenze, percentuali, UD) come a schermo e nelle segnalazioni:
  // `matriceDelCorsoNelPeriodo`, un posto solo. Le ore che si elencano su carta
  // invece sono solo quelle confermate svolte.
  const { lezioni: contate, matrice } = matriceDelCorsoNelPeriodo(registro, corso, semestre)
  const lezioni = contate.filter((l) => l.stato === 'svolta')
  const totali = matrice.classe

  dati.valori = {
    ...comuni(registro, t.titoli.presenze, periodo, [corso.id]),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    // «Lezioni a calendario» e «UD a calendario» contano le stesse ore: quelle
    // non annullate del periodo, anche le ancora da fare.
    quanti: String(contate.length),
    ud: String(matrice.udPreviste),
    udTenute: String(matrice.ud),
    // La presenza di classe è quella della riga «Classe» in fondo alla tabella,
    // sulle UD previste: la quota sull'appello sta nella colonna «% appello».
    presenza: percento(totali.presenzaPreviste),
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
  dati.grafici.assenze = barreAssenza(registro, matrice.righe)

  // Le due regole si dichiarano sul foglio, se no le due percentuali
  // sembrerebbero in contraddizione. I due numeri anche da soli, per chi
  // riscrive la frase in `_testi.tpl`.
  dati.valori.udPrevisteCorso = String(matrice.udPreviste)
  dati.valori.udACalendario = String(matrice.ud)
  dati.valori.nota = t.notaPresenze(matrice.udPreviste, matrice.ud)

  // Quadro orario e calendario
  const auleSet = new Set<string>()
  for (const r of corso.orario) if (r.aula) auleSet.add(r.aula)
  for (const l of lezioni) if (l.aula) auleSet.add(l.aula)
  dati.valori.aule = [...auleSet].join(', ') || '—'

  const gb = giorniBrevi()
  dati.valori.orarioSettimanale = corso.orario
    .map((r) => `${gb[r.giorno - 1] ?? r.giorno} ${r.inizio}`)
    .join(', ') || '—'

  const udSet = corso.orario.reduce(
    (s, r) => s + (r.durataMin ? Math.round(r.durataMin / registro.impostazioni.minutiUd) : 1),
    0,
  )
  dati.valori.udSettimanali = String(udSet)

  const gl = giorniLunghi()
  dati.tabelle.orario = {
    ...colonne((c) => [c.giorno, c.orario, c.durata, c.aula, c.validita]),
    pesi: [3, 2, 2, 2, 3],
    righe: corso.orario.map((r) => [
      gl[r.giorno - 1] ?? String(r.giorno),
      r.inizio,
      formattaDurata(r.durataMin),
      r.aula ?? '',
      (r.dal || r.al) ? `${r.dal ? formattaData(r.dal) : ''}–${r.al ? formattaData(r.al) : ''}` : '',
    ]),
  }

  const sospensioni = (annoInUso(registro)?.sospensioni ?? []).filter(
    (s) => !semestre || (s.al >= semestre.inizio && s.dal <= semestre.fine),
  )
  dati.tabelle.sospensioni = {
    ...colonne((c) => [c.sospensione, c.dal, c.al]),
    pesi: [6, 3, 3],
    righe: sospensioni.map((s) => [s.etichetta, formattaData(s.dal), formattaData(s.al)]),
  }

  return dati
}

/**
 * La quota di assenza di ciascuno come barra, sulla stessa scala e con la
 * soglia: nella tabella la stessa cifra sta fra nove colonne, qui chi è lontano
 * dagli altri si vede da lontano. Il fondo scala è la barra più lunga o la
 * soglia, con un poco d'aria, arrotondato alla decina: non sempre 100%, se no
 * con assenze del 5% le barre sarebbero tutte un filo.
 */
function barreAssenza (
  registro: Registro,
  righe: ReadonlyArray<{ allievo: Allievo, assenza: number | null }>,
): Barre {
  const t = testi()
  const soglia = registro.impostazioni.sogliaAssenza
  const valori = righe.map((riga) => (riga.assenza === null ? null : riga.assenza * 100))
  const piuLunga = Math.max(soglia, ...valori.map((v) => v ?? 0))
  const a = Math.min(100, Math.max(10, Math.ceil((piuLunga * 1.1) / 10) * 10))
  const passo = a <= 50 ? 10 : 20
  const tacche: number[] = []
  for (let v = 0; v <= a; v += passo) tacche.push(v)
  return {
    genere: 'barre',
    unita: t.unitaBarreAssenza,
    a,
    tacche,
    // Soglia a zero: la segnalazione è spenta, e la riga non c'è.
    ...(soglia > 0 ? { soglia: { valore: soglia, etichetta: t.lineaSogliaAssenza(soglia) } } : {}),
    barre: righe.map((riga, i) => ({
      etichetta: nomeCompleto(riga.allievo),
      valore: valori[i],
      testo: percentoAssenza(riga.assenza, soglia),
      oltre: sopraLaSoglia(registro, riga.assenza),
    })),
  }
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
    ...comuni(
      registro,
      testi().titoli.foto,
      etichettaSemestre(null),
      corsiDellaClasse(registro, classe.id).map((c) => c.id),
    ),
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
    ...comuni(
      registro,
      t.titoli.fascicolo,
      etichettaSemestre(null),
      corsiDellaClasse(registro, classe.id).map((c) => c.id),
    ),
    classe: classe.nome,
    // Il fascicolo è della classe: materia e corso esistono vuoti perché la
    // testata li nomina, e un valore assente sembrerebbe dimenticato.
    materia: '',
    corso: '',
    // Chi frequenta, come la tabella e la parete qui sotto.
    allievi: String(allieviAttivi(classe).length),
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
    righe: righeDiClasse(classe).map(({ allievo, nome }) => [
      nome,
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

  // Parete di ritratti della classe
  const attivi = ordinaAllievi(allieviAttivi(classe))
  dati.gallerie = {
    allievi: {
      celle: attivi.map((a) => ({
        immagine: a.foto ?? '',
        titolo: nomeCompleto(a),
        sotto: a.azienda ?? '',
      })),
    },
  }

  // Richieste di documenti della classe
  const richieste = (registro.consegne ?? []).filter((c) => {
    const co = registro.corsi.find((x) => x.id === c.corsoId)
    return co?.classeId === classe.id && c.documento
  })
  dati.tabelle.richiesteDocumenti = {
    ...colonne((c) => [c.documento, c.categoria, c.scadenza, c.consegnati, c.firme]),
    pesi: [5, 3, 2, 2, 2],
    righe: richieste.map((r) => {
      const { fatte, destinatari } = avanzamentoConsegna(r, classe)
      const consegnati = `${fatte}/${destinatari.length}`
      const firme = r.firmeRichieste ? (r.fileFirme ? '✓' : '—') : '—'
      return [
        r.testo,
        r.documento ? t.categoria(r.documento) : '',
        perQuando(registro, r),
        consegnati,
        firme,
      ]
    }),
  }

  // Comunicazioni del fascicolo
  dati.tabelle.comunicazioni = {
    ...colonne((c) => [c.data, c.titolo, c.aChi, c.stato]),
    pesi: [2, 5, 4, 3],
    righe: (fascicolo?.comunicazioni ?? []).map((com) => {
      const data = com.creataIl ? formattaData(giornoDi(com.creataIl) ?? com.creataIl.slice(0, 10)) : ''
      const stato = com.inviataIl
        ? formattaData(giornoDi(com.inviataIl) ?? com.inviataIl.slice(0, 10))
        : com.errore ? t.erroreInvio : t.bozza
      return [data, com.oggetto, com.destinatari.join(', '), stato]
    }),
  }

  // Dettaglio pratiche assenze per allievo
  dati.tabelle.dettaglioAssenze = {
    ...colonne((c) => [c.periodo, c.pif, c.tipo, c.firme, c.stato]),
    pesi: [3, 4, 2, 2, 3],
    righe: (fascicolo?.assenze ?? []).flatMap((blocco) =>
      blocco.righe.map((riga) => {
        const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
        const firmati = riga.fogli.filter((f) => f.firmato).length
        const tot = riga.fogli.length
        const stato = riga.invio?.inviatoIl
          ? formattaData(giornoDi(riga.invio.inviatoIl) ?? riga.invio.inviatoIl.slice(0, 10))
          : riga.invio?.errore ? t.erroreInvio : t.daInviare
        return [
          blocco.etichetta,
          allievo ? nomeCompleto(allievo) : riga.allievoId,
          riga.fogli.map((f) => f.tipo).join(', ') || '—',
          tot > 0 ? `${firmati}/${tot}` : '—',
          stato,
        ]
      }),
    ),
  }

  // Pendenze del fascicolo e della classe
  const righePendenze: string[][] = []

  // Documenti da raccogliere non ancora completati o con firme mancanti
  // Le persone si contano come nel todo: chi frequenta, fra quelli a cui tocca.
  const nomiClasse = new Map(classe.allievi.map((a) => [a.id, nomeCompleto(a)]))
  for (const r of richieste) {
    const { fatte, destinatari, completa } = avanzamentoConsegna(r, classe)
    const chiusi = completa && (!r.firmeRichieste || r.fileFirme)
    if (!chiusi) {
      righePendenze.push([
        t.pendenzeTipo.documento,
        r.testo,
        aChiConsegna(r, nomiClasse),
        perQuando(registro, r),
        `${fatte}/${destinatari.length}`,
      ])
    }
  }

  // Pratiche assenze da completare o inviare
  for (const blocco of fascicolo?.assenze ?? []) {
    for (const riga of blocco.righe) {
      const firmati = riga.fogli.filter((f) => f.firmato).length
      const tot = riga.fogli.length
      const inviata = Boolean(riga.invio?.inviatoIl)
      if (!inviata || (tot > 0 && firmati < tot)) {
        const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
        righePendenze.push([
          t.pendenzeTipo.documento,
          blocco.etichetta,
          allievo ? nomeCompleto(allievo) : riga.allievoId,
          '',
          inviata ? `${firmati}/${tot}` : t.daInviare,
        ])
      }
    }
  }

  // Comunicazioni non ancora inviate o con errore
  for (const com of fascicolo?.comunicazioni ?? []) {
    if (!com.inviataIl || com.errore) {
      righePendenze.push([
        t.pendenzeTipo.comunicazione,
        com.oggetto,
        com.destinatari.join(', '),
        com.creataIl ? formattaData(giornoDi(com.creataIl) ?? com.creataIl.slice(0, 10)) : '',
        com.errore ? t.erroreInvio : t.bozza,
      ])
    }
  }

  // Consegne aperte delle materie della classe
  const corsiClasse = corsiDellaClasse(registro, classe.id)
  // Le richieste di documenti sono già sopra, ognuna una riga sola.
  const consegneClasse = (registro.consegne ?? []).filter((c) =>
    !c.documento && corsiClasse.some((co) => co.id === c.corsoId),
  )
  for (const c of consegneClasse) {
    const { fatte, destinatari, completa } = avanzamentoConsegna(c, classe)
    if (!completa) {
      righePendenze.push([
        t.pendenzeTipo.consegna,
        c.testo,
        aChiConsegna(c, nomiClasse),
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

  // Controlli e spunte delle materie della classe
  const righeCheck: string[][] = []
  for (const c of corsiClasse) {
    const chk = registro.check?.find((k) => k.corsoId === c.id)
    if (!chk) continue
    for (const col of chk.colonne) {
      const persone = righeDiClasse(classe, (allievo) =>
        chk.spunte.some((s) => s.allievoId === allievo.id && s.colonnaId === col.id))
      for (const { allievo, nome } of persone) {
        const spunta = chk.spunte.find((s) => s.allievoId === allievo.id && s.colonnaId === col.id)
        const giorno = spunta ? dataSpunta(registro, spunta) : ''
        righeCheck.push([
          c.titolo,
          col.titolo,
          nome,
          giorno ? formattaData(giorno) : '',
          spunta ? '✓' : '—',
        ])
      }
    }
  }
  dati.tabelle.check = {
    ...colonne((c) => [c.corso, c.titolo, c.pif, c.data, c.stato]),
    pesi: [3, 4, 4, 2, 1],
    righe: righeCheck,
  }

  return dati
}
