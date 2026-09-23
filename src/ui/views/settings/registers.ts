// Gli anni che il registro conosce: i recenti e quelli messi da parte.
//
// L'elenco esisteva già — `environment/documents.ts` lo tiene in `userData`, e il
// menu «File» lo mostra — ma non si poteva governare: una tendina non è il
// posto in cui si mette una stella o si toglie una riga, perché ogni clic la
// richiude e il gesto seguente comincia da capo. I due comandi c'erano,
// `documento.preferito` e `documento.dimentica`, e non li premeva nessuno.
//
// Qui l'elenco sta fermo. Si apre un anno, si tiene da parte quello su cui si
// lavora tutto il semestre — i preferiti non scadono, i recenti sì, e sono
// dodici — e si toglie di mezzo quel che non riguarda più: il documento di
// prova, la copia sulla chiavetta del collega. Togliere una riga non tocca il
// file sul disco, ed è scritto sul pulsante perché è la sola paura che quel
// gesto fa venire.
//
// Sta fra le impostazioni del *programma* e non fra quelle del documento: parla
// di file sparsi in cartelle diverse, e non viaggia dentro nessuno di loro.

import type { DocumentoRecente } from '../../../protocol.js'
import { pastiglia, pulsante, scheda, statoVuoto } from '../../components/base.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'

/** La riga di un anno noto: il nome, dov'è, e i tre gesti. */
function rigaDocumento (voce: DocumentoRecente): Figlio {
  // Lo dice l'ospite: il confronto fra percorsi lo sa fare lui, e qui era
  // rifatto con un `toLowerCase()` senza `resolve`.
  const aperto = voce.aperto

  return h(
    'li',
    { class: ['voce-laterale', 'registro-noto', voce.mancante && 'voce-laterale--spenta'] },
    h(
      'span',
      { class: 'voce-laterale__testo' },
      h('strong', null, voce.nome),
      h('small', { attr: { title: voce.percorso } }, voce.cartella),
    ),
    // Due pastiglie che dicono due cose diverse: quale anno si sta guardando
    // adesso, e quale file in questo momento non c'è — una chiavetta staccata,
    // una cartella sincronizzata non ancora scesa.
    aperto ? pastiglia('aperto', 'positivo') : null,
    voce.mancante ? pastiglia('non disponibile', 'attenzione') : null,
    h(
      'span',
      { class: 'materia__azioni' },
      pulsante({
        simbolo: voce.preferito ? 'stellaPiena' : 'stella',
        variante: 'sottile',
        titolo: voce.preferito
          ? 'Togli dai preferiti: torna a contare fra i dodici recenti'
          : 'Tieni da parte: i preferiti non scadono mai',
        al: () =>
          azione({ tipo: 'documento.preferito', percorso: voce.percorso, preferito: !voce.preferito }),
      }),
      pulsante({
        testo: 'Apri',
        variante: 'sottile',
        disabilitato: aperto || voce.mancante,
        titolo: aperto
          ? 'È l’anno che stai guardando'
          : voce.mancante
            ? 'Adesso questo file non c’è'
            : 'Chiude l’anno aperto e apre questo',
        al: () => azione({ tipo: 'documento.apri', percorso: voce.percorso }),
      }),
      pulsante({
        simbolo: 'chiudi',
        variante: 'sottile',
        titolo: 'Togli dall’elenco. Il file sul disco non si tocca',
        al: () => azione({ tipo: 'documento.dimentica', percorso: voce.percorso }),
      }),
    ),
  )
}

/**
 * La scheda degli anni noti, con in testa i due gesti che riguardano l'elenco
 * intero: aprirne un altro, e chiudere quello aperto.
 *
 * «Chiudi l'anno» sta qui perché è qui che si capisce che cosa fa: lascia il
 * file libero e riporta al benvenuto, che è questa stessa lista a schermo
 * intero. Serve per far salire una cartella su OneDrive, o per riprendere da
 * scuola l'anno rimasto aperto a casa — finché il registro lo tiene, accanto al
 * documento c'è la sua serratura e l'altra macchina lo annuncia occupato.
 */
export function schedaRegistri (): HTMLElement {
  const elenco = stato.documenti.elenco

  return scheda({
    titolo: 'Anni del registro',
    sottotitolo: 'quelli aperti di recente e quelli tenuti da parte',
    azioni: [
      pulsante({
        testo: 'Apri un anno…',
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: 'Sceglie un documento «.registro» con il dialogo del sistema',
        al: () => azione({ tipo: 'documento.apri' }),
      }),
      pulsante({
        testo: 'Chiudi l’anno',
        simbolo: 'chiudi',
        variante: 'sottile',
        disabilitato: stato.documenti.corrente === null,
        titolo: 'Chiude il documento e lascia il file libero',
        al: () => azione({ tipo: 'documento.chiudi' }),
      }),
    ],
    contenuto:
      elenco.length === 0
        ? statoVuoto({
            simbolo: 'documento',
            titolo: 'Nessun anno ancora',
            testo: 'Gli anni che apri finiscono qui, e i dodici più freschi restano a portata.',
          })
        : h('ul', { class: 'elenco-laterale__voci' }, ...elenco.map(rigaDocumento)),
  })
}
