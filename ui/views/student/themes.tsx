// La scheda personale: i box delle materie, con ore, voti, osservazioni e check.

import type { ReactElement, ReactNode } from 'react'

import {
  formattaVoto,
  mediaAllievo,
  notaFineSemestre,
} from '#core/dominio/calculations.js'
import { checkDelCorso, checkDellAllievo } from '#core/dominio/check.js'
import { percento } from '#core/dominio/text.js'
import { celleDiAllievo, contiPerAspetto } from '#core/dominio/observations.js'
import { testoDiVoce, vociDiLista } from '#core/dominio/lists.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Allievo, Classe, Corso, Lezione, MomentoValutazione } from '#core/dominio/models.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import { Collegamento, Pastiglia, Scheda } from '#ui/components/base.js'
import { SintesiIncassata } from '#ui/components/filters.js'
import { nomeSegno, SegnoFermo } from '#ui/components/marks.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { Tabella } from '#ui/components/table.js'
import { casellaDelCheck, comeSpuntata } from '#ui/views/check.js'
import { nomeMateria, stato, vai, valutazioniDi } from '#ui/state.js'
import { apriLezione } from '#ui/pages.js'
import { presenzeDelCorso, giornateStorte, temaPresenze } from './attendance.js'
import { riquadroTema, nienteQui } from './common.js'
import { testi } from './themes.testi.js'

/**
 * I voti di una materia: la nota e i momenti da cui viene. La media si calcola
 * dentro il corso, mai fra corsi diversi.
 */
function temaVoti (allievo: Allievo, momenti: MomentoValutazione[]): ReactElement {
  const { media, conteggio } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )
  const t = testi()

  return riquadroTema(
    t.valutazioni,
    momenti.length,
    <div>
      <p className="riquadro-tema__riga">
        {nota === null
          ? <Pastiglia testo={t.nessunVoto} tono="quiete" />
          : (
              <Pastiglia
                // La nota, e fra parentesi la media da cui esce.
                testo={t.notaEMedia(formattaVoto(nota), formattaVoto(media))}
                tono={nota >= stato.registro.impostazioni.scala.sufficienza ? 'positivo' : 'negativo'}
              />
            )}
        <span className="testo-quieto">{t.votiSu(conteggio, momenti.length)}</span>
      </p>
      {momenti.length === 0
        ? nienteQui(t.nessunMomento)
        : (
            <ul className="diario">
              {momenti.map((momento) => {
                const voto = momento.voti.find((v) => v.allievoId === allievo.id)
                return (
                  <li key={momento.id} className="diario__voce">
                    <Collegamento
                      testo={formattaData(momento.data)}
                      classe="diario__quando"
                      // Il corso e la classe li porta la prova stessa (`completa` in `place.ts`).
                      al={() => {
                        vai({
                          pagina: 'pagina.corso.valutazioni',
                          soggetto: { tipo: 'valutazione', id: momento.id },
                        })
                      }}
                    />
                    <span className="diario__cosa">{momento.titolo}</span>
                    {momento.peso !== 1
                      ? <span className="testo-quieto">{t.peso(momento.peso)}</span>
                      : null}
                    {!voto || (voto.valore === null && !voto.assente)
                      ? <Pastiglia testo="—" tono="quiete" />
                      : voto.assente
                        ? <Pastiglia testo={minuscolo(lessico().presenze.assente)} tono="attenzione" />
                        : (
                            <Pastiglia
                              testo={formattaVoto(voto.valore)}
                              tono={voto.valore! >= momento.scala.sufficienza ? 'positivo' : 'negativo'}
                            />
                          )}
                    {voto?.nota ? <span className="diario__nota">{voto.nota}</span> : null}
                  </li>
                )
              })}
            </ul>
          )}
    </div>,
  )
}

/**
 * Com'è andata, ora per ora: la matrice del comportamento del registro
 * dell'ora, girata (qui le righe sono le ore di una persona). Stessi quadretti
 * e aspetti in colonna nell'ordine della lista, tutti anche se mai segnati; in
 * coda gli aspetti tolti ma usati. Le date mostrano se i segni sono sparsi o
 * vicini; in fondo i totali.
 */
function temaOsservato (allievo: Allievo, lezioni: Lezione[]): ReactElement {
  const celle = celleDiAllievo(lezioni, allievo.id)
  const annotate = celle.filter(({ cella }) => (cella.nota ?? '').trim())
  const nomeAspetto = (valore: string) =>
    testoDiVoce(stato.registro.impostazioni, 'aspettoOsservato', valore)

  // Gli aspetti della lista, più quelli segnati e poi tolti dalla lista.
  const dellaLista = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato').map(
    (voce) => voce.valore,
  )
  const aspetti = [
    ...dellaLista,
    ...[...new Set(celle.map(({ cella }) => cella.aspetto))].filter(
      (valore) => !dellaLista.includes(valore),
    ),
  ]

  // Una riga per ora con qualcosa di segnato, in ordine di calendario; le ore
  // senza niente non fanno riga.
  const righe = [...new Map(celle.map(({ lezione }) => [lezione.id, lezione])).values()].sort(
    (a, b) => a.data.localeCompare(b.data),
  )
  const cellaDi = (lezioneId: string, aspetto: string) =>
    celle.find(({ lezione, cella }) => lezione.id === lezioneId && cella.aspetto === aspetto)
      ?.cella ?? null

  const conti = new Map(contiPerAspetto(celle).map((conto) => [conto.aspetto, conto]))
  const t = testi()

  const casella = (lezione: Lezione, aspetto: string): ReactElement => {
    const cella = cellaDi(lezione.id, aspetto)
    if (!cella) {
      // Niente segnato su quell'aspetto: il quadretto resta vuoto per tenere le colonne.
      return <span className="cella-segno cella-segno--ferma" />
    }
    return (
      <SegnoFermo
        segno={cella.segno}
        conNota={Boolean(cella.nota)}
        racconto={[
          `${formattaData(lezione.data, 'settimana')} · ${nomeAspetto(aspetto)}`,
          nomeSegno(cella.segno).toLowerCase(),
          cella.nota,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
    )
  }

  return riquadroTema(
    t.comEAndata,
    celle.length,
    celle.length === 0
      ? nienteQui(t.nienteSegnato)
      : (
          <div>
            <Tabella
              classi={{ telaio: 'matrice__telaio', tabella: 'matrice' }}
              // Un ridisegno non riporta la matrice a sinistra.
              // testo-fisso: chiave di scorrimento
              scorrimento={`osservato:${allievo.id}`}
              etichetta={t.aspettiOraPerOra}
              intestazione={(
                <>
                  <th className="matrice__chi" scope="col">{t.giorno}</th>
                  {aspetti.map((aspetto) => (
                    <th key={aspetto} className="matrice__aspetto" scope="col">{nomeAspetto(aspetto)}</th>
                  ))}
                </>
              )}
              righe={righe.map((lezione) => (
                <tr key={lezione.id}>
                  <th className="matrice__chi" scope="row">
                    {/* Il giorno porta all'ora. */}
                    <Collegamento
                      testo={<DataDiLezione iso={lezione.data} />}
                      al={() => apriLezione(lezione.id)}
                    />
                  </th>
                  {aspetti.map((aspetto) => <td key={aspetto}>{casella(lezione, aspetto)}</td>)}
                </tr>
              ))}
              piede={(
                <>
                  <th className="matrice__chi" scope="row">{t.inTutto}</th>
                  {aspetti.map((aspetto) => {
                    const conto = conti.get(aspetto)
                    if (!conto) return <td key={aspetto} className="testo-quieto">—</td>
                    return (
                      <td key={aspetto} className="matrice__conto">
                        {conto.positivi > 0
                          ? <span className="matrice__conto--positivo">{`+${conto.positivi}`}</span>
                          : null}
                        {conto.negativi > 0
                          ? <span className="matrice__conto--negativo">{`−${conto.negativi}`}</span>
                          : null}
                        {/* Anche le annotazioni senza segno: qualcuno ha scritto una riga. */}
                        {conto.neutre > 0
                          ? <span className="testo-quieto">{String(conto.neutre)}</span>
                          : null}
                      </td>
                    )
                  })}
                </>
              )}
            />
            {/* Le righe scritte accanto ai quadretti: dicono che cosa è successo. */}
            {annotate.length === 0
              ? null
              : (
                  <ul className="diario">
                    {annotate.map(({ lezione, cella }) => (
                      <li key={`${lezione.id}:${cella.aspetto}`} className="diario__voce">
                        <Collegamento
                          testo={<DataDiLezione iso={lezione.data} />}
                          classe="diario__quando"
                          al={() => apriLezione(lezione.id)}
                        />
                        <SegnoFermo segno={cella.segno} />
                        <span className="testo-quieto">{nomeAspetto(cella.aspetto)}</span>
                        <span className="diario__cosa">{cella.nota ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
          </div>
        ),
  )
}

/** Le osservazioni scritte nelle ore di questa materia, dalla più recente. */
function temaOsservazioni (allievo: Allievo, lezioni: Lezione[]): ReactElement {
  const voci = lezioni
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((o) => o.allievoId === allievo.id)
        .map((osservazione) => ({ lezione, osservazione })),
    )
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))
  const t = testi()

  return riquadroTema(
    Molti(lessico().osservazione),
    voci.length,
    voci.length === 0
      ? nienteQui(t.nienteAnnotato)
      : (
          <ul className="diario">
            {voci.map(({ lezione, osservazione }) => (
              <li key={osservazione.id} className="diario__voce">
                <Collegamento
                  testo={<DataDiLezione iso={lezione.data} />}
                  classe="diario__quando"
                  al={() => apriLezione(lezione.id)}
                />
                <Pastiglia
                  testo={t.tipoOsservazione(osservazione.tipo)}
                  tono={osservazione.tipo === 'merito' ? 'positivo' : 'quiete'}
                />
                <span className="diario__cosa">{osservazione.testo}</span>
              </li>
            ))}
          </ul>
        ),
  )
}

/**
 * Il check di una materia: una riga per colonna, con la casella della griglia
 * (stesso clic e tasto destro) e, per intero, il giorno e come è stata
 * spuntata. Assente se il corso non ha colonne.
 */
function temaCheck (allievo: Allievo, corso: Corso): ReactNode {
  const check = checkDelCorso(stato.registro, corso.id)
  const caselle = checkDellAllievo(stato.registro, corso.id, allievo.id)
  if (!check || caselle.length === 0) return null
  const fatte = caselle.filter((c) => c.spunta).length
  const t = testi()
  return riquadroTema(
    Uno(lessico().check),
    caselle.length,
    <div>
      <SintesiIncassata
        campi={[{
          etichetta: t.fatte,
          valore: `${fatte}/${caselle.length}`,
          tono: fatte === caselle.length ? 'positivo' : undefined,
        }]}
      />
      <ul className="check-allievo">
        {caselle.map(({ colonna, spunta, data }) => (
          <li key={colonna.id} className="check-allievo__voce">
            {casellaDelCheck(corso.id, check, allievo, colonna)}
            <span className="check-allievo__titolo">{colonna.titolo}</span>
            <span className="testo-quieto check-allievo__quando">
              {spunta && data ? comeSpuntata(spunta, data) : t.daFare}
            </span>
          </li>
        ))}
      </ul>
    </div>,
  )
}

/**
 * Il box di una materia: quel che il registro sa di questa persona in questa
 * materia. In cima la sintesi (assenza e nota), poi i riquadri sempre nello
 * stesso ordine.
 */
function boxMateria (
  allievo: Allievo,
  corso: Corso,
  lezioni: Lezione[],
  momenti: MomentoValutazione[],
): ReactElement {
  const riga = presenzeDelCorso(allievo, corso)
  const storte = giornateStorte(allievo, lezioni)
  // Le ore tenute, non quelle a calendario: le annullate non contano.
  const tenute = lezioni.filter((lezione) => lezione.stato !== 'annullata').length
  const { media } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )
  const t = testi()

  return (
    <Scheda
      key={corso.id}
      classe="box-materia"
      titolo={nomeMateria(corso.materiaId) || corso.titolo}
      sottotitolo={[
        riga ? t.diAssenza(percento(riga.assenza)) : t.nessunaOra,
        nota === null ? t.nessunVoto : t.nota(formattaVoto(nota)),
        t.ore(tenute),
      ].join(' · ')}
      contenuto={(
        <div className="box-materia__temi">
          {temaPresenze(riga, storte)}
          {temaVoti(allievo, momenti)}
          {temaOsservato(allievo, lezioni)}
          {temaOsservazioni(allievo, lezioni)}
          {temaCheck(allievo, corso)}
        </div>
      )}
    />
  )
}

/**
 * I box delle materie, uno per corso della classe. In fondo, se ce ne sono,
 * le ore rimaste senza corso (corso eliminato), con le loro osservazioni.
 */
export function boxDelleMaterie (
  allievo: Allievo,
  classe: Classe,
  corsi: Corso[],
  lezioni: Lezione[],
): ReactElement[] {
  const valutazioni = valutazioniDi(classe.id)
  const box = corsi.map((corso) =>
    boxMateria(
      allievo,
      corso,
      lezioni.filter((l) => l.corsoId === corso.id),
      valutazioni
        .filter((v) => v.corsoId === corso.id)
        .sort((a, b) => a.data.localeCompare(b.data)),
    ),
  )

  const sciolte = lezioni.filter((l) => !corsi.some((c) => c.id === l.corsoId))
  const orfane = sciolte.some(
    (lezione) => lezione.osservazioni.some((o) => o.allievoId === allievo.id),
  )
  if (orfane) {
    box.push(
      <Scheda
        // testo-fisso: chiave React
        key="senza-corso"
        classe="box-materia"
        titolo={testi().oreSenzaCorso}
        sottotitolo={testi().corsoEliminato}
        contenuto={(
          <div className="box-materia__temi">
            {temaOsservazioni(allievo, sciolte)}
          </div>
        )}
      />,
    )
  }

  return box
}
