// I piani lezione: la libreria delle scalette.
//
// Un piano non appartiene a una lezione, e questo è il punto: si prepara una
// volta e lo si assegna a più lezioni, anche di classi diverse. Qui si vede la
// scaletta come una striscia di tempo — è così che ci si accorge subito se le
// attività ci stanno dentro all'ora o no.

import { attivitaValutata, nomeTipoAttivita } from '../../dominio/attivita.js'
import { durataPiano, minutiDiAttivita } from '../../dominio/calcoli.js'
import { MINUTI_UD, formattaData, formattaDurata } from '../../dominio/date.js'

/**
 * Quanto vale un'unità didattica quando il piano non sta su nessun'ora.
 *
 * Dentro il piano le durate si leggono in minuti — è così che si prepara — e
 * senza un'ora sotto il cambio lo danno le impostazioni.
 */
function minutiPerUd (): number {
  return stato.registro.impostazioni.durataSlotPredefinita || MINUTI_UD
}

/** La durata di una tappa o di un piano, in minuti. */
function durataInMinuti (ud: number): string {
  return formattaDurata(minutiDiAttivita(ud, minutiPerUd()))
}
import { lezioniDellAnno } from '../../dominio/corsi.js'
import type { Corso, Lezione, MomentoValutazione, PianoLezione } from '../../dominio/modelli.js'
import {
  campo,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { selettoreClassi, sintesiIncassata, statoVuotoAnno } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { h, type Figlio } from '../dom.js'
import { bloccoRisorse, moduloAssegnaPiano, moduloAvvio, moduloPiano } from '../moduli.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  annoCorrente,
  classeDiMomento,
  classiVisibili,
  corsiDi,
  lezioneDiPiano,
  nomeClasseDiLezione,
  nomeCorso,
  nomeDiLezione,
  nomeDiPiano,
  pianoPerId,
  stato,
} from '../stato.js'

/** Tinta di ogni tipo di attività nella striscia del tempo. */
const TINTE: Record<string, string> = {
  introduzione: 'var(--tinta-introduzione)',
  spiegazione: 'var(--tinta-spiegazione)',
  esercizio: 'var(--tinta-esercizio)',
  laboratorio: 'var(--tinta-laboratorio)',
  discussione: 'var(--tinta-discussione)',
  gruppo: 'var(--tinta-gruppo)',
  verifica: 'var(--tinta-verifica)',
  ripasso: 'var(--tinta-ripasso)',
  compito: 'var(--tinta-compito)',
  'docenza-di-classe': 'var(--tinta-docenza)',
  altro: 'var(--tinta-altro)',
}

/** La scaletta come barra continua: ogni attività larga quanto dura. */
function striscia (piano: PianoLezione): HTMLElement {
  const totale = durataPiano(piano)
  if (totale === 0) return h('div', { class: 'testo-quieto' }, 'Scaletta vuota.')

  return h(
    'div',
    { class: 'striscia' },
    ...piano.attivita.map((attivita) =>
      h(
        'div',
        {
          class: 'striscia__tratto',
          style: {
            width: `${(attivita.durataUd / totale) * 100}%`,
            backgroundColor: TINTE[attivita.tipo] ?? TINTE.altro,
          },
          attr: { title: `${attivita.titolo} — ${durataInMinuti(attivita.durataUd)} (${attivita.tipo})` },
        },
        h('span', { class: 'striscia__etichetta' }, attivita.titolo || attivita.tipo),
      ),
    ),
  )
}

/**
 * Le ore di un corso, divise per semestre.
 *
 * Il semestre non è un raggruppamento come un altro: è la scansione su cui la
 * scuola ragiona. Preparando si pensa «il primo semestre lo chiudo con la
 * verifica sulle proporzioni», e per rispondere bisognava scorrere le date una
 * per una contando dove cadeva il confine. Le ore fuori dai semestri — dati
 * scritti a mano, un recupero a settembre — restano in fondo dichiarate invece
 * di sparire.
 */
interface GruppoSemestre {
  etichetta: string
  lezioni: Lezione[]
}

/** Il testo su cui la ricerca lavora per un piano: quel che di lui si ricorda. */
function testoDiPiano (piano: PianoLezione): string {
  return [nomeDiPiano(piano), piano.note, ...piano.tag, ...piano.obiettivi, ...piano.attivita.map((a) => a.titolo)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** I corsi fra cui si sceglie: quelli della classe filtrata, o tutti i visibili. */
function corsiScegliibili (): Corso[] {
  const classi = stato.filtroClasseId
    ? [stato.filtroClasseId]
    : classiVisibili().map((c) => c.id)
  return classi.flatMap((classeId) => corsiDi(classeId))
}

/**
 * Il corso di cui si stanno guardando i piani.
 *
 * È `stato.corsoId`, lo stesso della vista Corsi: chi arriva qui da lì stava
 * già guardando quel corso, e ricominciare da capo sarebbe stato un passaggio
 * in più a ogni cambio di vista. Se quel corso non è fra quelli scegliibili —
 * il filtro per classe è cambiato — si ripiega sul primo.
 */
function corsoScelto (): Corso | null {
  const scegliibili = corsiScegliibili()
  return scegliibili.find((c) => c.id === stato.corsoId) ?? scegliibili[0] ?? null
}

/** Le ore del corso divise per semestre, con la ricerca già applicata. */
function semestriDelCorso (corso: Corso | null): GruppoSemestre[] {
  if (!corso) return []
  const anno = annoCorrente()
  const cerca = stato.ricerca.trim().toLowerCase()
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
    .filter((l) => l.corsoId === corso.id)
    .filter((l) => {
      if (!cerca) return true
      const piano = pianoPerId(l.pianoId)
      return (
        formattaData(l.data).includes(cerca) ||
        (piano ? testoDiPiano(piano).includes(cerca) : false)
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
  if (fuori.length > 0) gruppi.push({ etichetta: 'Fuori dai semestri', lezioni: fuori })

  return gruppi.filter((g) => g.lezioni.length > 0)
}

/** I piani del corso che nessuna sua ora usa: preparati e non ancora messi. */
function pianiSciolti (corso: Corso | null): PianoLezione[] {
  if (!corso) return []
  const cerca = stato.ricerca.trim().toLowerCase()
  const usati = new Set(
    stato.registro.lezioni.map((l) => l.pianoId).filter((id): id is string => Boolean(id)),
  )
  return stato.registro.piani
    .filter((p) => p.corsoId === corso.id && !usati.has(p.id))
    .filter((p) => !cerca || testoDiPiano(p).includes(cerca))
}

/**
 * I piani rimasti senza corso: non dovrebbero esistere.
 *
 * Un piano è di un corso, e il registro non permette più di salvarne uno
 * senza. Ce ne può restare qualcuno soltanto se il corso è stato eliminato
 * sotto — le riparazioni lo staccano invece di buttarlo via — e allora sta
 * qui, in fondo, dichiarato: si riaggancia a un corso o si elimina, ma non
 * resta a galleggiare in un elenco dove sembra un piano come gli altri.
 */
function pianiSenzaCorso (): PianoLezione[] {
  const corsi = new Set(stato.registro.corsi.map((c) => c.id))
  return stato.registro.piani.filter((p) => !p.corsoId || !corsi.has(p.corsoId))
}

/**
 * Di che cosa parla il piano, in due parole: il primo obiettivo, o la prima
 * tappa.
 *
 * Sta nella riga piccola e non è il nome del piano — quello è l'ora, e lo dà
 * `lezioneDiPiano`. È una distinzione che è costata: per un po' i piani si
 * chiamavano con questa stringa, e siccome è la cosa che si riscrive di più
 * mentre si prepara, l'elenco cambiava sotto le dita e due piani che
 * cominciavano con «Ripasso» si presentavano uguali.
 */
function argomentoDiPiano (piano: PianoLezione): string {
  return (
    piano.obiettivi.find((o) => o.trim()) ??
    piano.attivita.find((a) => a.titolo.trim())?.titolo ??
    'scaletta ancora vuota'
  )
}

/** La riga di un piano nell'elenco: quel che è, e quanto pesa. */
function voceDiPiano (piano: PianoLezione, etichetta: string, sotto: string): HTMLElement {
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

/** La riga di un'ora: la sua scaletta, o l'invito a prepararla. */
function voceDiLezione (lezione: Lezione): HTMLElement {
  const piano = pianoPerId(lezione.pianoId)
  // Il nome dell'ora in grande e la data sotto: è così che si nominano le
  // lezioni parlando — «la terza» — ed è lo stesso nome che porta il piano
  // appeso a quell'ora, così le due colonne dicono la stessa parola.
  const nome = nomeDiLezione(lezione)
  const quando = formattaData(lezione.data, 'giorno')

  if (!piano) {
    return h(
      'button',
      {
        class: 'voce-laterale voce-laterale--vuota',
        type: 'button',
        // Senza piano non c'è niente da aprire: il gesto utile è farne uno, e
        // lo si fa da qui invece di andarlo a cercare nel calendario.
        onclick: () => moduloAssegnaPiano(lezione),
      },
      h(
        'span',
        { class: 'voce-laterale__testo' },
        h('strong', null, nome),
        h('small', null, `${quando} · senza piano — preparala`),
      ),
      icona('piu', 'voce-laterale__segno'),
    )
  }
  return voceDiPiano(
    piano,
    nome,
    `${quando} · ${argomentoDiPiano(piano)} · ${durataInMinuti(durataPiano(piano))}`,
  )
}

function elencoPiani (): HTMLElement {
  const corso = corsoScelto()
  const gruppi = semestriDelCorso(corso)
  const sciolti = pianiSciolti(corso)
  const orfani = pianiSenzaCorso()
  const preparate = gruppi.flatMap((g) => g.lezioni).filter((l) => l.pianoId).length
  const ore = gruppi.reduce((somma, g) => somma + g.lezioni.length, 0)

  return h(
    'aside',
    { class: 'elenco-laterale' },
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, corso ? corso.titolo : 'Piani'),
      corso ? h('span', { class: 'testo-quieto' }, `${preparate}/${ore} ore`) : null,
    ),
    campo({
      nome: 'ricercaPiani',
      tipo: 'text',
      valore: stato.ricerca,
      segnaposto: 'cerca per data, obiettivo, tappa',
      fuoco: 'ricerca-piani',
      al: (valore) => aggiorna({ ricerca: valore }),
      classe: 'campo--ricerca',
    }),
    gruppi.length === 0 && sciolti.length === 0 && orfani.length === 0
      ? h(
          'p',
          { class: 'testo-quieto' },
          corso
            ? 'Questo corso non ha ore che corrispondono.'
            : 'Nessun corso da guardare: creane uno, e le sue ore compariranno qui.',
        )
      : h(
          'ul',
          { class: 'elenco-laterale__voci' },
          // Un gruppo per semestre: è la scansione su cui si prepara, e il
          // confine fra i due è la riga che si cerca guardando l'anno.
          ...gruppi.flatMap((gruppo) => [
            h(
              'li',
              { class: 'elenco-laterale__gruppo' },
              h('strong', null, gruppo.etichetta),
              h(
                'span',
                { class: 'testo-quieto' },
                `${gruppo.lezioni.filter((l) => l.pianoId).length}/${gruppo.lezioni.length} preparate`,
              ),
            ),
            ...gruppo.lezioni.map((lezione) => h('li', null, voceDiLezione(lezione))),
          ]),
          ...(sciolti.length > 0
            ? [
                h(
                  'li',
                  { class: 'elenco-laterale__sottogruppo' },
                  `Non ancora assegnati (${sciolti.length})`,
                ),
                // Una bozza non ha un'ora, e allora si chiama con il giorno in
                // cui è nata: l'argomento resta nella riga sotto, dove cambia
                // quanto vuole senza far ballare l'elenco.
                ...sciolti.map((piano) =>
                  h(
                    'li',
                    null,
                    voceDiPiano(
                      piano,
                      lezioneDiPiano(piano),
                      `${argomentoDiPiano(piano)} · ${piano.attivita.length} attività · ${durataInMinuti(durataPiano(piano))}`,
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
                  h('strong', null, 'Senza corso'),
                  h('span', { class: 'testo-quieto' }, 'da riagganciare'),
                ),
                ...orfani.map((piano) =>
                  h(
                    'li',
                    null,
                    voceDiPiano(
                      piano,
                      lezioneDiPiano(piano),
                      `${argomentoDiPiano(piano)} · il corso non c’è più: riaprilo e scegline uno`,
                    ),
                  ),
                ),
              ]
            : []),
        ),
  )
}

/**
 * I momenti nati da questo piano: quelli che lo dichiarano, più quelli
 * attaccati a una lezione che lo usa — un momento creato prima che il legame
 * esistesse resta comunque riconoscibile.
 */
function momentiDelPiano (piano: PianoLezione): MomentoValutazione[] {
  const lezioni = new Set(
    stato.registro.lezioni.filter((l) => l.pianoId === piano.id).map((l) => l.id),
  )
  return stato.registro.valutazioni
    .filter((v) => v.pianoId === piano.id || (v.lezioneId !== null && lezioni.has(v.lezioneId)))
    .sort((a, b) => b.data.localeCompare(a.data))
}

function dettaglioPiano (piano: PianoLezione): HTMLElement {
  const usiInLezioni = stato.registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => b.data.localeCompare(a.data))
  const momenti = momentiDelPiano(piano)
  const valutate = new Set(momenti.map((m) => m.lezioneId))
  // Le tappe da cui escono voti. Il piano non lo dice più per conto suo: è la
  // scaletta a dire quali quarti d'ora sono una prova, e quante ne sono.
  const tappeValutate = piano.attivita.filter(attivitaValutata)

  return h(
    'div',
    { class: 'colonna' },
    scheda({
      titolo: nomeDiPiano(piano),
      sottotitolo: piano.corsoId
        ? `${nomeCorso(piano.corsoId)} · per un altro corso si duplica`
        : 'senza corso: non compare fra i piani di nessuna lezione',
      azioni: [
        pulsante({
          testo: 'Duplica',
          simbolo: 'duplica',
          variante: 'sottile',
          al: async () => {
            const risposta = await azione({ tipo: 'piano.duplica', pianoId: piano.id })
            if (risposta.ok && risposta.creato) aggiorna({ pianoId: risposta.creato.id })
          },
        }),
        // La scaletta in PDF si chiede da Documenti, dove stanno tutti i
        // fogli che escono dal registro.
        pulsante({ testo: 'Modifica', simbolo: 'matita', al: () => moduloPiano(piano) }),
      ],
      contenuto: h(
        'div',
        null,
        sintesiIncassata(
          { etichetta: 'attività', valore: String(piano.attivita.length) },
          { etichetta: 'durata', valore: durataInMinuti(durataPiano(piano)) },
          { etichetta: 'lezioni che lo usano', valore: String(usiInLezioni.length) },
          { etichetta: 'valutazioni', valore: String(momenti.length) },
        ),
        striscia(piano),
        tappeValutate.length > 0
          ? h(
              'div',
              { class: 'riquadro-collegamenti' },
              icona('valutazioni'),
              h(
                'div',
                null,
                h(
                  'strong',
                  null,
                  tappeValutate.length === 1
                    ? 'Una tappa porta voti'
                    : `${tappeValutate.length} tappe portano voti`,
                ),
                ...tappeValutate.map((tappa) =>
                  h(
                    'div',
                    { class: 'testo-quieto' },
                    `${tappa.titolo || 'senza titolo'} → ${tappa.valutazione?.titolo || tappa.titolo}` +
                      ` · ${tappa.valutazione?.tipo}` +
                      (tappa.valutazione && tappa.valutazione.peso !== 1
                        ? ` · peso ${tappa.valutazione.peso}`
                        : ''),
                  ),
                ),
              ),
            )
          : null,
        piano.tag.length > 0
          ? h('div', { class: 'etichette' }, ...piano.tag.map((t) => pastiglia(t, 'quiete')))
          : null,
        piano.obiettivi.length > 0
          ? h(
              'section',
              { class: 'blocco-testo' },
              h('h5', null, 'Obiettivi'),
              h('ul', null, ...piano.obiettivi.map((o) => h('li', null, o))),
            )
          : null,
        piano.prerequisiti
          ? h('section', { class: 'blocco-testo' }, h('h5', null, 'Prerequisiti'), h('p', null, piano.prerequisiti))
          : null,
        h(
          'section',
          { class: 'blocco-testo' },
          h('h5', null, 'Scaletta'),
          piano.attivita.length === 0
            ? h('p', { class: 'testo-quieto' }, 'Ancora nessuna attività.')
            : h(
                'ol',
                { class: 'scaletta scaletta--sola-lettura' },
                // I nomi delle colonne: la scaletta è una tabella, e due tappe
                // si confrontano guardandole in colonna invece di leggerle.
                h(
                  'li',
                  { class: 'scaletta__voce scaletta__voce--intestazione' },
                  h('span', null, '#'),
                  h('span', null, 'Attività'),
                  h('span', null, 'Tipo'),
                  h('span', null, 'Durata'),
                  h('span', null, 'Prova'),
                ),
                ...piano.attivita.map((attivita, indice) =>
                  h(
                    'li',
                    { class: 'scaletta__voce' },
                    h('span', { class: 'scaletta__numero' }, String(indice + 1)),
                    h(
                      'div',
                      { class: 'scaletta__titolo' },
                      h('strong', null, attivita.titolo || 'senza titolo'),
                      attivita.raggruppamento && attivita.raggruppamento !== 'plenaria'
                        ? pastiglia(attivita.raggruppamento, 'informativo')
                        : null,
                    ),
                    h('span', { class: 'scaletta__tipo' }, pastiglia(nomeTipoAttivita(attivita.tipo), 'quiete')),
                    h('span', { class: 'scaletta__durata' }, durataInMinuti(attivita.durataUd)),
                    // La tappa che è una prova lo dice qui: è l'unica riga
                    // della scaletta da cui usciranno dei voti.
                    h(
                      'span',
                      { class: 'scaletta__prova' },
                      attivita.valutazione
                        ? pastiglia(
                            attivita.valutazione.tipo +
                              (attivita.valutazione.peso !== 1
                                ? ` · peso ${attivita.valutazione.peso}`
                                : ''),
                            'attenzione',
                            'valutazioni',
                          )
                        : null,
                    ),
                    h(
                      'div',
                      { class: 'scaletta__estesa' },
                      attivita.descrizione ? h('p', { class: 'scaletta__descrizione' }, attivita.descrizione) : null,
                      attivita.materiali
                        ? h('p', { class: 'scaletta__materiali' }, `Materiali: ${attivita.materiali}`)
                        : null,
                      bloccoRisorse({
                        pianoId: piano.id,
                        attivitaId: attivita.id,
                        risorse: attivita.risorse,
                        compatto: true,
                      }),
                    ),
                  ),
                ),
              ),
        ),
        h(
          'section',
          { class: 'blocco-testo' },
          h('h5', null, 'Risorse del piano'),
          h(
            'p',
            { class: 'testo-quieto' },
            'Materiale che vale per tutta l’ora. I file e le immagini vengono copiati ' +
              'nella cartella del registro, così il piano regge anche l’anno prossimo.',
          ),
          bloccoRisorse({ pianoId: piano.id, attivitaId: null, risorse: piano.risorse }),
        ),
        piano.note ? h('section', { class: 'blocco-testo' }, h('h5', null, 'Note'), h('p', null, piano.note)) : null,
        usiInLezioni.length > 0
          ? h(
              'section',
              { class: 'blocco-testo' },
              h('h5', null, 'Usato nelle lezioni'),
              h(
                'ul',
                { class: 'elenco-collegamenti' },
                ...usiInLezioni.slice(0, 12).map((lezione) =>
                  h(
                    'li',
                    { class: 'elenco-collegamenti__voce' },
                    h(
                      'button',
                      {
                        class: 'collegamento',
                        type: 'button',
                        onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                      },
                      `${formattaData(lezione.data)} · ${nomeClasseDiLezione(lezione)}`,
                    ),
                    // Il piano prevede una prova e quell'ora non l'ha ancora:
                    // lo si dice, e ci si va. Il momento non si crea di qui —
                    // nasce dalla tappa, dentro la lezione, che è l'unico posto
                    // in cui sa da quale tappa viene.
                    tappeValutate.length > 0 && !valutate.has(lezione.id)
                      ? pastiglia('prova da fare', 'attenzione', 'valutazioni')
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
              h('h5', null, 'Valutazioni che ne sono uscite'),
              h(
                'ul',
                { class: 'elenco-collegamenti' },
                ...momenti.slice(0, 12).map((momento) =>
                  h(
                    'li',
                    { class: 'elenco-collegamenti__voce' },
                    h(
                      'button',
                      {
                        class: 'collegamento',
                        type: 'button',
                        onclick: () =>
                          aggiorna({
                            vista: 'valutazioni',
                            valutazioneId: momento.id,
                            filtroClasseId: classeDiMomento(momento)?.id ?? null,
                          }),
                      },
                      `${formattaData(momento.data)} · ${classeDiMomento(momento)?.nome ?? 'senza classe'} — ${momento.titolo}`,
                    ),
                  ),
                ),
              ),
            )
          : null,
      ),
    }),
  )
}

export function vistaPiani (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'piano', avvia: () => moduloAvvio() })
  }

  // Il corso di cui si guardano i piani: la selezione comanda su tutto quel
  // che l'elenco mostra.
  const corso = corsoScelto()
  const gruppi = semestriDelCorso(corso)
  const sciolti = pianiSciolti(corso)

  // Il piano aperto, o il primo che l'elenco mostra: la prima ora preparata del
  // primo semestre, che è da dove si comincia a guardare.
  const primo =
    [
      ...gruppi.flatMap((g) => g.lezioni.map((l) => pianoPerId(l.pianoId))),
      ...sciolti,
    ].find((x): x is PianoLezione => x !== null) ??
    pianiSenzaCorso()[0] ??
    null
  const piano = pianoPerId(stato.pianoId) ?? primo

  // Le ore che aspettano ancora una scaletta: è il lavoro che resta su questo
  // corso, e dirlo in testata evita di contarlo scorrendo l'elenco.
  const daPreparare = gruppi.reduce(
    (somma, g) => somma + g.lezioni.filter((l) => !l.pianoId).length,
    0,
  )
  const scegliibili = corsiScegliibili()

  return h(
    'div',
    { class: 'vista vista--piani' },
    testataVista({
      titolo: 'Piani lezione',
      // Un piano è di un corso e sta su un'ora: non c'è un «nuovo piano» che
      // non sappia di quale ora è, e per questo il pulsante non c'è più. Lo si
      // fa dall'ora che lo aspetta, che è dove si sa che cosa ci vuole.
      sottotitolo:
        !corso
          ? 'nessun corso da preparare'
          : daPreparare > 0
            ? `${daPreparare} ${daPreparare === 1 ? 'ora ancora senza scaletta' : 'ore ancora senza scaletta'}`
            : 'ogni ora di questo corso ha la sua scaletta',
      contorno: h(
        'div',
        { class: 'filtri' },
        selettoreClassi({
          nome: 'filtroClassePiani',
          classi: classiVisibili(),
          valore: stato.filtroClasseId,
          al: (valore) => aggiorna({ filtroClasseId: valore, corsoId: null }),
        }),
        // Il corso si sceglie, non si scorre: i piani sono di un corso, e
        // vederli tutti insieme era un elenco in cui metà delle voci non
        // c'entravano con quel che si stava preparando.
        campo({
          nome: 'corsoPiani',
          etichetta: 'Corso',
          tipo: 'select',
          valore: corso?.id ?? '',
          opzioni: scegliibili.map((c) => ({ valore: c.id, testo: c.titolo })),
          al: (valore) => aggiorna({ corsoId: valore || null, pianoId: null }),
        }),
      ),
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
              titolo: 'Nessun piano lezione',
              // Non c'è un pulsante «crea»: un piano è di un corso e di un'ora,
              // e uno fatto da qui non saprebbe di quale. Lo si fa dall'ora che
              // lo aspetta — nell'elenco accanto, o dal calendario.
              testo:
                'Un piano tiene obiettivi e scaletta con i tempi, e appartiene all’ora per cui ' +
                'lo si prepara. Si comincia da un’ora senza scaletta, nell’elenco qui accanto.',
            }),
          ),
    ),
  )
}
