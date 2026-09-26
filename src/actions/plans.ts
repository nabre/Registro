// I piani di lezione e le loro risorse, che se ne vanno col piano.

import * as apparato from 'apparato'

import { archivia, archiviaCopia, percorsoRisorsaPiano, rinominaArchivio } from '../data/filing.js'
import { contenutoDi } from '../data/store.js'
import { formattaData, istanteAdesso } from '../domain/dates.js'
import { creaPiano, creaRisorsa, duplicaPiano } from '../domain/factories.js'
import { classeDelCorso, corsoPerId } from '../domain/courses.js'
import type { Attivita, PianoLezione, Registro, Risorsa } from '../domain/models.js'
import { validaRisorsa, validaPiano } from '../domain/validation.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  documentoCambiato,
  fatto,
  invariato,
  rifiuta,
  riponi,
  scegliUnFile,
  type Parte,
} from './context.js'
import { parole } from '../domain/words.testi.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './plans.testi.js'

/** Le estensioni che si accettano come immagine: quelle che un webview sa disegnare. */
const ESTENSIONI_IMMAGINE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']

/** Il vettore vivo delle risorse del piano (`attivitaId` nullo) o di una sua tappa. */
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

/** I file che le risorse di un piano nominano, tappe comprese. */
function fileDi (piano: PianoLezione): string[] {
  return appese(piano).flatMap(({ risorsa }) => (risorsa.file ? [risorsa.file] : []))
}

/**
 * Ricopia i file delle risorse di un piano duplicato e riscrive i percorsi: due
 * piani sullo stesso file se lo cestinerebbero a vicenda. Un file mancante si
 * salta. Torna `false` se intanto il documento aperto è cambiato.
 */
async function ricopiaFile (
  contesto: { ancoraQui (): boolean, registro: Registro },
  copia: PianoLezione,
): Promise<boolean> {
  for (const { attivita, risorsa } of appese(copia)) {
    if (!risorsa.file) continue
    // Ogni copia aspetta il disco: può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return false
    const contenuto = await contenutoDi(risorsa.file)
    if (!contenuto) continue
    const nome = risorsa.nome || risorsa.file.split('/').pop() || 'risorsa'
    const esito = await archivia(
      percorsoRisorsaPiano(contesto.registro, copia, attivita, nome),
      contenuto,
    )
    if ('relativo' in esito) risorsa.file = esito.relativo
  }
  return contesto.ancoraQui()
}

export const piani = {
  'piano.salva': async (contesto, azione) => {
    const esito = validaPiano(azione.piano)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const prima = contesto.registro.piani.find((p) => p.id === azione.piano.id)
    const nuovo = !prima
    // I file entrano solo da `risorsa.aggiungi` e `piano.duplica`: un file non
    // già citato (né nella vecchia cartella del piano) potrebbe essere altrui,
    // e poi verrebbe cestinato. Si rifiuta, non si azzera in silenzio.
    const citati = new Set(prima ? fileDi(prima) : [])
    const estranei = fileDi(azione.piano).filter(
      (f) => !citati.has(f) && !f.startsWith(`risorse/${azione.piano.id}/`),
    )
    if (estranei.length > 0) {
      return rifiuta(testi().fileEstranei(estranei.length))
    }
    const piano = { ...azione.piano, aggiornatoIl: istanteAdesso() }
    // I file non più nominati (es. tappa tolta) vanno cestinati.
    const restano = new Set(fileDi(piano))
    const spariti = prima ? fileDi(prima).filter((f) => !restano.has(f)) : []
    const scritto = contesto.modifica((r) => {
      riponi(r.piani, piano)
    }, ['piani'])
    // A scrittura riuscita, e solo i file che nessun altro piano cita (un
    // duplicato può ancora condividerli).
    if (scritto.ok && spariti.length > 0) {
      const citati = new Set(contesto.registro.piani.flatMap(fileDi))
      for (const file of spariti) if (!citati.has(file)) await cestina(file)
    }
    if (!scritto.ok) return scritto
    return nuovo ? { ok: true, creato: { id: piano.id } } : fatto
  },

  // Via il piano, via le sue risorse, come promette la domanda di conferma.
  'piano.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'piano', id: azione.pianoId })
  },

  /** Il piano di una lezione, vuoto o copiato, legato al corso dell'ora. */
  'piano.perLezione': async (contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    const t = testi()
    if (!lezione) return rifiuta(comuni().nonTrovato.lezione)
    // Ha già un piano: invariato, non rifiuto (una chiamata ritentata è andata
    // a buon fine). Per cambiarlo c'è `piano.assegna`.
    if (lezione.pianoId) {
      return conMessaggio(t.giaUnPiano, 'info', { invariato: true })
    }

    const corso = corsoPerId(contesto.registro, lezione.corsoId)
    if (!corso) return rifiuta(t.senzaCorso)
    const classe = classeDelCorso(contesto.registro, corso)

    const origine = azione.daPianoId
      ? contesto.registro.piani.find((p) => p.id === azione.daPianoId) ?? null
      : null
    if (azione.daPianoId && !origine) return rifiuta(t.origineSparita)

    const piano = origine ? duplicaPiano(origine) : creaPiano()
    piano.corsoId = corso.id
    // La copia ha file suoi, come in `piano.duplica`.
    if (origine && !(await ricopiaFile(contesto, piano))) return documentoCambiato()

    const scritto = contesto.modifica((r) => {
      r.piani.push(piano)
      const bersaglio = r.lezioni.find((l) => l.id === azione.lezioneId)
      if (bersaglio) {
        bersaglio.pianoId = piano.id
        bersaglio.avanzamento = piano.attivita.map((a) => ({
          attivitaId: a.id,
          titolo: a.titolo,
          stato: 'da-fare' as const,
        }))
        bersaglio.aggiornataIl = istanteAdesso()
      }
    }, ['piani', 'lezioni'])
    if (!scritto.ok) return scritto

    const giorno = formattaData(lezione.data)
    return conMessaggio(
      origine ? t.copiato(giorno, classe?.nome ?? '') : t.creato(giorno, classe?.nome ?? ''),
      'info',
      { creato: { id: piano.id } },
    )
  },

  'piano.duplica': async (contesto, azione) => {
    const origine = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!origine) return rifiuta(comuni().nonTrovato.piano)
    const copia = duplicaPiano(origine)
    if (!(await ricopiaFile(contesto, copia))) return documentoCambiato()

    const scritto = contesto.modifica((r) => {
      r.piani.push(copia)
    }, ['piani'])
    if (!scritto.ok) return scritto
    return { ok: true, creato: { id: copia.id } }
  },

  'piano.assegna': (contesto, azione) => {
    if (azione.pianoId && !contesto.registro.piani.some((p) => p.id === azione.pianoId)) {
      return rifiuta(comuni().nonTrovato.piano)
    }
    // Lo stesso piano di prima non è un cambio: l'avanzamento resta.
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (lezione && (lezione.pianoId ?? null) === azione.pianoId) return invariato
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.pianoId = azione.pianoId
      // Cambiare piano azzera l'avanzamento, riferito alle attività del vecchio.
      lezione.avanzamento = []
    })
  },

  /**
   * Aggiunge una risorsa al piano o a una sua attività: un collegamento, o un
   * file/immagine copiato nell'archivio (l'originale può sparire).
   */
  'risorsa.aggiungi': async (contesto, azione) => {
    const t = testi()
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!piano) return rifiuta(comuni().nonTrovato.piano)
    if (azione.attivitaId && !piano.attivita.some((a) => a.id === azione.attivitaId)) {
      return rifiuta(t.attivitaNonTrovata)
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
        titolo: immagine ? t.titoloImmagine : t.titoloFile,
        tasto: immagine ? t.tastoImmagine : t.tastoFile,
        filtri: immagine ? { [parole().immagini]: ESTENSIONI_IMMAGINE } : undefined,
      })
      if (!scelto) return fatto
      // Durante il dialogo può essersi aperto un altro anno.
      if (!contesto.ancoraQui()) return documentoCambiato()

      if (immagine && !ESTENSIONI_IMMAGINE.includes(scelto.estensione.replace('.', ''))) {
        return rifiuta(t.nonImmagine(scelto.nome))
      }

      // Nell'archivio del corso, con un percorso leggibile anche da fuori.
      const tappa = azione.attivitaId
        ? piano.attivita.find((a) => a.id === azione.attivitaId) ?? null
        : null
      const esito = await archiviaCopia(
        percorsoRisorsaPiano(contesto.registro, piano, tappa, scelto.nome),
        scelto.uri,
      )
      if ('errore' in esito) return rifiuta(t.copiaNonRiuscita(esito.errore))

      risorsa.file = esito.relativo
      risorsa.nome = scelto.nome
      risorsa.titolo = risorsa.titolo || scelto.nome
    }

    const esito = contesto.suVoce('piani', azione.pianoId, (bersaglio) => {
      const risorse = risorseDi(bersaglio, azione.attivitaId)
      // Attività sparita durante la scelta: «non trovata».
      if (!risorse) return false
      risorse.push(risorsa)
    }, [], t.attivitaSparita)
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
        const { file, nome } = risorse[indice]
        risorse[indice] = { ...azione.risorsa, file, nome }
      }
    })
  },

  /**
   * Sposta la risorsa a un'altra tappa o al piano. Il file si rinomina (il nome
   * dice la tappa); se non riesce, la riga si sposta lo stesso.
   */
  'risorsa.sposta': async (contesto, azione) => {
    const piano = contesto.registro.piani.find((p) => p.id === azione.pianoId)
    if (!piano) return rifiuta(comuni().nonTrovato.piano)
    if (azione.daAttivitaId === azione.aAttivitaId) return fatto
    if (azione.aAttivitaId && !piano.attivita.some((a) => a.id === azione.aAttivitaId)) {
      return rifiuta(testi().attivitaNonTrovata)
    }
    const risorsa = risorseDi(piano, azione.daAttivitaId)?.find((x) => x.id === azione.risorsaId)
    if (!risorsa) return rifiuta(comuni().nonTrovato.risorsa)

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
    if (!risorsa) return rifiuta(comuni().nonTrovato.risorsa)

    // Via la riga, via anche il file.
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
    if (!risorsa) return rifiuta(comuni().nonTrovato.risorsa)

    if (risorsa.tipo === 'collegamento') {
      if (!risorsa.url) return rifiuta(testi().senzaIndirizzo)
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
