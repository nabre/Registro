// Il piano di una lezione: la scaletta delle attività e i materiali. Vive più a
// lungo dell'ora (si riassegna, si copia per l'anno dopo), per questo le
// risorse stanno con lui. L'editor delle attività è in `planActivity.tsx`.

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactElement,
} from 'react'

import {
  contaUd,
  minutiDiAttivita,
  minutiEffettivi,
} from '#core/dominio/calculations.js'
import { attivitaValutata } from '#core/dominio/activities.js'
import { formattaData, formattaDurata, formattaUd } from '#core/dominio/dates.js'
import { creaPiano } from '#core/dominio/factories.js'
import { importaAttivitaDelProgetto, propostaImportazione } from '#core/dominio/projectPlanning.js'
import { parole } from '#core/dominio/words.testi.js'
import type {
  Attivita,
  Lezione,
  PianoLezione,
  Progetto,
  Risorsa,
} from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Input } from '#ui/fields.js'
import {
  Avviso,
  Campo,
  conAttesa,
  Pastiglia,
  Pulsante,
  Quieto,
  Riga,
  SezioneModulo,
  StatoVuoto,
  valoriModulo,
} from '#ui/components/base.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione, invia } from '#ui/bridge.js'
import {
  classeDelCorsoId,
  corsiDi,
  nomeCorso,
  nomeDiPiano,
  pianiPerCorso,
  postoCorrente,
  progettiPerIlCorso,
  stato,
  vai,
} from '#ui/state.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { titoloComando } from '#contract/manifest.js'

import { testi } from './plan.testi.js'
import { BloccoRisorse } from './resources.js'
import {
  salva,
  tastoDuplica,
  tastoElimina,
  testo,
} from './common.js'
import { campoCorso } from './course.js'
import { editorAttivita, voceFerma, type GestoreRisorse } from './planActivity.js'
import { testi as testiProgetto } from './projectPlan.testi.js'

/**
 * Sceglie un piano, o nessuno, senza lasciare la pagina: in quella dei piani
 * diventa quel che si guarda (senza, si torna al corso); altrove resta solo
 * nel contesto.
 */
function scegliPiano (pianoId: string | null): void {
  const qui = postoCorrente()
  if (qui.pagina !== 'pagina.corso.piani') {
    vai(qui, { contesto: { pianoId }, elementoChiesto: false })
    return
  }
  const corsoId = stato.contesto.corsoId
  vai(
    pianoId
      ? { pagina: qui.pagina, soggetto: { tipo: 'piano', id: pianoId } }
      : corsoId
        ? { pagina: qui.pagina, soggetto: { tipo: 'corso', id: corsoId } }
        : { pagina: qui.pagina },
    { contesto: { pianoId }, elementoChiesto: pianoId !== null },
  )
}

/**
 * Gli stati particolari di un piano, detti aprendo la modifica: il corso, le
 * ore che lo usano, le spunte, i voti nati dalle tappe. Quel che si cambia qui
 * si sente altrove. Prima vengono quelli che impediscono il salvataggio.
 */
function statiDelPiano (base: PianoLezione): Array<{ testo: string, blocca: boolean }> {
  const t = testi()
  const avvisi: Array<{ testo: string, blocca: boolean }> = []
  const corsi = stato.registro.corsi
  const suo = base.corsoId ? corsi.find((c) => c.id === base.corsoId) ?? null : null

  if (corsi.length === 0) {
    avvisi.push({ testo: t.nessunCorso, blocca: true })
  } else if (!base.corsoId) {
    avvisi.push({ testo: t.senzaCorso, blocca: true })
  } else if (!suo) {
    avvisi.push({ testo: t.corsoSparito, blocca: true })
  }

  const usi = stato.registro.lezioni.filter((l) => l.pianoId === base.id)
  if (usi.length > 1) {
    avvisi.push({ testo: t.piuOre(usi.length), blocca: false })
  }

  // Togliere una tappa toglie la sua spunta, che era il consuntivo di un'ora fatta.
  const conSpunte = usi.filter((l) => l.avanzamento.some((a) => a.stato !== 'da-fare'))
  if (conSpunte.length > 0) {
    avvisi.push({ testo: t.oreConSpunte(conSpunte.length), blocca: false })
  }

  // I voti restano, ma il momento perde la riga di scaletta da cui era nato.
  const daTappe = stato.registro.valutazioni.filter(
    (v) => v.pianoId === base.id && Boolean(v.attivitaId),
  )
  if (daTappe.length > 0) {
    const voti = daTappe.reduce(
      (somma, m) => somma + m.voti.filter((x) => x.valore !== null).length,
      0,
    )
    avvisi.push({ testo: t.momentiDalleTappe(daTappe.length, voti), blocca: false })
  }

  return avvisi
}

/** I campi di un piano, staccati dalla finestra che li contiene. */
interface EditorPiano {
  /** Il corpo dei campi: si mette in una modale o dentro una pagina, una volta sola. */
  corpo: ReactElement
  /** Il piano com'è adesso nei campi, pronto da mandare al registro. */
  componi: () => PianoLezione
  /** Quello da cui è partito: l'id e tutto ciò che i campi non toccano. */
  base: PianoLezione
  /** Apre l'importazione dalla scaletta di un progetto, su quella fase. */
  importa: (progettoId?: string, faseId?: string) => void
}

interface OpzioniEditorPiano {
  piano?: PianoLezione
  /** Il corso da proporre a un piano nuovo: chi apre l'editor di solito lo sa. */
  corsoDaProporre?: string | null
  /** L'ora per cui lo si prepara: la scaletta si posa sulle sue UD. */
  lezione?: Lezione | null
  /**
   * Chiamata a ogni modifica confermata (campo lasciato, tappa spostata,
   * allegato), per chi salva da sé campo per campo come nella pagina; nella
   * modale salva il suo pulsante.
   */
  allaModifica?: () => void
  /**
   * Il corso lo detta la selezione di fuori (l'ora scelta nella pagina dei
   * piani), quindi resta una riga e non una tendina che sposterebbe il piano per
   * sbaglio. Senza corso (eliminato), la tendina resta: è l'unico posto per
   * riagganciarlo.
   */
  corsoDettato?: boolean
}

/** Quel che il corpo disegnato offre a chi lo contiene. */
interface Maniglia {
  componi: () => PianoLezione
  importa: (progettoId?: string, faseId?: string) => void
}

/**
 * L'editor di un piano senza la finestra intorno: lo stesso corpo nella modale
 * e nella pagina «Piani lezione». Il piano di partenza si decide qui, una volta:
 * il corpo lo legge solo all'apertura, e da lì la bozza è sua.
 */
export function editorPiano (opzioni: OpzioniEditorPiano): EditorPiano {
  // Il piano nasce sul corso indicato, o su quello della classe filtrata se è
  // uno solo; resta cambiabile.
  const corsiDelFiltro = stato.filtroClasseId ? corsiDi(stato.filtroClasseId) : []
  const base: PianoLezione =
    opzioni.piano ??
    creaPiano(
      opzioni.corsoDaProporre ?? (corsiDelFiltro.length === 1 ? corsiDelFiltro[0].id : null),
    )
  const maniglia: { current: Maniglia | null } = { current: null }
  return {
    corpo: <CorpoPiano opzioni={opzioni} base={base} maniglia={maniglia} />,
    // Il corpo è disegnato prima che chi lo contiene possa chiedere (la modale
    // si disegna subito): senza, il piano è quello di partenza.
    componi: () => maniglia.current?.componi() ?? base,
    base,
    importa: (progettoId, faseId) => maniglia.current?.importa(progettoId, faseId),
  }
}

/** Le copie che l'editor tocca, staccate dal registro. */
function copiaAttivita (attivita: Attivita[]): Attivita[] {
  // Copia profonda di quel che l'editor tocca: con `parametri` e `valutazione`
  // condivisi con `stato.registro`, «Annulla» non ripristinerebbe niente.
  return attivita.map((a) => ({
    ...a,
    valutazione: a.valutazione ? { ...a.valutazione } : a.valutazione,
    parametri: a.parametri ? { ...a.parametri } : a.parametri,
    risorse: [...a.risorse],
  }))
}

function CorpoPiano ({ opzioni, base, maniglia }: {
  opzioni: OpzioniEditorPiano
  base: PianoLezione
  maniglia: { current: Maniglia | null }
}): ReactElement {
  const t = testi()
  const L = lessico()
  const lezione = opzioni.lezione
  // La tendina del corso resta dove c'è un corso da scegliere.
  const corsoFermo = Boolean(opzioni.corsoDettato && base.corsoId)
  const corpo = useRef<HTMLDivElement | null>(null)
  /** La scaletta come sta nell'editor, che la cambia sul posto. */
  const attivita = useRef<Attivita[] | null>(null)
  attivita.current ??= copiaAttivita(base.attivita)
  /** Cresce a ogni importazione: l'editor della scaletta riparte dalle tappe nuove. */
  const [edizione, nuovaEdizione] = useReducer((volte: number) => volte + 1, 0)
  // Le risorse del piano non passano dai campi (le scrive l'host copiando un
  // file): si rileggono dal registro, se no si cancellerebbe l'allegato appena messo.
  const risorse = useRef<Risorsa[]>(base.risorse)
  const [risorsePiano, impostaRisorsePiano] = useState<Risorsa[]>(base.risorse)
  // Quel che c'è da sapere prima di toccare, detto all'apertura.
  const [particolari] = useState(() => (opzioni.piano ? statiDelPiano(base) : []))
  const ultima = useRef(opzioni.allaModifica)
  useLayoutEffect(() => { ultima.current = opzioni.allaModifica })
  const allaModifica = () => ultima.current?.()

  /** Il piano com'è adesso nel modulo, pronto da mandare. */
  const componiPiano = (valori: Record<string, string | number | boolean>): PianoLezione => ({
    ...base,
    corsoId: corsoFermo ? base.corsoId : testo(valori.corsoId) || null,
    obiettivi: String(valori.obiettivi ?? '')
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean),
    prerequisiti: testo(valori.prerequisiti),
    tag: base.tag ?? [],
    risorse: risorse.current,
    attivita: attivita.current ?? [],
  })
  const componi = (): PianoLezione =>
    componiPiano(corpo.current ? valoriModulo(corpo.current) : {})

  /**
   * Il piano salvato prima di allegarci qualcosa: l'host deve sapere di quale
   * piano e tappa è il file. Per questo allegare a un piano nuovo lo fa esistere.
   */
  const salvaAdesso = async (): Promise<boolean> => {
    const risposta = await invia({ tipo: 'piano.salva', piano: componi() })
    if (!risposta.ok) {
      notifica((risposta.errori ?? [t.nonSalvato]).join(' '), 'avviso')
      return false
    }
    return true
  }

  /** Le risorse come stanno adesso nel registro: del piano, o di una sua tappa. */
  const rilette = (attivitaId: string | null): Risorsa[] | null => {
    const salvato = stato.registro.piani.find((p) => p.id === base.id)
    if (!salvato) return null
    if (!attivitaId) return salvato.risorse
    return salvato.attivita.find((a) => a.id === attivitaId)?.risorse ?? null
  }

  // Chi disegna risorse si registra qui, e un giro solo li rinfresca tutti:
  // prima quelle del piano, perché le tappe salvano subito dopo e il piano
  // composto deve già portarle.
  const ultimeLetture = useRef({ rilette, salvaAdesso })
  useLayoutEffect(() => { ultimeLetture.current = { rilette, salvaAdesso } })
  const [gestoreRisorse] = useState<GestoreRisorse>(() => {
    const rinfrescatori = new Set<() => void>()
    return {
      pianoId: base.id,
      prima: () => ultimeLetture.current.salvaAdesso(),
      rilette: (attivitaId) => ultimeLetture.current.rilette(attivitaId),
      registra: (rinfresca) => {
        rinfrescatori.add(rinfresca)
        return () => { rinfrescatori.delete(rinfresca) }
      },
      rinfrescaTutto: () => {
        const fresche = ultimeLetture.current.rilette(null)
        if (fresche) {
          risorse.current = fresche
          impostaRisorsePiano(fresche)
        }
        for (const rinfresca of rinfrescatori) rinfresca()
      },
    }
  })

  // Tutti i progetti dell'anno, quelli già integrati nel corso prima: importare
  // da uno degli altri lo integra nel corso del piano (lo fa l'host).
  const importaDalProgetto = (progettoChiesto?: string, faseChiesta?: string): void => {
    const tp = testiProgetto()
    const piano = componi()
    const progetti = progettiPerIlCorso(piano.corsoId)
    const primo = progetti.find((p) => p.id === progettoChiesto) ?? progetti[0]
    const scelta: SceltaImportazione = {
      progettoId: primo?.id ?? '',
      faseId: primo?.fasi.find((f) => f.id === faseChiesta)?.id ?? primo?.fasi[0]?.id ?? '',
      selezionate: new Set<string>(),
    }
    preseleziona(scelta, piano, lezione)
    apriModale({
      titolo: tp.importa,
      larghezza: 'media',
      corpo: () => <CorpoImportazione scelta={scelta} piano={piano} progetti={progetti} lezione={lezione ?? null} />,
      testoSalva: tp.importaSelezionate,
      alSalva: (_valori, contesto) => {
        const scelto = progettoDi(scelta)
        if (!scelto || scelta.selezionate.size === 0) {
          contesto.mostraErrori([tp.seleziona])
          return
        }
        // La proposta è ricalcolata sul registro vivo; nessuna scrittura fino
        // alla conferma della bozza, come per le attività aggiunte a mano.
        const vivo = componi()
        const daImportare = propostaImportazione(
          stato.registro, vivo, scelto, scelta.faseId, [...scelta.selezionate], lezione,
        )
        if (daImportare.importabili.length < scelta.selezionate.size) {
          contesto.mostraErrori([tp.oltre])
          return
        }
        attivita.current = importaAttivitaDelProgetto(
          stato.registro, vivo, scelto, scelta.faseId, [...scelta.selezionate], lezione,
        ).attivita
        nuovaEdizione()
        contesto.chiudi()
        allaModifica()
      },
    })
  }

  // Le ultime funzioni per chi tiene la maniglia: leggono il disegno di adesso.
  useLayoutEffect(() => {
    maniglia.current = { componi, importa: importaDalProgetto }
  })
  useEffect(() => () => { maniglia.current = null }, [maniglia])

  // Ogni `change` dei campi è una modifica confermata; gli `input` no, per non
  // salvare a ogni lettera. Le tappe hanno il loro `allaModifica`.
  const salvaDaSe = Boolean(opzioni.allaModifica)
  useEffect(() => {
    const nodo = corpo.current
    if (!nodo || !salvaDaSe) return
    const alCambio = () => ultima.current?.()
    nodo.addEventListener('change', alCambio)
    return () => nodo.removeEventListener('change', alCambio)
  }, [salvaDaSe])

  // Il campo del corso è di una parte che ha la sua vita: si disegna una volta.
  const [campoDelCorso] = useState(() => (corsoFermo
    ? voceFerma(Uno(L.corso), nomeCorso(base.corsoId), t.aiutoCorsoDettato)
    : campoCorso({
        valore: base.corsoId ?? '',
        richiesto: true,
        aiuto: t.aiutoCorso,
      })))

  return (
    <div ref={corpo} className="modulo">
      {/* Quel che c'è da sapere prima di toccare: corso mancante, ore che usano la
          scaletta, spunte e voti già usciti. */}
      {particolari.length > 0
        ? (
            <Avviso tono={particolari.some((v) => v.blocca) ? 'attenzione' : 'informativo'}>
              <ul className="elenco-avviso">
                {particolari.map((v) => <li key={v.testo}>{v.testo}</li>)}
              </ul>
            </Avviso>
          )
        : null}
      {/* Nessun titolo: il nome si compone dal corso. Tre sezioni, nell'ordine in cui
          si prepara: di che cosa parla l'ora (obiettivi e prerequisiti: quel che la
          rende ritrovabile), come la si spende, che cosa serve. */}
      <SezioneModulo titolo={t.diCheCosaParla}>
        <Riga>{campoDelCorso}</Riga>
        <Riga>
          <Campo
            nome="obiettivi"
            etichetta={t.obiettivi}
            tipo="textarea"
            righe={4}
            valore={base.obiettivi.join('\n')}
            aiuto={t.aiutoObiettivi}
            larghezza="meta"
          />
          <Campo
            nome="prerequisiti"
            etichetta={t.prerequisiti}
            tipo="textarea"
            righe={4}
            valore={base.prerequisiti ?? ''}
            aiuto={t.aiutoPrerequisiti}
            larghezza="meta"
          />
        </Riga>
      </SezioneModulo>
      {/* La spiegazione dietro la «i»; che allegare salva il piano resta in vista. */}
      <SezioneModulo titolo={{ testo: Uno(L.scaletta), aiuto: t.aiutoScaletta }}>
        <p className="testo-quieto">{t.allegareSalva}</p>
        <Pulsante
          testo={testiProgetto().importa}
          simbolo="progetto"
          variante="sottile"
          al={() => importaDalProgetto()}
        />
        <div>
          {/* Un'importazione rifà da capo l'editor della scaletta, con le tappe nuove. */}
          <Fragment key={edizione}>
            {editorAttivita(
              attivita.current,
              (nuove) => {
                attivita.current = nuove
                allaModifica()
              },
              lezione,
              gestoreRisorse,
              () => {
                const scelto = corpo.current?.querySelector<HTMLSelectElement>('[name="corsoId"]')?.value
                return classeDelCorsoId(scelto || base.corsoId)?.docenteDiClasse ?? false
              },
              base.corsoId,
            )}
          </Fragment>
        </div>
      </SezioneModulo>
      {/* Il materiale di tutta l'ora, non di una tappa (la dispensa, il video d'apertura). */}
      <SezioneModulo titolo={{ testo: t.risorseDelPiano, aiuto: t.aiutoRisorse }}>
        <div>
          <BloccoRisorse
            pianoId={base.id}
            attivitaId={null}
            risorse={risorsePiano}
            prima={gestoreRisorse.prima}
            dopo={gestoreRisorse.rinfrescaTutto}
          />
        </div>
      </SezioneModulo>
    </div>
  )
}

// ------------------------------------------------- importare da un progetto

/** Quel che si sta scegliendo nella finestra d'importazione: la legge anche il salvataggio. */
interface SceltaImportazione {
  progettoId: string
  faseId: string
  selezionate: Set<string>
}

function progettoDi (scelta: SceltaImportazione): Progetto | undefined {
  return stato.registro.progetti.find((p) => p.id === scelta.progettoId)
}

function proposta (scelta: SceltaImportazione, piano: PianoLezione, lezione: Lezione | null | undefined, ids: string[]) {
  const scelto = progettoDi(scelta)
  return scelto
    ? propostaImportazione(stato.registro, piano, scelto, scelta.faseId, ids, lezione)
    : null
}

function candidatiDellaFase (scelta: SceltaImportazione, piano: PianoLezione, lezione: Lezione | null | undefined) {
  return proposta(scelta, piano, lezione, (progettoDi(scelta)?.attivita ?? []).map((a) => a.id))?.candidati ?? []
}

function giaPianificate (scelta: SceltaImportazione): Set<string> {
  return new Set(stato.registro.piani
    .flatMap((p) => p.attivita)
    .filter((a) => a.progettoId === scelta.progettoId && a.attivitaProgettoId)
    .map((a) => a.attivitaProgettoId as string))
}

/** Spunta da sé quel che sta nell'ora e non è già in un piano. */
function preseleziona (scelta: SceltaImportazione, piano: PianoLezione, lezione: Lezione | null | undefined): void {
  const pianificate = giaPianificate(scelta)
  const candidati = candidatiDellaFase(scelta, piano, lezione).filter((a) => !pianificate.has(a.id))
  const iniziale = proposta(scelta, piano, lezione, candidati.map((a) => a.id))
  scelta.selezionate = new Set(iniziale?.importabili.map((a) => a.id) ?? [])
}

function CorpoImportazione ({ scelta, piano, progetti, lezione }: {
  scelta: SceltaImportazione
  piano: PianoLezione
  progetti: Progetto[]
  lezione: Lezione | null
}): ReactElement {
  const tp = testiProgetto()
  // La scelta vive nell'oggetto che legge anche il salvataggio: qui si ridisegna.
  const [, ridisegna] = useReducer((volte: number) => volte + 1, 0)
  const scelto = progettoDi(scelta)
  const attuale = proposta(scelta, piano, lezione, [...scelta.selezionate])
  const candidati = candidatiDellaFase(scelta, piano, lezione)
  const pianificate = giaPianificate(scelta)
  const totale = candidati.filter((a) => scelta.selezionate.has(a.id))
    .reduce((s, a) => s + a.durataUd, 0)
  const minuti = (ud: number) =>
    formattaDurata(minutiDiAttivita(ud, stato.registro.impostazioni.minutiUd))
  const restanti = candidati.filter((a) =>
    !pianificate.has(a.id) && !attuale?.importabili.some((i) => i.id === a.id),
  ).length
  const unita = lezione ? contaUd(lezione, stato.registro.impostazioni.minutiUd) : 0
  const perUd = lezione && unita > 0
    ? minutiEffettivi(lezione) / unita
    : stato.registro.impostazioni.minutiUd

  return (
    <>
      <Campo
        nome="progettoImportazione"
        etichetta={Uno(lessico().progetto)}
        tipo="select"
        valore={scelta.progettoId}
        opzioni={[
          { valore: '', testo: tp.scegliProgetto },
          ...progetti.map((p) => ({ valore: p.id, testo: p.titolo })),
        ]}
        al={(valore) => {
          scelta.progettoId = valore
          scelta.faseId = progettoDi(scelta)?.fasi[0]?.id ?? ''
          preseleziona(scelta, piano, lezione)
          ridisegna()
        }}
      />
      {scelto
        ? (
            <Campo
              nome="faseImportazione"
              etichetta={tp.fase}
              tipo="select"
              valore={scelta.faseId}
              opzioni={scelto.fasi.map((f) => ({ valore: f.id, testo: f.titolo }))}
              al={(valore) => {
                scelta.faseId = valore
                preseleziona(scelta, piano, lezione)
                ridisegna()
              }}
            />
          )
        : null}
      <p className="testo-quieto">{tp.ordine}</p>
      {candidati.length === 0
        ? <Quieto>{tp.nessuna}</Quieto>
        : (
            <div className="colonne-check">
              {candidati.map((a) => (
                <label key={a.id} className="campo-tappa campo-tappa--sino">
                  <Input
                    type="checkbox"
                    spuntato={scelta.selezionate.has(a.id)}
                    data-attivita-progetto-id={a.id}
                    onCambio={(evento) => {
                      if ((evento.target as HTMLInputElement).checked) scelta.selezionate.add(a.id)
                      else scelta.selezionate.delete(a.id)
                      ridisegna()
                    }}
                  />
                  <span>{`${a.titolo || parole().senzaTitolo} · ${minuti(a.durataUd)}`}</span>
                  {pianificate.has(a.id)
                    ? (
                        <Pastiglia
                          testo={[tp.pianificata, ...stato.registro.lezioni.filter((l) => {
                            const p = stato.registro.piani.find((p) => p.id === l.pianoId)
                            return p?.attivita.some((tappa) =>
                              tappa.progettoId === scelta.progettoId && tappa.attivitaProgettoId === a.id,
                            )
                          }).map((l) => formattaData(l.data))].join(' · ')}
                          tono="informativo"
                        />
                      )
                    : null}
                </label>
              ))}
            </div>
          )}
      {attuale
        ? (
            <p className="testo-quieto" data-importazione-riepilogo="true">
              {attuale.disponibiliUd === null
                ? tp.senzaOra(minuti(totale))
                : tp.selezione(
                    minuti(totale), formattaDurata(minutiDiAttivita(attuale.disponibiliUd, perUd)),
                  )}
            </p>
          )
        : null}
      {attuale && attuale.importabili.length < scelta.selezionate.size
        ? <Avviso tono="attenzione">{tp.oltre}</Avviso>
        : null}
      {attuale && restanti > 0
        ? <p className="testo-quieto">{tp.residuo(restanti)}</p>
        : null}
    </>
  )
}

// ------------------------------------------------------------- le finestre

export function moduloPiano (
  piano?: PianoLezione,
  /**
   * Che cosa fare col piano appena creato. Può essere asincrona (chi apre da una
   * lezione ci assegna subito il piano): `salva` la aspetta.
   */
  dopo?: (pianoId: string) => void | Promise<void>,
  /** Il corso da proporre a un piano nuovo: chi apre il modulo di solito lo sa. */
  corsoDaProporre?: string | null,
  /** L'ora per cui lo si prepara: la scaletta si posa sulle sue UD. */
  lezione?: Lezione | null,
  /**
   * Il progetto (e la fase) da cui importare appena aperto: lo chiede la
   * pagina Integrazione progetti, che programma la scaletta nei piani.
   */
  importa?: { progettoId: string, faseId?: string },
): void {
  const t = testi()
  const modifica = Boolean(piano)
  const editor = editorPiano({ piano, corsoDaProporre, lezione })

  apriModale({
    titolo: modifica ? t.modificaPiano : titoloComando('registroDocenti.nuovoPiano'),
    larghezza: 'larga',
    corpo: () => editor.corpo,
    alSalva: async (_valori, contesto) => {
      const aggiornato = editor.componi()
      await salva(
        contesto,
        { tipo: 'piano.salva', piano: aggiornato },
        modifica ? t.aggiornato : t.creato,
        async (idCreato) => {
          const pianoId = idCreato ?? aggiornato.id
          if (dopo) {
            await dopo(pianoId)
            return
          }
          vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: pianoId } })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? (
            <>
              {tastoDuplica({
                contesto,
                azione: { tipo: 'piano.duplica', pianoId: editor.base.id },
                fatto: t.duplicato,
                poi: (idCreato) => scegliPiano(idCreato),
              })}
              {tastoElimina({
                contesto,
                chiedi: { genere: 'piano', id: editor.base.id },
                azione: { tipo: 'piano.elimina', pianoId: editor.base.id },
                fatto: t.eliminato,
                poi: () => scegliPiano(null),
              })}
            </>
          )
        : null,
  })
  // Dopo la finestra del piano, sopra di lei: l'importazione è una finestra figlia.
  if (importa) editor.importa(importa.progettoId, importa.faseId)
}


/** Sceglie quale piano assegnare a una lezione, con l'anteprima della scaletta. */
export function moduloAssegnaPiano (lezione: Lezione): void {
  const t = testi()
  // I piani della materia del corso, di qualunque anno.
  const piani = pianiPerCorso(lezione.corsoId)
  // Il cambio fra UD del piano e minuti è quello dell'ora vera.
  const udDelDocumento = stato.registro.impostazioni.minutiUd
  const udDellOra = contaUd(lezione, udDelDocumento)
  const minutiUd = udDellOra > 0 ? minutiEffettivi(lezione) / udDellOra : udDelDocumento

  /**
   * Il piano nuovo nasce già al suo posto: sul corso di questa lezione, e
   * assegnato a lei appena salvato.
   */
  const creaEAssegna = (contesto: ContestoModale) => {
    contesto.chiudi()
    moduloPiano(
      undefined,
      async (pianoId) => {
        const risposta = await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
        if (risposta.ok) notifica(t.creatoEAssegnato, 'successo')
      },
      lezione.corsoId,
      lezione,
    )
  }

  apriModale({
    titolo: t.assegnaUnPiano,
    sottotitolo: formattaData(lezione.data, 'lungo'),
    larghezza: 'media',
    corpo: (contesto) => {
      if (piani.length === 0) {
        return (
          <StatoVuoto
            simbolo="piano"
            titolo={t.nessunPiano}
            testo={t.nessunPianoTesto}
            azione={(
              <Pulsante
                testo={t.creaUnPiano}
                variante="primario"
                simbolo="piu"
                al={() => creaEAssegna(contesto)}
              />
            )}
          />
        )
      }

      const disponibili = `${formattaDurata(minutiEffettivi(lezione))} (${formattaUd(udDellOra)})`
      return (
        <div className="elenco-scelta">
          <Quieto>{t.lezioneDi(disponibili)}</Quieto>
          {piani.map((piano) => {
            const durata = piano.attivita.reduce((s, a) => s + a.durataUd, 0)
            const prove = piano.attivita.filter(attivitaValutata).length
            const scostamento = durata - udDellOra
            return (
              <button
                key={piano.id}
                className={classi('voce-scelta', lezione.pianoId === piano.id && 'voce-scelta--attiva')}
                type="button"
                onClick={(evento) =>
                  void conAttesa(
                    evento.currentTarget,
                    (async () => {
                      const risposta = await azione({
                        tipo: 'piano.assegna',
                        lezioneId: lezione.id,
                        pianoId: piano.id,
                      })
                      if (!risposta.ok) return
                      contesto.chiudi()
                      notifica(t.assegnato, 'successo')
                    })(),
                  )}
              >
                <div className="voce-scelta__testo">
                  <strong>{nomeDiPiano(piano)}</strong>
                  <small>
                    {t.attivitaPer(
                      piano.attivita.length,
                      formattaDurata(minutiDiAttivita(durata, minutiUd)),
                    ) +
                      // Se l'ora porta dei voti: cambia come si prepara la lezione.
                      (prove > 0 ? ` · ${t.prove(prove)}` : '')}
                  </small>
                </div>
                {Math.abs(scostamento) >= 0.05
                  ? (
                      <Pastiglia
                        testo={scostamento > 0
                          ? t.minutiInPiu(minutiDiAttivita(scostamento, minutiUd))
                          : t.minutiInMeno(minutiDiAttivita(-scostamento, minutiUd))}
                        tono={scostamento > 0 ? 'attenzione' : 'quiete'}
                      />
                    )
                  : <Pastiglia testo={t.inOrario} tono="positivo" />}
              </button>
            )
          })}
          <div className="elenco-scelta__piede">
            {/* Nessuno va bene: se ne fa uno, già di questo corso e di questa lezione. */}
            <Pulsante
              testo={t.nuovoPerLaLezione}
              variante="sottile"
              simbolo="piu"
              al={() => creaEAssegna(contesto)}
            />
            {lezione.pianoId
              ? (
                  <Pulsante
                    testo={t.togliAssegnato}
                    variante="sottile"
                    simbolo="chiudi"
                    al={async () => {
                      const risposta = await azione({
                        tipo: 'piano.assegna',
                        lezioneId: lezione.id,
                        pianoId: null,
                      })
                      if (!risposta.ok) return
                      contesto.chiudi()
                      notifica(t.rimosso, 'info')
                    }}
                  />
                )
              : null}
          </div>
        </div>
      )
    },
  })
}
