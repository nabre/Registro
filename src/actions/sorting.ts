// Lo smistamento: un PDF che arriva, le sue pagine da assegnare, e quel che
// resta da decidere. I byte entrano direttamente nel documento dell'anno, senza
// copie di passaggio; i file tolti ne escono con `cestina()`, senza cestino.

import * as apparato from 'apparato'

import { foglioDi, rigaDi, togliFoglioAssenze, trovaBloccoAssenze } from '../domain/absences.js'
import type { Divisione, Smistamento } from '../domain/models.js'
import { indiceNomi, intervalliDi, riconosci, riquadroDelNome } from '../domain/sorting.js'
import { siConsegna } from '../domain/assignments.js'
import { nomeSicuro } from '../domain/text.js'
import { apriConIlSistema } from '../data/opening.js'
import type { Archivio } from '../data/archive.js'
import { deposito } from '../data/store.js'
import { estraiElenco, testoConPosizioni } from '../data/pdf.js'
import { ocrPronto } from '../data/ocr.js'
import {
  assegnaAssenze,
  assegnaElenco,
  assegnaFirme,
  assegnaPagine,
  bytePdf,
  ricostruisci,
  scartaPagine,
  smistatoreDi,
  togliAnteprime,
} from '../data/sorter.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  consegnaConClasse,
  fatto,
  motivoSicuro,
  rifiuta,
  scegliFile,
  type Parte,
} from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './sorting.testi.js'
import { istanteAdesso } from '../domain/dates.js'

/**
 * Il nome di un ritaglio aperto nel lettore: il PDF d'origine e le pagine.
 * Non serve che sia unico: se il precedente è aperto, il deposito numera.
 */
function nomeRitaglio (smistamento: Smistamento, da: number, a: number): string {
  const senzaEstensione = smistamento.nome.replace(/\.pdf$/i, '')
  const t = testi()
  const quali = da === a ? t.pagina(da) : t.pagineDaA(da, a)
  return `${nomeSicuro(senzaEstensione, t.documento)} ${quali}.pdf`
}

/** La divisione resa scrivibile: il passo scritto a mano finisce fra 1 e 999. */
function sanaDivisione (divisione: Divisione): Divisione {
  if (divisione?.modo === 'passo') {
    const pagine = Math.round(Number(divisione.pagine))
    return { modo: 'passo', pagine: Number.isFinite(pagine) ? Math.min(Math.max(pagine, 1), 999) : 1 }
  }
  return divisione?.modo === 'mano' ? { modo: 'mano' } : { modo: 'nomi' }
}

/**
 * Chiude uno smistamento senza più niente da decidere: il PDF originale esce
 * dal documento e la riga sparisce.
 */
async function chiudiSeFinito (archivio: Archivio, smistamentoId: string): Promise<void> {
  const smistamento = archivio.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento || smistamento.blocchi.length > 0) return

  // Non annullabile: la storia non sa rimettere il PDF.
  archivio.segnaIrreversibile()
  await cestina(smistamento.file)
  await togliAnteprime(smistamento)
  archivio.modifica((r) => {
    r.smistamenti = r.smistamenti.filter((s) => s.id !== smistamentoId)
  }, ['smistamenti'])
}

/** Una fetta di pagine assegnate, come la scrive lo smistamento. */
type Fetta = Smistamento['assegnate'][number]

/** Se due fette dicono la stessa cosa: stesse pagine, stessa persona, stessa casella. */
function stessaFetta (a: Fetta, b: Fetta): boolean {
  return (
    a.allievoId === b.allievoId &&
    a.consegnaId === b.consegnaId &&
    a.da === b.da &&
    a.a === b.a &&
    Boolean(a.firme) === Boolean(b.firme) &&
    a.assenze?.classeId === b.assenze?.classeId &&
    a.assenze?.bloccoId === b.assenze?.bloccoId &&
    a.assenze?.tipo === b.assenze?.tipo &&
    a.assenze?.firmato === b.assenze?.firmato
  )
}

export const smistamento = {
  // Nessuna vista manda queste due (il flusso è per pagine): restano per
  // `tests/data/sorting.test.mjs` e per dividere a mano un PDF intero.
  /** L'assegnazione a mano: pagine, persona e documento, senza riconoscimento. */
  'smistamento.assegnaManuale': async (contesto, azione) => {
    const esito = await assegnaPagine(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.allievoId,
      azione.da,
      azione.a,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? testi().assegnazioneNonRiuscita)
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /** Cambia il modo di taglio e rifà la bozza sulle pagine non ancora archiviate. */
  'smistamento.dividi': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)

    const divisione = sanaDivisione(azione.divisione)
    contesto.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      if (suo) suo.divisione = divisione
    }, ['smistamenti'])
    ricostruisci(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * Uno o più PDF scelti dal disco: i byte vanno in quarantena nel documento,
   * l'originale resta dov'è. Senza consegna il PDF resta «senza documento».
   */
  'smistamento.carica': async (contesto, azione) => {
    if (azione.consegnaId) {
      const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
      if ('errore' in trovato) return trovato.errore
    }

    const scelti = await scegliFile({
      titolo: testi().titoloDialogo,
      tasto: testi().tasto,
      filtri: { PDF: ['pdf'] },
      molti: true,
    })
    if (!scelti || scelti.length === 0) return fatto

    const smistatore = smistatoreDi(contesto.archivio)
    const guai: string[] = []
    let entrati = 0
    for (const scelto of scelti) {
      // Se intanto si è aperto un altro anno, ci si ferma.
      if (!contesto.ancoraQui()) {
        guai.push(comuni().documentoCambiato)
        break
      }
      let byte: Uint8Array
      try {
        byte = await apparato.file.readFile(scelto.uri)
      } catch (errore) {
        guai.push(testi().illeggibile(scelto.nome, motivoSicuro(errore)))
        continue
      }
      const esito = await smistatore.smista(
        byte,
        scelto.nome,
        azione.consegnaId ?? undefined,
        '',
        sanaDivisione(azione.divisione),
        azione.classeId ?? null,
      )
      if (esito.errore) guai.push(`«${scelto.nome}»: ${esito.errore}`)
      else entrati += 1
    }
    // Rifiuto solo se non è entrato niente; altrimenti un avviso.
    if (guai.length > 0 && entrati === 0) return rifiuta(...guai)
    if (guai.length > 0) return conMessaggio(guai.join(' '), 'avviso')
    return fatto
  },

  /** Un PDF trascinato nel pannello, in base64: la sandbox conosce il contenuto, non il percorso. */
  'smistamento.deposita': async (contesto, azione) => {
    if (azione.consegnaId) {
      const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
      if ('errore' in trovato) return trovato.errore
    }

    let byte: Uint8Array
    try {
      byte = new Uint8Array(Buffer.from(azione.contenuto, 'base64'))
    } catch {
      return rifiuta(testi().trascinatoIlleggibile)
    }
    if (byte.length === 0) return rifiuta(testi().trascinatoVuoto)

    const nome = nomeSicuro(azione.nome, 'documento.pdf')
    const esito = await smistatoreDi(contesto.archivio).smista(
      byte,
      nome,
      azione.consegnaId ?? undefined,
      '',
      sanaDivisione(azione.divisione),
      azione.classeId ?? null,
    )
    if (esito.errore) return rifiuta(`«${nome}»: ${esito.errore}`)
    return fatto
  },

  /** Le pagine trascinate su una casella della matrice: come l'assegnazione a mano, ma per elenco. */
  'smistamento.assegnaPagine': async (contesto, azione) => {
    // La consegna deve riguardare la persona: anche qui, non solo nella matrice.
    const richiesta = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (
      richiesta &&
      richiesta.a !== 'classe' &&
      !richiesta.allieviIds.includes(azione.allievoId)
    ) {
      return rifiuta(testi().richiestaNonSua)
    }
    const esito = await assegnaElenco(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.allievoId,
      azione.pagine,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? testi().assegnazioneNonRiuscita)
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Archivia ogni riga della bozza che ha un nome. Dall'ultima pagina alla
   * prima, perché ogni assegnazione rifà la bozza.
   */
  'smistamento.confermaTutto': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)
    const consegnaId = smistamento.consegnaId
    if (!consegnaId) return rifiuta(testi().senzaDocumento)

    const proposte = smistamento.blocchi
      .filter((b) => b.allievoId)
      .map((b) => ({ allievoId: b.allievoId as string, da: b.da, a: b.a }))
      .sort((x, y) => y.da - x.da)
    if (proposte.length === 0) return rifiuta(testi().nessunaProposta)

    const guai: string[] = []
    for (const proposta of proposte) {
      const esito = await assegnaPagine(
        contesto.archivio,
        smistamento.id,
        consegnaId,
        proposta.allievoId,
        proposta.da,
        proposta.a,
      )
      if (!esito.ok && esito.errore) guai.push(esito.errore)
    }
    await chiudiSeFinito(contesto.archivio, smistamento.id)
    return guai.length > 0 ? rifiuta(...guai) : fatto
  },

  /** Butta le pagine scelte, a intervalli per non rifare la bozza a ogni pagina. */
  'smistamento.scartaPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)
    const tratti = intervalliDi(azione.pagine)
    if (tratti.length === 0) return rifiuta(testi().nessunaDaButtare)
    for (const tratto of tratti) {
      scartaPagine(contesto.archivio, smistamento.id, tratto.da, tratto.a)
    }
    await chiudiSeFinito(contesto.archivio, smistamento.id)
    return fatto
  },

  /** Rimette in coda alla lettura le pagine scelte, anche quelle che hanno già un testo. */
  'smistamento.leggiPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)

    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const dentro = new Set(smistamento.letture.map((l) => l.numero))
    const lavori = [...new Set(azione.pagine)]
      .filter((pagina) => dentro.has(pagina))
      .sort((x, y) => x - y)
      .map((pagina) => ({
        smistamentoId: smistamento.id,
        pagina,
        etichetta: testi().etichettaPagina(smistamento.nome, pagina),
      }))
    if (lavori.length === 0) return rifiuta(testi().nonPiuInAttesa)

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  /** Apre solo quelle pagine nel lettore, da un ritaglio fra i file di servizio (fuori dal documento). */
  'smistamento.apriPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)

    const byte = await bytePdf(smistamento)
    const t = testi()
    if (!byte) return rifiuta(t.originaleSparito)

    const pagine = [...new Set(azione.pagine)].sort((x, y) => x - y)
    if (pagine.length === 0) return rifiuta(t.nessunaDaAprire)

    let destinazione: apparato.Uri | null
    try {
      destinazione = await deposito()?.servizio(
        nomeRitaglio(smistamento, pagine[0], pagine[pagine.length - 1]),
        await estraiElenco(byte, pagine),
      ) ?? null
    } catch (errore) {
      return rifiuta(t.ritaglioNonRiuscito(motivoSicuro(errore)))
    }
    if (!destinazione) return rifiuta(comuni().nessunAnno)
    if (!(await apriConIlSistema(destinazione))) {
      return conMessaggio(t.ritaglioNonApribile, 'avviso')
    }
    return fatto
  },

  /**
   * Le pagine trascinate su una casella delle assenze. Il tipo (assenze o
   * ritardi, firmato o no) lo dice la casella: i due rapporti si somigliano troppo.
   */
  'smistamento.assegnaAssenze': async (contesto, azione) => {
    const esito = await assegnaAssenze(
      contesto.archivio,
      azione.smistamentoId,
      { classeId: azione.classeId, bloccoId: azione.bloccoId, allievoId: azione.allievoId },
      azione.genere,
      azione.firmato,
      azione.pagine,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? testi().archiviazioneNonRiuscita)
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /** Le pagine trascinate sulla casella delle firme: il foglio firme di quella richiesta. */
  'smistamento.assegnaFirme': async (contesto, azione) => {
    const esito = await assegnaFirme(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.pagine,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? testi().archiviazioneNonRiuscita)
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Riprende pagine archiviate per sbaglio: torna indietro l'intera fetta di
   * cui facevano parte, il file esce, la spunta si toglie, le pagine tornano
   * da smistare con il loro testo.
   */
  'smistamento.riprendiPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)

    const chieste = new Set(azione.pagine)
    const toccate = smistamento.assegnate.filter((fetta) => {
      for (let n = fetta.da; n <= fetta.a; n += 1) if (chieste.has(n)) return true
      return false
    })
    if (toccate.length === 0) return rifiuta(testi().nonArchiviate)

    // Prima i file, poi il registro: se il cestino rifiuta, il registro è intatto.
    for (const fetta of toccate) {
      // Il foglio delle assenze sta nel periodo, non in una richiesta.
      if (fetta.assenze) {
        const dove = trovaBloccoAssenze(
          contesto.registro,
          fetta.assenze.classeId,
          fetta.assenze.bloccoId,
        )
        const riga = dove ? rigaDi(dove.blocco, fetta.allievoId) : null
        const foglio = foglioDi(riga, fetta.assenze.tipo, fetta.assenze.firmato)
        if (foglio) await cestina(foglio.file)
        continue
      }
      const consegnaId = fetta.consegnaId ?? smistamento.consegnaId
      const consegna = contesto.registro.consegne.find((c) => c.id === consegnaId)
      if (fetta.firme) {
        if (consegna?.fileFirme) await cestina(consegna.fileFirme)
        continue
      }
      const documento = (consegna?.documenti ?? []).find((d) => d.allievoId === fetta.allievoId)
      if (documento) await cestina(documento.file)
    }

    // Il testo delle pagine che tornano, riletto dal PDF ancora in quarantena.
    const byte = await bytePdf(smistamento)
    const lette = byte ? await testoConPosizioni(byte).catch(() => []) : []
    const classe = contesto.registro.classi.find((c) => c.id === smistamento.classeId) ?? null
    const indice = classe ? indiceNomi(classe.allievi) : null

    const ora = istanteAdesso()
    const scritto = contesto.modifica((r) => {
      for (const fetta of toccate) {
        if (fetta.assenze) {
          togliFoglioAssenze(
            r,
            {
              classeId: fetta.assenze.classeId,
              bloccoId: fetta.assenze.bloccoId,
              allievoId: fetta.allievoId,
            },
            fetta.assenze.tipo,
            fetta.assenze.firmato,
          )
          continue
        }
        const consegnaId = fetta.consegnaId ?? smistamento.consegnaId
        const consegna = r.consegne.find((c) => c.id === consegnaId)
        if (consegna && fetta.firme) {
          consegna.fileFirme = undefined
          consegna.nomeFirme = undefined
          consegna.aggiornataIl = ora
          continue
        }
        if (consegna) {
          consegna.documenti = (consegna.documenti ?? []).filter(
            (d) => d.allievoId !== fetta.allievoId,
          )
          // Su una richiesta che si raccoglie, la spunta era quel foglio.
          if (!siConsegna(consegna)) {
            consegna.fatte = consegna.fatte.filter((f) => f.chi !== fetta.allievoId)
          }
          consegna.aggiornataIl = ora
        }
      }

      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      if (!suo) return
      const tornate = new Set<number>()
      for (const fetta of toccate) {
        for (let n = fetta.da; n <= fetta.a; n += 1) tornate.add(n)
      }
      // Per valore, non per identità: dopo le attese una rilettura può aver
      // sostituito gli oggetti.
      suo.assegnate = suo.assegnate.filter((fetta) => !toccate.some((t) => stessaFetta(t, fetta)))
      const restaurate = [...tornate].map((numero) => {
        const pagina = lette[numero - 1]
        const testo = pagina?.testo ?? ''
        const trovato = indice && testo ? riconosci(testo, indice).trovato : ''
        return {
          numero,
          testo: testo.slice(0, 400),
          lettura: testo.length > 0 ? ('testo' as const) : ('niente' as const),
          riquadroNome: trovato && pagina ? riquadroDelNome(pagina.pezzi, trovato) : undefined,
        }
      })
      suo.letture = [...suo.letture, ...restaurate].sort((x, y) => x.numero - y.numero)
    }, ['consegne', 'fascicoli', 'smistamenti'])
    if (!scritto.ok) return scritto

    ricostruisci(contesto.archivio, smistamento.id)
    return fatto
  },

  /** Mette in coda tutte le pagine senza testo di un PDF; quelle con testo restano fuori. */
  'smistamento.leggiTutto': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)

    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const lavori = smistamento.letture
      .filter((l) => l.lettura === 'niente')
      .map((l) => ({
        smistamentoId: smistamento.id,
        pagina: l.numero,
        etichetta: testi().etichettaPagina(smistamento.nome, l.numero),
      }))
    if (lavori.length === 0) return rifiuta(testi().nessunaScansione)

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  /**
   * Rilegge da capo le pagine attive (cioè ancora in `letture`) di più PDF,
   * nell'ordine dei PDF e poi delle pagine.
   */
  'smistamento.rileggiAttive': async (contesto, azione) => {
    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const chiesti = new Set(azione.smistamentiId)
    const lavori = contesto.registro.smistamenti
      .filter((smistamento) => chiesti.has(smistamento.id))
      .flatMap((smistamento) =>
        smistamento.letture.map((lettura) => ({
          smistamentoId: smistamento.id,
          pagina: lettura.numero,
          etichetta: testi().etichettaPagina(smistamento.nome, lettura.numero),
        })),
      )
    if (lavori.length === 0) return rifiuta(testi().nessunaDaRileggere)

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  'smistamento.fermaLettura': (contesto, _azione) => {
    smistatoreDi(contesto.archivio).fermaLettura()
    return fatto
  },

  /**
   * Dichiara o cambia la classe di un PDF (es. una scansione che attraversa
   * due classi). Le pagine già archiviate restano; non si rilegge il file
   * (come `aggancia`) ma si rifà la bozza con `ricostruisci`. La consegna si
   * toglie: appartiene all'altra classe, e `contestoSmistamento` la guarda per prima.
   */
  'smistamento.attribuisci': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    if (!classe) return rifiuta(testi().classeSparita)
    if (smistamento.classeId === classe.id && !smistamento.consegnaId) return fatto

    const prima = contesto.registro.classi.find((c) => c.id === smistamento.classeId) ?? null
    contesto.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      if (!suo) return
      suo.classeId = classe.id
      suo.consegnaId = null
    }, ['smistamenti'])
    ricostruisci(contesto.archivio, smistamento.id)

    const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
    return conMessaggio(
      prima
        ? testi().passate(smistamento.nome, restano, prima.nome, classe.nome)
        : testi().oraDi(smistamento.nome, classe.nome),
      'info',
    )
  },

  'smistamento.apri': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().nessunPdf)
    return apriFile(smistamento.file, smistamento.nome)
  },

  /** Toglie il PDF e la riga che lo aspettava. */
  'smistamento.elimina': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta(testi().smistamentoSparito)
    // Come in `chiudiSeFinito`: non annullabile.
    contesto.archivio.segnaIrreversibile()
    await cestina(smistamento.file)
    await togliAnteprime(smistamento)
    return contesto.modifica((r) => {
      r.smistamenti = r.smistamenti.filter((s) => s.id !== smistamento.id)
    }, ['smistamenti'])
  },

  /**
   * Apre le impostazioni dell'OCR nella finestra nativa: sono della macchina,
   * non dell'anno, e il filtro lo legge solo lei.
   */
  'smistamento.impostazioni': async (_contesto, _azione) => {
    await apparato.comandi.esegui(
      'registroDocenti.impostazioniFinestra',
      'registroDocenti.ocr',
    )
    return fatto
  },
} satisfies Parte
