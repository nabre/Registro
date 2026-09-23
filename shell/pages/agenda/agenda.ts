// L'agenda sul desktop: la striscia appoggiata al bordo dello schermo.
//
// La pagina non sa che cosa sia una lezione. Riceve dal main process una scheda
// già fatta — `ContenutoAgenda`, che `src/agenda.ts` compone da
// `domain/agenda.ts`, `agendaMonth.ts`, `agendaPending.ts`, `agendaLesson.ts` —
// e la disegna. Tutto quel che mostra finisce in `textContent`: sono nomi di
// classi, di materie e di persone scritti dal docente, e una pagina che li
// componesse in HTML sarebbe una porta aperta dentro il registro.
//
// I gesti escono di qui come `ComandoAgenda` e diventano le azioni di sempre,
// vedi `src/agenda.ts`. I bordi e la testata non toccano la finestra da sé:
// mandano al main process dov'è il puntatore, e il widget scatta sulla griglia
// delle icone del desktop — vedi `environment/agenda.ts`.
//
// Il file segue la pagina: le linguette, poi una sezione per scheda
// (calendario, pendenze, lezione), poi il telaio che le ridisegna e i gesti
// sulla finestra.

import type { ContenutoAgenda } from '../../../src/agenda.js'
import type { ComandoAgenda, SchedaAgenda } from '../../../src/environment/agenda.js'
import type { StatoPresenza } from '../../../src/domain/models.js'
import { ascolta, elemento, manda, perId } from '../shared/page.js'

import './agenda.css'

type Settimana = NonNullable<ContenutoAgenda['settimana']>
type GiornoSettimana = Settimana['giorni'][number]
type OraSettimana = GiornoSettimana['ore'][number]
type Mese = NonNullable<ContenutoAgenda['mese']>
type GiornoMese = Mese['settimane'][number][number]
type Pendenze = NonNullable<ContenutoAgenda['pendenze']>
type OraAperta = Pendenze['oreAperte'][number]
type ClassePendenze = Pendenze['classi'][number]
type Lezione = NonNullable<ContenutoAgenda['lezione']>
type RigaAppello = Lezione['appello'][number]
type Fase = Lezione['fase']

/** Le misure del widget, che il main process manda a ogni spostamento. */
interface MisureAgenda {
  tipo: 'agenda.misure'
  celle: number
  celleAltezza: number
  libero: boolean
}

const corpo = perId('corpo')
const titolo = perId('titolo')
const linguette = perId('linguette')
const misura = perId('misura')
const conteggio = perId('conteggio')

/** L'ultimo contenuto ricevuto: le frecce si muovono da lui. */
let dati: ContenutoAgenda | null = null

function comando (messaggio: ComandoAgenda): void {
  manda({ agenda: messaggio })
}

/** Un bottone con dentro del testo e un gesto attaccato. */
function bottone (
  classe: string | null,
  testo: string | null,
  gesto: (() => void) | null,
  suggerimento?: string,
): HTMLButtonElement {
  const nato = elemento('button', classe, testo)
  nato.type = 'button'
  if (suggerimento) nato.title = suggerimento
  if (gesto) nato.addEventListener('click', gesto)
  return nato
}

/** Il lunedì spostato di sette giorni: la freccia avanti e quella indietro. */
function lunediSpostato (lunedi: string, giorniDiScarto: number): string {
  const data = new Date(`${lunedi}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + giorniDiScarto)
  return data.toISOString().slice(0, 10)
}

/** Il primo del mese spostato di uno: le frecce sopra la griglia. */
function meseSpostato (primo: string, mesiDiScarto: number): string {
  const data = new Date(`${primo}T00:00:00Z`)
  data.setUTCDate(1)
  data.setUTCMonth(data.getUTCMonth() + mesiDiScarto)
  return data.toISOString().slice(0, 10)
}

/** Nessun registro aperto: lo si dice, e si offre l'unica cosa da fare. */
function disegnaInvito (): HTMLDivElement {
  const invito = elemento('div', 'invito')
  invito.append(elemento(
    'span',
    null,
    'Nessun registro aperto: senza un documento d’anno non c’è niente da mostrare.',
  ))
  invito.append(bottone(null, 'Apri un registro…', () => comando({ tipo: 'apriDocumento' })))
  return invito
}

// ------------------------------------------------------------- le linguette

/** Le tre linguette: il segno, il nome, e il suggerimento. */
interface Scheda { chiave: SchedaAgenda, segno: string, nome: string, titolo: string }

const SCHEDE: readonly Scheda[] = [
  { chiave: 'calendario', segno: '▦', nome: 'Calendario', titolo: 'Il mese e la settimana' },
  { chiave: 'pendenze', segno: '⚠', nome: 'Pendenze', titolo: 'Le ore aperte e il lavoro per classe' },
  { chiave: 'lezione', segno: '▶', nome: 'Lezione', titolo: 'L’ora di adesso: appello e argomento' },
]

function disegnaLinguette (): void {
  linguette.replaceChildren()
  const conti = dati?.linguette ?? null
  for (const scheda of SCHEDE) {
    const scelta = dati?.scheda === scheda.chiave
    const nata = bottone(
      `linguetta${scelta ? ' linguetta--scelta' : ''}`,
      null,
      () => comando({ tipo: 'scheda', scheda: scheda.chiave }),
      scheda.titolo,
    )
    nata.append(elemento('span', 'linguetta__segno', scheda.segno))
    nata.append(elemento('span', 'linguetta__nome', scheda.nome))
    const numero = contoLinguetta(scheda.chiave, conti)
    if (numero) nata.append(numero)
    linguette.append(nata)
  }
}

/**
 * Il numero sulla linguetta, dove ce n'è uno da dire.
 *
 * Sulle pendenze quante cose aspettano, e in rosso quando fra queste ci sono
 * ore rimaste aperte: sono l'unica parte che nessun altro può chiudere. Sulla
 * lezione quante persone mancano ancora all'appello — che è il lavoro di
 * adesso, non un totale.
 */
function contoLinguetta (
  chiave: SchedaAgenda,
  conti: ContenutoAgenda['linguette'],
): HTMLSpanElement | null {
  if (!conti) return null
  if (chiave === 'pendenze' && conti.pendenze > 0) {
    return elemento(
      'span',
      `linguetta__conto${conti.oreAperte > 0 ? ' linguetta__conto--urgente' : ''}`,
      conti.pendenze,
    )
  }
  if (chiave === 'lezione' && conti.senzaAppello > 0 && conti.fase === 'in-corso') {
    return elemento('span', 'linguetta__conto linguetta__conto--urgente', conti.senzaAppello)
  }
  if (chiave === 'lezione' && conti.senzaAppello > 0) {
    return elemento('span', 'linguetta__conto', conti.senzaAppello)
  }
  return null
}

// ------------------------------------------------------------- il calendario

function disegnaMese (mese: Mese): HTMLDivElement {
  const riquadro = elemento('div', 'mese')

  const barra = elemento('div', 'mese__barra')
  barra.append(bottone(
    null,
    '‹',
    () => comando({ tipo: 'mese', primo: meseSpostato(mese.primo, -1) }),
    'Mese precedente',
  ))
  barra.append(elemento('span', 'mese__nome', mese.etichetta))
  barra.append(bottone(
    null,
    '›',
    () => comando({ tipo: 'mese', primo: meseSpostato(mese.primo, 1) }),
    'Mese successivo',
  ))
  riquadro.append(barra)

  const intestazione = elemento('div', 'mese__riga')
  for (const colonna of mese.colonne) intestazione.append(elemento('span', 'mese__colonna', colonna))
  riquadro.append(intestazione)

  for (const settimanaDelMese of mese.settimane) {
    const riga = elemento('div', 'mese__riga')
    for (const giorno of settimanaDelMese) riga.append(disegnaCella(giorno))
    riquadro.append(riga)
  }

  return riquadro
}

function disegnaCella (giorno: GiornoMese): HTMLButtonElement {
  const classi = ['cella']
  if (!giorno.suo) classi.push('cella--altrui')
  if (giorno.fuori) classi.push('cella--fuori')
  if (giorno.chiuso) classi.push('cella--chiuso')
  if (giorno.nellaSettimana) classi.push('cella--settimana')
  if (giorno.oggi) classi.push('cella--oggi')

  const pezzi: string[] = [giorno.data]
  if (giorno.chiuso) pezzi.push(giorno.chiuso)
  if (giorno.quante > 0) pezzi.push(giorno.quante === 1 ? '1 ora' : `${giorno.quante} ore`)
  if (giorno.manca) pezzi.push('c’è un’ora da chiudere')

  const cella = bottone(
    classi.join(' '),
    null,
    // Fuori dall'anno non si va: la settimana che ne uscirebbe sarebbe vuota
    // senza che nessuno abbia sbagliato niente.
    giorno.fuori ? null : () => comando({ tipo: 'giorno', data: giorno.data }),
    pezzi.join(' · '),
  )
  if (giorno.fuori) cella.disabled = true
  cella.append(elemento('span', null, giorno.numero))

  const punto = elemento('span', 'cella__punto')
  if (giorno.manca) punto.classList.add('cella__punto--manca')
  else if (giorno.quante > 0) punto.classList.add('cella__punto--ore')
  cella.append(punto)

  return cella
}

function disegnaOra (riga: OraSettimana): HTMLButtonElement {
  const suggerimento = [`${riga.inizio}–${riga.fine}`, riga.classe, riga.materia, riga.aula]
    .filter(Boolean)
    .join(' · ')
  const nata = bottone(
    `ora ora--${riga.fase}`,
    null,
    () => comando({ tipo: 'apri', lezioneId: riga.lezioneId }),
    suggerimento,
  )

  const prima = elemento('span', 'ora__riga')
  prima.append(elemento('span', 'ora__orario', `${riga.inizio}–${riga.fine}`))
  prima.append(elemento('span', 'ora__classe', riga.classe))

  const seconda = elemento('span', 'ora__riga')
  if (riga.materia) seconda.append(elemento('span', 'barra__quiete', riga.materia))
  if (riga.aula) seconda.append(elemento('span', 'barra__quiete', riga.aula))

  nata.append(prima)
  if (seconda.childNodes.length > 0) nata.append(seconda)
  return nata
}

function disegnaGiorno (giorno: GiornoSettimana): HTMLElement {
  const sezione = elemento('section', `sezione${giorno.oggi ? ' giorno--oggi' : ''}`)

  const testata = elemento('div', 'sezione__testata')
  testata.append(elemento('span', null, `${giorno.nome} ${giorno.numero}`))
  if (giorno.chiuso) testata.append(elemento('span', 'giorno__chiuso', giorno.chiuso))
  sezione.append(testata)

  if (giorno.ore.length === 0) {
    // Un giorno senza ore resta, e lo dice: tolto dall'elenco, chi guarda si
    // chiederebbe se il widget è indietro o se il giovedì è davvero libero. Lo
    // dice sulla riga del giorno, però: una settimana con tre giorni liberi e
    // un «niente» per ciascuno su una riga sua è mezza striscia di nulla.
    if (!giorno.chiuso) testata.append(elemento('span', 'giorno__chiuso', 'niente'))
    return sezione
  }

  for (const riga of giorno.ore) sezione.append(disegnaOra(riga))
  return sezione
}

/** Il numero di settimana, la lettera della quindicina, e l'anno che la tiene. */
function sottotitoloSettimana (settimana: Settimana): string {
  const pezzi = [`sett. ${settimana.numero}`]
  if (settimana.lettera) pezzi.push(settimana.lettera)
  if (settimana.anno) pezzi.push(settimana.anno)
  return pezzi.join(' · ')
}

function disegnaCalendario (dati: ContenutoAgenda): void {
  const settimana = dati.settimana
  if (!settimana || settimana.stato === 'senza-registro') {
    titolo.textContent = 'Registro'
    corpo.append(disegnaInvito())
    return
  }

  titolo.textContent = settimana.etichetta

  if (dati.mese) corpo.append(disegnaMese(dati.mese))

  // Le frecce della settimana stanno sotto il mese: si scorre di sette giorni,
  // e «oggi» riporta tutto — la settimana e la griglia — a dove si comincia.
  const gesti = elemento('div', 'gesti')
  gesti.append(bottone(
    null,
    '‹',
    () => comando({ tipo: 'settimana', lunedi: lunediSpostato(settimana.lunedi, -7) }),
    'Settimana precedente',
  ))
  const oggi = bottone(null, 'oggi', () => comando({ tipo: 'oggi' }), 'Torna a questa settimana')
  if (settimana.corrente) oggi.disabled = true
  gesti.append(oggi)
  gesti.append(bottone(
    null,
    '›',
    () => comando({ tipo: 'settimana', lunedi: lunediSpostato(settimana.lunedi, 7) }),
    'Settimana successiva',
  ))
  gesti.append(elemento('span', 'barra__quiete', sottotitoloSettimana(settimana)))
  corpo.append(gesti)

  // Fuori dall'anno le giornate ci sono lo stesso — si può scorrere avanti e
  // indietro — ma senza una riga che lo dica sembrerebbero cinque giorni in cui
  // non si insegna, che è un'altra cosa.
  if (settimana.stato === 'prima-dell-anno') {
    corpo.append(elemento('div', 'vuoto avviso', 'L’anno scolastico comincia più avanti.'))
  }
  if (settimana.stato === 'dopo-l-anno') {
    corpo.append(elemento('div', 'vuoto avviso', 'L’anno scolastico è finito.'))
  }

  for (const giorno of settimana.giorni) corpo.append(disegnaGiorno(giorno))
  conteggio.textContent = settimana.quante === 1 ? '1 ora' : `${settimana.quante} ore`
}

// -------------------------------------------------------------- le pendenze

function disegnaOraAperta (ora: OraAperta): HTMLButtonElement {
  const nata = bottone(
    'ora ora--da-chiudere',
    null,
    () => comando({ tipo: 'apri', lezioneId: ora.lezioneId }),
    [ora.quando, ora.inizio, ora.classe, ora.manca.join(', ')].filter(Boolean).join(' · '),
  )

  const prima = elemento('span', 'ora__riga')
  prima.append(elemento('span', 'ora__orario', ora.quando))
  prima.append(elemento('span', 'ora__classe', ora.classe))
  nata.append(prima)

  const seconda = elemento('span', 'ora__riga')
  seconda.append(elemento('span', 'barra__quiete', ora.manca.join(' · ')))
  nata.append(seconda)
  return nata
}

function disegnaClassePendenze (classe: ClassePendenze): HTMLElement {
  const sezione = elemento('section', 'sezione')

  const testata = elemento('div', 'sezione__testata')
  testata.append(elemento('span', 'classe__nome', classe.classe))
  testata.append(elemento('span', 'sezione__totale', classe.aperti))
  sezione.append(testata)

  for (const voce of classe.voci) {
    const preme = voce.urgenti > 0
    const riga = bottone(
      `pendenza${preme ? ' pendenza--preme' : ''}`,
      null,
      () => comando({ tipo: 'apriPendenze', classeId: classe.classeId }),
      `${voce.nome}: ${voce.aperti}${preme ? `, di cui ${voce.urgenti} in ritardo` : ''}`,
    )
    riga.append(elemento('span', 'pendenza__nome', voce.nome))
    // Qui il ritardo non si scrive: la striscia è larga tre colonne di icone,
    // e «2 in ritardo» accanto a «consegna la classe» mangerebbe il nome che
    // dice di che lavoro si tratta. Lo dicono il filo rosso e il numero rosso,
    // e per esteso il suggerimento che compare fermandosi sopra.
    riga.append(elemento(
      'span',
      `pendenza__conto${preme ? ' pendenza__conto--urgente' : ''}`,
      voce.aperti,
    ))
    sezione.append(riga)
  }

  return sezione
}

function disegnaPendenze (dati: ContenutoAgenda): void {
  const pendenze = dati.pendenze
  titolo.textContent = 'Da fare'

  if (!pendenze || pendenze.senzaRegistro) {
    corpo.append(disegnaInvito())
    return
  }

  if (pendenze.oreAperte.length > 0) {
    const sezione = elemento('section', 'sezione')
    const testata = elemento('div', 'sezione__testata')
    testata.append(elemento('span', null, 'Ore da chiudere'))
    sezione.append(testata)
    for (const ora of pendenze.oreAperte) sezione.append(disegnaOraAperta(ora))
    if (pendenze.altreOre > 0) {
      sezione.append(bottone(
        'pendenza',
        pendenze.altreOre === 1 ? 'e un’altra, nel registro' : `e altre ${pendenze.altreOre}, nel registro`,
        () => comando({ tipo: 'registro' }),
        'Apri il registro per vederle tutte',
      ))
    }
    corpo.append(sezione)
  }

  for (const classe of pendenze.classi) corpo.append(disegnaClassePendenze(classe))

  if (pendenze.oreAperte.length === 0 && pendenze.classi.length === 0) {
    // «Niente» è una risposta, e va detta: una scheda vuota sembra una scheda
    // che non ha finito di caricare.
    corpo.append(elemento('div', 'vuoto', 'Niente in sospeso: il registro è in pari.'))
  }

  conteggio.textContent = pendenze.aperti === 1 ? '1 cosa da fare' : `${pendenze.aperti} da fare`
}

// --------------------------------------------------------------- la lezione

/**
 * Il giro dell'appello, premendo la stessa riga.
 *
 * Presente e assente per primi, che sono il novantanove per cento dei gesti;
 * poi il ritardo e l'esonero; e in fondo il ritorno a «non detto», che serve a
 * disfare senza aprire il registro. Il giro è quello e non cambia: un appello
 * si fa a memoria, guardando la classe e non lo schermo.
 */
const GIRO: readonly StatoPresenza[] = ['presente', 'assente', 'ritardo', 'esonerato', 'non-impostato']

/** Il segno di ogni stato: una colonna sola, e la parola nel suggerimento. */
const SEGNO: Record<StatoPresenza, string> = {
  presente: '✓',
  assente: '✗',
  ritardo: '⏱',
  esonerato: '—',
  'non-impostato': '·',
}

const NOME_STATO: Record<StatoPresenza, string> = {
  presente: 'presente',
  assente: 'assente',
  ritardo: 'in ritardo',
  esonerato: 'esonerato',
  'non-impostato': 'da fare',
}

const NOME_FASE: Record<Fase, string> = {
  'in-corso': 'in corso',
  'da-chiudere': 'da chiudere',
  'da-preparare': 'da preparare',
  futura: 'in programma',
  svolta: 'svolta',
  annullata: 'annullata',
}

/** Com'è finita quest'ora sotto gli occhi: lo dice, o sembrerebbe casuale. */
const PERCHE: Record<Lezione['scelta'], string> = {
  'in-corso': 'sta succedendo adesso',
  aperta: 'passata, e ancora aperta',
  prossima: 'la prossima',
  fissata: 'scelta con le frecce',
}

function disegnaAppello (lezione: Lezione, riga: RigaAppello): HTMLButtonElement {
  const dopo = GIRO[(GIRO.indexOf(riga.stato) + 1) % GIRO.length] ?? 'presente'
  const pezzi = [riga.nome, NOME_STATO[riga.stato]]
  if (riga.mista) pezzi.push('non per tutte le unità')
  if (riga.minuti) pezzi.push(`${riga.minuti} min di ritardo`)
  if (riga.nota) pezzi.push(riga.nota)
  pezzi.push(`premi: ${NOME_STATO[dopo]}`)

  const nata = bottone(
    `appello appello--${riga.stato}${riga.mista ? ' appello--mista' : ''}`,
    null,
    () => comando({
      tipo: 'presenza',
      lezioneId: lezione.lezioneId,
      allievoId: riga.allievoId,
      stato: dopo,
    }),
    pezzi.join(' · '),
  )
  nata.append(elemento('span', 'appello__nome', riga.breve))
  if (riga.nota) nata.append(elemento('span', 'appello__segno', '✎'))
  nata.append(elemento('span', 'appello__segno', SEGNO[riga.stato]))
  return nata
}

function rigaConto (nome: string, numero: number): HTMLSpanElement {
  const riga = elemento('span')
  riga.append(elemento('strong', null, numero))
  riga.append(document.createTextNode(` ${nome}`))
  return riga
}

/**
 * L'argomento, battuto a macchina mentre la classe è ancora lì.
 *
 * Si salva mentre si scrive, con una pausa breve — e di nuovo quando il campo
 * perde il fuoco, che è il caso in cui una pausa non arriva mai. Il testo non
 * torna indietro dal main process finché si scrive: un aggiornamento arrivato
 * fra due tasti riscriverebbe il campo sotto le dita.
 */
let attesaArgomenti = 0

function disegnaArgomenti (lezione: Lezione): HTMLElement {
  const sezione = elemento('section', 'sezione')
  const testata = elemento('div', 'sezione__testata')
  testata.append(elemento('span', null, 'Argomento'))
  sezione.append(testata)

  const campo = elemento('textarea')
  campo.id = 'argomenti'
  campo.value = lezione.argomenti
  campo.placeholder = 'Che cosa si è fatto…'
  campo.dataset.lezioneId = lezione.lezioneId

  const invia = (): void => {
    clearTimeout(attesaArgomenti)
    attesaArgomenti = 0
    comando({ tipo: 'argomenti', lezioneId: lezione.lezioneId, testo: campo.value })
  }

  campo.addEventListener('input', () => {
    clearTimeout(attesaArgomenti)
    attesaArgomenti = window.setTimeout(invia, 600)
  })
  campo.addEventListener('blur', invia)

  sezione.append(campo)
  return sezione
}

function disegnaLezione (dati: ContenutoAgenda): void {
  const lezione = dati.lezione
  if (!lezione) {
    titolo.textContent = 'Lezione'
    corpo.append(dati.linguette
      ? elemento('div', 'vuoto', 'Nessun’ora da tenere: l’anno non ne ha, o sono tutte passate e chiuse.')
      : disegnaInvito())
    return
  }

  titolo.textContent = lezione.classe

  const testata = elemento('div', 'sezione__testata')
  testata.append(elemento(
    'span',
    null,
    `${lezione.quando}${lezione.inizio ? ` · ${lezione.inizio}–${lezione.fine ?? ''}` : ''}`,
  ))
  testata.append(elemento('span', 'ora__fase', NOME_FASE[lezione.fase]))
  corpo.append(testata)

  const sotto = elemento('div', 'barra')
  const nomi = [lezione.materia, lezione.aula].filter(Boolean).join(' · ')
  sotto.append(elemento('span', 'barra__quiete', `${PERCHE[lezione.scelta]}${nomi ? ` · ${nomi}` : ''}`))
  corpo.append(sotto)

  // Le frecce scorrono le ore dell'anno una per una: servono a tornare
  // indietro all'ora di ieri rimasta aperta, che è il motivo per cui questa
  // scheda scrive. «Adesso» rimette il widget su quella che sceglierebbe da sé.
  const gesti = elemento('div', 'gesti')
  const indietro = bottone(
    null,
    '‹',
    () => comando({ tipo: 'ora', lezioneId: lezione.precedente }),
    'Ora precedente',
  )
  indietro.disabled = !lezione.precedente
  gesti.append(indietro)
  const adesso = bottone(
    null,
    'adesso',
    () => comando({ tipo: 'ora', lezioneId: null }),
    'Torna all’ora di adesso',
  )
  adesso.disabled = lezione.scelta !== 'fissata'
  gesti.append(adesso)
  const avanti = bottone(
    null,
    '›',
    () => comando({ tipo: 'ora', lezioneId: lezione.successiva }),
    'Ora successiva',
  )
  avanti.disabled = !lezione.successiva
  gesti.append(avanti)
  gesti.append(bottone(
    null,
    'apri',
    () => comando({ tipo: 'apri', lezioneId: lezione.lezioneId }),
    'Apri quest’ora nel registro',
  ))
  corpo.append(gesti)

  const conti = elemento('div', 'conti')
  conti.append(rigaConto('presenti', lezione.presenti))
  conti.append(rigaConto('assenti', lezione.assenti))
  if (lezione.senzaAppello > 0) conti.append(rigaConto('da fare', lezione.senzaAppello))
  if (lezione.ud > 1) conti.append(rigaConto('unità', lezione.ud))
  corpo.append(conti)

  if (lezione.manca.length > 0) {
    corpo.append(elemento('div', 'vuoto avviso', lezione.manca.join(' · ')))
  }

  // Tutti presenti in un gesto: è come comincia ogni appello, e poi si tocca
  // chi manca. L'azzeramento sta accanto perché è il modo di disfare senza
  // aprire il registro.
  const massa = elemento('div', 'gesti')
  massa.append(bottone(
    'bottone',
    'tutti presenti',
    () => comando({ tipo: 'presenzeTutti', lezioneId: lezione.lezioneId, stato: 'presente' }),
    'Segna presente tutta la classe, per tutte le unità',
  ))
  massa.append(bottone(
    null,
    'azzera',
    () => comando({ tipo: 'presenzeTutti', lezioneId: lezione.lezioneId, stato: 'non-impostato' }),
    'Svuota l’appello di quest’ora',
  ))
  corpo.append(massa)

  const elenco = elemento('section', 'sezione')
  if (lezione.appello.length === 0) {
    elenco.append(elemento('div', 'vuoto', 'Nessuna persona in questa classe.'))
  }
  for (const riga of lezione.appello) elenco.append(disegnaAppello(lezione, riga))
  corpo.append(elenco)

  corpo.append(disegnaArgomenti(lezione))

  // «Fatta» è l'ultimo gesto dell'ora, ed è quello che la toglie dalle
  // pendenze. Non c'è quando l'ora è già svolta o annullata: sarebbe un
  // bottone che non fa niente.
  if (lezione.stato === 'pianificata') {
    const chiudi = elemento('div', 'gesti')
    chiudi.append(bottone(
      'bottone',
      'fatta',
      () => comando({ tipo: 'chiudiOra', lezioneId: lezione.lezioneId }),
      'Segna l’ora come svolta',
    ))
    corpo.append(chiudi)
  }

  conteggio.textContent = lezione.senzaAppello > 0
    ? `${lezione.senzaAppello} all’appello`
    : NOME_FASE[lezione.fase]
}

// ----------------------------------------------------------------- il telaio

/** Quel che si stava scrivendo nell'argomento, con il punto del cursore. */
interface InScrittura {
  lezioneId: string | undefined
  valore: string
  da: number
  a: number
}

/** Il campo che aveva il fuoco, se si stava scrivendo dentro. */
function campoInScrittura (): InScrittura | null {
  const attivo = document.activeElement
  if (!(attivo instanceof HTMLTextAreaElement) || attivo.id !== 'argomenti') return null
  return {
    lezioneId: attivo.dataset.lezioneId,
    valore: attivo.value,
    da: attivo.selectionStart,
    a: attivo.selectionEnd,
  }
}

/** Il fuoco e il testo rimessi dov'erano, se il campo è ancora lo stesso. */
function ridai (scritto: InScrittura): void {
  const campo = document.getElementById('argomenti')
  if (!(campo instanceof HTMLTextAreaElement)) return
  if (campo.dataset.lezioneId !== scritto.lezioneId) return
  campo.value = scritto.valore
  campo.focus()
  campo.setSelectionRange(scritto.da, scritto.a)
}

/**
 * Ridisegna la scheda accesa.
 *
 * Due cose si tengono attraverso il ridisegno, e sono le due che si perdono
 * senza accorgersene: **dove si era scorso** — il widget si riscrive ogni
 * mezzo minuto, e un elenco che tornasse in cima a ogni battito sarebbe
 * illeggibile — e **quel che si sta scrivendo**, con il punto in cui sta il
 * cursore.
 */
function disegna (): void {
  const scorrimento = corpo.scrollTop
  const scritto = campoInScrittura()

  disegnaLinguette()
  corpo.replaceChildren()
  conteggio.textContent = ''

  if (!dati) {
    titolo.textContent = 'Registro'
    corpo.append(disegnaInvito())
    return
  }

  if (dati.scheda === 'pendenze') disegnaPendenze(dati)
  else if (dati.scheda === 'lezione') disegnaLezione(dati)
  else disegnaCalendario(dati)

  if (scritto) ridai(scritto)
  corpo.scrollTop = scorrimento
}

// ------------------------------------------------------ i gesti sulla finestra

perId('registro').addEventListener('click', () => comando({ tipo: 'registro' }))
perId('chiudi').addEventListener('click', () => comando({ tipo: 'chiudi' }))

/**
 * Il trascinamento dei bordi. La posizione viaggia in coordinate di schermo:
 * la finestra si sta muovendo sotto il puntatore, e un `clientX` misurato
 * dentro una finestra che cambia misura rincorrerebbe sé stesso.
 */
const MANIGLIE: ReadonlyArray<{ id: string, comando: (evento: PointerEvent) => ComandoAgenda }> = [
  { id: 'maniglia-larghezza', comando: (evento) => ({ tipo: 'larghezza', x: evento.screenX }) },
  { id: 'maniglia-altezza', comando: (evento) => ({ tipo: 'altezza', y: evento.screenY }) },
]

for (const maniglia of MANIGLIE) {
  const bordo = perId(maniglia.id)
  bordo.addEventListener('pointerdown', (evento) => {
    bordo.setPointerCapture(evento.pointerId)
    bordo.classList.add('tirata')
    evento.preventDefault()
  })
  bordo.addEventListener('pointermove', (evento) => {
    if (!bordo.classList.contains('tirata')) return
    comando(maniglia.comando(evento))
  })
  const finisci = (evento: PointerEvent): void => {
    if (!bordo.classList.contains('tirata')) return
    bordo.classList.remove('tirata')
    if (bordo.hasPointerCapture(evento.pointerId)) bordo.releasePointerCapture(evento.pointerId)
  }
  bordo.addEventListener('pointerup', finisci)
  bordo.addEventListener('pointercancel', finisci)
}

// Lo spostamento del widget libero: si prende per la testata e lo si posa dove
// si vuole. I bottoni della testata restano bottoni — `closest('button')` li
// lascia fuori dal trascinamento — o premerli diventerebbe un modo goffo di
// spostare il widget di due pixel.
const testata = perId('testata')
let scarto: { x: number, y: number } | null = null

testata.addEventListener('pointerdown', (evento) => {
  if (!document.body.classList.contains('libero')) return
  if (evento.target instanceof Element && evento.target.closest('button')) return
  scarto = { x: evento.screenX - window.screenX, y: evento.screenY - window.screenY }
  testata.setPointerCapture(evento.pointerId)
  testata.classList.add('tirata')
  evento.preventDefault()
})
testata.addEventListener('pointermove', (evento) => {
  if (!scarto) return
  comando({ tipo: 'sposta', x: evento.screenX - scarto.x, y: evento.screenY - scarto.y })
})
const posa = (evento: PointerEvent): void => {
  if (!scarto) return
  scarto = null
  testata.classList.remove('tirata')
  if (testata.hasPointerCapture(evento.pointerId)) testata.releasePointerCapture(evento.pointerId)
}
testata.addEventListener('pointerup', posa)
testata.addEventListener('pointercancel', posa)

// ---------------------------------------------------------------- i messaggi

ascolta((messaggio) => {
  if (messaggio.tipo === 'agenda') {
    dati = messaggio as unknown as ContenutoAgenda
    disegna()
  }
  if (messaggio.tipo === 'agenda.misure') {
    const misure = messaggio as unknown as MisureAgenda
    // «3 × 14 celle»: la misura nella sola unità che conta qui, che è la
    // griglia su cui stanno le icone del desktop.
    misura.textContent = `${Math.round(misure.celle)} × ${Math.round(misure.celleAltezza)} celle`
    document.body.classList.toggle('libero', misure.libero)
    // Sotto le tre celle i nomi delle linguette non ci stanno: restano i segni,
    // che a quella larghezza sono l'unica cosa leggibile.
    document.body.classList.toggle('stretta', Math.round(misure.celle) < 3)
  }
})

disegna()
