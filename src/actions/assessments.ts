// I momenti di valutazione, i voti e le prove corrette.
//
// I PDF delle prove seguono il momento: si archiviano in una cartella col suo
// id, e un momento eliminato se li porta nel cestino del sistema.

import { deposito } from '../data/store.js'
import { archiviaCopia, nomeFileArchivio, percorsoValutazione } from '../data/filing.js'
import { arrotondaVoto, nomeCompleto, votoValido } from '../domain/calculations.js'
import { creaValutazione } from '../domain/factories.js'
import { classeDelMomento, corsoPerId } from '../domain/courses.js'
import { agganciato } from '../domain/orphans.js'
import { nuovoIdAllegato } from '../domain/identifiers.js'
import type { Allegato, RuoloAllegato } from '../domain/models.js'
import { PIF, RUOLI_ALLEGATO, frase, il } from '../domain/lexicon.js'
import { validaValutazione } from '../domain/validation.js'
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

/** Come si chiama il foglio che si sta cercando, nel dialogo che lo chiede. */
const TITOLI_ALLEGATO: Readonly<Record<RuoloAllegato, string>> = RUOLI_ALLEGATO

export const valutazioni = {
  /**
   * Il momento di valutazione di una tappa del piano.
   *
   * Quel che la scaletta prevedeva diventa il foglio su cui si mettono i
   * voti, dentro la lezione in cui la prova si è fatta. Se per quella tappa
   * il momento c'è già non se ne fa un altro: si torna quello, e chi ha
   * cliccato due volte si ritrova dove voleva essere.
   */
  'valutazione.daAttivita': (contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiuta('Lezione non trovata.')
    const piano = contesto.registro.piani.find((p) => p.id === lezione.pianoId)
    const attivita = piano?.attivita.find((a) => a.id === azione.attivitaId)
    if (!piano || !attivita) return rifiuta('Quella tappa non c’è più nel piano.')

    const gia = contesto.registro.valutazioni.find(
      (v) => v.lezioneId === lezione.id && v.attivitaId === attivita.id,
    )
    if (gia) return { ok: true, creato: { id: gia.id } }

    const prevista = attivita.valutazione ?? null
    const momento = creaValutazione(
      lezione.corsoId,
      prevista?.titolo || attivita.titolo || 'Verifica',
      contesto.registro.impostazioni.scala,
      lezione.data,
    )
    momento.lezioneId = lezione.id
    momento.pianoId = piano.id
    momento.attivitaId = attivita.id
    if (prevista) {
      momento.tipo = prevista.tipo
      momento.peso = prevista.peso
    }

    contesto.archivio.modifica((r) => {
      r.valutazioni.push(momento)
    }, ['valutazioni'])
    return { ok: true, creato: { id: momento.id } }
  },

  'valutazione.salva': (contesto, azione) => {
    const esito = validaValutazione(azione.valutazione)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const nuova = !contesto.registro.valutazioni.some((v) => v.id === azione.valutazione.id)
    const momento = { ...azione.valutazione, aggiornatoIl: new Date().toISOString() }
    contesto.modifica((r) => {
      riponi(r.valutazioni, momento, (a, b) => a.data.localeCompare(b.data))
    }, ['valutazioni'])
    return nuova ? { ok: true, creato: { id: momento.id } } : fatto
  },

  // Via il momento, via anche i suoi PDF: file orfani in una cartella che
  // nessuno guarda sono il modo migliore per non ritrovarli mai più. È quel
  // che il pannello ha promesso nella domanda di conferma.
  'valutazione.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'valutazione', id: azione.valutazioneId })
  },

  /**
   * Butta via i momenti che nessuna tappa del piano ha fatto nascere.
   *
   * Uno per uno e non tutti insieme: ognuno si porta dietro i suoi PDF, e la
   * strada che li mette nel cestino e gia scritta dentro `elimina`. Si passa
   * dagli id e non da «tutti gli sganciati» perché fra il momento in cui il
   * pannello ha fatto l'elenco e il momento in cui si conferma il registro può
   * essere cambiato — e quel che si cancella deve essere quel che si è visto.
   *
   * Quel che non è più sganciato quando l'azione arriva si salta in silenzio:
   * non è un errore, è la cosa che si voleva.
   */
  'valutazione.eliminaOrfane': async (contesto, azione) => {
    const ids = new Set(azione.ids)
    if (ids.size === 0) return rifiuta('Nessun momento da eliminare.')

    let tolti = 0
    let voti = 0
    for (const id of ids) {
      const momento = contesto.registro.valutazioni.find((v) => v.id === id)
      if (!momento || agganciato(contesto.registro, momento)) continue
      voti += momento.voti.filter((v) => v.valore !== null).length
      const esito = await contesto.elimina({ genere: 'valutazione', id })
      if (esito.ok) tolti += 1
    }

    if (tolti === 0) {
      return conMessaggio('Nessuno di quei momenti era ancora sganciato.', 'info')
    }
    return conMessaggio(
      `${tolti === 1 ? 'Un momento sganciato eliminato' : `${tolti} momenti sganciati eliminati`}` +
        `${voti > 0 ? `, con ${voti} ${voti === 1 ? 'voto' : 'voti'}` : ''}.`,
      'info',
    )
  },

  'voto.imposta': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta('Momento di valutazione non trovato.')
    if (azione.valore !== null && !votoValido(azione.valore, momento.scala)) {
      return rifiuta(`Voto fuori dalla scala ${momento.scala.min}–${momento.scala.max}.`)
    }
    // Il voto entra sul passo della scala: con i quarti di punto un 4.3
    // digitato di fretta diventa 4.25, non un valore che la scala non prevede.
    const valore = azione.valore === null ? null : arrotondaVoto(azione.valore, momento.scala)
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      const voto = bersaglio.voti.find((v) => v.allievoId === azione.allievoId)
      if (voto) {
        voto.valore = valore
        voto.assente = azione.assente
        if (azione.nota !== undefined) voto.nota = azione.nota
      } else {
        bersaglio.voti.push({
          allievoId: azione.allievoId,
          valore,
          assente: azione.assente,
          nota: azione.nota,
        })
      }
    })
  },

  /**
   * Riconsegna la prova a tutta la classe in un colpo: una data su ogni riga.
   *
   * Non c'è una data della prova, e non è una semplificazione mancata: quella
   * diceva «la classe l'ha riavuta» anche di chi quel giorno mancava, e proprio
   * quei due o tre fogli restavano nella cartella fino a giugno perché
   * risultavano già consegnati. Qui la scorciatoia resta — ridistribuire la
   * pila è un gesto solo — ma scrive quel che è vero: venti riconsegne, una per
   * allievo, tutte dello stesso giorno.
   *
   * Chi ha già la sua data la tiene: è stata scritta guardando quel nome, e una
   * riconsegna di gruppo non la sa smentire.
   *
   * `il: null` toglie la data a tutti e rimette la prova fra quelle da
   * riconsegnare: serve quando si è spuntata la riga sbagliata, che con due
   * prove nello stesso giorno capita.
   */
  'valutazione.riconsegna': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta('Momento di valutazione non trovato.')
    // Una prova non ancora svolta non si può riconsegnare: la data è quella
    // del registro, e una riconsegna anticipata sarebbe un dato che si
    // contraddice da solo.
    if (azione.il !== null && momento.data > azione.il) {
      return rifiuta('La prova non si è ancora svolta: non c’è niente da riconsegnare.')
    }
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      for (const voto of bersaglio.voti) {
        // Solo chi ha un foglio da riavere: una casella vuota non è una prova
        // corretta, e un assente non ne ha una — il suo debito è il recupero,
        // con la sua riconsegna.
        if (voto.assente || voto.valore === null) continue
        if (azione.il === null) voto.riconsegnataIl = null
        else if (!voto.riconsegnataIl) voto.riconsegnataIl = azione.il
      }
    })
  },

  /**
   * Promuove il recupero di una prova per un allievo che non c'era.
   *
   * L'assenza da sola non basta a far esistere un recupero: fissarne la data —
   * o dichiarare che non si rifà — è il gesto che lo mette in agenda, ed è
   * l'unico modo in cui una casella vuota smette di essere dimenticata.
   *
   * Scrive due cose. La riga nella tabella dei recuperi del momento, che è
   * dove il recupero vive; e, se la casella non è mai stata toccata, il voto
   * segnato assente — è quel che l'appello di quell'ora dice già, e fissare il
   * recupero è il momento in cui lo si mette per iscritto anche nella griglia.
   *
   * Il voto del recupero invece non passa di qui: si scrive nella casella di
   * sempre, perché è il voto di quella prova. È per averlo che il recupero si
   * fa, ed è quel che chiude la riga.
   */
  'recupero.imposta': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta('Momento di valutazione non trovato.')
    if (azione.previstoIl && azione.previstoIl < momento.data) {
      return rifiuta('Il recupero non può essere prima della prova che recupera.')
    }

    const prima = (momento.recuperi ?? []).find((r) => r.allievoId === azione.allievoId) ?? null
    // Assente vuol dire «lascia com'era»: chi sposta il giorno del recupero non
    // sta dicendo niente sulla riconsegna, e cancellargliela di rimbalzo
    // sarebbe una data persa senza che nessuno l'abbia tolta.
    const riconsegnataIl =
      azione.riconsegnataIl === undefined ? prima?.riconsegnataIl ?? null : azione.riconsegnataIl
    const rifattaIl = azione.previstoIl ?? prima?.previstoIl ?? null
    // Riconsegnata prima di essere rifatta: è un dato che si contraddice da
    // solo, come per la prova della classe.
    if (riconsegnataIl && rifattaIl && riconsegnataIl < rifattaIl) {
      return rifiuta('La prova di recupero non si può riconsegnare prima di averla rifatta.')
    }

    const adesso = new Date().toISOString()
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      if (!bersaglio.voti.some((v) => v.allievoId === azione.allievoId)) {
        bersaglio.voti.push({ allievoId: azione.allievoId, valore: null, assente: true })
      }

      const righe = (bersaglio.recuperi ?? []).filter((r) => r.allievoId !== azione.allievoId)
      const nota = azione.nota || undefined
      const dispensato = azione.dispensato === true

      // Niente data, nessuna nota, nessuna rinuncia: la riga sparisce e il
      // recupero torna «da fissare». È così che si disdice un giorno senza
      // dover dichiarare che la prova non si recupera, che è un'altra cosa.
      if (azione.previstoIl || nota || dispensato || riconsegnataIl) {
        righe.push({
          allievoId: azione.allievoId,
          previstoIl: dispensato ? null : azione.previstoIl,
          // Chi dichiara che la prova non si recupera non ha niente da
          // riconsegnare: la data che c'era descriveva un foglio che non
          // esiste più.
          riconsegnataIl: dispensato ? null : riconsegnataIl,
          nota,
          dispensato: dispensato || undefined,
          aggiornatoIl: adesso,
        })
      }

      bersaglio.recuperi = righe
    })
  },

  /**
   * Il giorno in cui un allievo ha riavuto la sua prova corretta.
   *
   * Vale sopra quello della classe: la pila è tornata indietro un giorno solo,
   * ma chi mancava la riavrà un'altra volta — e sono i casi in cui la data
   * conta, perché è la sola prova che quella persona ha visto il proprio voto.
   * `null` la toglie, e allora torna a valere quella della classe.
   */
  'voto.riconsegna': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta('Momento di valutazione non trovato.')
    // Riconsegnata prima di essere svolta: un dato che si contraddice da solo,
    // come per la riconsegna di classe.
    if (azione.il !== null && momento.data > azione.il) {
      return rifiuta('La prova non si è ancora svolta: non c’è niente da riconsegnare.')
    }

    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      const voto = bersaglio.voti.find((v) => v.allievoId === azione.allievoId)
      // Nessuna casella vuol dire nessun foglio: non si inventa un voto per
      // poterlo riconsegnare.
      if (voto) voto.riconsegnataIl = azione.il
    })
  },

  'allegato.aggiungi': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta('Momento di valutazione non trovato.')
    if (!deposito()) return rifiuta('Nessun anno scolastico aperto: i documenti si archiviano dentro un anno.')

    // La prova corretta è sempre di qualcuno; il recupero può essere di uno
    // — il suo compito rifatto — oppure di nessuno, e allora è il testo della
    // prova di recupero, che è uno per tutti quelli che la rifanno.
    const perAllievo = azione.ruolo === 'prova' || azione.ruolo === 'recupero'
    const allievoId = perAllievo ? azione.allievoId ?? null : null
    if (azione.ruolo === 'prova' && !allievoId) {
      return rifiuta(`Serve ${il(PIF)} a cui appartiene la prova.`)
    }
    // Senza classe non c'è dove archiviare il PDF: si rifiuta prima di aprire
    // il dialogo, non dopo che chi insegna ha già scelto il file.
    const classe = classeDelMomento(contesto.registro, momento)
    if (!classe) return rifiuta('La classe del momento di valutazione non esiste.')
    const allievo = allievoId ? classe.allievi.find((a) => a.id === allievoId) ?? null : null
    if (allievoId && !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true, coda: 'nella classe' }))

    const scelto = await scegliUnFile({
      titolo: allievo
        ? `${azione.ruolo === 'recupero' ? 'Recupero' : 'Prova'} di ${nomeCompleto(allievo)}`
        : `${TITOLI_ALLEGATO[azione.ruolo]} — ${momento.titolo}`,
      tasto: 'Allega',
      filtri: { PDF: ['pdf'] },
    })
    // Dialogo chiuso senza scegliere: non è un errore, non si dice niente.
    if (!scelto) return fatto
    // Il dialogo può essere rimasto aperto a lungo: se intanto si è aperto un
    // altro anno, la prova di una persona finirebbe dentro quello.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const nomeDestinazione = nomeFileArchivio(
      classe.nome,
      allievo ? nomeCompleto(allievo) : null,
      momento.titolo,
      // Il nome del file dice di che foglio si tratta: la prova e il suo
      // recupero stanno nella stessa cartella, e due PDF con lo stesso nome
      // si distinguerebbero solo dalla data di copia.
      allievo && azione.ruolo !== 'recupero' ? 'prova' : azione.ruolo,
      '.pdf',
    )
    // Un allegato dello stesso ruolo (e dello stesso allievo, se è una prova)
    // sostituisce quello che c'era: il PDF nuovo prende il suo posto invece
    // di accumularsi accanto.
    const vecchio = momento.allegati.find(
      (a) => a.ruolo === azione.ruolo && a.allievoId === allievoId,
    )?.file ?? null
    // Copia, non riferimento: il PDF scelto può stare in Download e sparire.
    const esito = await archiviaCopia(
      percorsoValutazione(
        classe,
        corsoPerId(contesto.registro, momento.corsoId),
        nomeDestinazione,
        allievo ? nomeCompleto(allievo) : null,
      ),
      scelto.uri,
      vecchio,
    )
    if ('errore' in esito) return rifiuta(`Copia non riuscita: ${esito.errore}`)

    const allegato: Allegato = {
      id: nuovoIdAllegato(),
      ruolo: azione.ruolo,
      allievoId,
      nome: scelto.nome,
      file: esito.relativo,
      aggiuntoIl: new Date().toISOString(),
    }
    // Da `contesto.modifica` e non dall'archivio: è lei che rifiuta se il
    // documento è cambiato durante la copia, e che dice «non trovato» invece di
    // «fatto» se il momento è sparito mentre si sceglieva il file.
    const scritto = contesto.modifica((r) => {
      const bersaglio = r.valutazioni.find((v) => v.id === azione.valutazioneId)
      if (!bersaglio) return false
      // Uno solo per ruolo (e per allievo, se è una prova): il PDF nuovo ha
      // già sovrascritto il file, la voce vecchia non deve restare.
      bersaglio.allegati = bersaglio.allegati.filter(
        (a) => !(a.ruolo === allegato.ruolo && a.allievoId === allegato.allievoId),
      )
      bersaglio.allegati.push(allegato)
      bersaglio.aggiornatoIl = allegato.aggiuntoIl
    }, ['valutazioni'], 'Momento di valutazione non trovato: forse è già sparito.')
    if (!scritto.ok) return scritto
    // Il PDF di prima sotto un altro nome — il momento o la persona rinominati
    // nel frattempo — non l'ha coperto nessuno: nel cestino, o resterebbe lì
    // senza una voce che lo nomini.
    if (vecchio && vecchio !== esito.relativo) await cestina(vecchio)
    return { ok: true, creato: { id: allegato.id } }
  },

  // Il PDF si apre con il visualizzatore del sistema: il registro non ne ha uno.
  'allegato.apri': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    const allegato = momento?.allegati.find((a) => a.id === azione.allegatoId)
    if (!allegato) return rifiuta('Allegato non trovato.')
    return apriFile(allegato.file, allegato.nome)
  },

  'allegato.elimina': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    const allegato = momento?.allegati.find((a) => a.id === azione.allegatoId)
    if (!allegato) return rifiuta('Allegato non trovato.')
    await cestina(allegato.file)
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      bersaglio.allegati = bersaglio.allegati.filter((a) => a.id !== azione.allegatoId)
    })
  },
} satisfies Parte
