// Chi guarda l'orologio e decide quando parlare.
//
// Sta in mezzo fra due pezzi che non si conoscono: `dominio/promemoria.ts`, che
// sa *che cosa* dire di un'ora e non sa che ore sono, e `ambiente/notifiche.ts`,
// che sa mostrare un avviso e non sa niente di lezioni. Qui c'è solo il momento.
//
// ## Le tre regole che rendono una notifica sopportabile
//
// **Una sola per ora.** Il battito passa ogni minuto e la finestra d'anticipo è
// larga cinque: senza memoria, la stessa lezione verrebbe annunciata cinque
// volte. `annunciate` è quella memoria.
//
// **Niente all'avvio.** Aprendo il registro a metà mattina, le ore che stanno
// per cominciare adesso sono già note a chi ha aperto il registro. Il primo
// battito serve solo a riempire la memoria, non a parlare.
//
// **Niente se la finestra è davanti.** Chi sta guardando il registro non ha
// bisogno che il sistema operativo glielo dica: la barra di stato lo dice già,
// e più discretamente.
//
// ## Perché non si programma un timer per ogni lezione
//
// Perché il computer dorme. Un `setTimeout` puntato alle 08:20 non scatta se il
// portatile è chiuso alle 08:10 e si riapre alle 08:22, e chi insegna il
// portatile lo chiude di continuo. Un battito che guarda l'orologio vero
// recupera da solo: al risveglio si accorge che sono le 08:22 e — se la lezione
// è cominciata da poco — la annuncia comunque.

import * as vscode from 'vscode'

import type { Archivio } from './dati/archivio.js'
import { adesso, oggi } from './dominio/date.js'
import { oreCheCominciano, promemoriaDellOra } from './dominio/promemoria.js'
import {
  avvisa,
  dichiaraIdentita,
  finestraDavanti,
  notificheDisponibili,
} from './ambiente/notifiche.js'

/** Ogni quanto si guarda l'orologio. */
const BATTITO = 30_000

/**
 * Quanto si continua ad annunciare un'ora già cominciata.
 *
 * Serve al risveglio: il portatile riaperto alle 08:22 deve poter dire «DIC4a
 * adesso» per la lezione delle 08:20. Oltre il quarto d'ora non ha più senso —
 * si è in classe da un pezzo, e una notifica arrivata allora è solo fastidio.
 */
const RITARDO_MASSIMO = 15

function impostazioni () {
  const conf = vscode.workspace.getConfiguration('registroDocenti.promemoria')
  return {
    attivo: conf.get<boolean>('attivo', true),
    anticipo: Math.max(0, conf.get<number>('anticipoMinuti', 5)),
  }
}

/**
 * Accende i promemoria. Torna il modo di spegnerli, per `contesto.subscriptions`.
 *
 * `apri` è quel che succede premendo la notifica: lo passa `avvio.ts`, perché è
 * lui a sapere come si apre il pannello — qui non si conosce né il pannello né
 * il guscio.
 */
export function avviaPromemoria (
  archivio: Archivio,
  apri: (lezioneId: string) => void,
): vscode.Disposable {
  if (!notificheDisponibili()) {
    // Detto una volta e non a ogni battito: su una macchina senza centro
    // notifiche non è un guasto, è com'è fatta.
    console.log('promemoria: il sistema non mostra notifiche, restano spenti')
    return new vscode.Disposable(() => {})
  }

  dichiaraIdentita()

  /** Le ore già annunciate, per id. Vive quanto la finestra, e basta così. */
  const annunciate = new Set<string>()
  let primoGiro = true

  const batti = (): void => {
    const { attivo, anticipo } = impostazioni()
    if (!attivo) return

    const giorno = oggi()
    const ora = adesso()

    // La finestra guarda avanti di `anticipo` e indietro di `RITARDO_MASSIMO`:
    // `oreCheCominciano` vuole un istante e un anticipo, e il modo di dirle
    // «anche quelle di poco fa» è chiederglielo da un quarto d'ora prima.
    const ore = oreCheCominciano(
      archivio.registro,
      giorno,
      indietro(ora, RITARDO_MASSIMO),
      anticipo + RITARDO_MASSIMO,
    )

    for (const lezione of ore) {
      if (annunciate.has(lezione.id)) continue
      annunciate.add(lezione.id)
      // Il primo giro riempie la memoria e sta zitto: quel che sta cominciando
      // adesso lo sa già chi ha appena aperto il registro.
      if (primoGiro) continue
      // Il registro è già sotto gli occhi: la barra di stato lo dice meglio.
      if (finestraDavanti()) continue

      const promemoria = promemoriaDellOra(archivio.registro, lezione, ora)
      // Sulla console resta traccia di che cosa è stato annunciato e quando:
      // una notifica che non si è vista non lascia nessun segno, e senza questa
      // riga «non mi ha avvisato» non si può distinguere da «non me ne sono
      // accorto».
      console.log(`[promemoria] ${ora} — ${promemoria.titolo} (${promemoria.daFare} aperte)`)
      avvisa({
        titolo: promemoria.titolo,
        corpo: promemoria.corpo,
        al: () => apri(promemoria.lezioneId),
      })
    }

    primoGiro = false
  }

  batti()
  const timer = setInterval(batti, BATTITO)

  return new vscode.Disposable(() => clearInterval(timer))
}

/** L'ora di `minuti` fa, senza scendere sotto la mezzanotte. */
function indietro (ora: string, minuti: number): string {
  const [h, m] = ora.split(':').map(Number)
  const totale = Math.max(0, (h ?? 0) * 60 + (m ?? 0) - minuti)
  const due = (n: number) => String(n).padStart(2, '0')
  return `${due(Math.floor(totale / 60))}:${due(totale % 60)}`
}
