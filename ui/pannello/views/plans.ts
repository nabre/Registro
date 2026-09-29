// I piani lezione: la libreria delle scalette.
// Un piano non appartiene a una lezione: si prepara una volta e si assegna a
// più ore, anche di classi diverse. La scaletta si vede come striscia di tempo,
// per capire subito se le attività stanno nell'ora.

import {
  attivitaConPendenza,
  attivitaValutata,
  colonneCheckDi,
  conColonnaCheck,
  verificaColonna,
} from '../../../core/dominio/activities.js'
import {
  avanzamentoConsegna,
  consegneDelCorso,
  scadenzaConsegna,
} from '../../../core/dominio/assignments.js'
import { checkDelCorso } from '../../../core/dominio/check.js'
import {
  confrontaLezioni,
  durataPiano,
  minutiDiAttivita,
  minutiDiScarto,
  udDaMinutiAttivita,
} from '../../../core/dominio/calculations.js'
import { indiceDiagnosi, oraCoperta } from '../../../core/dominio/dashboard.js'
import { formattaData, formattaDurata } from '../../../core/dominio/dates.js'
import { creaAttivita } from '../../../core/dominio/factories.js'

/**
 * Quanto vale un'unità didattica quando il piano non sta su nessun'ora: il
 * cambio lo dà il documento.
 */
function minutiPerUd (): number {
  return stato.registro.impostazioni.minutiUd
}

/** La durata di una tappa o di un piano, in minuti. */
function durataInMinuti (ud: number): string {
  return formattaDurata(minutiDiAttivita(ud, minutiPerUd()))
}
import { lezioniDellAnno } from '../../../core/dominio/courses.js'
import { numeriDelleLezioni } from '../../../core/dominio/courses.js'
import type { Attivita, Consegna, Corso, Lezione, MomentoValutazione, PianoLezione } from '../../../core/dominio/models.js'
import { corrispondeAlla, pezziDiRicerca } from '../../../core/dominio/text.js'
import { Molti, quanti } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { testi } from './plans.testi.js'
import {
  avviso,
  campo,
  collegamento,
  conAttesa,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { notifica } from '../components/notifications.js'
import { statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { icona } from '../components/icons.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { editorPiano, moduloAnno } from '../forms.js'
import { azione, invia } from '../bridge.js'
import { apriMomento } from '../calendarNavigation.js'
import {
  aggiorna,
  annoCorrente,
  classeDelCorsoId,
  classeDiMomento,
  lezioneDiPiano,
  lezionePerId,
  lezioniDiCorso,
  nomeClasseDiLezione,
  nomeDiLezione,
  nomeDiPiano,
  pianoPerId,
  stato,
  vai,
} from '../state.js'
import { apriLezione } from '../pages.js'

/**
 * Apre nella pagina dei piani la scaletta scelta con l'ora accanto; senza
 * scaletta, l'ora del corso che ne aspetta una. Com'era con `aggiorna`: il
 * giorno e il semestre li porta solo la scaletta chiesta per nome.
 */
function apriNeiPiani (pianoId: string | null, lezione: Lezione | null = null): void {
  const oraAccanto = lezione ? { lezioneId: lezione.id } : {}
  if (pianoId) {
    vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: pianoId } }, { contesto: oraAccanto })
    return
  }
  const corsoId = lezione?.corsoId ?? stato.contesto.corsoId
  vai(
    corsoId
      ? { pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: corsoId } }
      : { pagina: 'pagina.corso.piani' },
    { contesto: { pianoId: null, ...oraAccanto }, elementoChiesto: false },
  )
}

/**
 * Le ore di un corso, divise per semestre; le ore fuori dai semestri restano in
 * fondo, dichiarate. Il periodo scelto nella barra comanda anche qui: con un
 * semestre scelto resta solo il suo gruppo.
 */
interface GruppoSemestre {
  etichetta: string
  lezioni: Lezione[]
}

/** Il testo su cui la ricerca lavora per un piano: quel che di lui si ricorda. */
function testoDiPiano (piano: PianoLezione): string {
  // Non ridotta qui: la riduce `corrispondeAlla` come il testo cercato, così
  // «unità» trova anche «Unita» e «UNITÀ».
  return [
    nomeDiPiano(piano),
    piano.note,
    ...piano.tag,
    ...piano.obiettivi,
    ...piano.attivita.map((a) => a.titolo),
  ]
    .filter(Boolean)
    .join(' ')
}

/** Il corso di cui si guardano i piani: quello della tendina in cima, come nella vista Corsi. */
function corsoScelto (): Corso | null {
  return corsoDelContesto()
}

/** Le ore del corso divise per semestre, con la ricerca già applicata. */
function semestriDelCorso (corso: Corso | null): GruppoSemestre[] {
  if (!corso) return []
  const anno = annoCorrente()
  const pezzi = pezziDiRicerca(stato.ricerca)
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
    .filter((l) => l.corsoId === corso.id)
    .filter((l) => {
      if (pezzi.length === 0) return true
      const piano = pianoPerId(l.pianoId)
      return (
        corrispondeAlla(formattaData(l.data), pezzi) ||
        corrispondeAlla(formattaData(l.data, 'giorno'), pezzi) ||
        (piano ? corrispondeAlla(testoDiPiano(piano), pezzi) : false)
      )
    })
    .sort((a, b) => a.data.localeCompare(b.data))

  const semestri = [...(anno?.semestri ?? [])].sort((a, b) => a.numero - b.numero)
  const gruppi: GruppoSemestre[] = semestri.map((semestre) => ({
    etichetta: semestre.etichetta,
    lezioni: lezioni.filter((l) => l.data >= semestre.inizio && l.data <= semestre.fine),
  }))

  const dentro = new Set(gruppi.flatMap((g) => g.lezioni.map((l) => l.id)))
  const fuori = lezioni.filter((l) => !dentro.has(l.id))
  if (fuori.length > 0) gruppi.push({ etichetta: testi().fuoriSemestri, lezioni: fuori })

  return gruppi.filter((g) => g.lezioni.length > 0)
}

/** I piani del corso che nessuna sua ora usa: preparati e non ancora messi. */
function pianiSciolti (corso: Corso | null): PianoLezione[] {
  if (!corso) return []
  const pezzi = pezziDiRicerca(stato.ricerca)
  const usati = new Set(
    stato.registro.lezioni.map((l) => l.pianoId).filter((id): id is string => Boolean(id)),
  )
  return stato.registro.piani
    .filter((p) => p.corsoId === corso.id && !usati.has(p.id))
    .filter((p) => corrispondeAlla(testoDiPiano(p), pezzi))
}

/**
 * I piani rimasti senza corso (corso eliminato: le riparazioni staccano il piano
 * invece di buttarlo). Stanno in fondo, dichiarati, da riagganciare o eliminare.
 */
function pianiSenzaCorso (): PianoLezione[] {
  const corsi = new Set(stato.registro.corsi.map((c) => c.id))
  // La ricerca vale anche qui, altrimenti «Senza corso» sembrerebbe l'unico risultato.
  const pezzi = pezziDiRicerca(stato.ricerca)
  return stato.registro.piani
    .filter((p) => !p.corsoId || !corsi.has(p.corsoId))
    .filter((p) => corrispondeAlla(testoDiPiano(p), pezzi))
}

/**
 * Di che cosa parla il piano: il primo obiettivo o la prima tappa, nella riga
 * piccola. Non è il nome (quello lo dà `lezioneDiPiano`) perché cambia mentre
 * si prepara e farebbe ballare l'elenco.
 */
function argomentoDiPiano (piano: PianoLezione): string {
  return (
    piano.obiettivi.find((o) => o.trim()) ??
    piano.attivita.find((a) => a.titolo.trim())?.titolo ??
    testi().scalettaVuota
  )
}

/** La riga di un piano nell'elenco: quel che è, e quanto pesa. */
function voceDiPiano (
  piano: PianoLezione,
  etichetta: string,
  sotto: Figlio,
  attivoId: string | null = null,
): HTMLElement {
  const isAttivo = attivoId ? piano.id === attivoId : stato.pianoId === piano.id
  return h(
    'button',
    {
      class: ['voce-laterale', isAttivo && 'voce-laterale--attiva'],
      type: 'button',
      onclick: () => apriNeiPiani(piano.id),
    },
    h(
      'span',
      { class: 'voce-laterale__testo' },
      h('strong', null, etichetta),
      h('small', null, sotto),
    ),
    piano.attivita.some(attivitaValutata)
      ? icona('valutazioni', 'voce-laterale__segno')
      : null,
  )
}

/**
 * Di quanto la scaletta non torna, scritto e colorato per trovarlo a colpo
 * d'occhio. Due tinte: tempo scoperto da riempire, o scaletta che sfora l'ora.
 */
function scartoScritto (scarto: number): HTMLElement {
  return h(
    'span',
    { class: `voce-laterale__scarto voce-laterale__scarto--${scarto < 0 ? 'corto' : 'oltre'}` },
    scarto < 0 ? testi().scoperti(formattaDurata(-scarto)) : testi().oltre(formattaDurata(scarto)),
  )
}

/** La riga di un'ora: la sua scaletta, o l'invito a prepararla. */
function voceDiLezione (
  lezione: Lezione,
  lezioneAttivaId: string | null = null,
  attivoPianoId: string | null = null,
): HTMLElement {
  const piano = pianoPerId(lezione.pianoId)
  const nome = nomeDiLezione(lezione)
  const quando = formattaData(lezione.data, 'giorno')
  const isAttivo = lezioneAttivaId
    ? lezione.id === lezioneAttivaId
    : (piano ? piano.id === attivoPianoId : false)

  if (!piano) {
    return h(
      'button',
      {
        class: ['voce-laterale', 'voce-laterale--vuota', isAttivo && 'voce-laterale--attiva'],
        type: 'button',
        onclick: () => apriNeiPiani(null, lezione),
      },
      h(
        'span',
        { class: 'voce-laterale__testo' },
        h('strong', null, nome),
        h('small', null, testi().senzaPiano(quando)),
      ),
      icona('piu', 'voce-laterale__segno'),
    )
  }

  const argomento = argomentoDiPiano(piano)
  const haArgomento = Boolean(argomento && argomento !== testi().scalettaVuota)
  const scarto = minutiDiScarto(piano, lezione, minutiPerUd())
  const sotto: Figlio =
    scarto !== 0
      ? [quando, haArgomento ? ` · ${argomento}` : '', ' · ', scartoScritto(scarto)]
      : haArgomento
        ? `${quando} · ${argomento}`
        : quando

  return h(
    'button',
    {
      class: ['voce-laterale', isAttivo && 'voce-laterale--attiva'],
      type: 'button',
      onclick: () => apriNeiPiani(piano.id, lezione),
    },
    h(
      'span',
      { class: 'voce-laterale__testo' },
      h('strong', null, nome),
      h('small', null, sotto),
    ),
    piano.attivita.some(attivitaValutata)
      ? icona('valutazioni', 'voce-laterale__segno')
      : null,
  )
}

/**
 * Navigatore interattivo delle lezioni del corso:
 * permette di scorrere linearmente le ore del corso con avanti/indietro,
 * mostra l'ora attiva con la data e permette di saltare alla prima da preparare.
 */
function navigatoreLezioniCorso (
  corso: Corso,
  pianoAttivo: PianoLezione | null,
  lezioneAttiva: Lezione | null,
): HTMLElement | null {
  const sorelle = lezioniDiCorso(corso.id).sort(confrontaLezioni)
  if (sorelle.length === 0) return null

  const numeri = numeriDelleLezioni(stato.registro, sorelle)
  const minutiUd = minutiPerUd()
  const t = testi()

  const attiva =
    lezioneAttiva ??
    (pianoAttivo
      ? sorelle.find((l) => l.pianoId === pianoAttivo.id) ?? primaOraDelPiano(pianoAttivo)
      : null) ??
    sorelle[0] ??
    null
  const posizione = attiva ? sorelle.findIndex((l) => l.id === attiva.id) : -1

  const senzaPiano = sorelle.filter((l) => !l.pianoId)
  const conScarto = sorelle.filter((l) => {
    const p = pianoPerId(l.pianoId)
    return p ? minutiDiScarto(p, l, minutiUd) !== 0 : false
  })
  const pronte = sorelle.filter((l) => {
    const p = pianoPerId(l.pianoId)
    return p ? minutiDiScarto(p, l, minutiUd) === 0 : false
  })

  const vaiA = (indice: number) => {
    const bersaglio = sorelle[indice]
    if (!bersaglio) return
    apriNeiPiani(bersaglio.pianoId ?? null, bersaglio)
  }

  const primaDaFare = senzaPiano[0] ?? null
  const vaiAPrimaDaFare = (evento: MouseEvent) => {
    if (!primaDaFare) return
    const tasto = evento.currentTarget as HTMLButtonElement
    void conAttesa(
      tasto,
      azione({ tipo: 'piano.perLezione', lezioneId: primaDaFare.id }).then((risposta) => {
        if (risposta.ok && risposta.creato) {
          notifica(t.pianoGenerato, 'successo')
          apriNeiPiani(risposta.creato.id, primaDaFare)
        }
      }),
    )
  }

  const numAttivo = attiva ? numeri.get(attiva.id) ?? null : null
  const descAttiva = attiva
    ? `${numAttivo ? `#${numAttivo} · ` : ''}${formattaData(attiva.data, 'giorno')} ${formattaData(attiva.data)}`
    : t.navigatoreLezioni

  return h(
    'div',
    { class: 'navigatore-piani' },
    h(
      'div',
      { class: 'navigatore-piani__passo' },
      pulsante({
        simbolo: 'sinistra',
        variante: 'fantasma',
        titolo: t.precedente,
        disabilitato: posizione <= 0,
        al: () => vaiA(posizione - 1),
      }),
      h('span', { class: 'navigatore-piani__lezione-corrente' }, descAttiva),
      pulsante({
        simbolo: 'destra',
        variante: 'fantasma',
        titolo: t.successiva,
        disabilitato: posizione < 0 || posizione >= sorelle.length - 1,
        al: () => vaiA(posizione + 1),
      }),
    ),
    h(
      'div',
      { class: 'navigatore-piani__sintesi' },
      pastiglia(
        t.preparate(pronte.length, sorelle.length),
        pronte.length === sorelle.length ? 'positivo' : 'informativo',
      ),
      conScarto.length > 0
        ? pastiglia(`${conScarto.length} ${t.daCalibrare}`, 'attenzione', 'avviso')
        : null,
    ),
    primaDaFare
      ? pulsante({
          testo: t.vaiAProssimaDaPreparare,
          variante: 'sottile',
          simbolo: 'bacchetta',
          al: vaiAPrimaDaFare,
        })
      : pastiglia(t.tuttePreparate, 'positivo', 'spunta'),
  )
}

function elencoPiani (
  pianoAttivo: PianoLezione | null,
  lezioneAttivaId: string | null = null,
): HTMLElement {
  const corso = corsoScelto()
  const gruppi = semestriDelCorso(corso)
  const sciolti = pianiSciolti(corso)
  const orfani = pianiSenzaCorso()
  // L'indice dei piani una volta per tutto l'elenco, non una ricerca per ora.
  const indice = indiceDiagnosi(stato.registro)
  const coperta = (l: Lezione): boolean => oraCoperta(stato.registro, l, indice)
  const preparate = gruppi
    .flatMap((g) => g.lezioni)
    .filter(coperta).length
  const ore = gruppi.reduce((somma, g) => somma + g.lezioni.length, 0)
  const t = testi()
  const attivoId = pianoAttivo?.id ?? null

  return h(
    'aside',
    // Per corso: cambiandolo si riparte dall'alto dell'elenco.
    // Di telaio: un clic su una voce non ferma la rotella in corsa.
    { class: 'elenco-laterale', dataset: { telaio: 'piani:elenco', scorrimento: `piani:${corso?.id ?? ''}` } }, // testo-fisso: chiave di scorrimento
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, corso ? corso.titolo : t.piani),
      corso ? h('span', { class: 'testo-quieto' }, t.ore(preparate, ore)) : null,
    ),
    campo({
      nome: 'ricercaPiani',
      tipo: 'text',
      valore: stato.ricerca,
      segnaposto: t.cerca,
      fuoco: 'ricerca-piani',
      al: (valore) => aggiorna({ ricerca: valore }),
      classe: 'campo--ricerca',
    }),
    gruppi.length === 0 && sciolti.length === 0 && orfani.length === 0
      ? h(
          'p',
          { class: 'testo-quieto' },
          corso
            ? t.nienteCorrisponde
            : t.nessunCorso,
        )
      : h(
          'ul',
          { class: 'elenco-laterale__voci' },
          // Un gruppo per semestre.
          ...gruppi.flatMap((gruppo) => [
            h(
              'li',
              { class: 'elenco-laterale__gruppo' },
              h('strong', null, gruppo.etichetta),
              h(
                'span',
                { class: 'testo-quieto' },
                t.preparate(gruppo.lezioni.filter(coperta).length, gruppo.lezioni.length),
              ),
            ),
            ...gruppo.lezioni.map((lezione) =>
              h('li', null, voceDiLezione(lezione, lezioneAttivaId, attivoId)),
            ),
          ]),
          ...(sciolti.length > 0
            ? [
                h(
                  'li',
                  { class: 'elenco-laterale__sottogruppo' },
                  t.nonAssegnati(sciolti.length),
                ),
                // Una bozza non ha un'ora, e si chiama con il giorno in cui è nata;
                // l'argomento resta nella riga sotto.
                ...sciolti.map((piano) =>
                  h(
                    'li',
                    null,
                    voceDiPiano(
                      piano,
                      lezioneDiPiano(piano),
                      `${argomentoDiPiano(piano)} · ` +
                        `${quanti(piano.attivita.length, lessico().attivita)} · ` +
                        durataInMinuti(durataPiano(piano)),
                      attivoId,
                    ),
                  ),
                ),
              ]
            : []),
          ...(orfani.length > 0
            ? [
                h(
                  'li',
                  { class: 'elenco-laterale__gruppo elenco-laterale__gruppo--avviso' },
                  icona('avviso', 'icona--minuta'),
                  h('strong', null, t.senzaCorso),
                  h('span', { class: 'testo-quieto' }, t.daRiagganciare),
                ),
                ...orfani.map((piano) =>
                  h(
                    'li',
                    null,
                    voceDiPiano(
                      piano,
                      lezioneDiPiano(piano),
                      t.corsoSparito(argomentoDiPiano(piano)),
                      attivoId,
                    ),
                  ),
                ),
              ]
            : []),
        ),
  )
}

/**
 * L'editor del piano aperto, tenuto vivo fra un ridisegno e l'altro: il corpo
 * dei campi si costruisce una volta per piano e resta nella pagina (`data-tieni`),
 * così non si perde quel che si sta scrivendo. Si tiene solo se il piano arrivato è uno
 * che conosce (quello di partenza o uno che ha mandato lui) o se ci si sta
 * scrivendo; altrimenti il piano è cambiato altrove e l'editor si rifà, perché
 * `componi()` rimanderebbe la scaletta vecchia.
 */
let inLavorazione: { pianoId: string, corpo: HTMLElement, noti: Set<string> } | null = null

/**
 * Quanti editor si sono costruiti: nella chiave del nodo tenuto, perché un
 * editor rifatto per lo stesso piano non prenda il posto del vecchio.
 */
let editorCostruiti = 0

/**
 * Il piano ridotto a quel che l'editor scrive, per riconoscerlo: senza i timbri
 * dell'host e con le chiavi in ordine, perché l'host può riordinarle.
 */
function impronta (piano: PianoLezione): string {
  const ordinato = (valore: unknown): unknown =>
    Array.isArray(valore)
      ? valore.map(ordinato)
      : valore && typeof valore === 'object'
        ? Object.fromEntries(
            Object.keys(valore)
              .sort()
              .map((k) => [k, ordinato((valore as Record<string, unknown>)[k])]),
          )
        : valore
  return JSON.stringify(ordinato({ ...piano, creatoIl: '', aggiornatoIl: '' }))
}

/** Scorda l'editor tenuto da parte: il piano che modificava non c'è più. */
export function scordaEditorDelPiano (): void {
  inLavorazione = null
}

/**
 * Salva da sé a ogni modifica confermata (campo lasciato, tappa spostata),
 * come il registro dell'ora. Gli errori non passano da `azione` (niente
 * notifica rossa: un piano a metà è normale); restano scritti sopra i campi
 * finché valgono, e quel che l'host rifiuta resta nei campi.
 */
function editorDelPiano (piano: PianoLezione): HTMLElement {
  if (inLavorazione?.pianoId === piano.id) {
    const { corpo } = inLavorazione
    if (corpo.contains(document.activeElement) || inLavorazione.noti.has(impronta(piano))) {
      // Già nella pagina: il disegno nuovo ne porta solo il segnaposto e
      // `aggiornaElemento` ci rimette il vecchio senza staccarlo (`data-tieni`),
      // così fuoco, selezione e scorrimento dei campi restano dove sono.
      // Appeso nel disegno nuovo, il nodo lascerebbe la pagina prima del tempo.
      return corpo.isConnected
        ? h('div', { class: 'piano-editor', dataset: { tieni: corpo.dataset.tieni } })
        : corpo
    }
  }

  const zonaErrori = h('div')
  const mostraErrori = (errori: string[] | null): void => {
    rimpiazza(
      zonaErrori,
      errori
        ? avviso(
            h('ul', { class: 'elenco-avviso' }, ...errori.map((e) => h('li', null, e))),
            'attenzione',
          )
        : null,
    )
  }
  const salvaOra = async (): Promise<void> => {
    // Tolto altrove mentre era aperto: salvarlo adesso lo farebbe rinascere.
    if (!pianoPerId(piano.id)) {
      mostraErrori([testi().toltoAltrove])
      return
    }
    const mandato = editor.componi()
    if (inLavorazione?.corpo === corpo) inLavorazione.noti.add(impronta(mandato))
    const risposta = await invia({ tipo: 'piano.salva', piano: mandato })
    mostraErrori(risposta.ok ? null : risposta.errori ?? [testi().nonSalvato])
  }

  const editor = editorPiano({
    piano,
    // Il corso lo dice l'elenco a sinistra: qui è solo da leggere.
    corsoDettato: true,
    allaModifica: () => {
      void salvaOra()
    },
  })

  const corpo = h(
    'div',
    // testo-fisso: chiave del nodo tenuto
    { class: 'piano-editor', dataset: { tieni: `piano:${piano.id}:${++editorCostruiti}` } },
    zonaErrori,
    editor.corpo,
  )
  inLavorazione = { pianoId: piano.id, corpo, noti: new Set([impronta(piano)]) }
  return corpo
}

/**
 * I momenti nati da questo piano: quelli che lo dichiarano, più quelli attaccati
 * a una lezione che lo usa (momenti creati prima del legame).
 */
function momentiDelPiano (piano: PianoLezione): MomentoValutazione[] {
  const lezioni = new Set(
    stato.registro.lezioni.filter((l) => l.pianoId === piano.id).map((l) => l.id),
  )
  return stato.registro.valutazioni
    .filter((v) => v.pianoId === piano.id || (v.lezioneId !== null && lezioni.has(v.lezioneId)))
    .sort((a, b) => b.data.localeCompare(a.data))
}

/** Dove questo piano si ritrova: le ore che lo usano e i voti che ne sono usciti. */
function collegamentiDelPiano (piano: PianoLezione): Figlio {
  const usiInLezioni = stato.registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => b.data.localeCompare(a.data))
  const momenti = momentiDelPiano(piano)
  if (usiInLezioni.length <= 1 && momenti.length === 0) return null

  const valutate = new Set(momenti.map((m) => m.lezioneId))
  // Il piano prevede almeno una prova: serve a segnare le ore che non ce l'hanno ancora.
  const conProva = piano.attivita.some(attivitaValutata)
  const t = testi()

  return scheda({
    titolo: t.doveFinisce,
    contenuto: h(
      'div',
      null,
      usiInLezioni.length > 1
        ? h(
            'section',
            { class: 'blocco-testo' },
            h('h5', null, t.usatoNelleLezioni),
            h(
              'ul',
              { class: 'elenco-collegamenti' },
              ...usiInLezioni.slice(0, 12).map((lezione) =>
                h(
                  'li',
                  { class: 'elenco-collegamenti__voce' },
                  collegamento({
                    testo: `${formattaData(lezione.data)} · ${nomeClasseDiLezione(lezione)}`,
                    al: () => apriLezione(lezione.id),
                  }),
                  // Prova prevista e non ancora fatta in quell'ora: lo si dice. Il momento
                  // nasce dalla tappa dentro la lezione, non da qui.
                  conProva && !valutate.has(lezione.id)
                    ? pastiglia(t.provaDaFare, 'attenzione', 'valutazioni')
                    : null,
                ),
              ),
            ),
          )
        : null,
      momenti.length > 0
        ? h(
            'section',
            { class: 'blocco-testo' },
            h('h5', null, t.valutazioniUscite),
            h(
              'ul',
              { class: 'elenco-collegamenti' },
              ...momenti.slice(0, 12).map((momento) =>
                h(
                  'li',
                  { class: 'elenco-collegamenti__voce' },
                  collegamento({
                    testo:
                      `${formattaData(momento.data)} · ` +
                      `${classeDiMomento(momento)?.nome ?? t.senzaClasse} — ${momento.titolo}`,
                    al: () => apriMomento(momento),
                  }),
                ),
              ),
            ),
          )
        : null,
    ),
  })
}

/**
 * Strumenti del corso collegabili al piano: le pendenze aperte e le colonne del
 * check, con la possibilità di inserirle al volo nella scaletta come attività dedicata.
 */
function pannelloPendenzeECheckPiano (piano: PianoLezione, lezione: Lezione | null): Figlio {
  const corsoId = piano.corsoId ?? lezione?.corsoId ?? null
  if (!corsoId) return null
  const corso = stato.registro.corsi.find((c) => c.id === corsoId)
  if (!corso) return null

  const classe = classeDelCorsoId(corsoId)
  const consegne = consegneDelCorso(stato.registro, corsoId)
  const pendenzeAperte = consegne.filter((c) => !avanzamentoConsegna(c, classe).completa)
  const check = checkDelCorso(stato.registro, corsoId)
  const colonneCheck = check?.colonne ?? []

  if (pendenzeAperte.length === 0 && colonneCheck.length === 0) return null

  const t = testi()
  const perUd = minutiPerUd()

  const inserisciAttivitaPendenza = async (c: Consegna): Promise<void> => {
    const nuova = creaAttivita(t.ritiroConsegna(c.testo), udDaMinutiAttivita(5, perUd))
    nuova.tipo = 'compito'
    nuova.parametri = { consegnaId: c.id }
    scordaEditorDelPiano()
    const aggiornato: PianoLezione = {
      ...piano,
      attivita: [...piano.attivita, nuova],
    }
    const risposta = await invia({ tipo: 'piano.salva', piano: aggiornato })
    if (risposta.ok) {
      notifica(t.inseritaInScaletta(c.testo), 'successo')
    }
  }

  // Il check si verifica in un momento solo dell'ora: se la scaletta ha già una
  // tappa che ne verifica una colonna, le altre si legano a quella invece di
  // aggiungere una tappa per colonna.
  const tappaDelCheck = piano.attivita.find((a) => colonneCheckDi(a).length > 0) ?? null
  const titoloDelCheck = (colonne: string[]): string =>
    t.verificaCheck(
      colonne.map((id) => colonneCheck.find((c) => c.id === id)?.titolo ?? id).join(', '),
    )

  const inserisciAttivitaCheck = async (
    colonnaId: string,
    colonnaTitolo: string,
  ): Promise<void> => {
    let attivita: Attivita[]
    let avviso: string
    if (tappaDelCheck) {
      const legata = conColonnaCheck(tappaDelCheck, colonnaId)
      // Il titolo scritto dal programma segue le colonne; uno scritto a mano resta.
      if (tappaDelCheck.titolo === titoloDelCheck(colonneCheckDi(tappaDelCheck))) {
        legata.titolo = titoloDelCheck(colonneCheckDi(legata))
      }
      attivita = piano.attivita.map((a) => (a.id === tappaDelCheck.id ? legata : a))
      avviso = t.legataAllaTappa(colonnaTitolo, legata.titolo)
    } else {
      const nuova = creaAttivita(t.verificaCheck(colonnaTitolo), udDaMinutiAttivita(5, perUd))
      nuova.tipo = 'verifica'
      nuova.parametri = { checkColonnaId: colonnaId }
      attivita = [...piano.attivita, nuova]
      avviso = t.inseritaInScaletta(colonnaTitolo)
    }
    scordaEditorDelPiano()
    const risposta = await invia({ tipo: 'piano.salva', piano: { ...piano, attivita } })
    if (risposta.ok) notifica(avviso, 'successo')
  }

  const sezioni: Figlio[] = []
  if (pendenzeAperte.length > 0) {
    sezioni.push(
      h(
        'section',
        { class: 'blocco-testo' },
        h('h5', null, t.pendenzeDelCorso),
        h(
          'ul',
          { class: 'elenco-collegamenti' },
          ...pendenzeAperte.map((c) => {
            const avanzamento = avanzamentoConsegna(c, classe)
            const giaCollegata = piano.attivita.some((a) => {
              const p = attivitaConPendenza(a)
              return p === c.id || p === 'tutte'
            })
            const scadenza = scadenzaConsegna(stato.registro, c)
            return h(
              'li',
              { class: 'elenco-collegamenti__voce strumenti-piano__riga' },
              h(
                'div',
                { class: 'strumenti-piano__info' },
                icona('allegato', 'icona--minuta'),
                h('strong', null, c.testo),
                pastiglia(`${avanzamento.fatte}/${avanzamento.destinatari.length}`, 'quiete'),
                scadenza ? pastiglia(formattaData(scadenza, 'giorno'), 'attenzione') : null,
              ),
              giaCollegata
                ? pastiglia(t.giaInScaletta, 'positivo')
                : pulsante({
                    testo: t.inserisciNellaScaletta,
                    simbolo: 'piu',
                    variante: 'sottile',
                    al: () => {
                      void inserisciAttivitaPendenza(c)
                    },
                  }),
            )
          }),
        ),
      ),
    )
  }

  if (colonneCheck.length > 0) {
    sezioni.push(
      h(
        'section',
        { class: 'blocco-testo' },
        h('h5', null, t.checkDelCorso),
        h(
          'ul',
          { class: 'elenco-collegamenti' },
          ...colonneCheck.map((col) => {
            const giaCollegata = piano.attivita.some((a) => verificaColonna(a, col.id))
            return h(
              'li',
              { class: 'elenco-collegamenti__voce strumenti-piano__riga' },
              h(
                'div',
                { class: 'strumenti-piano__info' },
                icona('spunta', 'icona--minuta'),
                h('strong', null, col.titolo),
              ),
              giaCollegata
                ? pastiglia(t.giaInScaletta, 'positivo')
                : pulsante({
                    testo: tappaDelCheck ? t.legaAllaTappa : t.inserisciNellaScaletta,
                    simbolo: tappaDelCheck ? 'collegamento' : 'piu',
                    variante: 'sottile',
                    titolo: tappaDelCheck ? t.legaAllaTappaTitolo(tappaDelCheck.titolo) : undefined,
                    al: () => {
                      void inserisciAttivitaCheck(col.id, col.titolo)
                    },
                  }),
            )
          }),
        ),
      ),
    )
  }

  return scheda({
    titolo: t.strumentiCollegati,
    sottotitolo: t.spazioInScaletta,
    contenuto: h('div', { class: 'strumenti-piano' }, ...sezioni),
  })
}

/** La colonna del piano aperto: l'editor e gli strumenti collegati. */
function dettaglioPiano (piano: PianoLezione): HTMLElement {
  const lezione = primaOraDelPiano(piano)
  const titolo = lezione
    ? `${nomeDiLezione(lezione)} · ${formattaData(lezione.data, 'giorno')} ${formattaData(lezione.data)}`
    : nomeDiPiano(piano)

  return h(
    'div',
    { class: 'colonna' },
    scheda({
      titolo,
      sottotitolo: testi().siSalva,
      // Niente pulsanti: duplicare, eliminare e andare al registro sono comandi della pagina.
      contenuto: editorDelPiano(piano),
    }),
    pannelloPendenzeECheckPiano(piano, lezione),
    collegamentiDelPiano(piano),
  )
}


/**
 * Il piano che la pagina ha davanti: quello aperto o, senza scelta, il primo
 * (la prima ora preparata del primo semestre). Esportato perché i comandi della
 * barra agiscono su questo, e `stato.pianoId` da solo non basta.
 */
export function pianoMostrato (): PianoLezione | null {
  const corso = corsoScelto()
  if (corso) {
    const perPianoId = pianoPerId(stato.pianoId)
    if (perPianoId && perPianoId.corsoId === corso.id) {
      return perPianoId
    }
    if (stato.lezioneId) {
      const l = lezionePerId(stato.lezioneId)
      if (l && l.corsoId === corso.id) {
        return l.pianoId ? (pianoPerId(l.pianoId) ?? null) : null
      }
    }
    const delCorso = [
      ...semestriDelCorso(corso).flatMap((g) => g.lezioni.map((l) => pianoPerId(l.pianoId))),
      ...pianiSciolti(corso),
    ].find((x): x is PianoLezione => x !== null)
    if (delCorso) return delCorso
  }
  return pianoPerId(stato.pianoId) ?? pianiSenzaCorso()[0] ?? null
}

/**
 * La prima ora, in ordine di giorno, su cui questo piano sta: è dove porta
 * «vai al registro» quando il piano è assegnato a più ore.
 */
export function primaOraDelPiano (piano: PianoLezione): Lezione | null {
  // `confrontaLezioni` ordina anche per ora d'inizio, come il calendario: così
  // «la prima» è la stessa ovunque.
  return (
    stato.registro.lezioni
      .filter((l) => l.pianoId === piano.id)
      .sort(confrontaLezioni)[0] ?? null
  )
}

export function vistaPiani (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'piano', crea: () => moduloAnno() })
  }

  const corso = corsoScelto()
  const sorelle = corso ? lezioniDiCorso(corso.id).sort(confrontaLezioni) : []
  const gruppi = semestriDelCorso(corso)
  const piano = pianoMostrato()

  // Determiniamo la lezione attiva coerente fra navigatore e sidebar
  const lezioneAttiva: Lezione | null =
    (stato.lezioneId ? sorelle.find((l) => l.id === stato.lezioneId) : null) ??
    (piano
      ? sorelle.find((l) => l.pianoId === piano.id) ?? primaOraDelPiano(piano)
      : null) ??
    sorelle[0] ??
    null

  // Le ore che aspettano ancora una scaletta, contate in testata.
  const daPreparare = gruppi.reduce(
    (somma, g) => somma + g.lezioni.filter((l) => !l.pianoId).length,
    0,
  )
  const bersaglio: Lezione | null =
    (stato.lezioneId && lezioneAttiva && !lezioneAttiva.pianoId ? lezioneAttiva : null) ??
    (sorelle.length > 0 ? sorelle.find((l) => !l.pianoId) ?? sorelle[0] ?? null : null)
  const t = testi()
  return h(
    'div',
    { class: 'vista vista--piani', dataset: { telaio: 'piani' } },
    testataVista({
      titolo: Molti(lessico().pianoLezione),
      sottotitolo:
        !corso
          ? t.nessunCorsoDaPreparare
          : daPreparare > 0
            ? t.senzaScaletta(daPreparare)
            : t.tutteConScaletta,
      contorno: corso ? navigatoreLezioniCorso(corso, piano, lezioneAttiva) : null,
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco', dataset: { telaio: 'piani:colonne' } },
      elencoPiani(piano, lezioneAttiva?.id ?? null),
      piano
        ? dettaglioPiano(piano)
        : h(
            'div',
            { class: 'colonna' },
            statoVuoto({
              simbolo: 'piano',
              titolo: t.nessunPiano,
              testo:
                stato.lezioneId && lezioneAttiva && !lezioneAttiva.pianoId
                  ? t.nessunPianoLezione(nomeDiLezione(lezioneAttiva))
                  : t.nessunPianoTesto,
              azione: bersaglio
                ? [
                    pulsante({
                      testo: t.generaPiano,
                      variante: 'primario',
                      simbolo: 'bacchetta',
                      al: (evento) => {
                        const tasto = evento.currentTarget as HTMLButtonElement
                        void conAttesa(
                          tasto,
                          azione({ tipo: 'piano.perLezione', lezioneId: bersaglio.id }).then((risposta) => {
                            if (risposta.ok && risposta.creato) {
                              notifica(t.pianoGenerato, 'successo')
                              apriNeiPiani(risposta.creato.id, bersaglio)
                            }
                          }),
                        )
                      },
                    }),
                  ]
                : undefined,
            }),
          ),
    ),
  )
}
