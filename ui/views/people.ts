// Le persone in formazione dell'anno, tutte insieme, con la scheda accanto.
// L'elenco attraversa le classi e si filtra per nome, azienda o paese. La
// scheda è quella di `views/student.ts` (`schedaAllievo`).
//
// La ricerca non passa dallo stato: `aggiorna` rifarebbe anche la scheda, con
// il ritratto e la mappa viva, a ogni lettera. Sta in una variabile del modulo
// e a ogni lettera si rifà solo l'elenco; alla chiusura del pannello si perde.

import { nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import type { Allievo, Classe } from '#core/dominio/models.js'
import { telefoniDi } from '#core/dominio/phones.js'
import { corrispondeAlla, pezziDiRicerca } from '#core/dominio/text.js'
import { pastiglia, pulsante, quieto, statoVuoto, testataVista } from '#ui/components/base.js'
import { statoVuotoAnno } from '#ui/components/filters.js'
import { icona } from '#ui/components/icons.js'
import { avatar } from '#ui/components/avatar.js'
import { finestra, isolaVirtuale, rifaiElenco, stileVuoto } from '#ui/components/virtualList.js'
import { h, type Figlio } from '#ui/dom.js'
import { moduloAllievo, moduloAnno } from '#ui/forms.js'
import { annoCorrente, classiVisibili, ricorda, stato, vai } from '#ui/state.js'
import { schedaAllievo } from './student.js'
import { testi } from './people.testi.js'

/** L'altezza di una persona in elenco e di una testata di classe, finché non le si misura. */
const ALTEZZA_VOCE = 58
const ALTEZZA_TESTATA = 30

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
        // Il fuoco torna qui dopo un ridisegno: scorrendo con Tab la finestra
        // rifà l'elenco sotto il cursore (`components/virtualList.ts`).
        // testo-fisso: chiave del fuoco, non si legge
        dataset: { fuoco: `persona-${allievo.id}` },
        // La pagina resta Persone: la scheda accanto è quella dell'allievo del contesto.
        onclick: () => {
          vai({ pagina: 'pagina.persone' }, { contesto: { classeId: classe.id, allievoId: allievo.id } })
        },
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

/** La chiave della finestra sull'elenco (`components/virtualList.ts`). */
// testo-fisso: chiave della finestra, non si legge
const ELENCO = 'persone'

/** Quel che si disegna in fila: la testata di una classe, o una persona. */
type Posto =
  | { gruppo: Voce[], aperta: boolean }
  | { voce: Voce, testata: number, posto: number, di: number }

/** Le classi con le loro persone, in una fila sola: la finestra conta lì. */
function inFila (voci: Voce[]): Posto[] {
  const gruppi = new Map<string, Voce[]>()
  for (const voce of voci) {
    const fila = gruppi.get(voce.classe.id)
    if (fila) fila.push(voce)
    else gruppi.set(voce.classe.id, [voce])
  }
  const posti: Posto[] = []
  for (const fila of gruppi.values()) {
    // Cercando, le classi si aprono tutte; la chiusura torna svuotando la casella.
    const aperta = apertaDaChiGuarda(fila[0].classe.id) || cercato.trim() !== ''
    const testata = posti.length
    posti.push({ gruppo: fila, aperta })
    if (aperta) fila.forEach((voce, n) => posti.push({ voce, testata, posto: n + 1, di: fila.length }))
  }
  return posti
}

/** La testata apribile di una classe, col conto delle sue persone. */
function testataDiClasse (fila: Voce[], aperta: boolean, dataset?: Record<string, string>): HTMLElement {
  const classe = fila[0].classe
  return h(
    'button',
    {
      class: ['elenco-laterale__gruppo', 'gruppo-classe'],
      type: 'button',
      dataset,
      attr: { 'aria-expanded': aperta },
      onclick: () => {
        inverti(classe.id)
        rifaiElenco(ELENCO)
      },
    },
    icona(aperta ? 'giu' : 'destra', 'gruppo-classe__freccia'),
    h('span', null, classe.nome),
    h('span', { class: 'testo-quieto' }, String(fila.length)),
  )
}

/**
 * I nomi raggruppati per classe: l'ordine con cui si legge un registro. Con
 * molte persone si disegnano solo quelle in vista (`components/virtualList.ts`):
 * la testata della classe della prima resta, appiccicata in cima, e al posto
 * delle altre c'è un vuoto della loro misura. La ricerca lavora sui dati
 * (`filtrate`), non su quel che è disegnato.
 */
function gruppiDiClasse (voci: Voce[], sceltoId: string | null): Figlio {
  if (voci.length === 0) {
    return quieto(testi().nessunaCorrispondenza)
  }
  const posti = inFila(voci)
  const f = finestra({
    chiave: ELENCO,
    conto: posti.length,
    stima: (indice) => 'gruppo' in posti[indice] ? ALTEZZA_TESTATA : ALTEZZA_VOCE,
    chiaveDi: (indice) => {
      const posto = posti[indice]
      // testo-fisso: chiave di gruppo
      return 'gruppo' in posto ? `classe:${posto.gruppo[0].classe.id}` : posto.voce.allievo.id
    },
    // La testata della classe di ogni persona disegnata: quella della prima in
    // vista resta appiccicata in cima.
    sempre: (indici) => indici.flatMap((indice) => {
      const posto = posti[indice]
      return 'gruppo' in posto ? [] : [posto.testata]
    }),
  })

  if (!f.attiva) {
    return posti.flatMap((posto) => 'gruppo' in posto
      ? [h(
          'div',
          null,
          testataDiClasse(posto.gruppo, posto.aperta),
          posto.aperta
            ? h(
                'ul',
                { class: 'elenco-laterale__voci' },
                ...posto.gruppo.map((voce) => vocePersona(voce, voce.allievo.id === sceltoId)),
              )
            : null,
        )]
      : [])
  }

  // Una classe per volta: la testata, poi le sue persone in vista, con un vuoto
  // dentro l'elenco al posto di quelle saltate. Fra due classi il vuoto sta fuori.
  const vuoto = (tag: 'div' | 'li', px: number, segno?: Record<string, string>) =>
    h(tag, {
      class: 'elenco-laterale__vuoto',
      style: stileVuoto(px, false),
      dataset: segno,
      attr: { 'aria-hidden': 'true' },
    })
  const fuori: HTMLElement[] = []
  let testata: HTMLElement | null = null
  let dentro: HTMLElement[] = []
  let saltato = 0
  const chiudi = () => {
    if (!testata) return
    fuori.push(h(
      'div',
      null,
      testata,
      dentro.length > 0
        ? h('ul', { class: 'elenco-laterale__voci elenco-laterale__voci--finestra' }, ...dentro)
        : null,
    ))
    testata = null
    dentro = []
  }
  for (const [n, pezzo] of f.pezzi.entries()) {
    if (pezzo.indice === undefined) {
      if (n === 0) fuori.push(vuoto('div', pezzo.vuoto, f.inizio))
      else saltato += pezzo.vuoto
      continue
    }
    const posto = posti[pezzo.indice]
    if ('gruppo' in posto) {
      chiudi()
      if (saltato > 0) fuori.push(vuoto('div', saltato))
      saltato = 0
      testata = testataDiClasse(posto.gruppo, posto.aperta, f.misurata(pezzo.indice))
      continue
    }
    if (saltato > 0) dentro.push(vuoto('li', saltato))
    saltato = 0
    const riga = vocePersona(posto.voce, posto.voce.allievo.id === sceltoId)
    Object.assign(riga.dataset, f.misurata(pezzo.indice))
    riga.setAttribute('aria-setsize', String(posto.di))
    riga.setAttribute('aria-posinset', String(posto.posto))
    dentro.push(riga)
  }
  chiudi()
  if (saltato > 0) fuori.push(vuoto('div', saltato))
  return fuori
}

/**
 * L'elenco laterale, con la casella che lo restringe. Un `input` scritto a mano
 * e non un `campo` (che reagisce a `change`): si filtra a ogni lettera e si rifà
 * solo l'isola dell'elenco.
 */
function elencoPersone (voci: Voce[], sceltoId: string | null): HTMLElement {
  const conto = h('span', { class: 'testo-quieto elenco-laterale__conto' }, String(filtrate(voci).length))
  const corpo = isolaVirtuale(ELENCO, () => gruppiDiClasse(filtrate(voci), sceltoId), { class: 'elenco-persone' })
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
      const campo = evento.currentTarget as HTMLInputElement
      cercato = campo.value
      rifaiElenco(ELENCO)
      // Il conto vivo: dopo un ridisegno `conto` può essere il nodo scartato.
      const vivo = campo.closest('.elenco-laterale')?.querySelector('.elenco-laterale__conto')
      if (vivo) vivo.textContent = String(filtrate(voci).length)
    },
  })

  return h(
    'div',
    {
      class: 'elenco-laterale',
      // Lo scorrimento resta dov'era quando si sceglie un nome e la vista si rifà;
      // di telaio, la stessa scatola: la rotella in corsa non si perde.
      dataset: { scorrimento: 'elenco-persone', telaio: 'elenco-persone' },
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
    // Anelli della catena di telaio fino all'elenco che scorre (`dom.ts`).
    { class: 'vista vista--persone', dataset: { telaio: 'persone' } },
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
              al: () => {
                vai(
                  { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: scelta.allievo.id } },
                  { contesto: { classeId: scelta.classe.id } },
                )
              },
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
      { class: 'colonne colonne--elenco', dataset: { telaio: 'persone-colonne' } },
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
                    al: () => { vai({ pagina: 'pagina.classi' }) },
                  })
                : undefined,
          }),
    ),
  )
}
