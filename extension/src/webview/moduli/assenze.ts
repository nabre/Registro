// I blocchi di assenze: il foglio che arriva dalla segreteria e le righe che
// se ne ricavano.

import { avanzamentoAssenze, SEGNAPOSTO_ASSENZE } from '../../dominio/assenze.js'
import { oggi } from '../../dominio/date.js'
import { creaBloccoAssenze } from '../../dominio/fabbriche.js'
import type { BloccoAssenze, Classe } from '../../dominio/modelli.js'
import { validaBloccoAssenze } from '../../dominio/validazione.js'
import { campo, riga, sezioneModulo } from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { h } from '../dom.js'
import { azione } from '../ponte.js'
import { annoCorrente, aggiorna, fascicoloDi, stato } from '../stato.js'

import { campiRecapiti, recapitiScelti, salva, tastoElimina, testo } from './comune.js'

/**
 * Il periodo di assenze: quando comincia, quando finisce, e che cosa si scrive
 * all'azienda.
 *
 * La lettera si compila una volta per il periodo e non allievo per allievo: i
 * segnaposto fra graffe la rendono buona per venticinque nomi, ed è l'unico
 * modo perché scriverla non costi più che spedirla. Le righe — i fogli
 * caricati, le mail partite — non passano di qui: si toccano dalla matrice, e
 * rimandarle indietro con la bozza vorrebbe dire sovrascrivere quel che nel
 * frattempo è arrivato.
 */
export function moduloBloccoAssenze (classe: Classe, blocco?: BloccoAssenze): void {
  const fascicolo = fascicoloDi(classe.id)
  const modifica = Boolean(blocco)
  const anno = annoCorrente()
  const semestre = anno?.semestri.find(
    (s) => stato.adessoData >= s.inizio && stato.adessoData <= s.fine,
  )
  const base =
    blocco ??
    creaBloccoAssenze(
      semestre?.etichetta ?? '',
      semestre?.inizio ?? oggi(),
      semestre?.fine ?? oggi(),
      fascicolo,
    )

  const leggi = (valori: Record<string, string | number | boolean>): BloccoAssenze => ({
    ...base,
    etichetta: testo(valori.etichetta),
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
    titolo: modifica ? 'Modifica periodo' : 'Nuovo periodo di assenze',
    sottotitolo: classe.nome,
    larghezza: 'larga',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'etichetta',
            etichetta: 'Periodo',
            valore: base.etichetta,
            segnaposto: '1° semestre',
            richiesto: true,
            larghezza: 'meta',
          }),
          campo({
            nome: 'dal',
            etichetta: 'Dal',
            tipo: 'date',
            valore: base.dal,
            richiesto: true,
            larghezza: 'quarto',
          }),
          campo({
            nome: 'al',
            etichetta: 'Al',
            tipo: 'date',
            valore: base.al,
            richiesto: true,
            larghezza: 'quarto',
          }),
        ),
        sezioneModulo(
          'La mail all’azienda',
          campo({
            nome: 'oggetto',
            etichetta: 'Oggetto',
            valore: base.oggetto,
            richiesto: true,
          }),
          campo({
            nome: 'corpo',
            etichetta: 'Testo',
            tipo: 'textarea',
            righe: 10,
            valore: base.corpo,
            richiesto: true,
            aiuto: `Segnaposto: ${SEGNAPOSTO_ASSENZE.join(' ')}`,
          }),
          h(
            'p',
            { class: 'campo__aiuto' },
            'Parte una mail per allievo, all’indirizzo del datore di lavoro che sta nella sua ' +
              'scheda, con dentro i suoi fogli vergini. In chiaro e non in copia nascosta: chi ' +
              'deve firmare deve vedere che è per lui.',
          ),
        ),
        sezioneModulo(
          'Anche a',
          riga(
            campo({
              nome: 'aAllievo',
              tipo: 'checkbox',
              etichetta: 'L’allievo',
              valore: base.aAllievo,
              larghezza: 'quarto',
            }),
            campo({
              nome: 'aTutore',
              tipo: 'checkbox',
              etichetta: 'Il tutore',
              valore: base.aTutore,
              larghezza: 'quarto',
            }),
            ...campiRecapiti(fascicolo, base.recapitiIds),
          ),
        ),
        campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: base.note ?? '' }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornato = leggi(valori)
      const esito = validaBloccoAssenze(aggiornato)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      await salva(
        contesto,
        { tipo: 'assenze.salva', classeId: classe.id, blocco: aggiornato },
        modifica ? 'Periodo aggiornato.' : 'Periodo creato.',
        (idCreato) => {
          if (idCreato) aggiorna({ bloccoAssenzeId: idCreato })
        },
      )
    },
    azioniSecondarie: (contesto) => {
      if (!modifica) return null
      const conto = avanzamentoAssenze(base)
      return tastoElimina({
        contesto,
        chiedi: {
          titolo: `Eliminare «${base.etichetta}»?`,
          testo:
            conto.interessati === 0
              ? 'Non c’è ancora dentro nessun foglio.'
              : `Se ne vanno anche i fogli di ${conto.interessati} allievi, ` +
                'vergini e firmati, nel cestino del sistema.',
          testoConferma: 'Elimina',
        },
        azione: { tipo: 'assenze.elimina', classeId: classe.id, bloccoId: base.id },
        fatto: 'Periodo eliminato.',
        poi: () => aggiorna({ bloccoAssenzeId: null }),
      })
    },
  })
}

/**
 * L'importazione in blocco: una cartella di PDF, assegnati dal nome del file.
 *
 * Si dice soltanto che fogli sono — assenze o ritardi, vergini o firmati —
 * perché quello il nome del file non lo sa quasi mai, mentre il nome
 * dell'allievo ce l'ha sempre. Quel che non si riconosce non viene assegnato a
 * caso: resta fuori e lo si dice, che è l'unica risposta accettabile quando
 * sbagliare vuol dire mandare le assenze di uno all'azienda di un altro.
 */
export function moduloImportaAssenze (classe: Classe, blocco: BloccoAssenze): void {
  apriModale({
    titolo: 'Importa i fogli',
    sottotitolo: `${classe.nome} · ${blocco.etichetta}`,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'genere',
            etichetta: 'Che fogli sono',
            tipo: 'select',
            valore: 'assenze',
            opzioni: [
              { valore: 'assenze', testo: 'Assenze' },
              { valore: 'ritardi', testo: 'Ritardi' },
            ],
            larghezza: 'meta',
          }),
          campo({
            nome: 'firmato',
            etichetta: 'In che versione',
            tipo: 'select',
            valore: 'no',
            opzioni: [
              { valore: 'no', testo: 'Vergini, da spedire' },
              { valore: 'si', testo: 'Firmati dal datore' },
            ],
            larghezza: 'meta',
          }),
        ),
        h(
          'p',
          { class: 'campo__aiuto' },
          'Si scelgono più file insieme. Ognuno va all’allievo che nomina — «Rossi Maria» o ' +
            '«maria_rossi» — e chi non si riconosce resta fuori e viene elencato: due fratelli ' +
            'con lo stesso cognome non si tirano a indovinare.',
        ),
      ),
    testoSalva: 'Scegli i file',
    alSalva: async (valori, contesto) => {
      contesto.chiudi()
      // La finestra si chiude prima: la scelta dei file la fa l'host, e tenere
      // aperto un modulo davanti al dialogo di sistema serve solo a coprirlo.
      // Da qui in poi non c'e' piu' un posto dove mettere un errore, e infatti
      // lo dice `azione` con una notifica.
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

