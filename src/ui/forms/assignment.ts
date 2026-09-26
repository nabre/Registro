// Le consegne: che cosa si è dato da fare, a chi, entro quando.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { formattaData, oggi } from '../../domain/dates.js'
import { parole } from '../../domain/words.testi.js'
import { creaConsegna } from '../../domain/factories.js'
import type {
  CategoriaDocumento,
  VersoDocumento,
  Consegna,
  Lezione,
} from '../../domain/models.js'
import { campo, quieto, riga, sezioneModulo, valoriModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza } from '../dom.js'
import { classeDelCorsoId, lezionePerId, materiaDelCorsoId, nomeCorso, stato } from '../state.js'

import {
  VOCI_CATEGORIA_DOCUMENTO,
  VOCI_TIPO_CONSEGNA,
  baseViva,
  campoDi,
  corsoBuono,
  salva,
  tastoElimina,
  testo,
} from './common.js'
import { campoCorso } from './course.js'
import { testi } from './assignment.testi.js'

export interface OpzioniModuloConsegna {
  consegna?: Consegna
  /** L'ora da cui si sta assegnando: dà corso, data e proposta di termine. */
  lezione?: Lezione
  corsoId?: string
  /**
   * A chi tocca, proposto: dal pannello del docente di classe «a me», dall'ora
   * alla classe.
   */
  a?: Consegna['a']
  /** Parte già come raccolta di documenti: si arriva da «Chiedi un documento». */
  documento?: boolean
}

/**
 * Una consegna: che cosa, a chi, entro quando. Il termine è un'ora («la
 * prossima volta», e si sposta con lei) o un giorno secco (gita, segreteria).
 * Il destinatario decide chi spunta: la classe, chi insegna, o i nomi scelti;
 * la spunta resta individuale.
 */
export function moduloConsegna (opzioni: OpzioniModuloConsegna = {}): void {
  const t = testi()
  const lezione = opzioni.lezione ?? null
  const corsoIniziale = opzioni.consegna?.corsoId ?? lezione?.corsoId ?? corsoBuono(opzioni.corsoId)
  if (!corsoIniziale) {
    notifica(t.serveCorso, 'avviso')
    return
  }

  const modifica = Boolean(opzioni.consegna)
  const base = opzioni.consegna ?? {
    ...creaConsegna(corsoIniziale, '', lezione?.data ?? stato.data ?? oggi(), lezione?.id ?? null),
    a: opzioni.a ?? 'classe',
    tipo: opzioni.documento ? ('consegna' as const) : ('compito' as const),
    documento: opzioni.documento ? ('altro' as const) : undefined,
  }

  /** Mostra i campi che servono al modo scelto, e nasconde gli altri. */
  const mostra = (contenitore: HTMLElement) => {
    const valore = (nome: string) => campoDi(contenitore, nome)?.value ?? ''
    const scopri = (chiave: string, acceso: boolean) => {
      const zona = contenitore.querySelector<HTMLElement>(`[data-zona="${chiave}"]`)
      if (zona) zona.hidden = !acceso
    }
    scopri('allievi', valore('a') === 'allievi')
    scopri('categoria', Boolean(campoDi(contenitore, 'raccoglie')?.checked))
    scopri('scadenzaLezione', valore('modoScadenza') === 'lezione')
    scopri('scadenzaData', valore('modoScadenza') === 'data')
  }

  const contenitore = h('div', { class: 'modulo' })

  // Aggiornato a ogni ricostruzione: la tendina può cambiare il corso.
  let corsoAttuale = corsoIniziale
  let allieviAttuali: ReturnType<typeof ordinaAllievi> = []

  /**
   * Quel che era scritto nei campi prima dell'ultimo ricambio del corpo: cambiare
   * corso rifà il modulo, ma testo, tipo, destinatari e note restano. Spunte
   * delle persone e scadenza legata a un'ora no: sono di un'altra classe.
   */
  let scritti: Record<string, string | number | boolean> = {}
  const val = <T extends string | number | boolean>(nome: string, dal: T): T =>
    (nome in scritti ? (scritti[nome] as T) : dal)

  const corpoConCorso = (
    corsoId: string,
    allievi: ReturnType<typeof ordinaAllievi>,
    prossime: Lezione[],
    proposta: string,
  ) => [
    // Senza una lezione da cui ereditarlo, il corso si sceglie.
    lezione
      ? null
      : riga(
          campoCorso({
            valore: corsoId,
            richiesto: true,
            al: (valore) => disegna(valore),
          }),
        ),
    campo({
      nome: 'testo',
      etichetta: parole().cheCosa,
      valore: val('testo', base.testo),
      segnaposto: t.segnapostoTesto,
      richiesto: true,
    }),
    riga(
      campo({
        nome: 'tipo',
        etichetta: parole().tipo,
        tipo: 'select',
        valore: val('tipo', base.tipo),
        opzioni: VOCI_TIPO_CONSEGNA,
        larghezza: 'meta',
      }),
      campo({
        nome: 'a',
        etichetta: t.aChiTocca,
        tipo: 'select',
        valore: val('a', base.a),
        opzioni: [
          { valore: 'classe', testo: t.destinatari.classe },
          { valore: 'allievi', testo: t.destinatari.allievi },
          { valore: 'docente', testo: t.destinatari.docente },
        ],
        aiuto: t.aiutoDestinatari,
        larghezza: 'meta',
      }),
    ),
    // Una consegna col foglio dentro la spunta: da qui nasce la matrice dei documenti.
    riga(
      campo({
        nome: 'raccoglie',
        tipo: 'checkbox',
        etichetta: t.raccoglie,
        valore: val('raccoglie', base.documento !== undefined),
        aiuto: t.aiutoRaccoglie,
        larghezza: 'meta',
      }),
      h(
        'div',
        { class: 'modulo__zona campo campo--meta', dataset: { zona: 'categoria' } },
        campo({
          nome: 'categoria',
          etichetta: t.cheDocumento,
          tipo: 'select',
          valore: val('categoria', base.documento ?? 'altro'),
          opzioni: VOCI_CATEGORIA_DOCUMENTO,
        }),
        // Da che parte va il foglio: «l'ha portato» o «gliel'ho dato», i due mestieri
        // del docente di classe.
        campo({
          nome: 'verso',
          etichetta: t.chiLoPorta,
          tipo: 'select',
          valore: val('verso', base.verso ?? 'ricevo'),
          opzioni: [
            { valore: 'ricevo', testo: t.versi.ricevo },
            { valore: 'consegno', testo: t.versi.consegno },
          ],
          aiuto: t.aiutoVerso,
        }),
        // Come arriva a destinazione quando consegna il docente (le mail le prepara
        // `actions/assignments.ts`).
        campo({
          nome: 'modoConsegna',
          etichetta: t.comeLoConsegno,
          tipo: 'select',
          valore: val('modoConsegna', base.modoConsegna ?? 'mano'),
          opzioni: [
            { valore: 'mano', testo: t.modi.mano },
            { valore: 'email', testo: t.modi.email },
          ],
          aiuto: t.aiutoModo,
        }),
        // La prova firmata non serve sempre: lo sa chi consegna.
        campo({
          nome: 'firmeRichieste',
          etichetta: t.firme,
          tipo: 'checkbox',
          valore: val('firmeRichieste', base.firmeRichieste ?? false),
          aiuto: t.aiutoFirme,
        }),
      ),
    ),
    h(
      'div',
      { class: 'modulo__zona', dataset: { zona: 'allievi' } },
      sezioneModulo(
        parole().chi,
        allievi.length === 0
          ? quieto(t.nessunaPif)
          : h(
              'div',
              { class: 'scelta-allievi' },
              ...allievi.map((allievo) =>
                h(
                  'label',
                  { class: 'scelta-allievi__voce' },
                  h('input', {
                    type: 'checkbox',
                    name: `allievo-${allievo.id}`,
                    checked: base.allieviIds.includes(allievo.id),
                  }),
                  h('span', null, nomeCompleto(allievo)),
                ),
              ),
            ),
      ),
    ),
    sezioneModulo(
      t.entroQuando,
      riga(
        campo({
          nome: 'modoScadenza',
          etichetta: t.ilTermineE,
          tipo: 'select',
          valore: base.scadenzaLezioneId ? 'lezione' : base.scadenza ? 'data' : 'nessuno',
          opzioni: [
            { valore: 'lezione', testo: t.modiScadenza.lezione },
            { valore: 'data', testo: t.modiScadenza.data },
            { valore: 'nessuno', testo: t.modiScadenza.nessuno },
          ],
          aiuto: t.aiutoTermine,
          larghezza: 'meta',
        }),
        h(
          'div',
          { class: 'modulo__zona campo campo--meta', dataset: { zona: 'scadenzaLezione' } },
          campo({
            nome: 'scadenzaLezioneId',
            etichetta: t.perLaLezioneDel,
            tipo: 'select',
            valore: proposta,
            opzioni:
              prossime.length > 0
                ? prossime.map((l) => ({
                    valore: l.id,
                    testo:
                      `${formattaData(l.data, 'giorno')} · ${formattaData(l.data)}` +
                      // Solo quando non è del corso della consegna, per non ripetere la materia.
                      (l.corsoId === corsoId
                        ? ''
                        : ` · ${materiaDelCorsoId(l.corsoId)?.nome ?? t.altraMateria}`),
                  }))
                : [{ valore: '', testo: t.nessunaLezioneFutura }],
          }),
        ),
        h(
          'div',
          { class: 'modulo__zona campo campo--meta', dataset: { zona: 'scadenzaData' } },
          campo({
            nome: 'scadenza',
            etichetta: t.entroIl,
            tipo: 'date',
            valore: base.scadenza ?? '',
          }),
        ),
      ),
    ),
    campo({
      nome: 'note',
      etichetta: parole().note,
      tipo: 'textarea',
      righe: 2,
      valore: base.note ?? '',
    }),
  ]

  /**
   * Ricostruisce quel che dipende dal corso: le persone della classe e le ore
   * future in cui la si rivede. Serve alla prima stesura e a ogni cambio di corso.
   */
  const disegna = (corsoId: string) => {
    corsoAttuale = corsoId
    const classe = classeDelCorsoId(corsoId)
    allieviAttuali = ordinaAllievi(classe ? allieviAttivi(classe) : [])

    // Le ore future in cui si rivede la classe, di qualunque materia: il termine
    // vero è «la prossima volta che li vedo». La prima è quella proposta.
    const corsiDellaClasse = new Set(
      classe
        ? stato.registro.corsi.filter((c) => c.classeId === classe.id).map((c) => c.id)
        : [corsoId],
    )
    const prossimeFuture = stato.registro.lezioni
      .filter(
        (l) =>
          corsiDellaClasse.has(l.corsoId) &&
          l.stato !== 'annullata' &&
          l.data >= (lezione?.data ?? oggi()) &&
          l.id !== lezione?.id,
      )
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 30)

    // La scadenza già scelta resta fra le opzioni anche se passata o d'altro
    // corso, se no il primo salvataggio la azzererebbe.
    const scadenzaCorrente = lezionePerId(base.scadenzaLezioneId)
    const prossime =
      scadenzaCorrente && !prossimeFuture.some((l) => l.id === scadenzaCorrente.id)
        ? [scadenzaCorrente, ...prossimeFuture]
        : prossimeFuture

    const proposta = base.scadenzaLezioneId ?? prossime[0]?.id ?? ''

    // Prima di buttare via il corpo si prende nota di quel che c'era dentro.
    if (contenitore.childElementCount > 0) scritti = valoriModulo(contenitore)
    rimpiazza(contenitore, corpoConCorso(corsoId, allieviAttuali, prossime, proposta))
    mostra(contenitore)
  }

  disegna(corsoIniziale)

  // Le tendine che scoprono i campi: un ascoltatore solo sul contenitore.
  contenitore.addEventListener('change', () => mostra(contenitore))

  apriModale({
    titolo: modifica ? t.titoloModifica : t.titoloNuova,
    sottotitolo: `${nomeCorso(corsoIniziale)}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`,
    larghezza: 'media',
    corpo: () => contenitore,
    alSalva: async (valori, contesto) => {
      const a = testo(valori.a) as Consegna['a']
      const modo = testo(valori.modoScadenza)
      const scelti = allieviAttuali.filter((allievo) => Boolean(valori[`allievo-${allievo.id}`]))

      // Com'è adesso: le spunte arrivate a modulo aperto non devono tornare indietro.
      const viva = baseViva(
        contesto,
        modifica,
        base,
        stato.registro.consegne.find((c) => c.id === base.id),
      )
      if (!viva) return
      const aggiornata: Consegna = {
        ...viva,
        corsoId: testo(valori.corsoId) || corsoAttuale,
        testo: testo(valori.testo),
        tipo: testo(valori.tipo) as Consegna['tipo'],
        documento: valori.raccoglie
          ? (testo(valori.categoria) as CategoriaDocumento)
          : undefined,
        verso: valori.raccoglie ? (testo(valori.verso) as VersoDocumento) : undefined,
        // Solo quando si consegna: ricevendo non c'è niente da mandare.
        modoConsegna:
          valori.raccoglie && testo(valori.verso) === 'consegno'
            ? (testo(valori.modoConsegna) as Consegna['modoConsegna'])
            : undefined,
        firmeRichieste: valori.raccoglie ? Boolean(valori.firmeRichieste) : undefined,
        a,
        allieviIds: a === 'allievi' ? scelti.map((allievo) => allievo.id) : [],
        scadenzaLezioneId: modo === 'lezione' ? testo(valori.scadenzaLezioneId) || null : null,
        scadenza: modo === 'data' ? testo(valori.scadenza) || null : null,
        note: testo(valori.note),
      }

      await salva(
        contesto,
        { tipo: 'consegna.salva', consegna: aggiornata },
        modifica ? t.aggiornata : t.assegnata,
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: t.eliminare,
              testo: t.sparisconoSpunte,
              testoConferma: parole().elimina,
            },
            azione: { tipo: 'consegna.elimina', consegnaId: base.id },
            fatto: t.eliminata,
          })
        : null,
  })
}

