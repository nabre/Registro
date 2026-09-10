// L'icona accanto all'orologio: chi la tiene aggiornata e che cosa ci mette.
//
// Sta in mezzo fra due pezzi che non si conoscono, come `promemoria.ts`:
// `dominio/vassoio.ts` sa *che cosa* dire e non sa che ore sono né che cos'è un
// menu; `ambiente/vassoio.ts` sa fare un menu nativo e non sa niente di
// lezioni. Qui c'è il momento, l'archivio, e la traduzione da un albero di
// stringhe a un albero di voci premibili.
//
// ## Perché l'icona resta accesa anche a finestre chiuse
//
// Perché è il modo in cui questo registro si chiude. Un docente il registro lo
// apre venti volte al giorno per trenta secondi, e chiuderlo davvero a ogni
// giro vorrebbe dire rileggere i JSON venti volte. Con il vassoio la X è
// «mettilo via», e l'uscita vera è una voce sola, in fondo al menu — che è
// anche il posto in cui si va a cercarla.
//
// ## Il battito
//
// Il menu è una fotografia: Electron lo prende quando glielo si dà, non quando
// lo si apre. Un'ora che comincia alle 08:20 diventa «in corso» solo se
// qualcuno ridà il menu, e nessuno lo farà — il registro è chiuso, è per questo
// che si sta guardando il vassoio. Da qui il battito, che è la stessa soluzione
// dei promemoria e per la stessa ragione: l'orologio vero, guardato ogni tanto,
// sopravvive anche al portatile che dorme.
//
// Il menu si rifà solo se è cambiato davvero. Non è un'ottimizzazione: su
// Windows `setContextMenu` durante un menu aperto lo fa sfarfallare, e un menu
// che si rifà da sé ogni minuto lo farebbe sotto le dita di chi sta scegliendo.

import * as vscode from 'vscode'

import { creaVassoio, SEPARATORE, type Vassoio, type VoceVassoio } from './ambiente/vassoio.js'
import type { Archivio } from './dati/archivio.js'
import { adesso, oggi } from './dominio/date.js'
import { alberoVassoio, type AlberoVassoio, type CorsoVassoio } from './dominio/vassoio.js'
import type { MessaggioNavigazione } from './protocollo.js'

/** Ogni quanto si guarda l'orologio. Come i promemoria, e per lo stesso motivo. */
const BATTITO = 30_000

function impostazioni () {
  const conf = vscode.workspace.getConfiguration('registroDocenti.vassoio')
  return { attivo: conf.get<boolean>('attivo', true) }
}

/**
 * Accende l'icona nel vassoio. Torna il modo di spegnerla.
 *
 * `apri` è quel che succede premendo una voce: lo passa `avvio.ts`, che è
 * l'unico a sapere come si apre il pannello. È la stessa porta dei promemoria.
 *
 * `null` non lo torna: se il vassoio non si può fare — icona mancante,
 * impostazione spenta — torna comunque qualcosa da smaltire, e chi chiama non
 * ha un caso in più da trattare. Per sapere se c'è davvero un'icona accesa si
 * chiede a `vassoioAcceso()`, che è quel che serve al guscio per decidere se la
 * X chiude l'applicazione o la mette via.
 */
export function avviaVassoio (
  archivio: Archivio,
  apri: (navigazione?: MessaggioNavigazione) => void,
): vscode.Disposable {
  if (!impostazioni().attivo) return new vscode.Disposable(() => {})

  let albero = alberoVassoio(archivio.registro, oggi(), adesso())

  const vassoio: Vassoio | null = creaVassoio({
    menu: () => vociDelMenu(albero, apri),
    suggerimento: () => albero.suggerimento,
    alClic: () => apri(),
  })

  if (!vassoio) {
    // Senza icona non c'è vassoio, e la X torna a chiudere l'applicazione. Va
    // detto: è una differenza di comportamento, non un dettaglio grafico.
    console.log('vassoio: nessuna icona da mettere accanto all’orologio, resta spento')
    return new vscode.Disposable(() => {})
  }

  /** Rifà il menu solo se è cambiato: vedi il battito, in testa al file. */
  const ricalcola = (): void => {
    const nuovo = alberoVassoio(archivio.registro, oggi(), adesso())
    if (JSON.stringify(nuovo) === JSON.stringify(albero)) return
    albero = nuovo
    vassoio.aggiorna()
  }

  const battito = setInterval(ricalcola, BATTITO)
  const iscrizione = archivio.alCambiamento(() => ricalcola())

  return new vscode.Disposable(() => {
    clearInterval(battito)
    iscrizione.dispose()
    vassoio.smaltisci()
  })
}

// ------------------------------------------------------------------- il menu

function vociDelMenu (
  albero: AlberoVassoio,
  apri: (navigazione?: MessaggioNavigazione) => void,
): VoceVassoio[] {
  const allOra = (lezioneId: string) => () =>
    apri({ tipo: 'naviga', vista: 'lezione', elementoId: lezioneId })

  const voci: VoceVassoio[] = [
    { etichetta: albero.intestazione, spenta: true },
    SEPARATORE,
  ]

  // Le due righe che portano dove si deve andare adesso. Quella in corso non si
  // ripete sotto «da compilare»: `oraDaCompilare` può indicare proprio lei —
  // un'ora cominciata e ancora senza appello — e due righe uguali una sull'altra
  // fanno dubitare che siano la stessa.
  if (albero.inCorso) {
    voci.push({
      etichetta: `Adesso: ${albero.inCorso.etichetta}`,
      al: allOra(albero.inCorso.lezioneId),
    })
  }
  if (albero.daFare && albero.daFare.lezioneId !== albero.inCorso?.lezioneId) {
    voci.push({ etichetta: albero.daFare.etichetta, al: allOra(albero.daFare.lezioneId) })
  }
  voci.push(SEPARATORE)

  if (albero.corsi.length === 0) {
    voci.push({ etichetta: 'Nessun corso con ore in questo anno', spenta: true })
  }
  for (const corso of albero.corsi) {
    voci.push({ etichetta: corso.etichetta, sotto: sottoDelCorso(corso, apri, allOra) })
  }

  voci.push(
    SEPARATORE,
    { etichetta: 'Apri il registro', al: () => apri() },
    {
      etichetta: 'Vai a oggi',
      al: () => apri({ tipo: 'naviga', vista: 'calendario', data: oggi() }),
    },
    SEPARATORE,
    // L'unica uscita vera. Passa dal comando e non da `app.quit()` perché qui
    // Electron non c'è: lo registra il guscio, che è dove si aspetta l'ultimo
    // salvataggio prima di chiudere.
    { etichetta: 'Esci dal registro', al: () => void vscode.commands.executeCommand('registroDocenti.esci') },
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
    // Le altre non si elencano: un menu di sessanta righe non si legge, e quel
    // che serve per vederle tutte è la scheda del corso, che sta qui sotto.
    if (mucchio.altre > 0) {
      voci.push({ etichetta: `   e altre ${mucchio.altre}…`, spenta: true })
    }
  }

  voci.push(SEPARATORE, {
    etichetta: 'Apri il corso',
    al: () => apri({ tipo: 'naviga', vista: 'corsi', elementoId: corso.corsoId }),
  })

  return voci
}
