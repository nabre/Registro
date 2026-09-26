// Le persone in formazione dell'anno, tutte insieme, con la scheda accanto.
// L'elenco attraversa le classi e si filtra per nome, azienda o paese. La
// scheda è quella di `views/student.ts` (`schedaAllievo`).
//
// La ricerca non passa dallo stato: `aggiorna` rifarebbe anche la scheda, con
// il ritratto e la mappa viva, a ogni lettera. Sta in una variabile del modulo
// e a ogni lettera si rifà solo l'elenco; alla chiusura del pannello si perde.

import { nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { scriviIndirizzo } from '../../domain/addresses.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import type { Allievo, Classe } from '../../domain/models.js'
import { telefoniDi } from '../../domain/phones.js'
import { corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { pastiglia, pulsante, quieto, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { avatar } from '../components/avatar.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { moduloAllievo, moduloAnno } from '../forms.js'
import { aggiorna, annoCorrente, classiVisibili, ricorda, stato } from '../state.js'
import { schedaAllievo } from './student.js'
import { testi } from './people.testi.js'

/** Quel che si sta cercando; vive quanto il pannello (vedi la nota in testa). */
let cercato = ''

/**
 * Se una classe è aperta a fantasmino. Chiuse di norma; quelle aperte si
 * ricordano nello stato (`classiApertePersone`), a differenza della ricerca.
 * Chiudere una classe non nasconde la scheda aperta.
 */
function apertaDaChiGuarda (classeId: string): boolean {
  return stato.classiApertePersone.includes(classeId)
}

/** Apre quel che è chiuso e chiude quel che è aperto, e se lo ricorda. */
function inverti (classeId: string): void {
  stato.classiApertePersone = apertaDaChiGuarda(classeId)
    ? stato.classiApertePersone.filter((id) => id !== classeId)
    : [...stato.classiApertePersone, classeId]
  // `ricorda` e non `aggiorna`: si ridisegna solo l'elenco (nota in testa).
  ricorda()
}

/** Una persona con la classe da cui viene: l'elenco attraversa le classi. */
interface Voce {
  classe: Classe
  allievo: Allievo
}

/**
 * Tutto quel che di una persona si può cercare, in una riga: nome, azienda,
 * paese, numeri. Non ridotta: la riduce `corrispondeAlla`, come fa
 * `persone.cerca` nell'host, così le due ricerche trovano le stesse persone.
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

/** Quel che resta dopo la ricerca: ogni pezzo scritto deve trovarsi («rossi dic»). */
function filtrate (voci: Voce[]): Voce[] {
  const pezzi = pezziDiRicerca(cercato)
  if (pezzi.length === 0) return voci
  return voci.filter((voce) => corrispondeAlla(paglia(voce), pezzi))
}

/**
 * La riga di una persona: il nome sopra, classe e azienda sotto, per
 * distinguere nomi simili.
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
          // Chi si è ritirato resta nell'elenco, spento: la scheda si guarda ancora.
          !allievo.attivo && 'voce-laterale--spenta',
        ],
        type: 'button',
        onclick: () =>
          aggiorna({ vista: 'persone', classeId: classe.id, allievoId: allievo.id }),
      },
      avatar(allievo),
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
    return quieto(testi().nessunaCorrispondenza)
  }

  const gruppi = new Map<string, Voce[]>()
  for (const voce of voci) {
    const fila = gruppi.get(voce.classe.id)
    if (fila) fila.push(voce)
    else gruppi.set(voce.classe.id, [voce])
  }

  return [...gruppi.values()].map((fila) => {
    const classe = fila[0].classe
    // Cercando, le classi si aprono tutte; la chiusura torna svuotando la casella.
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
 * L'elenco laterale, con la casella che lo restringe. Un `input` scritto a mano
 * e non un `campo` (che reagisce a `change`): si filtra a ogni lettera e si rifà
 * solo questa scatola.
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
  const t = testi()

  const casella = h('input', {
    class: 'campo__controllo campo--ricerca',
    type: 'search',
    value: cercato,
    attr: {
      placeholder: t.segnaposto,
      'aria-label': t.cercaFra,
      autocomplete: 'off',
    },
    // `data-fuoco` rimette il cursore qui dopo un ridisegno vero (dati dall'host).
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
      // Lo scorrimento resta dov'era quando si sceglie un nome e la vista si rifà.
      dataset: { scorrimento: 'elenco-persone' },
    },
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, Molti(lessico().pif)),
      conto,
    ),
    casella,
    corpo,
  )
}
/** Che cosa manca, detto una volta sola in testata. */
function riassunto (voci: Voce[]): string {
  const attive = voci.filter((v) => v.allievo.attivo)
  const senzaAzienda = attive.filter((v) => !v.allievo.azienda?.trim()).length
  const senzaNumero = attive.filter((v) => telefoniDi(v.allievo, 'pif').length === 0).length
  const t = testi()

  return [
    t.inFormazione(attive.length),
    voci.length > attive.length ? t.nonFrequentaPiu(voci.length - attive.length) : null,
    senzaAzienda > 0 ? t.senzaAzienda(senzaAzienda) : null,
    senzaNumero > 0 ? t.senzaTelefono(senzaNumero) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Che cosa c'è nella casella di ricerca e chi l'elenco mostra: la veduta
 * dell'assistente lo legge da qui, perché la ricerca non passa dallo stato.
 * Gli id sono quelli dei nomi visibili (classi chiuse escluse, tutte aperte
 * cercando).
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
    return statoVuotoAnno({ simbolo: 'utente', crea: () => moduloAnno() })
  }

  const elenco = tutte()
  // La persona scelta si cerca fra tutte: se la ricerca la esclude, la scheda
  // resta aperta.
  const scelta = elenco.find((voce) => voce.allievo.id === stato.allievoId) ?? null
  const t = testi()

  return h(
    'div',
    { class: 'vista vista--persone' },
    testataVista({
      titolo: Molti(lessico().pif),
      sottotitolo: elenco.length === 0 ? t.nessunaPerOra : riassunto(elenco),
      azioni: scelta
        ? [
            pulsante({
              testo: t.aTuttaPagina,
              simbolo: 'utente',
              variante: 'sottile',
              titolo: t.senzaElenco(nomeCompleto(scelta.allievo)),
              al: () =>
                aggiorna({
                  vista: 'allievo',
                  classeId: scelta.classe.id,
                  allievoId: scelta.allievo.id,
                }),
            }),
            pulsante({
              testo: parole().modifica,
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
            // Il nome sopra la scheda: dice di chi sono i pannelli che seguono.
            h(
              'header',
              { class: 'persone__intestazione' },
              h('h2', null, nomeCompleto(scelta.allievo)),
              h('span', { class: 'testo-quieto' }, scelta.classe.nome),
              scelta.allievo.attivo ? null : pastiglia(t.nonFrequenta, 'quiete'),
            ),
            schedaAllievo(scelta.classe, scelta.allievo),
          )
        : statoVuoto({
            simbolo: 'utente',
            titolo: elenco.length === 0 ? t.nessuna : t.scegli,
            testo: elenco.length === 0 ? t.comeSiAggiungono : t.comeSiApre,
            azione:
              elenco.length === 0
                ? pulsante({
                    testo: t.vaiAlleClassi,
                    variante: 'primario',
                    simbolo: 'classi',
                    al: () => aggiorna({ vista: 'classi' }),
                  })
                : undefined,
          }),
    ),
  )
}
