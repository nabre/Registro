// I blocchi di assenze: il foglio che arriva dalla segreteria e le righe che
// se ne ricavano.

import {
  avanzamentoAssenze,
  etichettaPeriodo,
  nomePeriodo,
  SEGNAPOSTO_ASSENZE,
} from '../../domain/absences.js'
import { formattaData, oggi } from '../../domain/dates.js'
import { creaBloccoAssenze } from '../../domain/factories.js'
import type { BloccoAssenze, Classe } from '../../domain/models.js'
import { validaBloccoAssenze } from '../../domain/validation.js'
import { parole } from '../../domain/words.testi.js'
import { campo, riga, sezioneModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  fascicoloDi,
  semestrePerData,
  stato,
  toccaIlSemestreScelto,
} from '../state.js'

import { campiRecapiti, recapitiScelti, salva, tastoElimina, testo } from './common.js'

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
      semestre?.etichetta ?? '',
    )

  const leggi = (valori: Record<string, string | number | boolean>): BloccoAssenze => ({
    ...base,
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
  })

  apriModale({
    titolo: modifica ? t.modificaPeriodo : t.nuovoPeriodo,
    sottotitolo: classe.nome,
    larghezza: 'larga',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        // Il calendario del sistema: gli estremi di un periodo si guardano, e `min` e
        // `max` li tengono dentro l'anno, come chiede la convalida.
        riga(
          campo({
            nome: 'dal',
            etichetta: parole().dal,
            tipo: 'date',
            calendario: true,
            valore: base.dal,
            min: anno?.inizio,
            max: anno?.fine,
            richiesto: true,
            // La spiegazione sta sulla prima data: la riga Dal/Al non ha un titolo suo.
            aiuto: t.aiutoPeriodo,
            larghezza: 'meta',
          }),
          campo({
            nome: 'al',
            etichetta: parole().al,
            tipo: 'date',
            calendario: true,
            valore: base.al,
            min: anno?.inizio,
            max: anno?.fine,
            richiesto: true,
            larghezza: 'meta',
          }),
        ),
        // Le date entrano nei nomi dei file archiviati e nella lettera (`{dal}`,
        // `{al}`, `{periodo}`) e distinguono due «1° semestre». Gli estremi dell'anno
        // restano scritti: dicono fin dove si può andare.
        anno
          ? h(
              'p',
              { class: 'campo__aiuto' },
              t.dentroLAnno(anno.etichetta, formattaData(anno.inizio), formattaData(anno.fine)),
            )
          : null,
        sezioneModulo(
          {
            testo: t.emailAllAzienda,
            aiuto: t.aiutoEmail,
          },
          campo({
            nome: 'oggetto',
            etichetta: t.oggetto,
            valore: base.oggetto,
            richiesto: true,
          }),
          campo({
            nome: 'corpo',
            etichetta: t.testo,
            tipo: 'textarea',
            righe: 10,
            valore: base.corpo,
            richiesto: true,
            aiuto: t.segnaposto(SEGNAPOSTO_ASSENZE.join(' ')),
          }),
        ),
        sezioneModulo(
          t.ancheA,
          riga(
            campo({
              nome: 'aAllievo',
              tipo: 'checkbox',
              etichetta: t.aPif,
              valore: base.aAllievo,
              larghezza: 'quarto',
            }),
            campo({
              nome: 'aTutore',
              tipo: 'checkbox',
              etichetta: t.aRappresentante,
              valore: base.aTutore,
              larghezza: 'quarto',
            }),
            ...campiRecapiti(fascicolo, base.recapitiIds),
          ),
        ),
        campo({
          nome: 'note',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 2,
          valore: base.note ?? '',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornato = leggi(valori)
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
      return tastoElimina({
        contesto,
        chiedi: {
          titolo: t.eliminare(nomePeriodo(base)),
          testo:
            conto.interessati === 0
              ? t.nessunFoglio
              : t.seNeVannoIFogli(conto.interessati),
          testoConferma: parole().elimina,
        },
        azione: { tipo: 'assenze.elimina', classeId: classe.id, bloccoId: base.id },
        fatto: t.eliminato,
        poi: () => aggiorna({ bloccoAssenzeId: null }),
      })
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
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'genere',
            etichetta: t.cheFogli,
            tipo: 'select',
            valore: 'assenze',
            opzioni: [
              { valore: 'assenze', testo: t.assenze },
              { valore: 'ritardi', testo: t.ritardi },
            ],
            larghezza: 'meta',
          }),
          campo({
            nome: 'firmato',
            etichetta: t.inCheVersione,
            tipo: 'select',
            valore: 'no',
            opzioni: [
              { valore: 'no', testo: t.vergini },
              { valore: 'si', testo: t.firmati },
            ],
            larghezza: 'meta',
          }),
        ),
        h(
          'p',
          { class: 'campo__aiuto' },
          t.aiutoImporta,
        ),
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

