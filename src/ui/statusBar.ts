// La barra in fondo: che cosa manca, e com'è messa la macchina.
//
// Risponde alla domanda che ci si fa aprendo il registro senza sapere ancora
// perché lo si è aperto — «c'è qualcosa da fare?» — e ci porta dentro con un
// clic. È l'unico posto del registro che si guarda senza cercare niente, quindi
// deve stare in poche parole e non deve mai mentire.
//
// Due gruppi e una regola per stare zitti.
//
//   A sinistra quel che chiede qualcosa a chi insegna: l'ora da compilare, le
//   pendenze. Sono voci che si premono.
//
//   A destra com'è messa la macchina: la rete, la posta, l'anno in uso. Sono
//   voci di stato, e due su tre si premono per andare dove si cambiano.
//
// La regola è che una voce che non ha niente da dire non compare. Una barra che
// dice sempre le stesse otto cose diventa sfondo in tre giorni, e allora il
// giorno in cui dice «senza rete» non la legge più nessuno.

import { CARTE, quanti } from '../domain/lexicon.js'
import { oraDaCompilare } from '../domain/dashboard.js'
import { formattaData, oggi } from '../domain/dates.js'
import { nomeCompleto } from '../domain/calculations.js'
import { riepilogoTodo } from '../domain/todo.js'
import { icona, type NomeIcona } from './components/icons.js'
import { classeDelFascicolo, corsoDelContesto, nomeDelCorso } from './context.js'
import {
  nomeDelGruppo,
  nomeDelPosto,
  paginaAttiva,
  simboloDelGruppo,
  simboloDiPagina,
} from './pages.js'
import { porzioneAttiva } from './tabs.js'
import { h, type Figlio } from './dom.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  corsiDellAnnoAperto,
  lezionePerId,
  lezioniInAgenda,
  nelSemestreScelto,
  nomeClasseDiLezione,
  nomeDiPiano,
  pianoPerId,
  stato,
} from './state.js'

/** Il tono di una voce: decide il colore del puntino e nient'altro. */
type Tono = 'quiete' | 'positivo' | 'attenzione' | 'negativo'

interface Voce {
  simbolo: NomeIcona
  testo: string
  /** Quel che si legge fermandosi sopra: la riga lunga che nella barra non ci sta. */
  titolo: string
  tono?: Tono
  /** Se c'è, la voce è un pulsante. Se non c'è, è una scritta. */
  al?: () => void
}

function voce (v: Voce): HTMLElement {
  const dentro: Figlio[] = [
    icona(v.simbolo, 'icona--minuta'),
    h('span', { class: 'barra-stato__testo' }, v.testo),
  ]
  const classe = ['barra-stato__voce', v.tono && `barra-stato__voce--${v.tono}`]

  if (!v.al) return h('span', { class: classe, attr: { title: v.titolo } }, dentro)

  return h(
    'button',
    {
      class: [...classe, 'barra-stato__voce--premibile'],
      type: 'button',
      attr: { title: v.titolo },
      onclick: v.al,
    },
    dentro,
  )
}

// ------------------------------------------------------------------ dove sono

/** Che cosa dice un passo del percorso: serve a disegnarlo e a spiegarlo. */
type Ruolo = 'mestiere' | 'contesto' | 'pagina' | 'elemento' | 'porzione'

interface Passo {
  ruolo: Ruolo
  simbolo: NomeIcona
  testo: string
}

/** Come si chiama un anello del percorso, per chi si ferma sopra a chiederselo. */
const NOMI_RUOLO: Record<Ruolo, string> = {
  mestiere: 'Area',
  contesto: 'Su che cosa',
  pagina: 'Pagina',
  elemento: 'Aperto',
  porzione: 'Sezione',
}

/**
 * Il percorso della pagina aperta, passo per passo.
 *
 * Cinque anelli al massimo, dal largo allo stretto:
 *
 *     Registro › DIC4a · Matematica › Lezione › lun 14 set 08:20 › Annotazioni
 *      area         su che cosa       pagina       aperto            sezione
 *
 * Il corso c'è, e ci torna dopo essere stato tolto. Era stato levato perché lo
 * dice anche la riga delle scelte in cima — ma quella risponde a «su che cosa
 * lavoro», mentre qui risponde a «di chi è quel che sto guardando», e senza di
 * lui gli ultimi due anelli restano ambigui: «lun 14 set 08:20 › Annotazioni»
 * non dice di quale classe siano quelle annotazioni, e due ore dello stesso
 * giorno in due classi diverse fanno lo stesso identico percorso.
 *
 * Non si preme. Un percorso in una barra di stato risponde alla domanda «dove
 * sono», non «dove posso andare»: per andare ci sono la barra laterale e la
 * palette, e due strade per lo stesso posto vogliono dire due cose da tenere
 * d'accordo. Qui si legge e basta.
 *
 * Gli anelli vuoti si saltano: la pagina delle classi non ha sezioni né un
 * elemento aperto, e un percorso con un buco in mezzo si legge peggio di uno
 * corto.
 */
function passiDelPercorso (): Passo[] {
  const pagina = paginaAttiva()
  const porzione = porzioneAttiva()
  const contesto = suCheCosa()
  const aperto = elementoAperto()

  const passi: Array<Passo | null> = [
    pagina
      ? { ruolo: 'mestiere', simbolo: simboloDelGruppo(pagina.gruppo), testo: nomeDelGruppo(pagina.gruppo) }
      : null,
    contesto,
    pagina ? { ruolo: 'pagina', simbolo: pagina.simbolo, testo: nomeDelPosto() } : null,
    aperto,
    porzione ? { ruolo: 'porzione', simbolo: porzione.simbolo, testo: porzione.testo } : null,
  ]
  return passi.filter((passo): passo is Passo => passo !== null)
}

/**
 * Di chi è quel che si sta guardando: il corso nelle pagine del registro, la
 * classe nel fascicolo del docente di classe.
 *
 * È l'anello che cambia senza cambiare pagina, ed è quello che qualifica tutti
 * quelli dopo di lui.
 */
function suCheCosa (): Passo | null {
  const gruppo = paginaAttiva()?.gruppo
  if (gruppo === 'registro') {
    const corso = corsoDelContesto()
    return corso
      ? { ruolo: 'contesto', simbolo: simboloDiPagina('pagina.corsi'), testo: nomeDelCorso(corso) }
      : null
  }
  if (gruppo === 'classe') {
    const classe = classeDelFascicolo()
    return classe
      ? { ruolo: 'contesto', simbolo: simboloDiPagina('pagina.classi'), testo: classe.nome }
      : null
  }
  return null
}

/** Che cosa si è aperto dentro la pagina: l'ora, la persona, la scaletta, la prova. */
function elementoAperto (): Passo | null {
  const passo = (simbolo: NomeIcona, testo: string | null | undefined): Passo | null =>
    testo ? { ruolo: 'elemento', simbolo, testo } : null

  switch (stato.vista) {
    case 'lezione': {
      const lezione = lezionePerId(stato.lezioneId)
      if (!lezione) return null
      const inizio = lezione.slot[0]?.inizio
      return passo(
        simboloDiPagina('pagina.corso.registro'),
        `${formattaData(lezione.data, 'giorno')}${inizio ? ` ${inizio}` : ''}`,
      )
    }
    case 'calendario':
      return passo(simboloDiPagina('pagina.calendario'), formattaData(stato.data, 'giorno'))
    case 'allievo': {
      const allievo = stato.registro.classi
        .flatMap((classe) => classe.allievi)
        .find((a) => a.id === stato.allievoId)
      // La scheda di una persona non è una pagina della barra laterale — vive
      // dentro Classi — e il suo segno è quello che le persone portano in ogni
      // comando che le riguarda.
      return passo('utente', allievo ? nomeCompleto(allievo) : null)
    }
    case 'piani': {
      const piano = pianoPerId(stato.pianoId)
      return passo(simboloDiPagina('pagina.corso.piani'), piano ? nomeDiPiano(piano) : null)
    }
    case 'valutazioni': {
      const momento = stato.registro.valutazioni.find((v) => v.id === stato.valutazioneId)
      return passo(simboloDiPagina('pagina.corso.valutazioni'), momento?.titolo)
    }
    default:
      return null
  }
}

/**
 * Un anello: la sua freccia, la sua icona, il suo nome.
 *
 * La freccia sta *dentro* il passo che segue, e non è un vezzo: stringendo la
 * finestra spariscono gli anelli larghi — l'area, il corso — e una freccia
 * lasciata fuori resterebbe lì a separare niente da niente.
 *
 * L'icona è quella che quella cosa porta dovunque altro nel registro: il segno
 * del mestiere è lo stesso della scheda in cima, quello della pagina è lo
 * stesso della voce nella barra laterale, quello della sezione è lo stesso
 * della linguetta che si è premuta. È il modo in cui i cinque anelli si
 * distinguono a colpo d'occhio senza dover leggere cinque parole in fila.
 */
function anello (passo: Passo, primo: boolean, ultimo: boolean): HTMLElement {
  return h(
    'span',
    {
      class: [
        'barra-stato__passo',
        `barra-stato__passo--${passo.ruolo}`,
        ultimo && 'barra-stato__passo--qui',
      ],
      attr: { title: `${NOMI_RUOLO[passo.ruolo]}: ${passo.testo}` },
    },
    // La freccia è decorazione: chi legge con la voce ha già il percorso intero
    // nell'etichetta del gruppo, e sentirsi scandire «maggiore» fra una parola
    // e l'altra non gli direbbe niente di più.
    primo
      ? null
      : icona('destra', 'icona--minuta barra-stato__freccia'),
    icona(passo.simbolo, 'icona--minuta barra-stato__segno'),
    h('span', { class: 'barra-stato__briciola' }, passo.testo),
  )
}

function vociDelPercorso (): Figlio[] {
  const passi = passiDelPercorso()
  if (passi.length === 0) return []
  const ultimo = passi.length - 1

  return [
    h(
      'nav',
      {
        class: 'barra-stato__percorso',
        attr: {
          'aria-label': `Percorso: ${passi.map((p) => `${NOMI_RUOLO[p.ruolo]} ${p.testo}`).join(', ')}`,
        },
      },
      ...passi.map((passo, i) => anello(passo, i === 0, i === ultimo)),
    ),
  ]
}

// ---------------------------------------------------------------- i filtri

/**
 * Una tendina nella barra: non dice come sta il registro, dice di che cosa sta
 * parlando la voce qui accanto.
 *
 * Sta in fondo e non in cima perché è lì che serve: la prima voce della barra
 * è l'ora da fare, e la domanda che le si fa subito dopo — «di quale corso?»,
 * «e nell'altro semestre?» — si risponde senza risalire alla riga delle
 * scelte, che per giunta il filtro del calendario lo mostra soltanto nel
 * calendario. Sono le stesse due scelte, scritte negli stessi due campi: si
 * cambiano di qua e si ritrovano cambiate di là.
 */
function filtro (opzioni: {
  /** Il nome con cui ritrovare il fuoco dopo il ridisegno: vedi `ricordaFuoco`. */
  nome: string
  simbolo: NomeIcona
  etichetta: string
  titolo: string
  /**
   * Quel che la tendina deve dire adesso.
   *
   * Non basta `selected` sulle option: quando il campo ricordato punta a un
   * corso che nel documento aperto non c'è — si apre un altro anno e quel
   * campo sopravvive — nessuna option lo porta, e il browser accende la prima.
   * Il valore chiesto qui lo applica `h` **dopo** aver appeso le option, e una
   * scelta che non esiste lascia la tendina in bianco invece di mentire.
   */
  valore: string
  al: (valore: string) => void
  figli: Figlio[]
}): HTMLElement {
  return h(
    'label',
    { class: 'barra-stato__filtro', attr: { title: opzioni.titolo } },
    icona(opzioni.simbolo, 'icona--minuta'),
    h(
      'select',
      {
        class: 'barra-stato__tendina',
        // Cambiare filtro rifà tutta la finestra, questa tendina compresa:
        // senza una chiave di fuoco il secondo cambio andrebbe fatto
        // ricliccando, perché il primo si sarebbe portato via il fuoco.
        dataset: { fuoco: `barra-stato-${opzioni.nome}` },
        attr: { 'aria-label': opzioni.etichetta },
        value: opzioni.valore,
        onchange: (evento: Event) => opzioni.al((evento.target as HTMLSelectElement).value),
      },
      ...opzioni.figli,
    ),
    // La freccia la disegniamo noi: la tendina ha `appearance: none` perché
    // quella di sistema è la cosa più alta della barra e le gonfia la riga.
    icona('giu', 'icona--minuta'),
  )
}

/**
 * Il filtro del calendario, identico a quello della riga delle scelte: un
 * corso alla volta, o tutti. Scrive in `filtroCorsoAgendaId` — il campo del
 * calendario — e non nel corso del registro: restringe quel che si guarda,
 * non sposta il lavoro su un altro corso.
 */
function filtroDelCorso (): Figlio {
  const corsi = corsiDellAnnoAperto()
  if (corsi.length === 0) return null

  return filtro({
    nome: 'corso',
    simbolo: 'classi',
    etichetta: 'Corso',
    titolo: 'Restringe a un corso l’ora qui accanto e il calendario. Non cambia il corso del registro.',
    valore: stato.filtroCorsoAgendaId ?? '',
    al: (valore) => aggiorna({ filtroCorsoAgendaId: valore || null }),
    figli: [
      h('option', { value: '', selected: stato.filtroCorsoAgendaId === null }, 'Tutti i corsi'),
      ...corsi.map((corso) =>
        h(
          'option',
          { value: corso.id, selected: corso.id === stato.filtroCorsoAgendaId },
          nomeDelCorso(corso),
        ),
      ),
    ],
  })
}

/**
 * Il periodo dei conti, la stessa scelta che sta nella riga sopra.
 *
 * Non basta metterla qui: deve filtrare per davvero quel che le sta accanto, e
 * infatti `vociDelRegistro` cerca l'ora da fare soltanto fra quelle che cadono
 * nel periodo scelto. Una tendina che dicesse «primo semestre» mentre la voce
 * di fianco annuncia un'ora di maggio sarebbe l'unica cosa che una barra di
 * stato non può permettersi: dire due cose che non stanno insieme.
 */
function filtroDelPeriodo (): Figlio {
  const anno = annoCorrente()
  if (!anno || anno.semestri.length === 0) return null

  return filtro({
    nome: 'periodo',
    simbolo: 'calendario',
    etichetta: 'Periodo',
    titolo: 'Il periodo su cui sono fatti i conti — medie, assenze, ore — e in cui si cerca l’ora qui accanto',
    valore: stato.semestreId ?? '',
    al: (valore) => aggiorna({ semestreId: valore || null }),
    figli: [
      ...anno.semestri.map((semestre) =>
        h(
          'option',
          { value: semestre.id, selected: semestre.id === stato.semestreId },
          semestre.etichetta,
        ),
      ),
      h('option', { value: '', selected: stato.semestreId === null }, 'Anno intero'),
    ],
  })
}

// --------------------------------------------------------------- il registro

/** «oggi», o il giorno scritto: quel che si direbbe a voce. */
function quando (data: string): string {
  if (data === stato.adessoData) return 'oggi'
  return formattaData(data, 'giorno')
}

function vociDelRegistro (): Figlio[] {
  // Sulle ore in agenda e non su tutte: se si sta filtrando per un corso, la
  // barra parla di quello — altrimenti direbbe di un buco che in questo momento
  // non si sta guardando, e non si troverebbe premendola. E dentro il periodo
  // scelto, per la stessa ragione: i due filtri sono qui accanto, e una voce
  // che li ignorasse li smentirebbe a un dito di distanza.
  const trovata = oraDaCompilare(
    stato.registro,
    nelSemestreScelto(lezioniInAgenda()),
    stato.adessoData,
    stato.adessoOra,
  )

  if (!trovata) {
    return [
      voce({
        simbolo: 'agenda',
        testo: 'nessuna ora in programma',
        titolo: 'Non ci sono lezioni da fare né da compilare, fra quelle che i filtri qui accanto lasciano vedere',
        tono: 'quiete',
      }),
    ]
  }

  const { lezione, manca } = trovata
  const classe = nomeClasseDiLezione(lezione)
  const inizio = lezione.slot[0]?.inizio ?? ''

  return [
    voce({
      simbolo: manca ? 'avviso' : 'agenda',
      testo: manca
        ? `da compilare: ${classe} · ${quando(lezione.data)}`
        : `prossima: ${classe} · ${quando(lezione.data)}${inizio ? ` ${inizio}` : ''}`,
      titolo: manca
        ? `L'ora di ${formattaData(lezione.data, 'lungo')} è passata e il suo registro non è a posto.\nApri il registro della lezione`
        : `Prossima ora: ${formattaData(lezione.data, 'lungo')}${inizio ? `, alle ${inizio}` : ''}.\nApri il registro della lezione`,
      tono: manca ? 'attenzione' : 'quiete',
      al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
    }),
  ]
}

// ------------------------------------------------------------- quel che resta

function vociDelLavoro (): Figlio[] {
  const voci: Figlio[] = []

  const classi = classiDellAnno()
  const riepilogo = riepilogoTodo(stato.registro, classi, corsiDellAnnoAperto(), oggi())
  if (riepilogo.aperti > 0) {
    voci.push(
      voce({
        simbolo: 'spunta',
        testo: quanti(riepilogo.aperti, CARTE.pendenza),
        titolo:
          riepilogo.urgenti > 0
            ? `${riepilogo.urgenti} in ritardo su ${riepilogo.aperti}.\nApri le ${CARTE.pendenza.plurale}`
            : `Quel che resta da chiudere.\nApri le ${CARTE.pendenza.plurale}`,
        tono: riepilogo.urgenti > 0 ? 'attenzione' : 'quiete',
        al: () => aggiorna({ vista: 'todo' }),
      }),
    )
  }

  // La lettura delle scansioni: c'è solo mentre macina, e allora è la cosa più
  // interessante della barra — è l'unica che si muove da sola.
  const lavoro = stato.lavoro
  if (lavoro.totale > 0) {
    voci.push(
      voce({
        simbolo: 'orologio',
        testo: `legge ${lavoro.fatte + 1} di ${lavoro.totale}`,
        // `.etichetta` e non l'oggetto intero: `corrente` è la pagina in
        // lavorazione — smistamento, numero, etichetta — e interpolata così
        // com'era diceva «Sta leggendo [object Object]» a chi si fermava sopra
        // la barra mentre il registro macinava le scansioni.
        titolo: lavoro.corrente
          ? `Sta leggendo ${lavoro.corrente.etichetta}`
          : 'Sta leggendo le scansioni dei PDF in attesa',
        tono: 'quiete',
      }),
    )
  }

  return voci
}

// ------------------------------------------------------------- la connettività

/**
 * Da dove escono le comunicazioni, detto in tre parole.
 *
 * Non è la stessa domanda di «c'è rete»: si può essere collegatissimi e non
 * avere una casella, e allora le comunicazioni escono come file `.eml` da
 * aprire a mano. Chi guarda la barra prima di mandare venticinque messaggi
 * vuole sapere questo, non se il Wi-Fi è acceso.
 */
function vociDellaPosta (): Figlio[] {
  const posta = stato.posta

  if (!stato.rete) {
    return [
      voce({
        simbolo: 'avviso',
        testo: 'senza rete',
        titolo:
          'Il computer non è in rete: le comunicazioni non partono e le scansioni non si leggono.\n' +
          'Quel che si scrive nel registro si salva lo stesso, sul disco.',
        tono: 'negativo',
      }),
    ]
  }

  if (posta.exchange) {
    return [
      voce({
        simbolo: 'posta',
        testo: posta.invioDiretto ? 'spedisce da sé' : 'casella collegata',
        titolo:
          `Collegata a ${posta.server}${posta.mittente ? ` come ${posta.mittente}` : ''}.\n` +
          (posta.invioDiretto
            ? 'L’invio diretto è acceso: le comunicazioni partono da qui.'
            : 'L’invio diretto è spento: il registro prepara le bozze e le mandi tu.') +
          '\nApri le impostazioni della posta',
        tono: 'positivo',
        al: () => aggiorna({ vista: 'impostazioni' }),
      }),
    ]
  }

  return [
    voce({
      simbolo: 'posta',
      testo: 'bozze in file .eml',
      titolo:
        'La casella non è collegata: le comunicazioni non partono da qui.\n' +
        'Le bozze escono come file .eml da aprire con il programma di posta.\n' +
        'Apri le impostazioni della posta',
      tono: 'quiete',
      al: () => aggiorna({ vista: 'impostazioni' }),
    }),
  ]
}

function vociDellAnno (): Figlio[] {
  const anno = annoCorrente()
  if (!anno) return []
  return [
    voce({
      simbolo: 'libro',
      // Solo l'anno: il periodo lo dice la tendina in fondo a sinistra, e
      // scriverlo due volte nella stessa barra è un invito a chiedersi quale
      // delle due valga.
      testo: anno.etichetta,
      titolo: 'L’anno scolastico in uso.\nApri le impostazioni',
      tono: 'quiete',
      al: () => aggiorna({ vista: 'impostazioni' }),
    }),
  ]
}

// ------------------------------------------------------------------- la barra

export function barraStato (): Figlio {
  return h(
    'footer',
    {
      class: 'barra-stato',
      attr: { role: 'contentinfo', 'aria-label': 'Stato del registro' },
    },
    // Quattro blocchi e non una fila di undici voci.
    //
    // Ogni blocco risponde a una domanda sola — che cosa mi tocca, su che cosa
    // sto guardando, dove sono, com'è messa la macchina — e fra un blocco e
    // l'altro passa un filo. Senza, la barra è una striscia di parole in cui
    // «da compilare: DIC4a» e «Tutti i corsi» si leggono come se fossero la
    // stessa frase; e un blocco che resta vuoto — non ci sono filtri, non c'è
    // percorso — sparisce con il suo filo invece di lasciare una riga sospesa.
    h(
      'div',
      { class: 'barra-stato__gruppo' },
      h('div', { class: 'barra-stato__blocco' }, vociDelRegistro(), vociDelLavoro()),
      h('div', { class: 'barra-stato__blocco' }, filtroDelCorso(), filtroDelPeriodo()),
    ),
    h(
      'div',
      { class: 'barra-stato__gruppo barra-stato__gruppo--coda' },
      h('div', { class: 'barra-stato__blocco' }, ...vociDelPercorso()),
      h('div', { class: 'barra-stato__blocco' }, vociDellaPosta(), vociDellAnno()),
    ),
  )
}
