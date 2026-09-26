// Il dettaglio di una lezione: la schermata che si tiene aperta durante l'ora.
// Tutto si salva da sé: l'appello al clic, i testi quando si lascia il campo.

import {
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  minutiTotali,
  nomeCompleto,
  riepilogaPresenze,
} from '../../domain/calculations.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { minuscolo } from '../../i18n/index.js'
import { formattaData, formattaDurata } from '../../domain/dates.js'
import { numeriDelleLezioni } from '../../domain/courses.js'
import type { Lezione, Osservazione } from '../../domain/models.js'
import {
  campo,
  datoSintetico,
  pastiglia,
  pulsante,
  quieto,
  scheda,
  selettore,
  statoVuoto,
  tendina,
  testataVista,
  type TonoPastiglia,
} from '../components/base.js'
import { icona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { pannelloConsegne } from './assignments.js'
import { pannelloCheckDellOra } from './check.js'
import { pannelloRiconsegneDellOra } from './returns.js'
import { moduloOsservazione } from '../forms.js'
import { PORZIONI_LEZIONE } from '../tabs.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  classeDiLezione,
  lezioneDiRiferimento,
  lezionePerId,
  lezioniDiCorso,
  stato,
  titoloDiLezione,
  type SchedaLezione,
} from '../state.js'
import { pannelloAppello } from './lesson/attendance.js'
import { matriceOsservata, noteDellaMatrice } from './lesson/behaviour.js'
import { pannelloPiano } from './lesson/plan.js'
import { pannelloValutazioni } from './lesson/assessments.js'
import { testi } from './lesson.testi.js'

// ------------------------------------------------------------------ osservazioni

const TONI_OSSERVAZIONE: Record<Osservazione['tipo'], TonoPastiglia> = {
  nota: 'neutro',
  merito: 'positivo',
  disciplina: 'negativo',
  compiti: 'attenzione',
  materiale: 'attenzione',
  colloquio: 'informativo',
}

function pannelloOsservazioni (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const t = testi()
  const L = lessico()

  return scheda({
    titolo: Molti(L.osservazione),
    aiuto: t.osservazioniAiuto,
    azioni: pulsante({
      testo: parole().aggiungi,
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloOsservazione(lezione, classe),
    }),
    contenuto: h(
      'div',
      { class: 'colonna' },
      matriceOsservata(lezione, classe),
      noteDellaMatrice(lezione, classe),
      lezione.osservazioni.length === 0
        ? quieto(t.nessunaOsservazione)
        : h(
            'ul',
            { class: 'osservazioni' },
            ...[...lezione.osservazioni]
              .sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? '') || a.creataIl.localeCompare(b.creataIl))
              .map((osservazione) =>
                h(
                  'li',
                  { class: 'osservazione' },
                  h(
                    'div',
                    { class: 'osservazione__testata' },
                    pastiglia(
                      minuscolo(L.tipiOsservazione[osservazione.tipo]),
                      TONI_OSSERVAZIONE[osservazione.tipo],
                    ),
                    h(
                      'span',
                      { class: 'osservazione__chi' },
                      osservazione.allievoId
                        ? nomi.get(osservazione.allievoId) ?? t.pifNonInElenco
                        : t.tuttaLaClasse,
                    ),
                    osservazione.ora ? h('span', { class: 'osservazione__ora' }, osservazione.ora) : null,
                    pulsante({
                      simbolo: 'matita',
                      variante: 'fantasma',
                      titolo: parole().modifica,
                      al: () => moduloOsservazione(lezione, classe, osservazione),
                    }),
                  ),
                  h('p', { class: 'osservazione__testo' }, osservazione.testo),
                ),
              ),
          ),
    ),
  })
}

// ------------------------------------------------------------------ contenuti

/** I campi di testo lunghi, salvati quando si lascia il campo. */
function pannelloContenuti (lezione: Lezione): HTMLElement {
  // Un campo alla volta e non la lezione della chiusura del render: il secondo
  // salvataggio rimanderebbe la copia vecchia e cancellerebbe il primo.
  const salvaCampo = async (chiave: 'argomenti' | 'materiali' | 'consuntivo', valore: string) => {
    if ((lezione[chiave] ?? '') === valore) return
    await azione(
      chiave === 'argomenti'
        ? { tipo: 'lezione.testi', lezioneId: lezione.id, argomenti: valore }
        : chiave === 'materiali'
          ? { tipo: 'lezione.testi', lezioneId: lezione.id, materiali: valore }
          : { tipo: 'lezione.testi', lezioneId: lezione.id, consuntivo: valore },
    )
  }

  const t = testi()
  return scheda({
    titolo: t.svolgimento,
    sottotitolo: t.siSalva,
    contenuto: h(
      'div',
      { class: 'modulo' },
      campo({
        nome: 'argomenti',
        etichetta: t.argomenti,
        tipo: 'textarea',
        righe: 4,
        valore: lezione.argomenti ?? '',
        segnaposto: t.argomentiSegnaposto,
        // testo-fisso: chiave di fuoco
        fuoco: `lezione-argomenti-${lezione.id}`,
        al: (valore) => void salvaCampo('argomenti', valore),
      }),
      campo({
        nome: 'materiali',
        etichetta: t.materiali,
        tipo: 'textarea',
        righe: 2,
        valore: lezione.materiali ?? '',
        segnaposto: t.materialiSegnaposto,
        // testo-fisso: chiave di fuoco
        fuoco: `lezione-materiali-${lezione.id}`,
        al: (valore) => void salvaCampo('materiali', valore),
      }),
      campo({
        nome: 'consuntivo',
        etichetta: t.consuntivo,
        tipo: 'textarea',
        righe: 4,
        valore: lezione.consuntivo ?? '',
        segnaposto: t.consuntivoSegnaposto,
        // testo-fisso: chiave di fuoco
        fuoco: `lezione-consuntivo-${lezione.id}`,
        al: (valore) => void salvaCampo('consuntivo', valore),
      }),
    ),
  })
}

// ------------------------------------------------------------------ navigazione

/**
 * Come una lezione si legge nella tendina: numero d'ordine (le annullate non
 * contano), giorno della settimana, data e ora.
 */
function etichettaLezione (altra: Lezione, numero: number | null): string {
  const inizio = inizioLezione(altra)
  const titolo = titoloDiLezione(altra)
  const segno = altra.stato === 'svolta' ? '✓ ' : altra.stato === 'annullata' ? '× ' : ''
  const ordine = numero === null ? '' : `${numero}. `
  const giorno = formattaData(altra.data, 'giorno')
  return (
    `${segno}${ordine}${giorno} ${formattaData(altra.data)}` +
    `${inizio ? ` · ${inizio}` : ''}${titolo ? ` · ${titolo}` : ''}`
  )
}

/**
 * Le ore del corso come si leggono nella tendina. La legge anche la veduta
 * dell'assistente, per nominare l'ora come la vede chi guarda; sta qui perché
 * qui stanno `etichettaLezione` e la numerazione.
 */
export function oreDelCorso (lezione: Lezione): Array<{ id: string, etichetta: string }> {
  const sorelle = lezioniDiCorso(lezione.corsoId)
  // Contati una volta, come nel resto del registro: ripartono a ogni semestre
  // (`numeriDelleLezioni`).
  const numeri = numeriDelleLezioni(stato.registro, sorelle)
  return sorelle.map((altra) => ({
    id: altra.id,
    etichetta: etichettaLezione(altra, numeri.get(altra.id) ?? null),
  }))
}

/**
 * Il navigatore del registro: l'ora, dentro il corso scelto in cima. Il corso
 * si sceglie solo dalla barra in cima.
 */
function navigatoreRegistro (lezione: Lezione): Figlio {
  const sorelle = lezioniDiCorso(lezione.corsoId)
  const posizione = sorelle.findIndex((l) => l.id === lezione.id)
  const ore = oreDelCorso(lezione)
  const t = testi()

  // L'ora precedente e successiva dello stesso corso.
  const vaiA = (indice: number) => {
    const bersaglio = sorelle[indice]
    if (bersaglio) aggiorna({ lezioneId: bersaglio.id })
  }

  return h(
    'div',
    { class: 'navigatore-registro' },
    icona('agenda', 'navigatore-registro__simbolo'),
    pulsante({
      simbolo: 'sinistra',
      variante: 'fantasma',
      titolo: t.precedente,
      disabilitato: posizione <= 0,
      al: () => vaiA(posizione - 1),
    }),
    tendina({
      voci: ore.map((ora) => ({ valore: ora.id, testo: ora.etichetta })),
      valore: lezione.id,
      etichetta: t.lezioneDelCorso,
      classe: 'navigatore-registro__lezione',
      al: (scelto) => aggiorna({ lezioneId: scelto }),
    }),
    pulsante({
      simbolo: 'destra',
      variante: 'fantasma',
      titolo: t.successiva,
      disabilitato: posizione < 0 || posizione >= sorelle.length - 1,
      al: () => vaiA(posizione + 1),
    }),
    h(
      'span',
      { class: 'navigatore-registro__conta' },
      posizione >= 0 ? t.posizione(posizione + 1, sorelle.length) : t.lezioni(sorelle.length),
    ),
  )
}

// ------------------------------------------------------------------ vista

export function vistaLezione (): Figlio {
  const lezione = lezionePerId(stato.lezioneId)
  const t = testi()
  if (!lezione) {
    // Registro vuoto o lezione cancellata altrove: si offre un'ora da aprire, se
    // c'è, altrimenti il calendario.
    const riferimento = lezioneDiRiferimento()
    return statoVuoto({
      simbolo: 'agenda',
      titolo: t.vuotoTitolo,
      testo: t.vuotoTesto,
      azione: riferimento
        ? pulsante({
            testo: t.apriUltima,
            variante: 'primario',
            simbolo: 'agenda',
            al: () => aggiorna({ lezioneId: riferimento }),
          })
        : pulsante({
            testo: t.vaiAlCalendario,
            variante: 'primario',
            al: () => aggiorna({ vista: 'calendario' }),
          }),
    })
  }

  const classe = classeDiLezione(lezione)
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const stati = lessico().statiLezione

  return h(
    'div',
    { class: 'vista vista--lezione' },
    testataVista({
      // Compatta: classe, giorno e numeri dell'ora su una riga, per lasciare in vista
      // l'appello e le consegne.
      compatta: true,
      // Il titolo è la classe; di che cosa parla l'ora lo dice il piano sotto.
      titolo: classe?.nome ?? t.classeEliminata,
      sottotitolo:
        `${formattaData(lezione.data, 'lungo')} · ` +
        `${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}` +
        (lezione.aula ? t.aula(lezione.aula) : ''),
      // Niente pulsanti qui: i gesti sull'ora stanno nella riga delle azioni.
      contorno: h(
        'div',
        { class: 'sintesi' },
        h(
          'div',
          { class: 'sintesi__stato' },
          lezione.stato === 'svolta'
            ? pastiglia(minuscolo(stati.svolta), 'positivo', 'spunta')
            : lezione.stato === 'annullata'
              ? pastiglia(minuscolo(stati.annullata), 'negativo', 'chiudi')
              : pastiglia(minuscolo(stati.pianificata), 'informativo', 'orologio'),
        ),
        datoSintetico(
          t.presenti,
          `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`,
        ),
        datoSintetico(t.assenti, String(riepilogo.assenti + riepilogo.parziali)),
        riepilogo.udSenzaAppello > 0
          ? datoSintetico(t.daFare, String(riepilogo.udSenzaAppello), 'attenzione')
          : null,
        datoSintetico(t.ritardi, String(riepilogo.ritardi)),
        datoSintetico(t.durata, formattaDurata(minutiEffettivi(lezione))),
        minutiTotali(lezione) !== minutiEffettivi(lezione)
          ? datoSintetico(t.conPause, formattaDurata(minutiTotali(lezione)))
          : null,
      ),
    }),
    navigatoreRegistro(lezione),
    // Tre schede per tre momenti: amministrazione mentre la classe entra, lezione
    // durante, annotazioni (con lo svolgimento) dopo.
    // I nomi delle linguette vengono da `tabs.ts`, che li dà anche al percorso
    // nella barra del titolo.
    selettore(stato.schedaLezione, [...PORZIONI_LEZIONE], (scelta: SchedaLezione) =>
      aggiorna({ schedaLezione: scelta }),
    ),
    stato.schedaLezione === 'amministrazione'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloAppello(lezione)),
          h(
            'div',
            { class: 'colonna' },
            pannelloConsegne(lezione),
            // Il check sotto le consegne: si spunta nello stesso momento, persona per persona.
            pannelloCheckDellOra(lezione),
            // Le prove da ridare accanto alle consegne da ritirare: stesso momento.
            pannelloRiconsegneDellOra(lezione),
          ),
        )
      : null,
    stato.schedaLezione === 'lezione'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloPiano(lezione)),
          h('div', { class: 'colonna' }, pannelloValutazioni(lezione)),
        )
      : null,
    stato.schedaLezione === 'annotazioni'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloContenuti(lezione)),
          h('div', { class: 'colonna' }, pannelloOsservazioni(lezione)),
        )
      : null,
  )
}
