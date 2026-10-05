// Il calendario scolastico ufficiale nei moduli dell'anno: che cosa manca, che
// cosa è diverso, che cosa importare. Si confronta con quel che il modulo ha
// davanti (date scritte, pause dell'editor), non con l'anno salvato. Il
// confronto sta in `domain/schoolCalendar.ts`; qui solo il disegno.
//
// Un anno che segue il calendario (ADR-51) non importa voce per voce: si
// riallinea, si stacca, o — scritto a mano — si collega. Sono gesti sull'anno
// salvato (`anno.calendario`), non aspettano «Salva».

import { useRef, type ReactElement } from 'react'

import {
  anniDaProporre,
  annoUfficiale,
  applicaVoci,
  bozzaSincronizzata,
  calendarioDi,
  marcatoreDi,
  vociDaImportare,
  vociUfficiali,
  type AnnoUfficiale,
  type BozzaAnno,
  type VoceUfficiale,
} from '#core/dominio/schoolCalendar.js'
import type { AnnoScolastico, CalendarioDellAnno } from '#core/dominio/models.js'
import { formattaData, oggi } from '#core/dominio/dates.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { CALENDARIO_TICINO } from '#core/dominio/schoolCalendarTicino.js'
import { Pastiglia, Pulsante, Quieto, Tendina } from '#ui/components/base.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { conferma } from '#ui/components/modal.js'
import { Input } from '#ui/fields.js'

import { testi } from './schoolCalendar.testi.js'

export interface OpzioniCalendarioUfficiale {
  /** L'anno com'è adesso nel modulo. */
  leggi: () => BozzaAnno
  /** L'anno con le voci scelte: il modulo lo riscrive nei suoi campi. */
  applica: (nuovo: BozzaAnno) => void
  /** Solo le chiusure: dove inizio e fine non si toccano (il modulo delle pause). */
  soloPause?: boolean
  /**
   * L'anno salvato, com'è adesso: collegarlo, riallinearlo e staccarlo sono
   * gesti suoi. Assente per un anno che nasce.
   */
  anno?: () => AnnoScolastico | null
  /** Dopo uno di quei gesti: il modulo ha l'anno di prima, e si chiude. */
  fatto?: () => void
  /** Per un anno che nasce: il calendario che seguirà, se ne è stato scelto uno. */
  seguira?: () => CalendarioDellAnno | null
}

/** Le date di una voce, lette. */
function quando (dal: string, al: string): string {
  return dal === al ? formattaData(dal, 'lungo') : `${formattaData(dal)} → ${formattaData(al)}`
}

/** Che cosa succede a una voce se la si importa. */
function statoVoce (voce: VoceUfficiale): ReactElement {
  const t = testi()
  if (voce.stato === 'mancante') return <Pastiglia testo={t.daAggiungere} tono="informativo" />
  if (voce.stato === 'da-collegare') {
    return <Pastiglia testo={t.giaCe(voce.attuale?.etichetta ?? '')} tono="neutro" />
  }
  const ora = voce.attuale ? quando(voce.attuale.dal, voce.attuale.al) : ''
  return <Pastiglia testo={t.ora(ora)} tono="attenzione" />
}

/** «Ticino 2026/2027»: il calendario che un anno segue, per le pastiglie. */
function fonteCalendario (marcatore: CalendarioDellAnno): string {
  const nome = calendarioDi(marcatore)?.cantoneNome ?? marcatore.cantone
  return testi().fonte(nome, marcatore.annoScolastico)
}

/** La pastiglia «Dal calendario ufficiale · Ticino 2026/2027», se l'anno lo segue. */
export function pastigliaCalendario (
  anno: Pick<AnnoScolastico, 'calendarioUfficiale'>,
): ReactElement | null {
  const marcatore = anno.calendarioUfficiale
  if (!marcatore) return null
  return (
    <Pastiglia
      testo={testi().dalCalendarioUfficiale(fonteCalendario(marcatore))}
      tono="informativo"
      simbolo="calendario"
    />
  )
}

/** La pastiglia di una chiusura che viene dal calendario che l'anno segue. */
export function pastigliaChiusuraUfficiale (): ReactElement {
  return <Pastiglia testo={testi().chiusuraUfficiale} tono="informativo" simbolo="calendario" />
}

/**
 * Quante voci un anno che segue il calendario ha diverse dal calendario di
 * questa versione del registro: date, chiusure che mancano o sono cambiate,
 * chiusure che il calendario non ha più.
 */
export function vociDaRiallineare (anno: AnnoScolastico): number {
  const marcatore = anno.calendarioUfficiale
  const calendario = marcatore ? calendarioDi(marcatore) : null
  const ufficiale = calendario?.anni.find((a) => a.annoScolastico === marcatore?.annoScolastico)
  if (!calendario || !ufficiale) return 0
  const giusto = bozzaSincronizzata(calendario, ufficiale, anno)
  const chiave = (s: { id: string, etichetta: string, dal: string, al: string }) =>
    `${s.id}|${s.etichetta}|${s.dal}|${s.al}`
  const ora = new Set(anno.sospensioni.map(chiave))
  const dopo = new Set(giusto.sospensioni.map(chiave))
  return (anno.inizio !== giusto.inizio ? 1 : 0) +
    (anno.fine !== giusto.fine ? 1 : 0) +
    [...dopo].filter((c) => !ora.has(c)).length +
    [...ora].filter((c) => !dopo.has(c)).length
}

/**
 * Collega l'anno salvato al calendario ufficiale del suo anno scolastico,
 * dopo averlo chiesto: dice quali chiusure scritte a mano diventano bloccate.
 * Vero se è fatto.
 */
export async function collegaAlCalendario (anno: AnnoScolastico): Promise<boolean> {
  const t = testi()
  const ufficiale = annoUfficiale(CALENDARIO_TICINO, anno.inizio)
  if (!ufficiale) return false
  const confronto = vociUfficiali(CALENDARIO_TICINO, anno)
  // Le chiusure scritte a mano che il calendario riconosce: da qui in poi sue.
  const riconosciute = (confronto?.voci ?? []).filter(
    (voce) => voce.genere === 'pausa' && voce.attuale && voce.stato !== 'allineata',
  ).length
  const sicuro = await conferma({
    titolo: t.collegaTitolo(fonteCalendario(marcatoreDi(CALENDARIO_TICINO, ufficiale))),
    testo: t.collegaTesto(riconosciute),
    testoConferma: t.collega,
  })
  if (!sicuro) return false
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: true })
  return risposta.ok
}

/** Riporta l'anno che segue il calendario ai valori di questa versione. */
export async function riallineaAlCalendario (anno: AnnoScolastico): Promise<boolean> {
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: true })
  return risposta.ok
}

/** Stacca l'anno dal calendario, dopo averlo chiesto: date e chiusure restano. */
async function staccaDalCalendario (anno: AnnoScolastico): Promise<boolean> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.staccaTitolo,
    testo: t.staccaTesto,
    testoConferma: t.stacca,
    pericolo: true,
  })
  if (!sicuro) return false
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: false })
  return risposta.ok
}

/**
 * La sezione: una casella per voce da importare, tutte accese, e il pulsante.
 * Si rifà a ogni disegno di chi la contiene, che la ridisegna quando cambia una
 * data del modulo. Per un anno che segue il calendario, al posto delle caselle
 * lo stato e i due gesti.
 */
export function SezioneCalendarioUfficiale (opzioni: OpzioniCalendarioUfficiale): ReactElement {
  return (
    <div className="calendario-ufficiale">
      <div className="calendario-ufficiale__corpo">
        <CorpoCalendarioUfficiale opzioni={opzioni} />
      </div>
    </div>
  )
}

function CorpoCalendarioUfficiale ({ opzioni }: { opzioni: OpzioniCalendarioUfficiale }): ReactElement {
  const t = testi()
  /** Le caselle delle voci, per chiave: si leggono al clic su «Importa». */
  const caselle = useRef(new Map<string, HTMLInputElement>())

  /** Un gesto sull'anno salvato: se riesce il modulo si chiude. */
  const gesto = (fa: (anno: AnnoScolastico) => Promise<boolean>) => async () => {
    const anno = opzioni.anno?.()
    if (!anno) return
    if (await fa(anno)) opzioni.fatto?.()
  }

  const salvato = opzioni.anno?.() ?? null

  // L'anno segue il calendario: niente da scegliere, solo come sta.
  if (salvato?.calendarioUfficiale) {
    const diverse = vociDaRiallineare(salvato)
    return (
      <>
        <Quieto>{t.segue(fonteCalendario(salvato.calendarioUfficiale))}</Quieto>
        {diverse > 0 ? <Quieto>{t.daRiallineare(diverse)}</Quieto> : null}
        <div className="calendario-ufficiale__piede">
          {diverse > 0
            ? (
                <Pulsante
                  testo={t.riallinea}
                  simbolo="ricarica"
                  variante="sottile"
                  al={gesto(riallineaAlCalendario)}
                />
              )
            : null}
          <Pulsante testo={t.stacca} variante="fantasma" al={gesto(staccaDalCalendario)} />
        </div>
      </>
    )
  }
  const seguira = opzioni.seguira?.() ?? null
  if (seguira) return <Quieto>{t.seguira(fonteCalendario(seguira))}</Quieto>

  const bozza = opzioni.leggi()
  const confronto = vociUfficiali(CALENDARIO_TICINO, bozza)
  const nome = t.nome(CALENDARIO_TICINO.cantoneNome)
  if (!confronto) return <Quieto>{t.nonCeAncora(nome, formattaData(bozza.inizio))}</Quieto>

  const tutte = confronto.voci.filter((voce) => !opzioni.soloPause || voce.genere === 'pausa')
  const daFare = vociDaImportare(tutte)
  const allineate = tutte.length - daFare.length
  const fonte = `${nome} ${confronto.anno.annoScolastico}`
  // Un anno scritto a mano che il calendario conosce si può collegare.
  const collega = salvato && annoUfficiale(CALENDARIO_TICINO, salvato.inizio)
    ? (
        <div className="calendario-ufficiale__piede">
          <Quieto>{t.collegaAiuto}</Quieto>
          <Pulsante
            testo={t.collega}
            simbolo="collegamento"
            variante="sottile"
            al={gesto(collegaAlCalendario)}
          />
        </div>
      )
    : null

  if (daFare.length === 0) {
    return (
      <>
        <Quieto>{t.allineato(fonte, allineate)}</Quieto>
        {collega}
      </>
    )
  }

  return (
    <>
      <Quieto>{t.daFare(fonte, daFare.length, allineate)}</Quieto>
      {/* Un elenco di voci nuovo riparte con tutte le caselle accese. */}
      <ul className="calendario-ufficiale__elenco" key={daFare.map((voce) => voce.chiave).join('|')}>
        {daFare.map((voce) => (
          <li key={voce.chiave} className="calendario-ufficiale__voce">
            <label className="calendario-ufficiale__scelta">
              <Input
                type="checkbox"
                spuntato
                ref={(nodo) => {
                  if (nodo) caselle.current.set(voce.chiave, nodo)
                  else caselle.current.delete(voce.chiave)
                }}
              />
              <strong>{voce.etichetta}</strong>
              <span className="testo-quieto">{quando(voce.dal, voce.al)}</span>
            </label>
            {statoVoce(voce)}
          </li>
        ))}
      </ul>
      <div className="calendario-ufficiale__piede">
        <Pulsante
          testo={t.importa}
          simbolo="calendario"
          variante="sottile"
          al={() => {
            const scelte = daFare
              .filter((voce) => caselle.current.get(voce.chiave)?.checked)
              .map((voce) => voce.chiave)
            if (scelte.length === 0) return
            opzioni.applica(applicaVoci(CALENDARIO_TICINO, bozza, scelte))
          }}
        />
      </div>
      {collega}
    </>
  )
}

/** Gli anni da proporre per un anno nuovo: quello in corso e i successivi. */
export function anniUfficialiDaProporre (): AnnoUfficiale[] {
  return anniDaProporre(CALENDARIO_TICINO, oggi())
}

/**
 * L'anno che nasce da un anno del calendario: date, tutte le chiusure con i
 * nomi ufficiali, e il calendario che seguirà.
 */
export function bozzaUfficiale (
  anno: AnnoUfficiale,
  bozza: BozzaAnno,
): BozzaAnno & { calendarioUfficiale: CalendarioDellAnno } {
  return {
    ...bozzaSincronizzata(CALENDARIO_TICINO, anno, bozza),
    calendarioUfficiale: marcatoreDi(CALENDARIO_TICINO, anno),
  }
}

/**
 * La tendina «Anno scolastico» in cima a un anno nuovo: gli anni del
 * calendario e «date scritte a mano». Sceglierne uno porta date, vacanze e
 * festivi in un gesto, e l'anno nascerà collegato; «date scritte a mano»
 * lascia tutto libero. Il valore è il calendario che l'anno seguirà.
 */
export function SceltaAnnoUfficiale (opzioni: {
  leggi: () => BozzaAnno
  applica: (nuovo: ReturnType<typeof bozzaUfficiale>) => void
  /** L'anno seguirà questo calendario, o `null` se le date sono scritte a mano. */
  seguira: () => CalendarioDellAnno | null
  /** Scelto «date scritte a mano». */
  aMano: () => void
}): ReactElement {
  const t = testi()
  const anni = anniUfficialiDaProporre()
  const annoScolastico = Uno(lessico().annoScolastico)
  const attuale = opzioni.seguira()?.annoScolastico ?? ''
  return (
    <div className="calendario-ufficiale__scelta-anno">
      {anni.length === 0
        ? null
        : (
            <>
              <label className="calendario-ufficiale__anno">
                <strong>{annoScolastico}</strong>
                <Tendina
                  voci={[
                    ...anni.map((anno) => ({ valore: anno.annoScolastico, testo: anno.annoScolastico })),
                    { valore: '', testo: t.aMano },
                  ]}
                  valore={anni.some((anno) => anno.annoScolastico === attuale) ? attuale : ''}
                  etichetta={annoScolastico}
                  al={(valore) => {
                    const anno = anni.find((a) => a.annoScolastico === valore)
                    if (!anno) {
                      opzioni.aMano()
                      return
                    }
                    opzioni.applica(bozzaUfficiale(anno, opzioni.leggi()))
                  }}
                />
              </label>
              <Quieto>{t.dalCalendario(CALENDARIO_TICINO.cantoneNome)}</Quieto>
            </>
          )}
    </div>
  )
}

/** Quante voci del calendario l'anno non ha: per un avviso fuori dai moduli. */
export function vociUfficialiDaImportare (bozza: BozzaAnno): number {
  const confronto = vociUfficiali(CALENDARIO_TICINO, bozza)
  return confronto ? vociDaImportare(confronto.voci).length : 0
}
