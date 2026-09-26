// La matrice del comportamento: gli aspetti osservati per ogni allievo
// dell'ora, con i segni che si mettono a clic e le note che li accompagnano.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import { testoDiVoce, vociDiLista } from '../../../domain/lists.js'
import type { Allievo, Classe, Lezione, SegnoOsservato, VoceLista } from '../../../domain/models.js'
import { icona } from '../../components/icons.js'
import { menuContestuale } from '../../components/menu.js'
import { SEGNI, nomeSegno, segnoFermo } from '../../components/marks.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import { aggiorna, stato } from '../../state.js'
import { tabella } from '../../components/table.js'
import { minuscolo } from '../../../i18n/index.js'
import { testi } from './behaviour.testi.js'

/**
 * La casella che si è chiesto di annotare senza segno (`allievoId|aspetto`),
 * fuori dalla vista perché il ridisegno la perderebbe. Porta l'ora a cui
 * appartiene, così non ricompare in un'altra lezione.
 */
let daAnnotare: { lezioneId: string, chiave: string } | null = null

function chiaveCella (allievoId: string, aspetto: string): string {
  return `${allievoId}|${aspetto}`
}

/** Scrive una casella e basta: il resto della matrice non si tocca. */
async function scriviCella (
  lezione: Lezione,
  allievoId: string,
  aspetto: string,
  cambio: { segno?: SegnoOsservato | null; nota?: string },
): Promise<void> {
  await azione({ tipo: 'osservazione.cella', lezioneId: lezione.id, allievoId, aspetto, ...cambio })
}

/**
 * La matrice: persone in riga, aspetti in colonna. Un clic gira la casella
 * (vuota, molto bene, da migliorare); la nota si scrive sotto. Il tasto destro
 * apre l'elenco dei segni e «Annota», per una nota senza segno.
 */
export function matriceOsservata (lezione: Lezione, classe: Classe | null): Figlio {
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []
  const aspetti = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato')
  if (allievi.length === 0 || aspetti.length === 0) return null

  const matrice = lezione.matrice ?? []
  const t = testi()
  const cellaDi = (allievoId: string, aspetto: string) =>
    matrice.find((c) => c.allievoId === allievoId && c.aspetto === aspetto) ?? null

  const casella = (allievo: Allievo, aspetto: VoceLista): HTMLElement => {
    const cella = cellaDi(allievo.id, aspetto.valore)
    const segno = cella?.segno ?? null
    const conNota = Boolean(cella?.nota)
    const chi = `${nomeCompleto(allievo)} · ${aspetto.testo}`

    // Vuota, molto bene, da migliorare, e da capo: tre stati e un gesto solo.
    const prossimo: SegnoOsservato | null =
      segno === null ? 'positivo' : segno === 'positivo' ? 'negativo' : null

    const bottone = h(
      'button',
      {
        class: [
          'cella-segno',
          // testo-fisso: classe CSS
          segno && `cella-segno--${segno}`,
          conNota && 'cella-segno--annotata',
        ],
        type: 'button',
        // testo-fisso: chiave di fuoco
        dataset: { fuoco: `segno-${allievo.id}-${aspetto.valore}` },
        attr: {
          title: [
            `${chi}: ${minuscolo(nomeSegno(segno))}`,
            cella?.nota,
            t.premiPer(minuscolo(nomeSegno(prossimo))),
          ]
            .filter(Boolean)
            .join('\n'),
          'aria-label': `${chi}: ${nomeSegno(segno)}`,
        },
        onclick: () => void scriviCella(lezione, allievo.id, aspetto.valore, { segno: prossimo }),
        oncontextmenu: (evento: MouseEvent) =>
          menuContestuale(
            evento,
            [
              { titolo: chi },
              ...SEGNI.map((s) => ({
                testo: s.nome,
                simbolo: s.simbolo,
                accesa: segno === s.valore,
                al: () =>
                  void scriviCella(lezione, allievo.id, aspetto.valore, { segno: s.valore }),
              })),
              {
                testo: t.nienteDaSegnare,
                simbolo: 'chiudi',
                accesa: segno === null,
                al: () => void scriviCella(lezione, allievo.id, aspetto.valore, { segno: null }),
              },
              'separatore',
              {
                testo: cella?.nota ? t.modificaAnnotazione : t.annota,
                simbolo: 'matita',
                al: () => {
                  // La riga della nota per una casella senza segno non c'è: la si chiede, e il
                  // ridisegno la porta con il fuoco dentro.
                  daAnnotare = {
                    lezioneId: lezione.id,
                    chiave: chiaveCella(allievo.id, aspetto.valore),
                  }
                  aggiorna({})
                },
              },
            ],
            bottone,
          ),
      },
      segno ? icona(SEGNI.find((s) => s.valore === segno)?.simbolo ?? 'piu') : null,
    )
    return bottone
  }

  return tabella({
    classi: { telaio: 'matrice__telaio', tabella: 'matrice' },
    etichetta: t.aspetti,
    intestazione: [
      h('th', { attr: { scope: 'col' } }, ''),
      ...aspetti.map((aspetto) =>
        h('th', { class: 'matrice__aspetto', attr: { scope: 'col' } }, aspetto.testo),
      ),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        null,
        h('th', { class: 'matrice__chi', attr: { scope: 'row' } }, nomeCompleto(allievo)),
        ...aspetti.map((aspetto) => h('td', null, casella(allievo, aspetto))),
      ),
    ),
  })
}

/**
 * Le annotazioni delle caselle segnate, una riga per casella, sotto la matrice:
 * nella griglia non c'è posto per scrivere, e segnare non deve fermarsi.
 */
export function noteDellaMatrice (lezione: Lezione, classe: Classe | null): Figlio {
  const aspetti = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato')
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const nomeAspetto = (valore: string) =>
    aspetti.find((a) => a.valore === valore)?.testo ??
    testoDiVoce(stato.registro.impostazioni, 'aspettoOsservato', valore)

  const righe = [...(lezione.matrice ?? [])]
  const t = testi()
  // La casella chiesta da annotare non è ancora nel registro: la si aggiunge.
  const chiesta = daAnnotare?.lezioneId === lezione.id ? daAnnotare.chiave : null
  if (chiesta && !righe.some((c) => chiaveCella(c.allievoId, c.aspetto) === chiesta)) {
    const [allievoId, aspetto] = chiesta.split('|')
    if (allievoId && aspetto) righe.push({ allievoId, aspetto, segno: null })
  }
  if (righe.length === 0) return null

  righe.sort(
    (a, b) =>
      (nomi.get(a.allievoId) ?? '').localeCompare(nomi.get(b.allievoId) ?? '', 'it') ||
      nomeAspetto(a.aspetto).localeCompare(nomeAspetto(b.aspetto), 'it'),
  )

  return h(
    'ul',
    { class: 'matrice-note' },
    ...righe.map((cella) => {
      const chiave = chiaveCella(cella.allievoId, cella.aspetto)
      return h(
        'li',
        { class: 'matrice-note__riga' },
        segnoFermo(cella.segno),
        h(
          'span',
          { class: 'matrice-note__chi' },
          `${nomi.get(cella.allievoId) ?? t.pifNonInElenco} · ${nomeAspetto(cella.aspetto)}`,
        ),
        h('input', {
          class: 'campo__controllo matrice-note__testo',
          type: 'text',
          value: cella.nota ?? '',
          placeholder: t.cheCosaESuccesso,
          // Il fuoco rientra da sé dopo il ridisegno.
          // testo-fisso: chiave di fuoco
          dataset: { fuoco: `nota-cella-${chiave}` },
          attr: {
            'aria-label': t.annotazioneSu(
              nomi.get(cella.allievoId) ?? '?',
              nomeAspetto(cella.aspetto),
            ),
          },
          onchange: (evento: Event) => {
            daAnnotare = null
            void scriviCella(lezione, cella.allievoId, cella.aspetto, {
              nota: (evento.target as HTMLInputElement).value,
            })
          },
        }),
      )
    }),
  )
}
