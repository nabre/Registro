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
import { vistaAllievo } from './views/student.js'
import { vistaCalendario } from './views/calendar.js'
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
import { vistaModelli } from './views/templates.js'
import { vistaPiani } from './views/plans.js'
import { vistaModelliLinguistici } from './views/languageModels.js'
import { vistaValutazioni } from './views/assessments.js'

function vistaCorrente (): Figlio {
  switch (stato.vista) {
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
    case 'impostazioni':
      return vistaImpostazioni()
    case 'modelli':
      return vistaModelli()
    case 'modelliLinguistici':
      return vistaModelliLinguistici()
    case 'mappa':
      return vistaMappa()
    case 'guida':
      return vistaGuida()
  }
}

/**
 * La riga che compare quando qualcosa nei file non torna più.
 *
 * Stava solo in fondo alle Impostazioni, dove nessuno la cercava: un corso che
 * ha perso la materia si vede come «materia sparita» in tre viste, e da lì non
 * si capisce né perché né come rimediare. Qui lo dice, e se la correzione è
 * fra quelle che non perdono niente offre anche il gesto per farla.
 */
function barraAvvisi (): Figlio {
  if (stato.avvisi.length === 0) return null
  const correzioni = riparazioni(stato.registro)

  return avviso(
    h(
      'div',
      { class: 'avviso__riga' },
      h(
        'span',
        null,
        `${stato.avvisi.length} riferiment${stato.avvisi.length === 1 ? 'o' : 'i'} non torna${stato.avvisi.length === 1 ? '' : 'no'}: `,
        stato.avvisi[0],
      ),
      correzioni.length > 0
        ? pulsante({
            testo: 'Ripara',
            simbolo: 'spunta',
            variante: 'sottile',
            al: async () => {
              const sicuro = await conferma({
                titolo: 'Riparare il registro?',
                testo: correzioni.map((c) => `• ${c.descrizione}`).join('\n'),
                testoConferma: 'Ripara',
              })
              if (!sicuro) return
              const risposta = await azione({ tipo: 'manutenzione.ripara' })
              // Il rifiuto lo ha gia' detto `azione`, e «niente da riparare» lo
              // dice l'host con parole sue: qui resta solo il caso in cui il
              // registro e' stato davvero rimesso a posto.
              //
              // Le riparazioni non sono gli avvisi uno a uno: fra quelle ci sono
              // anche correzioni che con i riferimenti non c'entrano — le
              // etichette dei telefoni — e la barra poteva restare dov'era dopo
              // un «Registro riparato.». Lo stato nuovo arriva prima della
              // risposta, quindi qui si sa già se qualcosa resta: lo si dice.
              if (!risposta.ok || risposta.messaggio) return
              const restano = stato.avvisi.length
              if (restano === 0) {
                notifica('Registro riparato.', 'successo')
                return
              }
              notifica(
                `Fatto quel che si poteva fare da sé; ${restano} ` +
                  `riferiment${restano === 1 ? 'o' : 'i'} da sistemare a mano: li elenca «Dettagli».`,
                'avviso',
              )
            },
          })
        : null,
      pulsante({
        testo: 'Dettagli',
        variante: 'fantasma',
        al: () => aggiorna({ vista: 'impostazioni' }),
      }),
    ),
    'attenzione',
  )
}

/**
 * Il filo che dice che il registro sta lavorando.
 *
 * Il pulsante premuto mostra la sua rotella, ma non basta: la vista si rifa' da
 * sola — l'orologio batte ogni minuto — e con lei sparisce il pulsante e la
 * sua rotella, mentre la richiesta e' ancora in volo. Questo filo vive sul
 * telaio, legge il canale e non lo stato dell'interfaccia, e resta finche'
 * l'ultima risposta non e' tornata: e' l'unica cosa che un ridisegno non puo'
 * portare via.
 */
function filoDiLavoro (): Figlio {
  if (!lavoroInCorso()) return null
  return h(
    'div',
    {
      class: 'filo-lavoro',
      attr: { role: 'status', 'aria-live': 'polite', 'aria-label': 'Il registro sta lavorando' },
    },
    h('span', null),
  )
}

/**
 * Che cosa si sta guardando, per ritrovare lo scorrimento dopo un ridisegno.
 *
 * `.contenuto` è la scatola che scorre per quasi ogni pagina del registro, ed
 * era l'unica grande assente da `data-scorrimento`: la sidebar, l'archivio, lo
 * sfoglio dei PDF e l'elenco delle persone lo avevano, la pagina intera no.
 * Siccome ogni cambio di stato rifà l'albero — una spunta sull'appello,
 * l'orologio che batte il minuto, una lettera scritta in un filtro — chi si era
 * scorso in fondo alle pendenze tornava in cima a ogni gesto.
 *
 * La chiave dice *che cosa* si guarda e non dove si è arrivati: cambiando
 * pagina, classe, corso, ora o persona si riparte dall'alto, che è giusto —
 * è un'altra cosa. Restando sulla stessa si resta dov'eravamo.
 */
function chiaveDellaPagina (): string {
  const soggetto = [stato.allievoId, stato.classeId, stato.corsoId, stato.lezioneId]
  return ['pagina', stato.vista, stato.paginaId ?? '', ...soggetto.map((id) => id ?? '')].join(':')
}

export function guscio (): Figlio {
  if (!stato.caricato) {
    return h('div', { class: 'caricamento' }, 'Apertura del registro…')
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
    // La barra del titolo: è quella della finestra, e la disegna il registro.
    // Sta sopra tutto — anche sopra la navigazione laterale — perché è il
    // bordo della finestra, e una barra del titolo che cominciasse a metà
    // larghezza non si prenderebbe per tale. Vedi `ui/titleBar.ts`.
    barraTitolo(),
    // I comandi in cima, e sotto la pagina. La barra sta dentro il telaio e
    // non dentro la vista: parla di tutto il registro — il documento, l'anno,
    // lo schermo per la classe — e una barra che si ridisegnasse con la pagina
    // sembrerebbe una parte della pagina.
    sidebar(),
    barraComandi(),
    h(
      'main',
      { class: 'contenuto', dataset: { scorrimento: chiaveDellaPagina() } },
      barraProiezione(),
      barraAvvisi(),
      vistaCorrente(),
    ),
    // A destra, accanto al lavoro: è una colonna della griglia e non un velo
    // sopra la pagina — chiuso non disegna niente e il contenuto riprende il
    // posto. Vedi `ui/assistant.ts`.
    pannelloAssistente(),
    barraStato(),
  )
}
