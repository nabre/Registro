// Le consegne: che cosa si è dato da fare, a chi, entro quando.
// Versatile per l'insegnamento di una materia o per la docenza di classe.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { formattaData, oggi } from '#core/dominio/dates.js'
import { parole } from '#core/dominio/words.testi.js'
import { creaConsegna } from '#core/dominio/factories.js'
import type {
  CategoriaDocumento,
  VersoDocumento,
  Consegna,
  Lezione,
} from '#core/dominio/models.js'
import { campo, quieto, riga, sezioneModulo, valoriModulo } from '#ui/components/base.js'
import { icona } from '#ui/components/icons.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { gestisci, h, rimpiazza } from '#ui/dom.js'
import {
  classeDelCorsoId,
  classePerId,
  classiDiCuiSonoDocente,
  corsiDi,
  lezionePerId,
  materiaDelCorsoId,
  nomeCorso,
  stato,
} from '#ui/state.js'

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

interface OpzioniModuloConsegna {
  consegna?: Consegna
  /** L'ora da cui si sta assegnando: dà corso, data e proposta di termine. */
  lezione?: Lezione
  corsoId?: string
  classeId?: string
  /** Nel lavoro del corso il corso è il contesto, non un campo modificabile. */
  corsoFisso?: boolean
  /** Ambito iniziale proposto. */
  ambito?: 'corso' | 'classe'
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
  const classiDocente = classiDiCuiSonoDocente()
  const modifica = Boolean(opzioni.consegna)

  // Risoluzione ambito iniziale
  const classeDellaConsegna = opzioni.consegna
    ? classeDelCorsoId(opzioni.consegna.corsoId)
    : null

  const classeInizialeDocente = opzioni.classeId
    ? classiDocente.find((c) => c.id === opzioni.classeId) ?? null
    : (classeDellaConsegna && classeDellaConsegna.docenteDiClasse ? classeDellaConsegna : null)

  let ambitoIniziale: 'corso' | 'classe' =
    opzioni.ambito ??
    (opzioni.consegna?.docenteDiClasse
      ? 'classe'
      : opzioni.consegna && classeDellaConsegna?.docenteDiClasse && opzioni.consegna.tipo === 'amministrativo'
        ? 'classe'
        : (classeInizialeDocente && !opzioni.corsoId && !opzioni.consegna ? 'classe' : 'corso'))

  if (classiDocente.length === 0) {
    ambitoIniziale = 'corso'
  }

  const corsoIniziale =
    opzioni.consegna?.corsoId ??
    lezione?.corsoId ??
    (ambitoIniziale === 'classe' && classeInizialeDocente
      ? corsiDi(classeInizialeDocente.id)[0]?.id ?? corsoBuono(opzioni.corsoId)
      : corsoBuono(opzioni.corsoId))

  if (!corsoIniziale) {
    notifica(t.serveCorso, 'avviso')
    return
  }

  const base = opzioni.consegna ?? {
    ...creaConsegna(
      corsoIniziale,
      '',
      lezione?.data ?? stato.data ?? oggi(),
      lezione?.id ?? null,
      ambitoIniziale === 'classe',
    ),
    a: opzioni.a ?? 'classe',
    tipo: opzioni.documento
      ? ('consegna' as const)
      : ambitoIniziale === 'classe'
        ? ('amministrativo' as const)
        : ('compito' as const),
    documento: opzioni.documento ? ('altro' as const) : undefined,
  }

  const contenitore = h('div', { class: 'modulo' })

  let ambitoAttuale = ambitoIniziale
  let corsoAttuale = corsoIniziale
  let classeDocenteAttualeId: string | null =
    classeInizialeDocente?.id ??
    (classeDelCorsoId(corsoIniziale)?.docenteDiClasse
      ? (classeDelCorsoId(corsoIniziale)?.id ?? null)
      : null) ??
    (classiDocente[0]?.id ?? null)
  let allieviAttuali: ReturnType<typeof ordinaAllievi> = []

  let scritti: Record<string, string | number | boolean> = {}
  const val = <T extends string | number | boolean>(nome: string, dal: T): T =>
    nome in scritti ? (scritti[nome] as T) : dal

  /** Mostra i campi che servono al modo scelto, e nasconde gli altri. */
  const mostra = (contenitoreElement: HTMLElement) => {
    const valore = (nome: string) => campoDi(contenitoreElement, nome)?.value ?? ''
    const scopri = (chiave: string, acceso: boolean) => {
      const zona = contenitoreElement.querySelector<HTMLElement>(`[data-zona="${chiave}"]`)
      if (zona) zona.hidden = !acceso
    }
    scopri('allievi', valore('a') === 'allievi')
    scopri('categoria', Boolean(campoDi(contenitoreElement, 'raccoglie')?.checked))
    scopri('scadenzaLezione', valore('modoScadenza') === 'lezione')
    scopri('scadenzaData', valore('modoScadenza') === 'data')
  }

  const corpoConCorso = (
    corsoId: string,
    allievi: ReturnType<typeof ordinaAllievi>,
    prossime: Lezione[],
    proposta: string,
  ) => {
    const puoCambiareAmbito =
      !lezione && !opzioni.corsoFisso && classiDocente.length > 0

    const selettoreAmbito = puoCambiareAmbito
      ? h(
          'div',
          { class: 'campo' },
          h('label', { class: 'campo__etichetta' }, t.ambito),
          h(
            'div',
            {
              class: 'selettore',
              attr: { role: 'tablist', 'aria-label': t.ambito },
            },
            h(
              'button',
              {
                class: ['selettore__voce', ambitoAttuale === 'corso' && 'selettore__voce--attiva'],
                type: 'button',
                role: 'tab',
                attr: { 'aria-selected': String(ambitoAttuale === 'corso') },
                onclick: () => cambiaAmbito('corso'),
              },
              icona('libro', 'icona--minuta'),
              h('span', null, t.ambitoCorso),
            ),
            h(
              'button',
              {
                class: ['selettore__voce', ambitoAttuale === 'classe' && 'selettore__voce--attiva'],
                type: 'button',
                role: 'tab',
                attr: { 'aria-selected': String(ambitoAttuale === 'classe') },
                onclick: () => cambiaAmbito('classe'),
              },
              icona('classi', 'icona--minuta'),
              h('span', null, t.ambitoClasse),
            ),
          ),
          h('p', { class: 'testo-quieto' }, t.aiutoAmbito),
        )
      : null

    const rigaDestinazione =
      lezione || opzioni.corsoFisso
        ? null
        : ambitoAttuale === 'classe'
          ? riga(
              campo({
                nome: 'classeId',
                etichetta: t.ambitoClasse,
                tipo: 'select',
                valore: classeDocenteAttualeId ?? '',
                opzioni: classiDocente.map((c) => ({
                  valore: c.id,
                  testo: t.classeDocenteEtichetta(c.nome),
                })),
                richiesto: true,
                al: (valore) => {
                  const classe = classePerId(valore)
                  if (classe) {
                    const suoCorso = corsiDi(classe.id)[0]
                    if (suoCorso) {
                      disegna(suoCorso.id, classe.id)
                    } else {
                      notifica(t.nessunCorsoPerClasse, 'avviso')
                    }
                  }
                },
              }),
            )
          : riga(
              campoCorso({
                valore: corsoId,
                richiesto: true,
                al: (valore) => disegna(valore, null),
              }),
            )

    return [
      selettoreAmbito,
      rigaDestinazione,
      campo({
        nome: 'testo',
        etichetta: parole().cheCosa,
        valore: val('testo', base.testo),
        segnaposto:
          ambitoAttuale === 'classe' ? t.segnapostoTestoClasse : t.segnapostoTesto,
        richiesto: true,
      }),
      riga(
        campo({
          nome: 'tipo',
          etichetta: parole().tipo,
          tipo: 'select',
          valore: val(
            'tipo',
            ambitoAttuale === 'classe' && !modifica ? 'amministrativo' : base.tipo,
          ),
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
                        formattaData(l.data, 'settimana') +
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
  }

  const disegna = (corsoId: string, classeId: string | null) => {
    corsoAttuale = corsoId
    const classe = classeId ? classePerId(classeId) : classeDelCorsoId(corsoId)
    if (classeId) classeDocenteAttualeId = classeId
    allieviAttuali = ordinaAllievi(classe ? allieviAttivi(classe) : [])

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

    const scadenzaCorrente = lezionePerId(base.scadenzaLezioneId)
    const prossime =
      scadenzaCorrente && !prossimeFuture.some((l) => l.id === scadenzaCorrente.id)
        ? [scadenzaCorrente, ...prossimeFuture]
        : prossimeFuture

    const proposta = base.scadenzaLezioneId ?? prossime[0]?.id ?? ''

    if (contenitore.childElementCount > 0) scritti = valoriModulo(contenitore)
    rimpiazza(contenitore, ...corpoConCorso(corsoId, allieviAttuali, prossime, proposta))
    mostra(contenitore)
  }

  const cambiaAmbito = (nuovoAmbito: 'corso' | 'classe') => {
    if (nuovoAmbito === ambitoAttuale) return
    ambitoAttuale = nuovoAmbito
    if (contenitore.childElementCount > 0) scritti = valoriModulo(contenitore)

    if (nuovoAmbito === 'classe') {
      const targetClasse =
        classiDocente.find((c) => c.id === classeDocenteAttualeId) ??
        (classeDelCorsoId(corsoAttuale)?.docenteDiClasse ? classeDelCorsoId(corsoAttuale) : null) ??
        classiDocente[0]
      if (targetClasse) {
        classeDocenteAttualeId = targetClasse.id
        const suoCorso = corsiDi(targetClasse.id)[0]
        if (suoCorso) {
          corsoAttuale = suoCorso.id
        }
      }
    } else {
      const classe = classeDocenteAttualeId ? classePerId(classeDocenteAttualeId) : null
      const corsiDellaClasse = classe ? corsiDi(classe.id) : []
      corsoAttuale = corsiDellaClasse[0]?.id ?? corsoBuono(opzioni.corsoId)
      classeDocenteAttualeId = null
    }

    disegna(corsoAttuale, classeDocenteAttualeId)
  }

  disegna(corsoIniziale, ambitoIniziale === 'classe' ? classeDocenteAttualeId : null)

  gestisci(contenitore, 'change', () => mostra(contenitore))

  apriModale({
    titolo: modifica ? t.titoloModifica : t.titoloNuova,
    sottotitolo:
      ambitoAttuale === 'classe' && classeDocenteAttualeId
        ? `${t.classeDocenteEtichetta(classePerId(classeDocenteAttualeId)?.nome ?? '')}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`
        : `${nomeCorso(corsoAttuale)}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`,
    larghezza: 'media',
    corpo: () => contenitore,
    alSalva: async (valori, contesto) => {
      const a = testo(valori.a) as Consegna['a']
      const modo = testo(valori.modoScadenza)
      const scelti = allieviAttuali.filter((allievo) => Boolean(valori[`allievo-${allievo.id}`]))

      let corsoSceltoId = corsoAttuale
      if (ambitoAttuale === 'classe' && valori.classeId) {
        const cId = testo(valori.classeId)
        const suoCorso = corsiDi(cId)[0]
        if (suoCorso) corsoSceltoId = suoCorso.id
      } else if (valori.corsoId) {
        corsoSceltoId = testo(valori.corsoId)
      }

      const viva = baseViva(
        contesto,
        modifica,
        base,
        stato.registro.consegne.find((c) => c.id === base.id),
      )
      if (!viva) return

      const corsoCambiato = corsoSceltoId !== viva.corsoId
      const allieviIdsValidi = new Set(allieviAttuali.map((allievo) => allievo.id))
      const allieviScelti = a === 'allievi'
        ? scelti.map((allievo) => allievo.id).filter((id) => allieviIdsValidi.has(id))
        : []

      const aggiornata: Consegna = {
        ...viva,
        docenteDiClasse: ambitoAttuale === 'classe',
        corsoId: corsoSceltoId,
        testo: testo(valori.testo),
        tipo: testo(valori.tipo) as Consegna['tipo'],
        documento: valori.raccoglie
          ? (testo(valori.categoria) as CategoriaDocumento)
          : undefined,
        verso: valori.raccoglie ? (testo(valori.verso) as VersoDocumento) : undefined,
        modoConsegna:
          valori.raccoglie && testo(valori.verso) === 'consegno'
            ? (testo(valori.modoConsegna) as Consegna['modoConsegna'])
            : undefined,
        firmeRichieste: valori.raccoglie ? Boolean(valori.firmeRichieste) : undefined,
        a,
        allieviIds: allieviScelti,
        dataLezioneId: corsoCambiato ? null : viva.dataLezioneId,
        scadenzaLezioneId: modo === 'lezione' ? testo(valori.scadenzaLezioneId) || null : null,
        scadenza: modo === 'data' ? testo(valori.scadenza) || null : null,
        note: testo(valori.note),
        fatte: corsoCambiato
          ? viva.fatte.filter((f) => f.chi === 'docente' || allieviIdsValidi.has(f.chi))
          : viva.fatte,
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
