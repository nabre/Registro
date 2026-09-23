// Le persone in formazione dell'anno, tutte insieme, con la scheda accanto.
//
// La scheda di una persona c'era già, ma ci si arrivava solo passando dalla sua
// classe: si apriva «Classi», si sceglieva la classe giusta, si cercava il nome
// nella tabella. Tre gesti che vanno bene finché si sa di chi si sta parlando e
// in che classe sta — e al telefono non si sa quasi mai. «Mi chiama la mamma di
// Damiano» non è una domanda sulla III MEC B: è una domanda su Damiano.
//
// Qui l'elenco è uno solo e attraversa le classi. Si scrive un pezzo di nome —
// o di azienda, o di paese — e quel che resta è la persona, con la sua scheda
// aperta di fianco.
//
// La scheda non è scritta qui: è la stessa di `views/student.ts`, presa da
// `schedaAllievo`. Due schede che dicono le stesse cose in due pagine diverse
// sarebbero diventate due schede diverse al primo pannello aggiunto.
//
// ## Perché la ricerca non passa dallo stato
//
// Un `aggiorna` rifà la vista intera: è la regola del pannello, ed è giusta
// quasi sempre. Non qui. Accanto all'elenco c'è la scheda, e dentro la scheda
// ci sono due cose che un ridisegno non si porta dietro gratis: il **ritratto**,
// che è un file servito da `registro://` e va riletto dal documento, e il
// **riquadro della mappa**, che è una carta viva — rifarla vuol dire ributtarla
// all'inquadratura di partenza e riscaricare le piastrelle. Battere sei lettere
// in una casella di ricerca avrebbe rifatto sei volte tutte e due.
//
// Quel che si cerca sta quindi in una variabile di questo modulo, e a ogni
// lettera si rifà **il solo elenco**: la scheda accanto non viene toccata. Il
// prezzo è che la ricerca non sopravvive alla chiusura del pannello — e non è
// un prezzo: una casella di ricerca che si riapre piena è una pagina che
// nasconde metà delle persone senza dire perché.

import { nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { scriviIndirizzo } from '../../domain/addresses.js'
import { Molti, PERSONE, PIF, un } from '../../domain/lexicon.js'
import type { Allievo, Classe } from '../../domain/models.js'
import { telefoniDi } from '../../domain/phones.js'
import { corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { pastiglia, pulsante, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { moduloAllievo, moduloAvvio } from '../forms.js'
import { aggiorna, annoCorrente, classiVisibili, ricorda, stato } from '../state.js'
import { schedaAllievo } from './student.js'

/** Quel che si sta cercando. Vive quanto il pannello: vedi la nota in testa. */
let cercato = ''

/**
 * Se una classe è aperta a fantasmino.
 *
 * Chiuse di principio: chi insegna in cinque classi ne guarda una per volta, e
 * un elenco di centoventi nomi in colonna è un elenco che si scorre, non uno
 * che si legge. Si apre quella su cui si sta lavorando, e quella resta aperta
 * anche riaprendo il pannello — a differenza della ricerca, che si svuota: una
 * classe aperta mostra dei nomi in più, una casella piena ne nasconde tutti
 * quelli che non corrispondono, e quello sì andava dimenticato.
 *
 * Il ricordo sta nello stato dell'applicazione (`classiApertePersone`), non in
 * una variabile di questo modulo.
 *
 * Chiudere una classe non nasconde la scheda aperta: quella sta nell'altra
 * colonna e non dipende da chi si vede in questa.
 */
function apertaDaChiGuarda (classeId: string): boolean {
  return stato.classiApertePersone.includes(classeId)
}

/** Apre quel che è chiuso e chiude quel che è aperto, e se lo ricorda. */
function inverti (classeId: string): void {
  stato.classiApertePersone = apertaDaChiGuarda(classeId)
    ? stato.classiApertePersone.filter((id) => id !== classeId)
    : [...stato.classiApertePersone, classeId]
  // `ricorda` e non `aggiorna`: qui si ridisegna il solo elenco, e un
  // aggiornamento vero rifarebbe anche la scheda accanto — vedi la nota in
  // testa al modulo.
  ricorda()
}

/** Una persona con la classe da cui viene: l'elenco attraversa le classi. */
interface Voce {
  classe: Classe
  allievo: Allievo
}

/**
 * Tutto quel che di una persona si può cercare, in una riga sola.
 *
 * Non minuscola e non ripulita: a ridurla è `corrispondeAlla`, con la stessa
 * funzione che riduce quel che si è scritto nella casella. Lo stesso confronto
 * lo fa `persone.cerca` dall'altra parte del muro, e le due ricerche devono
 * trovare le stesse persone.
 *
 * Non solo il nome: al telefono si cerca anche per azienda («quello che fa il
 * tirocinio dai Bernasconi»), per paese, per un pezzo di numero letto su un
 * foglio. Cercare in una riga sola vuol dire che chi scrive non deve sapere in
 * quale casella stia quel che si ricorda.
 */
function paglia (voce: Voce): string {
  const { allievo, classe } = voce
  return [
    nomeCompleto(allievo),
    classe.nome,
    allievo.azienda,
    allievo.email,
    allievo.emailTutore,
    allievo.emailDatore,
    scriviIndirizzo(allievo.indirizzo),
    scriviIndirizzo(allievo.indirizzoDatore),
    ...(allievo.telefoni ?? []).map((t) => t.numero),
  ]
    .filter(Boolean)
    .join(' ')
}

/** L'elenco dell'anno, per classe e poi per cognome: l'ordine di un registro. */
function tutte (): Voce[] {
  return classiVisibili().flatMap((classe) =>
    ordinaAllievi(classe.allievi).map((allievo) => ({ classe, allievo })),
  )
}

/**
 * Quel che resta dopo aver scritto nella casella.
 *
 * Ogni pezzo scritto deve trovarsi: «rossi dic» trova Rossi della DIC4a e non
 * tutti i Rossi più tutta la DIC4a. È il modo in cui si restringe una ricerca
 * aggiungendo una parola, invece di allargarla.
 */
function filtrate (voci: Voce[]): Voce[] {
  const pezzi = pezziDiRicerca(cercato)
  if (pezzi.length === 0) return voci
  return voci.filter((voce) => corrispondeAlla(paglia(voce), pezzi))
}

/**
 * La riga di una persona nell'elenco.
 *
 * Il nome sopra, la classe e l'azienda sotto: sono le due cose che distinguono
 * due persone che si chiamano quasi uguale, ed è quel che si legge per essere
 * sicuri di aver aperto la scheda giusta.
 */
function vocePersona (voce: Voce, scelta: boolean): HTMLElement {
  const { allievo, classe } = voce
  return h(
    'li',
    null,
    h(
      'button',
      {
        class: [
          'voce-laterale',
          scelta && 'voce-laterale--attiva',
          // Chi si è ritirato resta nell'elenco, spento: la sua scheda si
          // guarda ancora, e toglierlo vorrebbe dire una persona raggiungibile
          // solo da un anno archiviato.
          !allievo.attivo && 'voce-laterale--spenta',
        ],
        type: 'button',
        onclick: () =>
          aggiorna({ vista: 'persone', classeId: classe.id, allievoId: allievo.id }),
      },
      h(
        'span',
        { class: 'voce-laterale__testo' },
        h('strong', null, nomeCompleto(allievo)),
        h('small', null, [classe.nome, allievo.azienda].filter(Boolean).join(' · ')),
      ),
    ),
  )
}

/** I nomi raggruppati per classe: l'ordine con cui si legge un registro. */
function gruppiDiClasse (
  voci: Voce[],
  sceltoId: string | null,
  ridisegna: () => void,
): Figlio {
  if (voci.length === 0) {
    return h('p', { class: 'testo-quieto' }, 'Nessun nome corrisponde a quel che hai scritto.')
  }

  const gruppi = new Map<string, Voce[]>()
  for (const voce of voci) {
    const fila = gruppi.get(voce.classe.id)
    if (fila) fila.push(voce)
    else gruppi.set(voce.classe.id, [voce])
  }

  return [...gruppi.values()].map((fila) => {
    const classe = fila[0].classe
    // Cercando si vuole vedere quel che si è trovato: una classe chiusa che
    // nasconde l'unico nome che corrisponde è una ricerca che sembra non aver
    // trovato niente. La chiusura resta segnata e torna svuotando la casella.
    const aperta = apertaDaChiGuarda(classe.id) || cercato.trim() !== ''
    return h(
      'div',
      null,
      h(
        'button',
        {
          class: ['elenco-laterale__gruppo', 'gruppo-classe'],
          type: 'button',
          attr: { 'aria-expanded': aperta },
          onclick: () => {
            inverti(classe.id)
            ridisegna()
          },
        },
        icona(aperta ? 'giu' : 'destra', 'gruppo-classe__freccia'),
        h('span', null, classe.nome),
        h('span', { class: 'testo-quieto' }, String(fila.length)),
      ),
      aperta
        ? h(
            'ul',
            { class: 'elenco-laterale__voci' },
            ...fila.map((voce) => vocePersona(voce, voce.allievo.id === sceltoId)),
          )
        : null,
    )
  })
}
/**
 * L'elenco laterale, con la casella che lo restringe.
 *
 * La casella è un `input` scritto a mano e non un `campo`: quello reagisce a
 * `change`, cioè quando si esce dalla casella o si preme invio, e una ricerca
 * che si vede solo a cose fatte non è una ricerca. Qui si filtra a ogni
 * lettera, e a ogni lettera si rifà solo questa scatola.
 */
function elencoPersone (voci: Voce[], sceltoId: string | null): HTMLElement {
  const conto = h('span', { class: 'testo-quieto' }, String(filtrate(voci).length))
  const corpo = h('div', { class: 'elenco-persone' })

  const ridisegna = () => {
    const restano = filtrate(voci)
    rimpiazza(corpo, gruppiDiClasse(restano, sceltoId, ridisegna))
    rimpiazza(conto, String(restano.length))
  }
  ridisegna()

  const casella = h('input', {
    class: 'campo__controllo campo--ricerca',
    type: 'search',
    value: cercato,
    attr: {
      placeholder: 'cerca per nome, classe, azienda, paese',
      'aria-label': `Cerca fra le ${PIF.plurale}`,
      autocomplete: 'off',
    },
    // `data-fuoco` è quel che rimette il cursore qui dopo un ridisegno vero —
    // un dato arrivato dall'host mentre si sta scrivendo.
    dataset: { fuoco: 'ricerca-persone' },
    oninput: (evento: Event) => {
      cercato = (evento.target as HTMLInputElement).value
      ridisegna()
    },
  })

  return h(
    'div',
    {
      class: 'elenco-laterale',
      // Dov'era arrivato l'occhio. Scegliendo un nome la vista si rifà
      // — cambia la scheda accanto — e senza questa riga l'elenco tornava in
      // cima: chi sta scorrendo la quarta classe si ritrovava alla prima dopo
      // ogni nome aperto, e doveva riscorrere per aprire quello sotto.
      dataset: { scorrimento: 'elenco-persone' },
    },
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, Molti(PIF)),
      conto,
    ),
    casella,
    corpo,
  )
}
/**
 * Che cosa manca, detto una volta sola in testata.
 *
 * Non è un rimprovero: è la lista della spesa di chi prepara i colloqui o deve
 * spedire qualcosa, e prima si scopriva una scheda per volta.
 */
function riassunto (voci: Voce[]): string {
  const attive = voci.filter((v) => v.allievo.attivo)
  const senzaAzienda = attive.filter((v) => !v.allievo.azienda?.trim()).length
  const senzaNumero = attive.filter((v) => telefoniDi(v.allievo, 'pif').length === 0).length

  return [
    `${attive.length} in formazione`,
    voci.length > attive.length ? `${voci.length - attive.length} non frequenta più` : null,
    senzaAzienda > 0 ? `${senzaAzienda} senza ${PERSONE.azienda.singolare}` : null,
    senzaNumero > 0 ? `${senzaNumero} senza telefono` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Che cosa c'è scritto nella casella di ricerca, e chi l'elenco sta mostrando.
 *
 * Le legge la veduta dell'assistente, e non per comodità: la ricerca di questa
 * pagina **non passa dallo stato** — vedi la nota in testa al file — quindi da
 * fuori non c'è nessun altro modo di sapere che l'elenco è ristretto. Senza,
 * il contesto diceva «tutte le persone della classe» a chi ne ha tre sotto gli
 * occhi, e il modello rispondeva su venticinque nomi di cui ventidue non erano
 * a schermo.
 *
 * Gli id sono quelli dei nomi che si leggono davvero: una classe chiusa
 * a fantasmino non mostra nessuno, e cercando le classi si aprono tutte.
 */
export function ricercaDellePersone (): string {
  return cercato.trim()
}

export function personeInElenco (): string[] {
  const ricerca = cercato.trim() !== ''
  return filtrate(tutte())
    .filter((voce) => ricerca || apertaDaChiGuarda(voce.classe.id))
    .map((voce) => voce.allievo.id)
}

export function vistaPersone (): Figlio {
  if (!annoCorrente()) {
    return statoVuotoAnno({ simbolo: 'utente', avvia: () => moduloAvvio() })
  }

  const elenco = tutte()
  // Chi si sta guardando si cerca fra tutte e non fra quelle rimaste: se la
  // ricerca l'ha appena escluso, la scheda resta aperta lo stesso — chiuderla
  // mentre si scrive vorrebbe dire perdere di vista la persona di cui si stava
  // parlando.
  const scelta = elenco.find((voce) => voce.allievo.id === stato.allievoId) ?? null

  return h(
    'div',
    { class: 'vista vista--persone' },
    testataVista({
      titolo: Molti(PIF),
      sottotitolo: elenco.length === 0 ? 'nessuna, per ora' : riassunto(elenco),
      azioni: scelta
        ? [
            pulsante({
              testo: 'A tutta pagina',
              simbolo: 'utente',
              variante: 'sottile',
              titolo: `La scheda di ${nomeCompleto(scelta.allievo)} senza l’elenco accanto`,
              al: () =>
                aggiorna({
                  vista: 'allievo',
                  classeId: scelta.classe.id,
                  allievoId: scelta.allievo.id,
                }),
            }),
            pulsante({
              testo: 'Modifica',
              simbolo: 'matita',
              al: () => moduloAllievo(scelta.classe, scelta.allievo),
            }),
          ]
        : null,
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco' },
      elencoPersone(elenco, scelta?.allievo.id ?? null),
      scelta
        ? h(
            'div',
            { class: 'colonna' },
            // Il nome sopra la scheda: il titolo della pagina dice «Persone in
            // formazione», e senza un nome qui non si saprebbe di chi sono i
            // pannelli che seguono.
            h(
              'header',
              { class: 'persone__intestazione' },
              h('h2', null, nomeCompleto(scelta.allievo)),
              h('span', { class: 'testo-quieto' }, scelta.classe.nome),
              scelta.allievo.attivo ? null : pastiglia('non frequenta', 'quiete'),
            ),
            schedaAllievo(scelta.classe, scelta.allievo),
          )
        : statoVuoto({
            simbolo: 'utente',
            titolo: elenco.length === 0 ? `Nessuna ${PIF.singolare}` : `Scegli ${un(PIF)}`,
            testo:
              elenco.length === 0
                ? `Le ${PIF.plurale} si aggiungono dentro una classe, una per una o incollando l’elenco.`
                : `Dall’elenco a sinistra: la scheda si apre qui accanto, con tutto quel che il registro sa di ${un(PIF)}.`,
            azione:
              elenco.length === 0
                ? pulsante({
                    testo: 'Vai alle classi',
                    variante: 'primario',
                    simbolo: 'classi',
                    al: () => aggiorna({ vista: 'classi' }),
                  })
                : undefined,
          }),
    ),
  )
}
