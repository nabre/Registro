// Le impostazioni del programma: quelle che restano su questa macchina.
//
// Sono le stesse che la finestra nativa mostrava per conto suo, e sono le
// stesse di `src/manifest.ts` — l'unico elenco. Qui cambia soltanto come si
// leggono: raggruppate per argomento invece che per prefisso della chiave, con
// il nome scritto a parole e il valore sempre accanto al suo perché.
//
// Come si dividono in sezioni sta in `sections.ts`, che non tocca il DOM e si
// prova con `node --test`: è l'unica cosa qui che può rompersi in silenzio.
//
// ## Perché «ritira» e non «cancella»
//
// Un'impostazione non si cancella: si smette di deciderla, e torna a valere il
// predefinito. La differenza si vede — la pastiglia «modificata» sparisce e il
// campo mostra il valore di fabbrica — ed è quel che serve quando si è provato
// qualcosa e non ci si ricorda più da dove si era partiti.

import { chiaviNascoste } from '../../../manifest.js'
import type { VoceProgramma } from '../../../protocol.js'
import {
  avviso,
  campo,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import type { NomeIcona } from '../../components/icons.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import { aggiorna, stato } from '../../state.js'
import {
  avanzateDiSezione,
  gruppiDiSezione,
  nomeVoce,
  sottoPrefisso,
  vociMostrateDaSezione,
  type GruppoVoci,
  type SezioneProgramma,
} from './sections.js'

async function scrivi (chiave: string, valore: string | number | boolean): Promise<void> {
  const risposta = await azione({ tipo: 'programma.salva', chiave, valore })
  if (!risposta.ok) {
    notifica(risposta.errori?.[0] ?? 'Impostazione non salvata.', 'errore')
    return
  }
  // Nessuna notifica di successo: si sta spuntando una casella, e il valore
  // nuovo torna da sé con lo stato — dirlo a parole a ogni clic sarebbe un
  // messaggio ogni due secondi mentre si sistemano le cose.
}

async function ritira (chiave: string): Promise<void> {
  const risposta = await azione({ tipo: 'programma.azzera', chiave })
  if (!risposta.ok) {
    notifica(risposta.errori?.[0] ?? 'Impostazione non ritirata.', 'errore')
    return
  }
  notifica(`${nomeVoce(chiave)}: torna al predefinito.`, 'info')
}

/** Come si scrive un valore quando lo si mostra fuori dal campo. */
function comeSiLegge (voce: VoceProgramma, valore: string | number | boolean): string {
  if (voce.tipo === 'boolean') return valore ? 'acceso' : 'spento'
  if (String(valore) === '') return 'vuoto'
  const scelta = voce.scelte?.find((candidata) => candidata.valore === valore)
  return scelta ? String(scelta.valore) : String(valore)
}

/**
 * Il controllo giusto per il tipo dichiarato nel manifesto.
 *
 * Una voce sospesa si mostra **spenta**, qualunque cosa dica il file: il valore
 * scritto resta dov'è e torna appena il padre si riaccende, ma una casella
 * spuntata sotto un interruttore spento direbbe che qualcosa è concesso quando
 * non lo è. In una pagina che governa un accesso quella è la bugia che conta.
 */
function controllo (voce: VoceProgramma, spenta: boolean): Figlio {
  if (voce.tipo === 'boolean') {
    const acceso = Boolean(voce.valore) && !spenta
    return campo({
      nome: voce.chiave,
      tipo: 'checkbox',
      etichetta: acceso ? 'Acceso' : 'Spento',
      valore: acceso,
      disabilitato: spenta,
      al: (valore) => void scrivi(voce.chiave, valore === 'true'),
    })
  }

  if (voce.scelte) {
    return campo({
      nome: voce.chiave,
      tipo: 'select',
      valore: String(voce.valore),
      disabilitato: spenta,
      // L'aiuto di una scelta è anche la sua etichetta: è mentre si sceglie che
      // serve saperlo, non dopo.
      opzioni: voce.scelte.map((scelta) => ({ valore: String(scelta.valore), testo: scelta.aiuto })),
      al: (valore) => {
        const scelta = voce.scelte?.find((candidata) => String(candidata.valore) === String(valore))
        if (scelta) void scrivi(voce.chiave, scelta.valore)
      },
    })
  }

  if (voce.tipo === 'number') {
    return campo({
      nome: voce.chiave,
      tipo: 'number',
      valore: Number(voce.valore),
      passo: 'any',
      // Gli estremi del manifesto arrivano al campo: le frecce si fermano da
      // sole, e quel che si batte fuori misura il browser lo dice prima di
      // partire. La dogana vera resta dall'altra parte — questo è il cartello
      // sulla porta, non la porta.
      min: voce.minimo ?? undefined,
      max: voce.massimo ?? undefined,
      disabilitato: spenta,
      al: (valore) => {
        const numero = Number(valore)
        if (String(valore).trim() === '' || !Number.isFinite(numero)) return
        void scrivi(voce.chiave, numero)
      },
    })
  }

  return campo({
    nome: voce.chiave,
    tipo: voce.formato === 'email' ? 'email' : 'text',
    valore: String(voce.valore ?? ''),
    disabilitato: spenta,
    al: (valore) => void scrivi(voce.chiave, String(valore)),
  })
}

/**
 * Una riga di impostazione: che cos'è, com'è adesso, e da dove viene il valore.
 *
 * La chiave resta scritta, in piccolo: è quella che compare nei messaggi
 * d'errore, nella guida e nelle conversazioni fra colleghi — «mettiti
 * `posta.mittente`» — e toglierla per bellezza vorrebbe dire lasciare senza
 * appiglio chi arriva da lì.
 */
export function vociProgramma (voce: VoceProgramma): HTMLElement {
  // Già decisa da chi ha costruito l'elenco: è la stessa regola che vede la
  // finestra nativa, e vederla applicata in due posti vorrebbe dire due modi
  // di sbagliarla.
  const spenta = voce.sospesa
  return h(
    'div',
    {
      class: [
        'voce-opzione',
        voce.scritta && 'voce-opzione--scritta',
        spenta && 'voce-opzione--sospesa',
      ],
    },
    h(
      'div',
      { class: 'voce-opzione__testata' },
      h('span', { class: 'voce-opzione__nome' }, nomeVoce(voce.chiave)),
      // Perché non si può toccare, detto dov'è il gesto che non funziona: chi
      // clicca su una casella morta cerca la spiegazione lì, non nel testo
      // sotto al campo.
      spenta
        ? pastiglia(`sospesa · ${nomeVoce(voce.dipendeDa ?? '')} è spento`, 'quiete')
        : null,
      // Modificata: si dice anche *da che cosa*, perché è l'unica informazione
      // che serve per decidere se ritirarla — «l'ho messo io, e prima era
      // acceso» — e andarla a cercare altrove vorrebbe dire aprire il manifesto.
      voce.scritta
        ? pastiglia(`modificata · prima: ${comeSiLegge(voce, voce.predefinito)}`, 'attenzione')
        : pastiglia(`predefinito: ${comeSiLegge(voce, voce.valore)}`, 'quiete'),
      h('code', { class: 'voce-opzione__chiave' }, voce.chiave),
      voce.scritta
        ? pulsante({
            testo: 'Ritira',
            simbolo: 'ricarica',
            variante: 'fantasma',
            titolo: `Torna al predefinito: ${comeSiLegge(voce, voce.predefinito)}`,
            al: () => void ritira(voce.chiave),
          })
        : null,
    ),
    h('div', { class: 'voce-opzione__campo' }, controllo(voce, spenta)),
    h('p', { class: 'voce-opzione__aiuto' }, voce.descrizione),
  )
}

/**
 * Le voci che una sezione mostra, prese da quelle che il pannello ha mandato.
 *
 * L'elenco **e** quel che la scheda dedicata disegna da sé: chi chiama sta
 * contando o ritirando, e per tutti e due i gesti una chiave promossa in
 * scheda è in pagina come le altre. Contando solo l'elenco,
 * `posta.invioDiretto` si vedeva segnata «modificata» e «Ripristina» la
 * lasciava indietro senza dirlo.
 */
export function vociDellaSezione (sezione: SezioneProgramma): VoceProgramma[] {
  return vociMostrateDaSezione(stato.programma, sezione)
}

/**
 * Un gruppo di impostazioni, con il suo titolo.
 *
 * Il titolo si scrive solo quando aggiunge qualcosa: un gruppo di una voce sola
 * che si chiama come lei — «Apertura automatica» sopra «Apertura automatica» —
 * è rumore, e in una pagina di impostazioni il rumore è la ragione per cui non
 * si trova niente.
 */
function disegnaGruppo (gruppo: GruppoVoci): HTMLElement {
  const titoloUtile =
    gruppo.voci.length > 1 || nomeVoce(gruppo.voci[0]?.chiave ?? '') !== gruppo.titolo

  return h(
    'section',
    { class: 'gruppo-opzioni' },
    titoloUtile ? h('h4', { class: 'gruppo-opzioni__titolo' }, gruppo.titolo) : null,
    h('div', { class: 'voci-opzioni' }, ...gruppo.voci.map((voce) => vociProgramma(voce))),
  )
}

/** Quante voci di una sezione sono state decise a mano. */
function quanteScritte (voci: VoceProgramma[]): number {
  return voci.filter((voce) => voce.scritta).length
}

/**
 * Quali gruppi avanzati stanno aperti, per sezione.
 *
 * Fuori dallo stato e fuori dal DOM: il pannello ridisegna la vista intera a
 * ogni salvataggio, e un `<details>` ricostruito chiuso richiuderebbe il
 * gruppo sotto le dita di chi ha appena corretto un percorso. Non è una
 * preferenza da ritrovare domani — è dove si sta guardando adesso — e per
 * questo non viaggia con lo stato persistito.
 */
const avanzateAperte = new Set<string>()

/**
 * Le voci che si toccano una volta ogni tre anni, in fondo e chiuse.
 *
 * Sono i percorsi degli eseguibili e le attese massime. Stavano in fila con il
 * tema e con il microfono, e facevano sembrare tecnica e lunga una sezione che
 * per il resto si legge in un minuto. Chiuse restano raggiungibili in un clic;
 * tolte non lo sarebbero più, e un percorso sbagliato è esattamente il genere
 * di cosa che si viene a cercare qui.
 */
/**
 * Che cosa si legge quando una sezione non ha niente da mostrare.
 *
 * Tre vuoti diversi, e dirli tutti con la stessa frase era una bugia che si
 * vedeva a schermo: l'ultima sezione è vuota **per mestiere** — raccoglie quel
 * che nessuna ha nominato — mentre una sezione qualunque vuota vuol dire che le
 * impostazioni non sono ancora arrivate dall'ospite, e allora la frase del
 * raccoglitore racconta una cosa che non c'entra. Il terzo caso è il filtro,
 * che è l'unico in cui la persona ha fatto qualcosa e sa già perché.
 */
function vuotoDi (sezione: SezioneProgramma): { simbolo: NomeIcona, titolo: string, testo: string } {
  if (sezione.raccoglie) {
    return {
      simbolo: 'impostazioni',
      titolo: 'Niente da raccogliere',
      testo:
        'Questa sezione non ha impostazioni sue: tiene quel che nessuna delle altre ha nominato, '
        + 'e resta vuota finché non ce n’è nessuna da raccogliere.',
    }
  }
  return {
    simbolo: 'impostazioni',
    titolo: 'Impostazioni non ancora arrivate',
    testo:
      'Questa sezione ha delle impostazioni, ma non sono ancora state lette. Succede per un '
      + 'istante all’apertura; se resta così, il registro non sta rispondendo.',
  }
}

function disegnaAvanzate (sezione: SezioneProgramma, voci: VoceProgramma[]): Figlio {
  if (voci.length === 0) return null
  const scritte = quanteScritte(voci)
  return h(
    'details',
    {
      class: 'gruppo-opzioni gruppo-opzioni--avanzate',
      // Aperto da sé quando qualcosa lì dentro è stato deciso a mano: se c'è un
      // percorso scritto, è quello che si viene a rileggere.
      open: avanzateAperte.has(sezione.id) || scritte > 0,
      ontoggle: (evento: Event) => {
        const suo = evento.currentTarget as HTMLDetailsElement
        if (suo.open) avanzateAperte.add(sezione.id)
        else avanzateAperte.delete(sezione.id)
      },
    },
    h(
      'summary',
      { class: 'gruppo-opzioni__titolo' },
      `Percorsi e attese (${voci.length})`,
    ),
    h('div', { class: 'voci-opzioni' }, ...voci.map((voce) => vociProgramma(voce))),
  )
}

/**
 * Il gesto che rimette l'agenda dov'è nata.
 *
 * Dove sta, quanto è larga e su quale linguetta si riapre non sono scelte da
 * offrire: le scrive il trascinamento del widget, e battute a mano non
 * avrebbero effetto fino alla prossima apertura. Per questo non sono più in
 * pagina — `nascosta` nel manifesto. Resta però il caso per cui qualcuno le
 * cercava: l'agenda rimasta su uno schermo staccato, o larga mezzo desktop.
 * Questo le ritira tutte insieme, che è l'unica cosa che serviva davvero.
 *
 * Le chiavi vengono dal manifesto e non da un elenco scritto qui: una sesta
 * chiave di posa aggiunta domani entrerebbe da sola, mentre un elenco a mano
 * resterebbe di cinque e il pulsante mentirebbe per metà.
 */
function rimettiAPosto (sezione: SezioneProgramma): Figlio {
  const chiavi = chiaviNascoste().filter((chiave) => sottoPrefisso(chiave, sezione.prefissi))
  if (chiavi.length === 0) return null

  return h(
    'div',
    { class: 'opzioni__rimando' },
    h(
      'p',
      { class: 'opzioni__rimando-testo' },
      'Dove sta l’agenda, quanto è larga e su quale linguetta si riapre le scrive il widget '
        + 'mentre lo si trascina: non si battono a mano, e qui non compaiono. Se è finita fuori '
        + 'schermo o troppo larga, questo le ritira tutte e la riapre dove nasce.',
    ),
    pulsante({
      testo: 'Rimetti l’agenda dov’è nata',
      simbolo: 'ricarica',
      variante: 'sottile',
      titolo: 'Ritira posizione, misura e linguetta: valgono alla prossima apertura',
      al: async () => {
        for (const chiave of chiavi) await azione({ tipo: 'programma.azzera', chiave })
        notifica('Agenda: posizione e misura ritirate. Vale alla prossima apertura.', 'info')
      },
    }),
  )
}

/**
 * Una sezione intera, con il gesto che la riporta com'era.
 *
 * «Ripristina» chiede prima, e dice quante ne tocca: è l'unico gesto della
 * pagina che disfa più di una cosa insieme, e quel che disfa non si vede tutto
 * da una schermata.
 */
export function schedaProgramma (sezione: SezioneProgramma): HTMLElement {
  const voci = vociDellaSezione(sezione)
  const scritte = quanteScritte(voci)

  return scheda({
    titolo: sezione.titolo,
    sottotitolo: sezione.sottotitolo,
    classe: 'scheda--opzioni',
    azioni:
      scritte > 0
        ? pulsante({
            testo: `Ripristina (${scritte})`,
            simbolo: 'ricarica',
            variante: 'sottile',
            titolo: 'Ritira i valori decisi a mano in questa sezione',
            al: async () => {
              const sicuro = await conferma({
                titolo: `Ripristinare «${sezione.titolo}»?`,
                testo:
                  `${scritte} impostazion${scritte === 1 ? 'e torna' : 'i tornano'} al valore ` +
                  'predefinito. Quel che sta nel documento d’anno non si tocca.',
                testoConferma: 'Ripristina',
              })
              if (!sicuro) return
              for (const voce of voci.filter((candidata) => candidata.scritta)) {
                await azione({ tipo: 'programma.azzera', chiave: voce.chiave })
              }
              notifica(`«${sezione.titolo}»: tornata ai predefiniti.`, 'info')
            },
          })
        : null,
    contenuto: h(
      'div',
      null,
      // Prima di tutto il resto: qui non si regola il proprio computer, si
      // concede a un altro programma di guardarci dentro. Detto dopo le
      // caselle sarebbe detto a cose fatte.
      sezione.avvertenza
        ? avviso(h('div', null, sezione.avvertenza.replace(/\*\*/g, '')), 'attenzione')
        : null,
      rimandoAllaPagina(sezione),
      rimettiAPosto(sezione),
      voci.length === 0
        ? statoVuoto(vuotoDi(sezione))
        : h(
            'div',
            { class: 'gruppi-opzioni' },
            ...gruppiDiSezione(stato.programma, sezione).map((gruppo) => disegnaGruppo(gruppo)),
            disegnaAvanzate(sezione, avanzateDiSezione(stato.programma, sezione)),
          ),
    ),
  })
}

/**
 * La riga che manda dove il lavoro si fa davvero.
 *
 * Le impostazioni dei modelli tengono **un nome di file**, e un nome di file
 * non si batte a mano: chi arriva qui senza aver mai scaricato niente si
 * troverebbe davanti una casella vuota accanto alla frase «il file .gguf con
 * cui risponde l'assistente», e nient'altro. Il pulsante è quel «nient'altro».
 *
 * Non duplica la pagina e non la riassume: la nomina. Quel che si può fare di
 * là — scaricare, trascinare dentro, vedere quanto pesa, togliere — non si può
 * fare da una riga di impostazioni, e provare a metterlo qui vorrebbe dire due
 * posti in cui si sceglie un modello.
 */
function rimandoAllaPagina (sezione: SezioneProgramma): Figlio {
  if (!sezione.pagina) return null
  const { vista, testo, perche } = sezione.pagina
  return h(
    'div',
    { class: 'opzioni__rimando' },
    h('p', { class: 'opzioni__rimando-testo' }, perche.replace(/\*\*/g, '')),
    pulsante({
      testo,
      simbolo: 'bot',
      variante: 'primario',
      al: () => aggiorna({ vista }),
    }),
  )
}

/**
 * Il cappello della scheda «Programma»: dove finiscono questi valori.
 *
 * Una riga sola, ma è la riga che evita la domanda che nasce ogni volta —
 * «questa cosa la ritrovo sull'altro computer?» — e che altrimenti trova
 * risposta solo per tentativi.
 */
export function dovVannoLeOpzioni (): HTMLElement {
  return avviso(
    h(
      'div',
      null,
      h('strong', null, 'Restano su questa macchina. '),
      'Valgono per tutti gli anni e per tutti i documenti aperti qui, e non viaggiano con il ' +
        'file del registro: aprendo lo stesso documento su un altro computer, lì valgono le ' +
        'impostazioni di quel computer.',
    ),
    'informativo',
  )
}
