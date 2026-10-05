// Le aree e le sezioni in cui stanno le impostazioni del programma, con i loro
// nomi: un elenco solo per il pannello (`ui/views/settings/sections.ts`,
// che ci aggiunge le sezioni dell'anno e le parole di ricerca) e per la finestra
// nativa, che senza documento aperto è l'unica superficie e deve dire le cose
// come le dice lui. Senza DOM.

import type { VoceProgramma } from '#contract/protocol.js'
import { testi } from './areas.testi.js'

/** Le quattro aree, nell'ordine delle schede del pannello. */
export const AREE = ['calendario', 'didattica', 'utente', 'programma'] as const
export type Area = (typeof AREE)[number]

/** Le aree che stanno dentro il file dell'anno: senza anno aperto non si regolano. */
export const AREE_DELL_ANNO: readonly Area[] = ['calendario', 'didattica']

/**
 * Le sezioni che disegnano chiavi del manifesto. `condotto` è la sezione
 * «Avanzate» del Programma: l'id resta quello degli indirizzi già scritti
 * (`programma#condotto`).
 */
export type SezioneDiProgramma = 'posta' | 'aspetto' | 'avvio' | 'modelli' | 'aggiornamenti' | 'condotto'

export interface Divisione {
  id: SezioneDiProgramma
  area: Area
  /**
   * Le chiavi che prende: un prefisso prende la chiave esatta e quelle puntate
   * sotto. Una chiave sotto due prefissi va al più lungo: così una chiave sola
   * (`avvio.integrazioneSistema`) si sposta senza spostare il suo gruppo.
   */
  prefissi: readonly string[]
  /** La rete: prende anche quel che nessun'altra sezione nomina. */
  raccoglie?: boolean
  /** Quel che va letto prima di toccare queste voci (il condotto apre i dati ad altri). */
  avvertenza?: boolean
}

/** Le sezioni con chiavi, nell'ordine in cui scorrono dentro la loro area. */
export const DIVISIONI: readonly Divisione[] = [
  // Posta di classe e contatti con una persona sola stanno insieme, divisi dai
  // titoli di gruppo.
  { id: 'posta', area: 'utente', prefissi: ['registroDocenti.posta', 'registroDocenti.recapiti', 'registroDocenti.supplenza'] },
  // È anche la rete: una chiave di un gruppo non previsto finisce qui e si può
  // regolare subito.
  { id: 'aspetto', area: 'programma', prefissi: ['registroDocenti.aspetto'], raccoglie: true },
  {
    id: 'avvio',
    area: 'programma',
    // Avvio, icona, promemoria e proiezione insieme: si regolano una volta.
    prefissi: [
      'registroDocenti.avvio',
      'registroDocenti.vassoio',
      'registroDocenti.promemoria',
      'registroDocenti.proiezione',
    ],
  },
  {
    id: 'modelli',
    area: 'programma',
    prefissi: [
      'registroDocenti.modelli',
      'registroDocenti.ocr',
      'registroDocenti.assistente',
      'registroDocenti.dettatura',
    ],
  },
  { id: 'aggiornamenti', area: 'programma', prefissi: ['registroDocenti.aggiornamenti'] },
  {
    id: 'condotto',
    area: 'programma',
    // Quel che tocca il sistema o apre il registro ad altri programmi: si
    // regola di rado, e mai fra gli avanzi.
    prefissi: ['registroDocenti.avvio.integrazioneSistema', 'registroDocenti.api'],
    avvertenza: true,
  },
]

/** Se una chiave appartiene a un elenco di prefissi: esatta, o puntata sotto. */
export function sottoPrefisso (chiave: string, prefissi: readonly string[]): boolean {
  return prefissi.some((prefisso) => chiave === prefisso || chiave.startsWith(`${prefisso}.`))
}

/** Quanto è lungo il prefisso con cui una divisione prende una chiave; 0 se non la prende. */
function presa (chiave: string, divisione: Divisione): number {
  return Math.max(0, ...divisione.prefissi
    .filter((prefisso) => sottoPrefisso(chiave, [prefisso]))
    .map((prefisso) => prefisso.length))
}

/**
 * La divisione di una chiave: quella col prefisso più lungo che la prende, o
 * la rete se nessuna la nomina.
 */
export function divisioneDi (chiave: string): Divisione {
  let scelta: Divisione | undefined
  let lunga = 0
  for (const divisione of DIVISIONI) {
    const quanto = presa(chiave, divisione)
    if (quanto > lunga) {
      scelta = divisione
      lunga = quanto
    }
  }
  return scelta ?? DIVISIONI.find((divisione) => divisione.raccoglie) ?? DIVISIONI[0]
}

/**
 * Il gruppo di una chiave: `registroDocenti.posta.mittente` →
 * `registroDocenti.posta`. Una chiave nominata da sola in una divisione fa
 * gruppo da sé: non si porta dietro il titolo del gruppo da cui viene.
 */
export function gruppoDi (chiave: string): string {
  if (DIVISIONI.some((divisione) => divisione.prefissi.includes(chiave))) return chiave
  const pezzi = chiave.split('.')
  return pezzi.length > 2 ? pezzi.slice(0, -1).join('.') : chiave
}

/** Un gruppo di voci con il titolo, se ne ha uno che aggiunge qualcosa al nome della voce. */
export interface Gruppo {
  titolo: string | null
  voci: VoceProgramma[]
}

/** Una sezione pronta da disegnare. */
export interface Sezione {
  id: SezioneDiProgramma
  titolo: string
  sottotitolo: string
  avvertenza: string | null
  gruppi: Gruppo[]
  /** Le voci rare, in fondo, in un gruppo che si apre. */
  avanzate: VoceProgramma[]
}

/** Il nome di un'area. */
export function titoloArea (area: Area): string {
  return testi().aree[area]
}

/** Il nome e il riassunto di una sezione con chiavi. */
export function nomeSezione (id: SezioneDiProgramma): { titolo: string, sottotitolo: string } {
  return testi().sezioni[id]
}

/** Il titolo di un gruppo di chiavi, quando il nome della voce non basta (molte si chiamano «Attivo»). */
export function titoloGruppo (prefisso: string): string | undefined {
  return testi().titoliGruppi[prefisso]
}

/** Quel che si legge prima di accendere il condotto, con i `**` del grassetto. */
export function avvertenzaCondotto (): string {
  return testi().avvertenzaCondotto
}

/** Che cosa si legge al posto di un'area che vive dentro il file dell'anno. */
export function senzaAnno (): string {
  return testi().apriUnAnno
}

/** Le voci comuni divise per gruppo, nell'ordine di arrivo; il titolo solo quando serve. */
function raggruppa (voci: readonly VoceProgramma[]): Gruppo[] {
  const gruppi: Array<Gruppo & { prefisso: string }> = []
  for (const voce of voci) {
    const prefisso = gruppoDi(voce.chiave)
    const gia = gruppi.find((gruppo) => gruppo.prefisso === prefisso)
    if (gia) gia.voci.push(voce)
    else gruppi.push({ prefisso, titolo: titoloGruppo(prefisso) ?? null, voci: [voce] })
  }
  // Un titolo uguale al nome della prima voce non aggiunge niente: quella
  // voce, l'interruttore del gruppo, fa già da titolo alle altre.
  return gruppi.map(({ titolo, voci: sue }) => ({
    titolo: titolo === sue[0]?.etichetta ? null : titolo,
    voci: sue,
  }))
}

/**
 * Le sezioni di un'area con le loro voci, nell'ordine del manifesto. Chi
 * raccoglie prende anche quel che nessun'altra nomina, così una chiave nuova
 * si vede comunque. Le sezioni senza voci non ci sono.
 */
export function sezioniDellArea (area: Area, voci: readonly VoceProgramma[]): Sezione[] {
  return DIVISIONI
    .filter((divisione) => divisione.area === area)
    .map((divisione): Sezione => {
      const sue = voci.filter((voce) => divisioneDi(voce.chiave).id === divisione.id)
      return {
        id: divisione.id,
        ...nomeSezione(divisione.id),
        avvertenza: divisione.avvertenza ? avvertenzaCondotto() : null,
        gruppi: raggruppa(sue.filter((voce) => !voce.avanzata)),
        avanzate: sue.filter((voce) => voce.avanzata),
      }
    })
    .filter((sezione) => sezione.gruppi.length > 0 || sezione.avanzate.length > 0)
}
