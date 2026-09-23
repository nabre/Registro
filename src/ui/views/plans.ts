// I piani lezione: la libreria delle scalette.
//
// Un piano non appartiene a una lezione, e questo è il punto: si prepara una
// volta e lo si assegna a più lezioni, anche di classi diverse. Qui si vede la
// scaletta come una striscia di tempo — è così che ci si accorge subito se le
// attività ci stanno dentro all'ora o no.

import { attivitaValutata } from '../../domain/activities.js'
import {
  confrontaLezioni,
  durataPiano,
  minutiDiAttivita,
  minutiDiScarto,
} from '../../domain/calculations.js'
import { oraCoperta } from '../../domain/dashboard.js'
import { MINUTI_UD, formattaData, formattaDurata } from '../../domain/dates.js'

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
import { lezioniDellAnno } from '../../domain/courses.js'
import type { Corso, Lezione, MomentoValutazione, PianoLezione } from '../../domain/models.js'
import { corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { avviso, campo, conAttesa, pastiglia, scheda, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { icona } from '../components/icons.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { editorPiano, moduloAvvio } from '../forms.js'
import { azione, invia } from '../bridge.js'
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
 * Le ore di un corso, divise per semestre.
 *
 * Il semestre non è un raggruppamento come un altro: è la scansione su cui la
 * scuola ragiona. Preparando si pensa «il primo semestre lo chiudo con la
 * verifica sulle proporzioni», e per rispondere bisognava scorrere le date una
 * per una contando dove cadeva il confine. Le ore fuori dai semestri — dati
 * scritti a mano, un recupero a settembre — restano in fondo dichiarate invece
 * di sparire.
 *
 * Il periodo scelto nella barra in cima comanda anche qui: scelto un semestre
 * resta il suo gruppo soltanto, e i gruppi tornano due — con in fondo le ore
 * fuori dai semestri — quando il periodo è l'anno intero. Una tendina che
 * diceva «1° semestre» mentre l'elenco mostrava anche le ore di maggio
 * lasciava credere che il registro avesse due idee diverse di dove si sta
 * lavorando.
 */
interface GruppoSemestre {
  etichetta: string
  lezioni: Lezione[]
}

/** Il testo su cui la ricerca lavora per un piano: quel che di lui si ricorda. */
function testoDiPiano (piano: PianoLezione): string {
  // Non ridotta qui: la riduce `corrispondeAlla`, con la stessa funzione che
  // riduce quel che si è scritto nella casella. Così «unità» trova «Unita» e
  // «UNITÀ», che in un piano lezione è scritto in tutti e tre i modi.
  return [nomeDiPiano(piano), piano.note, ...piano.tag, ...piano.obiettivi, ...piano.attivita.map((a) => a.titolo)]
    .filter(Boolean)
    .join(' ')
}

/**
 * Il corso di cui si stanno guardando i piani.
 *
 * È quello della tendina in cima, lo stesso della vista Corsi: chi arriva qui
 * da lì stava già guardando quel corso, e ricominciare da capo sarebbe stato
 * un passaggio in più a ogni cambio di vista. La pagina aveva le sue due
 * tendine — la classe e poi il corso — e volevano dire scegliere due volte la
 * stessa cosa: la prima restringeva la seconda, e la seconda era comunque una
 * coppia classe e materia.
 */
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

  // Le ore fuori dai semestri si dichiarano solo guardando l'anno intero: con
  // un semestre scelto sono per definizione fuori dal periodo, e `lezioni` le
  // ha già lasciate indietro.
  const dentro = new Set(gruppi.flatMap((g) => g.lezioni.map((l) => l.id)))
  const fuori = scelto ? [] : lezioni.filter((l) => !dentro.has(l.id))
  if (fuori.length > 0) gruppi.push({ etichetta: 'Fuori dai semestri', lezioni: fuori })

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
  // La ricerca vale anche qui. Restandone fuori, questo gruppo era l'unico che
  // non si restringeva mai: si cercava una parola che non c'è da nessuna parte
  // e l'elenco si svuotava tutto tranne «Senza corso», che sembrava allora il
  // solo risultato trovato.
  const pezzi = pezziDiRicerca(stato.ricerca)
  return stato.registro.piani
    .filter((p) => !p.corsoId || !corsi.has(p.corsoId))
    .filter((p) => corrispondeAlla(testoDiPiano(p), pezzi))
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
 * Di quanto la scaletta non torna, scritto e colorato.
 *
 * Il colore fa il lavoro che il numero da solo non fa: in una colonna di venti
 * ore quel che si cerca è dove guardare, e una riga in più in mezzo al grigio
 * si legge solo rileggendole tutte. Due tinte e non una perché sono due lavori
 * diversi — il tempo scoperto è un pezzo d'ora da pensare, la scaletta che
 * sfora è roba già pensata che in aula non ci sta — e chi guarda vuole sapere
 * quale dei due prima di aprire il piano.
 */
function scartoScritto (scarto: number): HTMLElement {
  return h(
    'span',
    { class: `voce-laterale__scarto voce-laterale__scarto--${scarto < 0 ? 'corto' : 'oltre'}` },
    scarto < 0
      ? `${formattaDurata(-scarto)} scoperti`
      : `${formattaDurata(scarto)} oltre l’ora`,
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
        /*
         * Senza piano non c'è niente da aprire, e allora lo si apre facendolo.
         *
         * Prima qui si alzava una finestra a chiedere «vuoi una scaletta vuota
         * o una copia di questa?». Erano due domande di troppo: si è premuta
         * un'ora per prepararla, e la risposta quasi sempre è «vuota», perché
         * quella da copiare la si cerca quando esiste e la si sa. La scaletta
         * nasce e ci si ritrova dentro l'editor, che è dove si stava andando.
         * Riprendere un piano già fatto resta dove ha senso: dal calendario e
         * dal registro dell'ora, dove il piano è una cosa che si assegna, e
         * qui dal pulsante «Duplica» di quello che si vuole riusare.
         */
        // `conAttesa` come i pulsanti veri: questo è un `button` scritto a
        // mano — gli serve l'aspetto di una voce d'elenco, non di un tasto — e
        // restava premibile mentre la scaletta nasceva. Il secondo clic faceva
        // partire una seconda `piano.perLezione`, che tornava indietro
        // rifiutata con una notifica rossa su un gesto che era riuscito.
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
        h('small', null, `${quando} · senza piano — preparala`),
      ),
      icona('piu', 'voce-laterale__segno'),
    )
  }
  // Una scaletta che non torna con l'ora è lavoro rimasto a metà, e va detto
  // qui: il piano c'è, e senza questa riga l'ora si legge come pronta.
  const scarto = minutiDiScarto(piano, lezione)
  if (scarto !== 0) {
    return voceDiPiano(piano, nome, [quando, ' · ', scartoScritto(scarto)])
  }

  // Preparata, l'ora non dice altro che quando è.
  //
  // Sotto il nome ci stava l'argomento del piano e la sua durata, ma quella
  // riga è il posto di «senza piano — preparala»: una cosa da fare, scritta
  // dove si guarda per trovarne. Riempiendola anche quando non c'è niente da
  // fare, le due righe si somigliano abbastanza da doverle leggere tutte per
  // vedere quali ore mancano — e il piano si apre qui accanto per intero, con
  // argomento e durata dentro, un clic più in là.
  return voceDiPiano(piano, nome, quando)
}

function elencoPiani (): HTMLElement {
  const corso = corsoScelto()
  const gruppi = semestriDelCorso(corso)
  const sciolti = pianiSciolti(corso)
  const orfani = pianiSenzaCorso()
  const preparate = gruppi
    .flatMap((g) => g.lezioni)
    .filter((l) => oraCoperta(stato.registro, l)).length
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
                `${gruppo.lezioni.filter((l) => oraCoperta(stato.registro, l)).length}` +
                  `/${gruppo.lezioni.length} preparate`,
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
 * L'editor del piano aperto, vivo fra un ridisegno e l'altro.
 *
 * La pagina si rifà tutta a ogni cambio di stato — un salvataggio, un minuto
 * che passa — e un editor ricostruito ogni volta perderebbe quel che si sta
 * scrivendo. Qui il corpo dei campi si costruisce una volta sola per piano e
 * si riappende al suo posto: `rimpiazza` sposta il nodo, non lo clona, e
 * quindi i campi arrivano dall'altra parte con dentro quel che c'era.
 *
 * Cambiando piano l'editor si rifà. Non si perde niente, perché per cambiare
 * piano bisogna prima uscire dal campo in cui si stava scrivendo, e uscire da
 * un campo è esattamente il momento in cui questo editor salva.
 *
 * Tenerlo vivo però vuol dire tenerlo **vecchio**: il piano può cambiare
 * altrove mentre questo editor aspetta in memoria — dalla matita «Modifica la
 * scaletta» del registro dell'ora, dall'API, da un altro computer — e al primo
 * campo lasciato qui `componi()` rimandava la scaletta di prima, intera: la
 * tappa aggiunta altrove spariva senza un avviso. Per questo l'editor si tiene
 * solo se il piano arrivato è uno di quelli che conosce — quello da cui è
 * nato, o uno che ha mandato lui — oppure se ci si sta scrivendo dentro, che è
 * l'unico caso in cui rifarlo farebbe perdere delle parole. Altrimenti si
 * rifà sul piano com'è adesso.
 */
let inLavorazione: { pianoId: string, corpo: HTMLElement, noti: Set<string> } | null = null

/**
 * Il piano ridotto a quel che l'editor scrive, per riconoscerlo.
 *
 * Senza i due timbri, che li mette l'host a ogni salvataggio e che l'editor
 * non tocca; con le chiavi in ordine, perché lo stesso piano rimandato indietro
 * dall'host può averle in un altro ordine senza essere un altro piano.
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
 * Salva da sé, campo per campo, come fa il registro dell'ora.
 *
 * L'editor è il contenuto della pagina, e una pagina non si «conferma»: non
 * c'è una finestra da chiudere, quindi non c'è il momento in cui premere
 * «Salva». Si manda a ogni modifica confermata — un campo lasciato, una tappa
 * spostata — che è la stessa regola dell'appello.
 *
 * Gli errori non passano da `azione`, e quindi non diventano una notifica
 * rossa: qui si salva in continuazione, e un piano a metà è normale — una
 * tappa appena aggiunta il titolo non ce l'ha ancora. Restano scritti sopra i
 * campi finché la cosa che manca manca davvero, e spariscono da sé appena la
 * si scrive. Quel che l'host rifiuta non si perde: resta nei campi, e il
 * salvataggio riparte al gesto dopo.
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
    // Tolto altrove mentre era aperto: salvarlo adesso lo farebbe rinascere,
    // con dentro la scaletta che qualcuno aveva appena buttato via.
    if (!pianoPerId(piano.id)) {
      mostraErrori(['Non c’è più: è stato tolto altrove.'])
      return
    }
    const mandato = editor.componi()
    if (inLavorazione?.corpo === corpo) inLavorazione.noti.add(impronta(mandato))
    const risposta = await invia({ tipo: 'piano.salva', piano: mandato })
    mostraErrori(risposta.ok ? null : risposta.errori ?? ['Non salvato.'])
  }

  const editor = editorPiano({
    piano,
    // Il corso lo dice l'elenco a sinistra: qui è una riga da leggere.
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

/**
 * Dove questo piano si ritrova: le ore che lo usano, i voti che ne sono usciti.
 *
 * Non è un riepilogo di quel che l'editor mostra già — sono le due strade che
 * da un piano portano fuori, e da nessun'altra parte del registro si risale
 * dalla scaletta alle ore che l'hanno fatta.
 */
function collegamentiDelPiano (piano: PianoLezione): Figlio {
  const usiInLezioni = stato.registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => b.data.localeCompare(a.data))
  const momenti = momentiDelPiano(piano)
  if (usiInLezioni.length === 0 && momenti.length === 0) return null

  const valutate = new Set(momenti.map((m) => m.lezioneId))
  // Il piano prevede almeno una prova: è la scaletta a dirlo, tappa per tappa,
  // e serve qui sotto per segnare le ore che quella prova non ce l'hanno ancora.
  const conProva = piano.attivita.some(attivitaValutata)

  return scheda({
    titolo: 'Dove finisce',
    contenuto: h(
      'div',
      null,
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
                  conProva && !valutate.has(lezione.id)
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
  })
}

/**
 * La colonna del piano aperto: i suoi campi, e nient'altro.
 *
 * Qui stava il riepilogo — la sintesi, la striscia del tempo, la scaletta in
 * sola lettura — e accanto un pulsante «Modifica» che apriva gli stessi dati in
 * una finestra. Erano due disegni della stessa cosa, uno da guardare e uno da
 * toccare, e chi arriva su questa pagina ci arriva per preparare un'ora: la
 * lettura era solo la tappa da attraversare per arrivare alla scrittura. Adesso
 * l'editor è la pagina, e non c'è più niente da attraversare.
 */
function dettaglioPiano (piano: PianoLezione): HTMLElement {
  return h(
    'div',
    { class: 'colonna' },
    scheda({
      titolo: nomeDiPiano(piano),
      // Il corso non si ripete qui: lo dice la prima riga dell'editor, due
      // centimetri più sotto.
      sottotitolo: piano.corsoId
        ? 'quel che si scrive si salva da sé'
        : 'senza corso: non compare fra i piani di nessuna lezione — riagganciane uno qui sotto',
      // Niente pulsanti qui: duplicare, eliminare e andare al registro dell'ora
      // sono i comandi della pagina, e i comandi della pagina stanno nella
      // riga della barra — un piano non ha una sua barra privata.
      contenuto: editorDelPiano(piano),
    }),
    collegamentiDelPiano(piano),
  )
}


/**
 * Il piano che la pagina ha davanti: quello aperto, o il primo dell'elenco.
 *
 * Sta fuori dalla vista perché non la interessa soltanto a lei: i comandi
 * della barra — vai al registro, duplica, elimina — lavorano su quello che si
 * sta guardando, e `stato.pianoId` da solo non basta a dire quale sia. Entrando
 * nella pagina senza averne scelto nessuno è nullo, ma un piano sullo schermo
 * c'è lo stesso: è il primo, ed è quello su cui i comandi devono agire.
 *
 * Il primo è la prima ora preparata del primo semestre, che è da dove si
 * comincia a guardare.
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
 * L'ora su cui questo piano sta, quando ce n'è una: la prima in ordine di
 * giorno. Un piano si può assegnare a più ore — la stessa scaletta in due
 * classi — e allora «vai al registro» porta alla prima, che è quella da cui lo
 * si è preparato.
 */
export function primaOraDelPiano (piano: PianoLezione): Lezione | null {
  // `confrontaLezioni` e non il solo confronto fra date: due ore nello stesso
  // giorno si ordinano per ora d'inizio, e senza quello «vai al registro»
  // poteva aprire la seconda. È lo stesso ordine con cui il calendario le
  // sfoglia, che è il punto: due parti del registro che dicono «la prima»
  // devono indicare la stessa.
  return (
    stato.registro.lezioni
      .filter((l) => l.pianoId === piano.id)
      .sort(confrontaLezioni)[0] ?? null
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
  const piano = pianoMostrato()

  // Le ore che aspettano ancora una scaletta: è il lavoro che resta su questo
  // corso, e dirlo in testata evita di contarlo scorrendo l'elenco.
  const daPreparare = gruppi.reduce(
    (somma, g) => somma + g.lezioni.filter((l) => !l.pianoId).length,
    0,
  )
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
      // Niente filtri qui: il corso si sceglie una volta sola, dalla barra in
      // cima, e da lì comanda su ogni pagina. I piani sono di un corso, e
      // vederli tutti insieme era un elenco in cui metà delle voci non
      // c'entravano con quel che si stava preparando.
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
