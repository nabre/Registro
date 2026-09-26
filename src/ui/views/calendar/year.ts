// Il calendario: l'anno scolastico intero su una pagina, come il foglio che la
// sede stampa: mesi in colonna, giorni in riga, vacanze e semestri a colpo d'occhio.

import {
  formattaData,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  inizialiGiorno,
  oggi,
  primoDelMese,
  settimanaIso,
  sommaMesi,
  ultimoDelMese,
} from '../../../domain/dates.js'
import { allineaSemestri, confineAnno } from '../../../domain/years.js'
import type { Compleanno } from '../../../domain/birthdays.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { puntoColore } from '../../components/base.js'
import { icona } from '../../components/icons.js'
import { sospensioneDi } from '../../../domain/timetable.js'
import { h } from '../../dom.js'
import {
  aggiorna,
  annoCorrente,
  compleanniFra,
  lezioniInAgenda,
  nomeClasseDiLezione,
  coloreDiLezione,
  stato,
} from '../../state.js'
import { festivo, apreSemestre, chiudeSemestre, letteraDi } from './common.js'
import { dettiCompleanni, classiInAula, qualcunoInAula } from './birthdays.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { quanti } from '../../../domain/lexicon.js'
import { testi } from './calendar.testi.js'

// ------------------------------------------------------------------ anno


/** I mesi di un semestre, con come si chiama: un gruppo di colonne affiancate. */
interface GruppoAnno {
  titolo: string
  mesi: Iso[]
}

/**
 * L'anno scolastico intero su una pagina: i mesi in colonna, i giorni in riga.
 * I numeri dei giorni si ripetono ai due capi e al passaggio di semestre, per
 * non perdere la riga attraversando dodici colonne.
 */
export function vistaAnno (): HTMLElement {
  const anno = annoCorrente()
  if (!anno) return h('div', { class: 'anno-griglia' })

  // Le lezioni per giorno: la casella dice quanti corsi, non quante ore.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of lezioniInAgenda()) {
    const sue = perGiorno.get(lezione.data)
    if (sue) sue.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }

  // I compleanni dell'anno presi una volta sola, non per ogni casella.
  const feste = compleanniFra(anno.inizio, anno.fine)

  const mesi: Iso[] = []
  for (let mese = primoDelMese(anno.inizio); mese <= anno.fine; mese = sommaMesi(mese, 1)) {
    mesi.push(mese)
  }

  // Un mese appartiene al semestre del suo primo giorno. I titoli vengono dai
  // semestri in fila (`allineaSemestri`), come il confine, e non dall'ordine di
  // `anno.semestri`; un mese fuori dalla scuola (agosto) resta senza semestre.
  const confine = confineAnno(anno)
  const inFila = allineaSemestri(anno.semestri)
  const t = testi()
  const gruppi: GruppoAnno[] = confine
    ? [
        { titolo: inFila[0]?.etichetta ?? t.primoSemestre, mesi: mesi.filter((m) => m <= confine) },
        {
          titolo: inFila[1]?.etichetta ?? t.secondoSemestre,
          mesi: mesi.filter((m) => m > confine),
        },
      ].filter((gruppo) => gruppo.mesi.length > 0)
    : [{ titolo: anno.etichetta, mesi }]

  // La griglia: una colonna dei giorni, poi ogni gruppo di mesi seguito dalla
  // sua colonna dei giorni.
  const colonne = ['2rem', ...gruppi.flatMap((g) => [...g.mesi.map(() => 'minmax(4.8rem, 1fr)'), '2rem'])].join(' ')
  const larghezza = { gridTemplateColumns: colonne }

  // In testa alla colonna dei numeri: `#`.
  const numeri = (numero: number | null) =>
    h('span', { class: 'anno-griglia__giorno' }, numero === null ? '#' : String(numero))

  const righe: HTMLElement[] = []
  for (let numero = 1; numero <= 31; numero += 1) {
    righe.push(
      h(
        'div',
        // Il modificatore distingue le righe dei giorni da quelle d'intestazione: è su
        // queste che il foglio distribuisce l'altezza che avanza.
        { class: 'anno-griglia__riga anno-griglia__riga--giorni', style: larghezza },
        numeri(numero),
        ...gruppi.flatMap((gruppo) => [
          ...gruppo.mesi.map((mese) => cellaAnno(mese, numero, perGiorno, feste)),
          numeri(numero),
        ]),
      ),
    )
  }

  return h(
    'div',
    { class: 'anno-griglia' },
    h(
      'div',
      { class: 'anno-griglia__foglio', dataset: { scorrimento: 'calendario:anno' } },
      // Il nome del semestre sopra i suoi mesi, una scritta sola larga quanto il gruppo.
      h(
        'div',
        { class: 'anno-griglia__riga anno-griglia__riga--semestri', style: larghezza },
        h('span', null, ''),
        ...gruppi.flatMap((gruppo) => [
          h(
            'span',
            {
              class: 'anno-griglia__semestre',
              // testo-fisso: una regola della griglia CSS
              style: { gridColumn: `span ${gruppo.mesi.length}` },
            },
            gruppo.titolo,
          ),
          h('span', null, ''),
        ]),
      ),
      h(
        'div',
        { class: 'anno-griglia__riga anno-griglia__riga--mesi', style: larghezza },
        numeri(null),
        ...gruppi.flatMap((gruppo) => [
          ...gruppo.mesi.map((mese) =>
            h('span', { class: 'anno-griglia__mese' }, formattaMese(mese).split(' ')[0]),
          ),
          numeri(null),
        ]),
      ),
      ...righe,
    ),
    legendaAnno(),
  )
}

/**
 * Un giorno dell'anno, in tre colonnine: la lettera della settimana (sul
 * lunedì), quel che succede (vacanza o numero di corsi), l'iniziale del giorno.
 * Il confine di semestre è una riga sopra il giorno d'inizio o sotto quello di
 * fine. Le celle che non esistono (il 31 novembre) restano vuote per tenere
 * allineate le righe.
 */
function cellaAnno (
  mese: Iso,
  numero: number,
  perGiorno: Map<Iso, Lezione[]>,
  feste: Map<Iso, Compleanno[]>,
): HTMLElement {
  const ultimo = giornoDelMese(ultimoDelMese(mese))
  if (numero > ultimo) return h('span', { class: 'anno-giorno anno-giorno--nulla' })

  const data: Iso = `${mese.slice(0, 8)}${String(numero).padStart(2, '0')}`
  const anno = annoCorrente()
  const t = testi()
  // I giorni dei mesi di bordo fuori dall'anno restano, spenti e senza clic,
  // con l'iniziale per il filo della settimana.
  if (anno && (data < anno.inizio || data > anno.fine)) {
    return h(
      'span',
      {
        class: ['anno-giorno', 'anno-giorno--fuori-anno', festivo(data) && 'giorno--festivo'],
        attr: { title: t.fuoriAnno(formattaData(data, 'lungo')) },
      },
      h('span', { class: 'anno-giorno__settimana' }),
      h('span', { class: 'anno-giorno__testo' }),
      h('span', { class: 'anno-giorno__iniziale' }, inizialiGiorno()[giornoSettimana(data) - 1]),
    )
  }
  const pausa = sospensioneDi(anno, data)
  const apre = apreSemestre(data)
  const chiude = chiudeSemestre(data)
  const lunedi = giornoSettimana(data) === 1
  const lettera = lunedi ? letteraDi(data) : null

  // Quanti corsi, non quante ore: guardando l'anno si conta di quante classi ci
  // si occupa quel giorno.
  const delGiorno = perGiorno.get(data) ?? []
  const corsi = [...new Set(delGiorno.map((l) => l.corsoId))]
  const compleanni = feste.get(data) ?? []

  // Il nome della vacanza il primo giorno e ogni lunedì, non su ogni casella:
  // così ogni riga lo ritrova senza ripeterlo ovunque.
  const nomePausa = pausa && (data === pausa.dal || lunedi) ? pausa.etichetta : ''

  return h(
    'button',
    {
      // Le stesse classi del mese: fine settimana, chiusure e giorno scelto si
      // vedono uguali in tutte le viste.
      class: [
        'anno-giorno',
        festivo(data) && 'giorno--festivo',
        pausa && 'giorno--chiuso',
        data === oggi() && 'anno-giorno--oggi',
        data === stato.data && 'anno-giorno--scelto',
        apre && 'anno-giorno--apre',
        chiude && 'anno-giorno--chiude',
      ],
      type: 'button',
      attr: {
        title: [
          formattaData(data, 'lungo'),
          `${t.settimanaMinuscola(settimanaIso(data))}${lettera ? ` · ${lettera}` : ''}`,
          pausa?.etichetta ?? null,
          corsi.length > 0
            ? delGiorno.map((l) => nomeClasseDiLezione(l)).filter((v, i, tutti) => tutti.indexOf(v) === i).join(', ')
            : null,
          chiude ? t.finisceIl(chiude.etichetta) : null,
          apre ? t.cominciaIl(apre.etichetta) : null,
          compleanni.length > 0 ? dettiCompleanni(compleanni) : null,
        ]
          .filter(Boolean)
          .join(' · '),
      },
      onclick: () => aggiorna({ data, modoCalendario: 'settimana' }),
    },
    h('span', { class: 'anno-giorno__settimana' }, lettera ?? ''),
    h(
      'span',
      { class: 'anno-giorno__testo' },
      // Il nome della vacanza per primo; altrimenti i corsi.
      nomePausa
        ? h('span', { class: 'anno-giorno__nome' }, nomePausa)
        : corsi.length > 0
          ? [
              // Il punto colore della classe, come nel mese e nell'agenda.
              ...delGiorno
                .filter((l, i, tutte) => tutte.findIndex((x) => x.corsoId === l.corsoId) === i)
                .slice(0, 3)
                .map((l) => puntoColore(coloreDiLezione(l))),
              h(
                'span',
                { class: 'anno-giorno__corsi' },
                quanti(corsi.length, lessico().corso),
              ),
            ]
          : '',
      // La torta in coda: il nome non ci sta (si legge passandoci sopra o nel mese).
      compleanni.length > 0
        ? icona(
            'torta',
            qualcunoInAula(compleanni, classiInAula(delGiorno, data))
              ? 'anno-giorno__torta'
              : 'anno-giorno__torta anno-giorno__torta--fuori',
          )
        : null,
    ),
    h('span', { class: 'anno-giorno__iniziale' }, inizialiGiorno()[giornoSettimana(data) - 1]),
  )
}

/** Che cosa vogliono dire i colori: sono quattro, e nessuno li indovina. */
function legendaAnno (): HTMLElement {
  const voce = (classe: string, testo: string) =>
    h(
      'span',
      { class: 'anno-legenda__voce' },
      h('span', { class: ['anno-legenda__segno', classe] }),
      testo,
    )

  const t = testi()
  return h(
    'div',
    { class: 'anno-legenda' },
    voce('giorno--chiuso', t.legendaChiusure),
    voce('giorno--festivo', t.legendaFestivi),
    voce('anno-giorno--apre', t.legendaApre),
    voce('anno-giorno--chiude', t.legendaChiude),
    h('span', { class: 'anno-legenda__voce' }, t.legendaLettera),
    h('span', { class: 'anno-legenda__voce' }, t.legendaNumero),
    h('span', { class: 'anno-legenda__voce' }, icona('torta'), t.legendaCompleanni),
  )
}
