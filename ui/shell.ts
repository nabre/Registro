import { chiudiSidebarMobile, sfondoSidebar, sidebar, sidebarAperta } from './sidebar.js'
import { assistenteAperto, pannelloAssistente } from './assistant.js'
// Telaio: navigazione e comandi, contenuto, stato.

import { riparazioni } from '#core/dominio/repairs.js'
import { avviso, pulsante } from './components/base.js'
import { conferma } from './components/modal.js'
import { apriInformazioniDocumento } from './forms/documentInfo.js'
import { notifica } from './components/notifications.js'
import { h, type Figlio } from './dom.js'
import { azione } from './bridge.js'
import { stato } from './state.js'
import { chiaveDelPosto, type PaginaId } from './place.js'
import { barraComandi } from './commandBar.js'
import { barraStato } from './statusBar.js'
import { barraTitolo } from './titleBar.js'
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
import { vistaValutazioni } from './views/assessments.js'
import { vistaCheck } from './views/check.js'

function vistaCorrente (): Figlio {
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
      return vistaProgetti()
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
 * La vista come anello della catena di telaio (`dom.ts`): senza, ogni scatola
 * che scorre dentro la vista si ricreava a ogni disegno e il gesto in corsa si
 * perdeva. La chiave è la vista; cambiando posto cambia già lo scorrimento di
 * `main.contenuto`, che non si tiene, e con lui la radice. Una vista che si
 * dà una chiave sua (il calendario) la tiene. Sulle radici delle viste non ci
 * sono ascoltatori: quelli del primo disegno resterebbero.
 */
function vistaNelTelaio (): Figlio {
  const vista = vistaCorrente()
  if (vista instanceof HTMLElement && vista.dataset.telaio === undefined) {
    // testo-fisso: una chiave, non un testo
    vista.dataset.telaio = `vista:${stato.vista}`
  }
  return vista
}

/**
 * La riga che compare quando nei file qualcosa non torna (un riferimento
 * rotto): lo dice e, se la correzione non perde niente, offre il gesto.
 */
function barraAvvisi (): Figlio {
  if (stato.avvisi.length === 0) return null
  const correzioni = riparazioni(stato.registro)
  const t = testi()

  return avviso(
    h(
      'div',
      { class: 'avviso__riga' },
      h(
        'span',
        null,
        t.nonTornano(stato.avvisi.length),
        stato.avvisi[0],
      ),
      correzioni.length > 0
        ? pulsante({
            testo: t.ripara,
            simbolo: 'spunta',
            variante: 'sottile',
            al: async () => {
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
            },
          })
        : null,
      pulsante({
        testo: parole().dettagli,
        variante: 'fantasma',
        // Dritto al dialogo che elenca i riferimenti da sistemare.
        al: () => apriInformazioniDocumento(),
      }),
    ),
    'attenzione',
  )
}

/**
 * Il filo che dice che il registro sta lavorando. Sta fuori da `#radice` e non
 * passa dal disegno: accenderlo e spegnerlo, due volte per ogni richiesta lenta,
 * non rifà la pagina. Resta finché l'ultima risposta torna, anche quando un
 * ridisegno porta via il pulsante con la sua rotella. Lo accende il canale
 * (`iscrivitiAttesa` in `main.ts`).
 */
let filo: HTMLElement | null = null

export function mostraFiloDiLavoro (acceso: boolean): void {
  if (!filo) {
    filo = h('div', { class: 'filo-lavoro', hidden: true, attr: { role: 'status', 'aria-live': 'polite' } }, h('span', null))
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
  'pagina.corso.piani',
  'pagina.corso.progetti',
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

export function guscio (): Figlio {
  if (!stato.caricato) {
    return h('div', { class: 'caricamento' }, testi().apertura)
  }
  return h(
    'div',
    {
      // Nodo di telaio, tenuto fra un disegno e l'altro (`aggiornaElemento`): il
      // suo ascoltatore non dipende dallo stato.
      dataset: { telaio: 'guscio' },
      class: [
        'guscio',
        sidebarAperta() && 'guscio--con-sidebar',
        assistenteAperto() && 'guscio--con-assistente',
      ],
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Escape' && chiudiSidebarMobile()) evento.preventDefault()
      },
    },
    // La barra del titolo della finestra, disegnata dal registro: sopra tutto,
    // anche sopra la navigazione, perché è il bordo della finestra (`ui/titleBar.ts`).
    barraTitolo(),
    // La barra dei comandi sta nel telaio e non nella vista: parla di tutto il registro.
    sfondoSidebar(),
    sidebar(),
    barraComandi(),
    h(
      'main',
      // Tenuto anche lui finché si guarda la stessa cosa: è la scatola che scorre.
      { class: 'contenuto', dataset: { telaio: 'contenuto', scorrimento: chiaveDellaPagina() } },
      barraAvvisi(),
      vistaNelTelaio(),
    ),
    // L'assistente è una colonna della griglia, non un velo: chiuso non disegna
    // niente (`ui/assistant.ts`).
    pannelloAssistente(),
    barraStato(),
  )
}
