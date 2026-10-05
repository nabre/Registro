// Le consegne: che cosa si è dato da fare, a chi, entro quando.
// Versatile per l'insegnamento di una materia o per la docenza di classe.

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { formattaData, oggi } from '#core/dominio/dates.js'
import { parole } from '#core/dominio/words.testi.js'
import { creaConsegna } from '#core/dominio/factories.js'
import type {
  CategoriaDocumento,
  Classe,
  VersoDocumento,
  Consegna,
  Lezione,
} from '#core/dominio/models.js'
import { Campo, Quieto, Riga, SezioneModulo, valoriModulo } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { classi } from '#ui/classNames.js'
import { Input } from '#ui/fields.js'
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
  TastoElimina,
  baseViva,
  campoDi,
  corsoBuono,
  salva,
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

type Allievi = ReturnType<typeof ordinaAllievi>

/** Dove va la consegna adesso: lo cambiano ambito, classe e corso, lo legge il Salva. */
interface Destinazione {
  ambito: 'corso' | 'classe'
  corso: string
  classeDocenteId: string | null
  allievi: Allievi
}

/** Quel che il corpo disegna per una destinazione. */
interface Vista {
  corsoId: string
  allievi: Allievi
  prossime: Lezione[]
  proposta: string
  /** Quel che era scritto prima di rifare il corpo: lo si rimette. */
  scritti: Record<string, string | number | boolean>
}

/** Mostra i campi che servono al modo scelto, e nasconde gli altri. */
function mostra (contenitore: HTMLElement): void {
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

  const dove: Destinazione = {
    ambito: ambitoIniziale,
    corso: corsoIniziale,
    classeDocenteId:
      classeInizialeDocente?.id ??
      (classeDelCorsoId(corsoIniziale)?.docenteDiClasse
        ? (classeDelCorsoId(corsoIniziale)?.id ?? null)
        : null) ??
      (classiDocente[0]?.id ?? null),
    allievi: [],
  }

  /** Porta la destinazione su corso e classe, e prepara quel che il corpo disegna. */
  const prepara = (
    corsoId: string,
    classeId: string | null,
    scritti: Vista['scritti'],
  ): Vista => {
    dove.corso = corsoId
    const classe = classeId ? classePerId(classeId) : classeDelCorsoId(corsoId)
    if (classeId) dove.classeDocenteId = classeId
    dove.allievi = ordinaAllievi(classe ? allieviAttivi(classe) : [])

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
    return { corsoId, allievi: dove.allievi, prossime, proposta, scritti }
  }

  const prima = prepara(corsoIniziale, ambitoIniziale === 'classe' ? dove.classeDocenteId : null, {})

  apriModale({
    titolo: modifica ? t.titoloModifica : t.titoloNuova,
    sottotitolo:
      dove.ambito === 'classe' && dove.classeDocenteId
        ? `${t.classeDocenteEtichetta(classePerId(dove.classeDocenteId)?.nome ?? '')}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`
        : `${nomeCorso(dove.corso)}${lezione ? ` · ${formattaData(lezione.data, 'lungo')}` : ''}`,
    larghezza: 'media',
    corpo: () => (
      <CorpoConsegna
        opzioni={opzioni}
        base={base}
        modifica={modifica}
        classiDocente={classiDocente}
        dove={dove}
        prepara={prepara}
        prima={prima}
      />
    ),
    alSalva: async (valori, contesto) => {
      const a = testo(valori.a) as Consegna['a']
      const modo = testo(valori.modoScadenza)
      const scelti = dove.allievi.filter((allievo) => Boolean(valori[`allievo-${allievo.id}`]))

      let corsoSceltoId = dove.corso
      if (dove.ambito === 'classe' && valori.classeId) {
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
      const allieviIdsValidi = new Set(dove.allievi.map((allievo) => allievo.id))
      const allieviScelti = a === 'allievi'
        ? scelti.map((allievo) => allievo.id).filter((id) => allieviIdsValidi.has(id))
        : []

      const aggiornata: Consegna = {
        ...viva,
        docenteDiClasse: dove.ambito === 'classe',
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
        ? (
            <TastoElimina
              contesto={contesto}
              chiedi={{
                titolo: t.eliminare,
                testo: t.sparisconoSpunte,
                testoConferma: parole().elimina,
              }}
              azione={{ tipo: 'consegna.elimina', consegnaId: base.id }}
              fatto={t.eliminata}
            />
          )
        : null,
  })
}

/**
 * Il corpo della consegna. Cambiando ambito, classe o corso si rifà da capo
 * (cambiano persone e lezioni fra cui scegliere), rimettendo quel che era scritto.
 */
function CorpoConsegna ({ opzioni, base, modifica, classiDocente, dove, prepara, prima }: {
  opzioni: OpzioniModuloConsegna
  base: Consegna
  modifica: boolean
  classiDocente: Classe[]
  dove: Destinazione
  prepara: (corsoId: string, classeId: string | null, scritti: Vista['scritti']) => Vista
  prima: Vista
}): ReactElement {
  const t = testi()
  const lezione = opzioni.lezione ?? null
  const [vista, impostaVista] = useState(prima)
  /** Cresce a ogni corpo rifatto: i campi ripartono dai valori di `scritti`. */
  const [versione, impostaVersione] = useState(0)
  const contenitore = useRef<HTMLDivElement | null>(null)

  // Le zone si accendono e si spengono a ogni scelta, e dopo ogni corpo rifatto.
  useLayoutEffect(() => {
    if (contenitore.current) mostra(contenitore.current)
  })
  useEffect(() => {
    const nodo = contenitore.current
    if (!nodo) return
    const ascolta = () => mostra(nodo)
    nodo.addEventListener('change', ascolta)
    return () => nodo.removeEventListener('change', ascolta)
  }, [])

  const disegna = (corsoId: string, classeId: string | null) => {
    const scritti = contenitore.current ? valoriModulo(contenitore.current) : {}
    impostaVista(prepara(corsoId, classeId, scritti))
    impostaVersione((n) => n + 1)
  }

  const cambiaAmbito = (nuovoAmbito: 'corso' | 'classe') => {
    if (nuovoAmbito === dove.ambito) return
    dove.ambito = nuovoAmbito

    if (nuovoAmbito === 'classe') {
      const targetClasse =
        classiDocente.find((c) => c.id === dove.classeDocenteId) ??
        (classeDelCorsoId(dove.corso)?.docenteDiClasse ? classeDelCorsoId(dove.corso) : null) ??
        classiDocente[0]
      if (targetClasse) {
        dove.classeDocenteId = targetClasse.id
        const suoCorso = corsiDi(targetClasse.id)[0]
        if (suoCorso) {
          dove.corso = suoCorso.id
        }
      }
    } else {
      const classe = dove.classeDocenteId ? classePerId(dove.classeDocenteId) : null
      const corsiDellaClasse = classe ? corsiDi(classe.id) : []
      dove.corso = corsiDellaClasse[0]?.id ?? corsoBuono(opzioni.corsoId)
      dove.classeDocenteId = null
    }

    disegna(dove.corso, dove.classeDocenteId)
  }

  const { corsoId, allievi, prossime, proposta, scritti } = vista
  const val = <T extends string | number | boolean>(nome: string, dal: T): T =>
    nome in scritti ? (scritti[nome] as T) : dal
  const ambito = dove.ambito

  const puoCambiareAmbito =
    !lezione && !opzioni.corsoFisso && classiDocente.length > 0

  const selettoreAmbito = puoCambiareAmbito
    ? (
        <div className="campo">
          <label className="campo__etichetta">{t.ambito}</label>
          <div className="selettore" role="tablist" aria-label={t.ambito}>
            <button
              className={classi('selettore__voce', ambito === 'corso' && 'selettore__voce--attiva')}
              type="button"
              role="tab"
              aria-selected={String(ambito === 'corso') as 'true' | 'false'}
              onClick={() => cambiaAmbito('corso')}
            >
              <Icona nome="libro" classe="icona--minuta" />
              <span>{t.ambitoCorso}</span>
            </button>
            <button
              className={classi('selettore__voce', ambito === 'classe' && 'selettore__voce--attiva')}
              type="button"
              role="tab"
              aria-selected={String(ambito === 'classe') as 'true' | 'false'}
              onClick={() => cambiaAmbito('classe')}
            >
              <Icona nome="classi" classe="icona--minuta" />
              <span>{t.ambitoClasse}</span>
            </button>
          </div>
          <p className="testo-quieto">{t.aiutoAmbito}</p>
        </div>
      )
    : null

  const rigaDestinazione =
    lezione || opzioni.corsoFisso
      ? null
      : ambito === 'classe'
        ? (
            <Riga>
              <Campo
                nome="classeId"
                etichetta={t.ambitoClasse}
                tipo="select"
                valore={dove.classeDocenteId ?? ''}
                opzioni={classiDocente.map((c) => ({
                  valore: c.id,
                  testo: t.classeDocenteEtichetta(c.nome),
                }))}
                richiesto
                al={(valore) => {
                  const classe = classePerId(valore)
                  if (classe) {
                    const suoCorso = corsiDi(classe.id)[0]
                    if (suoCorso) {
                      disegna(suoCorso.id, classe.id)
                    } else {
                      notifica(t.nessunCorsoPerClasse, 'avviso')
                    }
                  }
                }}
              />
            </Riga>
          )
        : (
            <Riga>
              {campoCorso({
                valore: corsoId,
                richiesto: true,
                al: (valore) => disegna(valore, null),
              })}
            </Riga>
          )

  return (
    <div className="modulo" ref={contenitore}>
      <Fragment key={versione}>
        {selettoreAmbito}
        {rigaDestinazione}
        <Campo
          nome="testo"
          etichetta={parole().cheCosa}
          valore={val('testo', base.testo)}
          segnaposto={ambito === 'classe' ? t.segnapostoTestoClasse : t.segnapostoTesto}
          richiesto
        />
        <Riga>
          <Campo
            nome="tipo"
            etichetta={parole().tipo}
            tipo="select"
            valore={val('tipo', ambito === 'classe' && !modifica ? 'amministrativo' : base.tipo)}
            opzioni={VOCI_TIPO_CONSEGNA}
            larghezza="meta"
          />
          <Campo
            nome="a"
            etichetta={t.aChiTocca}
            tipo="select"
            valore={val('a', base.a)}
            opzioni={[
              { valore: 'classe', testo: t.destinatari.classe },
              { valore: 'allievi', testo: t.destinatari.allievi },
              { valore: 'docente', testo: t.destinatari.docente },
            ]}
            aiuto={t.aiutoDestinatari}
            larghezza="meta"
          />
        </Riga>
        <Riga>
          <Campo
            nome="raccoglie"
            tipo="checkbox"
            etichetta={t.raccoglie}
            valore={val('raccoglie', base.documento !== undefined)}
            aiuto={t.aiutoRaccoglie}
            larghezza="meta"
          />
          <div className="modulo__zona campo campo--meta" data-zona="categoria">
            <Campo
              nome="categoria"
              etichetta={t.cheDocumento}
              tipo="select"
              valore={val('categoria', base.documento ?? 'altro')}
              opzioni={VOCI_CATEGORIA_DOCUMENTO}
            />
            <Campo
              nome="verso"
              etichetta={t.chiLoPorta}
              tipo="select"
              valore={val('verso', base.verso ?? 'ricevo')}
              opzioni={[
                { valore: 'ricevo', testo: t.versi.ricevo },
                { valore: 'consegno', testo: t.versi.consegno },
              ]}
              aiuto={t.aiutoVerso}
            />
            <Campo
              nome="modoConsegna"
              etichetta={t.comeLoConsegno}
              tipo="select"
              valore={val('modoConsegna', base.modoConsegna ?? 'mano')}
              opzioni={[
                { valore: 'mano', testo: t.modi.mano },
                { valore: 'email', testo: t.modi.email },
              ]}
              aiuto={t.aiutoModo}
            />
            <Campo
              nome="firmeRichieste"
              etichetta={t.firme}
              tipo="checkbox"
              valore={val('firmeRichieste', base.firmeRichieste ?? false)}
              aiuto={t.aiutoFirme}
            />
          </div>
        </Riga>
        <div className="modulo__zona" data-zona="allievi">
          <SezioneModulo titolo={parole().chi}>
            {allievi.length === 0
              ? <Quieto>{t.nessunaPif}</Quieto>
              : (
                  <div className="scelta-allievi">
                    {allievi.map((allievo) => (
                      <label key={allievo.id} className="scelta-allievi__voce">
                        <Input
                          type="checkbox"
                          name={`allievo-${allievo.id}`}
                          spuntato={base.allieviIds.includes(allievo.id)}
                        />
                        <span>{nomeCompleto(allievo)}</span>
                      </label>
                    ))}
                  </div>
                )}
          </SezioneModulo>
        </div>
        <SezioneModulo titolo={t.entroQuando}>
          <Riga>
            <Campo
              nome="modoScadenza"
              etichetta={t.ilTermineE}
              tipo="select"
              valore={base.scadenzaLezioneId ? 'lezione' : base.scadenza ? 'data' : 'nessuno'}
              opzioni={[
                { valore: 'lezione', testo: t.modiScadenza.lezione },
                { valore: 'data', testo: t.modiScadenza.data },
                { valore: 'nessuno', testo: t.modiScadenza.nessuno },
              ]}
              aiuto={t.aiutoTermine}
              larghezza="meta"
            />
            <div className="modulo__zona campo campo--meta" data-zona="scadenzaLezione">
              <Campo
                nome="scadenzaLezioneId"
                etichetta={t.perLaLezioneDel}
                tipo="select"
                valore={proposta}
                opzioni={
                  prossime.length > 0
                    ? prossime.map((l) => ({
                        valore: l.id,
                        testo:
                          formattaData(l.data, 'settimana') +
                          (l.corsoId === corsoId
                            ? ''
                            : ` · ${materiaDelCorsoId(l.corsoId)?.nome ?? t.altraMateria}`),
                      }))
                    : [{ valore: '', testo: t.nessunaLezioneFutura }]
                }
              />
            </div>
            <div className="modulo__zona campo campo--meta" data-zona="scadenzaData">
              <Campo nome="scadenza" etichetta={t.entroIl} tipo="date" valore={base.scadenza ?? ''} />
            </div>
          </Riga>
        </SezioneModulo>
        <Campo
          nome="note"
          etichetta={parole().note}
          tipo="textarea"
          righe={2}
          valore={base.note ?? ''}
        />
      </Fragment>
    </div>
  )
}
