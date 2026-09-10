// La classe e chi la frequenta.
//
// L'elenco delle persone in formazione si compila a mano una per una o si incolla tutto
// insieme: la seconda è quel che si fa a settembre, e senza costerebbe venti
// finestre aperte e chiuse.

import { creaAllievo, COLORI_CLASSE } from '../../dominio/fabbriche.js'
import { PERSONE, PIF, Uno, del, frase } from '../../dominio/lessico.js'
import { nuovoIdClasse } from '../../dominio/identificatori.js'
import type { Allievo, Classe } from '../../dominio/modelli.js'
import { validaAllievo } from '../../dominio/validazione.js'
import { campo, riga } from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { h } from '../dom.js'
import { azione } from '../ponte.js'
import { aggiorna, corsiDi, materieDiClasse, stato } from '../stato.js'

import { campoCollegato, opzioniMaterie, richiedeAnno, salva, tastoElimina, testo } from './comune.js'
import { moduloAvvio } from './corso.js'
import { moduloMateria } from './materia.js'

export function moduloClasse (classe?: Classe, dopo?: (classeId: string) => void): void {
  // Una classe non ha comunque a chi appendersi senza un anno: l'avvio guidato
  // lo crea con il resto, invece di mandare a cercarlo altrove.
  const anno = richiedeAnno(moduloAvvio)
  if (!anno) return
  const modifica = Boolean(classe)
  const base =
    classe ??
    ({
      id: nuovoIdClasse(),
      annoId: anno.id,
      nome: '',
      sede: '',
      colore: COLORI_CLASSE[stato.registro.classi.length % COLORI_CLASSE.length],
      note: '',
      allievi: [],
      archiviata: false,
      docenteDiClasse: false,
      creataIl: new Date().toISOString(),
      aggiornataIl: new Date().toISOString(),
    } satisfies Classe)

  // Le materie che la classe già porta: una per corso. Quelle si tolgono
  // dalla tendina, perché aggiungerle due volte non vuol dire niente.
  const gia = new Set(corsiDi(base.id).map((c) => c.materiaId))

  apriModale({
    titolo: modifica ? `Classe ${base.nome}` : 'Nuova classe',
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'nome',
            etichetta: 'Nome della classe',
            valore: base.nome,
            segnaposto: 'I MEC A',
            richiesto: true,
            larghezza: 'meta',
          }),
          campoCollegato({
            nome: 'materiaId',
            etichetta: modifica ? 'Aggiungi una materia' : 'Materia insegnata',
            valore: '',
            vuoto: '— nessuna —',
            voci: () => opzioniMaterie().filter((o) => !gia.has(o.valore)),
            titoloNuovo: 'Nuova materia',
            apriNuovo: (fatto) => moduloMateria(undefined, fatto),
            aiuto:
              materieDiClasse(base.id).length > 0
                ? `Gia' insegnate: ${materieDiClasse(base.id).join(', ')}.`
                : 'Classe più materia fa un corso: le lezioni e i voti stanno lì.',
            larghezza: 'meta',
          }),
        ),
        riga(
          campo({ nome: 'sede', etichetta: 'Sede', valore: base.sede ?? '', larghezza: 'meta' }),
          campo({
            nome: 'colore',
            etichetta: 'Colore nel calendario',
            tipo: 'color',
            valore: base.colore,
            larghezza: 'quarto',
          }),
          campo({
            nome: 'archiviata',
            tipo: 'checkbox',
            etichetta: 'Archiviata',
            valore: base.archiviata,
            aiuto: 'Resta nello storico, sparisce dagli elenchi.',
            larghezza: 'quarto',
          }),
        ),
        // Il mestiere in più: chi non lo fa non vede nemmeno il pannello.
        campo({
          nome: 'docenteDiClasse',
          tipo: 'checkbox',
          etichetta: 'Sono docente di classe',
          valore: base.docenteDiClasse,
          aiuto: 'Aggiunge documenti, recapiti e comunicazioni alla scheda della classe.',
        }),
        campo({
          nome: 'note',
          etichetta: 'Note',
          tipo: 'textarea',
          righe: 3,
          valore: base.note ?? '',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornata: Classe = {
        ...base,
        nome: testo(valori.nome),
        sede: testo(valori.sede),
        colore: testo(valori.colore) || base.colore,
        note: testo(valori.note),
        archiviata: Boolean(valori.archiviata),
        docenteDiClasse: Boolean(valori.docenteDiClasse),
      }
      const materiaId = testo(valori.materiaId)
      await salva(
        contesto,
        { tipo: 'classe.salva', classe: aggiornata },
        modifica ? 'Classe aggiornata.' : 'Classe creata.',
        async (idCreato) => {
          const classeId = idCreato ?? aggiornata.id
          // La materia scelta apre un corso: è il momento in cui la classe
          // smette di essere solo un elenco di nomi e diventa un insegnamento.
          if (materiaId) await azione({ tipo: 'corso.crea', classeId, materiaId })
          if (dopo) {
            dopo(classeId)
            return
          }
          aggiorna({ vista: 'classi', classeId })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'classe', id: base.id },
            azione: { tipo: 'classe.elimina', classeId: base.id },
            fatto: 'Classe eliminata.',
            poi: () => aggiorna({ classeId: null }),
          })
        : null,
  })
}


export function moduloAllievo (classe: Classe, allievo?: Allievo): void {
  const modifica = Boolean(allievo)
  const base = allievo ?? creaAllievo('', '')

  apriModale({
    titolo: modifica ? `Modifica ${PIF.singolare}` : `Nuova ${PIF.singolare}`,
    sottotitolo: classe.nome,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({ nome: 'cognome', etichetta: 'Cognome', valore: base.cognome, richiesto: true, larghezza: 'meta' }),
          campo({ nome: 'nome', etichetta: 'Nome', valore: base.nome, richiesto: true, larghezza: 'meta' }),
          campo({
            nome: 'dataNascita',
            etichetta: 'Data di nascita',
            tipo: 'date',
            valore: base.dataNascita ?? '',
            aiuto: 'Per i moduli della scuola: il registro non ci conta niente.',
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'indirizzo',
          etichetta: 'Indirizzo',
          valore: base.indirizzo ?? '',
          aiuto: 'Via, NAP e località, in una riga sola.',
        }),
        riga(
          campo({ nome: 'email', etichetta: 'E-mail', tipo: 'email', valore: base.email ?? '', larghezza: 'meta' }),
          campo({
            nome: 'emailTutore',
            etichetta: `E-mail ${del(PERSONE.rappresentante)}`,
            tipo: 'email',
            valore: base.emailTutore ?? '',
            aiuto: 'Riceve le comunicazioni al posto suo, o insieme a lui.',
            larghezza: 'meta',
          }),
          campo({ nome: 'telefono', etichetta: 'Telefono', tipo: 'tel', valore: base.telefono ?? '', larghezza: 'meta' }),
        ),
        riga(
          campo({
            nome: 'azienda',
            etichetta: Uno(PERSONE.azienda),
            valore: base.azienda ?? '',
            aiuto: 'Dove fa il tirocinio: serve solo a riconoscerla negli elenchi.',
            larghezza: 'meta',
          }),
          campo({
            nome: 'indirizzoDatore',
            etichetta: `Indirizzo ${del(PERSONE.datore)}`,
            valore: base.indirizzoDatore ?? '',
            aiuto: 'Via, NAP e località: per la visita in azienda e per quel che si spedisce.',
            larghezza: 'meta',
          }),
          campo({
            nome: 'emailDatore',
            etichetta: `E-mail ${del(PERSONE.datore)}`,
            tipo: 'email',
            valore: base.emailDatore ?? '',
            aiuto: 'Riceve i fogli delle assenze da controfirmare. Senza, la richiesta non parte.',
            larghezza: 'meta',
          }),
          campo({
            nome: 'telefonoDatore',
            etichetta: `Telefono ${del(PERSONE.datore)}`,
            tipo: 'tel',
            valore: base.telefonoDatore ?? '',
            aiuto: 'Per sollecitare una firma che non torna.',
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'attivo',
          tipo: 'checkbox',
          etichetta: 'Frequenta',
          valore: base.attivo,
          aiuto: 'Togliendo la spunta esce dagli appelli, ma resta nello storico.',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornato: Allievo = {
        ...base,
        cognome: testo(valori.cognome),
        nome: testo(valori.nome),
        dataNascita: testo(valori.dataNascita),
        indirizzo: testo(valori.indirizzo),
        email: testo(valori.email),
        emailTutore: testo(valori.emailTutore),
        azienda: testo(valori.azienda),
        indirizzoDatore: testo(valori.indirizzoDatore),
        emailDatore: testo(valori.emailDatore),
        telefonoDatore: testo(valori.telefonoDatore),
        telefono: testo(valori.telefono),
        attivo: Boolean(valori.attivo),
      }
      // L'host valida solo la classe: senza questo controllo una riga senza
      // cognome passava lo stesso, e ricompariva senza nome in ogni elenco.
      const esito = validaAllievo(aggiornato)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      const allievi = modifica
        ? classe.allievi.map((a) => (a.id === aggiornato.id ? aggiornato : a))
        : [...classe.allievi, aggiornato]

      await salva(
        contesto,
        { tipo: 'classe.salva', classe: { ...classe, allievi } },
        modifica ? frase(PIF, 'aggiornato') : frase(PIF, 'aggiunto'),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            etichetta: 'Togli dalla classe',
            // Non basta più toglierlo dall'elenco: presenze e voti restavano
            // nei file a nome di uno che non c'era più, e il registro se ne
            // lamentava a ogni apertura. Se ne va lui, se ne va quel che
            // parlava di lui.
            chiedi: { genere: 'allievo', classeId: classe.id, id: base.id },
            azione: { tipo: 'allievo.elimina', classeId: classe.id, allievoId: base.id },
            fatto: frase(PIF, 'tolto', { coda: 'dalla classe' }),
          })
        : null,
  })
}

/** Incolla-elenco: il modo in cui gli allievi entrano davvero, all'inizio dell'anno. */
export function moduloImportaAllievi (classe: Classe): void {
  apriModale({
    titolo: `Importa ${PIF.plurale}`,
    sottotitolo: classe.nome,
    larghezza: 'media',
    testoSalva: 'Importa',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          `Una riga per ${PIF.singolare}. Vanno bene «Rossi Mario», «Rossi, Mario» e le righe ` +
            'copiate da un foglio di calcolo, anche con l’e-mail in fondo. ' +
            'I nomi già presenti vengono saltati.',
        ),
        campo({
          nome: 'testo',
          tipo: 'textarea',
          righe: 12,
          segnaposto: 'Bernasconi Luca\nRossi Maria; maria.rossi@edu.ti.ch',
        }),
      ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        { tipo: 'allievi.importa', classeId: classe.id, testo: String(valori.testo ?? '') },
        'Elenco importato.',
      )
    },
  })
}

