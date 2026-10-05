// I calendari ICS del documento, e le regole con cui i loro eventi diventano
// lezioni. Ogni calendario si legge da una copia dentro il documento, rifatta
// solo con «Aggiorna»: il confronto funziona senza rete e non cambia da solo.
// Le regole valgono per tutti i calendari e si salvano con `impostazioni.salva`;
// i calendari hanno azioni loro, perché scrivono o buttano la copia.
// L'origine può contenere un gettone d'accesso: a schermo solo il sito, il link
// intero solo nel campo per cambiarlo, mai in una notifica.

import { useState, useSyncExternalStore, type KeyboardEvent, type ReactElement, type ReactNode, type SyntheticEvent } from 'react'

import { criterioRegola } from '#core/dominio/calendarRules.js'
import { istante } from '#core/i18n/index.js'
import { parole } from '#core/dominio/words.testi.js'
import { nuovoIdRegolaCalendario } from '#core/dominio/identifiers.js'
import type {
  CalendarioEsterno,
  Impostazioni,
  RegolaCalendario,
  SorgenteCalendario,
} from '#core/dominio/models.js'
import { nomeDaOrigine } from '#core/dominio/normalization/index.js'
import { classi } from '#ui/classNames.js'
import { Campo, Pastiglia, Pulsante, Scheda, StatoVuoto } from '#ui/components/base.js'
import { notificaAnnullabile } from '#ui/components/undoable.js'
import { Suggerimento } from '#ui/components/hint.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione, invia } from '#ui/bridge.js'
import { iscriviti, stato, vai } from '#ui/state.js'
import { moduloCalendario } from '#ui/forms.js'
import { opzioniCorsi } from '#ui/forms/common.js'
import { contiDelleRegole, segnoConteggio } from '#ui/ruleCounts.js'
import { testi } from './icsCalendar.testi.js'

/** Il valore della tendina che dice «non è una lezione». */
const NON_LEZIONE = ''

/** Che cosa si può scrivere come origine di un calendario. */
const ESEMPIO_ORIGINE = testi().esempioOrigine

function calendarioOra (): CalendarioEsterno {
  const salvato = stato.registro.impostazioni.calendario
  return { calendari: salvato?.calendari ?? [], regole: salvato?.regole ?? [] }
}

/**
 * Scrive le regole nel documento, o toglie il calendario se non resta niente.
 * I calendari passano come sono (li gestiscono le loro azioni). Non usa
 * `salvaImpostazioni` di `document.tsx`, che fonde e quindi non toglie mai un
 * campo: qui il campo si manda intero, o non si manda.
 */
async function scrivi (calendario: CalendarioEsterno, detto?: string): Promise<boolean> {
  const { calendario: _vecchio, ...resto } = stato.registro.impostazioni
  const vuoto = calendario.calendari.length === 0 && calendario.regole.length === 0
  const impostazioni: Impostazioni = vuoto ? resto : { ...resto, calendario }
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return false
  if (detto) notifica(detto, 'info')
  return true
}

/**
 * Se un'altra regola ha già questo testo, a meno di maiuscole e spazi in fondo:
 * normalizzare come il confronto storpierebbe le espressioni regolari.
 */
function doppione (testo: string, tranne?: string): RegolaCalendario | undefined {
  const cercato = testo.trim().toLowerCase()
  return calendarioOra().regole.find(
    (r) => r.id !== tranne && r.testo.trim().toLowerCase() === cercato,
  )
}

/**
 * Perché un testo non va bene come regola, o `null`: vuoto, o espressione
 * regolare che non si compila (non abbinerebbe mai).
 */
function testoRifiutato (testo: string): string | null {
  if (!testo.trim()) return testi().regolaVuota
  if (criterioRegola(testo) === null) return testi().regolaIlleggibile
  return null
}

/** Le voci della tendina dei corsi, con quello che non c'è più se serve. */
function opzioniDi (corsoId: string | null): Array<{ valore: string, testo: string }> {
  const corsi = opzioniCorsi()
  const voci = [{ valore: NON_LEZIONE, testo: testi().nonLezione }, ...corsi]
  // Un corso tolto o di un altro anno che la regola nomina ancora: la tendina lo dice.
  if (corsoId && !corsi.some((c) => c.valore === corsoId)) {
    voci.push({ valore: corsoId, testo: testi().corsoSparito })
  }
  return voci
}

// --------------------------------------------------------------- i calendari

/**
 * Il gesto su un calendario, con la frase d'errore dell'host se va male.
 * `invia` e non `azione`, che direbbe il rifiuto una seconda volta.
 */
async function gesto (chiesta: Parameters<typeof invia>[0], ripiego: string): Promise<boolean> {
  const risposta = await invia(chiesta)
  if (!risposta.ok) notifica(risposta.errori?.[0] ?? ripiego, 'errore')
  return risposta.ok
}

/** Quando si è fatta la copia, come lo si dice. */
function dataCopia (iso: string | undefined): string {
  const t = testi()
  if (!iso) return t.nessunaCopia
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return t.copiaSconosciuta
  return t.copiaDel(istante(data, {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }))
}

/** Da dove viene, detto senza mai scrivere il gettone d'accesso. */
function provenienza (origine: string): string {
  return /^(https?|webcals?):\/\//i.test(origine)
    ? testi().dalSito(nomeDaOrigine(origine))
    : testi().dalFile(origine)
}

async function togliCalendario (calendario: SorgenteCalendario): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.togliere(calendario.nome),
    testo: t.togliereTesto,
    testoConferma: parole().togli,
  })
  if (!sicuro) return
  const tolto = await gesto({ tipo: 'calendario.togli', calendarioId: calendario.id }, t.nonTolto)
  if (tolto) notifica(t.tolto(calendario.nome), 'info')
}

/** Invio in un campo della riga: lo stesso del pulsante «Aggiungi». */
function conInvio (aggiungi: (evento: KeyboardEvent<HTMLElement>) => void) {
  return (evento: KeyboardEvent<HTMLElement>): void => {
    if (evento.key === 'Enter' && (evento.target as HTMLElement).tagName === 'INPUT') {
      evento.preventDefault()
      aggiungi(evento)
    }
  }
}

function rigaCalendario (calendario: SorgenteCalendario): ReactElement {
  const t = testi()
  return (
    <div key={calendario.id} className="ics-calendario">
      <div className="ics-calendario__testata">
        <Campo
          // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
          nome={`calendario-nome-${calendario.id}`}
          valore={calendario.nome}
          classe="ics-calendario__nome"
          // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
          fuoco={`ics-nome-${calendario.id}`}
          al={(valore, evento) => {
            const nome = valore.trim()
            if (nome === calendario.nome) return
            if (!nome) {
              notifica(t.serveNome, 'avviso')
              // Il campo non è controllato: il nome vero si rimette a mano.
              ;(evento.target as HTMLInputElement).value = calendario.nome
              return
            }
            void gesto(
              { tipo: 'calendario.modifica', calendarioId: calendario.id, nome },
              t.nomeNonCambiato,
            )
          }}
        />
        <div className="ics-sorgente__gesti">
          <Pulsante
            testo={parole().aggiorna}
            simbolo="ricarica"
            variante="sottile"
            titolo={t.aggiornaAiuto}
            al={() => void gesto(
              { tipo: 'calendario.aggiorna', calendarioId: calendario.id },
              t.nonAggiornato,
            )}
          />
          <Pulsante
            testo={t.confronta}
            simbolo="calendario"
            variante="sottile"
            titolo={t.confrontaAiuto}
            al={() => moduloCalendario(calendario.id)}
          />
          <Pulsante
            simbolo="cestino"
            variante="fantasma"
            titolo={t.togliNome(calendario.nome)}
            al={() => void togliCalendario(calendario)}
          />
        </div>
      </div>
      <p className="voce-opzione__aiuto">
        {`${provenienza(calendario.origine)} · ${dataCopia(calendario.copiatoIl)}`}
      </p>
      {/* Il link intero solo qui, chiuso: serve a correggerlo, non a leggerlo. */}
      <details className="ics-calendario__origine">
        {/* Che cosa succede cambiando sta dietro la «i»: il vecchio non si perde se il
            nuovo non si legge. */}
        <summary>
          {t.cambiaOrigine}
          <Suggerimento testo={t.cambiaOrigineAiuto} etichetta={t.cambiaOrigine} />
        </summary>
        <div className="ics-sorgente">
          <Campo
            // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
            nome={`calendario-origine-${calendario.id}`}
            valore={calendario.origine}
            segnaposto={ESEMPIO_ORIGINE}
            classe="ics-sorgente__campo"
            // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
            fuoco={`ics-origine-${calendario.id}`}
            al={(valore) => {
              const origine = valore.trim()
              if (!origine || origine === calendario.origine) return
              void gesto(
                { tipo: 'calendario.modifica', calendarioId: calendario.id, origine },
                t.restaQuello,
              )
            }}
          />
          {/* Origine vuota: il dialogo per il file lo apre l'host. */}
          <Pulsante
            testo={parole().sfoglia}
            simbolo="cartella"
            variante="sottile"
            titolo={t.sfogliaAiuto}
            al={() => void gesto(
              { tipo: 'calendario.modifica', calendarioId: calendario.id, origine: '' },
              t.restaQuello,
            )}
          />
        </div>
      </details>
    </div>
  )
}

/** La riga per aggiungere un calendario: un indirizzo, o un file dal disco. */
function rigaNuovoCalendario (): ReactElement {
  const t = testi()
  // Aggiunto, il campo si svuota: non è controllato e il disegno non lo rifà,
  // e un secondo «Aggiungi» riaggiungerebbe lo stesso indirizzo. Rifiutato,
  // il testo resta da correggere.
  const aggiungi = async (campo: HTMLInputElement | null): Promise<void> => {
    const ok = await gesto({ tipo: 'calendario.aggiungi', origine: campo?.value.trim() ?? '' }, t.nonAggiunto)
    if (ok && campo) campo.value = ''
  }
  return (
    <div
      className="ics-sorgente ics-sorgente--nuova"
      onKeyDown={conInvio((evento) => void aggiungi(evento.target as HTMLInputElement))}
    >
      <Campo
        nome="calendario-nuovo"
        etichetta={t.aggiungiCalendario}
        segnaposto={ESEMPIO_ORIGINE}
        classe="ics-sorgente__campo"
        fuoco="ics-nuovo"
      />
      <div className="ics-sorgente__gesti">
        <Pulsante
          testo={parole().aggiungi}
          simbolo="piu"
          variante="sottile"
          titolo={t.aggiungiAiuto}
          // Il valore vive nel campo, non controllato: lo si legge dalla riga.
          al={(evento) => aggiungi(
            evento.currentTarget.closest('.ics-sorgente--nuova')?.querySelector('input') ?? null,
          )}
        />
        <Pulsante
          testo={t.unFile}
          simbolo="cartella"
          variante="sottile"
          titolo={t.unFileAiuto}
          al={() => aggiungi(null)}
        />
      </div>
    </div>
  )
}

function gruppoCalendari (calendario: CalendarioEsterno): ReactElement {
  return (
    <section className="gruppo-opzioni">
      <h4 className="gruppo-opzioni__titolo">{testi().calendari(calendario.calendari.length)}</h4>
      {calendario.calendari.length === 0
        ? <p className="voce-opzione__aiuto">{testi().nessunCalendario}</p>
        : <div className="ics-calendari">{calendario.calendari.map((c) => rigaCalendario(c))}</div>}
      {rigaNuovoCalendario()}
    </section>
  )
}

// ----------------------------------------------------------------- le regole

/** Il conto di una regola, nel suo posto: la pastiglia di `segnoConteggio`. */
function ContoRegola ({ conto }: { conto: NonNullable<ReturnType<typeof contiDelleRegole>>[number] | undefined }): ReactElement {
  return (
    <span className="ics-regola__conto">
      {segnoConteggio(conto)}
    </span>
  )
}

/** Il campo del testo di una regola, fra i campi della riga che scrive. */
function testoScritto (evento: SyntheticEvent<HTMLElement>, nome: string): string | null {
  const campo = evento.target as HTMLInputElement
  return campo.name === nome ? campo.value : null
}

function RigaRegola ({ regola, indice, regole, conti }: {
  regola: RegolaCalendario
  indice: number
  regole: readonly RegolaCalendario[]
  conti: ReturnType<typeof contiDelleRegole>
}): ReactElement {
  // Il testo mentre lo si scrive: il conto si rifà con quello (le altre regole
  // restano quelle salvate), e il campo non perde il cursore.
  const [scritto, impostaScritto] = useState<string | null>(null)
  const corsoSparito =
    regola.corsoId !== null && !opzioniCorsi().some((c) => c.valore === regola.corsoId)
  const rottaGia = criterioRegola(regola.testo) === null
  const t = testi()
  // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
  const nomeTesto = `regola-testo-${regola.id}`
  const conto = scritto === null || scritto === regola.testo
    ? conti?.[indice]
    : contiDelleRegole(regole.map((r, i) => (i === indice ? { ...r, testo: scritto } : r)))?.[indice]

  const cambia = (modifica: Partial<RegolaCalendario>): void => {
    const calendario = calendarioOra()
    void scrivi({
      ...calendario,
      regole: calendario.regole.map((r) => (r.id === regola.id ? { ...r, ...modifica } : r)),
    })
  }

  /** Il testo rifiutato non resta nel campo: torna quello vero, e il conto con lui. */
  const rimetti = (campo: HTMLInputElement): void => {
    campo.value = regola.testo
    impostaScritto(null)
  }

  return (
    <div
      className={classi('ics-regola', (corsoSparito || rottaGia) && 'ics-regola--orfana')}
      onInput={(evento) => {
        const testo = testoScritto(evento, nomeTesto)
        if (testo !== null) impostaScritto(testo)
      }}
    >
      <Campo
        nome={nomeTesto}
        valore={regola.testo}
        classe="ics-regola__testo"
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        fuoco={`ics-regola-${regola.id}`}
        al={(valore, evento) => {
          const campo = evento.target as HTMLInputElement
          const nuovo = valore.trim()
          if (nuovo === regola.testo) return
          const rifiuto = testoRifiutato(nuovo)
          if (rifiuto) {
            notifica(nuovo ? rifiuto : t.perToglierla(rifiuto), 'avviso')
            rimetti(campo)
            return
          }
          const gia = doppione(nuovo, regola.id)
          if (gia) {
            notifica(t.giaUnaRegola(gia.testo), 'avviso')
            rimetti(campo)
            return
          }
          cambia({ testo: nuovo })
        }}
      />
      <span className="ics-regola__freccia" aria-hidden="true">→</span>
      <Campo
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        nome={`regola-corso-${regola.id}`}
        tipo="select"
        valore={regola.corsoId ?? NON_LEZIONE}
        opzioni={opzioniDi(regola.corsoId)}
        classe="ics-regola__corso"
        al={(valore) => cambia({ corsoId: valore === NON_LEZIONE ? null : valore })}
      />
      {corsoSparito ? <Pastiglia testo={t.corsoNonPiu} tono="attenzione" /> : null}
      {/* Salvata così da un'altra via (riga di comando, file vecchio): non abbina, e
          solo qui si vede. */}
      {rottaGia ? <Pastiglia testo={t.nonSiLegge} tono="negativo" /> : null}
      <ContoRegola conto={conto} />
      {/* Niente domanda: una regola si riscrive in un attimo, e la notifica ha «Annulla». */}
      <Pulsante
        simbolo="cestino"
        variante="fantasma"
        titolo={t.togliRegola(regola.testo)}
        al={() => togliRegola(regola)}
      />
    </div>
  )
}

/**
 * Toglie una regola; «Annulla» nella notifica la rimette al suo posto, se nel
 * frattempo nessuno l'ha rimessa.
 */
async function togliRegola (regola: RegolaCalendario): Promise<void> {
  const prima = calendarioOra()
  const posto = prima.regole.findIndex((r) => r.id === regola.id)
  if (posto < 0) return
  if (!(await scrivi({ ...prima, regole: prima.regole.filter((r) => r.id !== regola.id) }))) return
  notificaAnnullabile(testi().regolaTolta(regola.testo), async () => {
    const adesso = calendarioOra()
    if (adesso.regole.some((r) => r.id === regola.id)) return
    const regole = [...adesso.regole]
    regole.splice(Math.min(posto, regole.length), 0, regola)
    await scrivi({ ...adesso, regole }, testi().regolaRimessa(regola.testo))
  })
}

/** La riga in fondo per una regola nuova: testo, corso, «Aggiungi». */
function RigaNuova (): ReactElement {
  const t = testi()
  // Il conto della regola che si sta scrivendo, contro quelle già salvate.
  const [scritto, impostaScritto] = useState('')
  const salvate = calendarioOra().regole
  const conto = scritto.trim()
    ? contiDelleRegole([...salvate, { testo: scritto, corsoId: null }])?.[salvate.length]
    : undefined

  // I valori vivono nei campi, non controllati: si leggono dalla riga.
  const aggiungi = async (evento: SyntheticEvent<HTMLElement>): Promise<void> => {
    const riga = evento.currentTarget.closest('.ics-regola--nuova')
    const campo = riga?.querySelector('input')
    const scritto = (campo?.value ?? '').trim()
    const corsoId = riga?.querySelector('select')?.value ?? NON_LEZIONE
    const rifiuto = testoRifiutato(scritto)
    if (rifiuto) {
      notifica(scritto ? rifiuto : t.scriviTesto, 'avviso')
      return
    }
    const gia = doppione(scritto)
    if (gia) {
      notifica(t.giaUnaRegolaCorso(gia.testo), 'avviso')
      return
    }
    const calendario = calendarioOra()
    const scritta = await scrivi({
      ...calendario,
      regole: [
        ...calendario.regole,
        {
          id: nuovoIdRegolaCalendario(),
          testo: scritto,
          corsoId: corsoId === NON_LEZIONE ? null : corsoId,
        },
      ],
    })
    // Salvata, la riga torna vuota col suo conto: il campo non è controllato.
    if (scritta && campo) {
      campo.value = ''
      impostaScritto('')
    }
  }

  return (
    <div
      className="ics-regola ics-regola--nuova"
      onKeyDown={conInvio((evento) => void aggiungi(evento))}
      onInput={(evento) => {
        const testo = testoScritto(evento, 'regola-nuova-testo')
        if (testo !== null) impostaScritto(testo)
      }}
    >
      <Campo
        nome="regola-nuova-testo"
        etichetta={t.regolaNuova}
        segnaposto={t.regolaNuovaSegnaposto}
        classe="ics-regola__testo"
        fuoco="ics-regola-nuova"
      />
      <span className="ics-regola__freccia" aria-hidden="true">→</span>
      <Campo
        nome="regola-nuova-corso"
        etichetta={t.lezioneDi}
        tipo="select"
        valore={opzioniCorsi()[0]?.valore ?? NON_LEZIONE}
        opzioni={opzioniDi(null)}
        classe="ics-regola__corso"
      />
      <ContoRegola conto={conto} />
      <Pulsante testo={parole().aggiungi} simbolo="piu" variante="sottile" al={aggiungi} />
    </div>
  )
}

function gruppoRegole (calendario: CalendarioEsterno): ReactElement {
  const regole = calendario.regole
  const conti = contiDelleRegole(regole)
  const orfane = regole.filter(
    (r) => r.corsoId !== null && !opzioniCorsi().some((c) => c.valore === r.corsoId),
  ).length
  const t = testi()

  return (
    <section className="gruppo-opzioni">
      <div className="ics-regole__testata">
        {/* Come si scrive una regola e che cosa dicono i numeri: dietro la «i» del
            titolo. Le regole orfane restano in vista sotto. */}
        <h4 className="gruppo-opzioni__titolo">
          {t.regoleConte(regole.length)}
          <Suggerimento
            testo={<span>{t.regoleAiuto}{conti ? t.regoleAiutoConti : null}</span>}
            etichetta={t.regole}
          />
        </h4>
        {regole.length > 0
          ? (
              <Pulsante
                testo={t.togliTutte}
                simbolo="cestino"
                variante="fantasma"
                al={async () => {
                  const sicuro = await conferma({
                    titolo: t.togliereRegole(regole.length),
                    testo: t.togliereRegoleTesto,
                    testoConferma: t.togliTutte,
                  })
                  if (!sicuro) return
                  await scrivi({ ...calendarioOra(), regole: [] }, t.regoleTolte)
                }}
              />
            )
          : null}
      </div>
      {orfane > 0
        ? (
            <p className="voce-opzione__aiuto">
              <Pastiglia testo={t.orfane(orfane)} tono="attenzione" />
              {t.orfaneNota}
            </p>
          )
        : null}
      {regole.length === 0
        ? <StatoVuoto simbolo="calendario" titolo={t.nessunaRegola} testo={t.nessunaRegolaTesto} />
        : (
            <div className="ics-regole">
              {regole.map((r, i) => <RigaRegola key={r.id} regola={r} indice={i} regole={regole} conti={conti} />)}
            </div>
          )}
      <RigaNuova />
    </section>
  )
}

/** La scheda «Calendari ICS» nella sezione Calendari esterni dell'area Calendario. */
export function schedaCalendarioIcs (): ReactElement {
  const calendario = calendarioOra()
  const qualcosa = calendario.calendari.length > 0 || calendario.regole.length > 0
  const t = testi()

  const azioni: ReactNode = qualcosa
    ? (
        <Pulsante
          testo={t.rimuoviTutto}
          simbolo="cestino"
          variante="fantasma"
          titolo={t.rimuoviTuttoAiuto}
          al={async () => {
            const sicuro = await conferma({
              titolo: t.rimuovere,
              testo: t.rimuovereTesto,
              testoConferma: t.rimuovi,
            })
            if (!sicuro) return
            // Prima le regole, poi i calendari: l'ultimo che se ne va trova le regole già
            // vuote e porta via tutto il campo.
            if (!(await scrivi({ ...calendarioOra(), regole: [] }))) return
            for (const c of calendarioOra().calendari) {
              const tolto = await gesto({ tipo: 'calendario.togli', calendarioId: c.id }, t.nonTolto)
              if (!tolto) return
            }
            notifica(t.rimossi, 'info')
          }}
        />
      )
    : null

  return (
    <Scheda titolo={t.calendariIcs} aiuto={t.calendariIcsAiuto} classe="scheda--opzioni" azioni={azioni}>
      <div className="gruppi-opzioni">
        {gruppoCalendari(calendario)}
        {gruppoRegole(calendario)}
      </div>
    </Scheda>
  )
}

/** I calendari del documento come li ha lo stato adesso: la finestra li segue. */
function useCalendariVivi (): CalendarioEsterno | undefined {
  return useSyncExternalStore(iscriviti, () => stato.registro.impostazioni.calendario)
}

/**
 * L'elenco della finestra: si rifà quando cambiano i calendari, e solo allora,
 * perché la finestra non segue il disegno della pagina.
 */
function ElencoCalendari (): ReactElement {
  useCalendariVivi()
  return <div className="gruppi-opzioni">{gruppoCalendari(calendarioOra())}</div>
}

/**
 * I calendari ICS in una finestra, aperta da «Confronta con il calendario»:
 * lo stesso elenco della scheda, e «Confronta» apre la revisione.
 */
export function moduloCalendariIcs (): void {
  const t = testi()

  apriModale({
    titolo: t.calendariIcs,
    aiuto: t.finestraAiuto,
    larghezza: 'larga',
    corpo: (contesto) => (
      <div>
        <ElencoCalendari />
        <div className="opzioni__rimando">
          <p className="opzioni__rimando-testo">{t.regoleComuni}</p>
          <Pulsante
            testo={t.apriRegole}
            simbolo="impostazioni"
            variante="sottile"
            al={() => {
              contesto.chiudi()
              vai({ pagina: 'pagina.impostazioni', scheda: 'calendario#ics' })
            }}
          />
        </div>
      </div>
    ),
  })
}
