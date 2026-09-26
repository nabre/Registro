// Il recupero di una prova: quando si rifà, o che non si rifà. Il pulsante che
// mette la prossima ora del corso basta di solito; questa finestra serve per un
// altro giorno o un altro modo, da dire in una nota.

import { nomeCompleto } from '../../domain/calculations.js'
import { formattaData } from '../../domain/dates.js'
import type { Recupero } from '../../domain/retakes.js'
import { postoAllegato } from '../components/attachments.js'
import { campo, pulsante, riga, valoriModulo } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { apriModale } from '../components/modal.js'
import { h, rimpiazza } from '../dom.js'
import { nomeCorso, valutazionePerId } from '../state.js'

import { salva, testo } from './common.js'
import { testi } from './retake.testi.js'

/** Il nome e cognome di chi rifà la prova, come si scrive in un elenco. */
function nome (recupero: Recupero): string {
  return nomeCompleto(recupero.allievo)
}

/**
 * I documenti della prova rifatta: il testo (uno per tutti) e la scansione del
 * compito (di questo allievo). Stanno qui perché è qui che si ha la carta in
 * mano; sono gli stessi file della tabella dei recuperi, fra gli allegati del
 * momento.
 */
function documentiDelRecupero (recupero: Recupero): HTMLElement {
  const contenitore = h('div', { class: 'allegati allegati--modulo' })

  const t = testi()
  const disegna = (): void => {
    // Il momento si rilegge dallo stato a ogni giro: dopo un caricamento quello
    // della costruzione è vecchio.
    const momento = valutazionePerId(recupero.momento.id) ?? recupero.momento
    rimpiazza(
      contenitore,
      h(
        'h4',
        { class: 'modulo__titolo-sezione' },
        t.documenti,
        suggerimento(t.aiutoDocumenti, { etichetta: t.documenti }),
      ),
      postoAllegato(momento, 'recupero', t.testoDelRecupero, { dopo: disegna }),
      // Il recupero ha un testo suo, quindi una soluzione sua.
      postoAllegato(momento, 'recupero-soluzione', t.soluzioneDelRecupero, {
        dopo: disegna,
      }),
      postoAllegato(momento, 'recupero', t.scansioneDi(nome(recupero)), {
        allievoId: recupero.allievo.id,
        dopo: disegna,
      }),
    )
  }

  disegna()
  return contenitore
}

/**
 * Fissa il recupero, o lo dispensa. La dispensa sta fra le azioni secondarie:
 * chiude la faccenda senza un voto.
 */
export function moduloRecupero (recupero: Recupero): void {
  const t = testi()
  const manda = (
    contesto: Parameters<typeof salva>[0],
    previstoIl: string | null,
    nota: string,
    dispensato: boolean,
    messaggio: string,
    riconsegnataIl?: string | null,
  ) =>
    salva(
      contesto,
      {
        tipo: 'recupero.imposta',
        valutazioneId: recupero.momento.id,
        allievoId: recupero.allievo.id,
        previstoIl,
        nota,
        dispensato,
        riconsegnataIl,
      },
      messaggio,
    )

  apriModale({
    titolo: t.titolo,
    sottotitolo: `${nome(recupero)} · ${recupero.momento.titolo}`,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          t.provaDel(nomeCorso(recupero.corsoId), formattaData(recupero.momento.data, 'lungo')) +
            (recupero.daAppello ? t.assenteAppello : t.assenteProva),
        ),
        riga(
          campo({
            nome: 'previstoIl',
            etichetta: t.siRifaIl,
            tipo: 'date',
            valore: recupero.previstoIl ?? '',
            aiuto: t.aiutoSiRifa,
            larghezza: 'meta',
          }),
          // La riconsegna è di questo allievo: il suo compito torna quando è corretto.
          campo({
            nome: 'riconsegnataIl',
            etichetta: t.riconsegnataIl,
            tipo: 'date',
            valore: recupero.riconsegnataIl ?? '',
            aiuto: t.aiutoRiconsegnata,
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'nota',
          etichetta: t.nota,
          valore: recupero.nota,
          segnaposto: t.segnapostoNota,
        }),
        documentiDelRecupero(recupero),
      ),
    alSalva: async (valori, contesto) => {
      const previstoIl = testo(valori.previstoIl) || null
      await manda(
        contesto,
        previstoIl,
        testo(valori.nota),
        false,
        previstoIl
          ? t.fissato(formattaData(previstoIl, 'giorno'))
          : t.daFissare,
        testo(valori.riconsegnataIl) || null,
      )
    },
    azioniSecondarie: (contesto) =>
      pulsante({
        testo: recupero.stato === 'dispensato' ? t.tornaARecuperarla : t.nonSiRecupera,
        simbolo: recupero.stato === 'dispensato' ? 'ricarica' : 'chiudi',
        variante: 'fantasma',
        al: () => {
          // I valori si rileggono dai campi: la nota scritta adesso spiega proprio
          // questo gesto.
          const valori = valoriModulo(contesto.corpo)
          const nota = testo(valori.nota)
          const riconsegnataIl = testo(valori.riconsegnataIl) || null
          return recupero.stato === 'dispensato'
            ? manda(
                contesto,
                testo(valori.previstoIl) || null,
                nota,
                false,
                t.riaperto,
                riconsegnataIl,
              )
            : manda(contesto, null, nota, true, t.dispensato, riconsegnataIl)
        },
      }),
  })
}
