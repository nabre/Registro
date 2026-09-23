// Lo smistamento: un PDF che arriva, le sue pagine da assegnare, e quel che
// resta da decidere.
//
// I file entrano da qui e non da una cartella su disco: un PDF trascinato nel
// pannello, o scelto con «Carica un PDF», arriva con i suoi byte in mano e
// finisce dentro il documento dell'anno in un gesto solo. Non c'è una copia di
// passaggio da nessuna parte — e quindi non c'è niente che possa restare a
// metà se il registro viene chiuso nel mezzo.
//
// È l'area con più file in movimento del registro — anteprime, ritagli,
// quarantena — e la regola è sempre la stessa: niente si cancella davvero,
// tutto passa dal cestino del sistema.

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
  rifiuta,
  scegliFile,
  type Parte,
} from './context.js'

/**
 * La divisione come si può scrivere nel documento dell'anno.
 *
 * Il passo arriva da un campo che si scrive a mano: una virgola, uno zero o un
 * numero enorme non devono diventare un taglio impossibile — a zero pagine per
 * documento non si finirebbe mai, e il ciclo che taglia girerebbe a vuoto.
 */
/**
 * Come si chiama un ritaglio che si apre nel lettore del sistema.
 *
 * Il nome che compare nella finestra del lettore è questo, e prima era
 * `smi-m3k9x2-a7f1-pagine 4-6.pdf`: distingueva i ritagli fra loro, ma a chi
 * guardava non diceva di che PDF fossero quelle pagine. Il nome del file
 * arrivato lo dice, ed è la stessa regola con cui `deposito.materializza`
 * conserva i nomi veri: quel che si legge nel lettore deve essere un nome.
 *
 * Unici non devono essere: nascono per essere guardati adesso, vivono fra le
 * copie di servizio e si riscrivono a ogni giro — e se quello di prima è
 * ancora aperto, ci pensa il deposito a numerare il nuovo.
 */
function nomeRitaglio (smistamento: Smistamento, da: number, a: number): string {
  const senzaEstensione = smistamento.nome.replace(/\.pdf$/i, '')
  const quali = da === a ? `pagina ${da}` : `pagine ${da}-${a}`
  return `${nomeSicuro(senzaEstensione, 'documento')} ${quali}.pdf`
}

function sanaDivisione (divisione: Divisione): Divisione {
  if (divisione?.modo === 'passo') {
    const pagine = Math.round(Number(divisione.pagine))
    return { modo: 'passo', pagine: Number.isFinite(pagine) ? Math.min(Math.max(pagine, 1), 999) : 1 }
  }
  return divisione?.modo === 'mano' ? { modo: 'mano' } : { modo: 'nomi' }
}

/**
 * Chiude uno smistamento quando non resta più niente da decidere: il PDF
 * originale va nel cestino di sistema e la riga sparisce.
 *
 * Nel cestino e non cancellato, come ogni altro file del registro: le pagine
 * sono già dentro le consegne, ma il dubbio su un ritaglio viene sempre dopo.
 */
async function chiudiSeFinito (archivio: Archivio, smistamentoId: string): Promise<void> {
  const smistamento = archivio.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento || smistamento.blocchi.length > 0) return

  await cestina(smistamento.file)
  await togliAnteprime(smistamento)
  archivio.modifica((r) => {
    r.smistamenti = r.smistamenti.filter((s) => s.id !== smistamentoId)
  }, ['smistamenti'])
}

export const smistamento = {
  // Nessuna vista manda più queste due: il flusso a blocchi è stato sostituito
  // da quello per pagine (`assegnaPagine`, `apriPagine`, `leggiPagine`). Restano
  // perché `tests/data/sorting.test.mjs` le esercita e perché descrivono un
  // caso che il flusso per pagine non copre — dividere a mano un PDF arrivato
  // tutto insieme. Vanno tolte insieme alle loro prove, se si decide che il
  // caso non serve più.
  /**
   * L'assegnazione a mano: si dicono le pagine, la persona e il documento.
   *
   * È la via che non passa dal riconoscimento, e serve sempre: le scansioni
   * che nessun OCR legge, i documenti in cui il nome non c'è, i casi in cui
   * chi guarda sa una cosa che il registro non può sapere. Il documento si
   * sceglie qui perché in un PDF di segreteria possono esserci due pratiche
   * diverse, e costringerle nella richiesta con cui il file è arrivato
   * vorrebbe dire archiviare una cosa sotto il nome di un'altra.
   */
  'smistamento.assegnaManuale': async (contesto, azione) => {
    const esito = await assegnaPagine(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.allievoId,
      azione.da,
      azione.a,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? 'Assegnazione non riuscita.')
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Il modo di taglio cambiato su un PDF già in attesa, e la bozza rifatta.
   *
   * Le pagine già archiviate non tornano indietro: sono uscite dalle letture
   * quando qualcuno le ha assegnate, e adesso sono documenti di qualcuno. Si
   * ritaglia quel che è rimasto in ballo, che è esattamente quel che chiede
   * chi si accorge di aver detto «due pagine» su un PDF da tre.
   */
  'smistamento.dividi': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')

    const divisione = sanaDivisione(azione.divisione)
    contesto.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      if (suo) suo.divisione = divisione
    }, ['smistamenti'])
    ricostruisci(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * Uno o più PDF scelti dal disco, portati dentro il documento dell'anno.
   *
   * Il file non si sposta e non si copia da nessuna parte: se ne leggono i
   * byte e quelli finiscono in quarantena dentro `2026-2027.registro`. Chi lo
   * ha scelto se lo ritrova dov'era — è roba sua, e un registro che sposta i
   * file della gente è un registro di cui non ci si fida.
   *
   * Il documento a cui appartengono si può non dirlo: senza, il PDF resta in
   * attesa con scritto «senza documento», e lo si aggancia o lo si divide a
   * mano dal pannello. È quel che serve quando in un file di segreteria ci
   * sono due pratiche diverse.
   */
  'smistamento.carica': async (contesto, azione) => {
    if (azione.consegnaId) {
      const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
      if ('errore' in trovato) return trovato.errore
    }

    const scelti = await scegliFile({
      titolo: 'PDF da smistare',
      tasto: 'Smista',
      filtri: { PDF: ['pdf'] },
      molti: true,
    })
    if (!scelti || scelti.length === 0) return fatto

    const smistatore = smistatoreDi(contesto.archivio)
    const guai: string[] = []
    let entrati = 0
    for (const scelto of scelti) {
      let byte: Uint8Array
      try {
        byte = await apparato.file.readFile(scelto.uri)
      } catch (errore) {
        guai.push(`«${scelto.nome}»: non si riesce a leggerlo (${(errore as Error).message}).`)
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
    // Un file andato storto in mezzo ad altri riusciti non è un rifiuto: si
    // dice quale, e gli altri restano dentro.
    if (guai.length > 0 && entrati === 0) return rifiuta(...guai)
    if (guai.length > 0) return conMessaggio(guai.join(' '), 'avviso')
    return fatto
  },

  /**
   * Un PDF trascinato nel pannello: i suoi byte, e basta.
   *
   * Arriva in base64 perché il webview vive in una sandbox e di un file
   * trascinato conosce il contenuto, non dove stia sul disco. Non c'è nessuna
   * cartella di passaggio: quel che arriva entra nel documento dell'anno.
   */
  'smistamento.deposita': async (contesto, azione) => {
    if (azione.consegnaId) {
      const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
      if ('errore' in trovato) return trovato.errore
    }

    let byte: Uint8Array
    try {
      byte = new Uint8Array(Buffer.from(azione.contenuto, 'base64'))
    } catch {
      return rifiuta('Il file trascinato non si riesce a leggere.')
    }
    if (byte.length === 0) return rifiuta('Il file trascinato è vuoto.')

    // La stessa `nomeSicuro` già importata in testa a questo file: dieci righe
    // più su la si usa, qui se ne riscriveva una versione più povera — senza
    // barra rovescia, senza caratteri di controllo, senza nomi riservati.
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

  /**
   * Le pagine trascinate su una casella della matrice.
   *
   * È la stessa archiviazione dell'assegnazione a mano — stesso ritaglio,
   * stessa spunta, stesso rifiuto se quella casella è già piena — e cambia
   * soltanto il modo di dire quali pagine: un elenco, perché un mucchio di
   * pagine scelte con il mouse non è quasi mai un intervallo.
   */
  'smistamento.assegnaPagine': async (contesto, azione) => {
    // La consegna deve riguardare la persona a cui si archivia. Il controllo
    // sta anche qui e non solo nella matrice, perché una spunta su una
    // richiesta che a quella persona non era stata fatta è un dato storto che
    // poi nessuna schermata mostra: resta nel JSON e basta.
    const richiesta = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (
      richiesta &&
      richiesta.a !== 'classe' &&
      !richiesta.allieviIds.includes(azione.allievoId)
    ) {
      return rifiuta('Quella richiesta non è stata fatta a questa persona.')
    }
    const esito = await assegnaElenco(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.allievoId,
      azione.pagine,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? 'Assegnazione non riuscita.')
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Tutta la bozza in un gesto: ogni riga che ha già un nome viene archiviata.
   *
   * Si conferma dall'ultima pagina alla prima perché ogni assegnazione toglie
   * pagine dalla bozza e la rifà: scorrendola in avanti si lavorerebbe su un
   * elenco che cambia sotto le mani.
   */
  'smistamento.confermaTutto': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')
    const consegnaId = smistamento.consegnaId
    if (!consegnaId) return rifiuta('Prima si deve dire a quale documento appartiene questo PDF.')

    const proposte = smistamento.blocchi
      .filter((b) => b.allievoId)
      .map((b) => ({ allievoId: b.allievoId as string, da: b.da, a: b.a }))
      .sort((x, y) => y.da - x.da)
    if (proposte.length === 0) return rifiuta('Non c’è nessuna proposta da confermare.')

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

  /**
   * Le pagine scelte nello sfoglio, buttate via.
   *
   * A intervalli e non una alla volta: è la forma in cui lo smistatore toglie
   * pagine dalle letture, e rifare la bozza tredici volte di fila per tredici
   * pagine costerebbe tredici ricostruzioni.
   */
  'smistamento.scartaPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')
    const tratti = intervalliDi(azione.pagine)
    if (tratti.length === 0) return rifiuta('Nessuna pagina da buttare via.')
    for (const tratto of tratti) {
      scartaPagine(contesto.archivio, smistamento.id, tratto.da, tratto.a)
    }
    await chiudiSeFinito(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * Le pagine scelte, rimesse in coda alla lettura.
   *
   * Serve a chi guarda una pagina e vede che il nome letto non torna: si
   * rilegge quella, non tutto il PDF. Anche le pagine che un testo ce l'hanno
   * già: se si chiede di rileggerle è perché quel testo non è servito a niente.
   */
  'smistamento.leggiPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')

    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const dentro = new Set(smistamento.letture.map((l) => l.numero))
    const lavori = [...new Set(azione.pagine)]
      .filter((pagina) => dentro.has(pagina))
      .sort((x, y) => x - y)
      .map((pagina) => ({
        smistamentoId: smistamento.id,
        pagina,
        etichetta: `${smistamento.nome} · pagina ${pagina}`,
      }))
    if (lavori.length === 0) return rifiuta('Quelle pagine non sono più in attesa.')

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  /**
   * Solo quelle pagine, aperte nel lettore del sistema.
   *
   * Serve quando la miniatura non basta — un timbro da leggere, una firma da
   * riconoscere — e il ritaglio nasce per essere guardato adesso: è un file di
   * servizio, e dentro il documento dell'anno non ci deve entrare.
   */
  'smistamento.apriPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')

    const byte = await bytePdf(smistamento)
    if (!byte) return rifiuta('Il PDF originale non è più nella cartella del registro.')

    const pagine = [...new Set(azione.pagine)].sort((x, y) => x - y)
    if (pagine.length === 0) return rifiuta('Nessuna pagina da aprire.')

    let destinazione: apparato.Uri | null
    try {
      destinazione = await deposito()?.servizio(
        nomeRitaglio(smistamento, pagine[0], pagine[pagine.length - 1]),
        await estraiElenco(byte, pagine),
      ) ?? null
    } catch (errore) {
      return rifiuta(`Ritaglio non riuscito: ${(errore as Error).message}`)
    }
    if (!destinazione) return rifiuta('Nessun anno aperto.')
    if (!(await apriConIlSistema(destinazione))) {
      return conMessaggio('Ritaglio scritto, ma non si è potuto aprire da qui.', 'avviso')
    }
    return fatto
  },

  /**
   * Le pagine trascinate su una casella della matrice delle assenze.
   *
   * La stessa archiviazione delle altre, con un'altra destinazione: il foglio
   * finisce nella riga di una persona dentro un periodo. Quale rapporto sia —
   * assenze o ritardi, vergine o firmato — lo dice la casella e non il file: i
   * due rapporti della scuola si somigliano pagina per pagina, e indovinarli
   * vorrebbe dire spedire all'azienda i ritardi al posto delle assenze.
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
    if (!esito.ok) return rifiuta(esito.errore ?? 'Archiviazione non riuscita.')
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Le pagine trascinate sulla casella delle firme, archiviate come foglio
   * firme di quella richiesta.
   *
   * La casella delle firme sta in cima alla matrice, sopra i nomi, e prima non
   * prendeva niente: il foglio si allegava solo scegliendolo da disco. Ma è un
   * foglio come gli altri — arriva nella stessa scansione di classe, e spesso
   * è la prima pagina del mucchio — e farlo passare da un dialogo mentre le
   * pagine sono lì da prendere voleva dire ritagliarlo altrove per rimetterlo
   * dentro da fuori.
   */
  'smistamento.assegnaFirme': async (contesto, azione) => {
    const esito = await assegnaFirme(
      contesto.archivio,
      azione.smistamentoId,
      azione.consegnaId,
      azione.pagine,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? 'Archiviazione non riuscita.')
    await chiudiSeFinito(contesto.archivio, azione.smistamentoId)
    return fatto
  },

  /**
   * Le pagine archiviate per sbaglio, riprese.
   *
   * Torna indietro tutto il documento di cui facevano parte, non la sola pagina
   * chiesta: quel che era stato archiviato era un documento intero, e lasciarne
   * metà nel fascicolo di qualcuno sarebbe un documento monco che nessuno sa di
   * avere. Il file esce dal fascicolo e va nel cestino del sistema, la spunta
   * torna indietro, e le pagine ricompaiono fra quelle da smistare — con il
   * loro testo riletto dal PDF, che è ancora lì.
   */
  'smistamento.riprendiPagine': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')

    const chieste = new Set(azione.pagine)
    const toccate = smistamento.assegnate.filter((fetta) => {
      for (let n = fetta.da; n <= fetta.a; n += 1) if (chieste.has(n)) return true
      return false
    })
    if (toccate.length === 0) return rifiuta('Quelle pagine non sono archiviate da nessuna parte.')

    // I file escono dai fascicoli prima di toccare il registro: se il cestino
    // rifiuta, non si è già detto in giro che il documento non c'è più.
    for (const fetta of toccate) {
      // Le pagine finite in una casella delle assenze escono da lì: il foglio
      // di quella persona sta in un periodo e non in una richiesta, e il file
      // da cestinare è quello.
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

    // Il testo delle pagine che tornano: si rilegge dal PDF originale, che
    // finché lo smistamento è aperto sta ancora in quarantena. Senza, le pagine
    // tornerebbero mute e sembrerebbero scansioni da far leggere all'OCR.
    const byte = await bytePdf(smistamento)
    const lette = byte ? await testoConPosizioni(byte).catch(() => []) : []
    const classe = contesto.registro.classi.find((c) => c.id === smistamento.classeId) ?? null
    const indice = classe ? indiceNomi(classe.allievi) : null

    const ora = new Date().toISOString()
    contesto.archivio.modifica((r) => {
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
          // La spunta l'aveva messa l'archiviazione, e torna indietro con lei:
          // su una richiesta che si raccoglie, «portato» voleva dire proprio
          // quel foglio.
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
      suo.assegnate = suo.assegnate.filter((fetta) => !toccate.includes(fetta))
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

    ricostruisci(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * Tutte le pagine mute di un PDF, in coda.
   *
   * È il gesto normale su una scansione: un documento scansionato lo è per
   * intero, e chiederlo pagina per pagina vorrebbe dire dodici clic per la
   * stessa risposta. Le pagine che il testo ce l'hanno già restano fuori:
   * rileggerle con un OCR peggiorerebbe quel che si sa.
   */
  'smistamento.leggiTutto': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')

    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const lavori = smistamento.letture
      .filter((l) => l.lettura === 'niente')
      .map((l) => ({
        smistamentoId: smistamento.id,
        pagina: l.numero,
        etichetta: `${smistamento.nome} · pagina ${l.numero}`,
      }))
    if (lavori.length === 0) return rifiuta('Non c’è nessuna scansione da leggere qui.')

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  /**
   * Tutte le pagine ancora attive dei PDF indicati, rilette da capo.
   *
   * È il comando generale, e l'unico che porta più di un file: chi accende
   * l'OCR a metà lavoro, o cambia modello perché quello di prima leggeva male,
   * ha cinque PDF aperti a metà e nessuna voglia di premere cinque volte lo
   * stesso pulsante.
   *
   * Attive vuol dire non archiviate, e non c'è niente da filtrare per saperlo:
   * una pagina finita nel fascicolo di qualcuno esce dalle letture nel momento
   * in cui ci finisce. Quel che resta scritto in `letture` è esattamente quel
   * che resta da decidere — ed è l'unica cosa su cui rileggere cambi qualcosa.
   *
   * L'ordine è quello in cui i PDF sono stati chiesti, e dentro ognuno quello
   * delle pagine: la coda si guarda mentre macina, e una coda che salta da un
   * file all'altro non si segue.
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
          etichetta: `${smistamento.nome} · pagina ${lettura.numero}`,
        })),
      )
    if (lavori.length === 0) return rifiuta('Non c’è nessuna pagina da rileggere.')

    smistatoreDi(contesto.archivio).accodaLettura(lavori)
    return fatto
  },

  'smistamento.fermaLettura': (contesto, _azione) => {
    smistatoreDi(contesto.archivio).fermaLettura()
    return fatto
  },

  /**
   * Di quale classe è un PDF: dichiarato la prima volta, o cambiato dopo.
   *
   * Serve a due momenti che sono lo stesso gesto.
   *
   * Il primo è il PDF arrivato dalla cartella osservata: non passa da un
   * fascicolo, resta senza classe e senza consegna, e finché è così non ha un
   * posto in cui mostrarsi — il fascicolo è per classe — se non la pagina «Da
   * smistare».
   *
   * Il secondo è la scansione che attraversa due classi. Si divide quel che è
   * della prima, si arriva in fondo alle sue persone, e restano pagine: sono di
   * un'altra classe, e il PDF va di là. **Le pagine già collocate restano dove
   * sono** — sono documenti di qualcuno, non più pagine di questo mucchio — e si
   * sposta soltanto quel che era rimasto in ballo.
   *
   * Per questo qui non si rilegge il file, come fa invece `aggancia`. Rileggerlo
   * vorrebbe dire ricominciare dal PDF intero, e le pagine già archiviate per la
   * prima classe tornerebbero a galla come se non fosse stato fatto niente. Il
   * testo delle pagine sta già in `letture` e non dipende dalla classe: quel che
   * cambia sono i *nomi* con cui lo si confronta, e a rifare la bozza con i nomi
   * nuovi basta `ricostruisci` — che tocca i blocchi e lascia stare il resto.
   *
   * La richiesta di prima si lascia andare, e non è un dettaglio: una consegna
   * appartiene a un corso, cioè a una classe, e tenerla vorrebbe dire un PDF che
   * dice di essere della seconda classe e continua a comparire sotto la prima —
   * `contestoSmistamento` guarda la consegna per prima.
   */
  'smistamento.attribuisci': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    if (!classe) return rifiuta('Quella classe non c’è più.')
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
    const quante = restano === 1 ? '1 pagina' : `${restano} pagine`
    return conMessaggio(
      prima
        ? `«${smistamento.nome}»: ${quante} passate da ${prima.nome} a ${classe.nome}.`
        : `«${smistamento.nome}» è ora di ${classe.nome}.`,
      'info',
    )
  },

  'smistamento.apri': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Nessun PDF da aprire.')
    return apriFile(smistamento.file, smistamento.nome)
  },

  /** Tutto quel che resta va nel cestino: il PDF e la riga che lo aspettava. */
  'smistamento.elimina': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')
    await cestina(smistamento.file)
    await togliAnteprime(smistamento)
    return contesto.modifica((r) => {
      r.smistamenti = r.smistamenti.filter((s) => s.id !== smistamento.id)
    }, ['smistamenti'])
  },

  /**
   * Le impostazioni della lettura automatica, aperte dove sono.
   *
   * Sta fra le impostazioni dell'applicazione e non nella vista Impostazioni
   * del pannello perché non è una proprietà dell'anno scolastico: dice se
   * questa macchina ha un OCR da usare, e la stessa cartella aperta su un altro
   * computer può rispondere diversamente. Il pannello non le può scrivere —
   * vive in una sandbox — ma può portarcisi davanti.
   */
  'smistamento.impostazioni': async (_contesto, _azione) => {
    // La finestra nativa, non la pagina del pannello: il filtro lo sa leggere
    // solo lei, e queste impostazioni sono della macchina — il pannello vive in
    // una sandbox e non le può scrivere, come dice il commento qui sopra.
    await apparato.comandi.esegui(
      'registroDocenti.impostazioniFinestra',
      'registroDocenti.ocr',
    )
    return fatto
  },
} satisfies Parte
