// I piani lezione: la libreria delle scalette.
// Un piano non appartiene a una lezione: si prepara una volta e si assegna a
// più ore, anche di classi diverse. La scaletta si vede come striscia di tempo,
// per capire subito se le attività stanno nell'ora.

import { attivitaValutata } from '../../domain/activities.js'
import {
  confrontaLezioni,
  durataPiano,
  minutiDiAttivita,
  minutiDiScarto,
} from '../../domain/calculations.js'
import { indiceDiagnosi, oraCoperta } from '../../domain/dashboard.js'
import { formattaData, formattaDurata } from '../../domain/dates.js'

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
import { lezioniDellAnno } from '../../domain/courses.js'
import type { Corso, Lezione, MomentoValutazione, PianoLezione } from '../../domain/models.js'
import { corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { Molti, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { testi } from './plans.testi.js'
import {
  avviso,
  campo,
  collegamento,
  conAttesa,
  pastiglia,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
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
  classeDiMomento,
  lezioneDiPiano,
  nomeClasseDiLezione,
  nomeDiLezione,
  nomeDiPiano,
  nelSemestreScelto,
  pianoPerId,
  semestreScelto,
  stato,
} from '../state.js'

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
  const lezioni = nelSemestreScelto(lezioniDellAnno(stato.registro, anno?.id ?? null))
    .filter((l) => l.corsoId === corso.id)
    .filter((l) => {
      if (pezzi.length === 0) return true
      const piano = pianoPerId(l.pianoId)
      return (
        corrispondeAlla(formattaData(l.data), pezzi) ||
        (piano ? corrispondeAlla(testoDiPiano(piano), pezzi) : false)
      )
    })
    .sort((a, b) => a.data.localeCompare(b.data))

  const scelto = semestreScelto()
  const semestri = [...(anno?.semestri ?? [])]
    .filter((s) => !scelto || s.id === scelto.id)
    .sort((a, b) => a.numero - b.numero)
  const gruppi: GruppoSemestre[] = semestri.map((semestre) => ({
    etichetta: semestre.etichetta,
    lezioni: lezioni.filter((l) => l.data >= semestre.inizio && l.data <= semestre.fine),
  }))

  // Le ore fuori dai semestri si dichiarano solo guardando l'anno intero: con un
  // semestre scelto `lezioni` le ha già escluse.
  const dentro = new Set(gruppi.flatMap((g) => g.lezioni.map((l) => l.id)))
  const fuori = scelto ? [] : lezioni.filter((l) => !dentro.has(l.id))
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
function voceDiPiano (piano: PianoLezione, etichetta: string, sotto: Figlio): HTMLElement {
  return h(
    'button',
    {
      class: ['voce-laterale', stato.pianoId === piano.id && 'voce-laterale--attiva'],
      type: 'button',
      onclick: () => aggiorna({ pianoId: piano.id }),
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
function voceDiLezione (lezione: Lezione): HTMLElement {
  const piano = pianoPerId(lezione.pianoId)
  // Il nome dell'ora in grande e la data sotto: lo stesso nome del piano appeso
  // a quell'ora.
  const nome = nomeDiLezione(lezione)
  const quando = formattaData(lezione.data, 'giorno')

  if (!piano) {
    return h(
      'button',
      {
        class: 'voce-laterale voce-laterale--vuota',
        type: 'button',
        // Senza piano, il clic lo crea vuoto e apre l'editor; riusarne uno si fa dal
        // calendario, dal registro dell'ora o da «Duplica».
        // `conAttesa` perché questo `button` scritto a mano resterebbe premibile mentre
        // la scaletta nasce, e un secondo clic farebbe fallire un'altra `piano.perLezione`.
        onclick: (evento: MouseEvent) => {
          const tasto = evento.currentTarget as HTMLButtonElement
          void conAttesa(
            tasto,
            azione({ tipo: 'piano.perLezione', lezioneId: lezione.id }).then((risposta) => {
              if (risposta.ok && risposta.creato) aggiorna({ pianoId: risposta.creato.id })
            }),
          )
        },
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
  // Una scaletta che non torna con l'ora va detta, o l'ora sembra pronta.
  const scarto = minutiDiScarto(piano, lezione, minutiPerUd())
  if (scarto !== 0) {
    return voceDiPiano(piano, nome, [quando, ' · ', scartoScritto(scarto)])
  }

  // Preparata, l'ora dice solo quando è: la riga sotto il nome resta per
  // «senza piano — preparala», così le ore da fare si vedono.
  return voceDiPiano(piano, nome, quando)
}

function elencoPiani (): HTMLElement {
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

  return h(
    'aside',
    { class: 'elenco-laterale' },
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
            ...gruppo.lezioni.map((lezione) => h('li', null, voceDiLezione(lezione))),
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
 * dei campi si costruisce una volta per piano e `rimpiazza` lo sposta, così non
 * si perde quel che si sta scrivendo. Si tiene solo se il piano arrivato è uno
 * che conosce (quello di partenza o uno che ha mandato lui) o se ci si sta
 * scrivendo; altrimenti il piano è cambiato altrove e l'editor si rifà, perché
 * `componi()` rimanderebbe la scaletta vecchia.
 */
let inLavorazione: { pianoId: string, corpo: HTMLElement, noti: Set<string> } | null = null

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
    if (inLavorazione.corpo.contains(document.activeElement)) return inLavorazione.corpo
    if (inLavorazione.noti.has(impronta(piano))) return inLavorazione.corpo
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

  const corpo = h('div', { class: 'piano-editor' }, zonaErrori, editor.corpo)
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
  if (usiInLezioni.length === 0 && momenti.length === 0) return null

  const valutate = new Set(momenti.map((m) => m.lezioneId))
  // Il piano prevede almeno una prova: serve a segnare le ore che non ce l'hanno ancora.
  const conProva = piano.attivita.some(attivitaValutata)
  const t = testi()

  return scheda({
    titolo: t.doveFinisce,
    contenuto: h(
      'div',
      null,
      usiInLezioni.length > 0
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
                    al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
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

/** La colonna del piano aperto: l'editor, e nient'altro. */
function dettaglioPiano (piano: PianoLezione): HTMLElement {
  return h(
    'div',
    { class: 'colonna' },
    scheda({
      titolo: nomeDiPiano(piano),
      // Il corso lo dice già la prima riga dell'editor.
      sottotitolo: piano.corsoId ? testi().siSalva : testi().senzaCorsoTesto,
      // Niente pulsanti: duplicare, eliminare e andare al registro sono comandi della pagina.
      contenuto: editorDelPiano(piano),
    }),
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
  const primo =
    [
      ...semestriDelCorso(corso).flatMap((g) => g.lezioni.map((l) => pianoPerId(l.pianoId))),
      ...pianiSciolti(corso),
    ].find((x): x is PianoLezione => x !== null) ??
    pianiSenzaCorso()[0] ??
    null
  return pianoPerId(stato.pianoId) ?? primo
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
  const gruppi = semestriDelCorso(corso)
  const piano = pianoMostrato()

  // Le ore che aspettano ancora una scaletta, contate in testata.
  const daPreparare = gruppi.reduce(
    (somma, g) => somma + g.lezioni.filter((l) => !l.pianoId).length,
    0,
  )
  const t = testi()
  return h(
    'div',
    { class: 'vista vista--piani' },
    testataVista({
      titolo: Molti(lessico().pianoLezione),
      // Nessun «nuovo piano»: un piano nasce dall'ora che lo aspetta.
      sottotitolo:
        !corso
          ? t.nessunCorsoDaPreparare
          : daPreparare > 0
            ? t.senzaScaletta(daPreparare)
            : t.tutteConScaletta,
      // Niente filtri: il corso si sceglie dalla barra in cima.
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco' },
      elencoPiani(),
      piano
        ? dettaglioPiano(piano)
        : h(
            'div',
            { class: 'colonna' },
            statoVuoto({
              simbolo: 'piano',
              titolo: t.nessunPiano,
              // Nessun pulsante «crea»: un piano nasce dall'ora che lo aspetta.
              testo: t.nessunPianoTesto,
            }),
          ),
    ),
  )
}
