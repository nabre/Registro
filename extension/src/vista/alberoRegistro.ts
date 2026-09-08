// L'albero nella barra laterale. Non duplica il registro: è una scorciatoia per
// arrivare dove si sta lavorando — le prossime lezioni, le classi, i piani, le
// valutazioni — senza aprire il pannello e cercare.
//
// Ogni foglia porta un comando che apre il pannello sulla vista giusta.

import * as vscode from 'vscode'

import type { Archivio } from '../dati/archivio.js'
import {
  formattaVoto,
  inizioLezione,
  mediaMomento,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
} from '../dominio/calcoli.js'
import { formattaData, oggi } from '../dominio/date.js'
import { plurale } from '../dominio/testo.js'
import { descriviRicorrenza } from '../dominio/orario.js'
import {
  classeDellaLezione,
  corsiDellAnno,
  corsiDellaClasse,
  lezioniDellAnno,
  materiaDelCorso,
  nomeDelPiano,
  pianiDi,
  valutazioniDellAnno,
} from '../dominio/corsi.js'
import type {
  Classe,
  Corso,
  Lezione,
  Materia,
  MomentoValutazione,
  PianoLezione,
} from '../dominio/modelli.js'
import type { MessaggioNavigazione } from '../protocollo.js'

export type Nodo =
  | { genere: 'gruppo'; chiave: 'lezioni' | 'classi' | 'corsi' | 'piani' | 'valutazioni' }
  /**
   * Un corso compare in due gruppi e vuol dire due cose diverse: sotto «Corsi»
   * è l'insegnamento, e dentro ci stanno le sue prossime ore; sotto «Piani
   * lezione» è solo la casella in cui sono raccolte le scalette della sua
   * materia. `da` tiene distinti i due, che altrimenti si aprirebbero uguali.
   */
  | { genere: 'corso'; corso: Corso; da: 'corsi' | 'piani' }
  | { genere: 'lezione'; lezione: Lezione }
  /**
   * Il cappello sotto cui stanno le classi: la materia che ci si insegna. Una
   * classe con due corsi compare sotto tutt'e due — è la stessa classe vista da
   * due insegnamenti, ed è così che la si cerca. `materia` è nullo per le
   * classi senza corso, che restano in fondo invece di sparire.
   */
  | { genere: 'materia'; materia: Materia | null }
  | { genere: 'classe'; classe: Classe }
  | { genere: 'allievo'; classe: Classe; allievoId: string }
  | { genere: 'piano'; piano: PianoLezione }
  | { genere: 'valutazione'; momento: MomentoValutazione }
  | { genere: 'vuoto'; testo: string }

/** Quante lezioni future mostrare: un elenco lungo smette di essere una scorciatoia. */
const LEZIONI_MOSTRATE = 8

export class AlberoRegistro implements vscode.TreeDataProvider<Nodo> {
  private readonly emettitore = new vscode.EventEmitter<Nodo | undefined>()
  readonly onDidChangeTreeData = this.emettitore.event

  constructor (private readonly archivio: Archivio) {
    this.archivio.alCambiamento(() => this.emettitore.fire(undefined))
  }

  aggiorna (): void {
    this.emettitore.fire(undefined)
  }

  /** Le classi attive dell'anno, in ordine di nome. */
  private classiAttive (annoId: string | null): Classe[] {
    return this.archivio.registro.classi
      .filter((c) => (!annoId || c.annoId === annoId) && !c.archiviata)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }

  /**
   * Le materie che fanno da cappello, in ordine di nome: quelle insegnate in
   * almeno una classe dell'anno. In fondo, e solo se ce n'è bisogno, il
   * cappello nullo delle classi senza corso — che altrimenti non si vedrebbero.
   */
  private materieConClassi (annoId: string | null): (Materia | null)[] {
    const registro = this.archivio.registro
    const classi = this.classiAttive(annoId)
    const materie = new Map<string, Materia>()
    let senza = false
    for (const classe of classi) {
      const suoi = corsiDellaClasse(registro, classe.id)
        .map((corso) => materiaDelCorso(registro, corso))
        .filter((m): m is Materia => m !== null)
      if (suoi.length === 0) senza = true
      for (const materia of suoi) materie.set(materia.id, materia)
    }
    const elenco: (Materia | null)[] = [...materie.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'it'),
    )
    if (senza) elenco.push(null)
    return elenco
  }

  /** Le classi sotto un cappello: quelle che hanno un corso di quella materia. */
  private classiDellaMateria (materia: Materia | null, annoId: string | null): Classe[] {
    const registro = this.archivio.registro
    return this.classiAttive(annoId).filter((classe) => {
      const materie = corsiDellaClasse(registro, classe.id).map((corso) => corso.materiaId)
      return materia ? materie.includes(materia.id) : materie.length === 0
    })
  }

  getChildren (nodo?: Nodo): Nodo[] {
    const registro = this.archivio.registro
    const annoId = registro.annoCorrenteId

    if (!nodo) {
      return [
        { genere: 'gruppo', chiave: 'lezioni' },
        { genere: 'gruppo', chiave: 'classi' },
        { genere: 'gruppo', chiave: 'corsi' },
        { genere: 'gruppo', chiave: 'piani' },
        { genere: 'gruppo', chiave: 'valutazioni' },
      ]
    }

    switch (nodo.genere) {
      case 'gruppo': {
        if (nodo.chiave === 'lezioni') {
          const prossime = lezioniDellAnno(registro, annoId)
            .filter((l) => l.data >= oggi() && l.stato !== 'annullata')
            .sort(
              (a, b) =>
                a.data.localeCompare(b.data) ||
                (inizioLezione(a) ?? '').localeCompare(inizioLezione(b) ?? ''),
            )
            .slice(0, LEZIONI_MOSTRATE)
          return prossime.length > 0
            ? prossime.map((lezione) => ({ genere: 'lezione', lezione }))
            : [{ genere: 'vuoto', testo: 'Nessuna lezione in programma' }]
        }
        if (nodo.chiave === 'classi') {
          // Le classi stanno sotto la materia che ci si insegna: chi apre la
          // barra sa già di che ora si tratta, e cerca il gruppo dentro quella.
          const materie = this.materieConClassi(annoId)
          return materie.length > 0
            ? materie.map((materia): Nodo => ({ genere: 'materia', materia }))
            : [{ genere: 'vuoto', testo: 'Nessuna classe' }]
        }
        if (nodo.chiave === 'corsi') {
          // Che cosa si insegna quest'anno, e a chi. Sta fra le classi e i
          // piani perché è il pezzo che li tiene insieme, ed è l'elenco su cui
          // si controlla se l'anno è pronto.
          const corsi = [...corsiDellAnno(registro, annoId)].sort((a, b) =>
            a.titolo.localeCompare(b.titolo, 'it'),
          )
          return corsi.length > 0
            ? corsi.map((corso): Nodo => ({ genere: 'corso', corso, da: 'corsi' }))
            : [{ genere: 'vuoto', testo: 'Nessun corso' }]
        }
        if (nodo.chiave === 'piani') {
          // I piani stanno sotto i corsi che li usano — la loro materia, in
          // questa classe — e quelli senza materia restano in fondo, visibili.
          const corsi = [...corsiDellAnno(registro, annoId)].sort((a, b) =>
            a.titolo.localeCompare(b.titolo, 'it'),
          )
          const sciolti = registro.piani
            .filter((p) => !p.corsoId)
            .sort((a, b) => b.aggiornatoIl.localeCompare(a.aggiornatoIl))

          const figli: Nodo[] = corsi.map((corso) => ({ genere: 'corso', corso, da: 'piani' }))
          figli.push(...sciolti.map((piano): Nodo => ({ genere: 'piano', piano })))
          return figli.length > 0 ? figli : [{ genere: 'vuoto', testo: 'Nessun piano lezione' }]
        }
        const momenti = valutazioniDellAnno(registro, annoId)
          .sort((a, b) => b.data.localeCompare(a.data))
          .slice(0, LEZIONI_MOSTRATE)
        return momenti.length > 0
          ? momenti.map((momento) => ({ genere: 'valutazione', momento }))
          : [{ genere: 'vuoto', testo: 'Nessun momento di valutazione' }]
      }

      case 'materia': {
        const classi = this.classiDellaMateria(nodo.materia, annoId)
        return classi.length > 0
          ? classi.map((classe): Nodo => ({ genere: 'classe', classe }))
          : [{ genere: 'vuoto', testo: 'Nessuna classe' }]
      }

      case 'classe':
        return ordinaAllievi(nodo.classe.allievi.filter((a) => a.attivo)).map((allievo) => ({
          genere: 'allievo',
          classe: nodo.classe,
          allievoId: allievo.id,
        }))

      case 'corso': {
        if (nodo.da === 'piani') {
          const piani = pianiDi(registro, nodo.corso)
          return piani.length > 0
            ? piani.map((piano) => ({ genere: 'piano', piano }))
            : [{ genere: 'vuoto', testo: 'Nessun piano per questa materia' }]
        }
        // Sotto «Corsi» un corso si apre sulle ore che vengono: è la domanda
        // che ci si fa guardandolo — quando lo rivedo, questo gruppo?
        const prossime = registro.lezioni
          .filter((l) => l.corsoId === nodo.corso.id && l.data >= oggi() && l.stato !== 'annullata')
          .sort(
            (a, b) =>
              a.data.localeCompare(b.data) ||
              (inizioLezione(a) ?? '').localeCompare(inizioLezione(b) ?? ''),
          )
          .slice(0, LEZIONI_MOSTRATE)
        return prossime.length > 0
          ? prossime.map((lezione): Nodo => ({ genere: 'lezione', lezione }))
          : [{ genere: 'vuoto', testo: 'Nessuna lezione in programma' }]
      }

      default:
        return []
    }
  }

  getTreeItem (nodo: Nodo): vscode.TreeItem {
    const apri = (navigazione: MessaggioNavigazione): vscode.Command => ({
      command: 'registroDocenti.apriElemento',
      title: 'Apri nel registro',
      arguments: [navigazione],
    })

    switch (nodo.genere) {
      case 'gruppo': {
        const etichette = {
          lezioni: 'Prossime lezioni',
          classi: 'Classi',
          corsi: 'Corsi',
          piani: 'Piani lezione',
          valutazioni: 'Valutazioni',
        }
        const icone = {
          lezioni: 'calendar',
          classi: 'organization',
          corsi: 'book',
          piani: 'checklist',
          valutazioni: 'graph',
        }
        const voce = new vscode.TreeItem(
          etichette[nodo.chiave],
          vscode.TreeItemCollapsibleState.Expanded,
        )
        voce.iconPath = new vscode.ThemeIcon(icone[nodo.chiave])
        voce.contextValue = `gruppo.${nodo.chiave}`
        return voce
      }

      case 'lezione': {
        const registro = this.archivio.registro
        const classe = classeDellaLezione(registro, nodo.lezione)
        const inizio = inizioLezione(nodo.lezione)
        // Di che cosa parla lo dice il piano, che finisce già nella descrizione.
        const voce = new vscode.TreeItem(
          classe?.nome ?? 'senza classe',
          vscode.TreeItemCollapsibleState.None,
        )
        const piano = nodo.lezione.pianoId
          ? registro.piani.find((p) => p.id === nodo.lezione.pianoId) ?? null
          : null
        voce.description =
          `${formattaData(nodo.lezione.data, 'giorno')}${inizio ? ` · ${inizio}` : ''}` +
          (piano ? ` · ${piano.attivita.length} attività` : ' · senza piano')
        voce.iconPath = new vscode.ThemeIcon(
          nodo.lezione.data === oggi() ? 'circle-filled' : 'circle-outline',
        )
        const riepilogo = riepilogaPresenze(nodo.lezione.presenze)
        voce.tooltip = new vscode.MarkdownString(
          [
            `**${classe?.nome ?? 'Senza classe'}** — ${formattaData(nodo.lezione.data, 'lungo')}`,
            '',
            nodo.lezione.slot.map((s) => `${s.inizio}–${s.fine}${s.tipo === 'pausa' ? ' (pausa)' : ''}`).join(' · '),
            riepilogo.udTotali > 0
              ? `Presenti ${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}` +
                (riepilogo.senzaAppello > 0 ? ` · ${riepilogo.senzaAppello} da fare` : '')
              : 'Appello non ancora fatto',
          ].join('\n'),
        )
        voce.command = apri({ tipo: 'naviga', vista: 'lezione', elementoId: nodo.lezione.id })
        // Il menu contestuale cambia: senza piano si offre di crearlo o copiarlo.
        voce.contextValue = piano ? 'lezione' : 'lezione-senza-piano'
        return voce
      }

      case 'materia': {
        const registro = this.archivio.registro
        const quante = this.classiDellaMateria(nodo.materia, registro.annoCorrenteId).length
        const voce = new vscode.TreeItem(
          nodo.materia?.nome ?? 'Senza materia',
          vscode.TreeItemCollapsibleState.Expanded,
        )
        voce.description = plurale(quante, 'classe', 'classi')
        voce.iconPath = new vscode.ThemeIcon('book')
        // Nessun comando: la materia qui è solo il cappello sotto cui cercare
        // la classe, e cliccarla aprirebbe una vista che non esiste.
        voce.contextValue = 'materia'
        return voce
      }

      case 'classe': {
        const attivi = nodo.classe.allievi.filter((a) => a.attivo).length
        const voce = new vscode.TreeItem(
          nodo.classe.nome,
          attivi > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        )
        // La materia è già il cappello sopra: qui basta quanti allievi ci sono.
        voce.description = plurale(attivi, 'allievo', 'allievi')
        voce.iconPath = new vscode.ThemeIcon('organization')
        voce.command = apri({ tipo: 'naviga', vista: 'classi', elementoId: nodo.classe.id })
        voce.contextValue = 'classe'
        return voce
      }

      case 'allievo': {
        const allievo = nodo.classe.allievi.find((a) => a.id === nodo.allievoId)
        const voce = new vscode.TreeItem(
          allievo ? nomeCompleto(allievo) : '—',
          vscode.TreeItemCollapsibleState.None,
        )
        voce.iconPath = new vscode.ThemeIcon('account')
        // Dall'albero si arriva alla scheda dell'allievo, non alla classe: è
        // quel che si cerca cliccando su un nome.
        voce.command = apri({ tipo: 'naviga', vista: 'allievo', elementoId: nodo.allievoId })
        voce.contextValue = 'allievo'
        return voce
      }

      case 'piano': {
        const voce = new vscode.TreeItem(
          nomeDelPiano(this.archivio.registro, nodo.piano),
          vscode.TreeItemCollapsibleState.None,
        )
        const durata = nodo.piano.attivita.reduce((s, a) => s + a.durataUd, 0)
        voce.description = `${nodo.piano.attivita.length} attività · ${durata} min`
        voce.iconPath = new vscode.ThemeIcon('checklist')
        voce.command = apri({ tipo: 'naviga', vista: 'piani', elementoId: nodo.piano.id })
        voce.contextValue = 'piano'
        return voce
      }

      case 'corso': {
        const registro = this.archivio.registro

        if (nodo.da === 'piani') {
          const quanti = pianiDi(registro, nodo.corso).length
          const voce = new vscode.TreeItem(
            nodo.corso.titolo,
            quanti > 0
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None,
          )
          voce.description = plurale(quanti, 'piano', 'piani')
          voce.iconPath = new vscode.ThemeIcon('book')
          voce.command = apri({ tipo: 'naviga', vista: 'corsi', elementoId: nodo.corso.id })
          // Sotto «Piani lezione» un corso è la casella delle sue scalette, non
          // l'insegnamento: le voci del menu contestuale sono altre, e due rami
          // con lo stesso `contextValue` le mostrerebbero tutte in tutti e due.
          voce.contextValue = 'corso-piani'
          return voce
        }

        const lezioni = registro.lezioni.filter((l) => l.corsoId === nodo.corso.id)
        const restano = lezioni.filter((l) => l.data >= oggi() && l.stato !== 'annullata').length
        const valutazioni = registro.valutazioni.filter((v) => v.corsoId === nodo.corso.id).length
        const voce = new vscode.TreeItem(
          nodo.corso.titolo,
          restano > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        )
        // Quel che serve sapere a colpo d'occhio: quante ore restano da fare.
        // Zero su un corso che ne ha già svolte vuol dire anno finito; zero su
        // un corso vuoto vuol dire orario da dichiarare, ed è un altro problema.
        voce.description =
          lezioni.length === 0
            ? 'nessuna lezione'
            : `${restano} da fare · ${lezioni.length} in tutto`
        voce.iconPath = new vscode.ThemeIcon('book')
        voce.tooltip = new vscode.MarkdownString(
          [
            `**${nodo.corso.titolo}**`,
            '',
            nodo.corso.orario.length > 0
              ? nodo.corso.orario.map((r) => descriviRicorrenza(r)).join(' · ')
              : 'Nessun orario fisso',
            `${plurale(lezioni.length, 'lezione', 'lezioni')} · ` +
              plurale(valutazioni, 'valutazione', 'valutazioni'),
          ].join('\n'),
        )
        voce.command = apri({ tipo: 'naviga', vista: 'corsi', elementoId: nodo.corso.id })
        voce.contextValue = 'corso'
        return voce
      }

      case 'valutazione': {
        const media = mediaMomento(nodo.momento)
        const voce = new vscode.TreeItem(nodo.momento.titolo, vscode.TreeItemCollapsibleState.None)
        voce.description = `${formattaData(nodo.momento.data)} · media ${formattaVoto(media)}`
        voce.iconPath = new vscode.ThemeIcon('graph')
        voce.command = apri({ tipo: 'naviga', vista: 'valutazioni', elementoId: nodo.momento.id })
        voce.contextValue = 'valutazione'
        return voce
      }

      case 'vuoto': {
        const voce = new vscode.TreeItem(nodo.testo, vscode.TreeItemCollapsibleState.None)
        voce.iconPath = new vscode.ThemeIcon('dash')
        return voce
      }
    }
  }
}
