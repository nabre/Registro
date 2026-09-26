// Il mestiere del docente di classe: recapiti, comunicazioni alle famiglie e i
// fogli delle assenze da far firmare.
// Si scrive con `nelFascicolo`, che trova o crea il fascicolo della classe.

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
import { documentoPer } from '../domain/assignments.js'
import { fascicoloDellaClasse } from '../domain/courses.js'
import { oggi, periodoNelNome, istanteAdesso } from '../domain/dates.js'
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
import { parole } from '../domain/words.testi.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './classTeacher.testi.js'

/** Copia un foglio nell'archivio di chi riguarda (sovrascrive quello che c'era) e ne descrive la voce. */
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
    return { errore: comuni().senzaAnno }
  }

  // Percorso dal dominio, lo stesso che usa chi ritaglia un PDF di classe.
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
      aggiuntoIl: istanteAdesso(),
    },
  }
}

/**
 * Scrive com'è andata l'e-mail di una persona in formazione, subito: se il giro
 * si interrompe, chi è già stato servito non riceve la mail due volte.
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
    const ora = istanteAdesso()
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
  const ora = istanteAdesso()
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
  /** Il foglio firme di una consegna alla classe: uno per richiesta, non per allievo. */
  'consegna.firme.aggiungi': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato

    const scelto = await scegliUnFile({
      titolo: testi().firmeDi(consegna.testo),
      tasto: comuni().allega,
    })
    if (!scelto) return fatto
    // Durante il dialogo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const esito = await archiviaCopia(
      percorsoConsegna(
        classe,
        nomeFileArchivio(classe.nome, null, consegna.testo, testi().fileFirme, scelto.estensione),
      ),
      scelto.uri,
      consegna.fileFirme ?? null,
    )
    if ('errore' in esito) return rifiuta(comuni().copiaNonRiuscita(esito.errore))

    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      // Sparita mentre si sceglieva il file: «non trovata», non «fatto».
      if (!bersaglio) return false
      bersaglio.fileFirme = esito.relativo
      bersaglio.nomeFirme = scelto.nome
      bersaglio.aggiornataIl = istanteAdesso()
    }, ['consegne'], comuni().sparito.consegna)
  },

  'consegna.firme.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    return apriFile(consegna?.fileFirme, testi().firme)
  },

  'consegna.firme.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna?.fileFirme) return rifiuta(testi().nessunFoglioFirme)
    await cestina(consegna.fileFirme)
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      bersaglio.fileFirme = undefined
      bersaglio.nomeFirme = undefined
      bersaglio.aggiornataIl = istanteAdesso()
    }, ['consegne'])
  },

  'consegna.file.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const documento = consegna ? documentoPer(consegna, azione.chi) : null
    if (!consegna || !documento) return rifiuta(testi().nessunDocumento)
    return apriFile(documento.file, consegna.testo)
  },

  /** Il file fuori dal documento dell'anno e la spunta via: quel documento torna atteso. */
  'consegna.file.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const documento = consegna
      ? (consegna.documenti ?? []).find((d) => d.allievoId === azione.chi) ?? null
      : null
    if (!consegna) return rifiuta(comuni().nonTrovato.consegna)
    if (!documento && !consegna.fatte.some((f) => f.chi === azione.chi)) {
      return rifiuta(testi().nienteDaTogliere)
    }
    await cestina(documento?.file)
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === azione.consegnaId)
      if (!bersaglio) return
      bersaglio.documenti = (bersaglio.documenti ?? []).filter((d) => d.allievoId !== azione.chi)
      bersaglio.fatte = bersaglio.fatte.filter((f) => f.chi !== azione.chi)
      bersaglio.aggiornataIl = istanteAdesso()
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
    const t = testi()
    if (!classe || !fascicolo || !comunicazione) return rifiuta(comuni().nonTrovato.comunicazione)
    if (comunicazione.stato === 'inviata') return rifiuta(t.giaPartita)
    const esito = validaComunicazione(comunicazione)
    if (!esito.valido) return { ok: false, errori: esito.errori }

    const { indirizzi } = destinatariComunicazione(classe, fascicolo, comunicazione)
    if (indirizzi.length === 0) return rifiuta(t.senzaIndirizzi)

    // Gli allegati si leggono adesso: quel che parte è il file com'è oggi.
    const allegati = []
    for (const raccolta of allegatiComunicazione(contesto.registro, comunicazione)) {
      const dato = fileDellaConsegna(raccolta)
      const contenuto = dato ? await contenutoDi(dato.file) : null
      if (!dato || !contenuto) {
        return rifiuta(t.allegatoIlleggibile(raccolta.testo))
      }
      // Col nome del file archiviato (classe, argomento, chi), non con l'etichetta.
      allegati.push({
        nome: basename(dato.file),
        tipo: tipoMime(dato.file),
        contenuto: Buffer.from(contenuto).toString('base64'),
      })
    }

    // Con l'invio diretto si conferma prima di spedire.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(
        t.domandaComunicazione(comunicazione.oggetto || t.laComunicazione, indirizzi.length),
        t.dettaglioComunicazione,
      ))
    ) {
      return conMessaggio(t.nientePartitoComunicazione, 'info', { invariato: true })
    }

    // Durante la conferma può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const bozza = await apriBozzaSingola(
      {
        oggetto: comunicazione.oggetto,
        corpo: comunicazione.corpo,
        ccn: indirizzi,
        firma: firmaPosta(contesto.registro.impostazioni.intestazione),
        allegati,
      },
      classe.nome,
      // Il giorno nel nome: la stessa comunicazione rimandata non sovrascrive la bozza vecchia.
      nomeBozza(
        classe.nome,
        null,
        comunicazione.oggetto || t.comunicazione,
        periodoNelNome(oggi()),
      ),
    )
    if (!bozza.ok) {
      // Bozza non scritta: non è un invio fallito, la comunicazione resta com'era.
      return rifiuta(bozza.errore ?? t.bozzaNonPreparata)
    }

    // Solo una bozza: resta tale fino alla spunta. Il percorso si dice sempre,
    // perché il sistema risponde «aperto» anche quando la finestra non compare.
    if (!bozza.spedita) {
      return conMessaggio(
        t.bozzaAperta(indirizzi.length, bozza.file?.fsPath ?? ''),
        'info',
        { invariato: true },
      )
    }

    // Partita, ma intanto si è aperto un altro anno: non si segna.
    if (!contesto.ancoraQui()) {
      return rifiutaCon('conflitto', t.speditaMaCambiato(indirizzi.length))
    }
    segnaComunicazione(contesto.archivio, azione.classeId, azione.comunicazioneId, indirizzi)
    if (bozza.avviso) {
      return conMessaggio(t.speditaNonATutti(indirizzi.length, bozza.avviso), 'avviso')
    }
    return conMessaggio(t.spedita(indirizzi.length))
  },

  /**
   * Segna spedita a mano una comunicazione, con i destinatari di adesso;
   * togliere la spunta la riporta a bozza.
   */
  'comunicazione.spunta': (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const fascicolo = fascicoloDellaClasse(contesto.registro, azione.classeId)
    const comunicazione = fascicolo?.comunicazioni.find((c) => c.id === azione.comunicazioneId)
    if (!classe || !fascicolo || !comunicazione) return rifiuta(comuni().nonTrovato.comunicazione)

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
      return conMessaggio(testi().riportataABozza)
    }

    const { indirizzi } = destinatariComunicazione(classe, fascicolo, comunicazione)
    segnaComunicazione(contesto.archivio, azione.classeId, azione.comunicazioneId, indirizzi)
    return conMessaggio(testi().segnataSpedita(indirizzi.length))
  },

  'assenze.salva': (contesto, azione) => {
    const esito = validaBloccoAssenze(azione.blocco)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const fascicolo = fascicoloDellaClasse(contesto.registro, azione.classeId)
    const nuovo = !fascicolo?.assenze.some((b) => b.id === azione.blocco.id)
    contesto.modifica((r) => {
      const vivo = fascicoloDi(r, azione.classeId)
      if (!vivo) return
      const ora = istanteAdesso()
      const indice = vivo.assenze.findIndex((b) => b.id === azione.blocco.id)
      if (indice >= 0) {
        // Le righe (fogli e invii) restano quelle del registro: la copia del
        // webview può essere vecchia.
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
    if (!dove) return rifiuta(comuni().nonTrovato.periodo)

    // Foglio per foglio, non la cartella: può contenere anche documenti di una
    // consegna con lo stesso titolo.
    for (const riga of dove.blocco.righe) {
      for (const foglio of riga.fogli) await cestina(foglio.file)
    }
    // La cartella piatta dell'archivio in forma vecchia è invece solo sua.
    deposito()?.eliminaSotto(`assenze/${azione.classeId}/${azione.bloccoId}`)

    return contesto.nelFascicolo(azione.classeId, (fascicolo) => {
      fascicolo.assenze = fascicolo.assenze.filter((b) => b.id !== azione.bloccoId)
    })
  },

  'assenze.foglio.aggiungi': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta(comuni().nonTrovato.periodo)
    const allievo = dove.classe.allievi.find((a) => a.id === azione.allievoId)
    if (!allievo) return rifiuta(comuni().nonTrovato.pif)

    const scelto = await scegliUnFile({
      titolo: `${etichettaFoglio(azione.genere, azione.firmato)} — ${nomeCompleto(allievo)}`,
      tasto: parole().aggiungi,
    })
    if (!scelto) return fatto
    if (!contesto.ancoraQui()) return documentoCambiato()

    // Lo stesso foglio ricaricato sostituisce quello che c'era.
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
    // Con un'altra estensione il vecchio non è stato coperto: nel cestino, a scrittura riuscita.
    if (scritto.ok && vecchio && vecchio.file !== copiato.foglio.file) await cestina(vecchio.file)
    return scritto
  },

  'assenze.importa': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta(comuni().nonTrovato.periodo)
    const allievi = allieviAttivi(dove.classe)
    if (allievi.length === 0) return rifiuta(testi().senzaFrequentanti)

    const scelti = await scegliFile({
      titolo: `${etichettaFoglio(azione.genere, azione.firmato)} — ${nomePeriodo(dove.blocco)}`,
      tasto: parole().importa,
      molti: true,
    })
    if (!scelti) return fatto
    if (!contesto.ancoraQui()) return documentoCambiato()

    const presi: Array<{ allievoId: string, foglio: FoglioAssenze, vecchio: string | null }> = []
    const fuori: string[] = []
    for (const scelto of scelti) {
      // Ogni copia aspetta il disco: il documento può cambiare a metà.
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

    // I file non riconosciuti si elencano, non si assegnano a occhio.
    if (fuori.length > 0) {
      return conMessaggio(testi().assegnatiConFuori(presi.length, fuori), 'avviso')
    }
    return conMessaggio(testi().assegnati(presi.length))
  },

  'assenze.foglio.apri': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const riga = dove ? rigaDi(dove.blocco, azione.allievoId) : null
    const foglio = foglioDi(riga, azione.genere, azione.firmato)
    if (!foglio) return rifiuta(testi().nessunFoglioDaAprire)
    return apriFile(foglio.file, foglio.nome)
  },

  'assenze.foglio.togli': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const riga = dove ? rigaDi(dove.blocco, azione.allievoId) : null
    const foglio = foglioDi(riga, azione.genere, azione.firmato)
    if (!foglio) return rifiuta(testi().nessunFoglioDaTogliere)
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
   * La richiesta di firma, una mail per allievo con i suoi fogli. Ogni invio si
   * segna subito, così un giro interrotto non rispedisce a chi l'ha già avuta.
   */
  'assenze.invia': async (contesto, azione) => {
    const dove = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    if (!dove) return rifiuta(comuni().nonTrovato.periodo)
    const { blocco, classe, fascicolo } = dove
    const t = testi()
    const esito = validaBloccoAssenze(blocco)
    if (!esito.valido) return { ok: false, errori: esito.errori }

    const scelte =
      azione.allieviIds.length > 0
        ? blocco.righe.filter((r) => azione.allieviIds.includes(r.allievoId))
        : daSpedire(blocco)
    if (scelte.length === 0) return rifiuta(comuni().nienteDaSpedire)

    // Le bozze non si aprono in finestre: vanno fra le bozze della casella (o,
    // senza Outlook, in file nella cartella della classe).
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
        falliti.push(t.nessunFoglioDaAllegare(nomeCompleto(allievo)))
        continue
      }

      // Le letture sono asincrone: può essersi aperto un altro anno.
      if (!contesto.ancoraQui()) return documentoCambiato()
      const { indirizzi, senzaIndirizzo } = destinatariAssenze(blocco, allievo, fascicolo)
      if (indirizzi.length === 0) {
        const motivo = t.nessunIndirizzo(senzaIndirizzo)
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
        // Col nome archiviato (allievo e periodo): torna firmato con lo stesso nome.
        allegati.push({
          nome: basename(foglio.file),
          tipo: tipoMime(foglio.file),
          contenuto: Buffer.from(contenuto).toString('base64'),
        })
      }
      if (illeggibile) {
        if (!contesto.ancoraQui()) return documentoCambiato()
        const motivo = t.allegatoNonLeggibile(illeggibile)
        falliti.push(`${nomeCompleto(allievo)}: ${motivo}`)
        segnaInvio(contesto.archivio, azione, riga.allievoId, [], motivo)
        continue
      }

      // Non si segna ancora: una bozza non è una mail partita.
      daScrivere.push({
        messaggio: {
          // «{rapporti}» e «{tipi}» dicono i fogli di questa busta, non del periodo.
          oggetto: testoAssenze(blocco.oggetto, blocco, allievo, classe, fogli),
          corpo: testoAssenze(blocco.corpo, blocco, allievo, classe, fogli),
          a: indirizzi,
          ccn: [],
          firma: firmaPosta(contesto.registro.impostazioni.intestazione),
          allegati,
        },
        // Il periodo del blocco nel nome, non la data d'oggi: due periodi dello
        // stesso allievo restano file distinti.
        nome: nomeBozza(
          classe.nome,
          nomeCompleto(allievo),
          t.richiestaDiFirma,
          periodoNelNome(blocco.dal, blocco.al),
        ),
      })
      pronte.push({ allievoId: riga.allievoId, indirizzi })
    }

    if (pronte.length === 0) {
      // Non «rifiutato»: `segnaInvio` ha già scritto i motivi, il pannello deve ridisegnare.
      return riassumiInvii(0, falliti, t.spediteRichieste, falliti.length > 0)
    }

    // Con l'invio diretto si conferma prima, una volta sola per tutto il giro.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(
        t.domandaRichieste(pronte.length),
        t.dettaglioRichieste(nomePeriodo(blocco)),
      ))
    ) {
      return conMessaggio(t.nientePartitoRichieste, 'info', { invariato: true })
    }

    // Durante la conferma può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()
    // Ognuna si segna appena parte; chi non parte si segna dopo, col motivo.
    const segnati = new Set<number>()
    const scritte = await bozzeDiGruppo(daScrivere, classe.nome, (indice, ok) => {
      const pronta = pronte[indice]
      if (!ok || !pronta || !contesto.ancoraQui()) return
      segnaInvio(contesto.archivio, azione, pronta.allievoId, pronta.indirizzi)
      segnati.add(indice)
    })
    if (!scritte.ok) return rifiuta(scritte.errore ?? comuni().bozzeNonPreparate)

    // `daScrivere` e `pronte` sono appaiati: lo stesso indice è la stessa persona.
    // Tenere appaiate le due `push` del ciclo sopra.
    const nonPartiti = new Map(scritte.falliti.map((f) => [f.indice, f.errore]))

    // Solo bozze: si segnano una a una con la spunta, quando partono.
    if (!scritte.spediti) {
      return conMessaggio(t.bozzePronte(pronte.length, scritte.dove), 'info', { invariato: true })
    }

    // Partite, ma intanto il documento è cambiato: le righe restanti vanno segnate a mano.
    if (!contesto.ancoraQui()) {
      return rifiutaCon(
        'conflitto',
        t.partiteMaCambiato(pronte.length - nonPartiti.size, segnati.size),
      )
    }
    for (const [indice, { allievoId, indirizzi }] of pronte.entries()) {
      const guasto = nonPartiti.get(indice)
      const allievo = classe.allievi.find((a) => a.id === allievoId)
      if (guasto) {
        // Non partita: il motivo nella riga e nel riepilogo.
        segnaInvio(contesto.archivio, azione, allievoId, [], guasto)
        falliti.push(`${allievo ? nomeCompleto(allievo) : allievoId}: ${guasto}`)
        continue
      }
      // Già segnata mentre partiva: riscriverla cambierebbe solo l'ora.
      if (!segnati.has(indice)) segnaInvio(contesto.archivio, azione, allievoId, indirizzi)
      partite += 1
    }

    const inParte = scritte.parziali.map(({ indice, errore }) => {
      const chi = pronte[indice]?.allievoId
      const allievo = classe.allievi.find((a) => a.id === chi)
      return `${allievo ? nomeCompleto(allievo) : chi ?? '?'}: ${errore}`
    })
    return riassumiInvii(partite, falliti, t.spediteRichieste, falliti.length > 0, inParte)
  },

  /** Segna spedita a mano la richiesta di un allievo; togliendo la spunta torna da mandare. */
  'assenze.spunta': (contesto, azione) => {
    const trovato = bloccoAssenze(contesto.registro, azione.classeId, azione.bloccoId)
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    if (!trovato || !classe || !allievo) return rifiuta(testi().richiestaNonTrovata)

    if (!azione.spedita) {
      contesto.archivio.modifica((r) => {
        const dentro = bloccoAssenze(r, azione.classeId, azione.bloccoId)
        const riga = dentro?.blocco.righe.find((x) => x.allievoId === azione.allievoId)
        if (!dentro || !riga) return
        riga.invio = null
        const ora = istanteAdesso()
        dentro.blocco.aggiornatoIl = ora
        dentro.fascicolo.aggiornatoIl = ora
      }, ['fascicoli'])
      return conMessaggio(testi().riportataDaMandare(nomeCompleto(allievo)))
    }

    const { indirizzi } = destinatariAssenze(trovato.blocco, allievo, trovato.fascicolo)
    segnaInvio(contesto.archivio, azione, azione.allievoId, indirizzi)
    return conMessaggio(testi().richiestaSpedita(nomeCompleto(allievo)))
  },
} satisfies Parte
