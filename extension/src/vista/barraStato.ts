// La voce nella barra di stato: dice qual è la prossima lezione e ci porta
// dentro con un clic. È l'unica parte del registro che si vede senza aprirlo,
// quindi deve stare in poche parole.

import * as vscode from 'vscode'

import { classeDellaLezione, lezioniDellAnno } from '../dominio/corsi.js'

import type { Archivio } from '../dati/archivio.js'
import { inizioLezione, prossimaLezione } from '../dominio/calcoli.js'
import { adesso, formattaData, oggi } from '../dominio/date.js'
import type { MessaggioNavigazione } from '../protocollo.js'

export class BarraStato implements vscode.Disposable {
  private readonly voce: vscode.StatusBarItem
  private readonly smaltibili: vscode.Disposable[] = []
  /** Rinfresco periodico: a mezzanotte "oggi" cambia anche se nessuno tocca nulla. */
  private timer: NodeJS.Timeout

  constructor (private readonly archivio: Archivio) {
    this.voce = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.voce.command = 'registroDocenti.apri'
    this.smaltibili.push(this.voce, this.archivio.alCambiamento(() => this.aggiorna()))
    this.timer = setInterval(() => this.aggiorna(), 5 * 60 * 1000)
    this.aggiorna()
  }

  aggiorna (): void {
    const registro = this.archivio.registro
    // Solo l'anno corrente, come fa l'albero: la lezione di un anno chiuso
    // non è «la prossima» solo perché la sua data non è ancora passata.
    // Con l'ora, un'ora di oggi già finita non è la prossima nemmeno lei.
    const lezione = prossimaLezione(
      lezioniDellAnno(registro, registro.annoCorrenteId),
      oggi(),
      adesso(),
    )

    if (!lezione) {
      this.voce.text = '$(book) Registro'
      this.voce.tooltip = 'Nessuna lezione in programma'
      this.voce.command = 'registroDocenti.apri'
      this.voce.show()
      return
    }

    const classe = classeDellaLezione(registro, lezione)
    const inizio = inizioLezione(lezione)
    const piano = lezione.pianoId
      ? registro.piani.find((p) => p.id === lezione.pianoId) ?? null
      : null
    const quando = lezione.data === oggi() ? 'oggi' : formattaData(lezione.data, 'giorno')

    this.voce.text = `$(book) ${classe?.nome ?? 'Lezione'} · ${quando}${inizio ? ` ${inizio}` : ''}`
    this.voce.tooltip = new vscode.MarkdownString(
      [
        `**Prossima lezione** — ${formattaData(lezione.data, 'lungo')}`,
        '',
        `${classe?.nome ?? 'Senza classe'}${piano ? ` · piano di ${piano.attivita.length} attività` : ' · senza piano'}`,
        lezione.slot.map((s) => `${s.inizio}–${s.fine}`).join(' · '),
      ].join('\n'),
    )
    // Clic sulla barra apre direttamente questa lezione, non il registro
    // generico: è quel che si vuole guardare, ed è già la domanda a cui la
    // barra ha risposto.
    const naviga: MessaggioNavigazione = { tipo: 'naviga', vista: 'lezione', elementoId: lezione.id }
    this.voce.command = {
      command: 'registroDocenti.apriElemento',
      title: 'Apri la lezione',
      arguments: [naviga],
    }
    this.voce.show()
  }

  dispose (): void {
    clearInterval(this.timer)
    for (const smaltibile of this.smaltibili) smaltibile.dispose()
  }
}
