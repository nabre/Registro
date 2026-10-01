// I comandi della classe e delle persone, e quelli del fascicolo del docente
// di classe.

import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import {
  moduloAllievo,
  moduloNuovaPersona,
  moduloBloccoAssenze,
  moduloComunicazione,
  moduloConsegna,
  moduloImportaAllievi,
  moduloRecapito,
} from '#ui/forms.js'
import { chiediImportaClasse } from '#ui/views/classes.js'
import { classeDelContesto, classeDelFascicolo, senzaClasse } from '#ui/context.js'
import { corsiDi, stato } from '#ui/state.js'
// L'ordine dei fogli spuntati è quello a schermo, non quello dei clic.
import { caricaPdf, pdfInAttesa, rileggiScansioni } from '#ui/views/sorting.js'
import { testi } from './classes.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

export const COMANDI_CLASSE: readonly ComandoUI[] = [
  // --------------------------------------------------------------- Classe
  // L'elenco delle persone attraversa le classi: il comando chiede in quale, se
  // non la sa già (la persona scelta, o una classe sola nell'anno).
  {
    id: 'persone.nuova',
    titolo: t.nuovaPersona,
    simbolo: 'utente',
    dove: ['persone'],
    gruppo: G.elenco,
    aiuto: t.nuovaPersonaAiuto,
    primario: true,
    al: () => moduloNuovaPersona(classeDelContesto()),
  },
  {
    id: 'classe.nuovoAllievo',
    titolo: t.aggiungiAlGruppo,
    simbolo: 'utente',
    // Anche in Classi, nella riga delle azioni come in ogni pagina.
    dove: ['classi', 'allievo'],
    gruppo: G.elenco,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloAllievo(classe)
    },
  },
  {
    id: 'classe.incollaElenco',
    titolo: t.incollaElenco,
    simbolo: 'piano',
    dove: ['classi', 'allievo'],
    gruppo: G.elenco,
    aiuto: t.incollaElencoAiuto,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloImportaAllievi(classe)
    },
  },
  {
    // Con un anno per documento la classe dell'anno scorso sta in un altro file e
    // si porta da lì: non serve una classe scelta.
    id: 'classe.importa',
    titolo: t.importaClasse,
    simbolo: 'cartella',
    dove: ['classi'],
    gruppo: G.elenco,
    aiuto: t.importaClasseAiuto,
    impedimento: () =>
      stato.documenti.elenco.some((d) => !d.aperto && !d.mancante) ? null : t.nessunAltroAnno,
    al: () => chiediImportaClasse(),
  },
  {
    id: 'classe.comunicazione',
    titolo: t.nuovaComunicazione,
    simbolo: 'posta',
    // Non nel pannello del docente di classe (Comunicazioni ha il suo pulsante)
    // né in Classi, che tiene il solo «Nuova classe».
    dove: ['allievo'],
    gruppo: G.famiglie,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'classe.assenze',
    titolo: t.nuovoPeriodoAssenze,
    simbolo: 'orologio',
    dove: ['allievo'],
    gruppo: G.famiglie,
    aiuto: t.nuovoPeriodoAssenzeAiuto,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloBloccoAssenze(classe)
    },
  },

  {
    id: 'docente.pendenza', titolo: t.nuovaPendenza, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'todo', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      return corsiDi(classe.id).length ? null : t.primaUnCorso
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'classe' })
    },
  },
  {
    id: 'docente.documento', titolo: t.chiediDocumento, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      return corsiDi(classe.id).length ? null : t.primaUnCorso
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'classe', documento: true })
    },
  },
  {
    // Il gesto normale è trascinare il PDF nella pagina, ma serve anche un comando
    // per chi non trascina.
    id: 'docente.caricaPdf', titolo: t.caricaPdf, simbolo: 'cartella',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: true,
    impedimento: () => (classeDelFascicolo() ? null : t.selezionaClasse),
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void caricaPdf(classe)
    },
  },
  {
    // La lettura automatica di tutti i PDF in ballo, per le pagine ancora da
    // smistare (serve quando si accende l'OCR o cambia modello). Quella per un file
    // solo sta in testa alla cornice.
    id: 'docente.rileggiScansioni', titolo: t.rileggiScansioni, simbolo: 'ricarica',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: false,
    aiuto: t.rileggiScansioniAiuto,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      if (!stato.ocrAttivo) return t.ocrSpento
      return pdfInAttesa(classe).length > 0 ? null : t.nessunPdf
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void rileggiScansioni(classe)
    },
  },
  {
    id: 'docente.assenze', titolo: t.nuovoPeriodo, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'assenze', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloBloccoAssenze(classe)
    },
  },
  {
    id: 'docente.comunicazione', titolo: t.nuovaComunicazione, simbolo: 'posta',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'docente.recapito', titolo: t.nuovoRecapito, simbolo: 'utente',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: G.classe,
    primario: false,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloRecapito(classe)
    },
  },
]
