// Esportazioni: CSV di voti e presenze per la segreteria o un foglio di calcolo,
// riassunto di una lezione in markdown, e la scrittura di quel che si genera.
// Punto e virgola e BOM in testa: così Excel italiano apre il CSV con gli accenti.

import * as apparato from 'apparato'

import {
  formattaVoto,
  mediaAllievo,
  minutiEffettivi,
  allieviAttivi,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  segnato,
  unitaDidattiche,
} from '../domain/calculations.js'
import type { MatriceCorso } from '../domain/courseMatrix.js'
import { etichettaSemestre, formattaData, formattaDurata, formattaUd } from '../domain/dates.js'
import type {
  Consegna,
  Classe,
  Corso,
  Lezione,
  MomentoValutazione,
  PianoLezione,
  Risorsa,
} from '../domain/models.js'
import { righe } from '../domain/csv.js'
import { testi as paroleDeiRapporti } from '../domain/reportData.testi.js'
import { percento } from '../domain/text.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './exports.testi.js'
import { riscrivi, uriArchivio } from './filing.js'


// ------------------------------------------------------------------ contenuti

/** Griglia dei voti: una riga per allievo, una colonna per momento, la media pesata in fondo. */
export function csvValutazioni (
  classe: Classe,
  corso: Corso,
  momenti: MomentoValutazione[],
  intestazioneSemestre: string,
): string {
  const rapporti = paroleDeiRapporti()
  const colonne = rapporti.colonne
  const ordinati = [...momenti].sort((a, b) => a.data.localeCompare(b.data))
  const allievi = ordinaAllievi(allieviAttivi(classe))

  const intestazione: Array<string | number | null> = [
    `${classe.nome} — ${corso.titolo} — ${intestazioneSemestre}`,
  ]
  const titoli = [colonne.pif, ...ordinati.map((m) => m.titolo), colonne.media]
  const date = [parole().data, ...ordinati.map((m) => formattaData(m.data)), '']
  const pesi = [colonne.peso, ...ordinati.map((m) => m.peso), '']

  const corpo = allievi.map((allievo) => {
    const voti = ordinati.map((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievo.id)
      if (!voto) return ''
      if (voto.assente) return rapporti.assente
      return voto.valore === null ? '' : voto.valore
    })
    const media = mediaAllievo(ordinati, allievo.id).media
    return [nomeCompleto(allievo), ...voti, media === null ? '' : formattaVoto(media).replace('.', ',')]
  })

  return righe([intestazione, [], titoli, date, pesi, ...corpo])
}

/**
 * Quadro assenze e ritardi della classe. La matrice (`matriceDelCorsoNelPeriodo`)
 * è la stessa del PDF, così i numeri coincidono; la prepara chi chiama.
 */
export function csvPresenze (
  classe: Classe,
  matrice: MatriceCorso,
  periodo = etichettaSemestre(null),
): string {
  // In UD, l'unità in cui la scuola conta le assenze. Due percentuali come nel
  // PDF: sulle UD previste e sulle UD con l'appello (quanto fidarsi della prima).
  const t = testi()
  const intestazione = [...t.colonnePresenze]
  // Vuota se la quota manca: un trattino in una cella sarebbe testo.
  const percentuale = (quota: number | null) => percento(quota, '')
  const corpo = matrice.righe.map((riga) => [
    nomeCompleto(riga.allievo),
    riga.lezioniConAppello,
    riga.udPreviste,
    riga.udConAppello,
    riga.udPresenza,
    riga.udAssenza,
    riga.udEsonero,
    riga.assenzeIntere,
    riga.assenzeParziali,
    riga.ritardi,
    riga.minutiRitardo,
    percentuale(riga.assenza),
    // Complemento della presenza: dice quanto fidarsi della colonna accanto.
    percentuale(riga.presenza === null ? null : 1 - riga.presenza),
  ])
  return righe([[t.titoloPresenze(classe.nome, periodo)], [], intestazione, ...corpo])
}

/**
 * Una risorsa come riga di markdown: link, o percorso relativo alla cartella dei
 * dati, dove finisce il .md, così il rimando funziona aprendolo da lì.
 */
function voceRisorsa (risorsa: Risorsa): string {
  if (risorsa.tipo === 'collegamento') {
    return risorsa.url ? `[${risorsa.titolo}](${risorsa.url})` : risorsa.titolo
  }
  const percorso = risorsa.file ? `../${risorsa.file}` : ''
  const riga = percorso ? `[${risorsa.titolo}](${encodeURI(percorso)})` : risorsa.titolo
  return risorsa.note ? `${riga} — ${risorsa.note}` : riga
}

export function testoLezione (
  lezione: Lezione,
  classe: Classe | null,
  piano: PianoLezione | null,
  minutiUd: number,
  /** Le consegne date in quest’ora. */
  consegne: Consegna[] = [],
): string {
  const t = testi()
  const rapporti = paroleDeiRapporti()
  const parti: string[] = []
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])

  parti.push(t.lezioneDel(formattaData(lezione.data, 'lungo')))
  parti.push('')
  parti.push(`- ${t.classe}: ${classe?.nome ?? '—'}`)
  if (lezione.aula) parti.push(`- ${parole().aula}: ${lezione.aula}`)
  parti.push(
    `- ${t.orario}: ${lezione.slot
      .map((s) => `${s.inizio}–${s.fine}${s.tipo === 'pausa' ? ` (${t.pausa})` : ''}`)
      .join(', ')}`,
  )
  parti.push(`- ${t.durataEffettiva}: ${formattaDurata(minutiEffettivi(lezione))}`)
  parti.push(`- ${t.stato}: ${rapporti.statoLezione(lezione.stato)}`)
  parti.push('')

  parti.push(`## ${t.presenze}`)
  const ud = unitaDidattiche(lezione, minutiUd)
  parti.push(
    t.riepilogo(
      riepilogo.presenti,
      riepilogo.totale - riepilogo.senzaAppello,
      riepilogo.assenti,
      riepilogo.parziali,
      riepilogo.ritardi,
      riepilogo.udAssenza,
      riepilogo.udTotali,
    ),
  )
  // Un appello a metà si dichiara: taciute, le caselle vuote passerebbero per presenze.
  if (riepilogo.udSenzaAppello > 0) {
    parti.push('')
    parti.push(t.appelloIncompleto(riepilogo.udSenzaAppello))
  }
  // Chi non c'era tutta l'ora si elenca UD per UD («assente» ≠ «arrivato alla terza»).
  const irregolari = lezione.presenze.filter((p) => p.stati.some(segnato))
  if (irregolari.length > 0) {
    parti.push('')
    for (const presenza of irregolari) {
      const minuti = presenza.minuti ? t.minuti(presenza.minuti) : ''
      const nota = presenza.nota ? ` — ${presenza.nota}` : ''
      const dettaglio = presenza.stati
        .map((stato, i) => `${t.ud(i + 1)} ${ud[i] ? `${ud[i].inizio} ` : ''}${t.statoPresenza(stato)}`)
        .filter((_, i) => segnato(presenza.stati[i]))
        .join(', ')
      parti.push(`- ${nomi.get(presenza.allievoId) ?? presenza.allievoId}: ${dettaglio}${minuti}${nota}`)
    }
  }
  parti.push('')

  if (piano) {
    parti.push(`## ${t.pianoLezione}`)
    if (piano.obiettivi.length > 0) {
      parti.push('')
      parti.push(t.obiettivi)
      for (const obiettivo of piano.obiettivi) parti.push(`- ${obiettivo}`)
    }
    // Le risorse del piano intero; quelle di una tappa stanno sotto la sua riga.
    if (piano.risorse.length > 0) {
      parti.push('')
      parti.push(t.risorse)
      for (const risorsa of piano.risorse) parti.push(`- ${voceRisorsa(risorsa)}`)
    }
    parti.push('')
    for (const attivita of piano.attivita) {
      const stato = lezione.avanzamento.find((a) => a.attivitaId === attivita.id)?.stato ?? 'da-fare'
      const segno = stato === 'svolta' ? 'x' : stato === 'parziale' ? '~' : ' '
      parti.push(
        `- [${segno}] ${attivita.titolo} (${formattaUd(attivita.durataUd)}, ${rapporti.tipoAttivita(attivita.tipo)})`,
      )
      // Rientrate sotto la tappa: si legge come la scaletta.
      for (const risorsa of attivita.risorse) parti.push(`  - ${voceRisorsa(risorsa)}`)
    }
    parti.push('')
  }

  if (lezione.argomenti) {
    parti.push(`## ${t.argomentiSvolti}`)
    parti.push(lezione.argomenti)
    parti.push('')
  }
  if (consegne.length > 0) {
    parti.push(`## ${t.consegneDate}`)
    for (const consegna of consegne) {
      const chi =
        consegna.a === 'docente'
          ? t.io
          : consegna.a === 'allievi'
            ? consegna.allieviIds.map((id) => nomi.get(id) ?? id).join(', ')
            : rapporti.tuttaLaClasse
      parti.push(`- [${rapporti.tipoConsegna(consegna.tipo)}] ${consegna.testo} — ${chi}`)
    }
    parti.push('')
  }
  if (lezione.osservazioni.length > 0) {
    parti.push(`## ${t.osservazioni}`)
    for (const osservazione of lezione.osservazioni) {
      const chi = osservazione.allievoId
        ? nomi.get(osservazione.allievoId) ?? osservazione.allievoId
        : rapporti.classe
      parti.push(`- [${rapporti.tipoOsservazione(osservazione.tipo)}] ${chi}: ${osservazione.testo}`)
    }
    parti.push('')
  }
  if (lezione.consuntivo) {
    parti.push(`## ${t.consuntivo}`)
    parti.push(lezione.consuntivo)
    parti.push('')
  }
  return parti.join('\n')
}

// ------------------------------------------------------------------ scrittura

/**
 * Scrive quel che il registro genera al percorso dato (composto da chi chiama con
 * `locations.ts`). Sovrascrive: un rapporto è una fotografia di adesso, e quello
 * di prima non serve più.
 */
export async function scriviGenerato (
  relativo: string,
  contenuto: Uint8Array | string,
  precedenti: readonly string[] = [],
  opzioni: { doppioni?: boolean } = {},
): Promise<apparato.Uri | null> {
  const byte = typeof contenuto === 'string' ? new TextEncoder().encode(contenuto) : contenuto
  const esito = await riscrivi(relativo, byte, precedenti, opzioni)
  if ('errore' in esito) return null
  // Un file vero, perché chi lo ha chiesto lo vuole aprire.
  return uriArchivio(esito.relativo)
}
