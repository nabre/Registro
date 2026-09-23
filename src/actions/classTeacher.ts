// Il mestiere del docente di classe: recapiti, comunicazioni alle famiglie e i
// fogli delle assenze da far firmare.
//
// Quasi tutto qui dentro tocca il fascicolo della classe, che nasce alla prima
// cosa che ci si mette dentro: è per questo che si scrive con `nelFascicolo`,
// che lo trova o lo crea e ne timbra l'aggiornamento.

import { basename } from 'node:path'

import type { Archivio } from '../data/archive.js'
import { contenutoDi, deposito } from '../data/store.js'
import { cartellaAnno } from '../data/paths.js'
import { archiviaCopia, nomeFileArchivio, percorsoConsegna } from '../data/filing.js'
import {
  allievoDelFile,
  daSpedire,
  destinatariAssenze,
  etichettaFoglio,
  foglioDi,
  nomePeriodo,
  percorsoFoglioAssenze,
  rigaDi,
  scriviFoglioAssenze as scriviFoglio,
  testoAssenze,
  togliFoglioAssenze,
  trovaBloccoAssenze as bloccoAssenze,
  vergini,
} from '../domain/absences.js'
import { firmaPosta } from '../data/templates.js'
import {
  apriBozzaSingola,
  bozzeDiGruppo,
  confermaInvio,
  nomeBozza,
  puoSpedire,
  type MessaggioPosta,
} from '../data/mail.js'
import { allieviAttivi, nomeCompleto } from '../domain/calculations.js'
import {
  allegatiComunicazione,
  fileDellaConsegna,
  destinatariComunicazione,
} from '../domain/communications.js'
import { PIF, del, frase } from '../domain/lexicon.js'
import { documentoPer } from '../domain/assignments.js'
import { fascicoloDellaClasse } from '../domain/courses.js'
import { oggi, periodoNelNome } from '../domain/dates.js'
import type {
  Allievo,
  BloccoAssenze,
  FoglioAssenze,
  TipoRapporto,
} from '../domain/models.js'
import {
  validaBloccoAssenze,
  validaComunicazione,
  validaRecapito,
} from '../domain/validation.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  consegnaConClasse,
  documentoCambiato,
  fatto,
  fascicoloDi,
  riassumiInvii,
  rifiuta,
  rifiutaCon,
  riponi,
  scegliFile,
  scegliUnFile,
  tipoMime,
  type FileScelto,
  type Parte,
} from './context.js'

/**
 * Copia un foglio nell'archivio di chi riguarda e ne descrive la voce.
 *
 * Il file che c'era si sovrascrive: rimettere lo stesso foglio è la mossa di
 * chi ha ricevuto una scansione migliore, non di chi ne vuole due copie.
 */
async function copiaFoglio (
  scelto: FileScelto,
  nomeClasse: string,
  blocco: BloccoAssenze,
  allievo: Allievo,
  genere: TipoRapporto,
  firmato: boolean,
  sostituibile: string | null = null,
): Promise<{ foglio: FoglioAssenze } | { errore: string }> {
  if (!cartellaAnno()) {
    return { errore: 'Nessun anno scolastico aperto: i documenti si archiviano dentro un anno.' }
  }

  // Dove va e come si chiama lo dice il dominio, che è lo stesso posto da cui
  // lo chiede chi ritaglia un PDF di classe: due regole per lo stesso foglio
  // vorrebbero dire due cartelle diverse per lo stesso documento.
  const destinazione = percorsoFoglioAssenze(
    nomeClasse,
    blocco,
    allievo,
    genere,
    firmato,
    scelto.estensione,
  )
  const esito = await archiviaCopia(destinazione, scelto.uri, sostituibile)
  if ('errore' in esito) return { errore: esito.errore }

  return {
    foglio: {
      tipo: genere,
      firmato,
      file: esito.relativo,
      nome: scelto.nome || basename(destinazione),
      aggiuntoIl: new Date().toISOString(),
    },
  }
}

/**
 * Scrive com'è andata l'e-mail di una persona in formazione, subito dopo il tentativo.
 *
 * Si salva una riga per volta e non alla fine del giro: se la rete cade al
 * dodicesimo nome, i primi undici devono risultare spediti — altrimenti al
 * secondo tentativo ricevono la stessa mail due volte.
 */
function segnaInvio (
  archivio: Archivio,
  dove: { classeId: string, bloccoId: string },
  allievoId: string,
  destinatari: string[],
  errore?: string,
): void {
  archivio.modifica((r) => {
    const trovato = bloccoAssenze(r, dove.classeId, dove.bloccoId)
    const riga = trovato?.blocco.righe.find((x) => x.allievoId === allievoId)
    if (!trovato || !riga) return
    const ora = new Date().toISOString()
    riga.invio = { destinatari, inviatoIl: ora, errore }
    trovato.blocco.aggiornatoIl = ora
    trovato.fascicolo.aggiornatoIl = ora
  }, ['fascicoli'])
}

/** Scrive che una comunicazione è partita, e a chi: è la copia che poi si legge. */
function segnaComunicazione (
  archivio: Archivio,
  classeId: string,
  comunicazioneId: string,
  indirizzi: string[],
): void {
  const ora = new Date().toISOString()
  archivio.modifica((r) => {
    const bersaglio = fascicoloDellaClasse(r, classeId)?.comunicazioni.find(
      (c) => c.id === comunicazioneId,
    )
    if (!bersaglio) return
    bersaglio.stato = 'inviata'
    bersaglio.errore = undefined
    bersaglio.destinatari = indirizzi
    bersaglio.inviataIl = ora
  }, ['fascicoli'])
}

export const docenteClasse = {
  /**
   * Il foglio con cui si dimostra di aver distribuito un documento.
   *
   * Uno per richiesta, non uno per allievo: quando si consegna qualcosa alla
   * classe, il documento ce l'ha ognuno per sé e la prova è la lista firmata
   * di chi l'ha ritirato. Finisce nell'archivio insieme ai documenti di quella
   * richiesta, con un nome che si legge.
   */
  'consegna.firme.aggiungi': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato

    const scelto = await scegliUnFile({ titolo: `Firme di consegna — ${consegna.testo}`, tasto: 'Allega' })
    if (!scelto) return fatto
    // Il dialogo può essere rimasto aperto a lungo: se intanto si è aperto un
    // altro anno, il foglio firme finirebbe dentro quello.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const esito = await archiviaCopia(
      percorsoConsegna(
        classe,
        nomeFileArchivio(classe.nome, null, consegna.testo, 'firme di consegna', scelto.estensione),
      ),
      scelto.uri,
      consegna.fileFirme ?? null,
    )
    if ('errore' in esito) return rifiuta(`Copia non riuscita: ${esito.errore}`)

    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      // Sparita mentre si sceglieva il file: «non trovata», non «fatto».
      if (!bersaglio) return false
      bersaglio.fileFirme = esito.relativo
      bersaglio.nomeFirme = scelto.nome
      bersaglio.aggiornataIl = new Date().toISOString()
    }, ['consegne'], 'Consegna non trovata: forse è già sparita.')
  },

  'consegna.firme.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    return apriFile(consegna?.fileFirme, 'Firme di consegna')
  },

  'consegna.firme.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna?.fileFirme) return rifiuta('Non c’è nessun foglio firme.')
    await cestina(consegna.fileFirme)
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      bersaglio.fileFirme = undefined
      bersaglio.nomeFirme = undefined
      bersaglio.aggiornataIl = new Date().toISOString()
    }, ['consegne'])
  },

  'consegna.file.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const documento = consegna ? documentoPer(consegna, azione.chi) : null
    if (!consegna || !documento) return rifiuta('Nessun documento da aprire.')
    return apriFile(documento.file, consegna.testo)
  },

  /** Il file nel cestino e la spunta via: quel documento torna atteso. */
  'consegna.file.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const documento = consegna
      ? (consegna.documenti ?? []).find((d) => d.allievoId === azione.chi) ?? null
      : null
    if (!consegna) return rifiuta('Consegna non trovata.')
    if (!documento && !consegna.fatte.some((f) => f.chi === azione.chi)) {
      return rifiuta('Non c’è niente da togliere.')
    }
    await cestina(documento?.file)
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === azione.consegnaId)
      if (!bersaglio) return
      bersaglio.documenti = (bersaglio.documenti ?? []).filter((d) => d.allievoId !== azione.chi)
      bersaglio.fatte = bersaglio.fatte.filter((f) => f.chi !== azione.chi)
      bersaglio.aggiornataIl = new Date().toISOString()
    }, ['consegne'])
  },

  'recapito.salva': (contesto, azione) => {
    const esito = validaRecapito(azione.recapito)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      riponi(fascicolo.recapiti, azione.recapito)
    })
  },

  'recapito.elimina': (contesto, azione) => {
    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      fascicolo.recapiti = fascicolo.recapiti.filter((x) => x.id !== azione.recapitoId)
      // Le comunicazioni che lo citavano perdono solo quel destinatario.
      for (const comunicazione of fascicolo.comunicazioni) {
        comunicazione.recapitiIds = comunicazione.recapitiIds.filter(
          (id) => id !== azione.recapitoId,
        )
      }
    })
  },

  'comunicazione.salva': (contesto, azione) => {
    const esito = validaComunicazione(azione.comunicazione)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      riponi(fascicolo.comunicazioni, azione.comunicazione)
    })
  },

  'comunicazione.elimina': (contesto, azione) => {
    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      fascicolo.comunicazioni = fascicolo.comunicazioni.filter(
        (c) => c.id !== azione.comunicazioneId,
      )
    })
  },

  'comunicazione.invia': async (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const fascicolo = fascicoloDellaClasse(contesto.registro, azione.classeId)
    const comunicazione = fascicolo?.comunicazioni.find((c) => c.id === azione.comunicazioneId)
    if (!classe || !fascicolo || !comunicazione) return rifiuta('Comunicazione non trovata.')
    if (comunicazione.stato === 'inviata') return rifiuta('Questa comunicazione è già partita.')
    const esito = validaComunicazione(comunicazione)
    if (!esito.valido) return { ok: false, errori: esito.errori }

    const { indirizzi } = destinatariComunicazione(classe, fascicolo, comunicazione)
    if (indirizzi.length === 0) {
      return rifiuta('Nessun destinatario ha un indirizzo valido: la comunicazione resta bozza.')
    }

    // Gli allegati si leggono adesso: quel che parte è il file com'è oggi.
    const allegati = []
    for (const raccolta of allegatiComunicazione(contesto.registro, comunicazione)) {
      const dato = fileDellaConsegna(raccolta)
      const contenuto = dato ? await contenutoDi(dato.file) : null
      if (!dato || !contenuto) {
        return rifiuta(`L’allegato «${raccolta.testo}» non si riesce a leggere.`)
      }
      // Con il nome del file archiviato, non con l'etichetta: è il nome che
      // il registro ha scelto per l'archivio — classe, argomento, chi — ed è
      // quello con cui chi riceve lo ritrova.
      allegati.push({
        nome: basename(dato.file),
        tipo: tipoMime(dato.file),
        contenuto: Buffer.from(contenuto).toString('base64'),
      })
    }

    // Con l'invio diretto si domanda prima, non dopo: dopo sarebbe tardi.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(
        `Spedire «${comunicazione.oggetto || 'la comunicazione'}» a ${indirizzi.length} destinatari?`,
        'Partono dalla casella del registro, in copia nascosta.',
      ))
    ) {
      return conMessaggio('Non è partito niente: la comunicazione resta com’era.', 'info', {
        invariato: true,
      })
    }

    // Fra la lettura della comunicazione e qui c'è stata una conferma, che può
    // restare aperta quanto vuole: se intanto si è aperto un altro anno, questa
    // comunicazione non è più quella che si ha davanti.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const bozza = await apriBozzaSingola(
      {
        oggetto: comunicazione.oggetto,
        corpo: comunicazione.corpo,
        ccn: indirizzi,
        firma: await firmaPosta(),
        allegati,
      },
      classe.nome,
      // Il giorno nel nome: la stessa comunicazione rimandata a distanza di mesi
      // — un cambio d'aula, una gita — si chiamerebbe uguale, e la bozza nuova
      // cancellerebbe quella vecchia senza dirlo.
      nomeBozza(classe.nome, null, comunicazione.oggetto || 'Comunicazione', periodoNelNome(oggi())),
    )
    if (!bozza.ok) {
      // La bozza non scritta non è un invio fallito: non è successo niente, e
      // la comunicazione resta quella di prima. Segnarla «errore» vorrebbe
      // dire raccontare un tentativo che non c'è stato.
      return rifiuta(bozza.errore ?? 'La bozza non si è potuta preparare.')
    }

    // Quando è partita davvero il registro l'ha vista uscire, e lo scrive.
    // Altrimenti la bozza è passata al programma di posta e da lì in poi il
    // registro non vede più niente: non domanda, e resta bozza fino alla
    // spunta di chi l'ha mandata.
    //
    // Il percorso si dice sempre, anche quando l'apertura è andata bene: il
    // sistema risponde «aperto» pure quando la finestra non compare — un
    // programma di posta che non si alza, un'associazione che punta altrove —
    // e senza il percorso non resterebbe niente in mano.
    if (!bozza.spedita) {
      return conMessaggio(
        `Bozza per ${indirizzi.length} destinatari in copia nascosta aperta nel programma di ` +
          `posta: ${bozza.file?.fsPath ?? ''}. Quando l’hai spedita, spuntala nell’elenco.`,
        'info',
        { invariato: true },
      )
    }

    // Partita, ma nel frattempo si è aperto un altro anno: segnarla lì
    // vorrebbe dire scrivere in un fascicolo che non è il suo.
    if (!contesto.ancoraQui()) {
      return rifiutaCon(
        'conflitto',
        `Comunicazione spedita a ${indirizzi.length} destinatari, ma il documento aperto è cambiato: ` +
          'non è stata segnata come inviata.',
      )
    }
    segnaComunicazione(contesto.archivio, azione.classeId, azione.comunicazioneId, indirizzi)
    return conMessaggio(`Comunicazione spedita a ${indirizzi.length} destinatari.`)
  },

  /**
   * La spunta: chi ha mandato la bozza lo dice qui, e il registro gli crede.
   *
   * Gli indirizzi si ricavano adesso, come al momento in cui la bozza è stata
   * scritta: sono la copia di «a chi è andata» che poi si legge nello storico.
   * Togliere la spunta riporta a bozza — un clic dato per sbaglio non deve
   * lasciare nello storico una mail che nessuno ha mandato.
   */
  'comunicazione.spunta': (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const fascicolo = fascicoloDellaClasse(contesto.registro, azione.classeId)
    const comunicazione = fascicolo?.comunicazioni.find((c) => c.id === azione.comunicazioneId)
    if (!classe || !fascicolo || !comunicazione) return rifiuta('Comunicazione non trovata.')

    if (!azione.spedita) {
      contesto.archivio.modifica((r) => {
        const bersaglio = fascicoloDellaClasse(r, azione.classeId)?.comunicazioni.find(
          (c) => c.id === azione.comunicazioneId,
        )
        if (!bersaglio) return
        bersaglio.stato = 'bozza'
        bersaglio.destinatari = []
        bersaglio.inviataIl = undefined
        bersaglio.errore = undefined
      }, ['fascicoli'])
      return conMessaggio('Comunicazione riportata a bozza.')
    }

    const { indirizzi } = destinatariComunicazione(classe, fascicolo, comunicazione)
    segnaComunicazione(contesto.archivio, azione.classeId, azione.comunicazioneId, indirizzi)
    return conMessaggio(`Comunicazione segnata come spedita a ${indirizzi.length} destinatari.`)
  },

  'assenze.salva': (contesto, azione) => {
    const esito = validaBloccoAssenze(azione.blocco)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const fascicolo = fascicoloDellaClasse(contesto.registro, azione.classeId)
    const nuovo = !fascicolo?.assenze.some((b) => b.id === azione.blocco.id)
    contesto.modifica((r) => {
      const vivo = fascicoloDi(r, azione.classeId)
      if (!vivo) return
      const ora = new Date().toISOString()
      const indice = vivo.assenze.findIndex((b) => b.id === azione.blocco.id)
      if (indice >= 0) {
        // Le righe non passano dal modulo: sono i fogli caricati e le mail
        // già partite, e riscriverle con la copia che il webview aveva in
        // mano perderebbe quel che è arrivato nel frattempo.
        vivo.assenze[indice] = {
          ...azione.blocco,
          righe: vivo.assenze[indice].righe,
          aggiornatoIl: ora,
        }
      } else {
        vivo.assenze.push({ ...azione.blocco, aggiornatoIl: ora })
      }
      vivo.aggiornatoIl = ora
    }, ['fascicoli'])
    return nuovo ? { ok: true, creato: { id: azione.blocco.id } } : fatto
  },

  'assenze.elimina': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta('Periodo non trovato.')

    // I fogli se ne vanno uno per uno, non con la cartella intera: una
    // consegna con lo stesso titolo del periodo ci archivia dentro il suo
    // documento, e cancellare la cartella si porterebbe via anche quello.
    for (const riga of dove.blocco.righe) {
      for (const foglio of riga.fogli) await cestina(foglio.file)
    }
    // La vecchia cartella piatta, per i periodi nati prima della riforma
    // dell'archivio: quella sì è tutta e solo sua.
    deposito()?.eliminaSotto(`assenze/${azione.classeId}/${azione.bloccoId}`)

    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      fascicolo.assenze = fascicolo.assenze.filter((b) => b.id !== azione.bloccoId)
    })
  },

  'assenze.foglio.aggiungi': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta('Periodo non trovato.')
    const allievo = dove.classe.allievi.find((a) => a.id === azione.allievoId)
    if (!allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))

    const scelto = await scegliUnFile({
      titolo: `${etichettaFoglio(azione.genere, azione.firmato)} — ${nomeCompleto(allievo)}`,
      tasto: 'Aggiungi',
    })
    if (!scelto) return fatto
    if (!contesto.ancoraQui()) return documentoCambiato()

    // Lo stesso foglio ricaricato — una scansione migliore — sostituisce
    // quello che c'era, invece di accumulare copie dello stesso documento.
    const vecchio = foglioDi(rigaDi(dove.blocco, azione.allievoId), azione.genere, azione.firmato)
    const copiato = await copiaFoglio(
      scelto,
      dove.classe.nome,
      dove.blocco,
      allievo,
      azione.genere,
      azione.firmato,
      vecchio?.file ?? null,
    )
    if ('errore' in copiato) return rifiuta(copiato.errore)

    const scritto = contesto.modifica((r) => {
      scriviFoglio(
        r,
        {
          classeId: azione.classeId,
          bloccoId: azione.bloccoId,
          allievoId: azione.allievoId,
        },
        copiato.foglio,
      )
    }, ['fascicoli'])
    // Con un'altra estensione il foglio nuovo non ha coperto il vecchio: via
    // quello, che nessuna riga nomina più. Solo a scrittura riuscita.
    if (scritto.ok && vecchio && vecchio.file !== copiato.foglio.file) await cestina(vecchio.file)
    return scritto
  },

  'assenze.importa': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta('Periodo non trovato.')
    const allievi = allieviAttivi(dove.classe)
    if (allievi.length === 0) return rifiuta(`La classe non ha ${PIF.plurale} che frequentano.`)

    const scelti = await scegliFile({
      titolo: `${etichettaFoglio(azione.genere, azione.firmato)} — ${nomePeriodo(dove.blocco)}`,
      tasto: 'Importa',
      molti: true,
    })
    if (!scelti) return fatto
    if (!contesto.ancoraQui()) return documentoCambiato()

    const presi: Array<{ allievoId: string, foglio: FoglioAssenze, vecchio: string | null }> = []
    const fuori: string[] = []
    for (const scelto of scelti) {
      // Una copia alla volta, e ognuna aspetta il disco: il documento può
      // cambiare anche a metà del mucchio.
      if (!contesto.ancoraQui()) return documentoCambiato()
      const allievo = allievoDelFile(scelto.nome, allievi)
      if (!allievo) {
        fuori.push(scelto.nome)
        continue
      }
      const vecchio = foglioDi(rigaDi(dove.blocco, allievo.id), azione.genere, azione.firmato)
      const copiato = await copiaFoglio(
        scelto,
        dove.classe.nome,
        dove.blocco,
        allievo,
        azione.genere,
        azione.firmato,
        vecchio?.file ?? null,
      )
      if ('errore' in copiato) {
        fuori.push(`${scelto.nome} (${copiato.errore})`)
        continue
      }
      presi.push({ allievoId: allievo.id, foglio: copiato.foglio, vecchio: vecchio?.file ?? null })
    }

    if (presi.length > 0) {
      const scritto = contesto.modifica((r) => {
        for (const preso of presi) {
          scriviFoglio(
            r,
            {
              classeId: azione.classeId,
              bloccoId: azione.bloccoId,
              allievoId: preso.allievoId,
            },
            preso.foglio,
          )
        }
      }, ['fascicoli'])
      if (!scritto.ok) return scritto
      // I fogli di prima con un'altra estensione non li ha coperti nessuno.
      for (const preso of presi) {
        if (preso.vecchio && preso.vecchio !== preso.foglio.file) await cestina(preso.vecchio)
      }
    }

    // Quel che non si è riconosciuto si dice per nome: assegnarlo a occhio
    // vorrebbe dire mandare le assenze di uno all'azienda di un altro.
    if (fuori.length > 0) {
      return conMessaggio(
        `${presi.length} fogli assegnati. Non riconosciuti: ${fuori.join(', ')}. ` +
          `Vanno aggiunti dalla casella ${del(PIF)}.`,
        'avviso',
      )
    }
    return conMessaggio(`${presi.length} fogli assegnati.`)
  },

  'assenze.foglio.apri': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const riga = dove ? rigaDi(dove.blocco, azione.allievoId) : null
    const foglio = foglioDi(riga, azione.genere, azione.firmato)
    if (!foglio) return rifiuta('Nessun foglio da aprire.')
    return apriFile(foglio.file, foglio.nome)
  },

  'assenze.foglio.togli': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const riga = dove ? rigaDi(dove.blocco, azione.allievoId) : null
    const foglio = foglioDi(riga, azione.genere, azione.firmato)
    if (!foglio) return rifiuta('Nessun foglio da togliere.')
    await cestina(foglio.file)
    return contesto.modifica((r) => {
      togliFoglioAssenze(
        r,
        { classeId: azione.classeId, bloccoId: azione.bloccoId, allievoId: azione.allievoId },
        azione.genere,
        azione.firmato,
      )
    }, ['fascicoli'])
  },

  /**
   * La richiesta di firma, una mail per allievo.
   *
   * Non è una comunicazione alla classe travestita: ogni azienda riceve i
   * fogli di un allievo solo, in chiaro e con addosso il suo nome. Si spedisce
   * uno per volta e si segna subito com'è andata — un invio a metà, con la
   * rete che cade al dodicesimo nome, deve lasciare scritto quali dodici sono
   * partiti, o al secondo tentativo tredici aziende ricevono la stessa mail
   * due volte.
   */
  'assenze.invia': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta('Periodo non trovato.')
    const { blocco, classe, fascicolo } = dove
    const esito = validaBloccoAssenze(blocco)
    if (!esito.valido) return { ok: false, errori: esito.errori }

    const scelte =
      azione.allieviIds.length > 0
        ? blocco.righe.filter((r) => azione.allieviIds.includes(r.allievoId))
        : daSpedire(blocco)
    if (scelte.length === 0) return rifiuta('Non c’è niente da spedire.')

    // Le bozze non si aprono a una a una: venticinque finestre di posta insieme
    // sono venticinque occasioni di chiuderne una per sbaglio senza sapere
    // quali erano già partite. Finiscono fra le bozze della casella — o, senza
    // Outlook, in file dentro la cartella della classe — e si mandano una alla
    // volta da lì.
    let partite = 0
    const falliti: string[] = []
    /** Chi ha la bozza pronta, in attesa che qualcuno dica di averla spedita. */
    const pronte: Array<{ allievoId: string, indirizzi: string[] }> = []
    const daScrivere: Array<{ messaggio: MessaggioPosta, nome: string }> = []
    for (const riga of scelte) {
      const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
      if (!allievo) continue
      const fogli = vergini(riga)
      if (fogli.length === 0) {
        falliti.push(`${nomeCompleto(allievo)}: nessun foglio da allegare`)
        continue
      }

      // Il giro legge un allegato dopo l'altro: se intanto si è aperto un altro
      // anno, le righe da segnare non sono più in quello aperto.
      if (!contesto.ancoraQui()) return documentoCambiato()
      const { indirizzi, senzaIndirizzo } = destinatariAssenze(blocco, allievo, fascicolo)
      if (indirizzi.length === 0) {
        const motivo = `nessun indirizzo (${senzaIndirizzo.join(', ')})`
        falliti.push(`${nomeCompleto(allievo)}: ${motivo}`)
        segnaInvio(contesto.archivio, azione, riga.allievoId, [], motivo)
        continue
      }

      const allegati = []
      let illeggibile: string | null = null
      for (const foglio of fogli) {
        const contenuto = await contenutoDi(foglio.file)
        if (!contenuto) {
          illeggibile = foglio.nome
          break
        }
        // Con il nome del file archiviato: è quello che porta dentro allievo
        // e periodo, e l'azienda lo rimanda firmato con lo stesso nome.
        allegati.push({
          nome: basename(foglio.file),
          tipo: tipoMime(foglio.file),
          contenuto: Buffer.from(contenuto).toString('base64'),
        })
      }
      if (illeggibile) {
        if (!contesto.ancoraQui()) return documentoCambiato()
        const motivo = `allegato «${illeggibile}» non leggibile`
        falliti.push(`${nomeCompleto(allievo)}: ${motivo}`)
        segnaInvio(contesto.archivio, azione, riga.allievoId, [], motivo)
        continue
      }

      // Niente si segna adesso: una bozza non è una mail partita, e scriverlo
      // qui vorrebbe dire dire che l'azienda è stata avvisata quando nessuno
      // l'ha ancora mandata.
      daScrivere.push({
        messaggio: {
          // I fogli che si stanno allegando a lui, e non quelli del periodo:
          // «{rapporti}» e «{tipi}» dicono quel che c'è in questa busta.
          oggetto: testoAssenze(blocco.oggetto, blocco, allievo, classe, fogli),
          corpo: testoAssenze(blocco.corpo, blocco, allievo, classe, fogli),
          a: indirizzi,
          ccn: [],
          firma: await firmaPosta(),
          allegati,
        },
        // Il periodo del blocco, e non il giorno in cui si scrive: la richiesta
        // parla di quelle assenze lì, e due giri per lo stesso allievo — le
        // assenze di settembre, quelle di gennaio — restano due file distinti
        // anche se preparati lo stesso pomeriggio.
        nome: nomeBozza(
          classe.nome,
          nomeCompleto(allievo),
          'Richiesta di firma',
          periodoNelNome(blocco.dal, blocco.al),
        ),
      })
      pronte.push({ allievoId: riga.allievoId, indirizzi })
    }

    if (pronte.length === 0) {
      // `segnaInvio` ha gia' scritto il motivo in ogni riga che non e' partita:
      // il registro e' cambiato, e rispondere «rifiutato» lascerebbe il
      // pannello a mostrare righe vecchie sopra un file gia' aggiornato.
      return riassumiInvii(
        0,
        falliti,
        ['richiesta di firma spedita', 'richieste di firma spedite'],
        falliti.length > 0,
      )
    }

    // Con l'invio diretto si domanda prima di far partire, e si domanda una
    // volta sola: venticinque conferme di fila si chiudono senza leggerle.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(
        `Spedire ${pronte.length} richieste di firma?`,
        `Una per ${PIF.singolare}, agli indirizzi del periodo ${nomePeriodo(blocco)}.`,
      ))
    ) {
      return conMessaggio(
        'Non è partito niente: le richieste restano da mandare.',
        'info',
        { invariato: true },
      )
    }

    // Dopo la conferma, che resta aperta quanto vuole: le richieste parlano
    // dell'anno che si aveva davanti, e se non è più quello non partono.
    if (!contesto.ancoraQui()) return documentoCambiato()
    // Ognuna si segna appena è partita, non a giro finito: è quel che promette
    // il commento in testa, e un giro lento che si interrompe a metà deve
    // lasciare scritto chi l'ha già ricevuta — o al secondo tentativo la stessa
    // azienda riceve la stessa mail due volte. Chi non parte si segna dopo, con
    // il motivo, che qui ancora non si sa.
    const segnati = new Set<number>()
    const scritte = await bozzeDiGruppo(daScrivere, classe.nome, (indice, ok) => {
      const pronta = pronte[indice]
      if (!ok || !pronta || !contesto.ancoraQui()) return
      segnaInvio(contesto.archivio, azione, pronta.allievoId, pronta.indirizzi)
      segnati.add(indice)
    })
    if (!scritte.ok) return rifiuta(scritte.errore ?? 'Le bozze non si sono potute preparare.')

    // `daScrivere` e `pronte` crescono insieme, uno alla volta nello stesso
    // giro: l'indice che Outlook rimanda indietro è la stessa persona in tutte
    // e due. Chi tocca quel ciclo tenga le due `push` appaiate.
    const nonPartiti = new Map(scritte.falliti.map((f) => [f.indice, f.errore]))

    // Le bozze sono pronte e nessuna è partita: si segnano una a una, con la
    // spunta nella casella di chi riguardano, quando lo sono. Il registro non
    // domanda «le hai spedite tutte?» — nel momento in cui lo chiedeva, nessuna
    // lo era ancora.
    if (!scritte.spediti) {
      return conMessaggio(
        `${pronte.length} bozze pronte in ${scritte.dove}. Mandale una alla volta dal programma ` +
          `di posta e spunta ogni ${PIF.singolare} quando la sua richiesta è partita.`,
        'info',
        { invariato: true },
      )
    }

    // Partite, ma il documento è cambiato mentre partivano: le righe ancora da
    // segnare sono dell'anno di prima, e vanno segnate a mano là.
    if (!contesto.ancoraQui()) {
      return rifiutaCon(
        'conflitto',
        `${pronte.length - nonPartiti.size} richieste di firma partite, ma il documento aperto è ` +
          `cambiato: ${segnati.size} segnate, le altre no.`,
      )
    }
    for (const [indice, { allievoId, indirizzi }] of pronte.entries()) {
      const guasto = nonPartiti.get(indice)
      const allievo = classe.allievi.find((a) => a.id === allievoId)
      if (guasto) {
        // Non è partita: si scrive il motivo nella riga e si dice a chi guarda.
        // Segnarla spedita perché il giro è andato bene vorrebbe dire dire che
        // un'azienda è stata avvisata quando non lo è.
        segnaInvio(contesto.archivio, azione, allievoId, [], guasto)
        falliti.push(`${allievo ? nomeCompleto(allievo) : allievoId}: ${guasto}`)
        continue
      }
      // Già segnata mentre partiva: riscriverla cambierebbe solo l'ora.
      if (!segnati.has(indice)) segnaInvio(contesto.archivio, azione, allievoId, indirizzi)
      partite += 1
    }

    return riassumiInvii(
      partite,
      falliti,
      ['richiesta di firma spedita', 'richieste di firma spedite'],
      falliti.length > 0,
    )
  },

  /**
   * La spunta sulla richiesta di un allievo: chi l'ha mandata dal programma
   * di posta lo dice qui. Togliendola la richiesta torna da mandare, e la
   * casella torna a offrire la bozza.
   */
  'assenze.spunta': (contesto, azione) => {
    const trovato = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    if (!trovato || !classe || !allievo) return rifiuta('Richiesta non trovata.')

    if (!azione.spedita) {
      contesto.archivio.modifica((r) => {
        const dentro = bloccoAssenze(r, azione.classeId, azione.bloccoId)
        const riga = dentro?.blocco.righe.find((x) => x.allievoId === azione.allievoId)
        if (!dentro || !riga) return
        riga.invio = null
        const ora = new Date().toISOString()
        dentro.blocco.aggiornatoIl = ora
        dentro.fascicolo.aggiornatoIl = ora
      }, ['fascicoli'])
      return conMessaggio(`Richiesta di ${nomeCompleto(allievo)} riportata da mandare.`)
    }

    const { indirizzi } = destinatariAssenze(trovato.blocco, allievo, trovato.fascicolo)
    segnaInvio(contesto.archivio, azione, azione.allievoId, indirizzi)
    return conMessaggio(`Richiesta di ${nomeCompleto(allievo)} segnata come spedita.`)
  },
} satisfies Parte
