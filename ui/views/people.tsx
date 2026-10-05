// Le persone in formazione dell'anno, tutte insieme, con la scheda accanto.
// L'elenco attraversa le classi e si filtra per nome, azienda o paese. La
// scheda è quella di `views/student.tsx` (`schedaAllievo`).
//
// La ricerca non passa dallo stato: `aggiorna` rifarebbe anche la scheda, con
// il ritratto e la mappa viva, a ogni lettera. Sta in una variabile del modulo
// e a ogni lettera si rifà solo l'elenco; alla chiusura del pannello si perde.

import { useReducer, type ReactElement, type ReactNode } from 'react'

import { nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import type { Allievo, Classe } from '#core/dominio/models.js'
import { telefoniDi } from '#core/dominio/phones.js'
import { corrispondeAlla, pezziDiRicerca } from '#core/dominio/text.js'
import { classi } from '#ui/classNames.js'
import { Avatar } from '#ui/components/avatar.js'
import { Pastiglia, Pulsante, Quieto, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { rifaiElenco, useFinestra, Vuoto, type DatiVoce } from '#ui/components/virtualList.js'
import { Input } from '#ui/fields.js'
import { moduloAllievo, moduloAnno } from '#ui/forms.js'
import { annoCorrente, classiVisibili, ricorda, stato, vai } from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
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

/** Gli attributi in più di una riga disegnata nella finestra. */
type AttributiRiga = Partial<DatiVoce> & { 'aria-setsize'?: number, 'aria-posinset'?: number }

/**
 * La riga di una persona: il nome sopra, classe e azienda sotto, per
 * distinguere nomi simili.
 */
function vocePersona (voce: Voce, scelta: boolean, attributi: AttributiRiga = {}): ReactElement {
  const { allievo, classe } = voce
  return (
    <li key={allievo.id} {...attributi}>
      <button
        className={classi(
          'voce-laterale',
          scelta && 'voce-laterale--attiva',
          // Chi si è ritirato resta nell'elenco, spento: la scheda si guarda ancora.
          !allievo.attivo && 'voce-laterale--spenta',
        )}
        type="button"
        // Il fuoco torna qui dopo un ridisegno: scorrendo con Tab la finestra
        // rifà l'elenco sotto il cursore (`components/virtualList.tsx`).
        // testo-fisso: chiave del fuoco, non si legge
        data-fuoco={`persona-${allievo.id}`}
        // La pagina resta Persone: la scheda accanto è quella dell'allievo del contesto.
        onClick={() => {
          vai({ pagina: 'pagina.persone' }, { contesto: { classeId: classe.id, allievoId: allievo.id } })
        }}
      >
        <Avatar persona={allievo} />
        <span className="voce-laterale__testo">
          <strong>{nomeCompleto(allievo)}</strong>
          <small>{[classe.nome, allievo.azienda].filter(Boolean).join(' · ')}</small>
        </span>
      </button>
    </li>
  )
}

/** La chiave della finestra sull'elenco (`components/virtualList.tsx`). */
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
function testataDiClasse (fila: Voce[], aperta: boolean, dati?: DatiVoce): ReactElement {
  const classe = fila[0].classe
  return (
    <button
      className="elenco-laterale__gruppo gruppo-classe"
      type="button"
      {...dati}
      aria-expanded={aperta}
      onClick={() => {
        inverti(classe.id)
        rifaiElenco(ELENCO)
      }}
    >
      <Icona nome={aperta ? 'giu' : 'destra'} classe="gruppo-classe__freccia" />
      <span>{classe.nome}</span>
      <span className="testo-quieto">{String(fila.length)}</span>
    </button>
  )
}

/**
 * I nomi raggruppati per classe: l'ordine con cui si legge un registro. Con
 * molte persone si disegnano solo quelle in vista (`components/virtualList.tsx`):
 * la testata della classe della prima resta, appiccicata in cima, e al posto
 * delle altre c'è un vuoto della loro misura. La ricerca lavora sui dati
 * (`filtrate`), non su quel che è disegnato. Lo scorrimento rifà questo
 * componente solo, come prima l'isola dell'elenco.
 */
function GruppiDiClasse ({ voci, sceltoId }: { voci: Voce[], sceltoId: string | null }): ReactElement {
  const posti = inFila(voci)
  const f = useFinestra({
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

  let contenuto: ReactNode
  if (voci.length === 0) {
    contenuto = <Quieto>{testi().nessunaCorrispondenza}</Quieto>
  } else if (!f.attiva) {
    contenuto = posti.map((posto) => 'gruppo' in posto
      ? (
          <div key={posto.gruppo[0].classe.id}>
            {testataDiClasse(posto.gruppo, posto.aperta)}
            {posto.aperta
              ? (
                  <ul className="elenco-laterale__voci">
                    {posto.gruppo.map((voce) => vocePersona(voce, voce.allievo.id === sceltoId))}
                  </ul>
                )
              : null}
          </div>
        )
      : null)
  } else {
    // Una classe per volta: la testata, poi le sue persone in vista, con un vuoto
    // dentro l'elenco al posto di quelle saltate. Fra due classi il vuoto sta fuori.
    const fuori: ReactElement[] = []
    let testata: { classeId: string, nodo: ReactElement } | null = null
    let dentro: ReactElement[] = []
    let saltato = 0
    const chiudi = (): void => {
      if (!testata) return
      fuori.push(
        <div key={testata.classeId}>
          {testata.nodo}
          {dentro.length > 0
            ? <ul className="elenco-laterale__voci elenco-laterale__voci--finestra">{dentro}</ul>
            : null}
        </div>,
      )
      testata = null
      dentro = []
    }
    for (const [n, pezzo] of f.pezzi.entries()) {
      if (pezzo.indice === undefined) {
        // testo-fisso: chiave di React
        if (n === 0) fuori.push(<Vuoto key="vuoto:inizio" come="div" misura={pezzo.vuoto} classe="elenco-laterale__vuoto" {...f.inizio} />)
        else saltato += pezzo.vuoto
        continue
      }
      const posto = posti[pezzo.indice]
      if ('gruppo' in posto) {
        chiudi()
        const classeId = posto.gruppo[0].classe.id
        // testo-fisso: chiave di React
        if (saltato > 0) fuori.push(<Vuoto key={`vuoto:${classeId}`} come="div" misura={saltato} classe="elenco-laterale__vuoto" />)
        saltato = 0
        testata = { classeId, nodo: testataDiClasse(posto.gruppo, posto.aperta, f.misurata(pezzo.indice)) }
        continue
      }
      const allievoId = posto.voce.allievo.id
      // testo-fisso: chiave di React
      if (saltato > 0) dentro.push(<Vuoto key={`vuoto:${allievoId}`} come="li" misura={saltato} classe="elenco-laterale__vuoto" />)
      saltato = 0
      dentro.push(vocePersona(posto.voce, allievoId === sceltoId, {
        ...f.misurata(pezzo.indice),
        'aria-setsize': posto.di,
        'aria-posinset': posto.posto,
      }))
    }
    chiudi()
    // testo-fisso: chiave di React
    if (saltato > 0) fuori.push(<Vuoto key="vuoto:fine" come="div" misura={saltato} classe="elenco-laterale__vuoto" />)
    contenuto = fuori
  }

  return (
    // testo-fisso: chiave dell'isola, la stessa di prima
    <div ref={f.radice} className="elenco-persone" data-isola={`virtuale:${ELENCO}`}>
      {contenuto}
    </div>
  )
}

/**
 * L'elenco laterale, con la casella che lo restringe. Un `input` che ascolta
 * `input` e non un `campo` (che reagisce a `change`): si filtra a ogni lettera
 * e si rifà solo l'elenco, col suo conto.
 */
function ElencoPersone ({ voci, sceltoId }: { voci: Voce[], sceltoId: string | null }): ReactElement {
  const [, rifai] = useReducer((volte: number) => volte + 1, 0)
  const t = testi()
  const trovate = filtrate(voci)

  return (
    <div
      className="elenco-laterale"
      // Lo scorrimento resta dov'era quando si sceglie un nome e la vista si rifà;
      // di telaio, la stessa scatola: la rotella in corsa non si perde.
      data-scorrimento="elenco-persone"
      data-telaio="elenco-persone"
    >
      {/* Niente titolo: «Persone in formazione» lo dicono già il pulsante del
          menu e la testata della pagina. La casella e quante ne mostra, in riga. */}
      <header className="elenco-laterale__testata">
        <Input
          // Senza `campo--ricerca`: lo stacco sotto lo dà già l'elenco.
          className="campo__controllo"
          type="search"
          valore={cercato}
          // Corto, che non si tronca nella colonna; dove cerca lo dice il `title`.
          placeholder={t.segnaposto}
          title={t.cercaPer}
          aria-label={t.cercaFra}
          autoComplete="off"
          // `data-fuoco` rimette il cursore qui dopo un ridisegno vero (dati dall'host).
          data-fuoco="ricerca-persone"
          onInput={(evento) => {
            cercato = evento.currentTarget.value
            rifai()
          }}
        />
        <span className="testo-quieto elenco-laterale__conto">
          {String(trovate.length)}
        </span>
      </header>
      <GruppiDiClasse voci={trovate} sceltoId={sceltoId} />
    </div>
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

export function vistaPersone (): ReactElement {
  return <VistaPersone />
}

function VistaPersone (): ReactElement {
  if (!annoCorrente()) {
    return <StatoVuotoAnno telaio={telaioVista()} simbolo="utente" crea={() => moduloAnno()} />
  }

  const elenco = tutte()
  // La persona scelta si cerca fra tutte: se la ricerca la esclude, la scheda
  // resta aperta.
  const scelta = elenco.find((voce) => voce.allievo.id === stato.allievoId) ?? null
  const t = testi()

  return (
    // Anelli della catena di telaio fino all'elenco che scorre.
    <div className="vista vista--persone" data-telaio="persone">
      <TestataVista
        titolo={Molti(lessico().pif)}
        sottotitolo={elenco.length === 0 ? t.nessunaPerOra : riassunto(elenco)}
        azioni={scelta
          ? (
              <>
                <Pulsante
                  testo={t.aTuttaPagina}
                  simbolo="utente"
                  variante="sottile"
                  titolo={t.senzaElenco(nomeCompleto(scelta.allievo))}
                  al={() => {
                    vai(
                      { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: scelta.allievo.id } },
                      { contesto: { classeId: scelta.classe.id } },
                    )
                  }}
                />
                <Pulsante
                  testo={parole().modifica}
                  simbolo="matita"
                  al={() => moduloAllievo(scelta.classe, scelta.allievo)}
                />
              </>
            )
          : null}
      />
      <div className="colonne colonne--elenco" data-telaio="persone-colonne">
        <ElencoPersone voci={elenco} sceltoId={scelta?.allievo.id ?? null} />
        {scelta
          ? (
              <div className="colonna">
                {/* Il nome sopra la scheda: dice di chi sono i pannelli che seguono. */}
                <header className="persone__intestazione">
                  <h2>{nomeCompleto(scelta.allievo)}</h2>
                  <span className="testo-quieto">{scelta.classe.nome}</span>
                  {scelta.allievo.attivo ? null : <Pastiglia testo={t.nonFrequenta} tono="quiete" />}
                </header>
                {schedaAllievo(scelta.classe, scelta.allievo)}
              </div>
            )
          : (
              <StatoVuoto
                simbolo="utente"
                titolo={elenco.length === 0 ? t.nessuna : t.scegli}
                testo={elenco.length === 0 ? t.comeSiAggiungono : t.comeSiApre}
                azione={elenco.length === 0
                  ? (
                      <Pulsante
                        testo={t.vaiAlleClassi}
                        variante="primario"
                        simbolo="classi"
                        al={() => { vai({ pagina: 'pagina.classi' }) }}
                      />
                    )
                  : undefined}
              />
            )}
      </div>
    </div>
  )
}
