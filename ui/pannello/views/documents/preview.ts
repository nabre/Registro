// L'anteprima: il foglio che si sta guardando, e i gesti che lo riguardano.
// È il corpo della pagina; i riquadri stanno stretti a sinistra. È un'isola:
// una lettura che arriva (la tabella di un CSV) rifà lei sola, non la pagina.
// Il lettore è un nodo tenuto (`components/frame.ts`): un ridisegno non lo
// ricarica finché il file è lo stesso.

import { pastiglia, pulsante, quantoMisura } from '#ui/pannello/components/base.js'
import { corniceDocumento } from '#ui/pannello/components/frame.js'
import { h, type Figlio } from '#ui/pannello/dom.js'
import { azione } from '#ui/pannello/bridge.js'
import { isola } from '#ui/pannello/islands.js'
import { aggiorna, stato, uriDato } from '#ui/pannello/state.js'

import { scorri } from '#ui/pannello/views/archive.js'
import { anteprimaCsv } from './csv.js'
import {
  apribili,
  buttaVia,
  fileEsportato,
  quandoFattoIl,
  rifaiEGuarda,
  type Riga,
} from './sheets.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './preview.testi.js'

/** La chiave dell'isola dell'anteprima: una sola nella pagina. */
const ISOLA = 'documenti:anteprima' // testo-fisso: una chiave, non un testo

/**
 * Il corpo della pagina: il documento aperto o la riga che invita ad aprirne
 * uno. Si legge qui dentro e non da chi disegna la pagina: rifatta da sola,
 * l'isola guarda lo stato di adesso e le righe dell'ultimo disegno completo.
 */
export function anteprima (): HTMLElement {
  return isola(ISOLA, () => {
    const aperto = documentoAperto()
    return aperto ? cornice(aperto) : senzaAnteprima()
  })
}

/** Il documento che si sta guardando: dov'è, come si chiama, come sta. */
interface DaGuardare {
  percorso: string
  etichetta: string
  /** Quanto misura il file: la pastiglia in testa alla cornice. */
  misura: number
  /**
   * Quante volte l'host ha riscritto questo file da quando l'anno è aperto: entra
   * nella chiave della cornice, così un foglio rifatto allo stesso percorso ricarica.
   */
  revisione: number
  /**
   * L'elenco che l'anteprima scorre (i fogli apribili della scheda aperta),
   * passato intero per frecce e «3 di 12».
   */
  elenco: Riga[]
  /** Che numero fa in quell'elenco, da 0; -1 se non ci sta. */
  indice: number
}

/**
 * Il documento aperto nell'anteprima, se il suo file c'è ancora fra le
 * esportazioni. Lo apre la riga del documento; non c'è un elenco a parte.
 */
function documentoAperto (): DaGuardare | null {
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
 * Il nome di un documento in testa all'anteprima: senza la classe davanti, che
 * qui è già nota.
 */
function etichettaDelFile (percorso: string): string {
  const file = percorso.split('/').pop() ?? percorso
  const pezzi = file.replace(/\.[a-z0-9]+$/i, '').split('_')
  return (pezzi.length > 1 ? pezzi.slice(1) : pezzi).join(' · ')
}

/** Il passo avanti e indietro nell'elenco della scheda, per controllare i fogli uno dopo l'altro. */
function freccia (aperto: DaGuardare, passo: -1 | 1): Figlio {
  return scorri(aperto.elenco, aperto.indice, passo, {
    cosa: 'documento',
    detto: (prossimo) => prossimo.nome,
    apri: (prossimo) => aggiorna({ anteprima: prossimo?.foglio.trovato ?? null }),
    fuoriElenco: testi().fuoriElenco,
  })
}

/**
 * Il documento aperto, corpo della pagina. In testa i gesti su questo foglio
 * (rifarlo, buttarlo, aprirlo in una finestra sua) e le frecce con la
 * posizione. Dentro il lettore PDF di Chromium; il telaio non si rifà con la
 * vista (`corniceDocumento`, `data-tieni`), così un ridisegno non torna a
 * pagina uno.
 */
function cornice (aperto: DaGuardare): Figlio {
  const indirizzo = uriDato(aperto.percorso)
  if (!indirizzo) return null
  const giorno = quandoFattoIl(aperto.percorso)
  const suo = aperto.indice >= 0 ? aperto.elenco[aperto.indice] : null
  // Un CSV non si inquadra: al posto del telaio la tabella disegnata dalla pagina.
  const foglio = aperto.percorso.endsWith('.csv')
  // La stessa chiave del lettore: dice quando la tabella va riletta.
  const chiave = `${aperto.percorso}|${aperto.misura}|${aperto.revisione}`
  const t = testi()

  return h(
    'div',
    { class: 'documenti__anteprima' },
    h(
      'header',
      { class: 'documenti__anteprima-testa' },
      h('h3', { class: 'documenti__anteprima-titolo' }, aperto.etichetta),
      pastiglia(giorno ? t.del(giorno) : quantoMisura(aperto.misura), 'positivo', 'documento'),
      // La posizione nell'elenco della scheda.
      aperto.indice >= 0
        ? h(
            'span',
            { class: 'documenti__anteprima-conto' },
            t.conto(aperto.indice + 1, aperto.elenco.length),
          )
        : null,
      freccia(aperto, -1),
      freccia(aperto, 1),
      suo?.rifai
        ? pulsante({
            simbolo: 'ricarica',
            variante: 'fantasma',
            titolo: suo.bloccato ?? t.rifaQui(suo.nome),
            disabilitato: Boolean(suo.bloccato),
            al: () => (suo.rifai ? rifaiEGuarda(suo.rifai) : undefined),
          })
        : null,
      suo
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: t.buttaDallaCartella(suo.nome),
            al: () => buttaVia(aperto.percorso, suo.nome),
          })
        : null,
      // Fuori di qui: un CSV nel foglio di calcolo, un PDF in una finestra sua del lettore.
      foglio
        ? pulsante({
            simbolo: 'esporta',
            variante: 'fantasma',
            titolo: t.apreSistema,
            al: () => azione({ tipo: 'esportazione.apri', percorso: aperto.percorso }),
          })
        : pulsante({
            simbolo: 'schermo',
            variante: 'fantasma',
            titolo: t.finestraSua,
            al: () =>
              azione({
                tipo: 'esportazione.mostra',
                percorso: aperto.percorso,
                titolo: aperto.etichetta,
              }),
          }),
      pulsante({
        testo: parole().chiudi,
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: t.tornaDocumenti,
        al: () => aggiorna({ anteprima: null }),
      }),
    ),
    // Il lettore, tenuto fra un disegno e l'altro; la chiave dice quando
    // ricaricare, perché il file rifatto sta allo stesso percorso.
    foglio
      ? anteprimaCsv({ indirizzo: `${indirizzo}?v=${aperto.revisione}-${aperto.misura}`, chiave, isola: ISOLA })
      : corniceDocumento({
          indirizzo: `${indirizzo}?v=${aperto.revisione}-${aperto.misura}`,
          chiave,
          titolo: aperto.etichetta,
        }),
  )
}

/**
 * Il corpo della pagina quando non si guarda niente: una riga quieta, e il
 * gesto per aprire il primo se c'è qualcosa da aprire.
 */
function senzaAnteprima (): Figlio {
  const elenco = apribili()
  const primo = elenco[0]
  const t = testi()

  return h(
    'div',
    { class: 'documenti__anteprima documenti__anteprima--vuota' },
    h(
      'p',
      { class: 'testo-quieto' },
      primo
        ? t.daGuardare(elenco.length)
        : t.premiLente,
    ),
    primo
      ? pulsante({
          testo: t.guardaPrimo,
          simbolo: 'lente',
          variante: 'sottile',
          titolo: primo.nome,
          al: () => aggiorna({ anteprima: primo.foglio.trovato }),
        })
      : null,
  )
}
