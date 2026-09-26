// Il calendario: settimana, mese, agenda, anno, cioè modi di guardare le stesse
// lezioni con un solo giorno di riferimento.
// Qui la pagina: testata con la sintesi e scelta della vista. In `calendar/`
// una vista per file (`week`, `month`, `agenda`, `year`) e le parti comuni:
// `lessonBlock`, `menus`, `common`, `drag`, `ics`, `birthdays`, `weekStrip`,
// `editor`.

import { minutiEffettivi, contaUd } from '../../domain/calculations.js'
import {
  formattaData,
  formattaDurata,
  formattaMese,
  giornoSettimana,
  settimanaDi,
  settimanaIso,
} from '../../domain/dates.js'
import { avviso, datoSintetico, pulsante, testataVista } from '../components/base.js'
import { conferma } from '../components/modal.js'
import { azione } from '../bridge.js'
import { lezioniInChiusura } from '../../domain/timetable.js'
import type { AnnoScolastico } from '../../domain/models.js'
import { parole } from '../../domain/words.testi.js'
import { statoVuotoAnno } from '../components/filters.js'
import { h, type Figlio } from '../dom.js'
import { guastoCalendarioEsterno } from '../externalCalendar.js'
import { moduloAnno } from '../forms.js'
import { annoCorrente, lezioniInAgenda, semestrePerData, stato } from '../state.js'
import { chiusura, giorniVisibili } from './calendar/common.js'
import { inModifica } from './calendar/editor.js'
import { vistaAnno } from './calendar/year.js'
import { vistaAgenda } from './calendar/agenda.js'
import { vistaMese } from './calendar/month.js'
import { vistaSettimana } from './calendar/week.js'
import { testi } from './calendar.testi.js'

/**
 * Le ore della settimana che cadono in un giorno di chiusura (vacanza
 * importata dopo, ora messa a mano). Si guardano tutti e sette i giorni. In
 * «Modifica» il pulsante le toglie tutte; Ctrl+Z le riporta.
 */
function avvisoChiusure (anno: AnnoScolastico): HTMLElement | null {
  const giorni = settimanaDi(stato.data)
  const dal = giorni[0] ?? stato.data
  const al = giorni[giorni.length - 1] ?? stato.data
  const inChiusura = lezioniInChiusura(stato.registro, anno, dal, al)
  if (inChiusura.length === 0) return null
  const nomi = [...new Set(inChiusura.map((l) => chiusura(l.data)))].join(', ')
  const t = testi()
  return avviso(
    h(
      'span',
      { class: 'avviso-chiusure' },
      t.inChiusura(inChiusura.length, nomi),
      inModifica()
        ? pulsante({
            testo: t.rimuovi,
            simbolo: 'cestino',
            variante: 'sottile',
            al: async () => {
              const conDati = inChiusura.filter((l) => l.presenze.length > 0 || l.stato !== 'pianificata')
              const sicuro = await conferma({
                titolo: t.togliereTitolo(inChiusura.length),
                testo:
                  (conDati.length > 0 ? t.conDati(conDati.length) : '') + t.restano,
                testoConferma: parole().togli,
                pericolo: true,
              })
              if (!sicuro) return
              await azione({ tipo: 'lezione.togliNelleChiusure', dal, al })
            },
          })
        : t.inModifica(parole().modifica),
    ),
    'attenzione',
  )
}

export function vistaCalendario (): Figlio {
  const anno = annoCorrente()
  const modo = stato.modoCalendario
  const t = testi()

  if (!anno) {
    return statoVuotoAnno({
      testo: t.vuoto,
      crea: () => moduloAnno(),
    })
  }

  // Solo i giorni che la griglia mostra, come la striscia.
  const settimana = settimanaDi(stato.data).filter((data) =>
    giorniVisibili().includes(giornoSettimana(data)),
  )
  const primoGiorno = settimana[0] ?? stato.data
  const ultimoGiorno = settimana[settimana.length - 1] ?? stato.data
  // Il semestre che si sta guardando.
  const semestre = semestrePerData(stato.data)
  const dove =
    modo === 'anno'
      ? `${anno.etichetta} · ${formattaData(anno.inizio)} → ${formattaData(anno.fine)}`
      : modo === 'mese'
        ? formattaMese(stato.data)
        : t.settimana(
            formattaData(primoGiorno),
            formattaData(ultimoGiorno),
            settimanaIso(stato.data),
          )
  // Nell'anno il semestre non si aggiunge: ci sono tutti e due.
  const conSemestre = semestre && modo !== 'anno' ? `${dove} · ${semestre.etichetta}` : dove
  // Un calendario ICS che non si legge si dice qui, o la corsia vuota ingannerebbe.
  const guasto = modo === 'anno' ? null : guastoCalendarioEsterno()
  const sottotitolo = guasto ? t.guastoIcs(conSemestre, guasto) : conSemestre

  const dellaSettimana = lezioniInAgenda().filter((l) => settimana.includes(l.data))
  const { minutiUd } = stato.registro.impostazioni
  const udSettimana =
    dellaSettimana.reduce((somma, lezione) => somma + contaUd(lezione, minutiUd), 0)
  const oreSettimana = dellaSettimana.reduce((somma, l) => somma + minutiEffettivi(l), 0)

  return h(
    'div',
    // Il modo sta nella classe come appiglio per gli stili; la catena delle
    // altezze sta in `calendar.css`.
    // testo-fisso: classi CSS, non testo
    { class: ['vista', 'vista--calendario', `vista--calendario-${modo}`, inModifica() && 'vista--calendario-editor'] },
    testataVista({
      // Compatta: la griglia vuole tutta l'altezza.
      compatta: true,
      titolo: t.titolo,
      sottotitolo,
      // Niente pulsanti né filtri: i comandi stanno nella riga delle azioni, classe
      // e corso nella riga delle scelte della barra. Nel contorno solo numeri.
      contorno: [
        h(
          'div',
          { class: 'sintesi' },
          datoSintetico(t.lezioniSettimana, String(dellaSettimana.length)),
          datoSintetico(t.udSettimana, String(udSettimana)),
          datoSintetico(t.oreEffettive, formattaDurata(oreSettimana)),
          datoSintetico(
            t.daSvolgere,
            String(dellaSettimana.filter((l) => l.stato === 'pianificata').length),
          ),
        ),
      ],
    }),
    modo === 'settimana' ? avvisoChiusure(anno) : null,
    modo === 'settimana'
      ? vistaSettimana()
      : modo === 'mese'
        ? vistaMese()
        : modo === 'anno'
          ? vistaAnno()
          : vistaAgenda(),
  )
}
