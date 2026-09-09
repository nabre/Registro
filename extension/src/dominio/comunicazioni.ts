// Chi riceve una comunicazione, e come si legge prima di spedirla.
//
// Gli indirizzi non stanno scritti dentro la comunicazione: ci stanno i gruppi
// — allievi, tutori, recapiti fissi — e le mail si ricavano ogni volta che
// serve, dalla classe per gli allievi e dal fascicolo per i recapiti. Così una
// casella corretta a metà anno vale anche per le bozze scritte a settembre, e
// non esistono due elenchi da tenere allineati.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from './calcoli.js'
import { CHI_INSEGNA } from './modelli.js'
import type { Classe, Comunicazione, Consegna, Fascicolo, Registro } from './modelli.js'
import { aggiungiIndirizzo } from './testo.js'

export interface DestinatariComunicazione {
  /** Gli indirizzi buoni, senza doppioni. */
  indirizzi: string[]
  /** Chi doveva ricevere e non ha un indirizzo utilizzabile: va detto prima di spedire. */
  senzaIndirizzo: string[]
}

/**
 * Gli indirizzi a cui va la comunicazione. Solo allievi attivi: chi si è
 * ritirato resta nel registro per i conti dell'anno, ma non nelle mail.
 */
export function destinatariComunicazione (
  classe: Classe,
  fascicolo: Fascicolo,
  comunicazione: Comunicazione,
): DestinatariComunicazione {
  const indirizzi = new Set<string>()
  const senzaIndirizzo: string[] = []

  if (comunicazione.aAllievi || comunicazione.aTutori) {
    for (const allievo of ordinaAllievi(allieviAttivi(classe))) {
      let raggiunto = false
      if (comunicazione.aAllievi) raggiunto = aggiungiIndirizzo(indirizzi, allievo.email) || raggiunto
      if (comunicazione.aTutori) raggiunto = aggiungiIndirizzo(indirizzi, allievo.emailTutore) || raggiunto
      if (!raggiunto) senzaIndirizzo.push(nomeCompleto(allievo))
    }
  }

  for (const id of comunicazione.recapitiIds) {
    const recapito = fascicolo.recapiti.find((r) => r.id === id)
    if (!recapito) continue
    if (!aggiungiIndirizzo(indirizzi, recapito.email)) senzaIndirizzo.push(recapito.etichetta)
  }

  return { indirizzi: [...indirizzi], senzaIndirizzo }
}

/**
 * Gli allegati di una comunicazione: le consegne «a me» che hanno raccolto un
 * file, scelte per id. Una consegna senza file non è allegabile — si sceglie
 * fra quel che c'è, non fra quel che si aspetta.
 */
export function allegatiComunicazione (
  registro: Registro,
  comunicazione: Comunicazione,
): Consegna[] {
  return registro.consegne.filter(
    (c) =>
      comunicazione.documentiIds.includes(c.id) &&
      c.documento !== undefined &&
      (c.documenti ?? []).some((d) => d.allievoId === CHI_INSEGNA),
  )
}

/** Il file raccolto da una consegna «a me»: quel che si allega davvero. */
export function fileDellaConsegna (consegna: Consegna): { file: string, nome: string } | null {
  const suo = (consegna.documenti ?? []).find((d) => d.allievoId === CHI_INSEGNA)
  if (!suo) return null
  return { file: suo.file, nome: suo.nome || suo.file.split('/').pop() || 'documento' }
}

// ------------------------------------------------------------------ il corpo

/**
 * Se un testo porta dentro dei tag: è il modo di riconoscere una firma scritta
 * in HTML da una scritta a righe.
 *
 * Si guarda la firma e non si chiede all'utente di dichiararlo con una spunta:
 * chi incolla la firma della scuola incolla dell'HTML e non deve sapere che si
 * chiama così, e chi scrive tre righe di testo non deve spuntare niente.
 */
export function sembraHtml (testo: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(testo)
}

/** Il testo come si scrive dentro dell'HTML: niente tag per caso, gli a capo restano. */
export function comeHtml (testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

/**
 * Il corpo della mail con la firma in fondo, nel formato che serve.
 *
 * Due formati e non uno perché la firma decide: una firma a righe tiene il
 * messaggio in testo semplice — che è come si scrive una comunicazione, e
 * arriva leggibile anche a chi l'HTML lo blocca — mentre una firma con i
 * loghi e i colori della scuola obbliga tutto il messaggio a diventare HTML,
 * perché un corpo non può essere metà e metà. In quel caso il testo scritto
 * dal docente si trasforma: i caratteri che in HTML vogliono dire qualcosa si
 * neutralizzano, e gli a capo diventano interruzioni di riga vere.
 *
 * La riga «-- » davanti alla firma è la convenzione con cui un programma di
 * posta sa che quel che segue non è parte del messaggio: la nasconde citando e
 * non la legge rispondendo. In HTML si scrive lo stesso, dentro il suo blocco.
 */
export function corpoDelMessaggio (
  corpo: string,
  firma?: string,
  sempreHtml = false,
): { html: boolean, contenuto: string } {
  const pulita = (firma ?? '').trim()
  if (!pulita) {
    return sempreHtml
      ? { html: true, contenuto: `<div>${comeHtml(corpo.trimEnd())}</div>` }
      : { html: false, contenuto: corpo }
  }
  if (!sembraHtml(pulita) && !sempreHtml) {
    return { html: false, contenuto: `${corpo.trimEnd()}\n\n-- \n${pulita}` }
  }
  const inFondo = sembraHtml(pulita) ? pulita : `<div>${comeHtml(pulita)}</div>`
  return {
    html: true,
    contenuto: `<div>${comeHtml(corpo.trimEnd())}</div><div>&nbsp;</div><div>-- </div>${inFondo}`,
  }
}

// ------------------------------------------------------------------ il file di posta

/**
 * Il messaggio scritto come file `.eml`, pronto da aprire nel programma di
 * posta.
 *
 * Sta qui e non fra i dati perché non tocca il disco: prende un messaggio e
 * torna del testo, ed è la specie di cosa che si prova senza l'applicazione —
 * un allegato che arriva con il nome storpiato o un oggetto accentato che si
 * spezza sono errori che si vedono solo leggendo il file, e leggerlo a mano
 * dopo ogni modifica non lo fa nessuno.
 */

/** Un allegato già in base64, come lo si legge da disco. */
export interface AllegatoPosta {
  nome: string
  tipo: string
  contenuto: string
  /**
   * Dov'è il file sul disco, quando lo si sa.
   *
   * Serve a chi allega senza ricopiare: Outlook aggancia il file dal suo
   * percorso, e un allegato che non passa per la memoria non ha un peso
   * massimo da rispettare. Il contenuto in base64 resta per il file `.eml`,
   * che il file deve portarselo dentro.
   */
  percorso?: string
}

export interface MessaggioPosta {
  oggetto: string
  corpo: string
  /**
   * Da quale casella parte, quando la si sa.
   *
   * Con due caselle nello stesso programma di posta il conto predefinito non è
   * per forza quello della scuola, e una comunicazione alle famiglie spedita
   * dall'indirizzo privato è un errore che si vede solo dopo, in trenta caselle
   * diverse. Dirlo nel file è il modo di far trovare il campo «Da» già giusto.
   */
  da?: string
  /** Vanno tutti in copia nascosta: una comunicazione alla classe non è una rubrica. */
  ccn: string[]
  /** I destinatari in chiaro, quando la mail è indirizzata a qualcuno. */
  a?: string[]
  allegati?: AllegatoPosta[]
  /** La firma da mettere in fondo, uguale per tutto quel che esce dal registro. */
  firma?: string
}

const ACAPO = '\r\n'

/**
 * Un'intestazione con dentro qualcosa che non è ASCII, scritta come vuole la
 * posta: `=?UTF-8?B?…?=`. Un oggetto passato tale e quale arriverebbe a pezzi,
 * e «Assenze 1° semestre» ha il suo accento.
 */
function intestazione (testo: string): string {
  if (!/[^\u0000-\u007f]/.test(testo)) return testo
  return `=?UTF-8?B?${Buffer.from(testo, 'utf8').toString('base64')}?=`
}

/** Base64 spezzato a 76 colonne, come vuole il MIME. */
function aRighe (base64: string): string {
  return (base64.match(/.{1,76}/g) ?? []).join(ACAPO)
}

/** Un nome buono per un file su qualunque sistema: niente accenti, niente segni. */
export function schiacciaNome (testo: string): string {
  const senzaAccenti = testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return (
    senzaAccenti.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'bozza'
  )
}

/**
 * Il nome di un allegato, scritto in tutti e due i modi.
 *
 * `filename=` con l'ASCII per i programmi vecchi, `filename*=` con l'UTF-8 per
 * gli altri: un rapporto che si chiama «Assenze 1° semestre.pdf» deve arrivare
 * con quel nome, e non con uno mangiato a metà.
 */
function nomeAllegato (nome: string): string {
  const coda = nome.match(/\.[^.]+$/)?.[0] ?? ''
  const ripiego = schiacciaNome(nome.slice(0, nome.length - coda.length)) + coda
  return `filename="${ripiego}"${ACAPO} filename*=UTF-8''${encodeURIComponent(nome)}`
}

/**
 * Il messaggio come file di posta.
 *
 * `X-Unsent: 1` è la riga che conta: senza, Outlook apre il file come un
 * messaggio *ricevuto*, da leggere e basta; con, lo apre come una bozza da
 * finire, con i destinatari modificabili e il tasto Invia al suo posto. È
 * quella riga a fare la differenza fra «ecco com'era» ed «eccola, mandala».
 */
/**
 * Le parti MIME del messaggio: quel che sta sotto le intestazioni.
 *
 * È in comune fra il file `.eml` e quel che parte per SMTP, perché è la stessa
 * cosa: cambiano le intestazioni davanti — una bozza da aprire e un messaggio
 * in viaggio non si scrivono uguali — ma il corpo, la firma e gli allegati no.
 */
function partiMime (
  messaggio: MessaggioPosta,
  adesso: Date,
  sempreHtml = false,
): { testate: string[], pezzi: string[] } {
  const scritto = corpoDelMessaggio(messaggio.corpo, messaggio.firma, sempreHtml)
  const allegati = messaggio.allegati ?? []

  const corpo = [
    `Content-Type: text/${scritto.html ? 'html' : 'plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    '',
    aRighe(Buffer.from(scritto.contenuto, 'utf8').toString('base64')),
  ].join(ACAPO)

  if (allegati.length === 0) return { testate: [], pezzi: [corpo] }

  // Un confine che non può comparire dentro il base64: le sole lettere che il
  // base64 usa sono quelle, ma i trattini e la parola in mezzo no.
  const confine = `----registro-${adesso.getTime().toString(36)}-${allegati.length}`
  return {
    testate: [`Content-Type: multipart/mixed; boundary="${confine}"`, ''],
    pezzi: [
      `--${confine}`,
      corpo,
      ...allegati.map((allegato) =>
        [
          `--${confine}`,
          `Content-Type: ${allegato.tipo}; name="${schiacciaNome(allegato.nome)}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; ${nomeAllegato(allegato.nome)}`,
          '',
          aRighe(allegato.contenuto),
        ].join(ACAPO),
      ),
      `--${confine}--`,
    ],
  }
}

/**
 * Il messaggio come file di posta.
 *
 * `X-Unsent: 1` è la riga che conta: senza, Outlook apre il file come un
 * messaggio *ricevuto*, da leggere e basta; con, lo apre come una bozza da
 * finire, con i destinatari modificabili e il tasto Invia al suo posto. È
 * quella riga a fare la differenza fra «ecco com'era» ed «eccola, mandala».
 *
 * Il corpo va in HTML sempre, anche quando è tre righe di testo. Non è una
 * preferenza di forma: la bozza si apre in un programma di posta che, appena
 * la mostra, ci attacca la firma dell'utente — che è in HTML — e un messaggio
 * non può essere metà testo e metà HTML. Outlook risolve quel conflitto
 * riscrivendo il corpo, e quel che si vede è una bozza con la firma e senza
 * il testo. Scrivendolo già in HTML non c'è niente da riconciliare.
 */
export function componiEml (messaggio: MessaggioPosta, adesso = new Date()): string {
  const visibili = messaggio.a ?? []
  const { testate, pezzi } = partiMime(messaggio, adesso, true)

  return (
    [
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Date: ${adesso.toUTCString()}`,
      `Subject: ${intestazione(messaggio.oggetto)}`,
      ...(messaggio.da ? [`From: ${messaggio.da}`] : []),
      ...(visibili.length > 0 ? [`To: ${visibili.join(', ')}`] : []),
      ...(messaggio.ccn.length > 0 ? [`Bcc: ${messaggio.ccn.join(', ')}`] : []),
      ...testate,
      ...pezzi,
    ].join(ACAPO) + ACAPO
  )
}

// ------------------------------------------------------------------ l'invio diretto

/** Un messaggio che non è partito, e perché. */
export interface MessaggioFallito {
  /** La sua posizione nell'elenco passato: è così che chi chiama lo ritrova. */
  indice: number
  errore: string
}

/**
 * Un'intestazione di indirizzi spezzata su più righe.
 *
 * Una riga di posta non può superare i 998 caratteri, e venticinque indirizzi
 * `nome.cognome@edu.ti.ch` messi in fila li superano: il server taglierebbe la
 * riga a metà e la mail arriverebbe a un elenco di destinatari monco. La posta
 * si piega mettendo un a capo seguito da uno spazio — chi legge lo ricuce.
 */
function piega (nome: string, indirizzi: string[]): string {
  const righe: string[] = []
  let riga = `${nome}:`
  for (const [posizione, indirizzo] of indirizzi.entries()) {
    const pezzo = ` ${indirizzo}${posizione < indirizzi.length - 1 ? ',' : ''}`
    if (riga.length + pezzo.length > 76 && riga !== `${nome}:`) {
      righe.push(riga)
      riga = pezzo
    } else {
      riga += pezzo
    }
  }
  righe.push(riga)
  return righe.join(ACAPO)
}

/**
 * Il messaggio come lo si consegna a un server di posta.
 *
 * Due differenze dal file `.eml`, e sono tutte e due sostanziali.
 *
 * La copia nascosta sparisce dalle intestazioni: `Bcc:` in un messaggio in
 * viaggio è il modo di far leggere a ogni famiglia l'elenco di tutte le altre.
 * Gli indirizzi nascosti si dicono al server nella busta — nei comandi `RCPT
 * TO` — e nel testo del messaggio non compaiono. È l'unico posto dove questa
 * regola si può sbagliare, e sbagliarla si vede in trenta caselle diverse.
 *
 * E `X-Unsent` non c'è: quella riga dice «questa è una bozza da finire», ed è
 * il contrario di un messaggio che sta partendo.
 */
export function componiPerInvio (
  messaggio: MessaggioPosta,
  adesso = new Date(),
  chiave = Math.random().toString(36).slice(2),
): string {
  const visibili = messaggio.a ?? []
  const { testate, pezzi } = partiMime(messaggio, adesso)
  const dominio = (messaggio.da ?? '').split('@')[1] || 'registro.local'

  return (
    [
      'MIME-Version: 1.0',
      `Date: ${adesso.toUTCString()}`,
      // Senza un `Message-ID` è il server a inventarne uno, e non tutti lo
      // fanno: un messaggio senza finisce più facilmente fra la posta
      // indesiderata, ed è quel che non deve succedere a una comunicazione.
      `Message-ID: <${adesso.getTime().toString(36)}.${chiave}@${dominio}>`,
      `Subject: ${intestazione(messaggio.oggetto)}`,
      ...(messaggio.da ? [`From: ${messaggio.da}`] : []),
      ...(visibili.length > 0 ? [piega('To', visibili)] : []),
      ...testate,
      ...pezzi,
    ].join(ACAPO) + ACAPO
  )
}

/**
 * Gli indirizzi della busta: chi il server deve raggiungere davvero.
 *
 * Destinatari in chiaro e copia nascosta insieme, senza doppioni: è la lista
 * dei `RCPT TO`, e non ha niente a che vedere con quel che si legge nelle
 * intestazioni del messaggio.
 */
export function destinatariBusta (messaggio: MessaggioPosta): string[] {
  const tutti = new Set<string>()
  for (const indirizzo of [...(messaggio.a ?? []), ...messaggio.ccn]) {
    const pulito = indirizzo.trim()
    if (pulito) tutti.add(pulito)
  }
  return [...tutti]
}
