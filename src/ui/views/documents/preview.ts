// L'anteprima: il foglio che si sta guardando, e i gesti che lo riguardano.
//
// È il corpo della pagina, non un pannello che si apre sopra al lavoro: i
// riquadri stanno stretti in una barra a sinistra, il documento prende tutto il
// resto, perché è un A4 e la domanda di chi lo apre è «che cosa c'è scritto».
//
// Il telaio del lettore vive fuori dalla vista — vedi `components/frame.ts` —
// e qui se ne dichiara soltanto il posto: un `<iframe>` tolto dal documento
// perde quel che ha caricato, e il ridisegno che scatta a ogni minuto
// riporterebbe a pagina uno chi sta leggendo.

import { pastiglia, pulsante, quantoMisura } from '../../components/base.js'
import { corniceDocumento } from '../../components/frame.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import { aggiorna, stato, uriDato } from '../../state.js'

import { anteprimaCsv } from './csv.js'
import {
  apribili,
  buttaVia,
  fileEsportato,
  quandoFattoIl,
  rifaiEGuarda,
  type Riga,
} from './sheets.js'

/** Il documento che si sta guardando: dov'è, come si chiama, come sta. */
interface DaGuardare {
  percorso: string
  etichetta: string
  /** Quanto misura il file: la pastiglia in testa alla cornice. */
  misura: number
  /**
   * Quante volte l'host ha riscritto questo file da quando l'anno è aperto.
   *
   * È quel che distingue una copia dall'altra allo stesso percorso: entra nella
   * chiave della cornice, e cambiando fa ricaricare il lettore. Senza, rifare
   * un foglio mentre lo si guarda lascerebbe in mostra quello di prima.
   */
  revisione: number
  /**
   * L'elenco che l'anteprima scorre: i fogli apribili della scheda aperta.
   *
   * Si porta dietro tutto l'elenco e non il solo indice perché le due frecce e
   * il «3 di 12» leggono la stessa cosa, e passargliela già pronta evita di
   * rifare il filtro tre volte per disegnare una testata.
   */
  elenco: Riga[]
  /** Che numero fa in quell'elenco, da 0; -1 se non ci sta. */
  indice: number
}

/**
 * Il documento aperto nell'anteprima, se il suo file c'è ancora.
 *
 * Non c'è nessun elenco da cui scegliere, ed è voluto: i documenti sono già
 * elencati nelle schede della pagina — le presenze fra i fogli del corso, il
 * verbale nella riga della sua ora, la scheda accanto al nome della persona —
 * e una seconda lista degli stessi file era la stessa cosa scritta due volte.
 * L'anteprima la chiama la riga, che è dove si sta guardando.
 *
 * Il percorso vale solo se sta ancora fra le esportazioni: buttato via il file,
 * o cambiato l'anno, resterebbe una cornice puntata su un percorso morto.
 */
export function documentoAperto (): DaGuardare | null {
  const percorso = stato.anteprima
  if (!percorso) return null

  const suo = fileEsportato(percorso)
  if (!suo.trovato) return null
  const elenco = apribili()
  return {
    percorso,
    etichetta: etichettaDelFile(percorso),
    misura: suo.misura,
    revisione: suo.revisione,
    elenco,
    indice: elenco.findIndex((riga) => riga.foglio.trovato === percorso),
  }
}

/**
 * Come si chiama un documento in testa all'anteprima.
 *
 * Il nome sul disco ripete la classe davanti — serve fuori dal registro, dove
 * un «Presenze.pdf» non dice di chi sia — e qui la classe la si sa già: si
 * toglie, e i pezzi restanti diventano una riga che si legge.
 */
function etichettaDelFile (percorso: string): string {
  const file = percorso.split('/').pop() ?? percorso
  const pezzi = file.replace(/\.[a-z0-9]+$/i, '').split('_')
  return (pezzi.length > 1 ? pezzi.slice(1) : pezzi).join(' · ')
}

/**
 * Il passo avanti e il passo indietro nell'elenco della scheda.
 *
 * È il gesto del controllo prima di consegnare: venticinque schede da guardare
 * una dopo l'altra, e fra l'una e l'altra non c'è niente da decidere. Tornare
 * ogni volta alla riga per premere la lente vuol dire venticinque volte cercare
 * il nome giusto in una colonna di nomi quasi uguali.
 */
function scorri (aperto: DaGuardare, passo: -1 | 1): Figlio {
  const prossimo = aperto.indice >= 0 ? aperto.elenco[aperto.indice + passo] : undefined
  const avanti = passo === 1

  return pulsante({
    simbolo: avanti ? 'giu' : 'su',
    variante: 'fantasma',
    titolo: prossimo
      ? `${avanti ? 'Il documento dopo' : 'Il documento prima'}: ${prossimo.nome}`
      : aperto.indice < 0
        ? 'Questo documento non è fra quelli della scheda aperta'
        : `Non c’è nessun documento ${avanti ? 'dopo' : 'prima'} di questo`,
    disabilitato: !prossimo,
    al: () => aggiorna({ anteprima: prossimo?.foglio.trovato ?? null }),
  })
}

/**
 * Il documento aperto: è il corpo della pagina.
 *
 * L'anteprima non è un pannello che si apre sopra al lavoro — è il lavoro. I
 * riquadri con cui si gestiscono i fogli stanno in una barra a sinistra,
 * stretti quanto serve a leggere una riga e premere un pulsante; il foglio
 * prende tutto il resto, perché è un A4 e la domanda di chi lo apre è «che cosa
 * c'è scritto».
 *
 * In testa c'è quel che si può fare a *questo* foglio — rifarlo, buttarlo via,
 * portarlo in una finestra sua — e il posto che occupa nell'elenco, con le due
 * frecce per scorrerlo. Erano gesti che stavano solo nella riga di partenza: chi
 * guardava un foglio e vedeva che andava rifatto doveva ritrovare la riga da cui
 * era venuto, in una colonna di venticinque nomi quasi uguali.
 *
 * Dentro c'è il lettore di PDF di Chromium, quello che Electron porta con sé:
 * pagine, zoom, ricerca nel testo, stampa. Il telaio non si rifà con la vista —
 * vedi `corniceDocumento` — così un ridisegno non riporta il documento a pagina
 * uno mentre lo si sta leggendo.
 */
export function cornice (aperto: DaGuardare): Figlio {
  const indirizzo = uriDato(aperto.percorso)
  if (!indirizzo) return null
  const giorno = quandoFattoIl(aperto.percorso)
  const suo = aperto.indice >= 0 ? aperto.elenco[aperto.indice] : null
  // Un CSV non si inquadra: sotto la stessa testata, al posto del telaio, ci va
  // la tabella che la pagina disegna leggendo il file.
  const foglio = aperto.percorso.endsWith('.csv')
  // La stessa chiave del telaio: dice quando il documento è stato rifatto, e
  // quindi quando la tabella va riletta invece di restare quella di prima.
  const chiave = `${aperto.percorso}|${aperto.misura}|${aperto.revisione}`

  return h(
    'div',
    { class: 'documenti__anteprima' },
    h(
      'header',
      { class: 'documenti__anteprima-testa' },
      h('h3', { class: 'documenti__anteprima-titolo' }, aperto.etichetta),
      pastiglia(giorno ? `del ${giorno}` : quantoMisura(aperto.misura), 'positivo', 'documento'),
      // Dove si è, nell'elenco della scheda: senza il numero le due frecce
      // sarebbero due gesti al buio, e non si saprebbe quanto manca alla fine.
      aperto.indice >= 0
        ? h(
            'span',
            { class: 'documenti__anteprima-conto' },
            `${aperto.indice + 1} di ${aperto.elenco.length}`,
          )
        : null,
      scorri(aperto, -1),
      scorri(aperto, 1),
      suo?.rifai
        ? pulsante({
            simbolo: 'ricarica',
            variante: 'fantasma',
            titolo: suo.bloccato ?? `Rifà ${suo.nome} e rimette il foglio qui`,
            disabilitato: Boolean(suo.bloccato),
            al: () => (suo.rifai ? rifaiEGuarda(suo.rifai) : undefined),
          })
        : null,
      suo
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: `Butta via ${suo.nome} dalla cartella`,
            // Il modo di buttarlo via è quello della riga da cui il foglio
            // viene: una composizione è due cose — il PDF e la ricetta — e da
            // qui se ne portava via una sola, lasciando in elenco una
            // composizione senza il suo documento.
            al: () => suo.butta?.() ?? buttaVia(aperto.percorso, suo.nome),
          })
        : null,
      // Fuori di qui un CSV e un PDF vanno in due posti diversi: il primo nel
      // foglio di calcolo, che è dove ci si lavora davvero — la cornice lo
      // mostra, non lo fa usare — e il secondo in una finestra sua del lettore,
      // che è il registro stesso.
      foglio
        ? pulsante({
            simbolo: 'esporta',
            variante: 'fantasma',
            titolo: 'Apre questo foglio nel programma del sistema',
            al: () => azione({ tipo: 'esportazione.apri', percorso: aperto.percorso }),
          })
        : pulsante({
            simbolo: 'schermo',
            variante: 'fantasma',
            titolo: 'Apre questo documento in una finestra sua',
            al: () =>
              azione({
                tipo: 'esportazione.mostra',
                percorso: aperto.percorso,
                titolo: aperto.etichetta,
              }),
          }),
      pulsante({
        testo: 'Chiudi',
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: 'Torna ai documenti',
        al: () => aggiorna({ anteprima: null }),
      }),
    ),
    // Il segnaposto del telaio, non il telaio: quello vive fuori dalla vista e
    // viene a mettersi qui sopra. La chiave è quel che gli dice quando
    // ricaricare — un file rifatto sta allo stesso percorso di prima.
    foglio
      ? anteprimaCsv({ indirizzo: `${indirizzo}?v=${aperto.revisione}-${aperto.misura}`, chiave })
      : corniceDocumento({
          indirizzo: `${indirizzo}?v=${aperto.revisione}-${aperto.misura}`,
          chiave,
          titolo: aperto.etichetta,
        }),
  )
}

/**
 * Il corpo della pagina quando non si sta guardando niente.
 *
 * Una riga quieta e non uno stato vuoto con il suo pulsante: qui non manca
 * niente — c'è solo un foglio che nessuno ha ancora chiesto di vedere. Il gesto
 * però c'è, quando c'è qualcosa da aprire: chi arriva sulla scheda delle schede
 * personali vuole quasi sempre cominciare dalla prima e scorrerle con le frecce.
 */
export function senzaAnteprima (): Figlio {
  const elenco = apribili()
  const primo = elenco[0]

  return h(
    'div',
    { class: 'documenti__anteprima documenti__anteprima--vuota' },
    h(
      'p',
      { class: 'testo-quieto' },
      primo
        ? `${elenco.length} ${elenco.length === 1 ? 'documento' : 'documenti'} da guardare in ` +
          'questa scheda: premi la lente accanto a uno, o comincia dal primo e scorrili con le frecce.'
        : 'Premi la lente accanto a un documento per guardarlo qui, senza uscire dal registro.',
    ),
    primo
      ? pulsante({
          testo: 'Guarda il primo',
          simbolo: 'lente',
          variante: 'sottile',
          titolo: primo.nome,
          al: () => aggiorna({ anteprima: primo.foglio.trovato }),
        })
      : null,
  )
}
