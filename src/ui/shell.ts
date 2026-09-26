import { sidebar, sidebarAperta } from './sidebar.js'
import { assistenteAperto, pannelloAssistente } from './assistant.js'
// Telaio: navigazione e comandi, contenuto, stato.

import { riparazioni } from '../domain/repairs.js'
import { avviso, pulsante } from './components/base.js'
import { conferma } from './components/modal.js'
import { barraProiezione } from './components/projection.js'
import { notifica } from './components/notifications.js'
import { h, type Figlio } from './dom.js'
import { azione, lavoroInCorso } from './bridge.js'
import { aggiorna, stato } from './state.js'
import { barraComandi } from './commandBar.js'
import { barraStato } from './statusBar.js'
import { barraTitolo } from './titleBar.js'
import { testi } from './shell.testi.js'
import { parole } from '../domain/words.testi.js'
import { vistaAllievo } from './views/student.js'
import { vistaCalendario } from './views/calendar.js'
import { vistaOggi } from './views/today.js'
import { vistaClassi } from './views/classes.js'
import { vistaPersone } from './views/people.js'
import { vistaDocenteClasse } from './views/classTeacher.js'
import { vistaGuida } from './views/help.js'
import { vistaDaSmistare } from './views/toSort.js'
import { vistaTodo } from './views/todo.js'
import { vistaCorsi } from './views/courses.js'
import { vistaDocumenti } from './views/documents.js'
import { vistaImpostazioni } from './views/settings.js'
import { vistaLezione } from './views/lesson.js'
import { vistaMappa } from './views/map.js'
import { vistaPiani } from './views/plans.js'
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
    case 'valutazioni':
      return vistaValutazioni()
    case 'check':
      return vistaCheck()
    case 'impostazioni':
      return vistaImpostazioni()
    case 'modelli':
      // `aggiorna` porta `'modelli'` sull'intestazione delle impostazioni dell'anno.
      return vistaImpostazioni()
    case 'modelliLinguistici':
      // `aggiorna` porta questa vista alle impostazioni del programma.
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
        // Dritto alla sezione che elenca i riferimenti da sistemare.
        al: () => aggiorna({ vista: 'impostazioni', ambitoImpostazioni: 'documento', schedaDocumento: 'file' }),
      }),
    ),
    'attenzione',
  )
}

/**
 * Il filo che dice che il registro sta lavorando. Vive sul telaio e legge il
 * canale, non lo stato: resta finché l'ultima risposta torna, anche quando un
 * ridisegno porta via il pulsante con la sua rotella.
 */
function filoDiLavoro (): Figlio {
  if (!lavoroInCorso()) return null
  return h(
    'div',
    {
      class: 'filo-lavoro',
      attr: { role: 'status', 'aria-live': 'polite', 'aria-label': testi().staLavorando },
    },
    h('span', null),
  )
}

/**
 * La chiave di scorrimento di `.contenuto`: che cosa si guarda (pagina,
 * persona, classe, corso, ora). Cambiandola si riparte dall'alto; restando
 * sulla stessa, il ridisegno a ogni gesto non fa perdere il punto.
 */
function chiaveDellaPagina (): string {
  const soggetto = [stato.allievoId, stato.classeId, stato.corsoId, stato.lezioneId]
  return ['pagina', stato.vista, stato.paginaId ?? '', ...soggetto.map((id) => id ?? '')].join(':')
}

export function guscio (): Figlio {
  if (!stato.caricato) {
    return h('div', { class: 'caricamento' }, testi().apertura)
  }
  return h(
    'div',
    {
      class: [
        'guscio',
        sidebarAperta() && 'guscio--con-sidebar',
        assistenteAperto() && 'guscio--con-assistente',
      ],
    },
    filoDiLavoro(),
    // La barra del titolo della finestra, disegnata dal registro: sopra tutto,
    // anche sopra la navigazione, perché è il bordo della finestra (`ui/titleBar.ts`).
    barraTitolo(),
    // La barra dei comandi sta nel telaio e non nella vista: parla di tutto il registro.
    sidebar(),
    barraComandi(),
    h(
      'main',
      { class: 'contenuto', dataset: { scorrimento: chiaveDellaPagina() } },
      barraProiezione(),
      barraAvvisi(),
      vistaCorrente(),
    ),
    // L'assistente è una colonna della griglia, non un velo: chiuso non disegna
    // niente (`ui/assistant.ts`).
    pannelloAssistente(),
    barraStato(),
  )
}
