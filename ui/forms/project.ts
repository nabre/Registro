// Le finestre del progetto (ADR-54): la testata, i criteri e la scala dei
// livelli, un compito, la proroga e l'inizio di un allievo, un giudizio, una
// casella della matrice. La testata si manda intera con `progetto.salva`, letta
// dal registro al salvataggio (come `baseViva`): compiti, giudizi e matrice
// hanno azioni loro e l'host li tiene com'erano.

import { allieviAttivi, inizioLezione, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { formattaData, oggi } from '#core/dominio/dates.js'
import { creaProgetto, creaRisorsa } from '#core/dominio/factories.js'
import { identificatore, nuovoIdFaseProgetto } from '#core/dominio/identifiers.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type {
  Allievo,
  CompitoProgetto,
  CriterioProgetto,
  FaseProgetto,
  GiudizioProgetto,
  Iso,
  Lezione,
  LivelloProgetto,
  Progetto,
  ProgettoNelCorso,
  Risorsa,
  StatoProgetto,
} from '#core/dominio/models.js'
import { allieviNominati, periodoDelProgetto } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import { campo, pulsante, quieto, riga } from '#ui/components/base.js'
import { apriModale, conferma, type ContestoModale } from '#ui/components/modal.js'
import type { ProgettoDaSalvare } from '#contract/protocol.js'
import { azione } from '#ui/bridge.js'
import { dataDiLezione } from '#ui/components/lessonDate.js'
import { h, rimpiazza, type Figlio } from '#ui/dom.js'
import { classePerId, corsoPerId, lezioniDiCorso, progettoPerId, stato } from '#ui/state.js'

import {
  baseViva,
  fuocoSullaPresa,
  presaDiRiga,
  riordinatore,
  salva,
  spostaVoce,
  tastoElimina,
  testo,
} from './common.js'
import { testi } from './project.testi.js'

// ------------------------------------------------------------------ letture comuni

/** Il nome di uno stato del progetto, nella lingua di adesso. */
export function nomeStatoProgetto (scelto: StatoProgetto): string {
  return testi().stati[scelto]
}

/**
 * Le persone del progetto, nell'ordine dell'elenco: chi frequenta la classe del
 * corso, più chi non la frequenta più ma ha ancora qualcosa nel progetto.
 */
export function allieviDelProgetto (progetto: ProgettoNelCorso): Allievo[] {
  const classe = classePerId(corsoPerId(progetto.corsoId)?.classeId ?? null)
  if (!classe) return []
  const nominati = allieviNominati(progetto)
  return ordinaAllievi([
    ...allieviAttivi(classe),
    ...classe.allievi.filter((a) => !a.attivo && nominati.has(a.id)),
  ])
}

/**
 * Il periodo del progetto in una riga: dalla prima all'ultima lezione con una
 * fase del progetto. Senza lezioni, l'invito ad abbinarne.
 */
export function periodoDetto (progetto: ProgettoNelCorso): string {
  const t = testi()
  const periodo = periodoDelProgetto(stato.registro, progetto)
  if (!periodo) return t.nessunaLezioneAncora
  return periodo.inizio === periodo.fine
    ? t.ilGiorno(formattaData(periodo.inizio))
    : t.dalAl(formattaData(periodo.inizio), formattaData(periodo.fine))
}

/** Chi frequenta la classe del corso, nell'ordine dell'elenco. */
export function attiviDelProgetto (progetto: Pick<ProgettoNelCorso, 'corsoId'>): Allievo[] {
  const classe = classePerId(corsoPerId(progetto.corsoId)?.classeId ?? null)
  return classe ? ordinaAllievi(allieviAttivi(classe)) : []
}

/** Come un'ora del corso si legge in una tendina: giorno, data e inizio. */
export function etichettaOra (lezione: Lezione): string {
  const inizio = inizioLezione(lezione)
  return `${formattaData(lezione.data, 'settimana')}${inizio ? ` · ${inizio}` : ''}`
}

/** La stessa da vedere in un collegamento: il giorno in maiuscoletto. */
export function etichettaOraMostrata (lezione: Lezione): Figlio {
  const inizio = inizioLezione(lezione)
  return [dataDiLezione(lezione.data), inizio ? ` · ${inizio}` : null]
}

/**
 * La tavolozza dei livelli: le prime quattro sono quelle della scala di serie,
 * così un livello senza colore suo prende quello della sua posizione.
 */
const COLORI_LIVELLO = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#eab308', '#06b6d4', '#64748b']

/** Il colore di un livello: il suo, o quello di serie della sua posizione. */
export function coloreLivello (progetto: Pick<Progetto, 'livelli'>, valore: string): string {
  const indice = progetto.livelli.findIndex((l) => l.valore === valore)
  const diSerie = COLORI_LIVELLO[Math.max(0, indice) % COLORI_LIVELLO.length]
  return progetto.livelli[indice]?.colore ?? diSerie
}

/**
 * Quante caselle delle matrici, di tutti i corsi, se ne andrebbero salvando
 * questi criteri e livelli: con la stessa regola con cui l'host poi le toglie.
 */
function celleCheCadono (
  prima: Progetto,
  dopo: Pick<Progetto, 'criteri' | 'livelli'>,
): number {
  const criteri = new Set(dopo.criteri.map((c) => c.id).filter(Boolean))
  const livelli = new Set(dopo.livelli.map((l) => l.valore))
  return prima.integrazioni.flatMap((i) => i.matrice).filter((cella) =>
    !criteri.has(cella.criterioId) || (cella.livello !== null && !livelli.has(cella.livello)),
  ).length
}

/**
 * La testata da mandare con `progetto.salva`: le integrazioni hanno azioni
 * loro, e l'host le tiene com'erano.
 */
export function testataDi (progetto: Progetto): ProgettoDaSalvare {
  const { integrazioni: _integrazioni, ...testata } = progetto
  return testata
}

/**
 * Manda la testata. Se cadrebbero delle caselle (un criterio tolto, un livello
 * tolto) lo si chiede prima, e si conferma all'host con `scartaCelle`.
 */
async function salvaTestata (
  contesto: ContestoModale,
  progetto: Progetto,
  messaggio: string,
  dopo?: (idCreato: string | null) => void,
): Promise<void> {
  const prima = progettoPerId(progetto.id)
  const cadono = prima ? celleCheCadono(prima, progetto) : 0
  const t = testi()
  if (cadono > 0) {
    const sicuro = await conferma({
      titolo: t.togliereCelle,
      testo: t.celleCadono(cadono),
      testoConferma: t.togliESalva,
      pericolo: true,
    })
    if (!sicuro) return
  }
  await salva(
    contesto,
    { tipo: 'progetto.salva', progetto: testataDi(progetto), ...(cadono > 0 ? { scartaCelle: true } : {}) },
    messaggio,
    dopo,
  )
}

// ------------------------------------------------------------------ testata

/**
 * Il progetto nuovo, o la testata di uno che c'è: titolo, descrizione,
 * obiettivi (uno per riga) e i collegamenti. Il progetto è dell'anno; con un
 * corso, quello nuovo vi si integra subito dopo (lo chiede la pagina
 * Integrazione progetti). Lo stato è dell'integrazione, non si scrive qui.
 */
export function moduloProgetto (opzioni: {
  corsoId?: string | null
  progetto?: Progetto
  dopo?: (progettoId: string) => void
}): void {
  const { corsoId, progetto, dopo } = opzioni
  const t = testi()
  const p = parole()
  // I collegamenti si scrivono qui; file e immagini restano come sono.
  let collegamenti: Risorsa[] = (progetto?.risorse ?? [])
    .filter((r) => r.tipo === 'collegamento')
    .map((r) => ({ ...r }))
  const righe = h('div', { class: 'colonne-check' })

  const disegna = (): void => {
    rimpiazza(righe, ...collegamenti.map((risorsa) =>
      h(
        'div',
        { class: 'colonne-check__riga' },
        h('input', {
          class: 'campo__controllo',
          type: 'text',
          value: risorsa.titolo,
          placeholder: t.titoloCollegamento,
          attr: { 'aria-label': t.titoloCollegamento },
          oninput: (evento: Event) => {
            risorsa.titolo = (evento.target as HTMLInputElement).value
          },
        }),
        h('input', {
          class: 'campo__controllo',
          type: 'url',
          value: risorsa.url ?? '',
          // testo-fisso: un indirizzo d'esempio
          placeholder: 'https://',
          attr: { 'aria-label': t.indirizzoCollegamento },
          oninput: (evento: Event) => { risorsa.url = (evento.target as HTMLInputElement).value },
        }),
        pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: t.togliCollegamento,
          al: () => {
            collegamenti = collegamenti.filter((r) => r !== risorsa)
            disegna()
          },
        }),
      )))
  }
  disegna()

  apriModale({
    titolo: progetto ? Uno(lessico().progetto) : t.nuovo,
    sottotitolo: progetto?.titolo,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'titolo',
          etichetta: p.titolo,
          valore: progetto?.titolo ?? '',
          segnaposto: t.segnapostoTitolo,
          richiesto: true,
        }),
        // Il periodo non si scrive: in ogni corso lo dicono le lezioni con tappe del progetto.
        h('p', { class: 'testo-quieto' }, t.periodoDaFasi),
        campo({
          nome: 'descrizione',
          etichetta: p.descrizione,
          tipo: 'textarea',
          righe: 3,
          valore: progetto?.descrizione ?? '',
        }),
        campo({
          nome: 'obiettivi',
          etichetta: t.obiettivi,
          tipo: 'textarea',
          righe: 3,
          valore: (progetto?.obiettivi ?? []).join('\n'),
          aiuto: t.obiettiviAiuto,
        }),
        h('h4', { class: 'modulo__titolo-sezione' }, t.collegamenti),
        righe,
        h(
          'div',
          null,
          pulsante({
            testo: t.aggiungiCollegamento,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => {
              collegamenti = [...collegamenti, creaRisorsa('collegamento')]
              disegna()
              righe.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
            },
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const titolo = testo(valori.titolo)
      if (!titolo) {
        contesto.mostraErrori([t.serveTitolo])
        return
      }
      const base = baseViva(
        contesto,
        Boolean(progetto),
        creaProgetto(null, titolo),
        progetto ? progettoPerId(progetto.id) : null,
      )
      if (!base) return
      const altre = base.risorse.filter((r) => r.tipo !== 'collegamento')
      const scritto: Progetto = {
        ...base,
        titolo,
        descrizione: testo(valori.descrizione) || undefined,
        obiettivi: testo(valori.obiettivi).split('\n').map((r) => r.trim()).filter(Boolean),
        risorse: [
          ...altre,
          ...collegamenti
            .map((r) => ({ ...r, titolo: r.titolo.trim(), url: r.url?.trim() }))
            .filter((r) => r.url)
            .map((r) => ({ ...r, titolo: r.titolo || r.url || '' })),
        ],
      }
      await salvaTestata(
        contesto,
        scritto,
        progetto ? t.salvato : t.creato(titolo),
        (creato) => {
          const id = creato ?? scritto.id
          if (progetto || !corsoId) {
            dopo?.(id)
            return
          }
          void azione({ tipo: 'progetto.integra', progettoId: id, corsoId }).then((risposta) => {
            if (risposta.ok) dopo?.(id)
          })
        },
      )
    },
    azioniSecondarie: progetto
      ? (contesto) =>
          tastoElimina({
            contesto,
            chiedi: { genere: 'progetto', id: progetto.id },
            azione: { tipo: 'progetto.elimina', progettoId: progetto.id },
            fatto: t.eliminato,
          })
      : undefined,
  })
}

// ------------------------------------------------------------------ criteri e livelli

/**
 * Un elenco di righe da riordinare, per criteri e livelli: la riga la disegna
 * chi chiama, presa e cestino li mette questo.
 */
function elencoRiordinabile<T> (opzioni: {
  voci: () => T[]
  imposta: (voci: T[]) => void
  campi: (voce: T, indice: number) => HTMLElement[]
  titoloTogli: (voce: T) => string
  vuoto: string
}): { righe: HTMLElement, disegna: () => void } {
  const righe = h('div', { class: 'colonne-check' })
  const disegna = (): void => {
    const voci = opzioni.voci()
    rimpiazza(righe, ...voci.map((voce, indice) => {
      const presa = presaDiRiga()
      const riga = h(
        'div',
        { class: 'colonne-check__riga' },
        presa,
        ...opzioni.campi(voce, indice),
        pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: opzioni.titoloTogli(voce),
          al: () => {
            opzioni.imposta(opzioni.voci().filter((v) => v !== voce))
            disegna()
          },
        }),
      )
      riordina(riga, presa, indice)
      return riga
    }))
    if (voci.length === 0) righe.appendChild(quieto(opzioni.vuoto))
  }
  const riordina = riordinatore(righe, (da, a) => {
    const voci = opzioni.voci()
    if (a < 0 || a >= voci.length || da === a) return
    opzioni.imposta(spostaVoce(voci, da, a))
    disegna()
    fuocoSullaPresa(righe, a)
  })
  return { righe, disegna }
}

/** Un campo nudo di una riga dell'elenco: scrive dentro la voce a ogni tasto. */
function campoNudo (opzioni: {
  valore: string
  etichetta: string
  segnaposto?: string
  al: (valore: string) => void
}): HTMLElement {
  return h('input', {
    class: ['campo__controllo', 'colonne-check__titolo'],
    type: 'text',
    value: opzioni.valore,
    placeholder: opzioni.segnaposto ?? '',
    attr: { 'aria-label': opzioni.etichetta },
    oninput: (evento: Event) => opzioni.al((evento.target as HTMLInputElement).value),
  })
}

/**
 * I criteri del progetto, tutti insieme: aggiungere, rinominare, mettere in
 * fila, togliere. Rinominare tiene l'id, e con lui le caselle della matrice.
 */
export function moduloCriteri (progettoId: string): void {
  const t = testi()
  const iniziale = progettoPerId(progettoId)
  if (!iniziale) return
  let criteri: CriterioProgetto[] = iniziale.criteri.map((c) => ({ ...c }))
  const elenco = elencoRiordinabile({
    voci: () => criteri,
    imposta: (voci) => { criteri = voci },
    campi: (criterio, indice) => [
      campoNudo({
        valore: criterio.titolo,
        etichetta: t.nomeCriterio(indice + 1),
        segnaposto: t.segnapostoCriterio,
        al: (valore) => { criterio.titolo = valore },
      }),
    ],
    titoloTogli: (criterio) => t.togli(criterio.titolo || '…'),
    vuoto: t.nessunCriterio,
  })
  elenco.disegna()

  apriModale({
    titolo: Molti(lessico().criterioProgetto),
    sottotitolo: iniziale.titolo,
    aiuto: t.criteriAiuto,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        elenco.righe,
        h(
          'div',
          null,
          pulsante({
            testo: t.aggiungiCriterio,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => {
              criteri = [...criteri, { id: '', titolo: '' }]
              elenco.disegna()
              elenco.righe.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
            },
          }),
        ),
      ),
    alSalva: async (_valori, contesto) => {
      const vivo = baseViva(contesto, true, iniziale, progettoPerId(progettoId))
      if (!vivo) return
      const scritti = criteri
        .map((c) => ({ ...c, titolo: c.titolo.trim() }))
        .filter((c) => c.titolo)
      await salvaTestata(contesto, { ...vivo, criteri: scritti }, t.criteriSalvati)
    },
  })
}

/**
 * Una fase in fondo al progetto, col nome di serie («Fase 3»): la chiede la
 * scelta di progetto e fase dell'attività. Torna il suo id, o `null` se l'host
 * ha rifiutato (e l'ha già detto).
 */
export async function aggiungiFase (progetto: Progetto): Promise<string | null> {
  const vivo = progettoPerId(progetto.id)
  if (!vivo) return null
  const fase: FaseProgetto = {
    id: nuovoIdFaseProgetto(),
    titolo: testi().segnapostoFase(vivo.fasi.length + 1),
  }
  const risposta = await azione({ tipo: 'progetto.salva', progetto: { ...testataDi(vivo), fasi: [...vivo.fasi, fase] } })
  return risposta.ok ? fase.id : null
}

/**
 * Le fasi del progetto: aggiungere, rinominare, mettere in fila, togliere, mai
 * sotto una. Le attività dei piani di una fase tolta passano a quella prima (lo fa l'host).
 */
export function moduloFasi (progettoId: string): void {
  const t = testi()
  const iniziale = progettoPerId(progettoId)
  if (!iniziale) return
  let fasi: FaseProgetto[] = iniziale.fasi.map((f) => ({ ...f }))
  const elenco = elencoRiordinabile({
    voci: () => fasi,
    imposta: (voci) => { fasi = voci.length > 0 ? voci : fasi },
    campi: (fase, indice) => [
      campoNudo({
        valore: fase.titolo,
        etichetta: t.nomeFase(indice + 1),
        segnaposto: t.segnapostoFase(indice + 1),
        al: (valore) => { fase.titolo = valore },
      }),
      h('textarea', {
        class: 'campo__controllo colonne-check__titolo',
        value: fase.descrizione ?? '',
        attr: { rows: 2, 'aria-label': parole().descrizione },
        oninput: (evento: Event) => {
          fase.descrizione = (evento.target as HTMLTextAreaElement).value
        },
      }),
    ],
    titoloTogli: (fase) => t.togli(fase.titolo || '…'),
    vuoto: t.serveUnaFase,
  })
  elenco.disegna()

  apriModale({
    titolo: t.fasi,
    sottotitolo: iniziale.titolo,
    aiuto: t.fasiAiuto,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        elenco.righe,
        h(
          'div',
          null,
          pulsante({
            testo: t.aggiungiFase,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => {
              fasi = [...fasi, { id: '', titolo: '' }]
              elenco.disegna()
              elenco.righe.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
            },
          }),
        ),
      ),
    alSalva: async (_valori, contesto) => {
      const scritte = fasi
        .map((f, i) => ({
          ...f,
          titolo: f.titolo.trim() || t.segnapostoFase(i + 1),
          descrizione: f.descrizione?.trim() || undefined,
        }))
      if (scritte.length === 0) {
        contesto.mostraErrori([t.serveUnaFase])
        return
      }
      const vivo = baseViva(contesto, true, iniziale, progettoPerId(progettoId))
      if (!vivo) return
      await salvaTestata(contesto, { ...vivo, fasi: scritte }, t.fasiSalvate)
    },
  })
}

/**
 * La scala dei livelli: il testo e il colore di ogni gradino, dal basso.
 * Un livello nuovo riceve un valore suo, che non cambia rinominandolo.
 */
export function moduloLivelli (progettoId: string): void {
  const t = testi()
  const iniziale = progettoPerId(progettoId)
  if (!iniziale) return
  let livelli: LivelloProgetto[] = iniziale.livelli.map((l) => ({ ...l }))
  /** Il livello con la tavolozza aperta: una alla volta, sotto la sua riga. */
  let tavolozzaDi: LivelloProgetto | null = null
  const elenco = elencoRiordinabile({
    voci: () => livelli,
    imposta: (voci) => { livelli = voci },
    campi: (livello, indice) => {
      const colore = livello.colore ?? COLORI_LIVELLO[indice % COLORI_LIVELLO.length]
      const pallino = h('button', {
        class: 'livello-riga__pallino',
        type: 'button',
        style: { backgroundColor: colore },
        attr: {
          'aria-label': t.coloreLivello(indice + 1),
          title: t.coloreLivello(indice + 1),
          'aria-expanded': String(tavolozzaDi === livello),
        },
        onclick: () => {
          tavolozzaDi = tavolozzaDi === livello ? null : livello
          elenco.disegna()
        },
      })
      const scegli = (scelto: string | undefined): void => {
        if (scelto) livello.colore = scelto
        else delete livello.colore
        tavolozzaDi = null
        elenco.disegna()
      }
      return [
        pallino,
        h(
          'div',
          { class: 'livello-riga__testi' },
          campoNudo({
            valore: livello.testo,
            etichetta: t.nomeLivello(indice + 1),
            segnaposto: t.segnapostoLivello,
            al: (valore) => { livello.testo = valore },
          }),
          h('textarea', {
            class: 'campo__controllo livello-riga__descrizione',
            rows: 2,
            value: livello.descrizione ?? '',
            placeholder: t.segnapostoDescrizioneLivello,
            attr: { 'aria-label': t.descrizioneLivello(indice + 1) },
            oninput: (evento: Event) => {
              livello.descrizione = (evento.target as HTMLTextAreaElement).value
            },
          }),
          tavolozzaDi === livello
            ? h(
                'div',
                { class: 'livello-riga__tavolozza', attr: { role: 'group', 'aria-label': t.coloreLivello(indice + 1) } },
                ...COLORI_LIVELLO.map((c, i) => h('button', {
                  class: ['livello-riga__pallino', c === livello.colore && 'livello-riga__pallino--scelto'],
                  type: 'button',
                  style: { backgroundColor: c },
                  attr: { 'aria-label': t.colori[i], title: t.colori[i], 'aria-pressed': String(c === livello.colore) },
                  onclick: () => scegli(c),
                })),
                pulsante({
                  testo: t.colorePredefinito,
                  variante: 'fantasma',
                  al: () => scegli(undefined),
                }),
              )
            : null,
        ),
      ]
    },
    titoloTogli: (livello) => t.togli(livello.testo || '…'),
    vuoto: t.serveUnLivello,
  })
  elenco.disegna()

  apriModale({
    titolo: t.livelli,
    sottotitolo: iniziale.titolo,
    aiuto: t.livelliAiuto,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        elenco.righe,
        h(
          'div',
          null,
          pulsante({
            testo: t.aggiungiLivello,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => {
              // testo-fisso: il prefisso del valore salvato, non si legge
              livelli = [...livelli, { valore: identificatore('liv'), testo: '' }]
              elenco.disegna()
              elenco.righe.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
            },
          }),
        ),
      ),
    alSalva: async (_valori, contesto) => {
      const scritti = livelli
        .map((l) => ({
          ...l,
          testo: l.testo.trim(),
          descrizione: l.descrizione?.trim() || undefined,
        }))
        .filter((l) => l.testo)
      if (scritti.length === 0) {
        contesto.mostraErrori([t.serveUnLivello])
        return
      }
      const vivo = baseViva(contesto, true, iniziale, progettoPerId(progettoId))
      if (!vivo) return
      await salvaTestata(contesto, { ...vivo, livelli: scritti }, t.livelliSalvati)
    },
  })
}

// ------------------------------------------------------------------ compiti

/**
 * Un compito nuovo o uno che c'è: titolo, descrizione e la fine comune, in
 * una lezione del corso (la fine ne segue il giorno) o in una data.
 */
export function moduloCompito (opzioni: { progetto: ProgettoNelCorso, compito?: CompitoProgetto }): void {
  const { progetto, compito } = opzioni
  const t = testi()
  const p = parole()
  const ore = lezioniDiCorso(progetto.corsoId)
  apriModale({
    titolo: compito ? Uno(lessico().compitoProgetto) : t.nuovoCompito,
    sottotitolo: progetto.titolo,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'titolo',
          etichetta: p.titolo,
          valore: compito?.titolo ?? '',
          segnaposto: t.segnapostoCompito,
          richiesto: true,
        }),
        campo({
          nome: 'descrizione',
          etichetta: p.descrizione,
          tipo: 'textarea',
          righe: 3,
          valore: compito?.descrizione ?? '',
        }),
        riga(
          campo({
            nome: 'fine',
            etichetta: t.fineComune,
            tipo: 'date',
            valore: compito?.fine ?? '',
            aiuto: t.fineComuneAiuto,
            larghezza: 'meta',
          }),
          campo({
            nome: 'fineLezione',
            etichetta: t.fineInLezione,
            tipo: 'select',
            valore: compito?.fineLezioneId ?? '',
            opzioni: [
              { valore: '', testo: t.nessunaLezione },
              ...ore.map((l) => ({ valore: l.id, testo: etichettaOra(l) })),
            ],
            larghezza: 'meta',
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const titolo = testo(valori.titolo)
      if (!titolo) {
        contesto.mostraErrori([t.serveTitolo])
        return
      }
      const lezioneId = testo(valori.fineLezione)
      const lezione = ore.find((l) => l.id === lezioneId) ?? null
      const fine = lezione ? lezione.data : testo(valori.fine) || null
      await salva(
        contesto,
        {
          tipo: 'progetto.compito.salva',
          progettoId: progetto.id,
          corsoId: progetto.corsoId,
          compito: {
            ...(compito ? { id: compito.id } : {}),
            titolo,
            descrizione: testo(valori.descrizione) || undefined,
            fine,
            fineLezioneId: lezione?.id ?? null,
          },
        },
        compito ? t.compitoSalvato : t.compitoCreato(titolo),
      )
    },
    azioniSecondarie: compito
      ? (contesto) =>
          tastoElimina({
            contesto,
            chiedi: {
              titolo: t.eliminareCompito(compito.titolo),
              testo: t.eliminareCompitoTesto,
            },
            azione: {
              tipo: 'progetto.compito.elimina',
              progettoId: progetto.id,
              corsoId: progetto.corsoId,
              compitoId: compito.id,
            },
            fatto: t.compitoEliminato,
          })
      : undefined,
  })
}

/** Più tempo per un allievo: una fine sua, con una nota; si toglie e torna quella comune. */
export function moduloProroga (opzioni: {
  progettoId: string
  corsoId: string
  compito: CompitoProgetto
  allievo: Allievo
  /** La fine comune, da proporre quando la proroga non c'è ancora. */
  fineComune: Iso | null
}): void {
  const { progettoId, corsoId, compito, allievo, fineComune } = opzioni
  const t = testi()
  const proroga = compito.proroghe.find((x) => x.allievoId === allievo.id)
  apriModale({
    titolo: t.proroga,
    sottotitolo: `${nomeCompleto(allievo)} · ${compito.titolo}`,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'fine',
          etichetta: t.finoAl,
          tipo: 'date',
          valore: proroga?.fine ?? fineComune ?? oggi(),
          richiesto: true,
        }),
        campo({
          nome: 'nota',
          etichetta: parole().note,
          valore: proroga?.nota ?? '',
          segnaposto: t.segnapostoProroga,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const fine = testo(valori.fine)
      if (!fine) {
        contesto.mostraErrori([t.serveGiorno])
        return
      }
      await salva(
        contesto,
        {
          tipo: 'progetto.compito.proroga',
          progettoId,
          corsoId,
          compitoId: compito.id,
          allievoId: allievo.id,
          fine,
          nota: testo(valori.nota) || undefined,
        },
        t.prorogaSalvata(formattaData(fine)),
      )
    },
    azioniSecondarie: proroga
      ? (contesto) =>
          pulsante({
            testo: t.togliProroga,
            simbolo: 'chiudi',
            variante: 'sottile',
            al: () => salva(
              contesto,
              {
                tipo: 'progetto.compito.proroga',
                progettoId,
                corsoId,
                compitoId: compito.id,
                allievoId: allievo.id,
                fine: null,
              },
              t.prorogaTolta,
            ),
          })
      : undefined,
  })
}

/** Il giorno in cui uno o più allievi hanno cominciato un compito, scelto a mano. */
export function moduloInizio (opzioni: {
  progettoId: string
  corsoId: string
  compito: CompitoProgetto
  allievi: Allievo[]
  data: Iso | null
}): void {
  const { progettoId, corsoId, compito, allievi, data } = opzioni
  const t = testi()
  apriModale({
    titolo: t.inizioDelCompito,
    sottotitolo: `${compito.titolo} · ${allievi.length === 1 ? nomeCompleto(allievi[0]) : t.quanti(allievi.length)}`,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'data',
          etichetta: t.cominciatoIl,
          tipo: 'date',
          valore: data ?? oggi(),
          richiesto: true,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const scelta = testo(valori.data)
      if (!scelta) {
        contesto.mostraErrori([t.serveGiorno])
        return
      }
      await salva(
        contesto,
        {
          tipo: 'progetto.compito.inizia',
          progettoId,
          corsoId,
          compitoId: compito.id,
          allieviIds: allievi.map((a) => a.id),
          data: scelta,
        },
        t.inizioSalvato(formattaData(scelta)),
      )
    },
  })
}

// ------------------------------------------------------------------ giudizi e caselle

/**
 * Un giudizio: su un allievo o sulla classe, con il suo giorno. Dentro un'ora
 * (`lezioneId`) il giorno è quello dell'ora.
 */
export function moduloGiudizio (opzioni: {
  progetto: ProgettoNelCorso
  giudizio?: GiudizioProgetto
  allievoId?: string | null
  lezione?: Lezione | null
}): void {
  const { progetto, giudizio } = opzioni
  const t = testi()
  const lezione = opzioni.lezione ??
    stato.registro.lezioni.find((l) => giudizio?.lezioneId && l.id === giudizio.lezioneId) ?? null
  const allievi = allieviDelProgetto(progetto)
  apriModale({
    titolo: giudizio ? Uno(lessico().giudizioProgetto) : t.nuovoGiudizio,
    sottotitolo: progetto.titolo,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'chi',
            etichetta: parole().chi,
            tipo: 'select',
            valore: giudizio ? giudizio.allievoId ?? '' : opzioni.allievoId ?? '',
            opzioni: [
              { valore: '', testo: t.tuttaLaClasse },
              ...allievi.map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
            ],
            larghezza: 'meta',
          }),
          lezione
            ? h('p', { class: 'testo-quieto' }, t.nellOraDel(formattaData(lezione.data, 'lungo')))
            : campo({
                nome: 'data',
                etichetta: parole().data,
                tipo: 'date',
                valore: giudizio?.data ?? stato.adessoData,
                richiesto: true,
                larghezza: 'meta',
              }),
        ),
        campo({
          nome: 'testo',
          etichetta: Uno(lessico().giudizioProgetto),
          tipo: 'textarea',
          righe: 4,
          valore: giudizio?.testo ?? '',
          segnaposto: t.segnapostoGiudizio,
          richiesto: true,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const scritto = testo(valori.testo)
      if (!scritto) {
        contesto.mostraErrori([t.giudizioVuoto])
        return
      }
      await salva(
        contesto,
        {
          tipo: 'progetto.giudizio.salva',
          progettoId: progetto.id,
          corsoId: progetto.corsoId,
          giudizio: {
            ...(giudizio ? { id: giudizio.id } : {}),
            allievoId: testo(valori.chi) || null,
            testo: scritto,
            ...(lezione
              ? { lezioneId: lezione.id }
              : { data: testo(valori.data) || null, lezioneId: null }),
          },
        },
        t.giudizioSalvato,
      )
    },
    azioniSecondarie: giudizio
      ? (contesto) =>
          tastoElimina({
            contesto,
            chiedi: { titolo: t.eliminareGiudizio, testo: giudizio.testo },
            azione: {
              tipo: 'progetto.giudizio.elimina',
              progettoId: progetto.id,
              corsoId: progetto.corsoId,
              giudizioId: giudizio.id,
            },
            fatto: t.giudizioEliminato,
          })
      : undefined,
  })
}

/** Una casella della matrice per intero: il livello e una nota, in quel giorno. */
export function moduloCella (opzioni: {
  progetto: ProgettoNelCorso
  allievo: Allievo
  criterio: CriterioProgetto
  livello: string | null
  nota: string
  quando: { lezioneId: string } | { data: Iso }
}): void {
  const { progetto, allievo, criterio, quando } = opzioni
  const t = testi()
  apriModale({
    titolo: `${nomeCompleto(allievo)} · ${criterio.titolo}`,
    sottotitolo: 'lezioneId' in quando
      ? t.nellOraDel(formattaData(stato.registro.lezioni.find((l) => l.id === quando.lezioneId)?.data ?? '', 'lungo'))
      : formattaData(quando.data, 'lungo'),
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'livello',
          etichetta: t.livello,
          tipo: 'select',
          valore: opzioni.livello ?? '',
          opzioni: [
            { valore: '', testo: t.senzaLivello },
            ...progetto.livelli.map((l) => ({ valore: l.valore, testo: l.testo })),
          ],
        }),
        campo({
          nome: 'nota',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 3,
          valore: opzioni.nota,
        }),
      ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        {
          tipo: 'progetto.cella',
          progettoId: progetto.id,
          corsoId: progetto.corsoId,
          allievoId: allievo.id,
          criterioId: criterio.id,
          ...quando,
          livello: testo(valori.livello) || null,
          nota: testo(valori.nota),
        },
        t.cellaSalvata,
      )
    },
  })
}
