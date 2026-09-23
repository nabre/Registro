// I piani di lezione e i materiali che portano con sé.
//
// Un piano vive più a lungo dell'ora in cui lo si usa, e le sue risorse stanno
// in una cartella sua: quando il piano se ne va, se ne va anche quella.

import * as apparato from 'apparato'

import { archivia, archiviaCopia, percorsoRisorsaPiano, rinominaArchivio } from '../data/filing.js'
import { contenutoDi } from '../data/store.js'
import { formattaData } from '../domain/dates.js'
import { creaPiano, creaRisorsa, duplicaPiano } from '../domain/factories.js'
import { classeDelCorso, corsoPerId } from '../domain/courses.js'
import type { Attivita, PianoLezione, Risorsa } from '../domain/models.js'
import { validaRisorsa, validaPiano } from '../domain/validation.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  documentoCambiato,
  fatto,
  rifiuta,
  riponi,
  scegliUnFile,
  type Parte,
} from './context.js'

/** Le estensioni che si accettano come immagine: quelle che un webview sa disegnare. */
const ESTENSIONI_IMMAGINE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']

/**
 * Dove stanno le risorse di un piano: quelle del piano intero se `attivitaId` è
 * nullo, quelle di una tappa della scaletta altrimenti. Torna il vettore vivo,
 * da modificare in posto dentro una `modifica`.
 */
function risorseDi (
  piano: PianoLezione | undefined,
  attivitaId: string | null,
): Risorsa[] | null {
  if (!piano) return null
  if (!attivitaId) return piano.risorse
  return piano.attivita.find((a) => a.id === attivitaId)?.risorse ?? null
}

/** Le risorse di un piano, ciascuna con la tappa a cui è appesa (nulla se è del piano). */
function appese (piano: PianoLezione): Array<{ attivita: Attivita | null, risorsa: Risorsa }> {
  return [
    ...piano.risorse.map((risorsa) => ({ attivita: null, risorsa })),
    ...piano.attivita.flatMap((a) => a.risorse.map((risorsa) => ({ attivita: a, risorsa }))),
  ]
}

export const piani = {
  'piano.salva': (contesto, azione) => {
    const esito = validaPiano(azione.piano)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const nuovo = !contesto.registro.piani.some((p) => p.id === azione.piano.id)
    const piano = { ...azione.piano, aggiornatoIl: new Date().toISOString() }
    contesto.modifica((r) => {
      riponi(r.piani, piano)
    }, ['piani'])
    return nuovo ? { ok: true, creato: { id: piano.id } } : fatto
  },

  // Via il piano, via la sua cartella di risorse: i file non servono più a
  // nessuno e nessuno saprebbe più a che cosa appartenevano. È quel che il
  // pannello ha promesso nella domanda di conferma.
  'piano.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'piano', id: azione.pianoId })
  },

  /**
   * Il piano di una lezione: vuoto da completare, o copiato da uno esistente.
   * In tutti e due i casi prende la materia del corso, che è quel che lo rende
   * ritrovabile l'anno prossimo.
   */
  'piano.perLezione': (contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiuta('Lezione non trovata.')
    if (lezione.pianoId) return rifiuta('La lezione ha già un piano assegnato.')

    const corso = corsoPerId(contesto.registro, lezione.corsoId)
    if (!corso) return rifiuta('La lezione non è agganciata a nessun corso.')
    const classe = classeDelCorso(contesto.registro, corso)

    const origine = azione.daPianoId
      ? contesto.registro.piani.find((p) => p.id === azione.daPianoId) ?? null
      : null
    if (azione.daPianoId && !origine) return rifiuta('Il piano da copiare non esiste più.')

    const piano = origine ? duplicaPiano(origine) : creaPiano()
    piano.corsoId = corso.id

    contesto.archivio.modifica((r) => {
      r.piani.push(piano)
      const bersaglio = r.lezioni.find((l) => l.id === azione.lezioneId)
      if (bersaglio) {
        bersaglio.pianoId = piano.id
        bersaglio.avanzamento = piano.attivita.map((a) => ({
          attivitaId: a.id,
          titolo: a.titolo,
          stato: 'da-fare' as const,
        }))
        bersaglio.aggiornataIl = new Date().toISOString()
      }
    }, ['piani', 'lezioni'])

    return conMessaggio(
      origine
        ? `Piano copiato per la lezione del ${formattaData(lezione.data)}${classe ? ` di ${classe.nome}` : ''}.`
        : `Piano da completare creato per la lezione del ${formattaData(lezione.data)}${classe ? ` di ${classe.nome}` : ''}.`,
      'info',
      { creato: { id: piano.id } },
    )
  },

  'piano.duplica': async (contesto, azione) => {
    const origine = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!origine) return rifiuta('Piano non trovato.')
    const copia = duplicaPiano(origine)

    // I file delle risorse si ricopiano davvero, uno per uno: due piani che
    // puntano allo stesso file diventerebbero un piano solo appena si cancella
    // l'altro. Un file che non si trova più non ferma la copia — la riga resta,
    // e il pannello dirà che il file non è più nella cartella.
    for (const { attivita, risorsa } of appese(copia)) {
      if (!risorsa.file) continue
      // Ogni copia aspetta il disco: se intanto si è aperto un altro anno, i
      // file di questo piano finirebbero dentro quello.
      if (!contesto.ancoraQui()) return documentoCambiato()
      const contenuto = await contenutoDi(risorsa.file)
      if (!contenuto) continue
      const nome = risorsa.nome || risorsa.file.split('/').pop() || 'risorsa'
      const esito = await archivia(
        percorsoRisorsaPiano(contesto.registro, copia, attivita, nome),
        contenuto,
      )
      if ('relativo' in esito) risorsa.file = esito.relativo
    }

    const scritto = contesto.modifica((r) => {
      r.piani.push(copia)
    }, ['piani'])
    if (!scritto.ok) return scritto
    return { ok: true, creato: { id: copia.id } }
  },

  'piano.assegna': (contesto, azione) => {
    if (azione.pianoId && !contesto.registro.piani.some((p) => p.id === azione.pianoId)) {
      return rifiuta('Piano non trovato.')
    }
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.pianoId = azione.pianoId
      // Cambiare piano azzera l'avanzamento: si riferiva ad attività di un
      // altro piano, e tenerlo darebbe spunte su righe che non esistono più.
      lezione.avanzamento = []
    })
  },

  /**
   * Aggiunge una risorsa al piano o a una sua attività. Un collegamento è
   * solo un indirizzo; un file e un'immagine si scelgono da disco e si
   * copiano dentro la cartella dei dati, perché il file scelto può stare in
   * Download e sparire, mentre il piano deve reggere anche l'anno prossimo.
   */
  'risorsa.aggiungi': async (contesto, azione) => {
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!piano) return rifiuta('Piano non trovato.')
    if (azione.attivitaId && !piano.attivita.some((a) => a.id === azione.attivitaId)) {
      return rifiuta('Attività non trovata in questo piano.')
    }

    const risorsa = creaRisorsa(azione.genere, azione.titolo ?? '')

    if (azione.genere === 'collegamento') {
      risorsa.url = (azione.url ?? '').trim()
      risorsa.titolo = risorsa.titolo || risorsa.url
      const esito = validaRisorsa(risorsa)
      if (!esito.valido) return { ok: false, errori: esito.errori }
    } else {
      const immagine = azione.genere === 'immagine'
      const scelto = await scegliUnFile({
        titolo: immagine ? 'Aggiungi un’immagine al piano' : 'Aggiungi un file al piano',
        tasto: immagine ? 'Aggiungi immagine' : 'Aggiungi file',
        filtri: immagine ? { Immagini: ESTENSIONI_IMMAGINE } : undefined,
      })
      // Dialogo chiuso senza scegliere: non è un errore, non si dice niente.
      if (!scelto) return fatto
      // Il dialogo può essere rimasto aperto a lungo: se intanto si è aperto un
      // altro anno, il file finirebbe dentro quello.
      if (!contesto.ancoraQui()) return documentoCambiato()

      if (immagine && !ESTENSIONI_IMMAGINE.includes(scelto.estensione.replace('.', ''))) {
        return rifiuta(`«${scelto.nome}» non è un'immagine che il registro sappia mostrare.`)
      }

      // Nell'archivio, con gli altri documenti del corso: la cartella si apre
      // anche da fuori dal registro, e `risorse/<id>` non diceva niente a
      // nessuno.
      const tappa = azione.attivitaId
        ? piano.attivita.find((a) => a.id === azione.attivitaId) ?? null
        : null
      const esito = await archiviaCopia(
        percorsoRisorsaPiano(contesto.registro, piano, tappa, scelto.nome),
        scelto.uri,
      )
      if ('errore' in esito) return rifiuta(`Copia della risorsa non riuscita: ${esito.errore}`)

      risorsa.file = esito.relativo
      risorsa.nome = scelto.nome
      risorsa.titolo = risorsa.titolo || scelto.nome
    }

    const esito = contesto.suVoce('piani', azione.pianoId, (bersaglio) => {
      const risorse = risorseDi(bersaglio, azione.attivitaId)
      // L'attività è sparita mentre si sceglieva il file: «non trovata», non
      // «fatto» su una risorsa che non c'è da nessuna parte.
      if (!risorse) return false
      risorse.push(risorsa)
    }, [], 'Attività non trovata in questo piano: forse è già sparita.')
    return esito.ok ? { ...esito, creato: { id: risorsa.id } } : esito
  },

  'risorsa.salva': (contesto, azione) => {
    const esito = validaRisorsa(azione.risorsa)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    return contesto.suVoce('piani', azione.pianoId, (bersaglio) => {
      const risorse = risorseDi(bersaglio, azione.attivitaId)
      if (!risorse) return
      const indice = risorse.findIndex((x) => x.id === azione.risorsa.id)
      // Il file non si cambia da qui: lo si sostituisce aggiungendone un altro.
      if (indice >= 0) {
        risorse[indice] = { ...azione.risorsa, file: risorse[indice].file, nome: risorse[indice].nome }
      }
    })
  },

  /**
   * La risorsa passa a un'altra tappa, o al piano nel suo insieme.
   *
   * Il file si sposta con lei: il suo nome dice a quale tappa appartiene, e
   * una scheda che si chiama «Lavoro di gruppo» appesa al ripasso è un nome
   * che mente. Se il file non si riesce a rinominare la riga si sposta lo
   * stesso — meglio un nome vecchio che una risorsa bloccata dov'era.
   */
  'risorsa.sposta': async (contesto, azione) => {
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!piano) return rifiuta('Piano non trovato.')
    if (azione.daAttivitaId === azione.aAttivitaId) return fatto
    if (azione.aAttivitaId && !piano.attivita.some((a) => a.id === azione.aAttivitaId)) {
      return rifiuta('Attività non trovata in questo piano.')
    }
    const risorsa = risorseDi(piano, azione.daAttivitaId)?.find((x) => x.id === azione.risorsaId)
    if (!risorsa) return rifiuta('Risorsa non trovata.')

    let file = risorsa.file
    if (file) {
      const tappa = azione.aAttivitaId
        ? piano.attivita.find((a) => a.id === azione.aAttivitaId) ?? null
        : null
      const nome = risorsa.nome || file.split('/').pop() || 'risorsa'
      const spostato = await rinominaArchivio(
        file,
        percorsoRisorsaPiano(contesto.registro, piano, tappa, nome),
      )
      if (spostato) file = spostato
    }

    return contesto.suVoce('piani', azione.pianoId, (bersaglio) => {
      const partenza = risorseDi(bersaglio, azione.daAttivitaId)
      const arrivo = risorseDi(bersaglio, azione.aAttivitaId)
      if (!partenza || !arrivo) return
      const indice = partenza.findIndex((x) => x.id === azione.risorsaId)
      if (indice < 0) return
      const [mossa] = partenza.splice(indice, 1)
      arrivo.push({ ...mossa, file })
    })
  },

  'risorsa.elimina': async (contesto, azione) => {
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    const risorsa = risorseDi(piano, azione.attivitaId)?.find((x) => x.id === azione.risorsaId)
    if (!risorsa) return rifiuta('Risorsa non trovata.')

    // Via la riga, via anche il file: un file che nessuno nomina più resta a
    // ingrossare una cartella che nessuno guarda.
    await cestina(risorsa.file)
    return contesto.suVoce('piani', azione.pianoId, (bersaglio) => {
      const risorse = risorseDi(bersaglio, azione.attivitaId)
      if (!risorse) return
      const indice = risorse.findIndex((x) => x.id === azione.risorsaId)
      if (indice >= 0) risorse.splice(indice, 1)
    })
  },

  'risorsa.apri': async (contesto, azione) => {
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    const risorsa = risorseDi(piano, azione.attivitaId)?.find((x) => x.id === azione.risorsaId)
    if (!risorsa) return rifiuta('Risorsa non trovata.')

    if (risorsa.tipo === 'collegamento') {
      if (!risorsa.url) return rifiuta('Questo collegamento non ha un indirizzo.')
      await apparato.esterno.apri(apparato.Uri.parse(risorsa.url))
      return fatto
    }

    return apriFile(risorsa.file, risorsa.titolo)
  },

  'avanzamento.imposta': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      const voce = lezione.avanzamento.find((a) => a.attivitaId === azione.attivitaId)
      if (voce) {
        voce.stato = azione.stato
        if (azione.nota !== undefined) voce.nota = azione.nota
      } else {
        const piano = r.piani.find((pp) => pp.id === lezione.pianoId) ?? null
        const attivita = piano?.attivita.find((a) => a.id === azione.attivitaId) ?? null
        lezione.avanzamento.push({
          attivitaId: azione.attivitaId,
          titolo: attivita?.titolo ?? '',
          stato: azione.stato,
          nota: azione.nota,
        })
      }
    })
  },
} satisfies Parte
