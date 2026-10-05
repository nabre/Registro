import { chiudiSidebarMobile, sfondoSidebar, sidebar, sidebarAperta } from './sidebar.js'
import { assistenteAperto, pannelloAssistente } from './assistant.js'
// Telaio: navigazione e comandi, contenuto, stato.

import { riparazioni } from '#core/dominio/repairs.js'
import { Avviso, Pulsante } from './components/base.js'
import { conferma } from './components/modal.js'
import { apriInformazioniDocumento } from './forms/documentInfo.js'
import { notifica } from './components/notifications.js'
import type { ReactElement, ReactNode } from 'react'

import { classi } from './classNames.js'
import { azione } from './bridge.js'
import { stato } from './state.js'
import { chiaveDelPosto, type PaginaId } from './place.js'
import { barraComandi } from './commandBar.js'
import { barraStato } from './statusBar.js'
import { barraTitolo } from './titleBar.js'
import { èFiglia } from './windows.js'
import { testi } from './shell.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { vistaAllievo } from './views/student.js'
import { vistaCalendario } from './views/calendar.js'
import { vistaOggi } from './views/today.js'
import { vistaClassi } from './views/classes.js'
import { vistaPersone } from './views/people.js'
import { vistaDocenteClasse } from './views/classTeacher.js'
import { vistaGuida } from './views/help.js'
import { vistaDaSmistare } from './views/sorting/toSort.js'
import { vistaTodo } from './views/todo.js'
import { vistaCorsi } from './views/courses.js'
import { vistaDocumenti } from './views/documents.js'
import { vistaImpostazioni } from './views/settings.js'
import { vistaLezione } from './views/lesson.js'
import { vistaMappa } from './views/map.js'
import { vistaPiani } from './views/plans.js'
import { vistaProgetti } from './views/projects.js'
import { vistaIntegrazioneProgetti } from './views/projectIntegration.js'
import { vistaValutazioni } from './views/assessments.js'
import { vistaCheck } from './views/check.js'
import { vistaOverview } from './views/overview.js'
import { scordaCollegamentiOverview } from './views/overviewLinks.js'

function vistaCorrente (): ReactNode {
  if (stato.vista !== 'overview') scordaCollegamentiOverview()
  switch (stato.vista) {
    case 'oggi':
      return vistaOggi()
    case 'calendario':
      return vistaCalendario()
    case 'todo':
      return vistaTodo()
    case 'daSmistare':
      return vistaDaSmistare()
    case 'lezione':
      return vistaLezione()
    case 'classi':
      return vistaClassi()
    case 'persone':
      return vistaPersone()
    case 'corsi':
      return vistaCorsi()
    case 'documenti':
      return vistaDocumenti()
    case 'allievo':
      return vistaAllievo()
    case 'docenteClasse':
      return vistaDocenteClasse()
    case 'piani':
      return vistaPiani()
    case 'progetti':
      // Una vista, due pagine: la biblioteca dell'anno e l'integrazione nel corso.
      return stato.posto.pagina === 'pagina.corso.integrazione' ? vistaIntegrazioneProgetti() : vistaProgetti()
    case 'overview':
      return vistaOverview()
    case 'valutazioni':
      return vistaValutazioni()
    case 'check':
      return vistaCheck()
    case 'impostazioni':
      return vistaImpostazioni()
    case 'modelli':
      // La tabella del posto (`postoDaVista`) porta `'modelli'` sull'intestazione.
      return vistaImpostazioni()
    case 'modelliLinguistici':
      // La tabella del posto porta questa vista alle impostazioni del programma.
      return vistaImpostazioni()
    case 'mappa':
      return vistaMappa()
    case 'guida':
      return vistaGuida()
  }
}

/**
 * La riga che compare quando nei file qualcosa non torna (un riferimento
 * rotto): lo dice e, se la correzione non perde niente, offre il gesto.
 */
function barraAvvisi (): ReactNode {
  if (stato.avvisi.length === 0) return null
  const correzioni = riparazioni(stato.registro)
  const t = testi()

  return (
    <Avviso tono="attenzione">
      <div className="avviso__riga">
        <span>{t.nonTornano(stato.avvisi.length)}{stato.avvisi[0]}</span>
        {correzioni.length > 0
          ? (
              <Pulsante
                testo={t.ripara}
                simbolo="spunta"
                variante="sottile"
                al={async () => {
                  const sicuro = await conferma({
                    titolo: t.ripararTitolo,
                    testo: correzioni.map((c) => `• ${c.descrizione}`).join('\n'),
                    testoConferma: t.ripara,
                  })
                  if (!sicuro) return
                  const risposta = await azione({ tipo: 'manutenzione.ripara' })
                  // Il rifiuto l'ha già detto `azione`, «niente da riparare» l'host. Le
                  // riparazioni non coincidono con gli avvisi, e lo stato nuovo arriva prima
                  // della risposta: qui si sa già se ne restano, e lo si dice.
                  if (!risposta.ok || risposta.messaggio) return
                  const restano = stato.avvisi.length
                  if (restano === 0) {
                    notifica(t.riparato, 'successo')
                    return
                  }
                  notifica(t.restano(restano), 'avviso')
                }}
              />
            )
          : null}
        <Pulsante
          testo={parole().dettagli}
          variante="fantasma"
          // Dritto al dialogo che elenca i riferimenti da sistemare.
          al={() => apriInformazioniDocumento()}
        />
      </div>
    </Avviso>
  )
}

/**
 * Il filo che dice che il registro sta lavorando. Sta fuori da `#radice` e non
 * passa dal disegno: accenderlo e spegnerlo, due volte per ogni richiesta lenta,
 * non rifà la pagina. Resta finché l'ultima risposta torna, anche quando un
 * ridisegno porta via il pulsante con la sua rotella. Lo accende il canale
 * (`iscrivitiAttesa` in `main.tsx`).
 */
let filo: HTMLElement | null = null

export function mostraFiloDiLavoro (acceso: boolean): void {
  if (!filo) {
    filo = document.createElement('div')
    filo.className = 'filo-lavoro'
    filo.hidden = true
    filo.setAttribute('role', 'status')
    filo.setAttribute('aria-live', 'polite')
    filo.append(document.createElement('span'))
    document.body.appendChild(filo)
  }
  // L'etichetta si scrive a ogni accensione: la lingua può essere cambiata.
  if (acceso) filo.setAttribute('aria-label', testi().staLavorando)
  filo.hidden = !acceso
}

/**
 * Le pagine dove il soggetto si sceglie da dentro (l'elenco dei corsi, dei
 * piani, delle prove, delle classi; l'ora nel calendario): cambiarlo non è
 * andare altrove, e la pagina resta dov'era invece di ripartire dall'alto.
 */
const SOGGETTO_DA_DENTRO: ReadonlySet<PaginaId> = new Set<PaginaId>([
  'pagina.corsi',
  'pagina.corso.overview',
  'pagina.corso.piani',
  'pagina.progetti',
  'pagina.corso.integrazione',
  'pagina.corso.valutazioni',
  'pagina.corso.check',
  'pagina.classi',
  'pagina.calendario',
  'pagina.pendenze',
])

/**
 * La chiave di scorrimento di `.contenuto`: il posto (`chiaveDelPosto`), con il
 * soggetto solo dove aprirne un altro è andare altrove (un'ora, un allievo).
 * Cambiandola si riparte dall'alto e la catena di telaio si rifà; restando, il
 * ridisegno a ogni gesto non fa perdere il punto (ADR-48).
 */
function chiaveDellaPagina (): string {
  const livello = SOGGETTO_DA_DENTRO.has(stato.posto.pagina) ? 'pagina' : 'soggetto'
  // testo-fisso: una chiave, non un testo
  return `pagina:${chiaveDelPosto(stato.posto, livello)}`
}

/**
 * Il telaio del pannello: barre, navigazione, contenuto, assistente. La chiave di
 * `main.contenuto` è la sua chiave di scorrimento: cambiandola si riparte
 * dall'alto con una scatola nuova, come prima (ADR-48).
 */
export function Guscio (): ReactElement {
  if (!stato.caricato) {
    return <div className="caricamento">{testi().apertura}</div>
  }
  const pagina = chiaveDellaPagina()
  return (
    <div
      data-telaio="guscio"
      className={classi(
        'guscio',
        sidebarAperta() && 'guscio--con-sidebar',
        assistenteAperto() && 'guscio--con-assistente',
      )}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && chiudiSidebarMobile()) evento.preventDefault()
      }}
    >
      {/* La barra del titolo della finestra, disegnata dal registro: sopra tutto,
          anche sopra la navigazione, perché è il bordo della finestra (`ui/titleBar.tsx`). */}
      {barraTitolo()}
      {/* La barra dei comandi sta nel telaio e non nella vista: parla di tutto il registro. */}
      {sfondoSidebar()}
      {sidebar()}
      {barraComandi()}
      <main key={pagina} className="contenuto" data-telaio="contenuto" data-scorrimento={pagina}>
        {barraAvvisi()}
        {vistaCorrente()}
      </main>
      {/* L'assistente è una colonna della griglia, non un velo: chiuso non disegna
          niente (`ui/assistant.tsx`). */}
      {pannelloAssistente()}
      {/* Una figlia non ha la barra di stato: dice cose del programma, che la
          principale mostra già. */}
      {èFiglia() ? null : barraStato()}
    </div>
  )
}
