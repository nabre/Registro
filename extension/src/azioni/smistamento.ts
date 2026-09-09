// Lo smistamento: un PDF che arriva, le sue pagine da assegnare, e quel che
// resta da decidere.
//
// È l'area con più file in movimento del registro — anteprime, ritagli,
// quarantena — e la regola è sempre la stessa: niente si cancella davvero,
// tutto passa dal cestino del sistema.

import * as vscode from 'vscode'

import { apriConIlSistema } from '../dati/apertura.js'
import type { Archivio } from '../dati/archivio.js'
import { cartellaInArrivo, cartellaQuarantena, fileAllegato } from '../dati/percorsi.js'
import { estraiPagine } from '../dati/pdf.js'
import { ocrPronto } from '../dati/ocr.js'
import {
  assegnaPagine,
  bytePdf,
  nomeCartellaConsegna,
  ricostruisci,
  scartaPagine,
  scriviAnteprima,
  smistatoreDi,
  togliAnteprime,
} from '../dati/smistatore.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  consegnaConClasse,
  fatto,
  rifiuta,
  scegliUnFile,
  type Parte,
} from './contesto.js'

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
  /**
   * Un PDF di classe dato a mano a una richiesta.
   *
   * Il file scelto si copia nella cassetta invece di essere smistato dov'è:
   * lo smistamento consuma l'originale — lo sposta in quarantena o lo manda
   * nel cestino — e farlo su un file che sta nelle cartelle di chi insegna
   * vorrebbe dire spostargli la roba da sotto i piedi.
   */
  'smistamento.carica': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    const cassetta = cartellaInArrivo()
    if (!cassetta) return rifiuta('Nessuna cartella di lavoro aperta.')

    const scelto = await scegliUnFile({
      titolo: `${consegna.testo} — ${classe.nome}`,
      tasto: 'Smista',
      filtri: { PDF: ['pdf'] },
    })
    if (!scelto) return fatto

    const sottocartella = vscode.Uri.joinPath(
      cassetta,
      nomeCartellaConsegna(classe, consegna),
    )
    const destinazione = vscode.Uri.joinPath(sottocartella, scelto.nome)
    try {
      await vscode.workspace.fs.createDirectory(sottocartella)
      await vscode.workspace.fs.copy(scelto.uri, destinazione, { overwrite: true })
    } catch (errore) {
      return rifiuta(`Copia del PDF non riuscita: ${(errore as Error).message}`)
    }

    const esito = await smistatoreDi(contesto.archivio).smista(destinazione, consegna.id)
    if (esito.errore) return rifiuta(esito.errore)
    return fatto
  },

  /**
   * Un blocco assegnato a mano. È il gesto con cui si chiude la quarantena:
   * si dice di chi sono quelle pagine — e volendo quante ne sono davvero, che
   * è il modo di separare due documenti finiti nello stesso blocco.
   */
  /** Un PDF trascinato nel pannello: si posa nella cassetta e si smista. */
  'smistamento.deposita': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    const cassetta = cartellaInArrivo()
    if (!cassetta) return rifiuta('Nessuna cartella di lavoro aperta.')

    let byte: Uint8Array
    try {
      byte = new Uint8Array(Buffer.from(azione.contenuto, 'base64'))
    } catch {
      return rifiuta('Il file trascinato non si riesce a leggere.')
    }
    if (byte.length === 0) return rifiuta('Il file trascinato è vuoto.')

    const sottocartella = vscode.Uri.joinPath(cassetta, nomeCartellaConsegna(classe, consegna))
    const nome = azione.nome.replace(/[\/:*?"<>|]+/g, '-').trim() || 'documento.pdf'
    const destinazione = vscode.Uri.joinPath(sottocartella, nome)
    try {
      await vscode.workspace.fs.createDirectory(sottocartella)
      await vscode.workspace.fs.writeFile(destinazione, byte)
    } catch (errore) {
      return rifiuta(`Non si riesce a posare il PDF nella cassetta: ${(errore as Error).message}`)
    }

    const esito = await smistatoreDi(contesto.archivio).smista(destinazione, consegna.id)
    if (esito.errore) return rifiuta(esito.errore)
    return fatto
  },

  /**
   * Una riga della bozza confermata: queste pagine, a questa persona.
   *
   * Le pagine si possono restringere prima di confermare — è il modo in cui
   * si separano due documenti che il registro aveva tenuto insieme — e quel
   * che avanza torna nella bozza da solo.
   */
  'smistamento.assegna': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    const blocco = smistamento?.blocchi.find((b) => b.id === azione.bloccoId)
    if (!smistamento || !blocco) return rifiuta('Quelle pagine non sono più in attesa.')
    if (!smistamento.consegnaId) {
      return rifiuta('Prima si deve dire a quale documento appartiene questo PDF.')
    }

    const da = Math.min(Math.max(azione.da ?? blocco.da, blocco.da), blocco.a)
    const a = Math.max(Math.min(azione.a ?? blocco.a, blocco.a), da)

    const esito = await assegnaPagine(
      contesto.archivio,
      smistamento.id,
      smistamento.consegnaId,
      azione.allievoId,
      da,
      a,
    )
    if (!esito.ok) return rifiuta(esito.errore ?? 'Assegnazione non riuscita.')
    await chiudiSeFinito(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * L'assegnazione a mano: si dicono le pagine, l'allievo e il documento.
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

  /** Pagine che non servono a nessuno: fuori dalla bozza e basta. */
  'smistamento.scarta': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    const blocco = smistamento?.blocchi.find((b) => b.id === azione.bloccoId)
    if (!smistamento || !blocco) return rifiuta('Quelle pagine non sono più in attesa.')
    scartaPagine(contesto.archivio, smistamento.id, blocco.da, blocco.a)
    await chiudiSeFinito(contesto.archivio, smistamento.id)
    return fatto
  },

  /** Mette in coda la lettura delle pagine di un blocco. */
  'smistamento.leggi': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    const blocco = smistamento?.blocchi.find((b) => b.id === azione.bloccoId)
    if (!smistamento || !blocco) return rifiuta('Quelle pagine non sono più in attesa.')

    const pronto = await ocrPronto()
    if (!pronto.pronto) return rifiuta(pronto.motivo)

    const lavori = []
    for (let pagina = blocco.da; pagina <= blocco.a; pagina += 1) {
      lavori.push({
        smistamentoId: smistamento.id,
        pagina,
        etichetta: `${smistamento.nome} · pagina ${pagina}`,
      })
    }
    smistatoreDi(contesto.archivio).accodaLettura(lavori)
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

  'smistamento.fermaLettura': (contesto, _azione) => {
    smistatoreDi(contesto.archivio).fermaLettura()
    return fatto
  },

  /**
   * La fotografia della prima pagina di un blocco.
   *
   * È la risposta migliore alla domanda di chi deve smistare: prima di dire
   * di chi sono queste pagine, si guarda il foglio. Costa una frazione di
   * secondo — l'immagine sta già dentro il PDF — e non chiama nessun modello.
   */
  'smistamento.anteprima': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    const blocco = smistamento?.blocchi.find((b) => b.id === azione.bloccoId)
    if (!smistamento || !blocco) return rifiuta('Quelle pagine non sono più in attesa.')

    const byte = await bytePdf(smistamento)
    if (!byte) return rifiuta('Il PDF originale non è più nella cartella del registro.')

    const anteprima = await scriviAnteprima(byte, smistamento, blocco.da)
    if (!anteprima) {
      return rifiuta(
        'Quelle pagine non contengono una fotografia da mostrare: usare «Apri le pagine».',
      )
    }
    contesto.archivio.modifica((r) => {
      const suo = r.smistamenti.find((sm) => sm.id === smistamento.id)
      const pagina = suo?.letture.find((l) => l.numero === blocco.da)
      if (pagina) pagina.anteprima = anteprima
    }, ['smistamenti'])
    ricostruisci(contesto.archivio, smistamento.id)
    return fatto
  },

  /**
   * Solo le pagine di un blocco, aperte nel lettore del sistema. Serve quando
   * l'anteprima non basta — un documento di quattro facciate si sfoglia — e
   * quando dentro non c'è una fotografia da mostrare.
   */
  'smistamento.apriBlocco': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    const blocco = smistamento?.blocchi.find((b) => b.id === azione.bloccoId)
    if (!smistamento || !blocco) return rifiuta('Quelle pagine non sono più in attesa.')

    const byte = await bytePdf(smistamento)
    if (!byte) return rifiuta('Il PDF originale non è più nella cartella del registro.')

    const cartella = cartellaQuarantena()
    if (!cartella) return rifiuta('Nessuna cartella di lavoro aperta.')
    const anteprime = vscode.Uri.joinPath(cartella, 'anteprime')
    const destinazione = vscode.Uri.joinPath(
      anteprime,
      `${smistamento.id}-pagine ${blocco.da}-${blocco.a}.pdf`,
    )
    try {
      await vscode.workspace.fs.createDirectory(anteprime)
      await vscode.workspace.fs.writeFile(
        destinazione,
        await estraiPagine(byte, blocco.da, blocco.a),
      )
    } catch (errore) {
      return rifiuta(`Ritaglio non riuscito: ${(errore as Error).message}`)
    }
    if (!(await apriConIlSistema(destinazione))) {
      return conMessaggio(`Ritaglio scritto, ma non si è potuto aprire da qui.`, 'avviso')
    }
    return fatto
  },

  /** Il PDF che non si era saputo agganciare: adesso si dice a quale richiesta va. */
  'smistamento.aggancia': async (contesto, azione) => {
    const smistamento = contesto.registro.smistamenti.find((s) => s.id === azione.smistamentoId)
    if (!smistamento) return rifiuta('Quello smistamento non c’è più.')
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta('Consegna non trovata.')
    const file = fileAllegato(smistamento.file)
    if (!file) return rifiuta('Il PDF originale non è più nella cartella del registro.')

    // Le anteprime vecchie non servono più: ne nasceranno di nuove se
    // servono. Si rifà tutto da capo sul file intero — adesso che si sa di
    // chi sono le pagine, il riconoscimento può assegnarle da solo — ma la
    // riga vecchia sparisce solo se il nuovo giro è riuscito: se la lettura
    // fallisce, il PDF non deve restare orfano, senza nessuna riga che lo
    // tenga in vista.
    await togliAnteprime(smistamento)
    const esito = await smistatoreDi(contesto.archivio).smista(file, consegna.id)
    if (esito.errore) return rifiuta(esito.errore)
    contesto.archivio.modifica((r) => {
      r.smistamenti = r.smistamenti.filter((s) => s.id !== smistamento.id)
    }, ['smistamenti'])
    return fatto
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
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      'registroDocenti.ocr',
    )
    return fatto
  },

  'smistamento.apriCassetta': async (contesto, _azione) => {
    const cassetta = cartellaInArrivo()
    if (!cassetta) return rifiuta('Nessuna cartella di lavoro aperta.')
    await smistatoreDi(contesto.archivio).preparaCartelle()
    await vscode.commands.executeCommand('revealFileInOS', cassetta)
    return fatto
  },
} satisfies Parte
