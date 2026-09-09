// Esportazioni in CSV. Servono per due cose che il registro non deve fare da sé:
// consegnare le medie a chi le raccoglie in segreteria e portare i dati in un
// foglio di calcolo per i conti che ognuno fa a modo suo.
//
// Separatore punto e virgola e BOM in testa: è il modo in cui Excel in ambito
// italiano apre un CSV senza chiedere niente e senza mangiarsi gli accenti.

import * as vscode from 'vscode'

import {
  formattaVoto,
  mediaAllievo,
  minutiEffettivi,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  segnato,
  statisticheAllievo,
  unitaDidattiche,
} from '../dominio/calcoli.js'
import { formattaData, formattaDurata, formattaUd } from '../dominio/date.js'
import type {
  Consegna,
  Classe,
  Corso,
  Lezione,
  MomentoValutazione,
  PianoLezione,
  Risorsa,
} from '../dominio/modelli.js'
import { righe } from '../dominio/csv.js'
import { riscrivi, uriArchivio } from './archiviazione.js'


// ------------------------------------------------------------------ contenuti

/**
 * Griglia dei voti: una riga per allievo, una colonna per momento, e in fondo
 * la media pesata. In coda le medie di classe per colonna.
 */
export function csvValutazioni (
  classe: Classe,
  corso: Corso,
  momenti: MomentoValutazione[],
  intestazioneSemestre: string,
): string {
  const ordinati = [...momenti].sort((a, b) => a.data.localeCompare(b.data))
  const allievi = ordinaAllievi(classe.allievi.filter((a) => a.attivo))

  const intestazione: Array<string | number | null> = [
    `${classe.nome} — ${corso.titolo} — ${intestazioneSemestre}`,
  ]
  const titoli = ['Allievo', ...ordinati.map((m) => m.titolo), 'Media']
  const date = ['Data', ...ordinati.map((m) => formattaData(m.data)), '']
  const pesi = ['Peso', ...ordinati.map((m) => m.peso), '']

  const corpo = allievi.map((allievo) => {
    const voti = ordinati.map((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievo.id)
      if (!voto) return ''
      if (voto.assente) return 'ass.'
      return voto.valore === null ? '' : voto.valore
    })
    const media = mediaAllievo(ordinati, allievo.id).media
    return [nomeCompleto(allievo), ...voti, media === null ? '' : formattaVoto(media).replace('.', ',')]
  })

  return righe([intestazione, [], titoli, date, pesi, ...corpo])
}

/**
 * Quadro assenze e ritardi della classe sulle lezioni svolte. Le lezioni
 * arrivano già scelte da chi chiama: quali siano quelle della classe lo sa il
 * corso, e questo file non ha motivo di saperlo.
 */
export function csvPresenze (classe: Classe, lezioni: Lezione[], periodo = 'anno intero'): string {
  const allievi = ordinaAllievi(classe.allievi)
  // Le annullate restano fuori; il resto lo decide l'appello, come ovunque.
  const svolte = lezioni.filter((l) => l.stato !== 'annullata')

  // Le UD che il corso prevedeva nel periodo: sono le stesse per tutti, e
  // sono il denominatore della percentuale che si consegna.
  const previste = svolte.reduce((somma, l) => somma + unitaDidattiche(l).length, 0)

  // Si esporta in unità didattiche perché è l'unità in cui la scuola conta le
  // assenze: «tre lezioni» non dice niente se una era di un'ora e due di tre.
  //
  // Due percentuali, come nel PDF: quella sulle UD previste — quanto si è perso
  // di ciò che era in programma — e quella sulle UD con l'appello fatto, che
  // dice quanto la prima è affidabile.
  const intestazione = [
    'Allievo', 'Lezioni', 'UD previste', 'UD con appello', 'UD di presenza', 'UD di assenza',
    'Assenze intere', 'Assenze parziali', 'Ritardi', 'Minuti di ritardo',
    'Assenze % su previste', 'Assenze % su appello',
  ]
  const corpo = allievi.map((allievo) => {
    const s = statisticheAllievo(svolte, allievo.id)
    return [
      nomeCompleto(allievo),
      s.lezioni,
      previste,
      s.ud,
      s.presenze,
      s.udAssenza,
      s.assenze,
      s.assenzeParziali,
      s.ritardi,
      s.minutiRitardo,
      previste === 0 ? '' : `${Math.round((s.udAssenza / previste) * 100)}%`,
      `${Math.round(s.quotaAssenze * 100)}%`,
    ]
  })
  return righe([[`Classe ${classe.nome} — presenze — ${periodo}`], [], intestazione, ...corpo])
}

/** Il verbale di una lezione: quel che si consegna o si archivia dopo l'ora. */
/**
 * Una risorsa come riga di markdown: un collegamento diventa un link, un file
 * un percorso relativo alla cartella dei dati — che è dove il .md finisce, così
 * il rimando continua a funzionare aprendolo da lì.
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
  /** Le consegne date in quest’ora: hanno preso il posto del campo «compiti». */
  consegne: Consegna[] = [],
): string {
  const parti: string[] = []
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])

  parti.push(`# Lezione del ${formattaData(lezione.data, 'lungo')}`)
  parti.push('')
  parti.push(`- Classe: ${classe?.nome ?? '—'}`)
  if (lezione.aula) parti.push(`- Aula: ${lezione.aula}`)
  parti.push(
    `- Orario: ${lezione.slot
      .map((s) => `${s.inizio}–${s.fine}${s.tipo === 'pausa' ? ' (pausa)' : ''}`)
      .join(', ')}`,
  )
  parti.push(`- Durata effettiva: ${formattaDurata(minutiEffettivi(lezione))}`)
  parti.push(`- Stato: ${lezione.stato}`)
  parti.push('')

  parti.push('## Presenze')
  const ud = unitaDidattiche(lezione)
  parti.push(
    `Presenti ${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello} · ` +
      `assenti ${riepilogo.assenti} · parziali ${riepilogo.parziali} · ` +
      `ritardi ${riepilogo.ritardi} · ` +
      `${riepilogo.udAssenza} UD di assenza su ${riepilogo.udTotali}`,
  )
  // Un appello a metà si dichiara: un verbale che tace le caselle vuote le fa
  // passare per presenze, ed è la cosa che di un verbale non deve succedere.
  if (riepilogo.udSenzaAppello > 0) {
    parti.push('')
    parti.push(`> Appello incompleto: ${riepilogo.udSenzaAppello} caselle non impostate.`)
  }
  // Chi non è stato presente tutta l'ora si elenca UD per UD: è la differenza
  // fra «assente» e «arrivato alla terza», e in un verbale è quel che conta.
  const irregolari = lezione.presenze.filter((p) => p.stati.some(segnato))
  if (irregolari.length > 0) {
    parti.push('')
    for (const presenza of irregolari) {
      const minuti = presenza.minuti ? ` (${presenza.minuti} min)` : ''
      const nota = presenza.nota ? ` — ${presenza.nota}` : ''
      const dettaglio = presenza.stati
        .map((stato, i) => `UD${i + 1} ${ud[i] ? `${ud[i].inizio} ` : ''}${stato}`)
        .filter((_, i) => segnato(presenza.stati[i]))
        .join(', ')
      parti.push(`- ${nomi.get(presenza.allievoId) ?? presenza.allievoId}: ${dettaglio}${minuti}${nota}`)
    }
  }
  parti.push('')

  if (piano) {
    parti.push('## Piano lezione')
    if (piano.obiettivi.length > 0) {
      parti.push('')
      parti.push('Obiettivi:')
      for (const obiettivo of piano.obiettivi) parti.push(`- ${obiettivo}`)
    }
    // Le risorse del piano nel suo insieme: un elenco di link e di file, in una
    // forma che regge anche fuori dal registro — il markdown si legge ovunque.
    if (piano.risorse.length > 0) {
      parti.push('')
      parti.push('Risorse:')
      for (const risorsa of piano.risorse) parti.push(`- ${voceRisorsa(risorsa)}`)
    }
    parti.push('')
    for (const attivita of piano.attivita) {
      const stato = lezione.avanzamento.find((a) => a.attivitaId === attivita.id)?.stato ?? 'da-fare'
      const segno = stato === 'svolta' ? 'x' : stato === 'parziale' ? '~' : ' '
      parti.push(`- [${segno}] ${attivita.titolo} (${formattaUd(attivita.durataUd)}, ${attivita.tipo})`)
      // Le risorse della tappa rientrate sotto la sua riga: il documento
      // esportato deve leggersi come la scaletta, non come due elenchi.
      for (const risorsa of attivita.risorse) parti.push(`  - ${voceRisorsa(risorsa)}`)
    }
    parti.push('')
  }

  if (lezione.argomenti) {
    parti.push('## Argomenti svolti')
    parti.push(lezione.argomenti)
    parti.push('')
  }
  if (consegne.length > 0) {
    parti.push('## Consegne date')
    for (const consegna of consegne) {
      const chi =
        consegna.a === 'docente'
          ? 'io'
          : consegna.a === 'allievi'
            ? consegna.allieviIds.map((id) => nomi.get(id) ?? id).join(', ')
            : 'tutta la classe'
      parti.push(`- [${consegna.tipo}] ${consegna.testo} — ${chi}`)
    }
    parti.push('')
  }
  if (lezione.osservazioni.length > 0) {
    parti.push('## Osservazioni')
    for (const osservazione of lezione.osservazioni) {
      const chi = osservazione.allievoId
        ? nomi.get(osservazione.allievoId) ?? osservazione.allievoId
        : 'classe'
      parti.push(`- [${osservazione.tipo}] ${chi}: ${osservazione.testo}`)
    }
    parti.push('')
  }
  if (lezione.consuntivo) {
    parti.push('## Consuntivo')
    parti.push(lezione.consuntivo)
    parti.push('')
  }
  return parti.join('\n')
}

// ------------------------------------------------------------------ scrittura

/**
 * Scrive quel che il registro genera, al percorso che gli si dice.
 *
 * Il percorso lo compone chi chiama, con `percorsoEsportazione`: classe,
 * ambito, documento, nome del file — la stessa regola con cui si archivia
 * quel che si carica, perché finiscono nella stessa cartella.
 *
 * Si sovrascrive. Un rapporto è una fotografia di com'è il registro adesso, e
 * rifarlo vuol dire che quello di prima non serve più: numerandoli, la cartella
 * si riempiva di stampe uguali dello stesso verbale e bisognava guardare le
 * date per capire quale valesse.
 */
export async function scriviGenerato (
  relativo: string,
  contenuto: Uint8Array | string,
): Promise<vscode.Uri | null> {
  const byte = typeof contenuto === 'string' ? new TextEncoder().encode(contenuto) : contenuto
  const esito = await riscrivi(relativo, byte)
  if ('errore' in esito) return null
  return uriArchivio(esito.relativo)?.file ?? null
}
