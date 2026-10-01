// I piani di lezione e le loro risorse, che se ne vanno col piano.

import * as apparato from 'apparato'

import { archivia, archiviaCopia, percorsoRisorsaPiano, pulisciCopiaOrfana, rinominaArchivio } from '#core/dati/filing.js'
import { contenutoDi } from '#core/dati/store.js'
import { istanteAdesso } from '#core/dominio/dates.js'
import { creaRisorsa, duplicaPiano } from '#core/dominio/factories.js'
import { faseDellAttivita } from '#core/dominio/projects.js'
import type { Attivita, PianoLezione, Registro, Risorsa } from '#core/dominio/models.js'
import { validaRisorsa, validaPiano } from '#core/dominio/validation.js'
import {
  aOraAperta,
  apriFile,
  cestina,
  documentoCambiato,
  fatto,
  invariato,
  rifiuta,
  rifiutaCon,
  riponi,
  scegliUnFile,
  type Parte,
} from './context.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './plans.testi.js'
import { testi as testiProgetti } from './projects.testi.js'

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
    // Una tappa lavora per un progetto del corso del piano: altrove la sua
    // lezione non comparirebbe fra quelle del progetto. La fase è sempre una
    // del progetto: omessa o d'altri, la prima, dove la tappa si legge già.
    const attivita: Attivita[] = []
    for (const tappa of azione.piano.attivita) {
      const { faseProgettoId: _fase, ...senzaFase } = tappa
      if (!tappa.progettoId) {
        attivita.push(senzaFase)
        continue
      }
      const progetto = contesto.registro.progetti.find((p) => p.id === tappa.progettoId)
      if (!progetto) return rifiutaCon('non-trovato', comuni().vociSparite.progetti)
      if (progetto.corsoId !== azione.piano.corsoId) {
        return rifiuta(testiProgetti().progettoAltroCorso)
      }
      const fase = faseDellAttivita(progetto, tappa)
      attivita.push(fase ? { ...senzaFase, faseProgettoId: fase.id } : senzaFase)
    }
    const piano = { ...azione.piano, attivita, aggiornatoIl: istanteAdesso() }
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

  'piano.assegna': aOraAperta((contesto, azione) => {
    const piano = azione.pianoId
      ? contesto.registro.piani.find((p) => p.id === azione.pianoId)
      : null
    if (azione.pianoId && !piano) return rifiuta(comuni().nonTrovato.piano)
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    // Il piano di un altro corso sparirebbe dall'elenco dei piani di quell'ora e
    // ne porterebbe la materia; uno senza corso (bozza) si aggancia a qualunque.
    if (piano?.corsoId && lezione && piano.corsoId !== lezione.corsoId) {
      return rifiuta(testi().altroCorso)
    }
    // Lo stesso piano di prima non è un cambio: l'avanzamento resta.
    if (lezione && (lezione.pianoId ?? null) === azione.pianoId) return invariato
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.pianoId = azione.pianoId
      // Cambiare piano azzera l'avanzamento, riferito alle attività del vecchio.
      lezione.avanzamento = []
    })
  }),

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
      let scelto: { nome: string, uri: apparato.Uri, estensione: string } | null = null
      if (azione.file) {
        const uri = apparato.Uri.file(azione.file)
        const nome = uri.path.split('/').pop() ?? 'file'
        const estensione = nome.includes('.') ? `.${nome.split('.').pop()}` : ''
        scelto = { nome, uri, estensione }
      } else {
        scelto = await scegliUnFile({
          titolo: immagine ? t.titoloImmagine : t.titoloFile,
          tasto: immagine ? t.tastoImmagine : t.tastoFile,
          filtri: immagine ? { [parole().immagini]: ESTENSIONI_IMMAGINE } : undefined,
        })
      }
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
    if (!esito.ok && risorsa.file) pulisciCopiaOrfana(risorsa.file)
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

  'avanzamento.imposta': aOraAperta((contesto, azione) => {
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
  }),
} satisfies Parte
