// Il dettaglio di una lezione: la schermata che si tiene aperta durante l'ora.
// Tutto si salva da sé: l'appello al clic, i testi quando si lascia il campo.

import {
  fineLezione,
  inizioLezione,
  nomeCompleto,
} from '#core/dominio/calculations.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import { formattaData } from '#core/dominio/dates.js'
import { numeriDelleLezioni } from '#core/dominio/courses.js'
import type { Lezione, Osservazione } from '#core/dominio/models.js'
import {
  avviso,
  campo,
  pastiglia,
  pulsante,
  quieto,
  scheda,
  selettore,
  statoVuoto,
  tendina,
  type TonoPastiglia,
} from '#ui/components/base.js'
import { inTelaio } from '#ui/components/table.js'
import { dataDiLezione } from '#ui/components/lessonDate.js'
import { h, type Figlio } from '#ui/dom.js'
import { pannelloConsegne } from './assignments.js'
import { pannelloCheckDellOra } from './check.js'
import { pannelloRiconsegneDellOra } from './assessments/returns.js'
import { moduloOsservazione, moduloSupplenza } from '#ui/forms.js'
import { porzioniLezione, schedaLezioneAperta } from '#ui/tabs.js'
import { apriLezione } from '#ui/pages.js'
import { azione } from '#ui/bridge.js'
import { consegneDellaLezione } from '#core/dominio/assignments.js'
import { checkDelCorso } from '#core/dominio/check.js'
import {
  aggiorna,
  classeDiLezione,
  lezioneDiRiferimento,
  lezionePerId,
  lezioniDiCorso,
  stato,
  vai,
  type SchedaLezione,
  type SchedaStrumentiLezione,
} from '#ui/state.js'
import { pannelloAppello } from './lesson/attendance.js'
import { matriceOsservata, noteDellaMatrice } from './lesson/behaviour.js'
import { pannelloPiano } from './lesson/plan.js'
import { schedaProgettoDellOra } from './lesson/project.js'
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

  return inTelaio(scheda({
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
      { class: 'colonna', dataset: { telaio: 'osservazioni:colonna' } },
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
  }), 'osservazioni')
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
 * contano), giorno della settimana, data e ora. Niente titolo del piano: la
 * tendina sceglie un'ora, non un argomento.
 */
function etichettaLezione (altra: Lezione, numero: number | null): string {
  const inizio = inizioLezione(altra)
  const segno = altra.stato === 'svolta' ? '✓ ' : altra.stato === 'annullata' ? '× ' : ''
  const ordine = numero === null ? '' : `${numero}. `
  return `${segno}${ordine}${formattaData(altra.data, 'settimana')}${inizio ? ` · ${inizio}` : ''}`
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
 * La testata della lezione: il titolo è il navigatore delle ore del corso
 * (prima, tendina, dopo), in riga con la classe, il giorno e l'orario. Il
 * corso si sceglie solo dalla barra in cima.
 */
function testataLezione (lezione: Lezione): HTMLElement {
  const sorelle = lezioniDiCorso(lezione.corsoId)
  const posizione = sorelle.findIndex((l) => l.id === lezione.id)
  const ore = oreDelCorso(lezione)
  const classe = classeDiLezione(lezione)
  const t = testi()

  // L'ora precedente e successiva dello stesso corso.
  const vaiA = (indice: number) => {
    const bersaglio = sorelle[indice]
    if (bersaglio) apriLezione(bersaglio.id)
  }

  return h(
    'header',
    { class: 'testata testata--compatta testata--lezione' },
    h(
      'h2',
      { class: 'testata__titolo navigatore-registro' },
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
        al: (scelto) => apriLezione(scelto),
      }),
      pulsante({
        simbolo: 'destra',
        variante: 'fantasma',
        titolo: t.successiva,
        disabilitato: posizione < 0 || posizione >= sorelle.length - 1,
        al: () => vaiA(posizione + 1),
      }),
    ),
    h(
      'p',
      { class: 'testata__sottotitolo' },
      h('strong', { class: 'testata__classe' }, classe?.nome ?? t.classeEliminata),
      ' · ',
      dataDiLezione(lezione.data),
      ` · ${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}` +
        (lezione.aula ? t.aula(lezione.aula) : ''),
    ),
    h('span', { class: 'testata__spazio' }),
    // Se manco io: il pacchetto per chi tiene l'ora (e le altre del giorno).
    lezione.stato === 'annullata'
      ? null
      : pulsante({
          simbolo: 'esporta',
          variante: 'fantasma',
          titolo: t.preparaSupplenza,
          al: () => moduloSupplenza(lezione),
        }),
    h(
      'span',
      { class: 'navigatore-registro__conta' },
      posizione >= 0 ? t.posizione(posizione + 1, sorelle.length) : t.lezioni(sorelle.length),
    ),
  )
}

// ------------------------------------------------------------------ ora svolta

/**
 * Il contenuto delle schede di un'ora svolta, in sola lettura: un `fieldset`
 * spento disattiva ogni controllo dentro, tastiera compresa. È solo cortesia:
 * le azioni rifiutano comunque (`aOraAperta`).
 */
function aOraSvolta (lezione: Lezione, chiave: string, ...figli: Figlio[]): Figlio[] {
  if (lezione.stato !== 'svolta') return figli
  return [
    h(
      'fieldset',
      // testo-fisso: una chiave, non un testo
      { class: 'lezione-chiusa', dataset: { telaio: `chiusa:${chiave}` }, attr: { disabled: true } },
      ...figli,
    ),
  ]
}

/** L'avviso in testa a un'ora svolta, con il gesto per riaprirla. */
function avvisoOraSvolta (lezione: Lezione): Figlio {
  if (lezione.stato !== 'svolta') return null
  const t = testi()
  return avviso(
    h(
      'span',
      { class: 'lezione-chiusa__avviso' },
      t.chiusa,
      pulsante({
        testo: t.riapri,
        titolo: t.riapriTitolo,
        simbolo: 'calendario',
        variante: 'sottile',
        al: () => azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: 'pianificata' }),
      }),
    ),
  )
}

// ------------------------------------------------------------------ strumenti della lezione

/**
 * Il pannello destro della scheda lezione: permette di passare con immediatezza
 * fra valutazioni (voti e prove), pendenze (consegne dell'ora) e check dell'ora.
 */
function pannelloStrumentiLezione (lezione: Lezione): HTMLElement {
  const t = testi()
  const strumenti = stato.schedaStrumentiLezione ?? 'valutazioni'

  // Quanti elementi per ciascuno strumento
  const momenti = stato.registro.valutazioni.filter((v) => v.lezioneId === lezione.id)
  const classe = classeDiLezione(lezione)
  const consegne = consegneDellaLezione(stato.registro, lezione, classe)
  const quanteConsegne =
    consegne.arretrate.length +
    consegne.scadono.length +
    consegne.date.length +
    consegne.aperte.length
  const check = checkDelCorso(stato.registro, lezione.corsoId)
  const quanteCheck = check?.colonne.length ?? 0

  const opzioniStrumenti: Array<{
    id: SchedaStrumentiLezione
    etichetta: string
    conto?: number
  }> = [
    {
      id: 'valutazioni',
      etichetta: t.schedaValutazioni,
      conto: momenti.length > 0 ? momenti.length : undefined,
    },
    {
      id: 'pendenze',
      etichetta: Molti(lessico().pendenza),
      conto: quanteConsegne > 0 ? quanteConsegne : undefined,
    },
    {
      id: 'check',
      etichetta: t.schedaCheck,
      conto: quanteCheck > 0 ? quanteCheck : undefined,
    },
  ]

  const selettoreStrumenti = h(
    'div',
    { class: 'selettore-strumenti' },
    ...opzioniStrumenti.map((opz) =>
      h(
        'button',
        {
          class: [
            'selettore-strumenti__voce',
            strumenti === opz.id && 'selettore-strumenti__voce--attiva',
          ],
          type: 'button',
          onclick: () => aggiorna({ schedaStrumentiLezione: opz.id }),
        },
        opz.etichetta,
        opz.conto !== undefined
          ? pastiglia(String(opz.conto), strumenti === opz.id ? 'informativo' : 'quiete')
          : null,
      ),
    ),
  )

  const pannelloCorrente =
    strumenti === 'pendenze'
      ? pannelloConsegne(lezione)
      : strumenti === 'check'
        ? (pannelloCheckDellOra(lezione) ?? h('div'))
        : pannelloValutazioni(lezione)

  return h(
    'div',
    // testo-fisso: una chiave, non un testo
    { class: 'strumenti-lezione', dataset: { telaio: `strumenti:${strumenti}` } },
    selettoreStrumenti,
    // Le linguette restano vive: si guarda anche un'ora chiusa.
    ...aOraSvolta(lezione, 'strumenti', pannelloCorrente),
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
      simbolo: 'lezione',
      titolo: t.vuotoTitolo,
      testo: t.vuotoTesto,
      azione: riferimento
        ? pulsante({
            testo: t.apriUltima,
            variante: 'primario',
            simbolo: 'lezione',
            al: () => apriLezione(riferimento),
          })
        : pulsante({
            testo: t.vaiAlCalendario,
            variante: 'primario',
            al: () => { vai({ pagina: 'pagina.calendario' }) },
          }),
    })
  }

  // La linguetta scelta, se quest'ora ce l'ha: Progetto c'è solo con un progetto nel piano.
  const aperta = schedaLezioneAperta(lezione)

  // Catena di telaio dalla radice della vista fino alle matrici che scorrono
  // di lato (appello, comportamento): un clic ridisegna tutto, e la scatola
  // ricreata tornerebbe a sinistra (`aggiornaElemento` in `dom.ts`).
  const colonne = (porzione: SchedaLezione, sinistra: Figlio[], destra: Figlio[]): HTMLElement =>
    h(
      'div',
      // testo-fisso: una chiave, non un testo
      { class: 'colonne colonne--lezione', dataset: { telaio: `lezione:${porzione}` } },
      h('div', { class: 'colonna', dataset: { telaio: 'sinistra' } }, ...sinistra),
      h('div', { class: 'colonna', dataset: { telaio: 'destra' } }, ...destra),
    )

  return h(
    'div',
    { class: 'vista vista--lezione', dataset: { telaio: 'lezione' } },
    testataLezione(lezione),
    avvisoOraSvolta(lezione),
    // Quattro schede: amministrazione mentre la classe entra, lezione durante,
    // progetto (compiti, matrice, giudizi) solo se il piano dell'ora lavora a
    // uno, annotazioni (con lo svolgimento) dopo.
    // I nomi delle linguette vengono da `tabs.ts`, che li dà anche al percorso
    // nella barra del titolo.
    selettore(aperta, [...porzioniLezione(lezione)], (scelta: SchedaLezione) =>
      aggiorna({ schedaLezione: scelta }),
    ),
    aperta === 'amministrazione'
      ? colonne('amministrazione', aOraSvolta(lezione, 'appello', pannelloAppello(lezione)), aOraSvolta(
          lezione,
          'consegne',
          pannelloConsegne(lezione),
          // Il check sotto le consegne: si spunta nello stesso momento, persona per persona.
          pannelloCheckDellOra(lezione),
          // Le prove da ridare accanto alle consegne da ritirare: stesso momento.
          pannelloRiconsegneDellOra(lezione),
        ))
      : null,
    aperta === 'lezione'
      ? colonne('lezione', aOraSvolta(lezione, 'piano', pannelloPiano(lezione)), [pannelloStrumentiLezione(lezione)])
      : null,
    aperta === 'progetto'
      ? (() => {
          const { scelta, sinistra, destra } = schedaProgettoDellOra(lezione)
          return [
            scelta,
            colonne(
              'progetto',
              aOraSvolta(lezione, 'progetto', ...sinistra),
              aOraSvolta(lezione, 'progetto-matrice', ...destra),
            ),
          ]
        })()
      : null,
    aperta === 'annotazioni'
      ? colonne(
          'annotazioni',
          aOraSvolta(lezione, 'svolgimento', pannelloContenuti(lezione)),
          aOraSvolta(lezione, 'osservazioni', pannelloOsservazioni(lezione)),
        )
      : null,
  )
}
