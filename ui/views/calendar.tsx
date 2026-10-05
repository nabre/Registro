// Il calendario: settimana, mese, agenda, anno, cioè modi di guardare le stesse
// lezioni con un solo giorno di riferimento.
// Qui la pagina: testata con la sintesi e scelta della vista. In `calendar/`
// una vista per file (`week`, `month`, `agenda`, `year`) e le parti comuni:
// `lessonBlock`, `menus`, `common`, `drag`, `ics`, `birthdays`, `weekStrip`,
// `editor`.

import type { ReactElement } from 'react'

import { minutiEffettivi, contaUd } from '#core/dominio/calculations.js'
import { formattaData, formattaDurata, formattaMese, giornoSettimana, nomeSemestre, settimanaDi, settimanaIso } from '#core/dominio/dates.js'
import { Avviso, DatoSintetico, Pulsante, TestataVista } from '#ui/components/base.js'
import { conferma } from '#ui/components/modal.js'
import { azione } from '#ui/bridge.js'
import { lezioniInChiusura } from '#core/dominio/timetable.js'
import type { AnnoScolastico } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { guastoCalendarioEsterno } from '#ui/externalCalendar.js'
import { moduloAnno } from '#ui/forms.js'
import { annoCorrente, lezioniInAgenda, semestrePerData, stato } from '#ui/state.js'
import { chiusura, giorniVisibili } from './calendar/common.js'
import { inModifica } from './calendar/editor.js'
import { VistaAnno } from './calendar/year.js'
import { VistaAgenda } from './calendar/agenda.js'
import { VistaMese } from './calendar/month.js'
import { VistaSettimana } from './calendar/week.js'
import { testi } from './calendar.testi.js'

/**
 * Le ore della settimana che cadono in un giorno di chiusura (vacanza
 * importata dopo, ora messa a mano). Si guardano tutti e sette i giorni. In
 * «Modifica» il pulsante le toglie tutte; Ctrl+Z le riporta.
 */
function AvvisoChiusure ({ anno }: { anno: AnnoScolastico }): ReactElement | null {
  const giorni = settimanaDi(stato.data)
  const dal = giorni[0] ?? stato.data
  const al = giorni[giorni.length - 1] ?? stato.data
  const inChiusura = lezioniInChiusura(stato.registro, anno, dal, al)
  if (inChiusura.length === 0) return null
  const nomi = [...new Set(inChiusura.map((l) => chiusura(l.data)))].join(', ')
  const t = testi()
  return (
    <Avviso tono="attenzione">
      <span className="avviso-chiusure">
        {t.inChiusura(inChiusura.length, nomi)}
        {inModifica()
          ? (
              <Pulsante
                testo={t.rimuovi}
                simbolo="cestino"
                variante="sottile"
                al={async () => {
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
                }}
              />
            )
          : t.inModifica(parole().modifica)}
      </span>
    </Avviso>
  )
}

function VistaCalendario (): ReactElement {
  const anno = annoCorrente()
  const modo = stato.modoCalendario
  const t = testi()

  if (!anno) {
    return <StatoVuotoAnno testo={t.vuoto} crea={() => moduloAnno()} />
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
  const conSemestre = semestre && modo !== 'anno' ? `${dove} · ${nomeSemestre(semestre)}` : dove
  // Un calendario ICS che non si legge si dice qui, o la corsia vuota ingannerebbe.
  const guasto = modo === 'anno' ? null : guastoCalendarioEsterno()
  const sottotitolo = guasto ? t.guastoIcs(conSemestre, guasto) : conSemestre

  // I conti sono del periodo che la pagina mostra: in Mese e Anno la settimana
  // scelta non si vede, e i suoi numeri accanto al mese leggerebbero come del mese.
  // L'agenda resta sulla settimana, che il sottotitolo dice.
  const periodo = modo === 'mese' || modo === 'anno' ? modo : 'settimana'
  const mese = stato.data.slice(0, 7)
  const delPeriodo = periodo === 'anno'
    ? lezioniInAgenda()
    : lezioniInAgenda().filter((l) => (periodo === 'mese' ? l.data.startsWith(mese) : settimana.includes(l.data)))
  const { minutiUd } = stato.registro.impostazioni
  const udPeriodo = delPeriodo.reduce((somma, lezione) => somma + contaUd(lezione, minutiUd), 0)
  const orePeriodo = delPeriodo.reduce((somma, l) => somma + minutiEffettivi(l), 0)

  return (
    <div
      // Il modo sta nella classe come appiglio per gli stili; la catena delle
      // altezze sta in `calendar.css`.
      className={classi(
        'vista',
        'vista--calendario',
        // testo-fisso: classi CSS, non testo
        `vista--calendario-${modo}`,
        inModifica() && 'vista--calendario-editor',
      )}
      // La chiave di telaio propria del calendario, anello della catena fino alla
      // fila delle settimane (`weekStrip.tsx`).
      data-telaio="calendario"
    >
      <TestataVista
        // Compatta: la griglia vuole tutta l'altezza.
        titolo={t.titolo}
        sottotitolo={sottotitolo}
        // Niente pulsanti né filtri: i comandi stanno nella riga delle azioni, classe
        // e corso nella riga delle scelte della barra. Nel contorno solo numeri.
        contorno={(
          <div className="sintesi">
            <DatoSintetico etichetta={t.lezioniNel[periodo]} valore={String(delPeriodo.length)} />
            <DatoSintetico etichetta={t.udNel[periodo]} valore={String(udPeriodo)} />
            <DatoSintetico etichetta={t.oreEffettive} valore={formattaDurata(orePeriodo)} />
            <DatoSintetico
              etichetta={t.daSvolgere}
              valore={String(delPeriodo.filter((l) => l.stato === 'pianificata').length)}
            />
          </div>
        )}
      />
      {modo === 'settimana' ? <AvvisoChiusure anno={anno} /> : null}
      {modo === 'settimana'
        ? <VistaSettimana />
        : modo === 'mese'
          ? <VistaMese />
          : modo === 'anno'
            ? <VistaAnno />
            : <VistaAgenda />}
    </div>
  )
}

export function vistaCalendario (): ReactElement {
  return <VistaCalendario />
}
