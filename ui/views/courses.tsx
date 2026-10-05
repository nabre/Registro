// I corsi: che cosa si insegna, a chi, e quando.
// In cima la matrice classi (colonne) × materie (righe): una casella vuota
// crea il corso, una accesa lo apre sotto; si toglie dalla × o dal tasto destro.
// Sotto, un corso alla volta: com'è fatto, a che punto è, come va per allievo.
// Non possiede dati: mette insieme lezioni, valutazioni e piani.

import type {
  CSSProperties,
  KeyboardEvent as EventoTastiera,
  MouseEvent as EventoMouse,
  ReactElement,
  ReactNode,
} from 'react'

import {
  allieviAttivi,
  formattaVoto,
  momentoLezione,
  nomeCompleto,
  ordinaAllievi,
  prossimaLezione,
} from '#core/dominio/calculations.js'
import { oltreSoglia, percentoAssenza } from '#core/dominio/alerts.js'
import { checkDelCorso, riepilogoDelCheck } from '#core/dominio/check.js'
import { siglaMateria } from '#core/dominio/courses.js'
import { creaMateria } from '#core/dominio/factories.js'
import { validaMateria } from '#core/dominio/validation.js'
import { notifica } from '#ui/components/notifications.js'
import { matriceCorso } from '#core/dominio/courseMatrix.js'
import { bilancioSegni, celleDiAllievo } from '#core/dominio/observations.js'
import { descriviRicorrenza } from '#core/dominio/timetable.js'
import { udPrevisteDelCorso } from '#core/dominio/courseMatrix.js'
import { Molti, Uno, corto } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { titoloComando } from '#contract/manifest.js'
import { formattaDurata, udDaMinuti } from '#core/dominio/dates.js'
import { confrontaNomi, percento } from '#core/dominio/text.js'
import type { Classe, Corso, Materia } from '#core/dominio/models.js'
import { azione } from '#ui/bridge.js'
import { classi } from '#ui/classNames.js'
import { Input } from '#ui/fields.js'
import { telaioVista } from '#ui/viewFrame.js'
import { Icona } from '#ui/components/icons.js'
import { menuContestuale } from '#ui/components/menu.js'
import {
  Collegamento,
  Pastiglia,
  Pulsante,
  PuntoColore,
  Quieto,
  Scheda,
  StatoVuoto,
  TestataVista,
  tonoPresenza,
} from '#ui/components/base.js'
import { eseguiOAvvisa, SintesiIncassata, StatoVuotoAnno } from '#ui/components/filters.js'
import { corsoDelContesto } from '#ui/context.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { Tabella } from '#ui/components/table.js'
import { CellaNome } from '#ui/components/avatar.js'
import { grigliaCheck } from './check.js'
import {
  cestinoPer,
  chiediEliminazione,
  moduloAnno,
  moduloClasse,
  moduloCorso,
  moduloLezione,
  moduloMateria,
  moduloUnisciMaterie,
} from '#ui/forms.js'
import {
  annoCorrente,
  classePerId,
  classiDellAnno,
  coloreDiCorso,
  corsiDellAnnoAperto,
  materiaPerId,
  nelSemestreScelto,
  nomeSemestreScelto,
  pianiPerCorso,
  semestreScelto,
  stato,
  vai,
} from '#ui/state.js'
import { apriLezione } from '#ui/pages.js'
import { testi } from './courses.testi.js'

/** Apre un corso nella pagina dei corsi, sotto la matrice. */
function apriCorso (corsoId: string): void {
  vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: corsoId } })
}

/**
 * Tutto quel che si sa di un corso, calcolato una volta: la scheda in alto e la
 * tabella sotto leggono gli stessi conti e restano d'accordo. I conti si
 * fermano al semestre scelto.
 */
function datiCorso (corso: Corso) {
  const classe = classePerId(corso.classeId)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  const lezioni = nelSemestreScelto(
    stato.registro.lezioni.filter((l) => l.corsoId === corso.id),
  )
  // Le annullate restano fuori dai conti di presenza.
  const tenute = lezioni.filter((l) => l.stato !== 'annullata')
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))

  // L'orologio dello stato e non `oggi()`, che non sa che un'ora di stamattina è finita.
  const svolte = tenute.filter(
    (l) =>
      l.stato === 'svolta' ||
      momentoLezione(l, stato.adessoData, stato.adessoOra) === 'passata',
  ).length

  return {
    classe,
    allievi,
    lezioni: lezioni.length,
    tenute,
    momenti,
    svolte,
    daFare: tenute.length - svolte,
    annullate: lezioni.length - tenute.length,
    piani: pianiPerCorso(corso.id).length,
    // Il check non ha semestre: una colonna vale per l'anno. I conti vengono dal
    // dominio, sugli attivi, come la testata della griglia.
    check: riepilogoDelCheck(stato.registro, corso.id),
    prossima: prossimaLezione(lezioni, stato.adessoData, stato.adessoOra),
    settimanali: corso.orario.reduce((somma, r) => somma + r.durataMin, 0),
    // Il cento per cento sono le ore previste dall'orario nel periodo, non quelle
    // già a calendario: lo stesso riferimento del rapporto stampato.
    matrice: matriceCorso(
      allievi,
      tenute,
      momenti,
      stato.registro.impostazioni,
      udPrevisteDelCorso(stato.registro, corso, semestreScelto()),
    ),
  }
}

type DatiCorso = ReturnType<typeof datiCorso>

/** Come sta andando il corso, in una fila di numeri sopra tutto il resto. */
function numeriDelCorso (dati: DatiCorso): ReactElement {
  const { matrice } = dati
  const presenza = matrice.classe.presenza
  const media = matrice.classe.media
  const scala = stato.registro.impostazioni.scala
  const t = testi()

  return (
    <SintesiIncassata
      campi={[
        { etichetta: corto(lessico().pif), valore: String(dati.allievi.length) },
        { etichetta: t.oreSvolte, valore: `${dati.svolte}/${dati.tenute.length}` },
        { etichetta: t.udPreviste, valore: String(matrice.udPreviste) },
        { etichetta: t.udACalendario, valore: String(matrice.ud) },
        // Solo quando ce ne sono.
        dati.annullate > 0 && { etichetta: t.annullate, valore: String(dati.annullate) },
        {
          // L'etichetta dice su che cosa è fatta: qui sulle ore con appello (meno gli
          // esoneri), mentre la colonna «Presenza» della tabella sta sulle UD previste.
          etichetta: t.presenzaConAppello,
          valore: presenza === null ? '—' : `${Math.round(presenza * 100)}%`,
          tono: tonoPresenza(presenza),
        },
        matrice.classe.udAssenza > 0 && {
          // Quanto si è perso di quel che era in programma: la cifra del rapporto.
          etichetta: t.udDiAssenzaSu(matrice.udPreviste),
          valore: `${matrice.classe.udAssenza}${
            matrice.classe.assenza === null ? '' : ` · ${percento(matrice.classe.assenza)}`
          }`,
        },
        { etichetta: t.valutazioni, valore: String(dati.momenti.length) },
        {
          // Su quanti è fatta la media si dice nell'etichetta, se non è tutta la classe.
          etichetta:
            media === null || matrice.classe.conVoto === dati.allievi.length
              ? t.mediaDiClasse
              : t.mediaDiAlcuni(matrice.classe.conVoto, dati.allievi.length),
          valore: media === null ? '—' : formattaVoto(media),
          tono: media === null ? undefined : media >= scala.sufficienza ? 'positivo' : 'negativo',
        },
        { etichetta: t.piani, valore: String(dati.piani), tono: dati.piani === 0 ? 'quiete' : undefined },
        // Una casella per colonna del check: quanti l'hanno fatta su quanti
        // frequentano, piena quando la colonna è chiusa.
        ...dati.check.map((r) => ({
          etichetta: r.colonna.titolo,
          valore: `${r.fatte}/${r.totale}`,
          tono: r.totale > 0 && r.fatte === r.totale ? ('positivo' as const) : undefined,
        })),
      ]}
    />
  )
}

function schedaCorso (corso: Corso, dati: DatiCorso): ReactElement {
  const materia = materiaPerId(corso.materiaId)
  const t = testi()

  return (
    <Scheda
      classe="corso-scheda"
      titolo={corso.titolo}
      // Classe prima di materia, come nel titolo.
      sottotitolo={`${dati.classe?.nome ?? t.classeSparita} · ${materia?.nome ?? t.materiaSparita}`}
      azioni={(
        <div className="corso-scheda__comandi">
          <Pulsante
            simbolo="matita"
            variante="fantasma"
            titolo={t.orarioNomeNote}
            al={() => moduloCorso({ corso })}
          />
          <Pulsante
            simbolo="calendario"
            variante="fantasma"
            titolo={t.nuovaLezione}
            al={() => moduloLezione({ corsoId: corso.id, classeId: corso.classeId })}
          />
          <Pulsante
            simbolo="check"
            variante="fantasma"
            // La pagina del check: lì si preparano le colonne.
            titolo={t.ilCheck}
            al={() => { vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } }) }}
          />
          <Pulsante
            simbolo="piano"
            variante="fantasma"
            // Un piano è di un'ora: si va a vedere quali ore del corso ne aspettano uno.
            titolo={t.leOre}
            // Anche il corso: la pagina dei piani sceglie con `corsoDelContesto()`, e con
            // la sola classe potrebbe aprire un altro corso.
            al={() => { vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: corso.id } }) }}
          />
          {/* Nessuna esportazione qui: i documenti del corso stanno in Documenti.
              Il corso si toglie da qui: la domanda dice quante ore e quanti voti se ne vanno. */}
          <Pulsante
            simbolo="cestino"
            variante="fantasma"
            titolo={t.eliminaCorso}
            al={async () => {
              if (!(await chiediEliminazione({ genere: 'corso', id: corso.id }))) return
              const risposta = await eseguiOAvvisa(
                { tipo: 'corso.elimina', corsoId: corso.id },
                t.corsoEliminato,
              )
              if (risposta.ok) vai({ pagina: 'pagina.corsi' }, { contesto: { corsoId: null } })
            }}
          />
        </div>
      )}
    >
      <div className="corso-scheda__corpo">
        {numeriDelCorso(dati)}
        {/* Se il corso ha una lezione ricorrente, e quale. Si dichiara da «Titolo e
            orario…» (tasto destro sulla casella della matrice). */}
        {corso.orario.length > 0
          ? (
              <p className="corso-scheda__orario">
                <span className="testo-quieto">{t.lezioneRicorrente}</span>
                {corso.orario.map((r) => (
                  <Pastiglia
                    key={r.id}
                    testo={descriviRicorrenza(r, stato.registro.impostazioni)}
                    tono="informativo"
                    simbolo="orologio"
                  />
                ))}
                <span className="testo-quieto">
                  {t.udASettimana(udDaMinuti(dati.settimanali, stato.registro.impostazioni.minutiUd)) +
                    formattaDurata(dati.settimanali)}
                </span>
              </p>
            )
          : <Quieto>{t.nessunaRicorrente}</Quieto>}
        {dati.prossima
          ? (
              <p className="testo-quieto">
                {t.prossimaOra}
                <Collegamento
                  testo={<DataDiLezione iso={dati.prossima.data} />}
                  al={() => { if (dati.prossima) apriLezione(dati.prossima.id) }}
                />
              </p>
            )
          : null}
        {/* Il programma d'insegnamento del corso. */}
        {corso.note ? <p className="corso-scheda__note">{corso.note}</p> : null}
      </div>
    </Scheda>
  )
}

/**
 * Il corso visto per allievo: ore, assenze, voti, una riga per ciascuno. I
 * numeri arrivano da `datiCorso`, gli stessi della fila sopra.
 */
function matriceDelCorso (corso: Corso, dati: DatiCorso): ReactNode {
  const classe = dati.classe
  if (!classe) return null
  const t = testi()
  const L = lessico()

  const allievi = dati.allievi
  if (allievi.length === 0) {
    return (
      <Scheda titolo={Molti(L.pif)}>
        <p className="testo-quieto">{t.nessunoFrequenta}</p>
      </Scheda>
    )
  }

  const momenti = dati.momenti
  const matrice = dati.matrice
  const scala = stato.registro.impostazioni.scala

  /**
   * I segni della matrice del comportamento di una persona, sommati sulle ore
   * del periodo in due cifre; il dettaglio sta nella sua scheda.
   */
  const segniSegnati = (allievoId: string): ReactElement => {
    const conti = bilancioSegni(celleDiAllievo(dati.tenute, allievoId))
    if (conti.positivi === 0 && conti.negativi === 0 && conti.neutre === 0) {
      return <span className="testo-quieto">—</span>
    }
    return (
      <span className="segni-contati">
        {conti.positivi > 0 ? <Pastiglia testo={`+${conti.positivi}`} tono="positivo" /> : null}
        {conti.negativi > 0 ? <Pastiglia testo={`−${conti.negativi}`} tono="negativo" /> : null}
        {/* Anche le annotazioni senza segno: qualcuno ha scritto una riga. */}
        {conti.neutre > 0 ? <span className="testo-quieto">{String(conti.neutre)}</span> : null}
      </span>
    )
  }

  /**
   * Quanto ha perso delle UD previste dall'orario nel periodo (non di quelle
   * svolte), come pastiglia: la cifra del rapporto. Sopra soglia è un avviso.
   */
  const quota = (riga: (typeof matrice.righe)[number]): ReactElement => {
    if (riga.assenza === null) return <span className="testo-quieto">—</span>
    // Oltre soglia secondo l'elenco, e con un decimale: 45 UD su 224 si legge «20,1%».
    const soglia = stato.registro.impostazioni.sogliaAssenza
    const oltre = oltreSoglia(soglia, riga.assenza)
    const intero = Math.round(riga.assenza * 100 + 1e-9)
    return (
      <Pastiglia
        testo={percentoAssenza(riga.assenza, soglia)}
        tono={oltre ? 'negativo' : intero <= 10 ? 'positivo' : intero <= 20 ? 'attenzione' : 'negativo'}
      />
    )
  }

  /**
   * La frequenza: cento meno l'assenza, complemento esatto della colonna accanto
   * (non la quota sulle ore con appello).
   */
  const seguito = (riga: (typeof matrice.righe)[number]): ReactElement => {
    if (riga.presenzaPreviste === null) return <span className="testo-quieto">—</span>
    // Il miliardesimo in più è quello di `percento`: 14,5% si legge 15%.
    const percento = Math.round(riga.presenzaPreviste * 100 + 1e-9)
    return (
      <Pastiglia
        testo={`${percento}%`}
        tono={percento >= 90 ? 'positivo' : percento >= 80 ? 'attenzione' : 'negativo'}
      />
    )
  }

  const colonneCheck = dati.check.length

  /**
   * Il check di una persona in due cifre (fatte su totali); le mancanti, per
   * nome, stanno nel suggerimento.
   */
  const contoCheck = (allievoId: string): ReactElement => {
    const mancanti = dati.check
      .filter((r) => r.mancano.some((a) => a.id === allievoId))
      .map((r) => r.colonna.titolo)
    const fatte = colonneCheck - mancanti.length
    const testo = `${fatte}/${colonneCheck}`
    return (
      <span title={mancanti.length === 0 ? t.tuttoFatto : t.mancano(mancanti)}>
        {mancanti.length === 0 ? <Pastiglia testo={testo} tono="positivo" /> : testo}
      </span>
    )
  }

  return (
    <Scheda
      telaio="corsi:allievi"
      titolo={Molti(L.pif)}
      sottotitolo={t.sottotitoloTabella(
        matrice.lezioni,
        matrice.ud,
        momenti.length,
        nomeSemestreScelto(),
      )}
    >
      <Tabella
        variante="matrice"
        // Larga: un clic su un nome o un ridisegno non la riporta a sinistra.
        telaio="allievi"
        scorrimento={`corsi:allievi:${corso.id}`}
        intestazione={(
          <>
            <th className="tabella__nome">{Uno(L.pif)}</th>
            <th title={t.sulleUdPreviste(matrice.udPreviste)}>{t.assenza}</th>
            {/* Le due percentuali complementari affiancate, per non fare la sottrazione a mente. */}
            <th title={t.sulleUdPreviste(matrice.udPreviste)}>{t.presenza}</th>
            <th>{t.udDiAssenza}</th>
            <th>{t.udSeguite}</th>
            {/* Il denominatore, accanto alle percentuali. */}
            <th title={t.udDelCorsoAiuto}>{t.udDelCorso}</th>
            <th>{t.ritardi}</th>
            {/* I segni del comportamento stanno fra ritardi e prove: sono di com'è andata l'ora. */}
            <th title={t.segnatoAiuto}>{t.segnato}</th>
            <th>{Molti(L.prova)}</th>
            <th>{Uno(L.media)}</th>
            <th>{corto(L.nota)}</th>
            {/* La colonna del check solo se il corso ne ha uno. */}
            {colonneCheck > 0 ? <th title={t.checkAiuto}>{Uno(L.check)}</th> : null}
          </>
        )}
        righe={matrice.righe.map((riga) => (
          <tr key={riga.allievo.id}>
            <th className="tabella__nome" scope="row">
              <CellaNome
                persona={riga.allievo}
                nome={(
                  <Collegamento
                    testo={nomeCompleto(riga.allievo)}
                    // Il nome porta alla scheda personale.
                    al={() => {
                      vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: riga.allievo.id } })
                    }}
                  />
                )}
              />
            </th>
            <td>{quota(riga)}</td>
            <td>{seguito(riga)}</td>
            <td className={riga.udAssenza > 0 ? 'tabella__cella--attenzione' : undefined}>
              {riga.udAssenza > 0 ? String(riga.udAssenza) : '—'}
            </td>
            <td>{String(riga.udPresenza)}</td>
            <td className="testo-quieto">{String(matrice.udPreviste)}</td>
            <td>{riga.ritardi > 0 ? String(riga.ritardi) : '—'}</td>
            <td>{segniSegnati(riga.allievo.id)}</td>
            <td className={riga.prove === 0 && momenti.length > 0 ? 'tabella__cella--attenzione' : undefined}>
              {`${riga.prove}/${momenti.length}`}
            </td>
            <td>
              {riga.media === null
                ? <span className="testo-quieto">—</span>
                : <span className="testo-quieto">{formattaVoto(riga.media)}</span>}
            </td>
            <td>
              {riga.nota === null
                ? <span className="testo-quieto">—</span>
                : (
                    <Pastiglia
                      testo={formattaVoto(riga.nota)}
                      tono={riga.nota >= scala.sufficienza ? 'positivo' : 'negativo'}
                    />
                  )}
            </td>
            {colonneCheck > 0 ? <td>{contoCheck(riga.allievo.id)}</td> : null}
          </tr>
        ))}
      />
    </Scheda>
  )
}

/**
 * La griglia del check dentro la scheda del corso, la stessa della pagina
 * Check. Assente senza colonne o senza allievi: le colonne si preparano nella
 * pagina Check.
 */
function grigliaDelCorso (corso: Corso, dati: DatiCorso): ReactNode {
  const check = checkDelCorso(stato.registro, corso.id)
  if (!check || check.colonne.length === 0 || dati.allievi.length === 0) return null
  return (
    <Scheda
      telaio="corsi:check"
      titolo={Uno(lessico().check)}
      classe="scheda--check"
      aiuto={testi().aiutoGriglia}
    >
      {/* Nessun pulsante per la pagina: sta fra i comandi in cima alla scheda. */}
      {grigliaCheck(corso, check, null)}
    </Scheda>
  )
}

// ------------------------------------------------------------ la matrice

/** Il corso nasce all'incrocio, e si apre qui sotto. */
async function accendiCorso (classe: Classe, materia: Materia): Promise<void> {
  const risposta = await azione({ tipo: 'corso.crea', classeId: classe.id, materiaId: materia.id })
  if (risposta.ok && risposta.creato) apriCorso(risposta.creato.id)
}

/**
 * Toglie il corso dopo che `chiediEliminazione` ha detto che cosa si porta via
 * (lezioni, voti, piani).
 */
async function spegniCorso (corso: Corso): Promise<void> {
  if (stato.registro.lezioni.some((l) => l.corsoId === corso.id)) return
  if (!(await chiediEliminazione({ genere: 'corso', id: corso.id }))) return
  await azione({ tipo: 'corso.elimina', corsoId: corso.id })
}

/**
 * Scrive una materia modificata nella riga. Passa da `validaMateria` come il
 * modulo: un nome vuoto o già usato non si scrive e il campo torna com'era.
 * Anche la materia nuova della riga in fondo nasce così.
 */
async function scriviMateria (materia: Materia, campo?: HTMLInputElement): Promise<boolean> {
  const pulita: Materia = { ...materia, nome: materia.nome.trim(), sigla: materia.sigla?.trim() ?? '' }
  const esito = validaMateria(pulita, stato.registro.materie)
  if (!esito.valido) {
    notifica(esito.errori.join(' '), 'avviso')
    if (campo) campo.value = campo.defaultValue
    return false
  }
  const risposta = await azione({ tipo: 'materia.salva', materia: pulita })
  if (!risposta.ok && campo) campo.value = campo.defaultValue
  return risposta.ok
}

/**
 * Elimina la materia se è libera; altrimenti c'è «unisci», e il cestino è
 * spento (`cestinoPer`).
 */
async function eliminaMateria (materia: Materia): Promise<void> {
  if (cestinoPer({ genere: 'materia', id: materia.id }).disabilitato) return
  await azione({ tipo: 'materia.elimina', materiaId: materia.id })
}

type CampoMateria = 'nome' | 'sigla' | 'colore'

/** Invio conferma il campo, Escape lo riporta com'era: tutti e due lo lasciano. */
function tastoCampo (evento: EventoTastiera<HTMLInputElement>): void {
  const bersaglio = evento.currentTarget
  if (evento.key === 'Enter') bersaglio.blur()
  if (evento.key === 'Escape') {
    bersaglio.value = bersaglio.defaultValue
    bersaglio.blur()
  }
}

/** I tre campi di una materia, in riga: colore, sigla, nome. */
function campiMateria (
  materia: Materia,
  chiave: string,
  cambia: (campo: CampoMateria, valore: string, input: HTMLInputElement) => void,
): ReactElement {
  const t = testi()
  const comune = (campo: CampoMateria) => ({
    className: `matrice-corsi__campo matrice-corsi__campo--${campo}`,
    type: campo === 'colore' ? 'color' : 'text',
    // testo-fisso: chiave del fuoco, non si legge
    'data-fuoco': `materia-${chiave}-${campo}`,
    onCambio: (evento: Event) => {
      const bersaglio = evento.target as HTMLInputElement
      cambia(campo, bersaglio.value, bersaglio)
    },
    onKeyDown: tastoCampo,
  })
  return (
    <>
      <Input
        {...comune('colore')}
        valore={materia.colore || '#7a7a7a'}
        aria-label={parole().colore}
        title={t.coloreMateria}
      />
      <Input
        {...comune('sigla')}
        valore={materia.sigla ?? ''}
        aria-label={t.sigla}
        // Vuota, vale quella ricavata dal nome, mostrata in trasparenza.
        placeholder={siglaMateria(materia) || t.siglaEsempio}
        maxLength={8}
        title={materia.sigla?.trim() ? t.siglaMateria : t.siglaVuota}
      />
      <Input
        {...comune('nome')}
        valore={materia.nome}
        aria-label={t.nomeMateria}
        placeholder={t.nomeMateria}
      />
    </>
  )
}

/**
 * L'intestazione di una riga: colore, sigla (vuota = `siglaMateria`) e nome
 * modificabili sul posto, e il cestino, acceso solo se nessun corso la usa. Il
 * tasto destro la unisce a un'altra.
 */
function testaMateria (materia: Materia, quante: number): ReactElement {
  const t = testi()
  const menu = (evento: EventoMouse<HTMLTableCellElement>) => {
    if ((evento.target as HTMLElement).closest('input')) return
    menuContestuale(evento.nativeEvent, [
      { titolo: materia.nome },
      { testo: `${parole().note}…`, simbolo: 'matita', al: () => moduloMateria(materia) },
      ...(quante > 1
        ? [{
            testo: t.unisci,
            simbolo: 'duplica',
            al: () => moduloUnisciMaterie(materia),
          } as const]
        : []),
    ])
  }
  return (
    <th className="matrice-corsi__materia" scope="row" onContextMenu={menu}>
      <span
        className="matrice-corsi__riga-materia"
        style={materia.colore ? { '--colore-materia': materia.colore } as CSSProperties : undefined}
      >
        {campiMateria(materia, materia.id, (campo, valore, input) => {
          // La materia si rilegge al gesto e non dal disegno: nel frattempo può esserne
          // arrivata una più fresca, che la fotografia sovrascriverebbe.
          const viva = materiaPerId(materia.id)
          if (!viva) return
          void scriviMateria({ ...viva, [campo]: valore }, input)
        })}
        <Pulsante
          simbolo="cestino"
          variante="fantasma"
          {...cestinoPer({ genere: 'materia', id: materia.id }, t.eliminaMateria)}
          al={() => eliminaMateria(materia)}
        />
      </span>
    </th>
  )
}

/** La riga in fondo: una materia nuova nasce appena ha un nome. */
function rigaNuovaMateria (colonne: number, quante: number): ReactElement {
  const bozza = creaMateria('')
  return (
    // La chiave cambia quando nasce una materia: la riga riparte vuota, come
    // quando il ridisegno riportava i campi al loro valore vuoto.
    // testo-fisso: una chiave, non un testo
    <tr key={`nuova:${quante}`} className="matrice-corsi__nuova">
      <th className="matrice-corsi__materia" scope="row">
        <span className="matrice-corsi__riga-materia">
          {campiMateria(bozza, 'nuova', (campo, valore, input) => {
            bozza[campo] = valore
            // Nasce col nome: colore e sigla scritti prima lo aspettano.
            if (campo !== 'nome') return
            if (!valore.trim()) return
            void scriviMateria(bozza, input)
          })}
        </span>
      </th>
      <td className="matrice-corsi__aiuto-nuova" colSpan={colonne}>
        {testi().nuovaMateria}
      </td>
    </tr>
  )
}

/** Una casella della matrice: vuota si accende, accesa si apre. */
function casellaCorso (
  classe: Classe,
  materia: Materia,
  corso: Corso | undefined,
  scelto: Corso | null,
): ReactElement {
  const t = testi()
  const dove = `${materia.nome} · ${classe.nome}`
  // testo-fisso: chiave del fuoco, non si legge
  const fuoco = `corso-${classe.id}-${materia.id}`
  if (!corso) {
    return (
      <td key={classe.id} className="matrice-corsi__cella">
        <button
          className="matrice-corsi__casella matrice-corsi__casella--vuota"
          type="button"
          data-fuoco={fuoco}
          title={t.apriIlCorso(dove)}
          aria-label={t.apriIlCorsoVoce(dove)}
          onClick={() => void accendiCorso(classe, materia)}
        >
          <Icona nome="piu" classe="icona--minuta" />
        </button>
      </td>
    )
  }
  const aperto = scelto?.id === corso.id
  // Un corso con lezioni non si toglie dalla matrice: prima si tolgono le ore.
  const lezioni = stato.registro.lezioni.filter((l) => l.corsoId === corso.id).length
  const menu = (evento: EventoMouse<HTMLTableCellElement>) =>
    menuContestuale(evento.nativeEvent, [
      { titolo: corso.titolo },
      { testo: t.apriQuiSotto, simbolo: 'destra', al: () => apriCorso(corso.id) },
      { testo: t.titoloEOrario, simbolo: 'matita', al: () => moduloCorso({ corso }) },
      'separatore',
      {
        testo: t.togliCorso,
        simbolo: 'cestino',
        pericolo: true,
        disabilitato: lezioni > 0,
        titolo: lezioni > 0 ? t.haLezioni(lezioni) : undefined,
        al: () => void spegniCorso(corso),
      },
    ])
  return (
    <td key={classe.id} className="matrice-corsi__cella" onContextMenu={menu}>
      <button
        className={classi(
          'matrice-corsi__casella',
          'matrice-corsi__casella--accesa',
          aperto && 'matrice-corsi__casella--aperta',
        )}
        type="button"
        data-fuoco={fuoco}
        // Il colore del corso (suo o della classe), lo stesso del calendario.
        style={{ '--colore-classe': coloreDiCorso(corso) } as CSSProperties}
        title={t.premiPerAprire(corso.titolo)}
        aria-pressed={aperto}
        onClick={() => apriCorso(corso.id)}
      >
        <Icona nome="spunta" classe="icona--minuta" />
      </button>
      {lezioni === 0
        ? (
            <button
              className="matrice-corsi__togli"
              type="button"
              title={t.togliIlCorso(dove)}
              aria-label={t.togliIlCorso(dove)}
              onClick={() => void spegniCorso(corso)}
            >
              <Icona nome="chiudi" classe="icona--minuta" />
            </button>
          )
        : null}
    </td>
  )
}

/**
 * Classi dell'anno in colonna, materie in riga: ogni incrocio è un corso. Le
 * classi archiviate restano fuori; le materie ci sono tutte, per poterle dare
 * a una classe.
 */
function matriceCorsi (): ReactElement {
  const classiAnno = classiDellAnno().filter((c) => !c.archiviata)
  const materie = [...stato.registro.materie].sort((a, b) => confrontaNomi(a.nome, b.nome))
  // Senza classi la matrice non ha colonne; senza materie resta la riga in fondo.
  const t = testi()
  if (classiAnno.length === 0) {
    return (
      <StatoVuoto
        simbolo="libro"
        titolo={t.nessunaClasse}
        testo={t.primaLaClasse}
        azione={(
          <Pulsante
            testo={titoloComando('registroDocenti.nuovaClasse')}
            variante="primario"
            simbolo="piu"
            al={() => moduloClasse()}
          />
        )}
      />
    )
  }
  const perIncrocio = new Map(
    corsiDellAnnoAperto().map((c) => [`${c.classeId}|${c.materiaId}`, c]),
  )
  const scelto = perIncrocio.size > 0 ? corsoDelContesto() : null
  return (
    <Tabella
      classi={{ telaio: 'matrice-corsi', tabella: 'matrice-corsi__tabella' }}
      // Larga quanto le classi dell'anno: un corso acceso o aperto non la riporta
      // a sinistra.
      telaio="matrice"
      scorrimento={`corsi:matrice:${annoCorrente()?.id ?? ''}`}
      intestazione={(
        <>
          <th className="matrice-corsi__angolo" scope="col">{Uno(lessico().materia)}</th>
          {classiAnno.map((classe) => (
            <th key={classe.id} className="matrice-corsi__classe" scope="col" title={classe.nome}>
              <span className="matrice-corsi__classe-testo">
                <PuntoColore colore={classe.colore} />
                {classe.nome}
              </span>
            </th>
          ))}
        </>
      )}
      righe={(
        <>
          {materie.map((materia) => (
            <tr key={materia.id}>
              {testaMateria(materia, materie.length)}
              {classiAnno.map((classe) =>
                casellaCorso(classe, materia, perIncrocio.get(`${classe.id}|${materia.id}`), scelto))}
            </tr>
          ))}
          {rigaNuovaMateria(classiAnno.length, materie.length)}
        </>
      )}
    />
  )
}

function VistaCorsi (): ReactElement {
  const t = testi()
  const anno = annoCorrente()
  if (!anno) {
    return (
      <div className="vista vista--corsi" data-telaio={telaioVista()}>
        <StatoVuotoAnno
          simbolo="libro"
          testo={t.corsoInUnAnno}
          crea={() => moduloAnno()}
        />
      </div>
    )
  }

  // Il corso scelto: dalla matrice o dalla tendina in cima, che sono la stessa scelta.
  const scelto = corsiDellAnnoAperto().length > 0 ? corsoDelContesto() : null
  const dati = scelto ? datiCorso(scelto) : null

  return (
    <div className="vista vista--corsi" data-telaio={telaioVista()}>
      <TestataVista
        titolo={Molti(lessico().corso)}
        sottotitolo={t.contiDel(nomeSemestreScelto())}
        aiuto={t.aiuto}
      />
      {matriceCorsi()}
      {scelto && dati
        ? (
            <div
              // Per corso: aprendone un altro le tabelle ripartono da capo.
              key={scelto.id}
              className="corso-dettaglio"
              // testo-fisso: una chiave, non un testo
              data-telaio={`corsi:${scelto.id}`}
            >
              <div className="corso-dettaglio__testa">
                {/* Il colore del corso sul bordo, lo stesso del calendario. */}
                <PuntoColore colore={coloreDiCorso(scelto)} />
                {schedaCorso(scelto, dati)}
              </div>
              {matriceDelCorso(scelto, dati)}
              {grigliaDelCorso(scelto, dati)}
            </div>
          )
        : null}
    </div>
  )
}

export function vistaCorsi (): ReactElement {
  return <VistaCorsi />
}
