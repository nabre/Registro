// Il calendario: l'anno scolastico intero su una pagina, come il foglio che la
// sede stampa: mesi in colonna, giorni in riga, vacanze e semestri a colpo d'occhio.

import type { ReactElement } from 'react'

import { formattaData, formattaMese, giornoDelMese, giornoSettimana, inizialiGiorno, nomeSemestre, primoDelMese, settimanaIso, sommaMesi, ultimoDelMese } from '#core/dominio/dates.js'
import { allineaSemestri, confineAnno } from '#core/dominio/years.js'
import type { Compleanno } from '#core/dominio/birthdays.js'
import type { Iso, Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { PuntoColore } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { sospensioneDi } from '#core/dominio/timetable.js'
import {
  aggiorna,
  annoCorrente,
  compleanniFra,
  lezioniInAgenda,
  nomeClasseDiLezione,
  coloreDiLezione,
  stato,
} from '#ui/state.js'
import { festivo, apreSemestre, chiudeSemestre, letteraDi } from './common.js'
import { dettiCompleanni, classiInAula, qualcunoInAula } from './birthdays.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { quanti } from '#core/dominio/lexicon.js'
import { testi } from './calendar.testi.js'

// ------------------------------------------------------------------ anno


/** I mesi di un semestre, con come si chiama: un gruppo di colonne affiancate. */
interface GruppoAnno {
  titolo: string
  mesi: Iso[]
}

/** In testa alla colonna dei numeri: `#`. */
function numeri (numero: number | null, chiave: string): ReactElement {
  return <span key={chiave} className="anno-griglia__giorno">{numero === null ? '#' : String(numero)}</span>
}

/**
 * L'anno scolastico intero su una pagina: i mesi in colonna, i giorni in riga.
 * I numeri dei giorni si ripetono ai due capi e al passaggio di semestre, per
 * non perdere la riga attraversando dodici colonne.
 */
export function VistaAnno (): ReactElement {
  const anno = annoCorrente()
  if (!anno) return <div className="anno-griglia" />

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
  const [primo, secondo] = allineaSemestri(anno.semestri)
  const gruppi: GruppoAnno[] = confine
    ? [
        { titolo: nomeSemestre(primo ?? { numero: 1 }), mesi: mesi.filter((m) => m <= confine) },
        { titolo: nomeSemestre(secondo ?? { numero: 2 }), mesi: mesi.filter((m) => m > confine) },
      ].filter((gruppo) => gruppo.mesi.length > 0)
    : [{ titolo: anno.etichetta, mesi }]

  // La griglia: una colonna dei giorni, poi ogni gruppo di mesi seguito dalla
  // sua colonna dei giorni.
  const colonne = ['2rem', ...gruppi.flatMap((g) => [...g.mesi.map(() => 'minmax(4.8rem, 1fr)'), '2rem'])].join(' ')
  const larghezza = { gridTemplateColumns: colonne }

  const righe: ReactElement[] = []
  for (let numero = 1; numero <= 31; numero += 1) {
    righe.push(
      <div
        key={numero}
        // Il modificatore distingue le righe dei giorni da quelle d'intestazione: è su
        // queste che il foglio distribuisce l'altezza che avanza.
        className="anno-griglia__riga anno-griglia__riga--giorni"
        style={larghezza}
      >
        {numeri(numero, 'inizio')}
        {gruppi.flatMap((gruppo, indice) => [
          ...gruppo.mesi.map((mese) => (
            <CellaAnno key={mese} mese={mese} numero={numero} perGiorno={perGiorno} feste={feste} />
          )),
          // testo-fisso: una chiave di React, non un testo
          numeri(numero, `dopo:${indice}`),
        ])}
      </div>,
    )
  }

  return (
    // Anelli della catena di telaio fino al foglio che scorre.
    <div className="anno-griglia" data-telaio="anno">
      <div className="anno-griglia__foglio" data-scorrimento="calendario:anno" data-telaio="anno-foglio">
        {/* Il nome del semestre sopra i suoi mesi, una scritta sola larga quanto il gruppo. */}
        <div className="anno-griglia__riga anno-griglia__riga--semestri" style={larghezza}>
          <span />
          {gruppi.flatMap((gruppo, indice) => [
            <span
              key={`semestre:${indice}`}
              className="anno-griglia__semestre"
              // testo-fisso: una regola della griglia CSS
              style={{ gridColumn: `span ${gruppo.mesi.length}` }}
            >
              {gruppo.titolo}
            </span>,
            <span key={`dopo:${indice}`} />,
          ])}
        </div>
        <div className="anno-griglia__riga anno-griglia__riga--mesi" style={larghezza}>
          {numeri(null, 'inizio')}
          {gruppi.flatMap((gruppo, indice) => [
            ...gruppo.mesi.map((mese) => (
              <span key={mese} className="anno-griglia__mese">{formattaMese(mese).split(' ')[0]}</span>
            )),
            // testo-fisso: una chiave di React, non un testo
            numeri(null, `dopo:${indice}`),
          ])}
        </div>
        {righe}
      </div>
      <LegendaAnno />
    </div>
  )
}

/**
 * Un giorno dell'anno, in tre colonnine: la lettera della settimana (sul
 * lunedì), quel che succede (vacanza o numero di corsi), l'iniziale del giorno.
 * Il confine di semestre è una riga sopra il giorno d'inizio o sotto quello di
 * fine. Le celle che non esistono (il 31 novembre) restano vuote per tenere
 * allineate le righe.
 */
function CellaAnno ({ mese, numero, perGiorno, feste }: {
  mese: Iso
  numero: number
  perGiorno: Map<Iso, Lezione[]>
  feste: Map<Iso, Compleanno[]>
}): ReactElement {
  const ultimo = giornoDelMese(ultimoDelMese(mese))
  if (numero > ultimo) return <span className="anno-giorno anno-giorno--nulla" />

  const data: Iso = `${mese.slice(0, 8)}${String(numero).padStart(2, '0')}`
  const anno = annoCorrente()
  const t = testi()
  // I giorni dei mesi di bordo fuori dall'anno restano, spenti e senza clic,
  // con l'iniziale per il filo della settimana.
  if (anno && (data < anno.inizio || data > anno.fine)) {
    return (
      <span
        className={classi('anno-giorno', 'anno-giorno--fuori-anno', festivo(data) && 'giorno--festivo')}
        title={t.fuoriAnno(formattaData(data, 'lungo'))}
      >
        <span className="anno-giorno__settimana" />
        <span className="anno-giorno__testo" />
        <span className="anno-giorno__iniziale">{inizialiGiorno()[giornoSettimana(data) - 1]}</span>
      </span>
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

  return (
    <button
      // Le stesse classi del mese: fine settimana, chiusure e giorno scelto si
      // vedono uguali in tutte le viste.
      className={classi(
        'anno-giorno',
        festivo(data) && 'giorno--festivo',
        pausa && 'giorno--chiuso',
        data === stato.adessoData && 'anno-giorno--oggi',
        data === stato.data && 'anno-giorno--scelto',
        apre && 'anno-giorno--apre',
        chiude && 'anno-giorno--chiude',
      )}
      type="button"
      title={[
        formattaData(data, 'lungo'),
        `${t.settimanaMinuscola(settimanaIso(data))}${lettera ? ` · ${lettera}` : ''}`,
        pausa?.etichetta ?? null,
        corsi.length > 0
          ? delGiorno.map((l) => nomeClasseDiLezione(l)).filter((v, i, tutti) => tutti.indexOf(v) === i).join(', ')
          : null,
        chiude ? t.finisceIl(nomeSemestre(chiude)) : null,
        apre ? t.cominciaIl(nomeSemestre(apre)) : null,
        compleanni.length > 0 ? dettiCompleanni(compleanni) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      onClick={() => aggiorna({ data, modoCalendario: 'settimana' })}
    >
      <span className="anno-giorno__settimana">{lettera ?? ''}</span>
      <span className="anno-giorno__testo">
        {/* Il nome della vacanza per primo; altrimenti i corsi. */}
        {nomePausa
          ? <span className="anno-giorno__nome">{nomePausa}</span>
          : corsi.length > 0
            ? (
                <>
                  {/* Il punto colore della classe, come nel mese e nell'agenda. */}
                  {delGiorno
                    .filter((l, i, tutte) => tutte.findIndex((x) => x.corsoId === l.corsoId) === i)
                    .slice(0, 3)
                    .map((l) => <PuntoColore key={l.corsoId} colore={coloreDiLezione(l)} />)}
                  <span className="anno-giorno__corsi">{quanti(corsi.length, lessico().corso)}</span>
                </>
              )
            : ''}
        {/* La torta in coda: il nome non ci sta (si legge passandoci sopra o nel mese). */}
        {compleanni.length > 0
          ? (
              <Icona
                nome="torta"
                classe={qualcunoInAula(compleanni, classiInAula(delGiorno, data))
                  ? 'anno-giorno__torta'
                  : 'anno-giorno__torta anno-giorno__torta--fuori'}
              />
            )
          : null}
      </span>
      <span className="anno-giorno__iniziale">{inizialiGiorno()[giornoSettimana(data) - 1]}</span>
    </button>
  )
}

/** Che cosa vogliono dire i colori: sono quattro, e nessuno li indovina. */
function LegendaAnno (): ReactElement {
  const voce = (classe: string, testo: string) => (
    <span key={classe} className="anno-legenda__voce">
      <span className={classi('anno-legenda__segno', classe)} />
      {testo}
    </span>
  )

  const t = testi()
  return (
    <div className="anno-legenda">
      {voce('giorno--chiuso', t.legendaChiusure)}
      {voce('giorno--festivo', t.legendaFestivi)}
      {voce('anno-giorno--apre', t.legendaApre)}
      {voce('anno-giorno--chiude', t.legendaChiude)}
      <span className="anno-legenda__voce">{t.legendaLettera}</span>
      <span className="anno-legenda__voce">{t.legendaNumero}</span>
      <span className="anno-legenda__voce"><Icona nome="torta" />{t.legendaCompleanni}</span>
    </div>
  )
}
