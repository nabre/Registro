// Il telaio: barra di navigazione a sinistra, vista a destra.
//
// La barra è divisa in tre fasce, e la divisione dice come si lavora.
//
// In cima le due pagine che non appartengono a nessun corso: il calendario —
// quando si fa lezione, tutte le classi insieme — e il todo, che è la stessa
// domanda sul lavoro da fare. Sono le due cose che si guardano prima di sapere
// di quale materia ci si sta occupando.
//
// In mezzo i corsi, uno per riga: aprendone uno compaiono sotto di lui le sue
// pagine — registro, piani, valutazioni, documenti — già puntate su quel corso.
// Erano voci fisse, una per pagina, e ognuna chiedeva di scegliere il corso da
// una tendina in cima alla vista: la stessa scelta rifatta quattro volte per
// seguire una materia dall'ora al documento. Qui il corso si sceglie una volta,
// ed è il ramo dentro cui si sta.
//
// In fondo quel che si tocca di rado: l'elenco dei corsi e quello delle classi
// — dove si crea e si sistema, non dove si lavora — poi impostazioni e guida. E
// sotto ancora l'anno e il semestre in uso: decidono che cosa si vede in tutte
// le viste, e in particolare quali corsi la barra elenca, quindi devono stare
// dove li si possa controllare con un'occhiata.

import { riparazioni } from '../dominio/riparazioni.js'
import { avviso, pulsante } from './componenti/base.js'
import { icona, type NomeIcona } from './componenti/icone.js'
import { conferma } from './componenti/modale.js'
import { barraProiezione, pulsanteProiezione } from './componenti/proiezione.js'
import { notifica } from './componenti/notifiche.js'
import { h, type Figlio } from './dom.js'
import { azione, lavoroInCorso } from './ponte.js'
import {
  aggiorna,
  annoCorrente,
  corsiNelSemestre,
  corsoAperto,
  corsoPerId,
  lezioneDiRiferimentoDiCorso,
  lezionePerId,
  nomeClasse,
  nomeMateria,
  nomeSemestreScelto,
  stato,
  type StatoUI,
  type Vista,
} from './stato.js'
import type { Corso } from '../dominio/modelli.js'
import { vistaAllievo } from './viste/allievo.js'
import { vistaCalendario } from './viste/calendario.js'
import { vistaClassi } from './viste/classi.js'
import { classiDiCuiSonoDocente, vistaDocenteClasse } from './viste/docenteClasse.js'
import { vistaGuida } from './viste/guida.js'
import { vistaTodo } from './viste/todo.js'
import { vistaCorsi } from './viste/corsi.js'
import { vistaDocumenti } from './viste/documenti.js'
import { vistaImpostazioni } from './viste/impostazioni.js'
import { vistaLezione } from './viste/lezione.js'
import { vistaPiani } from './viste/piani.js'
import { vistaValutazioni } from './viste/valutazioni.js'

interface VoceNavigazione {
  vista: Vista
  etichetta: string
  simbolo: NomeIcona
}

/**
 * Le due pagine che valgono per tutti i corsi insieme, e per questo stanno
 * sopra l'elenco dei corsi invece che dentro a uno.
 */
const VOCI_TESTA: VoceNavigazione[] = [
  { vista: 'calendario', etichetta: 'Calendario', simbolo: 'calendario' },
  { vista: 'todo', etichetta: 'Todo', simbolo: 'spunta' },
]

/**
 * Le pagine che vivono dentro un corso, nell'ordine in cui un corso si
 * percorre: si scrive l'ora, si prepara la prossima, si mettono i voti, e alla
 * fine esce la carta da consegnare.
 */
const VOCI_CORSO: VoceNavigazione[] = [
  { vista: 'lezione', etichetta: 'Registro', simbolo: 'agenda' },
  { vista: 'piani', etichetta: 'Piani lezione', simbolo: 'piano' },
  { vista: 'valutazioni', etichetta: 'Valutazioni', simbolo: 'valutazioni' },
  { vista: 'documenti', etichetta: 'Documenti', simbolo: 'esporta' },
]

/** Le viste che mostrano un corso alla volta: sono quelle di `VOCI_CORSO`. */
const VISTE_DI_CORSO = new Set<Vista>(VOCI_CORSO.map((voce) => voce.vista))

/**
 * Quel che non è lavoro quotidiano: gli elenchi da cui si crea e si sistema —
 * i corsi e le classi — e poi le due voci che si configurano una volta e a cui
 * si torna quando qualcosa non torna.
 *
 * Corsi e Classi stanno qui e non più in mezzo alle pagine di ogni giorno: da
 * quando i corsi sono il ramo che regge tutto il resto, la pagina che li
 * elenca serve a farne uno nuovo o a cambiargli l'orario, non a raggiungerli.
 */
const VOCI_PIEDE: VoceNavigazione[] = [
  { vista: 'corsi', etichetta: 'Corsi', simbolo: 'libro' },
  { vista: 'classi', etichetta: 'Classi', simbolo: 'classi' },
  { vista: 'impostazioni', etichetta: 'Impostazioni', simbolo: 'impostazioni' },
  { vista: 'guida', etichetta: 'Guida', simbolo: 'informazione' },
]

/** Una voce della navigazione: l'icona, l'etichetta e la vista che apre. */
function voceNavigazione (voce: VoceNavigazione, attiva: Vista): HTMLElement {
  return h(
    'li',
    null,
    h(
      'button',
      {
        class: ['voce-navigazione', attiva === voce.vista && 'voce-navigazione--attiva'],
        type: 'button',
        attr: { 'aria-current': attiva === voce.vista ? 'page' : null },
        onclick: () => aggiorna({ vista: voce.vista }),
      },
      icona(voce.simbolo),
      h('span', null, voce.etichetta),
    ),
  )
}

/**
 * L'intestazione di un gruppo di voci.
 *
 * Il sottotitolo, dove c'è, dice il filtro che il gruppo sta subendo: sopra i
 * corsi c'è scritto il semestre, perché è quello a decidere quali corsi la
 * barra elenca e quali no — e un elenco che nasconde delle righe senza dire
 * perché è un elenco in cui si cerca quel che non c'è.
 */
function intestazioneGruppo (simbolo: NomeIcona, titolo: string, sottotitolo?: string): HTMLElement {
  return h(
    'div',
    { class: 'barra-laterale__marchio' },
    icona(simbolo, 'icona--marchio'),
    h(
      'span',
      { class: 'barra-laterale__titolo' },
      titolo,
      sottotitolo ? h('small', null, sottotitolo) : null,
    ),
  )
}

// ------------------------------------------------------------------ i corsi

/**
 * Qual è il corso di cui si sta guardando una pagina, o `null` se la pagina
 * aperta non è di un corso.
 *
 * Il registro dell'ora fa storia a sé: lì il corso è quello della lezione
 * aperta — la si può raggiungere dal calendario, che di corsi ne mostra tanti
 * — e non quello scelto per ultimo nella barra. Fuori di lì vale la stessa
 * regola delle pagine, che sta scritta in `corsoAperto`.
 */
function corsoInVista (): string | null {
  if (!VISTE_DI_CORSO.has(stato.vista)) return null
  if (stato.vista === 'lezione') {
    const lezione = lezionePerId(stato.lezioneId)
    if (lezione) return lezione.corsoId
  }
  return corsoAperto()?.id ?? null
}

/**
 * Come si chiama un corso nella barra: la sua classe, e basta.
 *
 * La materia è il titolo sopra il mucchio, e chi insegna la stessa materia a
 * quattro classi aveva quattro righe che cominciavano tutte uguali — «DIC4a —
 * Calcolo professionale», «DIC3b — Calcolo professionale» — con la parte che
 * distingue schiacciata a destra, dove la barra la taglia. Il titolo per
 * esteso resta nel `title` della riga.
 */
function etichettaCorso (corso: Corso): string {
  return nomeClasse(corso.classeId) || corso.titolo || 'corso senza classe'
}

/** Il titolo intero, per il `title`: dice materia e classe anche fuori contesto. */
function titoloCorso (corso: Corso): string {
  return corso.titolo || `${etichettaCorso(corso)} — ${nomeMateria(corso.materiaId)}`
}

/** Apre o chiude le pagine di un corso, senza toccare quel che si sta guardando. */
function commutaCorso (corsoId: string): void {
  aggiorna({
    corsiAperti: stato.corsiAperti.includes(corsoId)
      ? stato.corsiAperti.filter((id) => id !== corsoId)
      : [...stato.corsiAperti, corsoId],
  })
}

/**
 * Apre una pagina puntata su un corso preciso.
 *
 * Si sistemano insieme il corso e la classe: le pagine filtrano per tutti e
 * due — i piani scelgono il corso fra quelli della classe filtrata — e
 * cambiarne uno solo vorrebbe dire arrivare su una pagina che il corso chiesto
 * non lo contiene. Il registro chiede in più su quale ora aprirsi, e la sceglie
 * dentro il corso e dentro il semestre.
 */
function apriPaginaDiCorso (corso: Corso, vista: Vista): void {
  const modifiche: Partial<StatoUI> = { vista, corsoId: corso.id, filtroClasseId: corso.classeId }
  if (vista === 'lezione') {
    const lezioneId = lezioneDiRiferimentoDiCorso(corso.id)
    if (!lezioneId) {
      notifica('Questo corso non ha ancora nessuna lezione.', 'avviso')
      return
    }
    modifiche.lezioneId = lezioneId
  }
  aggiorna(modifiche)
}

/** Un corso nella barra: il titolo, e sotto — se aperto — le sue quattro pagine. */
function voceCorso (corso: Corso, corsoAttivoId: string | null): HTMLElement {
  const attivo = corso.id === corsoAttivoId
  // Il corso che si sta guardando è aperto, sempre: si arriva a una lezione da
  // fuori — una voce di menu, una data nel calendario — e la pagina
  // compariva sotto un menu chiuso, senza niente
  // intorno che dicesse di quale corso fosse quell'ora.
  const aperto = attivo || stato.corsiAperti.includes(corso.id)

  return h(
    'li',
    { class: 'corso-navigazione' },
    h(
      'button',
      {
        class: [
          'voce-navigazione',
          'voce-navigazione--corso',
          attivo && 'voce-navigazione--corso-attivo',
        ],
        type: 'button',
        attr: {
          'aria-expanded': aperto ? 'true' : 'false',
          title: `${titoloCorso(corso)} — ${aperto ? 'chiudi' : 'apri'} le sue pagine`,
        },
        onclick: () => commutaCorso(corso.id),
      },
      icona(aperto ? 'giu' : 'destra', 'icona--freccia'),
      h('span', { class: 'voce-navigazione__testo' }, etichettaCorso(corso)),
    ),
    aperto
      ? h(
          'ul',
          { class: 'barra-laterale__voci barra-laterale__voci--annidate' },
          ...VOCI_CORSO.map((voce) => {
            const acceso = attivo && stato.vista === voce.vista
            return h(
              'li',
              null,
              h(
                'button',
                {
                  class: [
                    'voce-navigazione',
                    'voce-navigazione--annidata',
                    acceso && 'voce-navigazione--attiva',
                  ],
                  type: 'button',
                  attr: { 'aria-current': acceso ? 'page' : null },
                  onclick: () => apriPaginaDiCorso(corso, voce.vista),
                },
                icona(voce.simbolo),
                h('span', null, voce.etichetta),
              ),
            )
          }),
          // Il mestiere di docente di classe sta dentro il corso di quella
          // classe, e solo per chi lo è: prima era un gruppo a parte, e la
          // stessa classe compariva due volte nella barra — una come corso che
          // si insegna, una come classe di cui si è responsabili.
          sonoDocenteDi(corso.classeId) ? voceDocenteDiClasse(corso.classeId) : null,
        )
      : null,
  )
}

/** Se la classe di quel corso è una di quelle di cui si è docente di classe. */
function sonoDocenteDi (classeId: string): boolean {
  return classiDiCuiSonoDocente().some((classe) => classe.id === classeId)
}

/**
 * La voce «Docente di classe» dentro il menu di un corso.
 *
 * Sta con le altre pagine del corso perché si raggiunge nello stesso momento —
 * si è dentro quella classe, e si passa dal registro dell'ora ai documenti da
 * riscuotere — e non è una pagina del corso: è della classe, e per questo apre
 * la vista con la classe e non con il corso.
 */
function voceDocenteDiClasse (classeId: string): Figlio {
  const acceso = stato.vista === 'docenteClasse' && stato.classeId === classeId
  return h(
    'li',
    null,
    h(
      'button',
      {
        class: [
          'voce-navigazione',
          'voce-navigazione--annidata',
          acceso && 'voce-navigazione--attiva',
        ],
        type: 'button',
        attr: { 'aria-current': acceso ? 'page' : null },
        onclick: () => aggiorna({ vista: 'docenteClasse', classeId }),
      },
      icona('posta'),
      h('span', null, 'Docente di classe'),
    ),
  )
}

/**
 * I corsi raccolti per materia, in ordine di nome: dentro ogni materia le
 * classi che la svolgono, anche loro in ordine.
 *
 * È il modo in cui si tengono in testa: si insegna una materia a più classi, e
 * la stessa scaletta gira su tutte. I corsi senza materia — capita a un corso
 * appena creato — restano in fondo sotto un titolo che lo dice, invece di
 * sparire dalla barra.
 */
function corsiPerMateria (corsi: Corso[]): Array<{ titolo: string; corsi: Corso[] }> {
  const gruppi = new Map<string, { titolo: string; corsi: Corso[] }>()
  for (const corso of corsi) {
    const chiave = corso.materiaId ?? ''
    const gruppo = gruppi.get(chiave) ?? {
      titolo: nomeMateria(corso.materiaId) || 'Senza materia',
      corsi: [],
    }
    gruppo.corsi.push(corso)
    gruppi.set(chiave, gruppo)
  }
  for (const gruppo of gruppi.values()) {
    gruppo.corsi.sort((a, b) => etichettaCorso(a).localeCompare(etichettaCorso(b), 'it'))
  }
  return [...gruppi.entries()]
    .sort(([chiaveA, a], [chiaveB, b]) =>
      // Le materie in ordine di nome, e il mucchio senza materia sempre per
      // ultimo: è un residuo da sistemare, non una materia fra le altre.
      chiaveA === '' ? 1 : chiaveB === '' ? -1 : a.titolo.localeCompare(b.titolo, 'it'),
    )
    .map(([, gruppo]) => gruppo)
}

/**
 * Il gruppo dei corsi: che cosa si insegna, materia per materia, e dentro ogni
 * materia le classi a cui la si fa — ognuna con le sue pagine.
 *
 * L'elenco è già ristretto al semestre scelto — un corso che in quel periodo
 * non ha ore non ha niente da mostrare — e l'intestazione lo dichiara.
 */
function gruppoCorsi (): Figlio {
  const nelPeriodo = corsiNelSemestre()
  const attivo = corsoInVista()
  // Il corso che si sta guardando resta in elenco anche se le sue ore stanno
  // tutte nell'altro semestre: sparire dalla barra proprio mentre se ne legge
  // una pagina vorrebbe dire una barra che nega quel che c'e' sullo schermo.
  const fuoriPeriodo = attivo && !nelPeriodo.some((c) => c.id === attivo) ? corsoPerId(attivo) : null
  const corsi = fuoriPeriodo ? [...nelPeriodo, fuoriPeriodo] : nelPeriodo

  return h(
    'div',
    { class: 'barra-laterale__gruppo' },
    intestazioneGruppo('libro', 'Corsi', nomeSemestreScelto()),
    corsi.length === 0
      ? h(
          'p',
          { class: 'barra-laterale__vuoto' },
          'Nessun corso in questo periodo: si creano dalla pagina Corsi, qui sotto.',
        )
      : h(
          'div',
          { class: 'barra-laterale__materie' },
          ...corsiPerMateria(corsi).map((gruppo) =>
            h(
              'div',
              { class: 'barra-laterale__materia' },
              h('h3', { class: 'barra-laterale__materia-titolo', attr: { title: gruppo.titolo } }, gruppo.titolo),
              h(
                'ul',
                { class: 'barra-laterale__voci' },
                ...gruppo.corsi.map((corso) => voceCorso(corso, attivo)),
              ),
            ),
          ),
        ),
  )
}

function barraLaterale (): HTMLElement {
  const anno = annoCorrente()
  // La scheda di un allievo è una tappa delle Classi, non una sezione a sé: la
  // voce che resta accesa è quella. Le pagine di corso non passano di qui — la
  // riga che si accende per loro sta sotto il titolo del corso a cui sono
  // puntate — e nessuna delle voci fisse deve accendersi al posto loro.
  const attiva: Vista = stato.vista === 'allievo' ? 'classi' : stato.vista

  return h(
    'nav',
    { class: 'barra-laterale', attr: { 'aria-label': 'Sezioni del registro' } },
    intestazioneGruppo('agenda', 'Registro'),
    h(
      'ul',
      { class: 'barra-laterale__voci' },
      ...VOCI_TESTA.map((voce) => voceNavigazione(voce, attiva)),
    ),
    gruppoCorsi(),
    h(
      'div',
      { class: 'barra-laterale__piede' },
      h(
        'ul',
        { class: 'barra-laterale__voci' },
        ...VOCI_PIEDE.map((voce) => voceNavigazione(voce, attiva)),
      ),
      // Lo schermo per la classe sta qui e non dentro una vista: si accende
      // dall'ora, dal piano o dal calendario — dovunque ci si trovi quando la
      // classe entra — e una voce raggiungibile solo da una pagina sarebbe una
      // voce da cercare proprio nel momento in cui non si ha tempo.
      pulsanteProiezione(),
      anno
        ? h(
            'button',
            {
              class: 'anno-in-uso',
              type: 'button',
              attr: { title: 'Cambia anno scolastico' },
              onclick: () => aggiorna({ vista: 'impostazioni' }),
            },
            h('small', null, 'anno in uso'),
            h('strong', null, anno.etichetta),
          )
        : pulsante({
            testo: 'Crea un anno',
            variante: 'primario',
            simbolo: 'piu',
            al: () => aggiorna({ vista: 'impostazioni' }),
          }),
      // Il semestre sta accanto all'anno perché è la stessa cosa detta più
      // fine: decide che cosa entra nei conti — medie, assenze, ore svolte — e
      // un numero letto senza sapere di quale metà è un numero che non si può
      // usare. Da qui decide anche quali corsi la barra elenca qui sopra, ed è
      // il motivo per cui il suo nome è scritto accanto al titolo «Corsi». Il
      // calendario non lo guarda: lì si naviga per l'anno intero.
      anno && anno.semestri.length > 0
        ? h(
            'select',
            {
              class: 'campo__controllo campo__controllo--selezione semestre-scelto',
              attr: { 'aria-label': 'Semestre dei conteggi', title: 'I conteggi si fermano a questo periodo' },
              onchange: (evento: Event) =>
                aggiorna({ semestreId: (evento.target as HTMLSelectElement).value || null }),
            },
            ...anno.semestri.map((semestre) =>
              h(
                'option',
                { value: semestre.id, selected: semestre.id === stato.semestreId },
                semestre.etichetta,
              ),
            ),
            h('option', { value: '', selected: stato.semestreId === null }, 'Anno intero'),
          )
        : null,
      stato.registro.anni.length > 1
        ? h(
            'select',
            {
              class: 'campo__controllo campo__controllo--selezione anno-scelta',
              attr: { 'aria-label': 'Anno scolastico' },
              onchange: (evento: Event) =>
                void azione({
                  tipo: 'anno.seleziona',
                  annoId: (evento.target as HTMLSelectElement).value,
                }),
            },
            ...stato.registro.anni.map((voce) =>
              h('option', { value: voce.id, selected: voce.id === anno?.id }, voce.etichetta),
            ),
          )
        : null,
    ),
  )
}

function vistaCorrente (): Figlio {
  switch (stato.vista) {
    case 'calendario':
      return vistaCalendario()
    case 'todo':
      return vistaTodo()
    case 'lezione':
      return vistaLezione()
    case 'classi':
      return vistaClassi()
    case 'corsi':
      return vistaCorsi()
    case 'documenti':
      return vistaDocumenti()
    case 'allievo':
      return vistaAllievo()
    case 'docenteClasse':
      return vistaDocenteClasse()
    case 'piani':
      return vistaPiani()
    case 'valutazioni':
      return vistaValutazioni()
    case 'impostazioni':
      return vistaImpostazioni()
    case 'guida':
      return vistaGuida()
  }
}

/**
 * La riga che compare quando qualcosa nei file non torna più.
 *
 * Stava solo in fondo alle Impostazioni, dove nessuno la cercava: un corso che
 * ha perso la materia si vede come «materia sparita» in tre viste, e da lì non
 * si capisce né perché né come rimediare. Qui lo dice, e se la correzione è
 * fra quelle che non perdono niente offre anche il gesto per farla.
 */
function barraAvvisi (): Figlio {
  if (stato.avvisi.length === 0) return null
  const correzioni = riparazioni(stato.registro)

  return avviso(
    h(
      'div',
      { class: 'avviso__riga' },
      h(
        'span',
        null,
        `${stato.avvisi.length} riferiment${stato.avvisi.length === 1 ? 'o' : 'i'} non torna${stato.avvisi.length === 1 ? '' : 'no'}: `,
        stato.avvisi[0],
      ),
      correzioni.length > 0
        ? pulsante({
            testo: 'Ripara',
            simbolo: 'spunta',
            variante: 'sottile',
            al: async () => {
              const sicuro = await conferma({
                titolo: 'Riparare il registro?',
                testo: correzioni.map((c) => `• ${c.descrizione}`).join('\n'),
                testoConferma: 'Ripara',
              })
              if (!sicuro) return
              const risposta = await azione({ tipo: 'manutenzione.ripara' })
              // Il rifiuto lo ha gia' detto `azione`, e «niente da riparare» lo
              // dice l'host con parole sue: qui resta solo il caso in cui il
              // registro e' stato davvero rimesso a posto.
              if (risposta.ok && !risposta.messaggio) notifica('Registro riparato.', 'successo')
            },
          })
        : null,
      pulsante({
        testo: 'Dettagli',
        variante: 'fantasma',
        al: () => aggiorna({ vista: 'impostazioni' }),
      }),
    ),
    'attenzione',
  )
}

/**
 * Il filo che dice che il registro sta lavorando.
 *
 * Il pulsante premuto mostra la sua rotella, ma non basta: la vista si rifa' da
 * sola — l'orologio batte ogni minuto — e con lei sparisce il pulsante e la
 * sua rotella, mentre la richiesta e' ancora in volo. Questo filo vive sul
 * telaio, legge il canale e non lo stato dell'interfaccia, e resta finche'
 * l'ultima risposta non e' tornata: e' l'unica cosa che un ridisegno non puo'
 * portare via.
 */
function filoDiLavoro (): Figlio {
  if (!lavoroInCorso()) return null
  return h(
    'div',
    {
      class: 'filo-lavoro',
      attr: { role: 'status', 'aria-live': 'polite', 'aria-label': 'Il registro sta lavorando' },
    },
    h('span', null),
  )
}

export function guscio (): Figlio {
  if (!stato.caricato) {
    return h('div', { class: 'caricamento' }, 'Apertura del registro…')
  }
  return h(
    'div',
    { class: 'guscio' },
    filoDiLavoro(),
    barraLaterale(),
    h('main', { class: 'contenuto' }, barraProiezione(), barraAvvisi(), vistaCorrente()),
  )
}
