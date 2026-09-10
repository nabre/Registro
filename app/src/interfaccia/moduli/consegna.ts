// Le consegne: che cosa si è dato da fare, a chi, entro quando.
//
// Il termine si dice in due modi, una lezione o un giorno, e la differenza non è
// formale: legato alla lezione, spostando quell'ora si sposta anche il termine.

import { nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { formattaData, oggi } from '../../dominio/date.js'
import { PIF } from '../../dominio/lessico.js'
import { creaConsegna } from '../../dominio/fabbriche.js'
import type {
  CategoriaDocumento,
  VersoDocumento,
  Consegna,
  Lezione,
} from '../../dominio/modelli.js'
import { campo, riga, sezioneModulo } from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { h, rimpiazza } from '../dom.js'
import { classeDelCorsoId, materiaDelCorsoId, nomeCorso, stato } from '../stato.js'

import {
  VOCI_CATEGORIA_DOCUMENTO,
  VOCI_TIPO_CONSEGNA,
  campoCorso,
  campoDi,
  corsoBuono,
  salva,
  tastoElimina,
  testo,
} from './comune.js'

export interface OpzioniModuloConsegna {
  consegna?: Consegna
  /** L'ora da cui si sta assegnando: dà corso, data e proposta di termine. */
  lezione?: Lezione
  corsoId?: string
  /**
   * A chi tocca, proposto. Dal pannello del docente di classe si parte da «a
   * me»: lì la cosa che ci si segna è quasi sempre propria, e chi assegna un
   * compito alla classe lo fa dall'ora, dove il valore giusto è l'altro.
   */
  a?: Consegna['a']
  /** Parte già come raccolta di documenti: si arriva da «Chiedi un documento». */
  documento?: boolean
}

/**
 * Una consegna: che cosa si è dato da fare, a chi, entro quando.
 *
 * Le due date si dicono in due modi, e la tendina lo rende esplicito: «la
 * prossima volta» non è una data, è un'ora — legarla alla lezione fa sì che
 * spostando quell'ora si sposti anche il termine, che è quel che si intende
 * davvero. Un giorno secco serve quando il termine non coincide con nessuna
 * lezione: la gita, il modulo in segreteria, la consegna online.
 *
 * Il destinatario cambia chi dovrà spuntare: tutta la classe, chi insegna, o i
 * nomi scelti. La spunta resta individuale in ogni caso, perché «fatto» detto
 * di una classe non vuol dire niente — vuol dire fatto da chi l'ha fatto.
 */
export function moduloConsegna (opzioni: OpzioniModuloConsegna = {}): void {
  const lezione = opzioni.lezione ?? null
  const corsoIniziale = opzioni.consegna?.corsoId ?? lezione?.corsoId ?? corsoBuono(opzioni.corsoId)
  if (!corsoIniziale) {
    notifica('Serve prima un corso a cui agganciare la consegna.', 'avviso')
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

  // Aggiornati a ogni ricostruzione: `alSalva` li legge da qui, non dal corso
  // con cui il modulo si è aperto — che con la tendina può essere cambiato.
  let corsoAttuale = corsoIniziale
  let allieviAttuali: ReturnType<typeof ordinaAllievi> = []

  const corpoConCorso = (
    corsoId: string,
    allievi: ReturnType<typeof ordinaAllievi>,
    prossime: Lezione[],
    proposta: string,
  ) => [
    // Senza una lezione da cui ereditarlo, il corso è una scelta come le
    // altre: prima si apriva già assegnato a un corso indovinato, e sbagliarlo
    // voleva dire assegnare la consegna a una classe che non c'entrava.
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
      etichetta: 'Che cosa',
      valore: base.testo,
      segnaposto: 'esercizi 4–7 pagina 132',
      richiesto: true,
    }),
    riga(
      campo({
        nome: 'tipo',
        etichetta: 'Tipo',
        tipo: 'select',
        valore: base.tipo,
        opzioni: VOCI_TIPO_CONSEGNA,
        larghezza: 'meta',
      }),
      campo({
        nome: 'a',
        etichetta: 'A chi tocca',
        tipo: 'select',
        valore: base.a,
        opzioni: [
          { valore: 'classe', testo: 'Tutta la classe' },
          { valore: 'allievi', testo: `Solo alcune ${PIF.plurale}` },
          { valore: 'docente', testo: 'A me' },
        ],
        aiuto: 'La spunta resta individuale: si vede chi ha fatto e chi manca.',
        larghezza: 'meta',
      }),
    ),
    // Una consegna che si spunta portando un foglio è la stessa cosa di prima,
    // con un file dentro la spunta: da qui nasce la matrice dei documenti.
    riga(
      campo({
        nome: 'raccoglie',
        tipo: 'checkbox',
        etichetta: 'Si spunta consegnando un documento',
        valore: base.documento !== undefined,
        aiuto: 'Ognuno allega il suo file, e si vede a matrice chi non l’ha ancora portato.',
        larghezza: 'meta',
      }),
      h(
        'div',
        { class: 'modulo__zona campo campo--meta', dataset: { zona: 'categoria' } },
        campo({
          nome: 'categoria',
          etichetta: 'Che documento',
          tipo: 'select',
          valore: base.documento ?? 'altro',
          opzioni: VOCI_CATEGORIA_DOCUMENTO,
        }),
        // Da che parte va il foglio. Cambia il senso della spunta — «l'ha
        // portato» oppure «gliel'ho dato» — e con esso quel che la matrice sta
        // dicendo: sono i due mestieri del docente di classe, e finora il
        // registro ne conosceva uno solo.
        campo({
          nome: 'verso',
          etichetta: 'Chi lo porta',
          tipo: 'select',
          valore: base.verso ?? 'ricevo',
          opzioni: [
            { valore: 'ricevo', testo: `Me lo consegnano le ${PIF.plurale}` },
            { valore: 'consegno', testo: `Lo consegno io alle ${PIF.plurale}` },
          ],
          aiuto: 'Consegnando, la spunta dice che gliel’hai dato.',
        }),
        // La prova firmata non serve sempre: una circolare la si dà e basta.
        // Spunta, e non obbligo, perché è chi consegna a sapere se di quel
        // foglio dovrà rendere conto.
        campo({
          nome: 'firmeRichieste',
          etichetta: 'Serve il foglio delle firme di consegna',
          tipo: 'checkbox',
          valore: base.firmeRichieste ?? false,
          aiuto: 'Uno solo per tutta la richiesta, da allegare sotto la matrice.',
        }),
      ),
    ),
    h(
      'div',
      { class: 'modulo__zona', dataset: { zona: 'allievi' } },
      sezioneModulo(
        'Chi',
        allievi.length === 0
          ? h('p', { class: 'testo-quieto' }, `La classe non ha ${PIF.plurale} che frequentano.`)
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
      'Entro quando',
      riga(
        campo({
          nome: 'modoScadenza',
          etichetta: 'Il termine è',
          tipo: 'select',
          valore: base.scadenzaLezioneId ? 'lezione' : base.scadenza ? 'data' : 'nessuno',
          opzioni: [
            { valore: 'lezione', testo: 'Una lezione del corso' },
            { valore: 'data', testo: 'Un giorno preciso' },
            { valore: 'nessuno', testo: 'Nessun termine' },
          ],
          aiuto: 'Legandolo a una lezione, spostando quell’ora si sposta anche il termine.',
          larghezza: 'meta',
        }),
        h(
          'div',
          { class: 'modulo__zona campo campo--meta', dataset: { zona: 'scadenzaLezione' } },
          campo({
            nome: 'scadenzaLezioneId',
            etichetta: 'Per la lezione del',
            tipo: 'select',
            valore: proposta,
            opzioni:
              prossime.length > 0
                ? prossime.map((l) => ({
                    valore: l.id,
                    testo:
                      `${formattaData(l.data, 'giorno')} · ${formattaData(l.data)}` +
                      // Solo quando non è del corso della consegna: dirlo sempre
                      // ripeterebbe la stessa materia in tutte le righe.
                      (l.corsoId === corsoId ? '' : ` · ${materiaDelCorsoId(l.corsoId)?.nome ?? 'altra materia'}`),
                  }))
                : [{ valore: '', testo: 'nessuna lezione futura' }],
          }),
        ),
        h(
          'div',
          { class: 'modulo__zona campo campo--meta', dataset: { zona: 'scadenzaData' } },
          campo({
            nome: 'scadenza',
            etichetta: 'Entro il',
            tipo: 'date',
            valore: base.scadenza ?? '',
          }),
        ),
      ),
    ),
    campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: base.note ?? '' }),
  ]

  /**
   * Ricostruisce quel che dipende dal corso: chi c'è nella classe, e in quali
   * ore future la si rivede. Serve anche alla prima stesura — quando il modulo
   * è aperto senza una lezione non c'è altro modo di scegliere il corso — e a
   * ogni cambio dalla tendina che compare in quel caso.
   */
  const disegna = (corsoId: string) => {
    corsoAttuale = corsoId
    const classe = classeDelCorsoId(corsoId)
    allieviAttuali = ordinaAllievi((classe?.allievi ?? []).filter((a) => a.attivo))

    // Le ore future in cui si rivede questa classe, non solo quelle del corso:
    // il termine che si dà davvero è «per la prossima volta che li vedo», e
    // quella volta può essere l'ora di un'altra materia — per il docente di
    // classe, che raccoglie moduli e firme, è quasi sempre così. La prima è
    // quella proposta.
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

    // La scadenza già scelta resta fra le opzioni anche se è passata, o se non
    // è più fra le ore future di questo corso: sparire dalla tendina vorrebbe
    // dire azzerarla in silenzio al primo salvataggio.
    const scadenzaCorrente = base.scadenzaLezioneId
      ? stato.registro.lezioni.find((l) => l.id === base.scadenzaLezioneId) ?? null
      : null
    const prossime =
      scadenzaCorrente && !prossimeFuture.some((l) => l.id === scadenzaCorrente.id)
        ? [scadenzaCorrente, ...prossimeFuture]
        : prossimeFuture

    const proposta = base.scadenzaLezioneId ?? prossime[0]?.id ?? ''

    rimpiazza(contenitore, corpoConCorso(corsoId, allieviAttuali, prossime, proposta))
    mostra(contenitore)
  }

  disegna(corsoIniziale)

  // Le tendine che scoprono i campi: si ascolta il contenitore una volta sola,
  // così le zone restano giuste anche se un giorno se ne aggiunge un'altra.
  contenitore.addEventListener('change', () => mostra(contenitore))

  apriModale({
    titolo: modifica ? 'Modifica la consegna' : 'Nuova consegna',
    sottotitolo: `${nomeCorso(corsoIniziale)}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`,
    larghezza: 'media',
    corpo: () => contenitore,
    alSalva: async (valori, contesto) => {
      const a = testo(valori.a) as Consegna['a']
      const modo = testo(valori.modoScadenza)
      const scelti = allieviAttuali.filter((allievo) => Boolean(valori[`allievo-${allievo.id}`]))

      const aggiornata: Consegna = {
        ...base,
        corsoId: testo(valori.corsoId) || corsoAttuale,
        testo: testo(valori.testo),
        tipo: testo(valori.tipo) as Consegna['tipo'],
        documento: valori.raccoglie
          ? (testo(valori.categoria) as CategoriaDocumento)
          : undefined,
        verso: valori.raccoglie ? (testo(valori.verso) as VersoDocumento) : undefined,
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
        modifica ? 'Consegna aggiornata.' : 'Consegna assegnata.',
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: 'Eliminare la consegna?',
              testo: 'Spariscono anche le spunte di chi l’aveva già fatta.',
              testoConferma: 'Elimina',
            },
            azione: { tipo: 'consegna.elimina', consegnaId: base.id },
            fatto: 'Consegna eliminata.',
          })
        : null,
  })
}

