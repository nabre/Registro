// Le materie: crearle, rinominarle, e rimettere insieme quelle nate due volte
// dallo stesso nome scritto in due modi.

import { useState, type ReactElement } from 'react'

import { corsiDellaMateria } from '#core/dominio/courses.js'
import { creaMateria } from '#core/dominio/factories.js'
import type { Materia } from '#core/dominio/models.js'
import { materieSimili, validaMateria } from '#core/dominio/validation.js'
import { Campo, Riga } from '#ui/components/base.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { stato } from '#ui/state.js'
import { parole } from '#core/dominio/words.testi.js'

import { baseViva, salva, TastoElimina, testo } from './common.js'
import { testi } from './subject.testi.js'

/**
 * Unisce due materie in una (un refuso, un import ripetuto). Corsi e piani
 * passano alla materia che resta; due corsi della stessa classe che diventano
 * uguali si fondono, lezioni comprese.
 */
export function moduloUnisciMaterie (da: Materia): void {
  const t = testi()
  const altre = stato.registro.materie.filter((m) => m.id !== da.id)
  if (altre.length === 0) {
    notifica(t.serveUnAltra, 'avviso')
    return
  }

  // Quali corsi usano questa materia lo sa `domain/courses.ts`.
  const coinvolti = corsiDellaMateria(stato.registro, da.id)
  const corsiCoinvolti = coinvolti.length
  const idCoinvolti = new Set(coinvolti.map((c) => c.id))
  const pianiCoinvolti = stato.registro.piani.filter(
    (p) => p.corsoId && idCoinvolti.has(p.corsoId),
  ).length

  apriModale({
    titolo: t.titoloUnisci(da.nome),
    larghezza: 'stretta',
    testoSalva: t.unisci,
    corpo: () => (
      <div className="modulo">
        <p className="testo-quieto">{t.passano(corsiCoinvolti, pianiCoinvolti, da.nome)}</p>
        <Campo
          nome="aId"
          etichetta={t.materiaCheResta}
          tipo="select"
          valore={altre[0].id}
          opzioni={altre.map((m) => ({ valore: m.id, testo: m.nome }))}
          richiesto
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const aId = testo(valori.aId)
      const a = stato.registro.materie.find((m) => m.id === aId)
      const sicuro = await conferma({
        titolo: t.unire(da.nome, a?.nome ?? ''),
        testo: t.nienteSiPerde,
        testoConferma: t.unisci,
      })
      if (!sicuro) return
      await salva(
        contesto,
        { tipo: 'materia.unisci', daId: da.id, aId },
        t.unita(da.nome, a?.nome ?? ''),
      )
    },
  })
}

/**
 * Il nome della materia, con sotto l'avviso se assomiglia a una che c'è: il
 * refuso non si vieta («Storia» e «Storia dell'arte» sono materie vere), ma si
 * fa vedere prima di salvare.
 */
function CampoNome ({ base }: { base: Materia }): ReactElement {
  const t = testi()
  const [simili, impostaSimili] = useState<string[]>([])
  return (
    <>
      <Campo
        nome="nome"
        etichetta={t.nome}
        valore={base.nome}
        segnaposto={t.segnapostoNome}
        richiesto
        al={(valore) => impostaSimili(
          materieSimili(valore, stato.registro.materie, base.id).map((m) => m.nome),
        )}
      />
      <small className="campo__aiuto campo__aiuto--attenzione">
        {simili.length > 0 ? t.assomiglia(simili) : null}
      </small>
    </>
  )
}

/**
 * Una materia del registro (nome, sigla, colore): su di lei poggiano corsi e
 * piani, e due grafie dello stesso nome farebbero due corsi. Se succede,
 * «unisci» le rimette insieme.
 */
export function moduloMateria (materia?: Materia, dopo?: (materiaId: string) => void): void {
  const t = testi()
  const modifica = Boolean(materia)
  const base = materia ?? creaMateria('')

  apriModale({
    titolo: modifica ? t.titoloMateria(base.nome) : t.nuova,
    larghezza: 'media',
    corpo: () => (
      <div className="modulo">
        <CampoNome base={base} />
        <Riga>
          <Campo
            nome="sigla"
            etichetta={t.sigla}
            valore={base.sigla ?? ''}
            segnaposto="MAT" // testo-fisso: un esempio di sigla
            larghezza="meta"
          />
          <Campo
            nome="colore"
            etichetta={parole().colore}
            tipo="color"
            valore={base.colore || '#7a7a7a'}
            larghezza="meta"
          />
        </Riga>
        <Campo
          nome="note"
          etichetta={parole().note}
          tipo="textarea"
          righe={2}
          valore={base.note ?? ''}
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const viva = baseViva(
        contesto,
        modifica,
        base,
        stato.registro.materie.find((m) => m.id === base.id),
      )
      if (!viva) return
      const aggiornata: Materia = {
        ...viva,
        nome: testo(valori.nome),
        sigla: testo(valori.sigla),
        colore: testo(valori.colore),
        note: testo(valori.note),
      }
      const esito = validaMateria(aggiornata, stato.registro.materie)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      await salva(
        contesto,
        { tipo: 'materia.salva', materia: aggiornata },
        modifica ? t.aggiornata : t.creata,
        (idCreato) => dopo?.(idCreato ?? aggiornata.id),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? (
            <TastoElimina
              contesto={contesto}
              chiedi={{ genere: 'materia', id: base.id }}
              azione={{ tipo: 'materia.elimina', materiaId: base.id }}
              fatto={t.eliminata}
            />
          )
        : null,
  })
}
