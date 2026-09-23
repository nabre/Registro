// Le consegne: darle, spuntarle, e raccogliere i documenti con cui si spuntano.
//
// La spunta e il file sono la stessa cosa — chi ha consegnato è chi ha portato
// il foglio — e per questo il file finisce dentro la spunta invece che in un
// elenco a parte che si può disallineare.

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
import { PIF, frase, quanti } from '../domain/lexicon.js'
import { CHI_INSEGNA } from '../domain/models.js'
import {
  daConsegnareA,
  destinatariConsegna,
  documentoPer,
  siConsegna,
  testoConsegna,
} from '../domain/assignments.js'
import { oggi, periodoNelNome } from '../domain/dates.js'
import { CORPO_CONSEGNA } from '../domain/factories.js'
import { validaConsegna } from '../domain/validation.js'
import {
  apriFile,
  cestina,
  conMessaggio,
  consegnaConClasse,
  fatto,
  riassumiInvii,
  rifiuta,
  riponi,
  scegliUnFile,
  tipoMime,
  type Parte,
} from './context.js'

export const consegne = {
  'consegna.salva': (contesto, azione) => {
    const esito = validaConsegna(azione.consegna)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    if (!contesto.registro.corsi.some((c) => c.id === azione.consegna.corsoId)) {
      return rifiuta('Il corso della consegna non esiste.')
    }
    const nuova = !contesto.registro.consegne.some((c) => c.id === azione.consegna.id)
    const consegna = { ...azione.consegna, aggiornataIl: new Date().toISOString() }
    contesto.modifica((r) => {
      riponi(r.consegne, consegna)
    }, ['consegne'])
    return nuova ? { ok: true, creato: { id: consegna.id } } : fatto
  },

  // I documenti raccolti se ne vanno con lei, nel cestino del sistema: un
  // foglio che nessuna consegna nomina più non lo ritrova nessuno. È quel
  // che il pannello ha promesso nella domanda di conferma.
  'consegna.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'consegna', id: azione.consegnaId })
  },

  /**
   * La spunta di una persona sola.
   *
   * Togliendola non si butta il documento che quella persona aveva portato: la
   * spunta e il file sono la stessa voce, e cancellarla vorrebbe dire perdere
   * il foglio raccolto per aver cambiato idea su un elenco. È la stessa regola
   * che `spuntaTutti` dichiara e rispetta; qui non la rispettava nessuno.
   *
   * Chi il documento lo vuole davvero togliere ha `consegna.documento.togli`,
   * che lo cestina dicendolo.
   */
  'consegna.spunta': (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    const gia = consegna?.fatte.find((f) => f.chi === azione.chi)
    if (!azione.fatta && gia?.file) {
      return rifiuta(
        'Quella consegna ha un documento raccolto: togli prima il documento, ' +
          'altrimenti se ne andrebbe con la spunta.',
      )
    }
    return contesto.suVoce('consegne', azione.consegnaId, (voce) => {
      if (!azione.fatta) {
        voce.fatte = voce.fatte.filter((f) => f.chi !== azione.chi)
        return
      }
      // Spuntare chi è già spuntato ritimbra la data e basta. Prima la voce
      // veniva **ricostruita nuda** — via il file raccolto, il nome con cui era
      // arrivato, il modo, i destinatari a cui era partita e la nota — e il
      // documento restava nel deposito senza che nessuna eliminazione potesse
      // più portarlo via, perché a cercarlo si passa proprio di qui. La
      // procedura si dichiara `idempotente: true`, cioè «ritentala pure dopo
      // un errore di trasporto»: era esattamente il ritentativo a distruggere.
      const gia = voce.fatte.find((f) => f.chi === azione.chi)
      if (gia) {
        gia.fattaIl = new Date().toISOString()
        return
      }
      voce.fatte.push({ chi: azione.chi, fattaIl: new Date().toISOString() })
    })
  },

  /**
   * Spunta tutti quelli che mancano, o toglie le spunte nude.
   *
   * Ha preso il posto di «Chiudi comunque». Chiudere la consegna intera era
   * comodo e diceva una cosa falsa: che l'avessero fatta tutti. Qui il gesto è
   * lo stesso — un clic — ma quel che resta scritto è vero, e chi rilegge
   * l'elenco a marzo vede una spunta per nome invece di un interruttore.
   *
   * Le spunte con un documento raccolto non si tolgono: quel foglio è arrivato
   * davvero, e cancellarlo perché si è cambiato idea sull'elenco vorrebbe dire
   * perdere anche il file.
   */
  'consegna.spuntaTutti': (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const destinatari = destinatariConsegna(trovato.consegna, trovato.classe)

    return contesto.suVoce('consegne', azione.consegnaId, (consegna) => {
      if (!azione.fatta) {
        consegna.fatte = consegna.fatte.filter((f) => f.file)
        return
      }
      const quando = new Date().toISOString()
      const gia = new Set(consegna.fatte.map((f) => f.chi))
      for (const chi of destinatari) {
        if (!gia.has(chi)) consegna.fatte.push({ chi, fattaIl: quando })
      }
    })
  },

  /**
   * Spuntare portando il foglio.
   *
   * Il file si copia nella cartella dei dati e finisce dentro la spunta: chi
   * ha consegnato è chi ha portato il documento, e tenerli separati vorrebbe
   * dire due verità che si possono contraddire. Annullando la scelta del file
   * non si spunta niente — la consegna resta da fare, che è la risposta
   * giusta a «ci ho ripensato».
   */
  'consegna.raccogli': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    if (!deposito()) return rifiuta('Nessun anno scolastico aperto: i documenti si archiviano dentro un anno.')

    const allievo =
      azione.chi === CHI_INSEGNA ? null : classe.allievi.find((a) => a.id === azione.chi) ?? null
    if (azione.chi !== CHI_INSEGNA && !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))

    const scelto = await scegliUnFile({
      titolo: allievo
        ? `${consegna.testo} — ${nomeCompleto(allievo)}`
        : `${consegna.testo} — ${classe.nome}`,
      tasto: 'Raccogli',
    })
    if (!scelto) return fatto

    const nomeDestinazione = nomeFileArchivio(
      classe.nome,
      allievo ? nomeCompleto(allievo) : null,
      consegna.testo,
      allievo ? null : 'mio',
      scelto.estensione,
    )
    const esito = await archiviaCopia(
      percorsoConsegna(classe, nomeDestinazione, allievo ? nomeCompleto(allievo) : null),
      scelto.uri,
    )
    if ('errore' in esito) return rifiuta(`Copia non riuscita: ${esito.errore}`)

    // Due fatti, e si scrivono in due posti: il file fra i documenti della
    // consegna, la spunta fra le cose successe. Raccogliendo, la scansione
    // che arriva vale anche come prova che il foglio è stato portato — e
    // quindi spunta; ma la spunta resta togliibile senza portarsi via il file.
    const ora = new Date().toISOString()
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === azione.consegnaId)
      if (!bersaglio) return
      bersaglio.documenti = [
        ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== azione.chi),
        { allievoId: azione.chi, file: esito.relativo, nome: scelto.nome, aggiuntoIl: ora },
      ]
      if (!bersaglio.fatte.some((f) => f.chi === azione.chi)) {
        bersaglio.fatte.push({ chi: azione.chi, fattaIl: ora, modo: 'mano' })
      }
      bersaglio.aggiornataIl = ora
    }, ['consegne'])
  },

  /**
   * Il documento da dare a qualcuno, messo da parte.
   *
   * Si archivia come tutti gli altri, ma non spunta niente: avere la pagella
   * di Rossi non vuol dire avergliela data. La consegna è il gesto dopo — in
   * aula o per mail — e tenerli separati è l'unico modo perché la matrice
   * dica la verità su tutti e due.
   */
  'consegna.documento.allega': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    const allievo = azione.allievoId
      ? classe.allievi.find((a) => a.id === azione.allievoId) ?? null
      : null
    if (azione.allievoId && !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))

    const scelto = await scegliUnFile({
      titolo: allievo
        ? `${consegna.testo} — ${nomeCompleto(allievo)}`
        : `${consegna.testo} — lo stesso per tutti`,
      tasto: 'Allega',
    })
    if (!scelto) return fatto

    // Un nuovo documento allo stesso posto — «per tutti», o di questo allievo —
    // sostituisce quello che c'era: è chi ha ricevuto una versione migliore,
    // non chi ne vuole due copie.
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
          allievo ? null : 'per tutti',
          scelto.estensione,
        ),
      ),
      scelto.uri,
      sostituibile,
    )
    if ('errore' in esito) return rifiuta(`Copia non riuscita: ${esito.errore}`)

    const ora = new Date().toISOString()
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      if (allievo) {
        bersaglio.documenti = [
          ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== allievo.id),
          { allievoId: allievo.id, file: esito.relativo, nome: scelto.nome, aggiuntoIl: ora },
        ]
      } else {
        bersaglio.fileTutti = esito.relativo
        bersaglio.nomeTutti = scelto.nome
      }
      bersaglio.aggiornataIl = ora
    }, ['consegne'])
  },

  'consegna.documento.apri': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta('Consegna non trovata.')
    const documento = azione.allievoId
      ? documentoPer(consegna, azione.allievoId)
      : consegna.fileTutti
        ? { file: consegna.fileTutti, nome: consegna.nomeTutti ?? '' }
        : null
    if (!documento) return rifiuta('Non c’è nessun documento pronto da aprire.')
    return apriFile(documento.file, documento.nome || consegna.testo)
  },

  'consegna.documento.togli': async (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta('Consegna non trovata.')
    const percorso = azione.allievoId
      ? (consegna.documenti ?? []).find((d) => d.allievoId === azione.allievoId)?.file
      : consegna.fileTutti
    if (!percorso) return rifiuta('Non c’è nessun documento da togliere.')

    await cestina(percorso)
    return contesto.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      if (azione.allievoId) {
        bersaglio.documenti = (bersaglio.documenti ?? []).filter(
          (d) => d.allievoId !== azione.allievoId,
        )
      } else {
        bersaglio.fileTutti = undefined
        bersaglio.nomeTutti = undefined
      }
      bersaglio.aggiornataIl = new Date().toISOString()
    }, ['consegne'])
  },

  /**
   * Consegnato a mano. È il gesto che si fa fra i banchi, uno dopo l'altro, e
   * di un foglio dato in aula non resta altro che questa spunta.
   */
  'consegna.consegnato': (contesto, azione) => {
    const consegna = contesto.registro.consegne.find((c) => c.id === azione.consegnaId)
    if (!consegna) return rifiuta('Consegna non trovata.')
    const documento = documentoPer(consegna, azione.allievoId)
    const ora = new Date().toISOString()

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
   * La distribuzione per mail: un messaggio a testa, col documento in
   * allegato.
   *
   * Uno per allievo e non una mail sola in copia nascosta: il documento è
   * suo, e allegarne venticinque a un unico messaggio vorrebbe dire dare a
   * ogni famiglia la pagella di tutte le altre. Si segna spedito solo quel
   * che è partito davvero, e chi non ha un indirizzo viene detto per nome.
   */
  'consegna.distribuisci': async (contesto, azione) => {
    const trovato = consegnaConClasse(contesto.registro, azione.consegnaId)
    if ('errore' in trovato) return trovato.errore
    const { consegna, classe } = trovato
    if (!siConsegna(consegna)) return rifiuta('Questa richiesta si raccoglie, non si consegna.')

    const scelti = azione.allieviIds && azione.allieviIds.length > 0
      ? azione.allieviIds
      : daConsegnareA(consegna, classe)
    if (scelti.length === 0) return rifiuta('Non c’è niente da spedire.')

    // Non si aprono a una a una: aprire venticinque finestre di posta insieme
    // non è una comodità. Finiscono fra le bozze della casella — o, senza
    // Outlook, in file dentro la cartella della classe.
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
        falliti.push(`${nomeCompleto(allievo)}: nessun documento pronto`)
        continue
      }

      const indirizzi = [
        consegna.mailAllievo === false ? '' : allievo.email ?? '',
        consegna.mailTutore === false ? '' : allievo.emailTutore ?? '',
      ].filter((indirizzo) => indirizzo.trim())
      if (indirizzi.length === 0) {
        falliti.push(`${nomeCompleto(allievo)}: nessun indirizzo`)
        continue
      }

      const contenuto = await contenutoDi(documento.file)
      if (!contenuto) {
        falliti.push(`${nomeCompleto(allievo)}: documento non più nell’anno`)
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
            consegna.corpoMail || CORPO_CONSEGNA,
            nomeCompleto(allievo),
            classe.nome,
            consegna.testo,
          ),
          ccn: [],
          a: indirizzi,
          firma: await firmaPosta(),
          allegati: [
          // Con il nome del file archiviato, non con l'etichetta del documento:
          // è il nome che il registro ha scelto — classe, cosa, allievo — ed è
          // quello con cui la famiglia lo ritrova.
            {
              nome: basename(documento.file),
              tipo: tipoMime(documento.file),
              contenuto: Buffer.from(contenuto).toString('base64'),
            },
          ],
        },
        // La scadenza quando c'è, il giorno in cui si scrive quando non c'è:
        // la stessa pagella rimandata al secondo semestre è un altro giro, e
        // senza una data nel nome il file nuovo prende il posto del vecchio.
        nome: nomeBozza(
          classe.nome,
          nomeCompleto(allievo),
          consegna.testo,
          periodoNelNome(consegna.scadenza || oggi()),
        ),
      })
      // Niente si segna adesso: una bozza non è un documento consegnato, e la
      // consegna è la cosa che poi si guarda per sapere chi ha ricevuto la
      // pagella.
      pronte.push({ allievoId, indirizzi, file: documento.file, nome: documento.nome })
    }

    if (pronte.length === 0) {
      return riassumiInvii(0, falliti, ['documento spedito', 'documenti spediti'])
    }

    // Con l'invio diretto si domanda prima di far partire: dopo, un documento
    // mandato alla famiglia sbagliata non si riprende.
    if (
      (await puoSpedire()) &&
      !(await confermaInvio(
        `Spedire «${consegna.testo}» a ${quanti(pronte.length, PIF)}?`,
        `Una e-mail per ${PIF.singolare}, con il suo documento in allegato.`,
      ))
    ) {
      return conMessaggio(
        'Non è partito niente: i documenti restano da mandare.',
        'info',
        { invariato: true },
      )
    }

    const scritte = await bozzeDiGruppo(daScrivere, classe.nome)
    if (!scritte.ok) return rifiuta(scritte.errore ?? 'Le bozze non si sono potute preparare.')

    // `daScrivere` e `pronte` crescono insieme nello stesso giro: l'indice che
    // Outlook rimanda indietro è la stessa persona in tutti e due.
    const nonPartiti = new Map(scritte.falliti.map((f) => [f.indice, f.errore]))

    // Le bozze sono pronte e nessuna è partita: la consegna si segna con la
    // spunta nella casella di chi la deve, quando il suo documento è andato. Il
    // registro non domanda «le hai spedite tutte?» — nel momento in cui lo
    // chiedeva, nessuna lo era ancora.
    if (!scritte.spediti) {
      return conMessaggio(
        `${pronte.length} bozze pronte in ${scritte.dove}. Mandale una alla volta dal programma ` +
          `di posta e spunta ogni ${PIF.singolare} quando il suo documento è partito.`,
        'info',
        { invariato: true },
      )
    }

    // Solo chi l'ha ricevuto davvero: la consegna è la cosa che poi si guarda
    // per sapere chi ha avuto la pagella, e segnarci dentro un invio che non è
    // partito vorrebbe dire perdere proprio quello da rifare.
    const partiti = pronte.filter((_, indice) => !nonPartiti.has(indice))
    for (const [indice, { allievoId }] of pronte.entries()) {
      const guasto = nonPartiti.get(indice)
      if (!guasto) continue
      const allievo = classe.allievi.find((a) => a.id === allievoId)
      falliti.push(`${allievo ? nomeCompleto(allievo) : allievoId}: ${guasto}`)
    }

    const ora = new Date().toISOString()
    contesto.archivio.modifica((r) => {
      const bersaglio = r.consegne.find((c) => c.id === consegna.id)
      if (!bersaglio) return
      for (const { allievoId, indirizzi, file, nome } of partiti) {
        bersaglio.fatte = bersaglio.fatte.filter((f) => f.chi !== allievoId)
        bersaglio.fatte.push({
          chi: allievoId,
          fattaIl: ora,
          modo: 'email',
          destinatari: indirizzi,
          file,
          nome,
        })
      }
      bersaglio.aggiornataIl = ora
    }, ['consegne'])
    partite = partiti.length

    return riassumiInvii(partite, falliti, ['documento spedito', 'documenti spediti'])
  },
} satisfies Parte
