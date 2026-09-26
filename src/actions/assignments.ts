// Le consegne: darle, spuntarle, raccogliere e distribuire i documenti. Il file
// raccolto sta dentro la spunta, così i due non si disallineano.

import { basename } from 'node:path'

import { contenutoDi, deposito } from '../data/store.js'
import { archiviaCopia, nomeFileArchivio, percorsoConsegna } from '../data/filing.js'
import { firmaPosta } from '../data/templates.js'
import {
  bozzeDiGruppo,
  confermaInvio,
  nomeBozza,
  puoSpedire,
  type MessaggioPosta,
} from '../data/mail.js'
import { nomeCompleto } from '../domain/calculations.js'
import { CHI_INSEGNA, type Collezione, type Registro } from '../domain/models.js'
import {
  daConsegnareA,
  destinatariConsegna,
  documentoPer,
  siConsegna,
  testoConsegna,
} from '../domain/assignments.js'
import { oggi, periodoNelNome, istanteAdesso } from '../domain/dates.js'
import { corpoConsegna } from '../domain/factories.js'
import { validaConsegna } from '../domain/validation.js'
import type { Archivio } from '../data/archive.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  consegnaConClasse,
  documentoCambiato,
  fatto,
  invariato,
  riassumiInvii,
  rifiuta,
  rifiutaCon,
  riponi,
  scegliUnFile,
  tipoMime,
  type Parte,
} from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './assignments.testi.js'

/** Una fetta di pagine assegnate da uno smistamento. */
type Fetta = Registro['smistamenti'][number]['assegnate'][number]

/** Se una fetta di smistamento ha dato pagine al documento di `chi` (esclusi assenze e firme). */
function fettaDelDocumento (
  fetta: Fetta,
  consegnaDelPdf: string | null,
  consegnaId: string,
  chi: string,
): boolean {
  if (fetta.assenze || fetta.firme) return false
  return fetta.allievoId === chi && (fetta.consegnaId ?? consegnaDelPdf) === consegnaId
}

/** Vero se qualche PDF in quarantena dice ancora di aver dato pagine a quel documento. */
function haFette (registro: Registro, consegnaId: string, chi: string): boolean {
  return registro.smistamenti.some((s) =>
    s.assegnate.some((f) => fettaDelDocumento(f, s.consegnaId, consegnaId, chi)),
  )
}

/**
 * Stacca le fette che avevano fatto il documento di una persona, quando
 * questo se ne va o viene sostituito: «riprendi le pagine» non deve cestinare
 * il documento nuovo.
 */
function staccaFette (r: Registro, consegnaId: string, chi: string): void {
  for (const smistamento of r.smistamenti) {
    const pdf = smistamento.consegnaId
    if (!smistamento.assegnate.some((f) => fettaDelDocumento(f, pdf, consegnaId, chi))) continue
    smistamento.assegnate = smistamento.assegnate.filter(
      (f) => !fettaDelDocumento(f, pdf, consegnaId, chi),
    )
  }
}

/** Le collezioni toccate dal documento di una persona: anche `smistamenti` se `staccaFette` lavora. */
function collezioniDocumento (registro: Registro, consegnaId: string, chi: string): Collezione[] {
  return haFette(registro, consegnaId, chi) ? ['consegne', 'smistamenti'] : ['consegne']
}

/** Segna il documento spedito per mail, sostituendo la spunta di prima di quella persona. */
function segnaSpedito (
  archivio: Archivio,
  consegnaId: string,
  pronta: { allievoId: string, indirizzi: string[], file: string, nome?: string },
): void {
  const ora = istanteAdesso()
  archivio.modifica((r) => {
    const bersaglio = r.consegne.find((c) => c.id === consegnaId)
    if (!bersaglio) return
    bersaglio.fatte = bersaglio.fatte.filter((f) => f.chi !== pronta.allievoId)
    bersaglio.fatte.push({
      chi: pronta.allievoId,
      fattaIl: ora,
      modo: 'email',
      destinatari: pronta.indirizzi,
      file: pronta.file,
      nome: pronta.nome,
    })
    bersaglio.aggiornataIl = ora
  }, ['consegne'])
}

export const consegne = {
  /**
   * La consegna intera: testo, destinatari, scadenza, posta. Spunte e file di
   * una consegna esistente restano quelli del registro (si cambiano con le loro
   * azioni); una nuova nasce senza file, perché un percorso passato da chi
   * chiama potrebbe nominare file altrui.
   */
  'consegna.salva': (contesto, azione) => {
    const esito = validaConsegna(azione.consegna)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    if (!contesto.registro.corsi.some((c) => c.id === azione.consegna.corsoId)) {
      return rifiuta(testi().corsoAssente)
    }
    const nuova = !contesto.registro.consegne.some((c) => c.id === azione.consegna.id)
    const consegna = { ...azione.consegna, aggiornataIl: istanteAdesso() }
    const scritto = contesto.modifica((r) => {
      const viva = r.consegne.find((c) => c.id === consegna.id)
      if (viva) {
        consegna.fatte = viva.fatte
        consegna.documenti = viva.documenti
        // Anche i fogli «per tutti» e firme, che hanno azioni loro.
        consegna.fileTutti = viva.fileTutti
        consegna.nomeTutti = viva.nomeTutti
        consegna.fileFirme = viva.fileFirme
        consegna.nomeFirme = viva.nomeFirme
      } else {
        delete consegna.fileTutti
        delete consegna.nomeTutti
        delete consegna.fileFirme
        delete consegna.nomeFirme
        // Un documento è il suo file: senza, la riga non dice niente.
        consegna.documenti = []
        consegna.fatte = consegna.fatte.map(({ file: _file, nome: _nome, ...spunta }) => spunta)
      }
      riponi(r.consegne, consegna)
    }, ['consegne'])
    if (!scritto.ok) return scritto
    return nuova ? { ok: true, creato: { id: consegna.id } } : fatto
  },

  // I documenti raccolti se ne vanno con lei, come dice la conferma del pannello.
  'consegna.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'consegna', id: azione.consegnaId })
  },

  /**
   * La spunta di una persona sola. Non si toglie se porta un documento
   * raccolto: per quello c'è `consegna.documento.togli`.
   */
  'consegna.spunta': (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const gia = consegna?.fatte.find((f) => f.chi === azione.chi)
    if (!azione.fatta && gia?.file) {
      return rifiuta(testi().documentoRaccolto)
    }
    // Già nello stato chiesto: invariato (idempotente). La spunta esistente
    // resta intatta, con la sua data e il suo file.
    if (consegna && Boolean(gia) === azione.fatta) return invariato
    return contesto.suVoce('consegne', azione.consegnaId, (voce) => {
      if (!azione.fatta) {
        voce.fatte = voce.fatte.filter((f) => f.chi !== azione.chi)
        return
      }
      if (voce.fatte.some((f) => f.chi === azione.chi)) return
      voce.fatte.push({ chi: azione.chi, fattaIl: istanteAdesso() })
    })
  },

  /** Spunta tutti quelli che mancano, o toglie le spunte senza documento raccolto. */
  'consegna.spuntaTutti': (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const destinatari = destinatariConsegna(trovato.consegna, trovato.classe)

    return contesto.suVoce('consegne', azione.consegnaId, (consegna) => {
      if (!azione.fatta) {
        consegna.fatte = consegna.fatte.filter((f) => f.file)
        return
      }
      const quando = istanteAdesso()
      const gia = new Set(consegna.fatte.map((f) => f.chi))
      for (const chi of destinatari) {
        if (!gia.has(chi)) consegna.fatte.push({ chi, fattaIl: quando })
      }
    })
  },

  /** Raccoglie il foglio di una persona e la spunta; annullando la scelta non si spunta niente. */
  'consegna.raccogli': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    if (!deposito()) return rifiuta(comuni().senzaAnno)

    const allievo =
      azione.chi === CHI_INSEGNA ? null : classe.allievi.find((a) => a.id === azione.chi) ?? null
    if (azione.chi !== CHI_INSEGNA && !allievo) return rifiuta(comuni().nonTrovato.pif)

    const scelto = await scegliUnFile({
      titolo: allievo
        ? `${consegna.testo} — ${nomeCompleto(allievo)}`
        : `${consegna.testo} — ${classe.nome}`,
      tasto: testi().raccogli,
    })
    if (!scelto) return fatto
    // Durante il dialogo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    // Il file già raccolto per la persona si sostituisce, senza lasciare orfani.
    const vecchio =
      (consegna.documenti ?? []).find((d) => d.allievoId === azione.chi)?.file ?? null
    const nomeDestinazione = nomeFileArchivio(
      classe.nome,
      allievo ? nomeCompleto(allievo) : null,
      consegna.testo,
      allievo ? null : testi().fileMio,
      scelto.estensione,
    )
    const esito = await archiviaCopia(
      percorsoConsegna(classe, nomeDestinazione, allievo ? nomeCompleto(allievo) : null),
      scelto.uri,
      vecchio,
    )
    if ('errore' in esito) return rifiuta(comuni().copiaNonRiuscita(esito.errore))

    // Il file va fra i documenti e in più si spunta, se non era già spuntato.
    const ora = istanteAdesso()
    const scritto = contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === azione.consegnaId)
      // Sparita mentre si sceglieva il file: «non trovata», non «fatto».
      if (!bersaglio) return false
      bersaglio.documenti = [
        ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== azione.chi),
        { allievoId: azione.chi, file: esito.relativo, nome: scelto.nome, aggiuntoIl: ora },
      ]
      // Il documento nuovo non viene dalle pagine di un PDF smistato.
      staccaFette(r, azione.consegnaId, azione.chi)
      if (!bersaglio.fatte.some((f) => f.chi === azione.chi)) {
        bersaglio.fatte.push({ chi: azione.chi, fattaIl: ora, modo: 'mano' })
      }
      bersaglio.aggiornataIl = ora
    }, collezioniDocumento(contesto.registro, azione.consegnaId, azione.chi),
    comuni().sparito.consegna)
    // Il file di prima con un altro nome si cestina, a scrittura riuscita.
    if (scritto.ok && vecchio && vecchio !== esito.relativo) await cestina(vecchio)
    return scritto
  },

  /** Allega il documento da dare a qualcuno (o a tutti), senza spuntare: darlo è un altro gesto. */
  'consegna.documento.allega': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    const allievo = azione.allievoId
      ? classe.allievi.find((a) => a.id === azione.allievoId) ?? null
      : null
    if (azione.allievoId && !allievo) return rifiuta(comuni().nonTrovato.pif)

    const scelto = await scegliUnFile({
      titolo: allievo
        ? `${consegna.testo} — ${nomeCompleto(allievo)}`
        : testi().perTuttiTitolo(consegna.testo),
      tasto: comuni().allega,
    })
    if (!scelto) return fatto
    if (!contesto.ancoraQui()) return documentoCambiato()

    // Un documento nuovo allo stesso posto sostituisce quello che c'era.
    const sostituibile = allievo
      ? (consegna.documenti ?? []).find((d) => d.allievoId === allievo.id)?.file ?? null
      : consegna.fileTutti ?? null
    const esito = await archiviaCopia(
      percorsoConsegna(
        classe,
        nomeFileArchivio(
          classe.nome,
          allievo ? nomeCompleto(allievo) : null,
          consegna.testo,
          allievo ? null : testi().filePerTutti,
          scelto.estensione,
        ),
      ),
      scelto.uri,
      sostituibile,
    )
    if ('errore' in esito) return rifiuta(comuni().copiaNonRiuscita(esito.errore))

    const ora = istanteAdesso()
    const scritto = contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return false
      if (allievo) {
        bersaglio.documenti = [
          ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== allievo.id),
          { allievoId: allievo.id, file: esito.relativo, nome: scelto.nome, aggiuntoIl: ora },
        ]
        // Come raccogliendo: il documento nuovo non viene da un PDF smistato.
        staccaFette(r, consegna.id, allievo.id)
      } else {
        bersaglio.fileTutti = esito.relativo
        bersaglio.nomeTutti = scelto.nome
      }
      bersaglio.aggiornataIl = ora
    }, allievo ? collezioniDocumento(contesto.registro, consegna.id, allievo.id) : ['consegne'],
    comuni().sparito.consegna)
    // Con un'altra estensione il vecchio non è stato coperto: si cestina.
    if (scritto.ok && sostituibile && sostituibile !== esito.relativo) await cestina(sostituibile)
    return scritto
  },

  'consegna.documento.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta(comuni().nonTrovato.consegna)
    const documento = azione.allievoId
      ? documentoPer(consegna, azione.allievoId)
      : consegna.fileTutti
        ? { file: consegna.fileTutti, nome: consegna.nomeTutti ?? '' }
        : null
    if (!documento) return rifiuta(testi().nessunoPronto)
    return apriFile(documento.file, documento.nome || consegna.testo)
  },

  'consegna.documento.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta(comuni().nonTrovato.consegna)
    const percorso = azione.allievoId
      ? (consegna.documenti ?? []).find((d) => d.allievoId === azione.allievoId)?.file
      : consegna.fileTutti
    // Già tolto: riuscita invariata (idempotente).
    if (!percorso) {
      return conMessaggio(testi().giaTolto, 'info', { invariato: true })
    }

    await cestina(percorso)
    const allievoId = azione.allievoId
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      if (allievoId) {
        bersaglio.documenti = (bersaglio.documenti ?? []).filter(
          (d) => d.allievoId !== allievoId,
        )
        // Le pagine smistate che lo avevano fatto non sono più di nessuno.
        staccaFette(r, consegna.id, allievoId)
      } else {
        bersaglio.fileTutti = undefined
        bersaglio.nomeTutti = undefined
      }
      bersaglio.aggiornataIl = istanteAdesso()
    }, allievoId ? collezioniDocumento(contesto.registro, consegna.id, allievoId) : ['consegne'])
  },

  /** Consegnato a mano, in aula: resta solo la spunta. */
  'consegna.consegnato': (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta(comuni().nonTrovato.consegna)
    const documento = documentoPer(consegna, azione.allievoId)
    const ora = istanteAdesso()

    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      bersaglio.fatte = bersaglio.fatte.filter((f) => f.chi !== azione.allievoId)
      if (azione.fatta) {
        bersaglio.fatte.push({
          chi: azione.allievoId,
          fattaIl: ora,
          modo: 'mano',
          file: documento?.file,
          nome: documento?.nome,
        })
      }
      bersaglio.aggiornataIl = ora
    }, ['consegne'])
  },

  /**
   * Distribuisce per mail: un messaggio per allievo con il suo documento, mai
   * uno cumulativo. Si segna solo quel che è partito; chi manca si dice per nome.
   */
  'consegna.distribuisci': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    const t = testi()
    if (!siConsegna(consegna)) return rifiuta(t.siRaccoglie)

    const scelti = azione.allieviIds && azione.allieviIds.length > 0
      ? azione.allieviIds
      : daConsegnareA(consegna, classe)
    if (scelti.length === 0) return rifiuta(comuni().nienteDaSpedire)

    // Finiscono fra le bozze della casella o, senza Outlook, in file nella
    // cartella della classe; non si aprono una a una.
    const daScrivere: Array<{ messaggio: MessaggioPosta, nome: string }> = []
    let partite = 0
    const falliti: string[] = []
    /** Chi ha la bozza pronta, con quel che andrà scritto se sarà spedita. */
    const pronte: Array<{
      allievoId: string
      indirizzi: string[]
      file: string
      nome?: string
    }> = []
    for (const allievoId of scelti) {
      const allievo = classe.allievi.find((a) => a.id === allievoId)
      if (!allievo) continue
      const documento = documentoPer(consegna, allievoId)
      if (!documento) {
        falliti.push(t.senzaDocumento(nomeCompleto(allievo)))
        continue
      }

      const indirizzi = [
        consegna.mailAllievo === false ? '' : allievo.email ?? '',
        consegna.mailTutore === false ? '' : allievo.emailTutore ?? '',
      ].filter((indirizzo) => indirizzo.trim())
      if (indirizzi.length === 0) {
        falliti.push(t.senzaIndirizzo(nomeCompleto(allievo)))
        continue
      }

      const contenuto = await contenutoDi(documento.file)
      if (!contenuto) {
        falliti.push(t.fuoriAnno(nomeCompleto(allievo)))
        continue
      }

      daScrivere.push({
        messaggio: {
          oggetto: testoConsegna(
            consegna.oggettoMail || `${consegna.testo} — {allievo}`,
            nomeCompleto(allievo),
            classe.nome,
            consegna.testo,
          ),
          corpo: testoConsegna(
            consegna.corpoMail || corpoConsegna(),
            nomeCompleto(allievo),
            classe.nome,
            consegna.testo,
          ),
          ccn: [],
          a: indirizzi,
          firma: firmaPosta(contesto.registro.impostazioni.intestazione),
          allegati: [
          // Il nome del file archiviato (classe, cosa, allievo), non l'etichetta.
            {
              nome: basename(documento.file),
              tipo: tipoMime(documento.file),
              contenuto: Buffer.from(contenuto).toString('base64'),
            },
          ],
        },
        // La scadenza, o oggi: senza una data nel nome un nuovo giro
        // sovrascriverebbe la bozza del precedente.
        nome: nomeBozza(
          classe.nome,
          nomeCompleto(allievo),
          consegna.testo,
          periodoNelNome(consegna.scadenza || oggi()),
        ),
      })
      // Niente si segna adesso: una bozza non è una consegna.
      pronte.push({ allievoId, indirizzi, file: documento.file, nome: documento.nome })
    }

    if (pronte.length === 0) {
      return riassumiInvii(0, falliti, t.spediti)
    }

    // Con l'invio diretto si conferma prima: una mail partita non si riprende.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(t.domanda(consegna.testo, pronte.length), t.dettaglio))
    ) {
      return conMessaggio(t.nientePartito, 'info', { invariato: true })
    }

    // Ognuna si segna appena partita, non a fine giro: il giro può durare
    // minuti e interrompersi, e al secondo tentativo nessuno deve riceverla due
    // volte. Come le richieste di firma (`classTeacher.ts`).
    const segnati = new Set<number>()
    const scritte = await bozzeDiGruppo(daScrivere, classe.nome, (indice, ok) => {
      const pronta = pronte[indice]
      if (!ok || !pronta || !contesto.ancoraQui()) return
      segnaSpedito(contesto.archivio, consegna.id, pronta)
      segnati.add(indice)
    })
    if (!scritte.ok) return rifiuta(scritte.errore ?? comuni().bozzeNonPreparate)

    // `daScrivere` e `pronte` hanno gli stessi indici.
    const nonPartiti = new Map(scritte.falliti.map((f) => [f.indice, f.errore]))

    // Solo bozze, nessuna partita: non si segna niente.
    if (!scritte.spediti) {
      return conMessaggio(t.bozzePronte(pronte.length, scritte.dove), 'info', { invariato: true })
    }

    // Solo chi l'ha ricevuto davvero.
    const partiti = pronte.filter((_, indice) => !nonPartiti.has(indice))
    for (const [indice, { allievoId }] of pronte.entries()) {
      const guasto = nonPartiti.get(indice)
      if (!guasto) continue
      const allievo = classe.allievi.find((a) => a.id === allievoId)
      falliti.push(`${allievo ? nomeCompleto(allievo) : allievoId}: ${guasto}`)
    }

    // Documento cambiato durante l'invio: le spunte mancanti vanno segnate a
    // mano nell'anno di prima, e lo si dice.
    if (!contesto.ancoraQui()) {
      return rifiutaCon('conflitto', t.cambiatoDurante(partiti.length, segnati.size))
    }
    // Si segnano i partiti non ancora segnati dal richiamo.
    for (const [indice, pronta] of pronte.entries()) {
      if (nonPartiti.has(indice) || segnati.has(indice)) continue
      segnaSpedito(contesto.archivio, consegna.id, pronta)
    }
    partite = partiti.length

    const inParte = scritte.parziali.map(({ indice, errore }) => {
      const chi = pronte[indice]?.allievoId
      const allievo = classe.allievi.find((a) => a.id === chi)
      return `${allievo ? nomeCompleto(allievo) : chi ?? '?'}: ${errore}`
    })
    return riassumiInvii(partite, falliti, t.spediti, false, inParte)
  },
} satisfies Parte
