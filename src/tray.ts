// L'icona del vassoio: traduce l'albero di `domain/tray.ts` in voci del menu
// nativo di `environment/tray.ts`. Con l'icona accesa la X mette via il registro
// invece di chiuderlo; l'uscita vera è l'ultima voce del menu.
// Il menu è una fotografia presa da Electron quando lo si dà: un battito lo
// ricalcola, e lo riconsegna solo se è cambiato (su Windows rifarlo aperto
// sfarfalla). Senza un anno aperto mostra gli anni preferiti e recenti.

import * as apparato from 'apparato'

import { creaVassoio, SEPARATORE, type Vassoio, type VoceVassoio } from './environment/tray.js'
import type { Archivio } from './data/archive.js'
import { adesso, oggi } from './domain/dates.js'
import { alberoVassoio, type AlberoVassoio, type CorsoVassoio } from './domain/tray.js'
import { alCambioDocumenti, documentiNoti, type DocumentoNoto } from './environment/documents.js'
import type { MessaggioNavigazione } from './protocol.js'
import { battitoSicuro } from './reminders.js'
import { alCambioLingua } from './i18n/index.js'
import { testi } from './tray.testi.js'

/** Ogni quanto si guarda l'orologio. */
const BATTITO = 30_000

const MARCHIO = 'Regiclass' // testo-fisso: il marchio non si traduce

function impostazioni () {
  const conf = apparato.impostazioni.leggi('registroDocenti.vassoio')
  return { attivo: conf.get<boolean>('attivo', true) }
}

/**
 * Accende l'icona nel vassoio e torna il modo di spegnerla (anche se l'icona non
 * c'è; per saperlo c'è `vassoioAcceso()`). `apri` apre il pannello su una voce.
 */
export function avviaVassoio (
  archivio: Archivio,
  apri: (navigazione?: MessaggioNavigazione) => void,
): apparato.Smaltitore {
  if (!impostazioni().attivo) return new apparato.Smaltitore(() => {})

  /** Quel che il menu mostra: l'albero dell'anno aperto, o gli anni da aprire. */
  const fotografa = () => {
    const aperto = archivio.documentoAperto !== null
    return {
      aperto,
      albero: alberoVassoio(archivio.registro, oggi(), adesso()),
      documenti: aperto ? [] : documentiNoti(),
    }
  }
  let foto = fotografa()

  const vassoio: Vassoio | null = creaVassoio({
    menu: () => (foto.aperto ? vociDelMenu(foto.albero, apri) : vociSenzaAnno(foto.documenti)),
    suggerimento: () =>
      foto.aperto ? foto.albero.suggerimento : `${MARCHIO}\n${testi().nessunAnnoAperto}`,
    // Senza un anno, il clic porta al benvenuto e non a un pannello vuoto.
    alClic: () => (foto.aperto ? apri() : void apparato.comandi.esegui('registroDocenti.benvenuto')),
  })

  if (!vassoio) {
    // Senza icona la X chiude l'applicazione: lo si annota in console.
    console.log('vassoio: nessuna icona da mettere accanto all’orologio, resta spento')
    return new apparato.Smaltitore(() => {})
  }

  /** Rifà il menu solo se è cambiato (vedi in testa al file). */
  const ricalcola = (): void => {
    const nuova = fotografa()
    if (JSON.stringify(nuova) === JSON.stringify(foto)) return
    foto = nuova
    vassoio.aggiorna()
  }

  const battito = setInterval(battitoSicuro('vassoio', ricalcola), BATTITO)
  const iscrizione = archivio.alCambiamento(() => ricalcola())
  // L'elenco degli anni cambia anche a registro fermo (preferito, file sparito).
  const iscrizioneDocumenti = alCambioDocumenti(() => ricalcola())
  // L'albero è fatto di frasi: cambia con la lingua.
  const smettiLingua = alCambioLingua(() => ricalcola())

  return new apparato.Smaltitore(() => {
    clearInterval(battito)
    iscrizione.dispose()
    iscrizioneDocumenti.dispose()
    smettiLingua()
    vassoio.smaltisci()
  })
}

// ------------------------------------------------------------------- il menu

function vociDelMenu (
  albero: AlberoVassoio,
  apri: (navigazione?: MessaggioNavigazione) => void,
): VoceVassoio[] {
  const t = testi()
  const allOra = (lezioneId: string) => () =>
    apri({ tipo: 'naviga', vista: 'lezione', elementoId: lezioneId })

  const voci: VoceVassoio[] = [
    { etichetta: albero.intestazione, spenta: true },
    SEPARATORE,
  ]

  // L'ora in corso e quella da compilare; la seconda si salta se è la stessa ora.
  if (albero.inCorso) {
    voci.push({
      etichetta: t.adesso(albero.inCorso.etichetta),
      al: allOra(albero.inCorso.lezioneId),
    })
  }
  if (albero.daFare && albero.daFare.lezioneId !== albero.inCorso?.lezioneId) {
    voci.push({ etichetta: albero.daFare.etichetta, al: allOra(albero.daFare.lezioneId) })
  }
  voci.push(SEPARATORE)

  if (albero.corsi.length === 0) {
    voci.push({ etichetta: t.nessunCorso, spenta: true })
  }
  for (const corso of albero.corsi) {
    voci.push({ etichetta: corso.etichetta, sotto: sottoDelCorso(corso, apri, allOra) })
  }

  voci.push(
    SEPARATORE,
    { etichetta: t.apriRegistro, al: () => apri() },
    {
      etichetta: t.vaiAOggi,
      al: () => apri({ tipo: 'naviga', vista: 'calendario', data: oggi() }),
    },
    SEPARATORE,
    voceEsci(),
  )

  return voci
}

/** L'uscita, uguale nei due menu: da sola, in fondo. */
function voceEsci (): VoceVassoio {
  // Passa dal comando e non da `app.quit()`: il guscio attende l'ultimo
  // salvataggio prima di chiudere.
  return {
    etichetta: testi().esci,
    al: () => void apparato.comandi.esegui('registroDocenti.esci'),
  }
}

/** Un anno dell'elenco: il nome dell'anno scolastico, e il clic lo apre. */
function voceDellAnno (documento: DocumentoNoto): VoceVassoio {
  const nome = documento.etichetta ?? documento.nome
  if (documento.mancante) return { etichetta: testi().nonDisponibile(nome), spenta: true }
  return {
    etichetta: nome,
    al: () => void apparato.comandi.esegui('registroDocenti.apriDocumento', documento.percorso),
  }
}

/** Il menu senza un anno aperto: preferiti e recenti come nel menu «File», e come averne un altro. */
function vociSenzaAnno (documenti: DocumentoNoto[]): VoceVassoio[] {
  const t = testi()
  const comando = (id: string) => () => void apparato.comandi.esegui(id)
  const preferiti = documenti.filter((d) => d.preferito)
  const recenti = documenti.filter((d) => !d.preferito)
  const voci: VoceVassoio[] = [
    { etichetta: `${MARCHIO} — ${t.intestazioneSenzaAnno}`, spenta: true },
    SEPARATORE,
  ]
  if (preferiti.length) {
    voci.push({ etichetta: t.preferiti, spenta: true }, ...preferiti.map(voceDellAnno), SEPARATORE)
  }
  if (recenti.length) {
    voci.push({ etichetta: t.recenti, spenta: true }, ...recenti.map(voceDellAnno), SEPARATORE)
  }
  if (!documenti.length) voci.push({ etichetta: t.nessunRecente, spenta: true }, SEPARATORE)
  voci.push(
    { etichetta: t.apriAnno, al: comando('registroDocenti.apriDocumento') },
    { etichetta: t.creaAnno, al: comando('registroDocenti.creaAnnoNuovo') },
    { etichetta: t.benvenuto, al: comando('registroDocenti.benvenuto') },
    SEPARATORE,
    voceEsci(),
  )
  return voci
}

function sottoDelCorso (
  corso: CorsoVassoio,
  apri: (navigazione?: MessaggioNavigazione) => void,
  allOra: (lezioneId: string) => () => void,
): VoceVassoio[] {
  const voci: VoceVassoio[] = [{ etichetta: corso.riepilogo, spenta: true }]

  for (const mucchio of corso.mucchi) {
    voci.push(SEPARATORE, { etichetta: mucchio.titolo, spenta: true })
    for (const ora of mucchio.ore) {
      voci.push({ etichetta: `   ${ora.etichetta}`, al: allOra(ora.lezioneId) })
    }
    // Le altre solo contate: per vederle tutte c'è la scheda del corso, qui sotto.
    if (mucchio.altre > 0) {
      voci.push({ etichetta: `   ${testi().altre(mucchio.altre)}`, spenta: true })
    }
  }

  voci.push(SEPARATORE, {
    etichetta: testi().apriCorso,
    al: () => apri({ tipo: 'naviga', vista: 'corsi', elementoId: corso.corsoId }),
  })

  return voci
}
