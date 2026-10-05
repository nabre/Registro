// I blocchi di assenze: il foglio che arriva dalla segreteria e le righe che
// se ne ricavano.

import {
  avanzamentoAssenze,
  etichettaPeriodo,
  nomePeriodo,
  SEGNAPOSTO_ASSENZE,
} from '#core/dominio/absences.js'
import { formattaData, nomeSemestre, oggi } from '#core/dominio/dates.js'
import { creaBloccoAssenze } from '#core/dominio/factories.js'
import type { BloccoAssenze, Classe } from '#core/dominio/models.js'
import { validaBloccoAssenze } from '#core/dominio/validation.js'
import { parole } from '#core/dominio/words.testi.js'
import { Campo, Riga, SezioneModulo } from '#ui/components/base.js'
import { apriModale } from '#ui/components/modal.js'
import { azione } from '#ui/bridge.js'
import {
  aggiorna,
  annoCorrente,
  fascicoloDi,
  semestrePerData,
  stato,
  toccaIlSemestreScelto,
} from '#ui/state.js'

import { campiRecapiti, recapitiScelti, salva, TastoElimina, testo } from './common.js'

import { testi } from './absences.testi.js'

/**
 * Il periodo di assenze: dal, al, e la lettera all'azienda, una per periodo
 * (i segnaposto fra graffe la rendono buona per tutti). Righe, fogli e mail non
 * passano di qui: si toccano dalla matrice, e rimandarle sovrascriverebbe
 * quel che è arrivato intanto.
 */
export function moduloBloccoAssenze (classe: Classe, blocco?: BloccoAssenze): void {
  const t = testi()
  const fascicolo = fascicoloDi(classe.id)
  const modifica = Boolean(blocco)
  const anno = annoCorrente()
  const semestre = anno?.semestri.find(
    (s) => stato.adessoData >= s.inizio && stato.adessoData <= s.fine,
  )
  // Un periodo nuovo parte dal semestre di oggi (o dall'anno senza semestri): un
  // rapporto di assenze non dura un giorno.
  const base =
    blocco ??
    creaBloccoAssenze(
      semestre?.inizio ?? anno?.inizio ?? oggi(),
      semestre?.fine ?? anno?.fine ?? oggi(),
      fascicolo,
      semestre ? nomeSemestre(semestre) : '',
    )

  const leggi = (
    valori: Record<string, string | number | boolean>,
    sorgente: BloccoAssenze = base,
  ): BloccoAssenze => ({
    ...sorgente,
    // Il nome esce dalle date: dentro un semestre prende il suo nome, altrimenti
    // si legge dagli estremi.
    etichetta: etichettaPeriodo(anno?.semestri ?? [], testo(valori.dal), testo(valori.al)),
    dal: testo(valori.dal),
    al: testo(valori.al),
    oggetto: testo(valori.oggetto),
    corpo: String(valori.corpo ?? ''),
    aAllievo: Boolean(valori.aAllievo),
    aTutore: Boolean(valori.aTutore),
    recapitiIds: recapitiScelti(fascicolo, valori),
    note: testo(valori.note),
    righe: sorgente.righe,
  })

  apriModale({
    titolo: modifica ? t.modificaPeriodo : t.nuovoPeriodo,
    sottotitolo: classe.nome,
    larghezza: 'larga',
    corpo: () => (
      <div className="modulo">
        {/* Il calendario del sistema: gli estremi di un periodo si guardano, e `min` e
            `max` li tengono dentro l'anno, come chiede la convalida. La spiegazione
            sta sulla prima data: la riga Dal/Al non ha un titolo suo. */}
        <Riga>
          <Campo
            nome="dal"
            etichetta={parole().dal}
            tipo="date"
            calendario
            valore={base.dal}
            min={anno?.inizio}
            max={anno?.fine}
            richiesto
            aiuto={t.aiutoPeriodo}
            larghezza="meta"
          />
          <Campo
            nome="al"
            etichetta={parole().al}
            tipo="date"
            calendario
            valore={base.al}
            min={anno?.inizio}
            max={anno?.fine}
            richiesto
            larghezza="meta"
          />
        </Riga>
        {/* Le date entrano nei nomi dei file archiviati e nella lettera (`{dal}`,
            `{al}`, `{periodo}`) e distinguono due «1° semestre». Gli estremi dell'anno
            restano scritti: dicono fin dove si può andare. */}
        {anno
          ? (
              <p className="campo__aiuto">
                {t.dentroLAnno(anno.etichetta, formattaData(anno.inizio), formattaData(anno.fine))}
              </p>
            )
          : null}
        <SezioneModulo titolo={{ testo: t.emailAllAzienda, aiuto: t.aiutoEmail }}>
          <Campo
            nome="oggetto"
            etichetta={t.oggetto}
            valore={base.oggetto}
            richiesto
          />
          <Campo
            nome="corpo"
            etichetta={t.testo}
            tipo="textarea"
            righe={10}
            valore={base.corpo}
            richiesto
            aiuto={t.segnaposto(SEGNAPOSTO_ASSENZE.join(' '))}
          />
        </SezioneModulo>
        <SezioneModulo titolo={t.ancheA}>
          <Riga>
            <Campo
              nome="aAllievo"
              tipo="checkbox"
              etichetta={t.aPif}
              valore={base.aAllievo}
              larghezza="quarto"
            />
            <Campo
              nome="aTutore"
              tipo="checkbox"
              etichetta={t.aRappresentante}
              valore={base.aTutore}
              larghezza="quarto"
            />
            {campiRecapiti(fascicolo, base.recapitiIds)}
          </Riga>
        </SezioneModulo>
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
      const sorgente = modifica
        ? fascicoloDi(classe.id).assenze.find((b) => b.id === base.id) ?? base
        : base
      const aggiornato = leggi(valori, sorgente)
      const esito = validaBloccoAssenze(aggiornato, anno)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      await salva(
        contesto,
        { tipo: 'assenze.salva', classeId: classe.id, blocco: aggiornato },
        modifica ? t.aggiornato : t.creato,
        (idCreato) => {
          // Il periodo appena scritto deve restare in vista: se non tocca il semestre
          // scelto sparirebbe, quindi il semestre segue le date.
          const suo = toccaIlSemestreScelto([aggiornato]).length === 0
            ? semestrePerData(aggiornato.dal)
            : null
          const passa = suo && suo.id !== stato.semestreId ? { semestreId: suo.id } : {}
          const apri = idCreato ? { bloccoAssenzeId: idCreato } : {}
          if (suo || idCreato) aggiorna({ ...passa, ...apri })
        },
      )
    },
    azioniSecondarie: (contesto) => {
      if (!modifica) return null
      const conto = avanzamentoAssenze(base)
      return (
        <TastoElimina
          contesto={contesto}
          chiedi={{
            titolo: t.eliminare(nomePeriodo(base)),
            testo:
              conto.interessati === 0
                ? t.nessunFoglio
                : t.seNeVannoIFogli(conto.interessati),
            testoConferma: parole().elimina,
          }}
          azione={{ tipo: 'assenze.elimina', classeId: classe.id, bloccoId: base.id }}
          fatto={t.eliminato}
          poi={() => aggiorna({ bloccoAssenzeId: null })}
        />
      )
    },
  })
}

/**
 * L'importazione in blocco: una cartella di PDF, assegnati dal nome del file. Si
 * dice solo che fogli sono (assenze o ritardi, vergini o firmati); quel che non
 * si riconosce resta fuori e lo si dice, invece di assegnarlo a caso.
 */
export function moduloImportaAssenze (classe: Classe, blocco: BloccoAssenze): void {
  const t = testi()
  apriModale({
    titolo: t.importaIFogli,
    sottotitolo: `${classe.nome} · ${nomePeriodo(blocco)}`,
    larghezza: 'media',
    corpo: () => (
      <div className="modulo">
        <Riga>
          <Campo
            nome="genere"
            etichetta={t.cheFogli}
            tipo="select"
            valore="assenze"
            opzioni={[
              { valore: 'assenze', testo: t.assenze },
              { valore: 'ritardi', testo: t.ritardi },
            ]}
            larghezza="meta"
          />
          <Campo
            nome="firmato"
            etichetta={t.inCheVersione}
            tipo="select"
            valore="no"
            opzioni={[
              { valore: 'no', testo: t.vergini },
              { valore: 'si', testo: t.firmati },
            ]}
            larghezza="meta"
          />
        </Riga>
        <p className="campo__aiuto">{t.aiutoImporta}</p>
      </div>
    ),
    testoSalva: t.scegliIFile,
    alSalva: async (valori, contesto) => {
      contesto.chiudi()
      // La finestra si chiude prima: il dialogo dei file lo apre l'host. Gli errori
      // li notifica `azione`.
      await azione({
        tipo: 'assenze.importa',
        classeId: classe.id,
        bloccoId: blocco.id,
        genere: testo(valori.genere) === 'ritardi' ? 'ritardi' : 'assenze',
        firmato: testo(valori.firmato) === 'si',
      })
    },
  })
}

