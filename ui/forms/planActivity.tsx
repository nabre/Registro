// L'editor della scaletta di un piano: le attività una per una, con i loro
// parametri, lo svolgimento e la valutazione, posate sui gruppi di unità
// didattiche della lezione quando ce n'è una sotto. Il piano che le contiene,
// e i moduli che lo aprono, stanno in `plan.tsx`.

import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  MINUTI_MINIMI_ATTIVITA,
  PASSO_MINUTI_ATTIVITA,
  arrotondaMinutiAttivita,
  minutiAttivita,
  minutiDiAttivita,
  scalettaSulleUd,
  udDaMinutiAttivita,
} from '#core/dominio/calculations.js'
import {
  colonneCheckDi,
  nomeTipoAttivita,
  parametriDi,
  riassuntoParametri,
  valoreParametro,
} from '#core/dominio/activities.js'
import { checkDelCorso } from '#core/dominio/check.js'
import { coloreDiVoce, testoDiVoce, vociConValore } from '#core/dominio/lists.js'
import { formattaData, formattaDurata, formattaUd, sommaMinuti } from '#core/dominio/dates.js'
import { creaAttivita } from '#core/dominio/factories.js'
import type {
  Attivita,
  Lezione,
  Risorsa,
  TipoValutazione,
} from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Input, Select, TextArea } from '#ui/fields.js'
import { Pastiglia, Pulsante, Quieto } from '#ui/components/base.js'
import { menuSotto } from '#ui/components/menu.js'
import { SceltaProgettoFase, sceltaDetta, type ProgettoEFase } from '#ui/components/projectPhasePicker.js'
import { Icona } from '#ui/components/icons.js'
import { Suggerimento, useIdSuggerimento } from '#ui/components/hint.js'
import { stato } from '#ui/state.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'

import { parole } from '#core/dominio/words.testi.js'
import { testi } from './planActivity.testi.js'
import { testi as testiProgetto } from './projectPlan.testi.js'
import { BloccoRisorse } from './resources.js'
import { aggiungiFase, moduloProgetto } from './project.js'
import {
  numero,
  PresaDiRiga,
  spostaVoce,
  useRiordino,
  vociTipoAttivita,
} from './common.js'

/**
 * Quando cade una tappa sull'ora vera, intervalli compresi. Oltre la fine
 * dell'ora non ci sono più UD né pause: l'orologio va avanti dalla fine della
 * lezione, e quanto si sfora si dice in rosso invece dei puntini. L'editor e la
 * scaletta dell'ora lo dicono allo stesso modo, per questo sta qui una volta.
 */
export function OrarioTappa ({ sulleUd, indice, classe }: {
  sulleUd: ReturnType<typeof scalettaSulleUd>
  indice: number
  classe?: string
}): ReactElement {
  const t = testi()
  const suo = sulleUd.posti[indice] ?? null
  const fineLezione = sulleUd.blocchi.at(-1)?.fine ?? null
  const sforo = suo ? suo.a - sulleUd.minutiLezione : 0
  const oraInizio = suo?.oraInizio ??
    (suo && fineLezione ? sommaMinuti(fineLezione, suo.da - sulleUd.minutiLezione) : null)
  const oraFine = suo?.oraFine ??
    (sforo > 0 && fineLezione ? sommaMinuti(fineLezione, sforo) : null)

  return (
    <span
      className={classi('orario-tappa', classe, sforo > 0 && 'orario-tappa--sfora')}
      title={sforo > 0 ? `${t.quandoCade} · ${t.sforaDi(sforo)}` : t.quandoCade}
    >
      {oraInizio && oraFine
        ? <span className="orario-tappa__ore">{`${oraInizio}–${oraFine}`}</span>
        : '—'}
      {sforo > 0
        ? (
            <span className="orario-tappa__sforo">
              {/* Il segno solo sulla tappa che comincia dentro e sfora: quelle
                  tutte fuori stanno già sotto «Oltre la fine». */}
              {suo?.ud !== null
                ? <span aria-hidden="true">{t.sforoBreve(sforo)}</span>
                : null}
              <span className="orario-tappa__per-lettori">{t.sforaDi(sforo)}</span>
            </span>
          )
        : null}
    </span>
  )
}

/**
 * Il legame fra un controllo e la «i» accanto alla sua etichetta: la
 * spiegazione nascosta lo descrive (`aria-describedby`) e il nome gli torna
 * con `aria-label`, perché il pulsante dentro la `<label>` farebbe «Peso
 * Spiegazione: Peso».
 */
interface Lega {
  'aria-describedby'?: string
  'aria-label'?: string
}

/**
 * Un campo del dettaglio di una tappa: etichetta visibile sopra, controllo
 * sotto. Un campo già riempito senza etichetta non dice che cosa chiede.
 */
function CampoTappa ({ etichetta, aiuto, largo, children }: {
  etichetta: string
  aiuto?: string
  /** Un campo di testo libero, che vuole spazio per farsi leggere. */
  largo?: boolean
  children: (lega: Lega) => ReactNode
}): ReactElement {
  const id = useIdSuggerimento()
  const lega: Lega = aiuto ? { 'aria-describedby': id, 'aria-label': etichetta } : {}
  return (
    <label className={classi('campo-tappa', largo && 'campo-tappa--largo')}>
      <span className="campo-tappa__etichetta">
        {etichetta}
        {aiuto ? <Suggerimento testo={aiuto} etichetta={etichetta} id={id} /> : null}
      </span>
      {children(lega)}
    </label>
  )
}

/** Una casella sì/no del dettaglio: la domanda sta accanto alla spunta. */
function SpuntaTappa ({ etichetta, acceso, al, aiuto }: {
  etichetta: string
  acceso: boolean
  al: (acceso: boolean) => void
  aiuto?: string
}): ReactElement {
  // Niente `title`, la spiegazione sta dietro la «i» (che non spunta la casella:
  // `Suggerimento` ferma il clic).
  const id = useIdSuggerimento()
  return (
    <label className="campo-tappa campo-tappa--sino">
      <Input
        type="checkbox"
        spuntato={acceso}
        aria-describedby={aiuto ? id : undefined}
        aria-label={aiuto ? etichetta : undefined}
        onCambio={(evento) => al((evento.target as HTMLInputElement).checked)}
      />
      <span className="campo-tappa__etichetta">
        {etichetta}
        {aiuto ? <Suggerimento testo={aiuto} etichetta={etichetta} id={id} /> : null}
      </span>
    </label>
  )
}

/** Una tendina del dettaglio, dentro la `<label>` del suo campo. */
function TendinaTappa ({ voci, valore, al, lega }: {
  voci: ReadonlyArray<{ valore: string, testo: string }>
  valore: string
  al: (valore: string) => void
  lega: Lega
}): ReactElement {
  return (
    <Select
      className="campo__controllo campo__controllo--selezione"
      valore={valore}
      {...lega}
      onCambio={(evento) => al((evento.target as HTMLSelectElement).value)}
    >
      {voci.map((voce) => <option key={voce.valore} value={voce.valore}>{voce.testo}</option>)}
    </Select>
  )
}

/**
 * Un gruppo di campi del dettaglio col suo titolino: svolgimento, parametri
 * del tipo, prova, materiale. I campi arrivano con la loro chiave. È un
 * `<fieldset>`: chi legge lo schermo sente il nome del gruppo entrando nei suoi
 * campi, cosa che un titolo staccato non fa. La «i» sta sul titolo quando il
 * gruppo ha un controllo solo, che altrimenti ripeterebbe il nome sopra di sé.
 */
function gruppoTappa (
  titolo: string,
  figli: ReactNode[],
  classe?: string,
  aiuto?: string,
): ReactNode {
  const campi = figli.filter(Boolean)
  if (campi.length === 0) return null
  return (
    <fieldset className={classi('gruppo-tappa', classe)}>
      <legend className="gruppo-tappa__titolo">
        {titolo}
        {aiuto ? <Suggerimento testo={aiuto} etichetta={titolo} /> : null}
      </legend>
      <div className="gruppo-tappa__campi">{campi}</div>
    </fieldset>
  )
}

/**
 * I campi che dipendono dal tipo dell'attività: compaiono e spariscono col
 * tipo, ma quel che si era scritto resta nel file, così un cambio per sbaglio
 * non cancella niente. Le voci delle tendine vengono dalle liste di sistema
 * (Impostazioni → Liste).
 */
function campiParametri (voce: Attivita, alCambio: () => void): ReactNode[] {
  const parametri = parametriDi(voce.tipo)
  if (parametri.length === 0) return []

  const scrivi = (chiave: string, valore: string | number | boolean | undefined) => {
    const attuali = { ...(voce.parametri ?? {}) }
    if (valore === undefined || valore === '' || valore === false) delete attuali[chiave]
    else attuali[chiave] = valore
    voce.parametri = Object.keys(attuali).length > 0 ? attuali : undefined
    alCambio()
  }

  return parametri.map((parametro) => {
    const valore = valoreParametro(voce, parametro.chiave)

    if (parametro.tipo === 'sino') {
      return (
        <SpuntaTappa
          key={parametro.chiave}
          etichetta={parametro.etichetta}
          acceso={valore === true}
          al={(acceso) => scrivi(parametro.chiave, acceso)}
          aiuto={parametro.aiuto}
        />
      )
    }

    if (parametro.tipo === 'scelta') {
      // Il valore scelto resta offerto anche se la lista non lo ha più, se no il
      // primo salvataggio lo cambierebbe di nascosto.
      const voci = parametro.lista
        ? vociConValore(
            stato.registro.impostazioni,
            parametro.lista,
            valore === undefined ? null : String(valore),
          )
        : []
      return (
        <CampoTappa key={parametro.chiave} etichetta={parametro.etichetta} aiuto={parametro.aiuto}>
          {(lega) => (
            <TendinaTappa
              voci={[{ valore: '', testo: '—' }, ...voci]}
              valore={valore === undefined ? '' : String(valore)}
              al={(scelto) => scrivi(parametro.chiave, scelto)}
              lega={lega}
            />
          )}
        </CampoTappa>
      )
    }

    const numerico = parametro.tipo === 'numero'
    return (
      <CampoTappa
        key={parametro.chiave}
        etichetta={parametro.unita ? `${parametro.etichetta} (${parametro.unita})` : parametro.etichetta}
        aiuto={parametro.aiuto}
      >
        {(lega) => (
          <Input
            className={classi('campo__controllo', numerico && 'campo__controllo--numero')}
            type={numerico ? 'number' : 'text'}
            valore={valore === undefined ? '' : String(valore)}
            placeholder={parametro.segnaposto ?? ''}
            // Senza passo fisso: suggerisce, non rifiuta quel che non ci cade sopra.
            min={numerico ? 0 : undefined}
            step={numerico ? 'any' : undefined}
            {...lega}
            onCambio={(evento) => {
              const scritto = (evento.target as HTMLInputElement).value.trim()
              if (numerico) {
                scrivi(parametro.chiave, scritto === '' ? undefined : numero(scritto, 0))
                return
              }
              scrivi(parametro.chiave, scritto === '' ? undefined : scritto)
            }}
          />
        )}
      </CampoTappa>
    )
  })
}

const SCELTE_MINUTI = [5, 10, 15, 20, 25, 30, 45, 60]

/**
 * Selettore calibrato della durata della tappa:
 * - Scelte rapide in multipli di 5 minuti (5, 10, 15, 20, 25, 30, 45, 60 min).
 * - Passo di decremento (-5 min) e incremento (+5 min).
 * - Aiuto esplicito sulla calibrazione a blocchi di 5 minuti (minimo 5 minuti).
 */
function campiDurata (
  voce: Attivita,
  perUd: number,
  alCambio: () => void,
): ReactNode[] {
  const t = testi()
  const minutiAttuali = minutiAttivita(voce, perUd)

  const impostaMinuti = (nuoviMinuti: number) => {
    const arrotondati = arrotondaMinutiAttivita(nuoviMinuti)
    voce.durataUd = udDaMinutiAttivita(arrotondati, perUd)
    alCambio()
  }

  return [
    <div key="durata" className="durata-tappa">
      <div className="selettore-durata">
        {SCELTE_MINUTI.map((m) => (
          <button
            key={m}
            className={classi('selettore-durata__chip', minutiAttuali === m && 'selettore-durata__chip--attivo')}
            type="button"
            aria-pressed={minutiAttuali === m}
            onClick={() => impostaMinuti(m)}
          >
            {t.minutiBreve(m)}
          </button>
        ))}
        <span className="selettore-durata__separatore" aria-hidden="true" />
        <button
          className="selettore-durata__chip"
          type="button"
          disabled={minutiAttuali <= MINUTI_MINIMI_ATTIVITA}
          onClick={() => impostaMinuti(minutiAttivita(voce, perUd) - PASSO_MINUTI_ATTIVITA)}
        >
          {t.diminuisciMinuti(PASSO_MINUTI_ATTIVITA)}
        </button>
        <button
          className="selettore-durata__chip"
          type="button"
          onClick={() => impostaMinuti(minutiAttivita(voce, perUd) + PASSO_MINUTI_ATTIVITA)}
        >
          {t.aumentaMinuti(PASSO_MINUTI_ATTIVITA)}
        </button>
      </div>
      <div className="durata-tappa__aiuto">{t.aiutoMultipliCinque}</div>
    </div>,
  ]
}

/** Come si svolge la tappa (descrizione, raggruppamento, materiali): vale per ogni tipo. */
function campiSvolgimento (voce: Attivita, alCambio: () => void): ReactNode[] {
  const t = testi()
  return [
    <CampoTappa key="descrizione" etichetta={t.comeSiSvolge}>
      {() => (
        <TextArea
          className="campo__controllo campo__controllo--area campo-tappa__testo"
          rows={2}
          valore={voce.descrizione ?? ''}
          placeholder={t.segnapostoSvolgimento}
          onCambio={(evento) => {
            voce.descrizione = (evento.target as HTMLTextAreaElement).value
            alCambio()
          }}
        />
      )}
    </CampoTappa>,
    <CampoTappa key="raggruppamento" etichetta={t.comeLavoraLaClasse}>
      {(lega) => (
        <TendinaTappa
          voci={vociConValore(
            stato.registro.impostazioni,
            'raggruppamento',
            voce.raggruppamento ?? 'plenaria',
          )}
          valore={voce.raggruppamento ?? 'plenaria'}
          al={(scelto) => {
            voce.raggruppamento = scelto as Attivita['raggruppamento']
            alCambio()
          }}
          lega={lega}
        />
      )}
    </CampoTappa>,
    <CampoTappa key="materiali" etichetta={t.materialeDAula} aiuto={t.aiutoMateriale} largo>
      {(lega) => (
        <Input
          className="campo__controllo"
          type="text"
          valore={voce.materiali ?? ''}
          placeholder={t.segnapostoMateriale}
          {...lega}
          onCambio={(evento) => {
            voce.materiali = (evento.target as HTMLInputElement).value
            alCambio()
          }}
        />
      )}
    </CampoTappa>,
  ]
}

/**
 * La prova che una tappa prevede. Sta sull'attività perché una lezione può
 * averne due; il momento con i voti nasce nella lezione in cui si fa. Spenta è
 * una casella sola; accesa chiede titolo, tipo e peso.
 */
function campiValutazione (voce: Attivita, alCambio: () => void): ReactNode[] {
  const t = testi()
  const prevista = voce.valutazione ?? null

  const acceso = (
    <SpuntaTappa
      key="prova"
      etichetta={t.eUnaProva}
      acceso={prevista !== null}
      al={(attiva) => {
        // Spenta, la prova si toglie; riaccesa riparte da scritto, peso 1.
        voce.valutazione = attiva ? voce.valutazione ?? { titolo: '', tipo: 'scritto', peso: 1 } : null
        alCambio()
      }}
      aiuto={t.aiutoProva}
    />
  )

  if (!prevista) return [acceso]

  return [
    acceso,
    <CampoTappa key="titolo" etichetta={t.titoloProva}>
      {() => (
        <Input
          className="campo__controllo"
          type="text"
          valore={prevista.titolo}
          // Vuoto vuol dire «come la tappa», che è quasi sempre il titolo giusto.
          placeholder={voce.titolo || t.comeLaTappa}
          onCambio={(evento) => {
            if (!voce.valutazione) return
            voce.valutazione.titolo = (evento.target as HTMLInputElement).value.trim()
            alCambio()
          }}
        />
      )}
    </CampoTappa>,
    <CampoTappa key="tipo" etichetta={t.tipoProva}>
      {(lega) => (
        <TendinaTappa
          voci={vociConValore(stato.registro.impostazioni, 'tipoValutazione', prevista.tipo)}
          valore={prevista.tipo}
          al={(scelto) => {
            if (!voce.valutazione) return
            voce.valutazione.tipo = scelto as TipoValutazione
            alCambio()
          }}
          lega={lega}
        />
      )}
    </CampoTappa>,
    <CampoTappa key="peso" etichetta={t.peso} aiuto={t.zeroNonFaMedia}>
      {(lega) => (
        <Input
          className="campo__controllo campo__controllo--numero"
          type="number"
          valore={String(prevista.peso)}
          // Passo libero: un passo fisso rifiuterebbe i decimali.
          min={0}
          max={10}
          step="any"
          {...lega}
          onCambio={(evento) => {
            if (!voce.valutazione) return
            voce.valutazione.peso = Math.min(
              10,
              Math.max(0, numero((evento.target as HTMLInputElement).value, 1)),
            )
            alCambio()
          }}
        />
      )}
    </CampoTappa>,
  ]
}

/**
 * La pendenza (consegna del corso) da evadere durante questa tappa.
 */
function campiPendenze (
  voce: Attivita,
  corsoId: string | null,
  alCambio: () => void,
): ReactNode[] {
  const t = testi()
  const consegnaId = typeof voce.parametri?.consegnaId === 'string' ? voce.parametri.consegnaId : ''
  const attiva = Boolean(consegnaId)

  const consegne = corsoId
    ? stato.registro.consegne.filter((c) => c.corsoId === corsoId)
    : stato.registro.consegne

  const interruttore = (
    <SpuntaTappa
      key="interruttore"
      etichetta={t.dedicataAPendenze}
      acceso={attiva}
      al={(accesa) => {
        const attuali = { ...(voce.parametri ?? {}) }
        if (accesa) {
          attuali.consegnaId = consegne[0]?.id ?? 'tutte'
        } else {
          delete attuali.consegnaId
        }
        voce.parametri = Object.keys(attuali).length > 0 ? attuali : undefined
        alCambio()
      }}
      aiuto={t.aiutoPendenze}
    />
  )

  if (!attiva) return [interruttore]

  const voci = [
    { valore: 'tutte', testo: t.tutteLePendenze },
    ...consegne.map((c) => ({
      valore: c.id,
      testo: `${c.testo}${c.scadenza ? ` (${formattaData(c.scadenza, 'giorno')})` : ''}`,
    })),
  ]

  return [
    interruttore,
    <CampoTappa key="quale" etichetta={t.qualePendenza} aiuto={t.aiutoQualePendenza}>
      {(lega) => (
        <TendinaTappa
          voci={voci}
          valore={consegnaId || 'tutte'}
          al={(scelta) => {
            const attuali = { ...(voce.parametri ?? {}) }
            attuali.consegnaId = scelta
            voce.parametri = attuali
            alCambio()
          }}
          lega={lega}
        />
      )}
    </CampoTappa>,
  ]
}

/**
 * Le colonne del check del corso da verificare durante questa tappa: tutte,
 * oppure quelle spuntate (almeno una).
 */
function campiCheck (
  voce: Attivita,
  corsoId: string | null,
  alCambio: () => void,
): ReactNode[] {
  const t = testi()
  const checkColonnaId =
    typeof voce.parametri?.checkColonnaId === 'string' ? voce.parametri.checkColonnaId : ''
  const attiva = Boolean(checkColonnaId)

  const check = corsoId ? checkDelCorso(stato.registro, corsoId) : null
  const colonne = check?.colonne ?? []

  const interruttore = (
    <SpuntaTappa
      key="interruttore"
      etichetta={t.dedicataACheck}
      acceso={attiva}
      al={(accesa) => {
        const attuali = { ...(voce.parametri ?? {}) }
        if (accesa) {
          attuali.checkColonnaId = colonne[0]?.id ?? 'tutte'
        } else {
          delete attuali.checkColonnaId
        }
        voce.parametri = Object.keys(attuali).length > 0 ? attuali : undefined
        alCambio()
      }}
      aiuto={t.aiutoCheck}
    />
  )

  if (!attiva) return [interruttore]

  const legate = colonneCheckDi(voce)
  const tutte = legate.length === 0 || legate.includes('tutte')
  const scrivi = (ids: string[]): void => {
    voce.parametri = { ...(voce.parametri ?? {}), checkColonnaId: ids.join(',') }
    alCambio()
  }

  // Togliendo «tutte» restano spuntate tutte le colonne, una per una: si parte
  // da quel che si vedeva e se ne toglie qualcuna.
  const caselle: ReactNode[] = [
    casellaColonna('tutte', t.tuttoIlCheck, tutte, colonne.length === 0, (accesa) =>
      scrivi(accesa ? ['tutte'] : colonne.map((c) => c.id))),
  ]
  for (const colonna of colonne) {
    const legata = tutte || legate.includes(colonna.id)
    // L'ultima non si toglie: una tappa del check senza colonne si spegne
    // dall'interruttore.
    const ultima = !tutte && legata && legate.length === 1
    caselle.push(casellaColonna(colonna.id, colonna.titolo, legata, tutte || ultima, (accesa) => {
      // Nell'ordine delle colonne; gli id di colonne sparite restano in coda.
      // Le legate di adesso, non del disegno: due spunte nello stesso giro si sommano.
      const ora = colonneCheckDi(voce)
      const scelte = accesa ? [...ora, colonna.id] : ora.filter((id) => id !== colonna.id)
      const sparite = scelte.filter((id) => !colonne.some((c) => c.id === id))
      scrivi(colonne.map((c) => c.id).filter((id) => scelte.includes(id)).concat(sparite))
    }))
  }

  return [
    interruttore,
    <div
      key="colonne"
      className="campo-tappa campo-tappa--colonne"
      role="group"
      aria-label={t.qualeColonnaCheck}
    >
      <span className="campo-tappa__etichetta">
        {t.qualeColonnaCheck}
        <Suggerimento testo={t.aiutoQualeColonnaCheck} etichetta={t.qualeColonnaCheck} />
      </span>
      {caselle}
    </div>,
  ]
}

/**
 * Il progetto dell'anno, e la sua fase, per cui lavora questa tappa: le lezioni
 * del progetto si ricavano da qui, e una prova della tappa nasce già sua. Un
 * controllo solo, che dice la scelta e apre l'elenco dei progetti con le fasi.
 */
function campiProgetto (
  voce: Attivita,
  corsoId: string | null,
  alCambio: () => void,
): ReactNode[] {
  const scegli = (scelta: ProgettoEFase): void => {
    if (voce.progettoId !== scelta.progettoId) delete voce.attivitaProgettoId
    if (scelta.progettoId) {
      voce.progettoId = scelta.progettoId
      voce.faseProgettoId = scelta.faseProgettoId
    } else {
      delete voce.progettoId
      delete voce.faseProgettoId
      delete voce.attivitaProgettoId
    }
    alCambio()
  }
  // Senza etichetta sua: il titolo del gruppo la dice già, e il pulsante si
  // nomina da sé («Progetto: …»).
  return [
    <SceltaProgettoFase
      key="progetto"
      corsoId={corsoId}
      valore={{
        progettoId: voce.progettoId ?? null,
        faseProgettoId: voce.faseProgettoId ?? null,
      }}
      al={scegli}
      nuovaFase={(progetto) => {
        void aggiungiFase(progetto).then((faseId) => {
          if (faseId) scegli({ progettoId: progetto.id, faseProgettoId: faseId })
        })
      }}
      // Il progetto nasce nella biblioteca dell'anno; salvando il piano, la
      // tappa legata lo integra nel corso (lo fa l'host).
      nuovoProgetto={() => moduloProgetto({
        dopo: (progettoId) => scegli({ progettoId, faseProgettoId: null }),
      })}
    />,
    voce.progettoId && voce.attivitaProgettoId !== null
      ? <p key="sincronizzata" className="testo-quieto">{testiProgetto().sincronizzata}</p>
      : null,
  ]
}

/** Una colonna del check da spuntare nel dettaglio della tappa. */
function casellaColonna (
  chiave: string,
  titolo: string,
  accesa: boolean,
  bloccata: boolean,
  al: (accesa: boolean) => void,
): ReactElement {
  return (
    <label key={chiave} className="campo-tappa campo-tappa--sino">
      <Input
        type="checkbox"
        spuntato={accesa}
        disabled={bloccata}
        onCambio={(evento) => al((evento.target as HTMLInputElement).checked)}
      />
      <span className="campo-tappa__etichetta">{titolo}</span>
    </label>
  )
}

/**
 * Che cosa serve alla scaletta per allegare file mentre la si scrive. L'editor
 * lavora su una copia, ma i file li copia l'host e deve sapere di quale piano
 * sono: prima di allegare il piano si salva (`prima`), e dopo la copia locale
 * rilegge le risorse (`rilette`), se no il salvataggio seguente cancellerebbe
 * l'allegato.
 */
export interface GestoreRisorse {
  pianoId: string
  prima: () => Promise<boolean>
  rilette: (attivitaId: string | null) => Risorsa[] | null
  /**
   * Chi disegna un elenco di risorse registra qui come ridisegnarsi, e chiama
   * `rinfrescaTutto` a ogni cambio: una risorsa può spostarsi fra tappe. Torna
   * la funzione che lo cancella, quando l'elenco se ne va.
   */
  registra: (rinfresca: () => void) => () => void
  rinfrescaTutto: () => void
}

interface OpzioniEditorAttivita {
  iniziali: Attivita[]
  allaModifica: (attivita: Attivita[]) => void
  lezione?: Lezione | null
  gestore?: GestoreRisorse
  /**
   * Se sulla classe di questo piano si fa anche il docente di classe. Una
   * funzione perché il corso può cambiare a modulo aperto.
   */
  docenteDiClasse: () => boolean
  corsoId?: string | null
  nascondiProgetto?: boolean
}

/**
 * L'editor della scaletta. Con una lezione sotto, le attività si posano sui
 * suoi gruppi di unità didattiche: si vede dove cade ciascuna e quanto resta.
 * Le attività di partenza si leggono una volta: da lì la bozza è sua.
 */
export function editorAttivita (
  iniziali: Attivita[],
  allaModifica: (attivita: Attivita[]) => void,
  lezione?: Lezione | null,
  gestore?: GestoreRisorse,
  docenteDiClasse: () => boolean = () => false,
  corsoId?: string | null,
  opzioni: { nascondiProgetto?: boolean } = {},
): ReactElement {
  return (
    <EditorAttivita
      iniziali={iniziali}
      allaModifica={allaModifica}
      lezione={lezione}
      gestore={gestore}
      docenteDiClasse={docenteDiClasse}
      corsoId={corsoId}
      nascondiProgetto={opzioni.nascondiProgetto}
    />
  )
}

function EditorAttivita (opzioni: OpzioniEditorAttivita): ReactElement {
  const { lezione, gestore, allaModifica, docenteDiClasse } = opzioni
  const idCorso = opzioni.corsoId ?? lezione?.corsoId ?? null
  /**
   * La bozza: le tappe com'erano all'apertura, poi cambiate sul posto. Sta in
   * un riferimento perché due gesti nello stesso giro vedano tutti e due
   * l'ultima; il disegno lo chiede `ridisegna`.
   */
  const bozza = useRef<Attivita[] | null>(null)
  bozza.current ??= opzioni.iniziali.map((a) => ({ ...a }))
  /** Le tappe col dettaglio aperto. */
  const aperte = useRef(new Set<string>())
  const [, ridisegna] = useReducer((volte: number) => volte + 1, 0)
  const contenitore = useRef<HTMLDivElement | null>(null)
  /** Dove portare il fuoco a disegno fatto: la presa della tappa spostata, il titolo di quella nuova. */
  const fuocoDopo = useRef<string | null>(null)
  const attivita = bozza.current

  useLayoutEffect(() => {
    const selettore = fuocoDopo.current
    if (!selettore) return
    fuocoDopo.current = null
    contenitore.current?.querySelector<HTMLElement>(selettore)?.focus()
  })

  /** Una modifica confermata: si ridisegna e lo si dice a chi salva. */
  const cambiato = (): void => {
    ridisegna()
    allaModifica(bozza.current ?? [])
  }

  // Le risorse le riscrive l'host: dopo un allegato si rileggono dal registro,
  // per tutte le tappe, perché una può essersi spostata.
  const ultimo = useRef({ gestore, cambiato })
  useLayoutEffect(() => { ultimo.current = { gestore, cambiato } })
  useEffect(() => gestore?.registra(() => {
    const { gestore: suo, cambiato: avvisa } = ultimo.current
    if (!suo) return
    for (const voce of bozza.current ?? []) {
      const fresche = suo.rilette(voce.id)
      if (fresche) voce.risorse = fresche
    }
    avvisa()
  }), [gestore])

  /**
   * La tappa in `da` portata in `a` (posizioni). Il fuoco torna sulla presa
   * della tappa spostata.
   */
  const posa = (da: number, a: number) => {
    const elenco = bozza.current ?? []
    if (a < 0 || a >= elenco.length || da === a) return
    const spostata = elenco[da].id
    bozza.current = spostaVoce(elenco, da, a)
    fuocoDopo.current = `[data-attivita-id="${CSS.escape(spostata)}"] .presa-riga` // testo-fisso: selettore CSS
    cambiato()
  }
  // Senza `elenco`: fra le righe stanno pause e gruppi, e il fuoco dopo uno
  // spostamento lo porta `fuocoDopo` per id invece che per posizione.
  const { riga: riordina, presa } = useRiordino(posa)

  const t = testi()
  const totale = attivita.reduce((somma, a) => somma + a.durataUd, 0)
  // La scaletta posata sulle UD dell'ora: quanto è presa ciascuna, e che cosa
  // resta fuori dalla lezione.
  const { minutiUd } = stato.registro.impostazioni
  const sulleUd = lezione ? scalettaSulleUd(attivita, lezione, minutiUd) : null
  const posto = (indice: number) => sulleUd?.posti[indice] ?? null
  // Nel piano le durate si scrivono in minuti, sotto restano UD: il cambio è
  // quello dell'ora vera se c'è, altrimenti quello del documento.
  const perUd = sulleUd?.minutiPerUd ?? minutiUd

  /**
   * Quel che una tappa ha dentro, in una riga (raggruppamento, parametri, prova,
   * allegati): serve a dettaglio chiuso.
   */
  const sommarioTappa = (voce: Attivita): ReactNode => {
    const pezzi: ReactElement[] = []
    const raggruppamento = voce.raggruppamento ?? 'plenaria'
    if (raggruppamento !== 'plenaria') {
      pezzi.push(
        <Pastiglia
          key="raggruppamento"
          testo={testoDiVoce(stato.registro.impostazioni, 'raggruppamento', raggruppamento)}
          tono="informativo"
        />,
      )
    }
    if (voce.valutazione) {
      pezzi.push(
        <Pastiglia
          key="valutazione"
          testo={testoDiVoce(stato.registro.impostazioni, 'tipoValutazione', voce.valutazione.tipo) +
            (voce.valutazione.peso !== 1 ? t.conPeso(voce.valutazione.peso) : '')}
          tono="attenzione"
          simbolo="valutazioni"
        />,
      )
    }
    if (voce.risorse.length > 0) {
      pezzi.push(<Pastiglia key="risorse" testo={String(voce.risorse.length)} tono="quiete" simbolo="allegato" />)
    }
    if (voce.parametri?.consegnaId) {
      const cId = String(voce.parametri.consegnaId)
      const c = stato.registro.consegne.find((x) => x.id === cId)
      pezzi.push(<Pastiglia key="pendenza" testo={c ? c.testo : t.pendenze} tono="attenzione" simbolo="allegato" />)
    }
    const progettoDetto = sceltaDetta({
      progettoId: voce.progettoId ?? null,
      faseProgettoId: voce.faseProgettoId ?? null,
    })
    if (progettoDetto) pezzi.push(<Pastiglia key="progetto" testo={progettoDetto} tono="informativo" simbolo="progetto" />)
    const colonneCheck = colonneCheckDi(voce)
    if (colonneCheck.length > 0) {
      const check = idCorso ? checkDelCorso(stato.registro, idCorso) : null
      for (const kId of colonneCheck) {
        const col = check?.colonne.find((x) => x.id === kId)
        pezzi.push(<Pastiglia key={`check:${kId}`} testo={col ? col.titolo : t.check} tono="informativo" simbolo="check" />)
      }
    }

    // La descrizione prima e in chiaro: è quel che si rilegge scorrendo.
    const detto = [
      voce.descrizione?.trim(),
      riassuntoParametri(voce, stato.registro.impostazioni),
      voce.materiali?.trim(),
    ]
      .filter(Boolean)
      .join(' · ')

    if (pezzi.length === 0 && !detto) return null
    return (
      <div className="attivita-riga__sommario">
        {detto ? <span className="attivita-riga__detto">{detto}</span> : null}
        {pezzi}
      </div>
    )
  }

  /**
   * Una tappa in riga: numero, titolo, tipo, durata, quando, su una griglia
   * comune dichiarata dall'elenco, per confrontarle in colonna. Sotto c'è il
   * dettaglio, chiuso finché non lo si apre, con una riga di sommario al suo posto.
   */
  const rigaAttivita = (voce: Attivita, indice: number): ReactElement => {
    const aperta = aperte.current.has(voce.id)
    const suo = posto(indice)

    // Quanto si prende questa tappa del suo gruppo di UD (o, senza ora sotto,
    // dell'intera scaletta): è il filo colorato in fondo alla riga.
    const minuti = minutiAttivita(voce, perUd)
    const suoBlocco = sulleUd?.blocchi[suo?.blocco ?? -1] ?? null
    const riferimento = suoBlocco ? suoBlocco.capienza : minutiDiAttivita(totale, perUd)
    const percento = riferimento > 0 ? Math.round((minuti / riferimento) * 100) : 0
    const quotaDetta = suoBlocco
      ? t.quotaDelGruppo(minuti, riferimento, percento)
      : t.quotaDellaScaletta(minuti, riferimento, percento)

    const dettagliId = `dettagli-tappa-${voce.id}` // testo-fisso: id del dettaglio

    // Il tipo è una pastiglia con la sua tinta, che premuta apre l'elenco: lascia
    // spazio al titolo.
    const vociDelTipo = vociTipoAttivita().filter(
      // La docenza di classe solo dove la si fa; se una tappa ce l'ha già resta
      // visibile, se no il primo salvataggio la cambierebbe di nascosto.
      (v) =>
        v.valore !== 'docenza-di-classe' ||
        docenteDiClasse() ||
        voce.tipo === 'docenza-di-classe',
    )
    const nomeDelTipo = nomeTipoAttivita(voce.tipo, stato.registro.impostazioni)

    return (
      <li
        key={voce.id}
        className={classi(
          'attivita-riga',
          aperta && 'attivita-riga--aperta',
          suo?.ud === null && 'attivita-riga--fuori',
          suo?.aCavallo && 'attivita-riga--a-cavallo',
          suo?.oltreLaPausa && 'attivita-riga--oltre-la-pausa',
        )}
        data-attivita-id={voce.id}
        // La tinta del tipo viene dalla lista dei tipi, come variabile sulla riga:
        // filetto, punto, pastiglia e filo la leggono da qui.
        style={{ '--tinta-tappa': coloreDiVoce(stato.registro.impostazioni, 'tipoAttivita', voce.tipo) } as CSSProperties}
        {...riordina(indice)}
      >
        <div className="attivita-riga__ordine">
          <PresaDiRiga {...presa(indice)} />
          <span className="attivita-riga__numero">{String(indice + 1)}</span>
        </div>
        <Input
          className="campo__controllo attivita-riga__titolo"
          type="text"
          valore={voce.titolo}
          placeholder={t.segnapostoTitolo}
          aria-label={t.titoloAttivita}
          onCambio={(evento) => {
            voce.titolo = (evento.target as HTMLInputElement).value
            cambiato()
          }}
        />
        <button
          className="attivita-riga__tipo"
          type="button"
          title={t.tipoPremi(nomeDelTipo)}
          aria-label={t.tipoDiAttivita(nomeDelTipo)}
          aria-haspopup="menu"
          onClick={(evento) =>
            menuSotto(
              evento.currentTarget,
              vociDelTipo.map((v) => ({
                testo: v.testo,
                accesa: voce.tipo === v.valore,
                al: () => {
                  voce.tipo = v.valore as Attivita['tipo']
                  cambiato()
                },
              })),
            )}
        >
          <span className="attivita-riga__punto" />
          <span className="attivita-riga__tipo-testo">{nomeDelTipo}</span>
        </button>
        <div className="attivita-riga__durata">
          <button
            className="attivita-riga__passo"
            type="button"
            disabled={minuti <= MINUTI_MINIMI_ATTIVITA}
            title={t.diminuisciMinuti(PASSO_MINUTI_ATTIVITA)}
            aria-label={t.diminuisciMinuti(PASSO_MINUTI_ATTIVITA)}
            onClick={() => {
              voce.durataUd = udDaMinutiAttivita(minutiAttivita(voce, perUd) - PASSO_MINUTI_ATTIVITA, perUd)
              cambiato()
            }}
          >
            −
          </button>
          <Input
            className="campo__controllo campo__controllo--numero attivita-riga__durata-input"
            type="number"
            valore={String(minuti)}
            min={MINUTI_MINIMI_ATTIVITA}
            step={PASSO_MINUTI_ATTIVITA}
            aria-label={t.durataInMinuti}
            onCambio={(evento) => {
              const val = numero((evento.target as HTMLInputElement).value, minuti)
              voce.durataUd = udDaMinutiAttivita(val, perUd)
              cambiato()
            }}
          />
          <button
            className="attivita-riga__passo"
            type="button"
            title={t.aumentaMinuti(PASSO_MINUTI_ATTIVITA)}
            aria-label={t.aumentaMinuti(PASSO_MINUTI_ATTIVITA)}
            onClick={() => {
              voce.durataUd = udDaMinutiAttivita(minutiAttivita(voce, perUd) + PASSO_MINUTI_ATTIVITA, perUd)
              cambiato()
            }}
          >
            +
          </button>
          <span className="attivita-riga__unita">{t.min}</span>
        </div>
        {/* L'ora dell'orologio, intervalli compresi; la colonna c'è solo con un'ora sotto. */}
        {sulleUd ? <OrarioTappa sulleUd={sulleUd} indice={indice} classe="attivita-riga__orario" /> : null}
        <div className="attivita-riga__azioni">
          <Pulsante
            simbolo={aperta ? 'su' : 'giu'}
            variante="fantasma"
            classe="attivita-riga__apri"
            titolo={aperta ? t.chiudiDettaglio : t.dettaglioTappa}
            aria-expanded={aperta}
            aria-controls={aperta ? dettagliId : undefined}
            al={() => {
              if (aperta) aperte.current.delete(voce.id)
              else aperte.current.add(voce.id)
              ridisegna()
            }}
          />
          <Pulsante
            simbolo="cestino"
            variante="fantasma"
            titolo={t.togliAttivita}
            al={() => {
              bozza.current = (bozza.current ?? []).filter((a) => a.id !== voce.id)
              aperte.current.delete(voce.id)
              cambiato()
            }}
          />
        </div>
        {aperta ? null : sommarioTappa(voce)}
        {aperta
          ? (
              <div className="attivita-riga__dettagli" id={dettagliId}>
                {gruppoTappa(t.durataTappa, campiDurata(voce, perUd, cambiato))}
                {gruppoTappa(t.svolgimento, campiSvolgimento(voce, cambiato))}
                {/* Il titolo dice di quale tipo sono i campi: cambiando tipo il gruppo cambia. */}
                {gruppoTappa(
                  t.dettagliDi(nomeTipoAttivita(voce.tipo, stato.registro.impostazioni)),
                  campiParametri(voce, cambiato),
                )}
                {gruppoTappa(
                  t.valutazione,
                  campiValutazione(voce, cambiato),
                  voce.valutazione ? 'gruppo-tappa--prova' : undefined,
                )}
                {gruppoTappa(
                  t.pendenze,
                  campiPendenze(voce, idCorso, cambiato),
                  voce.parametri?.consegnaId ? 'gruppo-tappa--pendenza' : undefined,
                )}
                {gruppoTappa(
                  t.check,
                  campiCheck(voce, idCorso, cambiato),
                  voce.parametri?.checkColonnaId ? 'gruppo-tappa--check' : undefined,
                )}
                {opzioni.nascondiProgetto
                  ? null
                  : gruppoTappa(
                      Uno(lessico().progetto),
                      campiProgetto(voce, idCorso, cambiato),
                      voce.progettoId ? 'gruppo-tappa--progetto' : undefined,
                      t.aiutoProgetto,
                    )}
                {/* Il materiale della tappa sta con la tappa, non in un elenco del piano.
                    Pulsanti col nome come quelli del piano: nel dettaglio aperto lo
                    spazio c'è, e tre icone nude non dicono che cosa aggiungono. */}
                {gestore
                  ? gruppoTappa(t.materialeDellaTappa, [
                      <BloccoRisorse
                        key="risorse"
                        pianoId={gestore.pianoId}
                        attivitaId={voce.id}
                        risorse={voce.risorse}
                        prima={gestore.prima}
                        dopo={() => gestore.rinfrescaTutto()}
                      />,
                    ])
                  : null}
              </div>
            )
          : null}
        {/* Il filo del tempo in fondo alla riga, largo quanto la tappa dura: una
            misura, che si dice a parole a chi non la vede o ci passa sopra. */}
        <span
          className="attivita-riga__quota"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, percento)}
          aria-label={quotaDetta}
          title={quotaDetta}
        >
          <span className="attivita-riga__quota-pieno" style={{ width: `${Math.min(100, percento)}%` }} />
        </span>
      </li>
    )
  }

  /**
   * I nomi delle colonne, una volta sola sopra l'elenco e fuori da lui: non è
   * una tappa, e ogni campo della riga ha già il suo nome per chi legge lo schermo.
   */
  const intestazione = (
    <div className="attivita-riga attivita-riga--intestazione" aria-hidden="true">
      <span>#</span>
      <span>{Uno(lessico().attivita)}</span>
      <span>{parole().tipo}</span>
      <span>{t.minuti}</span>
      {sulleUd ? <span>{t.quando}</span> : null}
      <span className="attivita-riga__azioni" />
    </div>
  )

  /**
   * L'ora intera gruppo per gruppo (le UD attaccate fra un intervallo e l'altro,
   * l'unità con cui si pianifica), con dentro le attività che ci cadono. Ci sono
   * tutti i gruppi, anche vuoti, e gli intervalli al loro posto: si vede il tempo
   * che resta.
   */
  const scheletro = (): ReactNode[] => {
    if (!sulleUd) {
      return attivita.map((voce, indice) => rigaAttivita(voce, indice))
    }

    const righe: ReactNode[] = []
    sulleUd.blocchi.forEach((blocco, i) => {
      // Fra un gruppo e l'altro l'intervallo, con i minuti che dura.
      if (i > 0) {
        const prima = sulleUd.blocchi[i - 1]
        righe.push(
          <li key={`pausa:${i}`} className="attivita-editor__pausa">
            <Icona nome="pausa" classe="icona--minuta" />
            <span>{t.intervallo(blocco.pausaPrima, prima.fine, blocco.inizio)}</span>
          </li>,
        )
      }

      // Il gruppo si conta in UD; i minuti del dominio restano sotto.
      const libero = blocco.capienza - blocco.occupati
      righe.push(
        <li
          key={`blocco:${i}`}
          className={classi('attivita-editor__blocco', blocco.occupati === 0 && 'attivita-editor__blocco--vuoto')}
        >
          <strong>{sulleUd.blocchi.length > 1 ? t.gruppo(i + 1) : Uno(lessico().lezione)}</strong>
          {/* Quante UD attaccate, non quali: dentro il gruppo il tempo è continuo. */}
          <span className="attivita-editor__blocco-ud">{t.udAttaccate(blocco.ud)}</span>
          <span className="testo-quieto">
            {t.orarioGruppo(blocco.inizio, blocco.fine, blocco.occupati, blocco.capienza)}
          </span>
          {blocco.occupati === 0
            ? <Pastiglia testo={parole().vuoto} tono="quiete" />
            : libero > 0
              ? <Pastiglia testo={t.minutiLiberi(libero)} tono="quiete" />
              : libero === 0
                ? <Pastiglia testo={t.pieno} tono="positivo" />
                : <Pastiglia testo={t.minutiDiTroppo(-libero)} tono="attenzione" />}
        </li>,
      )
      attivita.forEach((voce, indice) => {
        if (posto(indice)?.blocco === i) righe.push(rigaAttivita(voce, indice))
      })
    })

    // Quel che non ci sta più nell'ora resta in fondo, dichiarato: non si toglie
    // al posto di chi l'ha scritto.
    if (attivita.some((_, indice) => posto(indice)?.ud === null)) {
      righe.push(
        <li key="fuori" className="attivita-editor__ud attivita-editor__ud--fuori">
          <Icona nome="avviso" classe="icona--minuta" />
          <span>{t.oltreLaFine}</span>
        </li>,
      )
      attivita.forEach((voce, indice) => {
        if (posto(indice)?.ud === null) righe.push(rigaAttivita(voce, indice))
      })
    }
    return righe
  }

  // Senza lezione sotto niente scheletro: l'elenco, o che è vuoto.
  const vuotoSenzOra = attivita.length === 0 && !sulleUd

  return (
    <div ref={contenitore} className={classi('attivita-editor', sulleUd && 'attivita-editor--con-orario')}>
      {vuotoSenzOra
        ? <Quieto>{t.nessunaAttivita}</Quieto>
        : (
            <>
              {intestazione}
              <ol className="attivita-editor__elenco">{scheletro()}</ol>
            </>
          )}
      {attivita.length === 0 && sulleUd ? <Quieto>{t.nessunaAttivita}</Quieto> : null}
      <div className="attivita-editor__piede">
        <Pulsante
          testo={t.aggiungiAttivita}
          simbolo="piu"
          variante="sottile"
          al={() => {
            const nuova = creaAttivita('', udDaMinutiAttivita(15, perUd))
            bozza.current = [...(bozza.current ?? []), nuova]
            // Una tappa nuova nasce col dettaglio aperto: è lì che le manca tutto,
            // e col fuoco sul titolo.
            aperte.current.add(nuova.id)
            fuocoDopo.current = `[data-attivita-id="${CSS.escape(nuova.id)}"] input` // testo-fisso: selettore CSS
            cambiato()
          }}
        />
        {/* Il totale in minuti come le tappe, accanto a quanto dura l'ora. */}
        {sulleUd
          ? (
              <Pastiglia
                testo={t.totaleSu(
                  formattaDurata(minutiDiAttivita(totale, sulleUd.minutiPerUd)),
                  formattaDurata(sulleUd.minutiLezione),
                  formattaUd(sulleUd.udLezione),
                ) +
                  (sulleUd.scostamento > 0
                    ? ' · ' +
                      t.minutiDiTroppo(minutiDiAttivita(sulleUd.scostamento, sulleUd.minutiPerUd))
                    : '')}
                tono={sulleUd.scostamento > 0 ? 'negativo' : 'positivo'}
                simbolo="orologio"
              />
            )
          : (
              <Pastiglia
                testo={t.totale(formattaDurata(minutiDiAttivita(totale, perUd)))}
                tono="informativo"
                simbolo="orologio"
              />
            )}
      </div>
    </div>
  )
}
