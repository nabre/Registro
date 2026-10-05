// Il confronto col calendario ICS: la revisione prima di scrivere. La finestra
// sceglie un calendario del documento, chiede il confronto all'host e mostra
// quattro mucchi: da creare, da allineare, da annullare, eventi senza corso.
// Cambia solo quel che è spuntato, quando si preme il tasto in fondo. Le scelte
// sugli eventi senza corso diventano regole e il confronto si rifà subito; le
// regole si salvano con le lezioni. Le lezioni che il calendario non ha si
// elencano soltanto, senza spunta per cancellarle.

import { useEffect, useReducer, useRef, type ReactElement } from 'react'

import type {
  Confronto,
  EsitoConfronto,
  FasciaProposta,
  VoceConfronto,
} from '#core/dominio/calendar.js'
import { formattaData } from '#core/dominio/dates.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { RegolaCalendario } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import { Avviso, Pastiglia, Pulsante, Quieto, SezioneModulo } from '#ui/components/base.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { Input, Select } from '#ui/fields.js'
import { azione, chiedi } from '#ui/bridge.js'
import { nomeCorso, stato } from '#ui/state.js'
import { contiDelleRegole, segnoConteggio } from '#ui/ruleCounts.js'
import { inviaDalModulo, opzioniCorsi } from './common.js'

import { testi } from './calendar.testi.js'

/** Il valore della tendina che dice «non è una lezione». */
const IGNORA = '—ignora—'

type Regola = Omit<RegolaCalendario, 'id'> & { id?: string }

function orario (fasce: readonly FasciaProposta[]): string {
  const lezioni = fasce.filter((f) => f.tipo === 'lezione')
  if (lezioni.length <= 1) return fasce.length > 0 ? `${fasce[0].inizio}–${fasce[fasce.length - 1].fine}` : ''
  return lezioni.map((f) => `${f.inizio}–${f.fine}`).join(' + ')
}

/** Spuntata di partenza: un'ora già svolta non si tocca senza volerlo. */
function spuntataDiPartenza (voce: VoceConfronto): boolean {
  return voce.esito === 'nuova' || voce.statoLezione !== 'svolta'
}

const calendari = () => stato.registro.impostazioni.calendario?.calendari ?? []

/** Che cosa mostra la zona sotto le sorgenti. */
type Zona =
  | { tipo: 'inizio' }
  | { tipo: 'nessuno' }
  | { tipo: 'lettura' }
  | { tipo: 'errore', testo: string }
  | { tipo: 'esito' }

/**
 * Quel che il confronto ricorda fra un giro e l'altro, condiviso fra il corpo
 * (che lo disegna e lo cambia) e il salvataggio (che lo legge).
 */
interface Memoria {
  scelto: string
  regole: Regola[]
  confronto: Confronto | null
  spuntate: Set<string>
  /** Le voci già mostrate: una spunta tolta a mano non torna al confronto dopo. */
  visteFinora: Set<string>
  giro: number
  zona: Zona
}

/** Una riga di un evento senza corso: il testo che diventa regola, e il corso. */
function RegolaSenzaCorso ({ gruppo, corsi, scegli }: {
  gruppo: Confronto['senzaCorso'][number]
  corsi: ReturnType<typeof opzioniCorsi>
  scegli: (testo: string, corsoId: string | null) => void
}): ReactElement {
  const t = testi()
  const testo = useRef<HTMLInputElement | null>(null)
  return (
    <div className="confronto-calendario__regola">
      <Input
        ref={testo}
        type="text"
        className="campo__controllo"
        valore={gruppo.titolo || gruppo.luogo}
        aria-label={t.testoDellaRegola}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') evento.preventDefault()
        }}
      />
      <Select
        className="campo__controllo campo__controllo--selezione"
        aria-label={t.diCheCorso}
        valore=""
        onCambio={(evento) => {
          const valore = (evento.target as HTMLSelectElement).value
          if (!valore) return
          scegli(testo.current?.value ?? '', valore === IGNORA ? null : valore)
        }}
      >
        <option value="">{t.daDecidere}</option>
        <option value={IGNORA}>{t.nonELezione}</option>
        {corsi.map((c) => <option key={c.valore} value={c.valore}>{c.testo}</option>)}
      </Select>
      <span className="testo-quieto">
        {t.gruppo(
          gruppo.quanti,
          gruppo.primo === gruppo.ultimo
            ? formattaData(gruppo.primo)
            : t.dalAl(formattaData(gruppo.primo, 'corto'), formattaData(gruppo.ultimo)),
        )}
      </span>
    </div>
  )
}

/** Il corpo della finestra: le sorgenti in alto, i mucchi del confronto sotto. */
function ConfrontoCalendario ({ m }: { m: Memoria }): ReactElement {
  const t = testi()
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  const campoNuovo = useRef<HTMLInputElement | null>(null)
  /** La pastiglia di un'ora già svolta. */
  const svolta = minuscolo(lessico().statiLezione.svolta)

  async function confronta (): Promise<void> {
    if (!m.scelto) {
      m.zona = { tipo: 'nessuno' }
      rifai()
      return
    }
    m.giro += 1
    const questo = m.giro
    m.zona = { tipo: 'lettura' }
    rifai()
    const esito = await chiedi<Confronto>('calendario.confronta', { calendarioId: m.scelto, regole: m.regole })
    // Due confronti in volo: vince l'ultimo chiesto, non l'ultimo arrivato.
    if (questo !== m.giro) return
    if (!esito.ok || !esito.dati) {
      m.confronto = null
      m.zona = { tipo: 'errore', testo: esito.errori.join(' ') || t.nonSiLegge }
      rifai()
      return
    }
    const confronto = esito.dati
    m.confronto = confronto
    // Le voci nuove nascono con la spunta di partenza; le già viste tengono la loro.
    const vive = new Set(confronto.voci.map((v) => v.id))
    for (const id of [...m.spuntate]) if (!vive.has(id)) m.spuntate.delete(id)
    for (const voce of confronto.voci) {
      if (voce.esito === 'combacia') continue
      if (!m.visteFinora.has(voce.id) && spuntataDiPartenza(voce)) m.spuntate.add(voce.id)
      m.visteFinora.add(voce.id)
    }
    m.zona = { tipo: 'esito' }
    rifai()
  }

  // Il primo confronto all'apertura, se c'è un calendario da cui partire.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (m.scelto) void confronta() }, [])

  async function aggiungi (origine: string): Promise<void> {
    const prima = new Set(calendari().map((c) => c.id))
    const risposta = await azione({ tipo: 'calendario.aggiungi', origine: origine.trim() })
    if (!risposta.ok) return
    const nuovo = calendari().find((c) => !prima.has(c.id))
    if (!nuovo) return
    if (campoNuovo.current) campoNuovo.current.value = ''
    m.scelto = nuovo.id
    m.spuntate.clear()
    m.visteFinora.clear()
    void confronta()
  }

  function scegliRegola (testo: string, corsoId: string | null): void {
    const pulito = testo.trim()
    if (!pulito) return
    m.regole = [...m.regole.filter((r) => r.testo.trim().toLowerCase() !== pulito.toLowerCase()), {
      testo: pulito, corsoId,
    }]
    void confronta()
  }

  function togliRegola (regola: Regola): void {
    m.regole = m.regole.filter((r) => r !== regola)
    void confronta()
  }

  // Le spunte sono del confronto, non del modulo (`valoriModulo` non le legge):
  // caselle guidate da `m.spuntate`, rifatte a ogni gesto.
  function casella (voce: VoceConfronto): ReactElement {
    return (
      <input
        type="checkbox"
        checked={m.spuntate.has(voce.id)}
        aria-label={`${formattaData(voce.data, 'settimana')} ${voce.inizio}`}
        onChange={(evento) => {
          if (evento.target.checked) m.spuntate.add(voce.id)
          else m.spuntate.delete(voce.id)
          rifai()
        }}
      />
    )
  }

  function rigaVoce (voce: VoceConfronto): ReactElement {
    return (
      <label key={voce.id} className="confronto-calendario__voce">
        {voce.esito === 'combacia' ? null : casella(voce)}
        <span className="confronto-calendario__quando"><DataDiLezione iso={voce.data} /></span>
        <span className="confronto-calendario__ora">{orario(voce.fasce)}</span>
        <span className="confronto-calendario__corso">{nomeCorso(voce.corsoId)}</span>
        {voce.aula ? <span className="testo-quieto">{voce.aula}</span> : null}
        {voce.differenze.length > 0
          ? <span className="confronto-calendario__differenza">{voce.differenze.join(' · ')}</span>
          : null}
        {voce.statoLezione === 'svolta' ? <Pastiglia testo={svolta} tono="attenzione" /> : null}
        <Pastiglia
          testo={t.vie[voce.via]}
          tono={voce.via === 'regola' || voce.via === 'nome' ? 'neutro' : 'informativo'}
        />
      </label>
    )
  }

  function mucchio (
    titolo: string,
    spiegazione: string,
    voci: VoceConfronto[],
    avvertenza?: string,
  ): ReactElement | null {
    if (voci.length === 0) return null
    const tutte = voci.every((v) => m.spuntate.has(v.id))
    const alcune = !tutte && voci.some((v) => m.spuntate.has(v.id))
    // La spiegazione del mucchio dietro la «i»; conteggio e avvertenza in vista.
    return (
      <SezioneModulo titolo={{ testo: `${titolo} (${voci.length})`, aiuto: spiegazione }}>
        {avvertenza ? <Quieto>{avvertenza}</Quieto> : null}
        <label className="confronto-calendario__voce confronto-calendario__tutte">
          <input
            type="checkbox"
            checked={tutte}
            ref={(nodo) => { if (nodo) nodo.indeterminate = alcune }}
            aria-label={t.tutteDi(titolo)}
            onChange={(evento) => {
              const si = evento.target.checked
              for (const v of voci) {
                if (si) m.spuntate.add(v.id)
                else m.spuntate.delete(v.id)
              }
              rifai()
            }}
          />
          <span>{parole().tutte}</span>
        </label>
        <div className="confronto-calendario__elenco">{voci.map(rigaVoce)}</div>
      </SezioneModulo>
    )
  }

  function senzaCorso (esito: Confronto): ReactElement | null {
    if (esito.senzaCorso.length === 0) return null
    const corsi = opzioniCorsi()
    return (
      <SezioneModulo
        titolo={{ testo: t.eventiSenzaCorso(esito.senzaCorso.length), aiuto: t.aiutoSenzaCorso }}
      >
        <div className="confronto-calendario__elenco">
          {esito.senzaCorso.map((gruppo) => (
            <RegolaSenzaCorso
              key={`${gruppo.titolo}|${gruppo.luogo}`}
              gruppo={gruppo}
              corsi={corsi}
              scegli={scegliRegola}
            />
          ))}
        </div>
      </SezioneModulo>
    )
  }

  function elencoRegole (): ReactElement | null {
    if (m.regole.length === 0) return null
    // Sugli eventi di tutti i calendari del documento: le regole sono comuni.
    const conti = contiDelleRegole(m.regole)
    return (
      <SezioneModulo titolo={t.regole(m.regole.length)}>
        <div className="confronto-calendario__elenco">
          {m.regole.map((regola, i) => (
            // Il testo fa la regola: due regole con lo stesso testo non ci sono.
            <div key={regola.testo.trim().toLowerCase()} className="confronto-calendario__voce">
              <span className="confronto-calendario__corso">{t.citata(regola.testo)}</span>
              <span>→</span>
              <span>{regola.corsoId ? nomeCorso(regola.corsoId) : t.nonELezioneRegola}</span>
              {conti?.[i] && !conti[i].valida
                ? <Pastiglia testo={t.regolaIlleggibile} tono="negativo" />
                : segnoConteggio(conti?.[i])}
              <Pulsante
                testo=""
                simbolo="chiudi"
                variante="sottile"
                titolo={t.togliRegola}
                al={() => togliRegola(regola)}
              />
            </div>
          ))}
        </div>
      </SezioneModulo>
    )
  }

  function assenti (esito: Confronto): ReactElement | null {
    if (esito.assenti.length === 0) return null
    // «Solo segnalate» rassicura, non avverte di un rischio: può stare dietro la «i».
    return (
      <SezioneModulo titolo={{ testo: t.assenti(esito.assenti.length), aiuto: t.aiutoAssenti }}>
        <div className="confronto-calendario__elenco">
          {esito.assenti.map((l) => (
            <div key={l.lezioneId} className="confronto-calendario__voce">
              <span className="confronto-calendario__quando"><DataDiLezione iso={l.data} /></span>
              <span className="confronto-calendario__ora">{`${l.inizio}–${l.fine}`}</span>
              <span className="confronto-calendario__corso">{nomeCorso(l.corsoId)}</span>
              {l.stato === 'svolta' ? <Pastiglia testo={svolta} tono="attenzione" /> : null}
            </div>
          ))}
        </div>
      </SezioneModulo>
    )
  }

  function esito (): ReactElement | null {
    const confronto = m.confronto
    if (!confronto) return null
    const di = (quale: EsitoConfronto) => confronto.voci.filter((v) => v.esito === quale)
    const combaciano = di('combacia')
    const riassunto = [
      t.eventiLetti(confronto.eventi),
      confronto.copre ? t.dalAl(formattaData(confronto.copre.dal), formattaData(confronto.copre.al)) : '',
      t.combaciano(combaciano.length),
      confronto.ignorati > 0 ? t.ignorati(confronto.ignorati) : '',
      confronto.scartati > 0 ? t.scartati(confronto.scartati) : '',
    ].filter(Boolean).join(' · ')

    return (
      <>
        <Quieto>{riassunto}</Quieto>
        {confronto.eventi === 0 ? <Avviso tono="attenzione">{t.nessunEvento}</Avviso> : null}
        {mucchio(t.daCreare, t.aiutoDaCreare, di('nuova'))}
        {mucchio(t.daAllineare, t.aiutoDaAllineare, di('allineare'), t.svolteSenzaSpunta)}
        {mucchio(t.daAnnullare, t.aiutoDaAnnullare, di('annullare'))}
        {senzaCorso(confronto)}
        {elencoRegole()}
        {assenti(confronto)}
        {combaciano.length > 0
          ? (
              <details className="confronto-calendario__combaciano">
                <summary>{t.combacianoTitolo(combaciano.length)}</summary>
                <div className="confronto-calendario__elenco">{combaciano.map(rigaVoce)}</div>
              </details>
            )
          : null}
      </>
    )
  }

  function zona (): ReactElement | null {
    switch (m.zona.tipo) {
      case 'inizio': return null
      case 'nessuno': return <Avviso tono="attenzione">{t.nessunCalendario}</Avviso>
      case 'lettura': return <Quieto>{t.lettura}</Quieto>
      case 'errore': return <Avviso tono="negativo">{m.zona.testo}</Avviso>
      case 'esito': return esito()
    }
  }

  return (
    <div className="modulo">
      <SezioneModulo titolo={{ testo: t.calendario, aiuto: t.aiutoCalendario }}>
        <div className="confronto-calendario__sorgente">
          <Select
            className="campo__controllo campo__controllo--selezione"
            aria-label={t.calendarioDaConfrontare}
            hidden={calendari().length === 0}
            valore={m.scelto}
            onCambio={(evento) => {
              m.scelto = (evento.target as HTMLSelectElement).value
              // Un altro calendario, altre voci: le spunte di prima non valgono qui.
              m.spuntate.clear()
              m.visteFinora.clear()
              void confronta()
            }}
          >
            {calendari().map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Pulsante testo={t.confronta} simbolo="ricarica" al={() => void confronta()} />
        </div>
        {/* Aggiungerne uno da qui: la prima volta non ce n'è nessuno. */}
        <div className="confronto-calendario__sorgente">
          <Input
            ref={campoNuovo}
            type="text"
            className="campo__controllo"
            placeholder={t.segnapostoNuovo}
            aria-label={t.indirizzoNuovo}
            spellCheck="false"
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                void aggiungi(campoNuovo.current?.value ?? '')
              }
            }}
          />
          <Pulsante
            testo={parole().aggiungi}
            simbolo="piu"
            variante="sottile"
            al={() => void aggiungi(campoNuovo.current?.value ?? '')}
          />
          <Pulsante
            testo={t.unFile}
            simbolo="cartella"
            variante="sottile"
            titolo={t.aiutoUnFile}
            al={() => void aggiungi('')}
          />
        </div>
      </SezioneModulo>
      <div className="confronto-calendario">{zona()}</div>
    </div>
  )
}

/**
 * Il confronto con uno dei calendari del documento: `calendarioId` quello da
 * cui partire (se no il primo); la tendina in alto lo cambia.
 */
export function moduloCalendario (calendarioId?: string): void {
  const t = testi()
  const salvato = stato.registro.impostazioni.calendario
  const m: Memoria = {
    scelto: calendari().find((c) => c.id === calendarioId)?.id ?? calendari()[0]?.id ?? '',
    regole: (salvato?.regole ?? []).map((r) => ({ ...r })),
    confronto: null,
    spuntate: new Set<string>(),
    visteFinora: new Set<string>(),
    giro: 0,
    zona: { tipo: 'inizio' },
  }

  apriModale({
    titolo: t.titolo,
    sottotitolo: t.sottotitolo,
    larghezza: 'larga',
    testoSalva: t.applicaLeSpunte,
    corpo: () => <ConfrontoCalendario m={m} />,
    alSalva: async (_valori, contesto) => {
      const voci = m.confronto?.voci ?? []
      const scelte = voci.filter((v) => m.spuntate.has(v.id))
      const risposta = await inviaDalModulo(contesto, {
        tipo: 'calendario.applica',
        regole: m.regole,
        crea: scelte
          .filter((v) => v.esito === 'nuova')
          .map((v) => ({
            corsoId: v.corsoId, data: v.data, fasce: v.fasce, ...(v.aula ? { aula: v.aula } : {}),
          })),
        allinea: scelte
          .filter((v) => v.esito === 'allineare' && v.lezioneId)
          .map((v) => ({
            lezioneId: v.lezioneId!,
            ...(v.cambiaOrario ? { fasce: v.fasce } : {}),
            aula: v.aula,
          })),
        annulla: scelte.filter((v) => v.esito === 'annullare' && v.lezioneId).map((v) => v.lezioneId!),
      }, t.nonApplicato)
      if (!risposta) return
      contesto.chiudi()
      // La frase la dice l'host (e la mostra `invia`): qui solo se non ne ha detta.
      if (!risposta.messaggio) notifica(t.applicato, 'successo')
    },
  })
}
