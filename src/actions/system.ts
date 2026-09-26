// Quel che non appartiene a nessuna area in particolare: le impostazioni, le
// esportazioni, le riparazioni e i comandi che parlano con il sistema.

import * as apparato from 'apparato'

import { collocazioneDi, percorsoDi } from '../domain/locations.js'
import { csvPresenze, csvValutazioni, scriviGenerato, testoLezione } from '../data/exports.js'
import { percorsoPacchetto } from '../data/paths.js'
import { dialogoPercorso, impostazioneDichiarata, valoreConMotivo } from '../environment/settings.js'
import { collegaAccount, inviaProva, provaCollegamento, scollegaAccount } from '../data/mail.js'
import { firmaPosta } from '../data/templates.js'
import { classeDelCorsoId, classeDellaLezione } from '../domain/courses.js'
import { matriceDelCorsoNelPeriodo } from '../domain/courseMatrix.js'
import { oreConAppello } from '../domain/calculations.js'
import { numeroComponibile } from '../domain/phones.js'
import {
  composizioneOutlookWeb,
  indirizzoChiamata,
  indirizzoMailto,
  indirizzoScrivibile,
  modoChiamata,
  modoPosta,
} from '../domain/contacts.js'
import { apriConOutlook } from '../data/outlook.js'
import { etichettaSemestre, nelSemestre, oraValida } from '../domain/dates.js'
import type { Registro } from '../domain/models.js'
import type { ImpostazioniDaSalvare } from '../protocol.js'
import { riparazioni } from '../domain/repairs.js'
import { conCarteComplete, normalizzaImpostazioni } from '../domain/normalization.js'
import { validaMinutiUd, validaPause, validaScala } from '../domain/validation.js'
import { slotFuoriDallePause, slotSuAltraUd } from '../domain/breaks.js'
import { cestina, conMessaggio, fatto, lanciaComando, rifiuta, rifiutaCon, type Parte } from './context.js'
import { parole } from '../domain/words.testi.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './system.testi.js'

/** Dove va il CSV di un corso: accanto al PDF, con lo stesso nome (lo decide il dominio). */
function percorsoCsv (
  registro: Registro,
  genere: 'presenze' | 'valutazioni',
  corsoId: string,
  semestreId: string | null,
): string {
  const dove = collocazioneDi(registro, genere, corsoId, { semestreId })
  return dove ? percorsoDi(dove, 'csv') : ''
}

/** Un'impostazione dei recapiti: con che cosa si chiama, con che cosa si scrive. */
function scelta (chiave: 'telefono' | 'posta'): string | undefined {
  return apparato.impostazioni.leggi('registroDocenti.recapiti').get<string>(chiave)
}

/**
 * Gli errori delle impostazioni del documento; vuoto vuol dire salvabile. Si
 * rifiuta con il motivo invece di raddrizzare in silenzio come fa
 * `normalizzaImpostazioni` sul file riletto. La giornata rovesciata si rifiuta
 * solo se la rovescia questo salvataggio; l'UD è bloccata se un'ora ha
 * l'appello (`oreConAppello`).
 */
function erroriImpostazioni (nuove: ImpostazioniDaSalvare, registro: Registro): string[] {
  const t = testi()
  const attuali = registro.impostazioni
  const errori = [...validaScala(nuove.scala ?? {}).errori]
  const udValida = validaMinutiUd(nuove.minutiUd)
  errori.push(...udValida.errori)
  if (udValida.valido && nuove.minutiUd !== attuali.minutiUd) {
    const conAppello = oreConAppello(registro.lezioni)
    if (conAppello > 0) errori.push(t.udBloccata(attuali.minutiUd, conAppello))
  }
  const inizio = nuove.oraInizioGiornata
  const fine = nuove.oraFineGiornata
  if (!oraValida(inizio)) errori.push(t.primaOraNonValida)
  if (!oraValida(fine)) errori.push(t.ultimaOraNonValida)
  const cambiata = inizio !== attuali.oraInizioGiornata || fine !== attuali.oraFineGiornata
  if (oraValida(inizio) && oraValida(fine) && inizio >= fine && cambiata) {
    errori.push(t.giornataRovescia)
  }
  const giorni = Array.isArray(nuove.giorniVisibili) ? nuove.giorniVisibili : []
  if (giorni.length === 0) errori.push(t.almenoUnGiorno)
  if (giorni.some((g) => !Number.isInteger(g) || g < 1 || g > 7)) errori.push(t.giorniFuori)
  // Le pause si rifiutano intere, con il motivo.
  if (nuove.pause && udValida.valido) {
    errori.push(...validaPause(nuove.pause, nuove.minutiUd).errori)
  }
  return errori
}


/** Riuscita che non cambia il registro. */
const fuori = { ok: true, invariato: true } as const

export const sistema = {
  'impostazioni.salva': async (contesto, azione) => {
    const errori = erroriImpostazioni(azione.impostazioni, contesto.registro)
    if (errori.length > 0) return rifiuta(...errori)
    // I loghi delle carte tolte si cestinano dopo, solo a scrittura riuscita.
    const prima = contesto.registro.impostazioni.intestazione.carte
    const restano = new Set(azione.impostazioni.intestazione?.carte.map((c) => c.id) ?? prima.map((c) => c.id))
    // Non è orfano un logo che una carta rimasta nomina ancora.
    const vivi = new Set(
      prima.filter((c) => restano.has(c.id) && c.logo).map((c) => c.logo as string),
    )
    const orfani = prima
      .filter((c) => !restano.has(c.id) && c.logo && !vivi.has(c.logo))
      .map((c) => c.logo as string)
    let ridisposte = 0
    let rimaste = 0
    const esito = contesto.modifica((r) => {
      // Loghi e `vecchiaCartellaVista` restano quelli del documento (vedi
      // `ImpostazioniDaSalvare`); poi ogni corso finisce su una carta.
      const attuale = r.impostazioni.intestazione
      const loghi = new Map(attuale.carte.map((c) => [c.id, c.logo]))
      const nuova = azione.impostazioni.intestazione
      const primaDellePause = r.impostazioni.pause
      const vecchiaUd = r.impostazioni.minutiUd
      r.impostazioni = conCarteComplete(normalizzaImpostazioni({
        ...azione.impostazioni,
        intestazione: nuova
          ? {
              ...nuova,
              carte: nuova.carte.map((c) => ({ ...c, logo: loghi.get(c.id) })),
              vecchiaCartellaVista: attuale.vecchiaCartellaVista,
            }
          : attuale,
      }), r.corsi)
      const giornata = r.impostazioni
      // UD cambiata (solo senza appelli): orari, durata proposta e lezioni
      // tengono il numero di UD. Un'ora che uscirebbe dal giorno resta e lo si dice.
      if (giornata.minutiUd !== vecchiaUd) {
        const inUd = (minuti: number) =>
          Math.max(1, Math.round(minuti / vecchiaUd)) * giornata.minutiUd
        giornata.durataSlotPredefinita = inUd(azione.impostazioni.durataSlotPredefinita)
        for (const corso of r.corsi) {
          for (const fascia of corso.orario) fascia.durataMin = inUd(fascia.durataMin)
        }
        for (const lezione of r.lezioni) {
          const nuove = slotSuAltraUd(lezione.slot, vecchiaUd, giornata)
          if (nuove) lezione.slot = nuove
          else rimaste += 1
        }
      } else if (JSON.stringify(primaDellePause) !== JSON.stringify(giornata.pause)) {
        // Pause cambiate: le ore che ci cadono sopra si ridispongono subito.
        for (const lezione of r.lezioni) {
          const fuori = slotFuoriDallePause(lezione.slot, giornata)
          if (fuori === lezione.slot) continue
          lezione.slot = fuori
          ridisposte += 1
        }
      }
    }, ['registro', 'corsi', 'lezioni'])
    if (esito.ok) {
      for (const logo of orfani) await cestina(logo)
    }
    if (esito.ok && rimaste > 0) return conMessaggio(testi().rimaste(rimaste), 'avviso', esito)
    if (!esito.ok || ridisposte === 0) return esito
    return conMessaggio(testi().ridisposte(ridisposte), 'info', esito)
  },

  /**
   * Un'impostazione del programma dalla pagina Impostazioni. Ripassa dalla
   * dogana (`valoreConMotivo`); `update` fa scattare l'avviso a chi deve ricaricare.
   */
  'programma.salva': async (_contesto, azione) => {
    const { valore, motivo } = valoreConMotivo(azione.chiave, azione.valore)
    if (valore === undefined) return rifiuta(motivo ?? testi().nonRiconosciuta(azione.chiave))
    await apparato.impostazioni
      .leggi()
      .update(azione.chiave, valore, apparato.AmbitoImpostazione.Global)
    return fatto
  },

  /** Il percorso di una voce scelto con il dialogo del sistema, poi passato dalla dogana. */
  'programma.sfoglia': async (_contesto, azione) => {
    const dialogo = dialogoPercorso(azione.chiave)
    if (!dialogo) return rifiuta(testi().senzaPercorso(azione.chiave))
    const scelti = await apparato.dialoghi.chiediFile({
      title: dialogo.titolo,
      openLabel: parole().scegliConferma,
      canSelectFolders: dialogo.cartella,
      canSelectFiles: !dialogo.cartella,
      filters: dialogo.filtri,
      ...(dialogo.da ? { defaultUri: apparato.Uri.file(dialogo.da) } : {}),
    })
    const scelto = scelti?.[0]?.fsPath
    if (!scelto) return fatto
    const { valore, motivo } = valoreConMotivo(azione.chiave, scelto)
    if (valore === undefined) return rifiuta(motivo ?? testi().percorsoRifiutato)
    await apparato.impostazioni
      .leggi()
      .update(azione.chiave, valore, apparato.AmbitoImpostazione.Global)
    return fatto
  },

  /** Ritira il valore scritto: da lì vale il predefinito del manifesto. */
  'programma.azzera': async (_contesto, azione) => {
    if (!impostazioneDichiarata(azione.chiave)) {
      return rifiuta(testi().nonRiconosciuta(azione.chiave))
    }
    await apparato.impostazioni
      .leggi()
      .update(azione.chiave, undefined, apparato.AmbitoImpostazione.Global)
    return fatto
  },

  'esporta.valutazioni': async (contesto, azione) => {
    const corso = contesto.registro.corsi.find((c) => c.id === azione.corsoId)
    if (!corso) return rifiuta(comuni().nonTrovato.corso)
    const classe = classeDelCorsoId(contesto.registro, corso.id)
    if (!classe) return rifiuta(testi().corsoSenzaClasse)
    const anno = contesto.registro.anni.find((a) => a.id === classe.annoId)
    const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
    // Il semestre di un momento è quello in cui cade la sua data.
    const momenti = contesto.registro.valutazioni
      .filter((v) => v.corsoId === corso.id)
      .filter((v) => nelSemestre(semestre, v.data))
    if (momenti.length === 0) return rifiuta(testi().nessunMomento)
    const periodo = etichettaSemestre(semestre)
    const contenuto = csvValutazioni(classe, corso, momenti, periodo)
    const file = await scriviGenerato(
      percorsoCsv(contesto.registro, 'valutazioni', corso.id, azione.semestreId),
      contenuto,
    )
    // null: la scrittura non è riuscita.
    if (!file) return rifiuta(testi().nonScritto)
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'esporta.presenze': async (contesto, azione) => {
    const corso = contesto.registro.corsi.find((c) => c.id === azione.corsoId)
    if (!corso) return rifiuta(comuni().nonTrovato.corso)
    const classe = classeDelCorsoId(contesto.registro, corso.id)
    if (!classe) return rifiuta(testi().corsoSenzaClasse)
    const anno = contesto.registro.anni.find((a) => a.id === classe.annoId)
    const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
    // La stessa matrice del PDF, perché i due conteggi coincidano.
    const { matrice } = matriceDelCorsoNelPeriodo(contesto.registro, corso, semestre)
    const contenuto = csvPresenze(classe, matrice, etichettaSemestre(semestre))
    const file = await scriviGenerato(
      percorsoCsv(contesto.registro, 'presenze', corso.id, azione.semestreId),
      contenuto,
    )
    // null: la scrittura non è riuscita.
    if (!file) return rifiuta(testi().nonScritto)
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'esporta.lezione': async (contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiuta(comuni().nonTrovato.lezione)
    const classe = classeDellaLezione(contesto.registro, lezione)
    const piano = contesto.registro.piani.find((p) => p.id === lezione.pianoId) ?? null
    // Le consegne date in quest'ora, che il verbale stampa.
    const date = contesto.registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
    const { minutiUd } = contesto.registro.impostazioni
    const contenuto = testoLezione(lezione, classe, piano, minutiUd, date)
    // Accanto al verbale in PDF, con lo stesso nome.
    const dove = collocazioneDi(contesto.registro, 'lezione', lezione.id)
    if (!dove) return rifiuta(comuni().nonTrovato.lezione)
    const file = await scriviGenerato(percorsoDi(dove, 'md'), contenuto)
    // null: la scrittura non è riuscita.
    if (!file) return rifiuta(testi().nonScritto)
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'manutenzione.ripara': (contesto, _azione) => {
    const correzioni = riparazioni(contesto.registro)
    if (correzioni.length === 0) return conMessaggio(testi().nienteDaRiparare, 'info')
    const collezioni = [...new Set(correzioni.flatMap((c) => c.collezioni))]
    // Una modifica sola: le correzioni si vedono a vicenda e si scrive una volta.
    return contesto.modifica((r) => {
      for (const correzione of correzioni) correzione.applica(r)
    }, collezioni)
  },

  'sistema.apriCartella': async (_contesto, _azione) => {
    // Si passa il file, non la cartella: `showItemInFolder` apre la cartella
    // che lo contiene e lo evidenzia.
    const documento = percorsoPacchetto()
    if (!documento) return rifiuta(testi().nessunDocumento)
    await apparato.comandi.esegui('apparato.mostraNellaCartella', documento)
    return fatto
  },

  /** Lo zoom della finestra, un passo per volta; `fuori` perché i dati non cambiano. */
  'finestra.zoom': async (_contesto, azione) => {
    await apparato.comandi.esegui('apparato.zoom', azione.verso)
    return fuori
  },

  'finestra.schermoIntero': async (_contesto, _azione) => {
    await apparato.comandi.esegui('apparato.finestraIntera')
    return fuori
  },

  /** Chiude il registro, senza conferma: il documento si salva a ogni modifica. */
  'programma.esci': (_contesto, _azione) => {
    // Non aspettato: lo spegnimento aspetta questa richiesta (`lanciaComando`).
    lanciaComando('registroDocenti.esci')
    return fuori
  },

  /**
   * Compone il numero con il programma di sistema. L'indirizzo lo costruisce
   * l'host dal numero ridotto a cifre e `+`, così alla shell arriva solo una telefonata.
   */
  'sistema.chiama': async (_contesto, azione) => {
    const t = testi()
    const numero = numeroComponibile(azione.numero)
    if (!numero) return rifiuta(t.nonComponibile(azione.numero))

    const modo = modoChiamata(scelta('telefono'))
    const indirizzo = indirizzoChiamata(modo, numero)
    if (!indirizzo) {
      return conMessaggio(t.chiamateSpente(t.voceRecapiti), 'info', { invariato: true })
    }

    const aperto = await apparato.esterno.apri(apparato.Uri.parse(indirizzo))
    if (!aperto) {
      return rifiuta(t.nessunoRisponde(modo, t.voceRecapiti))
    }
    return fuori
  },

  /**
   * Apre il programma di posta (dalle impostazioni) su un messaggio vuoto a
   * quell'indirizzo. «Outlook» chiama l'eseguibile, perché `mailto:` aprirebbe
   * il predefinito; se non riesce si ripiega sul predefinito, con un avviso.
   */
  'sistema.scrivi': async (_contesto, azione) => {
    const t = testi()
    const indirizzo = indirizzoScrivibile(azione.indirizzo)
    if (!indirizzo) return rifiuta(t.nonIndirizzo(azione.indirizzo))

    const modo = modoPosta(scelta('posta'))
    if (modo === 'nessuno') {
      return conMessaggio(t.postaSpenta(t.voceRecapiti), 'info', { invariato: true })
    }

    if (modo === 'outlook' && (await apriConOutlook(indirizzo))) return fuori

    const dove =
      modo === 'outlookWeb' ? composizioneOutlookWeb(indirizzo) : indirizzoMailto(indirizzo)
    const aperto = await apparato.esterno.apri(apparato.Uri.parse(dove))
    if (!aperto) return rifiuta(t.nessunaPosta)
    if (modo === 'outlook') {
      return conMessaggio(t.outlookNonAperto(t.voceRecapiti), 'avviso', { invariato: true })
    }
    return fuori
  },

  /** Prova il collegamento con la casella e dice di chi è, senza mandare niente. */
  'posta.prova': async (_contesto, _azione) => {
    const stato = await provaCollegamento()
    // Server che rifiuta: la busta deve dire fallimento, non solo il testo.
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    return conMessaggio(stato.testo, stato.livello, { invariato: true })
  },

  /**
   * Manda davvero una mail di prova, a differenza di `posta.prova`: spedire
   * chiede un altro permesso. L'indirizzo lo chiede l'host, già riempito.
   */
  'posta.invioProva': async (contesto, _azione) => {
    const stato = await inviaProva(firmaPosta(contesto.registro.impostazioni.intestazione))
    // Finestra chiusa senza indirizzo: non è un errore.
    if (!stato) return { ok: true, invariato: true }
    // Non partito: rifiuto, perché un invio non si ritenta alla cieca.
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    return conMessaggio(stato.testo, stato.livello, { invariato: true })
  },

  /**
   * Collega la casella: l'host chiede l'indirizzo, fa accedere dal browser,
   * prova e salva se il server accetta. Sta nell'host perché le credenziali
   * non attraversino il ponte. Non `invariato`: lo stato del pannello cambia.
   */
  'posta.collega': async (_contesto, _azione) => {
    const stato = await collegaAccount()
    // Chiuso senza scrivere niente: non è un errore.
    if (!stato) return { ok: true, invariato: true }
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    return conMessaggio(stato.testo, stato.livello)
  },

  'posta.scollega': async (_contesto, _azione) => {
    const stato = await scollegaAccount()
    return conMessaggio(stato.testo, stato.livello)
  },

  'sistema.messaggio': (_contesto, azione) => {
    const mostra =
      azione.livello === 'errore'
        ? apparato.dialoghi.errore
        : azione.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(azione.testo)
    return fatto
  },
} satisfies Parte
