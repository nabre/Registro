# Catalogo delle funzioni — Registro docenti

Questo documento elenca **tutto** ciò che l'applicazione sa fare, superficie per
superficie, così come sta scritto nel codice. Non è una guida e non è un
riassunto: è l'inventario da cui si deriva la superficie di un'API. Dove una
tabella ha centoquarantuno righe, ci sono centoquarantuno righe.

Verificato sul codice al ramo `main`, commit `9470241`, più il livello
`src/api/` dell’albero di lavoro: i conteggi di questo documento sono contati
a macchina sul sorgente, non riportati a mano.

---

## 1. Come leggere il catalogo

L'applicazione espone **sei superfici** distinte. Sono livelli diversi dello
stesso sistema, non sei elenchi paralleli.

| Superficie | Dove è dichiarata | Che cos'è | Quante |
|---|---|---|---|
| **Destinazioni (pagine)** | [`src/ui/pages.ts`](../src/ui/pages.ts) — `PAGINE` | Un posto in cui *andare*: barra laterale, palette, navigazione dall'host | 18 |
| **Viste** | [`src/protocol.ts`](../src/protocol.ts) — `type Vista`, instradate da [`src/ui/shell.ts`](../src/ui/shell.ts) | Lo schermo che viene davvero disegnato | 16 |
| **Comandi dell'interfaccia** | [`src/ui/commands.ts`](../src/ui/commands.ts) — `COMANDI_UI` | Una cosa da *fare*: riga azioni, palette, scorciatoie | 89 |
| **Azioni del protocollo** | [`src/protocol.ts`](../src/protocol.ts) — `type Azione` | Il comando che attraversa il ponte verso l'host, e **scrive** | 141 |
| **Procedure di lettura** | [`src/api/procedures/`](../src/api/procedures/) — le procedure con `genere: 'lettura'` | Una domanda al registro che non lo cambia: passa dal canale `Domanda`/`Riscontro`, fuori dalla coda delle scritture (§6.17) | 8 |
| **Comandi del programma** | [`src/manifest.ts`](../src/manifest.ts) — `COMANDI` | Voce del menu nativo / vassoio / agenda / promemoria | 21 |

### Come si incastrano

```
  utente
    |
    +- clic sulla barra laterale, o voce di palette
    |     `- vaiA(pagina)           pagine.ts    -> controlla impedimento() -> pagina.apri()
    |           `- aggiorna({vista, ...})         stato locale del pannello: niente rete
    |
    +- clic sulla riga azioni, o scorciatoia, o voce di palette
    |     `- eseguiComando(comando) comandi.ts   -> controlla impedimento() -> comando.al()
    |           +- aggiorna({...})                (comandi di sola navigazione/filtro)
    |           +- apre un modulo (moduli/*.ts)   (comandi che chiedono dei dati)
    |           `- azione({tipo:'...'})           -> una o piu` Azione verso l'host
    |
    `- voce di menu nativo / vassoio / agenda / notifica di promemoria
          `- executeCommand('registroDocenti....')   manifesto.ts + avvio.ts
                +- apriRegistro() + MessaggioNavigazione   -> porta il pannello su una Vista
                `- esegui(archivio, {tipo:'...'})          -> la stessa Azione del webview
```

Le regole che tengono insieme il quadro:

1. **Una pagina è una destinazione, una vista è uno schermo.** Più pagine
   possono puntare alla stessa vista con contesto diverso: le quattro pagine
   `pagina.classe.*` aprono tutte `vista: 'docenteClasse'` cambiando solo
   `schedaDocente`. La vista `allievo` non ha una pagina propria: ci si arriva
   dall'elenco delle persone, e `nomeDelPosto()` la chiama «Scheda della
   persona» come caso speciale.
2. **Un comando UI chiama zero, una o più azioni.** Ci sono comandi puramente
   locali (`mappa.inquadra`, `documenti.svuotaScelta`, tutti gli interruttori di
   filtro e di scheda) che non toccano mai il ponte.
3. **Un comando del manifesto passa dallo stesso bus.** Il menu nativo non ha
   una scorciatoia privilegiata: `registroDocenti.nuovoAnno` chiede le date con
   un `QuickPick` e poi chiama `esegui(archivio, {tipo:'anno.crea', …})`,
   esattamente come farebbe il modulo del webview.
4. **Il `dove` di un comando è una superficie, non una pagina.** `'app'` = menu
   File; `'schermo'` = scheda Proiezione; ogni altro valore è una `Vista`, cioè
   «la riga azioni di quello schermo».
5. **Un comando non eseguibile non sparisce: resta spento.** `impedimento()`
   restituisce la frase che spiega perché, e quella frase finisce nel tooltip e
   nella notifica se si insiste da palette o tastiera. È una scelta esplicita:
   rispondere sempre a «perché non posso farlo».
6. **Ogni scrittura sui dati passa da un'`Azione`.** Il webview non scrive mai
   su disco e non muta mai `stato.registro`: manda l'azione e aspetta che l'host
   rispinga l'intero `Registro` con un `MessaggioStato`.
7. **Quel che si chiede e basta non passa da un'`Azione`.** Il pannello quasi
   tutto ce l'ha già — lo stato spinto — e per il resto c'è un secondo canale,
   `Domanda`/`Riscontro`, che raggiunge le 8 procedure di lettura di
   `src/api/`. Non è una comodità: è il posto dove sono finite le due «azioni»
   che scrittura non erano (§6.17).

---

## 2. Destinazioni (pagine)

### 2.1 Le 18 `Pagina` di `PAGINE`

Fonte: [`src/ui/pages.ts`](../src/ui/pages.ts).
Colonne: **gruppo** = sezione della barra laterale (`GruppoPagina`);
**vista** = ciò che `apri()` imposta; **impedimento** = perché non ci si può
andare; **conteggio** = la pastiglia accanto al titolo (`conto()`); zero non si
mostra mai.

| # | id | titolo | gruppo | icona | vista di destinazione | impedimento | conteggio |
|---|---|---|---|---|---|---|---|
| 1 | `pagina.calendario` | Calendario | `gestione` | `calendario` | `calendario` | — | — |
| 2 | `pagina.pendenze` | Pendenze (`Molti(CARTE.pendenza)`) | `gestione` | `spunta` | `todo` | — | — |
| 3 | `pagina.daSmistare` | Da smistare | `gestione` | `documento` | `daSmistare` | — | `pagineDaSmistareInTutto()` — pagine PDF non ancora assegnate, in tutte le classi |
| 4 | `pagina.persone` | Persone (`Molti(PIF)`) | `gestione` | `utente` | `persone` (risulta attiva anche su `allievo`) | — | — |
| 5 | `pagina.mappa` | Mappa | `gestione` | `mappa` | `mappa` | — | — |
| 6 | `pagina.corso.registro` | Lezione | `registro` | `agenda` | `lezione` — via `vaiAlCorso()`: imposta `corsoId`, `filtroClasseId`, `lezioneId` = `lezioneDiRiferimentoDiCorso()` | `senzaCorso` | — |
| 7 | `pagina.corso.valutazioni` | Valutazioni | `registro` | `valutazioni` | `valutazioni` — `vaiAlCorso()` | `senzaCorso` | — |
| 8 | `pagina.corso.piani` | Piani lezione | `registro` | `piano` | `piani` — `vaiAlCorso()` | `senzaCorso` | — |
| 9 | `pagina.corso.documenti` | Documenti | `registro` | `documento` | `documenti` — `vaiAlCorso()` | `senzaCorso` | — |
| 10 | `pagina.classe.pendenze` | Pendenze della classe | `classe` | `spunta` | `docenteClasse` + `schedaDocente: 'todo'` — via `vaiAlPannello()` | — (la sezione esiste solo se si è docente di classe) | — |
| 11 | `pagina.classe.documenti` | Archivio documentale | `classe` | `documento` | `docenteClasse` + `schedaDocente: 'documenti'` | — | — |
| 12 | `pagina.classe.assenze` | Assenze | `classe` | `calendario` | `docenteClasse` + `schedaDocente: 'assenze'` | — | — |
| 13 | `pagina.classe.messaggistica` | Messaggistica | `classe` | `posta` | `docenteClasse` + `schedaDocente: 'messaggistica'` | — | — |
| 14 | `pagina.corsi` | Corsi | `sistema` | `libro` | `corsi` | — | — |
| 15 | `pagina.classi` | Classi | `sistema` | `classi` | `classi` | — | — |
| 16 | `pagina.modelli` | Modelli | `sistema` | `matita` | `modelli` | — | — |
| 17 | `pagina.impostazioni` | Impostazioni | `sistema` | `impostazioni` | `impostazioni` | — | — |
| 18 | `pagina.guida` | Guida | `sistema` | `informazione` | `guida` | — | — |

**Una sola pagina dichiara un conteggio** (`pagina.daSmistare`) e **quattro
dichiarano un impedimento** (le quattro del gruppo `registro`, tutte
`senzaCorso`). Le quattro del gruppo `classe` non ne hanno per scelta esplicita:
l'intera sezione sparisce quando `classiDiCuiSonoDocente().length === 0`
(`sezioneCePer`), e dentro una sezione che c'è `classeDelFascicolo()` una classe
buona la trova sempre.

`vaiA(pagina)` è l'unico ingresso di navigazione: controlla l'impedimento
(notifica e si ferma), chiama `pagina.apri()` e poi riporta `schedaComandi` su
`'pagina'`, memorizzando `paginaId` se la pagina risulta davvero attiva.

### 2.2 I quattro gruppi

| `GruppoPagina` | nome corto | titolo lungo nella tendina | icona | esiste sempre? |
|---|---|---|---|---|
| `gestione` | Gestione | «Gestione» | `calendario` | sì |
| `registro` | Registro | «Registro — *nome del corso*» | `agenda` | sì (anche senza corsi, con le pagine spente) |
| `classe` | Docente di classe | «Docente di classe — *nome della classe*» | `classi` | solo con almeno una classe di cui si è docente |
| `sistema` | Il programma | «Il programma» | `impostazioni` | sì |

Ordine di presentazione: `gestione` → `registro` → `classe` → `sistema`
(costante `ORDINE`).

### 2.3 Le 16 `Vista`

`type Vista` è dichiarata in [`src/protocol.ts`](../src/protocol.ts) — non
in `stato.ts` — perché è l'unico elenco che host e webview leggono entrambi:
`MessaggioNavigazione.vista` la usa. Lo `switch` che le instrada sta in
[`src/ui/shell.ts`](../src/ui/shell.ts).

| `Vista` | file | schede interne | dati consumati |
|---|---|---|---|
| `calendario` | [`views/calendar.ts`](../src/ui/views/calendar.ts) | 4 modi (`ModoCalendario`, da `porzioni.ts::MODI_CALENDARIO`): settimana, mese, anno, agenda | `stato.data`, `modoCalendario`, `lezioneId`, `filtroCorsoAgendaId`, `adessoData`/`adessoOra`, `registro.impostazioni`; `annoCorrente`, `lezioniInAgenda`, `classeDiLezione`, `nomeDiLezione`, `scalettaDiLezione`, `compleanniDi`/`compleanniFra`, `semestrePerData` |
| `todo` | [`views/todo.ts`](../src/ui/views/todo.ts) | nessuna propria (delega a `classTodo.ts`) | `filtroTodo`, `classeTodoId`, `adessoData`; `annoCorrente`, `classiVisibili`, `corsiDellAnnoAperto`; dominio `riepilogoTodo`, `classiConLavoro` |
| `daSmistare` | [`views/toSort.ts`](../src/ui/views/toSort.ts) | nessuna | `registro.smistamenti`; `classiDiCuiSonoDocente`, `corsiDi`; dominio `daSmistarePerClasse`; esporta `pagineDaSmistareInTutto()` |
| `lezione` | [`views/lesson.ts`](../src/ui/views/lesson.ts) | 3 linguette (`SchedaLezione`): amministrazione (appello + `pannelloConsegne` + `pannelloRiconsegneDellOra`), lezione (piano + griglia voti + `bloccoRecuperiDellOra`), annotazioni (contenuti + osservazioni) | `lezioneId`, `schedaLezione`, `registro`; `lezionePerId`, `lezioneDiRiferimento`, `titoloDiLezione`, `uriDato` |
| `classi` | [`views/classes.ts`](../src/ui/views/classes.ts) | nessuna (elenco + scheda anagrafica) | `classeId`, `registro`; `classePerId`, `classiDellAnno`, `materieDiClasse` |
| `persone` | [`views/people.ts`](../src/ui/views/people.ts) | riusa `schedaAllievo()` di `student.ts` | `allievoId`, `classiApertePersone`; `annoCorrente`, `classiVisibili`; ricerca locale di modulo |
| `allievo` | [`views/student.ts`](../src/ui/views/student.ts) | 3 linguette (`SchedaPersona`): anagrafica, docenteClasse (solo con il flag sulla classe), materie | `allievoId`, `classeId`, `adessoData`, `registro`; `classeDellAllievo`, `corsiDi`, `fascicoloDi`, `lezioniDi` |
| `docenteClasse` | [`views/classTeacher.ts`](../src/ui/views/classTeacher.ts) | 4 linguette (`SchedaDocente`): todo, documenti, assenze, messaggistica | `schedaDocente`, `filtroTodoClasse`, `adessoData`; `classeDelFascicolo()`, `classiDiCuiSonoDocente`, `fascicoloDi` |
| `corsi` | [`views/courses.ts`](../src/ui/views/courses.ts) | nessuna (elenco + scheda con matrice) | `adessoData`/`adessoOra`, `registro`; `corsiDellAnnoAperto`, `pianiPerCorso`, `semestreScelto`; dominio `matriceCorso`, `orario` |
| `piani` | [`views/plans.ts`](../src/ui/views/plans.ts) | nessuna (libreria + editor a due colonne) | `pianoId`, `ricerca`, `registro`; esporta `pianoMostrato()`, `primaOraDelPiano()`, `scordaEditorDelPiano()` |
| `valutazioni` | [`views/assessments.ts`](../src/ui/views/assessments.ts) | pannelli satellite `pannelloRecuperi` e `pannelloRiconsegna`; esporta `grigliaVoti`/`elencoVoti` a `lezione.ts` | `valutazioneId`, `registro`; `classeDiMomento`, `valutazionePerId`, `corsoDelContesto()`; dominio `orfani`, `recuperi` |
| `documenti` | [`views/documents.ts`](../src/ui/views/documents.ts) | 3 schede (`SchedaDocumenti`): corso, lezioni, allievi | `schedaDocumenti`; `corsoDelContesto()`, `corsiDellAnnoAperto`, `nomeSemestreScelto`, `stato.esportati`, `stato.composizioni` |
| `modelli` | [`views/templates.ts`](../src/ui/views/templates.ts) | nessuna | `stato.modelli`, `modelloScelto`, `radiceApp`; esporta `modelloAperto`, `modelloDaSalvare`, `salvaModello`, `ripristinaAperto`, `ricaricaAperto`, `provaAperto`, `portaImmagine`, `apriCartellaModelli` |
| `mappa` | [`views/map.ts`](../src/ui/views/map.ts) | 3 schede (`SchedaMappa`): tutti, domicilio, lavoro | `schedaMappa`, `registro`; `annoCorrente`, `classiDellAnno`; dominio `mappa`; esporta `mostraSullaMappa`, `inquadraTutto`, `indirizziInAttesa` |
| `impostazioni` | [`views/settings.ts`](../src/ui/views/settings.ts) | 2 ambiti (documento / programma) × sezioni | `ambitoImpostazioni`, `schedaDocumento`, `schedaProgramma`, `stato.programma` |
| `guida` | [`views/help.ts`](../src/ui/views/help.ts) | elenco di schede testuali, una per `Vista` | nessun dato applicativo |

### 2.4 File satellite (non sono `Vista`, non sono instradati da `shell.ts`)

| File | Che cosa esporta | Chi lo usa |
|---|---|---|
| [`views/archive.ts`](../src/ui/views/archive.ts) | righe, cornice e inventario PDF dell'archivio documentale | `docenteClasse.ts`, `assenze.ts`, `toSort.ts`, `smistamento.ts` |
| [`views/absences.ts`](../src/ui/views/absences.ts) | `schedaAssenze`, `gruppoRichiesteFirma`, `gruppoSegnalazioni` | `docenteClasse.ts`, `todo.ts`, `classTodo.ts` |
| [`views/assignments.ts`](../src/ui/views/assignments.ts) | `pannelloConsegne`, `gruppoConsegne` | `lezione.ts`, `todo.ts`, `classTodo.ts` |
| [`views/retakes.ts`](../src/ui/views/retakes.ts) | `bloccoRecuperiDellOra`, `pannelloRecuperi`, `gruppoRecuperi` | `lezione.ts`, `valutazioni.ts`, `todo.ts`, `classTodo.ts`, `riconsegne.ts` |
| [`views/returns.ts`](../src/ui/views/returns.ts) | `pannelloRiconsegneDellOra`, `pannelloRiconsegna`, `gruppoRiconsegne`, `gruppoRiconsegneAllievi` | `lezione.ts`, `valutazioni.ts`, `todo.ts`, `classTodo.ts` |
| [`views/pageBrowser.ts`](../src/ui/views/pageBrowser.ts) | `accettaPagine*`, `portaPagine`, `sfoglioSmistamento` | `docenteClasse.ts`, `assenze.ts`, `archivio.ts`, `smistamento.ts` |
| [`views/sorting.ts`](../src/ui/views/sorting.ts) | `caricaPdf`, `rileggiScansioni`, `pdfInAttesa` | `docenteClasse.ts`, `toSort.ts`, `assenze.ts`, `comandi.ts` |
| [`views/classTodo.ts`](../src/ui/views/classTodo.ts) | `schedaTodoClasse`, `sezioniTodoClasse`, `simboloFamiglia`, `riassuntoClasse` | `todo.ts`, `docenteClasse.ts` |
| [`views/documents/preview.ts`](../src/ui/views/documents/preview.ts) | `cornice`, `documentoAperto`, `senzaAnteprima` | `documenti.ts` |
| [`views/documents/csv.ts`](../src/ui/views/documents/csv.ts) | `anteprimaCsv` | `documenti.ts` |
| [`views/documents/sheets.ts`](../src/ui/views/documents/sheets.ts) | `azzeraRighe`, `sceltiInOrdine` | `documenti.ts`, `comandi.ts` |
| [`views/documents/cards.ts`](../src/ui/views/documents/cards.ts) | `delCorso`, `prove`, `piani`, `dellaClasse`, `composizioni`, `matriceLezioni`, `fotoDellaClasse`, `schedeAllievo` | `documenti.ts` |
| [`views/settings/year.ts`](../src/ui/views/settings/year.ts) | `schedaAnnoAperto`, `schedaChiusure`, `schedaSettimane`, `schedaElencoAnni` | `impostazioni.ts` |
| [`views/settings/document.ts`](../src/ui/views/settings/document.ts) | `schedaCalendario`, `schedaValutazione`, `schedaMaterie`, `schedaFile`, `salvaImpostazioni` | `impostazioni.ts` |
| [`views/settings/lists.ts`](../src/ui/views/settings/lists.ts) | `schedaListe` | `impostazioni.ts` |
| [`views/settings/registers.ts`](../src/ui/views/settings/registers.ts) | `schedaRegistri` | `impostazioni.ts` |
| [`views/settings/mail.ts`](../src/ui/views/settings/mail.ts) | `schedaPosta` | `impostazioni.ts` |
| [`views/settings/program.ts`](../src/ui/views/settings/program.ts) | `schedaProgramma`, `vociDellaSezione`, `dovVannoLeOpzioni`, `vociProgramma` | `impostazioni.ts` |
| [`views/settings/sections.ts`](../src/ui/views/settings/sections.ts) | `SEZIONI_PROGRAMMA`, `gruppiDiSezione`, `vociDiSezione`, `nomeVoce`, `sottoPrefisso` | `impostazioni.ts`, `program.ts` |

---

## 3. Comandi dell'interfaccia

Fonte: [`src/ui/commands.ts`](../src/ui/commands.ts),
`COMANDI_UI: readonly ComandoUI[]`.

**94 comandi in tutto**: 65 scritti come oggetti letterali, 29 generati da otto
`.map()` su elenchi di varianti (4 modi del calendario + 3 filtri pendenze + 3
stati dell'ora + 2 filtri pendenze di classe + 7 blocchi di proiezione + 4 viste
del calendario proiettato + 3 schede dei documenti + 3 modi di rigenerazione
PDF).

Forma di un comando:

```ts
interface ComandoUI {
  id: string
  titolo: string | (() => string)
  simbolo: NomeIcona
  dove: readonly Posto[]          // 'app' | 'schermo' | Vista
  schedaDocente?: SchedaDocente   // restringe ancora dentro 'docenteClasse'
  gruppo: string                  // il riquadro nella riga comandi
  aiuto?: string | (() => string)
  scorciatoia?: string
  dalMenu?: boolean               // gia` intercettato dall'acceleratore Electron
  primario?: boolean | (() => boolean)
  acceso?: () => boolean          // se c'e`, il comando e` un interruttore
  impedimento?: () => string | null
  al: () => void | Promise<unknown>
}
```

Convenzioni di lettura delle tabelle:

- **interruttore** = il comando dichiara `acceso()`; nella barra si mostra
  premuto/non premuto invece che come pulsante secco.
- **primario** = `primario: true` o una funzione che a volte torna vero: è il
  pulsante in evidenza della riga.
- `eseguiComando()` è il varco unico: barra, palette e scorciatoie passano tutti
  di lì, e tutti controllano `impedimento()` prima di eseguire.

### 3.1 Il documento (`gruppo: Il documento`, `dove: app`)

| id | titolo | scorciatoia | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `file.apri` | Apri un anno… | `Ctrl+O` (`dalMenu`) | sì | no | — | `azione({tipo:'documento.apri'})` |
| `file.salva` | Salva | `Ctrl+S` | no | no | — | in pagina Modelli con modifiche pendenti: `salvaModello()`; altrimenti `azione({tipo:'stato.salva'})` |
| `file.ricarica` | Ricarica | — | no | no | — | `azione({tipo:'stato.ricarica'})` |
| `file.chiudi` | Chiudi l'anno | — | no | no | «Non c'è nessun documento aperto.» se `stato.documenti.corrente` è nullo | `azione({tipo:'documento.chiudi'})` |
| `file.cartella` | Mostra nel gestore file | — | no | no | — | `azione({tipo:'sistema.apriCartella'})` |

### 3.2 L'anno (`gruppo: L'anno`, `dove: app`)

| id | titolo | scorciatoia | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `file.nuovoAnno` | Nuovo anno scolastico | — | sì quando `annoCorrente() === null` | no | — | apre `moduloAnno()` |
| `file.modificaAnno` | Modifica l'anno | — | no | no | `senzaAnno` | apre `moduloAnno(anno)` |
| `file.pause` | Vacanze e sospensioni | — | no | no | `senzaAnno` | apre `moduloPause(anno)` |

### 3.3 Che cosa si regola (`dove: impostazioni`)

| id | titolo | scorciatoia | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `impostazioni.programma` | Programma | — | no | **sì** (`ambitoImpostazioni === 'programma'`) | — | `aggiorna({ambitoImpostazioni:'programma'})` |
| `impostazioni.registro` | Registro | — | no | **sì** (`ambitoImpostazioni === 'documento'`) | — | `aggiorna({ambitoImpostazioni:'documento'})` |

### 3.4 Manutenzione (`dove: app, impostazioni`)

| id | titolo | scorciatoia | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `file.ripara` | Ripara il registro | — | no | no | «Non c'è niente da riparare.» se `riparazioni(stato.registro)` è vuoto | `azione({tipo:'manutenzione.ripara'})` |

### 3.5 Adesso (`dove: calendario`, uno anche su `lezione`)

| id | titolo | scorciatoia | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `registro.oggi` | Oggi | `Ctrl+Alt+T` (`dalMenu`) | sì | no | — | `vaiAOggi()` (locale) |
| `calendario.indietro` | Indietro | — | no | no | — | `scorriCalendario(-1)` (locale) |
| `calendario.avanti` | Avanti | — | no | no | — | `scorriCalendario(1)` (locale) |
| `registro.oraDaCompilare` | «Ora da compilare» / «Prossima ora» (titolo dinamico) | — | no | no | «Non c'è nessun'ora da compilare.» oppure «È l'ora che stai compilando.» | `aggiorna({vista:'lezione', lezioneId})` sull'ora trovata da `oraDaCompilare()`; `dove: ['calendario','lezione']` |

### 3.6 Come si guarda il calendario (`dove: calendario`, 4 varianti da `MODI_CALENDARIO`)

Tutti **interruttori** (`stato.modoCalendario === valore`), tutti senza
precondizione, tutti `scegliModoCalendario(valore)` — azione locale.

| id | titolo | aiuto |
|---|---|---|
| `calendario.settimana` | Settimana | Le ore sulla griglia dei giorni, alte quanto durano |
| `calendario.mese` | Mese | Una striscia di settimane che scorre senza fine |
| `calendario.anno` | Anno | L'anno intero in un foglio: vacanze, semestri e quanti corsi per giorno |
| `calendario.agenda` | Agenda | Le ore in elenco, una riga ciascuna |

### 3.7 Che cosa si guarda nelle pendenze (`dove: todo`, 3 varianti da `FILTRI_TODO`)

Tutti **interruttori** (`stato.filtroTodo === valore`), nessuna precondizione,
`aggiorna({filtroTodo: valore})` — azione locale.

| id | titolo | aiuto |
|---|---|---|
| `todo.tutte` | Tutte | Quel che tocca a me e quel che tocca alle classi, insieme |
| `todo.mie` | Le mie | Solo quel che devo fare io: la lista della sera prima |
| `todo.classi` | Delle classi | Solo quel che devono portare loro: la lista che si legge entrando in aula |

### 3.8 Crea

| id | titolo | dove | gruppo | scorciatoia | primario | precondizione | che cosa fa |
|---|---|---|---|---|---|---|---|
| `registro.nuovaLezione` | Nuova ora | `calendario` | Crea | `Ctrl+Alt+N` (`dalMenu`) | sì | — | apre `moduloLezione({corsoId, data, dopo})`, poi va sulla lezione creata |
| `registro.nuovaConsegna` | Nuova consegna | `todo` | Crea | — | sì | «Non c'è ancora nessun corso a cui darla.» | apre `moduloConsegna({corsoId})` |
| `registro.nuovoCorso` | Nuovo corso | `corsi`, `classi` | Crea | — | no | — | apre `moduloCorso({classeId})` |
| `registro.nuovaClasse` | Nuova classe | `classi`, `corsi` | Crea | — | no | — | apre `moduloClasse()` |
| `registro.avvio` | Avvio guidato | `app`, `corsi` | Crea | — | no | — | apre `moduloAvvio()` |

### 3.9 Stato dell'ora (`dove: lezione`, 3 varianti da `ORDINE_STATI`)

Tutti **interruttori** (`statoLezione() === valore`), tutti con
`impedimento: senzaLezione`. `lezione.stato.svolta` è **primario** quando c'è
un'ora aperta non ancora svolta. Azione:
`azione({tipo:'lezione.stato', lezioneId, stato})` seguita da una notifica.

| id | titolo | aiuto | conferma modale |
|---|---|---|---|
| `lezione.stato.pianificata` | Pianificata | L'ora torna fra quelle da fare: quel che è già scritto resta | no |
| `lezione.stato.svolta` | Svolta | L'ora è fatta: esce dalle pendenze e conta nel monte ore | no |
| `lezione.stato.annullata` | Annullata | Resta nel registro, segnata come non svolta: i dati inseriti non si perdono | **sì** — «Annullare la lezione?» |

### 3.10 L'ora e il piano

| id | titolo | dove | gruppo | primario | precondizione | che cosa fa |
|---|---|---|---|---|---|---|
| `lezione.modifica` | Modifica l'ora | `lezione` | L'ora | no | `senzaLezione` | apre `moduloLezione({lezione})` |
| `piano.vaiAlRegistro` | Vai al registro | `piani` | Il piano | sì | «Nessun piano aperto.» oppure «Questa scaletta non sta ancora su nessun'ora…» | `aggiorna({vista:'lezione', lezioneId, data})` sulla prima ora del piano |
| `piano.duplica` | Duplica | `piani` | Il piano | no | «Nessun piano aperto.» | `azione({tipo:'piano.duplica'})`, poi seleziona il piano creato |
| `piano.elimina` | Elimina | `piani` | Il piano | no | «Nessun piano aperto.» | `chiediEliminazione({genere:'piano'})` → `azione({tipo:'piano.elimina'})` → `scordaEditorDelPiano()` |
| `corso.nuovaOra` | Ora in questo corso | `piani`, `valutazioni` | L'ora | no | `senzaCorso` | apre `moduloLezione({corsoId, classeId, data, dopo})` |

### 3.11 Mappa (`dove: mappa`)

| id | titolo | gruppo | primario | precondizione | che cosa fa |
|---|---|---|---|---|---|
| `mappa.geocodifica` | Trova gli indirizzi | Indirizzi | sì se `indirizziInAttesa() > 0` | «Ogni indirizzo scritto ha già il suo punto sulla mappa.» | `azione({tipo:'mappa.geocodifica'})` |
| `mappa.rifai` | Rifai gli indirizzi | Indirizzi | no | — | conferma «Rifare tutti gli indirizzi?» → `azione({tipo:'mappa.geocodifica', rifaiTutto:true})` |
| `mappa.inquadra` | Inquadra tutto | Come si guarda | no | — | `inquadraTutto()` — solo locale, non tocca l'host |

### 3.12 Elenco e famiglie (`dove: allievo`, `classi`)

| id | titolo | dove | gruppo | precondizione | che cosa fa |
|---|---|---|---|---|---|
| `classe.nuovoAllievo` | Aggiungi al gruppo | `allievo` | Elenco | `senzaClasse` | apre `moduloAllievo(classe)` |
| `classe.incollaElenco` | Incolla elenco | `allievo` | Elenco | `senzaClasse` | apre `moduloImportaAllievi(classe)` |
| `classe.comunicazione` | Nuova comunicazione | `classi`, `allievo` | Famiglie | `senzaClasse` | apre `moduloComunicazione(classe)` |
| `classe.assenze` | Nuovo periodo assenze | `classi`, `allievo` | Famiglie | `senzaClasse` | apre `moduloBloccoAssenze(classe)` |

### 3.13 Docente di classe (`dove: docenteClasse`, filtrati per `schedaDocente`)

| id | scheda | titolo | gruppo | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|---|
| `docente.pendenze.tutte` | `todo` | Tutte le consegne | Che cosa si guarda | no | **sì** (`filtroTodoClasse === 'tutte'`) | — | `aggiorna({filtroTodoClasse:'tutte'})` |
| `docente.pendenze.mie` | `todo` | Consegne personali | Che cosa si guarda | no | **sì** (`filtroTodoClasse === 'mie'`) | — | `aggiorna({filtroTodoClasse:'mie'})` |
| `docente.pendenza` | `todo` | Nuova pendenza | Classe | sì | no | «Seleziona una classe di cui sei docente» / «Crea prima un corso per questa classe» | apre `moduloConsegna({corsoId, a:'docente'})` |
| `docente.documento` | `documenti` | Chiedi un documento | Classe | sì | no | come sopra | apre `moduloConsegna({corsoId, a:'classe', documento:true})` |
| `docente.caricaPdf` | `documenti` | Carica dei PDF | Classe | sì | no | «Seleziona una classe di cui sei docente» | `caricaPdf(classe)` → `smistamento.carica` |
| `docente.rileggiScansioni` | `documenti` | Rileggi le scansioni | Classe | no | no | classe mancante / «La lettura automatica delle scansioni è spenta» / «Non c'è nessun PDF da dividere» | `rileggiScansioni(classe)` → `smistamento.rileggiAttive` |
| `docente.personale` | `documenti` | Documento personale | Classe | no | no | classe/corso mancante | apre `moduloConsegna({corsoId, a:'docente', documento:true})` |
| `docente.assenze` | `assenze` | Nuovo periodo | Classe | sì | no | «Seleziona una classe di cui sei docente» | apre `moduloBloccoAssenze(classe)` |
| `docente.comunicazione` | `messaggistica` | Nuova comunicazione | Classe | sì | no | «Seleziona una classe di cui sei docente» | apre `moduloComunicazione(classe)` |
| `docente.recapito` | `messaggistica` | Nuovo recapito | Classe | no | no | «Seleziona una classe di cui sei docente» | apre `moduloRecapito(classe)` |
| `docente.elenco` | (tutte) | Elenco della classe | Gestione | no | no | «Seleziona una classe di cui sei docente» | `aggiorna({vista:'classi', classeId})` |

### 3.14 Lo schermo per la classe (`dove: app`/`schermo`)

| id | titolo | dove | gruppo | primario | interruttore | precondizione | che cosa fa |
|---|---|---|---|---|---|---|---|
| `proiezione.schermo` | «Proietta» / «Spegni lo schermo» | `app`, `schermo` | Lo schermo | sì | **sì** (`proiezione.aperta`) | — | `azione({tipo:'proiezione.apri'})` oppure `'proiezione.chiudi'` |
| `proiezione.pausa` | «Pausa» / «Riprendi» | `schermo` | Lo schermo | no | **sì** (`sospesa`) | `senzaSchermo` | `proiezione.impostazioni` con `sospesa` invertita |
| `proiezione.indietro` | Scheda precedente | `schermo` | Lo schermo | no | no | `senzaSchermo` ?? «C'è una scheda sola accesa…» | `proiezione.impostazioni` con `aperto: bloccoScorrendo(-1)` |
| `proiezione.avanti` | Scheda successiva | `schermo` | Lo schermo | no | no | `senzaSchermo` ?? «C'è una scheda sola accesa…» | `proiezione.impostazioni` con `aperto: bloccoScorrendo(+1)` |
| `proiezione.nomi` | «Nomi visibili» / «Senza nomi» | `schermo` | Come si vede | no | **sì** (`nomi`) | `senzaSchermo` | `proiezione.impostazioni` con `nomi` invertita |
| `proiezione.misure` | «Misure strette» / «Misure larghe» | `schermo` | Come si vede | no | **sì** (`!compatta`) | `senzaSchermo` | `proiezione.impostazioni` con `compatta` invertita |

### 3.15 Sullo schermo — i 7 blocchi (`dove: schermo`, da `BLOCCHI`)

Generati da `comandoDiBlocco(blocco)`. Tutti **interruttori**
(`bloccoAperto(proiettata()) === blocco`), tutti con `impedimento: senzaSchermo`,
gruppo «Sullo schermo». `apriBlocco()` accende e apre il blocco; ripremuto
sul blocco già aperto lo spegne. I blocchi «riservati» parlano delle singole
persone e partono spenti (`BLOCCHI_RISERVATI`).

| id | titolo | riservato |
|---|---|---|
| `proiezione.blocco.scaletta` | Scaletta | no |
| `proiezione.blocco.argomenti` | Argomenti | no |
| `proiezione.blocco.consegne` | Consegne | no |
| `proiezione.blocco.calendario` | Calendario | no |
| `proiezione.blocco.valutazioni` | Valutazioni | **sì** |
| `proiezione.blocco.documenti` | Documenti | **sì** |
| `proiezione.blocco.appello` | Appello | **sì** |

### 3.16 Calendario proiettato (`dove: schermo`, 4 varianti da `VISTE_CALENDARIO`)

Tutti **interruttori** (`(proiettata().calendario ?? 'agenda') === vista`),
gruppo «Calendario proiettato», impedimento `senzaSchermo` ?? «La scheda
Calendario non è quella aperta sullo schermo.». Azione: `proiezione.impostazioni`
con `calendario: vista`.

| id | titolo |
|---|---|
| `proiezione.calendario.settimana` | Settimana |
| `proiezione.calendario.mese` | Mese |
| `proiezione.calendario.anno` | Anno |
| `proiezione.calendario.agenda` | Agenda |

### 3.17 Documenti di — le 3 schede (`dove: documenti`, da `SCHEDE_DOCUMENTI`)

Tutti **interruttori** (`stato.schedaDocumenti === valore`), tutti con
`impedimento: senzaCorso`, gruppo «Documenti di», azione locale
`aggiorna({schedaDocumenti: valore})`.

| id | titolo | aiuto |
|---|---|---|
| `documenti.scheda.corso` | Corso | Presenze, valutazioni, verbali, prove, piani, fascicolo: i fogli di tutta la classe |
| `documenti.scheda.lezioni` | Lezioni | Un riquadro per ogni ora: il suo verbale, il suo piano, le prove di quel giorno |
| `documenti.scheda.allievi` | Persone (`Molti(PIF)`) | Una scheda per ogni persona in formazione: profitto, presenze, annotazioni |

### 3.18 Documenti — generare e combinare (`dove: documenti`)

| id | titolo | gruppo | primario | precondizione | che cosa fa |
|---|---|---|---|---|---|
| `documenti.aggiornaTutto` | Aggiorna tutto | Genera | sì | `senzaCorso` | `azione({tipo:'rapporto.completo', corsoId, semestreId})` |
| `documenti.combina` | «Combina i N scelti» / «Combina i documenti scelti» | Composizioni | sì con ≥ 2 spuntati | `senzaCorso` ?? «Spunta almeno due documenti nelle righe…» | apre `moduloComposizione(sceltiInOrdine())` |
| `documenti.svuotaScelta` | Togli le spunte | Composizioni | no | «Non c'è nessun documento spuntato.» | `aggiorna({documentiScelti: []})` — locale |

### 3.19 Chi li rifà (`dove: documenti`, 3 varianti da `MODI_PDF`)

Tutti **interruttori** (`registro.impostazioni.pdfAutomatici === valore`),
gruppo «Chi li rifà», nessuna precondizione. Azione:
`azione({tipo:'impostazioni.salva', impostazioni:{…, pdfAutomatici: valore}})`.
È l'unico comando della barra che scrive un'**impostazione di documento**.

| id | titolo | spiegazione |
|---|---|---|
| `documenti.rifare.mai` | Solo a mano | I documenti si rifanno con i pulsanti di questa pagina |
| `documenti.rifare.chiusura` | Quando si chiude un'ora | Segnando un'ora come svolta si rifanno verbale e documenti del corso |
| `documenti.rifare.sempre` | A ogni modifica | Come sopra, più a ogni cambiamento che tocca un corso, poco dopo che si è smesso di scrivere |

### 3.20 Modelli (`dove: modelli`)

| id | titolo | gruppo | primario | precondizione | che cosa fa |
|---|---|---|---|---|---|
| `modelli.salva` | Salva il modello | Modello | sì quando `modelloDaSalvare()` | «Non c'è niente da salvare: il file è già com'è scritto qui.» | `salvaModello()` → `modello.salva` |
| `modelli.prova` | Prova | Modello | no | «Non c'è nessun modello aperto.» / ««X» non compone un PDF: non c'è niente da guardare.» | `provaAperto()` → `chiedi('modelli.prova')` — una **domanda**, non un'azione (§6.17) |
| `modelli.ricarica` | Rileggi dal disco | Modello | no | «Non c'è nessun modello aperto.» | `ricaricaAperto()` → `chiedi('modelli.leggi')` — una **domanda** |
| `modelli.ripristina` | Rimetti quello di serie | Modello | no | nessun modello aperto / «non è di serie» / «è già quello di serie» | `ripristinaAperto()` → `modello.ripristina` |
| `modelli.immagine` | Porta un'immagine | Cartella | no | — | `portaImmagine()` → `modello.immagine` |
| `modelli.cartella` | Apri la cartella | Cartella | no | — | `apriCartellaModelli()` → `rapporto.modelli` |

### 3.21 Posta (`dove: app`, `gruppo: Posta`)

| id | titolo | precondizione | che cosa fa |
|---|---|---|---|
| `file.collegaPosta` | Collega la posta | — | `azione({tipo:'posta.collega'})` |
| `file.provaPosta` | Prova la posta | `senzaPosta` | `azione({tipo:'posta.prova'})` |
| `file.provaInvioPosta` | Manda una mail di prova | `senzaPosta` | `azione({tipo:'posta.invioProva'})` |
| `file.scollegaPosta` | Scollega la posta | `senzaPosta` | `azione({tipo:'posta.scollega'})` |

### 3.22 La finestra (`dove: app`, `gruppo: La finestra`)

Quel che stava nella barra dei menu di sistema e da lì è sparito: da quando il
registro si disegna la barra del titolo da sé, su Windows e Linux la barra dei
menu non si vede più (`autoHideMenuBar`, in `environment/windows.ts`). Gli
acceleratori continuano a farli partire il menu dell'applicazione, che resta
installato: sono tutti `dalMenu`, e `installaScorciatoie` li salta.

| id | titolo | scorciatoia | che cosa fa |
|---|---|---|---|
| `finestra.ingrandisci` | Ingrandisci | `Ctrl+Plus` (`dalMenu`) | `azione({tipo:'finestra.zoom', verso:'avanti'})` |
| `finestra.riduci` | Riduci | `Ctrl+-` (`dalMenu`) | `azione({tipo:'finestra.zoom', verso:'indietro'})` |
| `finestra.dimensioneNormale` | Dimensione normale | `Ctrl+0` (`dalMenu`) | `azione({tipo:'finestra.zoom', verso:'azzera'})` |
| `finestra.schermoIntero` | Schermo intero | `F11` (`dalMenu`) | `azione({tipo:'finestra.schermoIntero'})` — la finestra di chi insegna, non lo schermo per la classe |
| `finestra.esci` | Esci | — | `azione({tipo:'programma.esci'})` |

### 3.23 Riepilogo: quanti e di che tipo

| Categoria | Quanti | Quali |
|---|---|---|
| Comandi totali in `COMANDI_UI` | **94** | 65 letterali + 29 generati |
| Interruttori (dichiarano `acceso()`) | **35** | `impostazioni.programma`, `impostazioni.registro`, `proiezione.schermo`, `proiezione.pausa`, `proiezione.nomi`, `proiezione.misure` (6 letterali) + i 4 `calendario.*`, i 3 `todo.*`, i 3 `lezione.stato.*`, i 2 `docente.pendenze.*`, i 7 `proiezione.blocco.*`, i 4 `proiezione.calendario.*`, i 3 `documenti.scheda.*`, i 3 `documenti.rifare.*` (29 generati) |
| Primari (sempre o a condizione) | **17** | `file.apri`, `file.nuovoAnno`, `registro.oggi`, `registro.nuovaLezione`, `registro.nuovaConsegna`, `piano.vaiAlRegistro`, `mappa.geocodifica`, `docente.pendenza`, `docente.documento`, `docente.caricaPdf`, `docente.assenze`, `docente.comunicazione`, `proiezione.schermo`, `documenti.aggiornaTutto`, `documenti.combina`, `modelli.salva`, `lezione.stato.svolta` |
| Dichiarati `primario: false` esplicito | 3 | `docente.rileggiScansioni`, `docente.personale`, `docente.recapito` |
| Con scorciatoia | **8** | `file.apri` (`Ctrl+O`), `file.salva` (`Ctrl+S`), `registro.oggi` (`Ctrl+Alt+T`), `registro.nuovaLezione` (`Ctrl+Alt+N`), `finestra.ingrandisci` (`Ctrl+Plus`), `finestra.riduci` (`Ctrl+-`), `finestra.dimensioneNormale` (`Ctrl+0`), `finestra.schermoIntero` (`F11`) |
| Con `dalMenu: true` — l'acceleratore lo gestisce Electron, `installaScorciatoie` li salta per non farli scattare due volte | **7** | `file.apri`, `registro.oggi`, `registro.nuovaLezione`, e i quattro della finestra |
| Con `impedimento()` | **57** | 40 letterali + i 3 `lezione.stato.*`, i 7 `proiezione.blocco.*`, i 4 `proiezione.calendario.*`, i 3 `documenti.scheda.*` |
| Che aprono una finestra di `moduli/` | **22** | `file.nuovoAnno`, `file.modificaAnno`, `file.pause`, `registro.nuovaLezione`, `registro.nuovaConsegna`, `registro.nuovoCorso`, `registro.nuovaClasse`, `registro.avvio`, `lezione.modifica`, `piano.elimina` (solo `chiediEliminazione`), `corso.nuovaOra`, `classe.nuovoAllievo`, `classe.incollaElenco`, `classe.comunicazione`, `classe.assenze`, `docente.pendenza`, `docente.documento`, `docente.personale`, `docente.assenze`, `docente.comunicazione`, `docente.recapito`, `documenti.combina` |
| Puramente locali — nessuna `Azione`, né diretta né indiretta | **22** | `impostazioni.programma`, `impostazioni.registro`, `registro.oggi`, `calendario.indietro`, `calendario.avanti`, `registro.oraDaCompilare`, `piano.vaiAlRegistro`, `mappa.inquadra`, `docente.elenco`, `documenti.svuotaScelta`, i 4 `calendario.*`, i 3 `todo.*`, i 2 `docente.pendenze.*`, i 3 `documenti.scheda.*` |
| Con conferma modale prima di agire | **4** | `lezione.stato.annullata`, `piano.elimina`, `mappa.rifai`, e ogni comando che passa da `chiediEliminazione` |

---

## 4. Comandi del programma

Fonte: [`src/manifest.ts`](../src/manifest.ts), `COMANDI: readonly Comando[]`
— **21 voci**, nell'ordine in cui sono nate. Ognuna è
`{id, titolo, scorciatoia?}`.

**Chi li registra**: [`src/startup.ts`](../src/startup.ts) `avvia()`, passo 15: uno
per uno con `apparato.comandi.registra` (l'apparato:
[`src/environment/commands.ts`](../src/environment/commands.ts) li tiene in una mappa
interna). Tre comandi aggiuntivi li registra il guscio in
[`shell/main.ts`](../shell/main.ts) — `registroDocenti.esci`,
`registroDocenti.chiudiDocumento`, `registroDocenti.mostraDocumento` — e due
[`shell/windows/menu.ts`](../shell/windows/menu.ts) — `registroDocenti.apriDocumento`,
`workbench.action.openSettings`: **non stanno nel manifesto** perché non sono
voci di menu dichiarate, ma servizi che il menu invoca.

**Dove compaiono**: il menu nativo li dispone secondo `GRUPPI` in
[`shell/windows/menu.ts`](../shell/windows/menu.ts), non secondo l'ordine di questo array; un
comando aggiunto qui e non nominato là finisce sotto «Altro», mai perso. Il
vassoio ([`src/tray.ts`](../src/tray.ts)) ne espone un
sottoinsieme insieme ai corsi dell'anno; l'agenda e i promemoria chiamano
`apriRegistro()` e le sue navigazioni.

| # | id | titolo | scorciatoia | dove compare |
|---|---|---|---|---|
| 1 | `registroDocenti.apri` | Mostra il registro | `CommandOrControl+Alt+R` | menu nativo, vassoio (clic sull'icona), promemoria di lezione |
| 2 | `registroDocenti.guida` | Guida | — | menu nativo |
| 3 | `registroDocenti.impostazioni` | Impostazioni | `CommandOrControl+,` | menu nativo; finestra Impostazioni («Apri nel registro») |
| 4 | `registroDocenti.proietta` | Proietta per la classe | — | menu nativo |
| 5 | `registroDocenti.agenda` | Agenda sul desktop | `CommandOrControl+Alt+A` | menu nativo, vassoio |
| 6 | `registroDocenti.oggi` | Oggi | `CommandOrControl+Alt+T` | menu nativo, vassoio, agenda |
| 7 | `registroDocenti.nuovaLezione` | Nuova lezione | `CommandOrControl+Alt+N` | menu nativo |
| 8 | `registroDocenti.nuovaClasse` | Nuova classe | — | menu nativo |
| 9 | `registroDocenti.nuovoCorso` | Nuovo corso (una materia a una classe) | — | menu nativo |
| 10 | `registroDocenti.avvio` | Avvio guidato | — | menu nativo |
| 11 | `registroDocenti.nuovoPiano` | Nuovo piano lezione | — | menu nativo |
| 12 | `registroDocenti.nuovaValutazione` | Nuovo momento di valutazione | — | menu nativo |
| 13 | `registroDocenti.nuovoAnno` | Nuovo anno scolastico | — | menu nativo (chiede le date con un `QuickPick`, poi `esegui(archivio, {tipo:'anno.crea'})`) |
| 14 | `registroDocenti.ricarica` | Ricarica i dati | — | menu nativo |
| 15 | `registroDocenti.chiudiDocumento` | Chiudi l'anno | — | menu nativo (l'implementazione vera è in `shell/main.ts`) |
| 16 | `registroDocenti.provaPosta` | Prova il collegamento della posta | — | menu nativo |
| 17 | `registroDocenti.provaInvioPosta` | Manda una mail di prova | — | menu nativo |
| 18 | `registroDocenti.collegaPosta` | Collega la casella di posta | — | menu nativo |
| 19 | `registroDocenti.scollegaPosta` | Scollega la casella di posta | — | menu nativo |
| 20 | `registroDocenti.azzeraPosta` | Azzera la posta (portachiavi, memoria, impostazioni) | — | menu nativo |
| 21 | `registroDocenti.apriCartellaDati` | Apri la cartella dei dati | — | menu nativo |

Comandi registrati **fuori** dal manifesto (esistono nel codice, non nell'elenco
dichiarato):

| id | registrato in | che cosa fa |
|---|---|---|
| `registroDocenti.esci` | `shell/main.ts` | `app.quit()` — è la voce «Esci dal registro» del vassoio |
| `registroDocenti.mostraDocumento` | `shell/main.ts` | apre un PDF nel lettore interno (`shell/windows/reader.ts`); la chiama `esportazione.mostra` |
| `registroDocenti.apriDocumento` | `shell/windows/menu.ts` | apre un documento d'anno; la chiama `documento.apri` |
| `workbench.action.openSettings` | `shell/windows/menu.ts` | apre la finestra Impostazioni; la chiama `smistamento.impostazioni` |

`registroDocenti.chiudiDocumento` è **sia** nel manifesto **sia** registrato in
`shell/main.ts`: il manifesto ne dichiara la voce di menu, il guscio ne
fornisce l'implementazione.

---

## 5. Impostazioni

Ci sono **due ambiti**, e non si toccano mai.

| | Impostazioni **macchina** | Impostazioni **documento** |
|---|---|---|
| Dove sono dichiarate | [`src/manifest.ts`](../src/manifest.ts) — `IMPOSTAZIONI` | [`src/domain/models.ts`](../src/domain/models.ts) — `interface Impostazioni` |
| Dove sono scritte | file JSON sotto `userData` (shim di `workspace.getConfiguration().update(…, ConfigurationTarget.Global)`) | dentro il documento `<anno>.registro`, collezione `registro` |
| Viaggiano col file? | **no** — restano su questo computer | **sì** — seguono il documento su un'altra macchina |
| Chi le scrive dal protocollo | `programma.salva` / `programma.azzera` | `impostazioni.salva` |
| Chi le legge nel webview | `MessaggioStato.programma: VoceProgramma[]` | `MessaggioStato.registro.impostazioni` |
| Predefiniti | `predefinitiImpostazioni()` in `manifest.ts` | `IMPOSTAZIONI_PREDEFINITE` in [`src/domain/factories.ts`](../src/domain/factories.ts) |
| Dove si vedono | pagina Impostazioni, ambito «Programma»; finestra Impostazioni nativa (`shell/pages/settings/settings.html`) quando non c'è un anno aperto | pagina Impostazioni, ambito «Registro» |

**Perché esiste la distinzione.** Il tema, l'agenda sul desktop, l'avvio con
Windows e la casella di posta parlano di *questo computer*: portare il
documento su un altro portatile non deve portarsi dietro la posizione del
widget né l'indirizzo Exchange. La scala dei voti, le vacanze e la soglia di
assenza parlano invece del *registro*: due macchine che aprono lo stesso anno
devono vedere la stessa scala, altrimenti gli stessi voti significano cose
diverse. Il protocollo rispecchia la dualità con due azioni separate, e la
pagina Impostazioni le tiene su due schede distinte proprio per non farle
confondere.

Il webview non può leggere da sé le impostazioni macchina (vive in una
sandbox): arrivano con lo stato, già risolte, dentro `MessaggioStato.programma`,
dove ogni voce porta anche `scritta: boolean` — la differenza fra «vale il
predefinito» e «l'ho deciso io», che è ciò che permette di offrire «Torna al
predefinito» solo dove c'è qualcosa da ritirare. Ogni valore che rientra da
`programma.salva` ripassa comunque dalla dogana
`valoreAccettabile(chiave, valore)` in
[`src/environment/settings.ts`](../src/environment/settings.ts).

### 5.1 (a) Impostazioni MACCHINA — le 26 voci di `IMPOSTAZIONI`

| # | chiave puntata | tipo | predefinito | scelte | che cosa regola | dove si vede |
|---|---|---|---|---|---|---|
| 1 | `registroDocenti.aperturaAutomatica` | `boolean` | `true` | — | Apre il registro all'avvio dell'applicazione quando la cartella dei dati esiste; spento, l'app parte senza finestre | Impostazioni → Programma, sezione «file»/avvio; letta da `avvio.ts` passo 18 |
| 2 | `registroDocenti.vassoio.attivo` | `boolean` | `true` | — | Tiene l'icona accanto all'orologio, col menu dei corsi dell'anno e l'uscita. Ha effetto al prossimo avvio | Impostazioni → Programma, sezione «desktop»; `src/tray.ts` |
| 3 | `registroDocenti.vassoio.chiusuraNelVassoio` | `boolean` | `true` | — | Chiudendo l'ultima finestra il registro resta acceso nel vassoio invece di uscire. Senza icona non ha effetto | Impostazioni → Programma, sezione «desktop» |
| 4 | `registroDocenti.agenda.attiva` | `boolean` | `false` | — | Tiene la settimana appesa al bordo destro del desktop. Solo su Windows | Impostazioni → Programma, sezione «desktop»; comando `registroDocenti.agenda` |
| 5 | `registroDocenti.agenda.scheda` | `string` | `'calendario'` | `calendario`, `pendenze`, `lezione` | Con quale delle tre schede l'agenda si riapre. La scrive la linguetta premuta nel widget | scritta dal widget agenda (`ComandoAgenda {tipo:'scheda'}`) |
| 6 | `registroDocenti.agenda.ancorata` | `boolean` | `false` | — | Incolla l'agenda al bordo destro come una barra di sistema; spenta, è un riquadro libero | Impostazioni → Programma, sezione «desktop» |
| 7 | `registroDocenti.agenda.celle` | `number` | `3` | — | Larghezza della striscia, in colonne di icone del desktop | scritta dal trascinamento del bordo (`ComandoAgenda {tipo:'larghezza'}`) |
| 8 | `registroDocenti.agenda.celleAltezza` | `number` | `0` | — | Altezza della striscia, in righe di icone; zero = alta quanto lo schermo | scritta dal trascinamento (`ComandoAgenda {tipo:'altezza'}`) |
| 9 | `registroDocenti.agenda.colonna` | `number` | `-1` | — | Posizione orizzontale dell'agenda libera, in colonne di icone; −1 = mai spostata | scritta dal trascinamento (`ComandoAgenda {tipo:'sposta'}`) |
| 10 | `registroDocenti.agenda.riga` | `number` | `-1` | — | Posizione verticale dell'agenda libera, in righe di icone; −1 = mai spostata | scritta dal trascinamento |
| 11 | `registroDocenti.avvio.conWindows` | `boolean` | `false` | — | Accende il registro insieme al computer, senza finestre. Solo per l'applicazione installata | Impostazioni → Programma, sezione «avvio» |
| 12 | `registroDocenti.avvio.soloVassoio` | `boolean` | `false` | — | Parte senza aprire il registro anche lanciandolo a mano; se non c'è né icona né agenda la finestra si apre lo stesso | Impostazioni → Programma, sezione «avvio» |
| 13 | `registroDocenti.aspetto.tema` | `string` | `'sistema'` | `sistema`, `chiaro`, `scuro` | Chiaro o scuro per registro, schermo della classe e finestre native | Impostazioni → Programma, sezione «aspetto»; applicata da `src/environment/theme.ts` via `nativeTheme.themeSource` |
| 14 | `registroDocenti.promemoria.attivo` | `boolean` | `true` | — | Notifica di sistema poco prima che una lezione cominci; premendola si apre il registro su quell'ora | Impostazioni → Programma, sezione «avvisi» |
| 15 | `registroDocenti.promemoria.anticipoMinuti` | `number` | `5` | — | Quanti minuti prima dell'inizio arriva l'avviso; zero = all'ora esatta | Impostazioni → Programma, sezione «avvisi» |
| 16 | `registroDocenti.proiezione.schermoIntero` | `boolean` | `false` | — | Mette la finestra della proiezione a schermo intero appena aperta | Impostazioni → Programma, sezione «aspetto» |
| 17 | `registroDocenti.posta.mittente` | `string` (`formato: 'email'`) | `''` | — | L'indirizzo che le famiglie vedono in «Da». Vuoto = lo stesso del nome d'accesso | Impostazioni → Programma, sezione «posta»; scheda Posta (`stato.posta.mittente`) |
| 18 | `registroDocenti.posta.utente` | `string` | `''` | — | Il nome con cui il registro entra nella casella (la sigla del tenant). Vuoto = lo stesso del mittente | Impostazioni → Programma, sezione «posta»; `stato.posta.accesso` |
| 19 | `registroDocenti.posta.invioDiretto` | `boolean` | `false` | — | Spedisce da sé invece di preparare una bozza. Vuole la casella collegata; prima di ogni giro chiede conferma | Impostazioni → Programma, sezione «posta»; `stato.posta.invioDiretto` |
| 20 | `registroDocenti.recapiti.telefono` | `string` | `'tel'` | `tel`, `callto`, `skype`, `msteams`, `nessuno` | Con che cosa si compone un numero premuto nell'anagrafica | Impostazioni → Programma, sezione «recapiti»; usata da `sistema.chiama` |
| 21 | `registroDocenti.recapiti.posta` | `string` | `'sistema'` | `sistema`, `outlook`, `outlookWeb`, `nessuno` | Con che cosa si apre una mail nuova premendo un indirizzo | Impostazioni → Programma, sezione «recapiti»; usata da `sistema.scrivi` |
| 22 | `registroDocenti.recapiti.outlook` | `string` | `''` | — | Percorso di `OUTLOOK.EXE` quando il registro non lo trova da sé. Serve solo con `recapiti.posta = outlook` | Impostazioni → Programma, sezione «recapiti» |
| 23 | `registroDocenti.modelli.cartella` | `string` | `''` | — | Dove stanno i file `.gguf`. Vuoto = accanto alle impostazioni del programma; si riempie per tenerli su un altro disco o per usare quelli che si hanno già | Impostazioni → Programma; pagina «Modelli linguistici», letta da `data/gguf.ts` |
| 24 | `registroDocenti.ocr.attivo` | `boolean` | `false` | — | Legge con un modello locale le pagine dei PDF che non contengono testo. Vuole un modello che sappia guardare e il programma `llama-mtmd-cli` | Impostazioni → Programma, sezione «lettura»; spinta al webview come `MessaggioStato.ocrAttivo` |
| 25 | `registroDocenti.ocr.modello` | `string` | `''` | — | Il file `.gguf` con cui si leggono le scansioni. **Un nome di file**, risolto dentro la cartella dei modelli: un percorso messo a mano non passa | pagina «Modelli linguistici»; scritta dall'azione `llm.scegli` |
| 26 | `registroDocenti.ocr.proiettore` | `string` | `''` | — | Il secondo file del modello che guarda — quello con `mmproj` nel nome. Senza, il programma parte, ignora la pagina e risponde immaginando | pagina «Modelli linguistici»; `llm.scegli` |
| 27 | `registroDocenti.ocr.programma` | `string` | `''` | — | Percorso di `llama-mtmd-cli.exe`. Dev'essere un `.exe`, non uno script: la guardia sta in `data/mtmd.ts` | Impostazioni → Programma, sezione «lettura» |
| 28 | `registroDocenti.ocr.attesaMassimaSecondi` | `number` | `180` | — | Quanti secondi aspettare la lettura di una pagina prima di rinunciare | Impostazioni → Programma, sezione «lettura» |
| 29 | `registroDocenti.assistente.attivo` | `boolean` | `false` | — | Accende la pagina «Assistente»: un modello che gira sulla macchina risponde leggendo il registro, e può **soltanto leggere** | Impostazioni → Programma, sezione «assistente» |
| 30 | `registroDocenti.assistente.modello` | `string` | `''` | — | Il file `.gguf` con cui risponde l'assistente: deve saper chiamare gli strumenti. Stessa guardia dell'OCR | pagina «Modelli linguistici»; `llm.scegli` |
| 31 | `registroDocenti.assistente.attesaMassimaSecondi` | `number` | `120` | — | Quanti secondi aspettare un giro di risposta prima di rinunciare | Impostazioni → Programma, sezione «assistente» |

Altre costanti esportate dal manifesto: `TITOLO_IMPOSTAZIONI = 'Registro docenti'`
(il titolo della finestra nativa) e `predefinitiImpostazioni()` (mappa
chiave → predefinito, quel che lo shim restituisce quando in `userData` non c'è
scritto niente).

Esistono altre chiavi lette dal codice ma **non dichiarate nel manifesto**,
perché non sono opzioni ma memoria di stato:
`registroDocenti.ultimoDocumento` e `registroDocenti.cartellaLavoro`
(scritte da `shell/main.ts` in `preparaDocumento`).

### 5.2 (b) Impostazioni DOCUMENTO — `Registro.impostazioni`

Predefiniti da `IMPOSTAZIONI_PREDEFINITE` in
[`src/domain/factories.ts`](../src/domain/factories.ts). Scritte con
`impostazioni.salva`, che le fa passare da `normalizzaImpostazioni`.

| # | campo | tipo | predefinito | effetto |
|---|---|---|---|---|
| 1 | `scala` | `Scala` = `{min, max, sufficienza, passo}` | `SCALA_PREDEFINITA` = `{min: 1, max: 6, sufficienza: 4, passo: 0.25}` (scala ticinese) | Il campo di validità di ogni voto: `voto.imposta` rifiuta fuori scala (`votoValido`) e arrotonda al passo (`arrotondaVoto`). Governa anche il colore di ogni cella e la soglia di sufficienza nei rapporti |
| 2 | `passoFineSemestre` | `number` | `0.5` | Il passo con cui si arrotonda la nota di fine semestre, diverso da quello dei voti durante l'anno. Zero = non arrotondare, la nota resta la media com'è |
| 3 | `sogliaAssenza` | `number` | `20` | Percentuale in cifra tonda oltre la quale una persona va segnalata. Zero spegne la segnalazione |
| 4 | `oraInizioGiornata` | `Ora` (`'HH:MM'`) | `'07:30'` | Dove comincia la griglia del calendario a settimana |
| 5 | `oraFineGiornata` | `Ora` | `'18:00'` | Dove finisce la griglia del calendario a settimana |
| 6 | `giorniVisibili` | `number[]` (1 = lunedì … 7 = domenica) | `[1, 2, 3, 4, 5]` | Quali colonne disegna il calendario e su quali giorni `orario.genera` mette le lezioni |
| 7 | `durataSlotPredefinita` | `number` (minuti) | `MINUTI_UD` = `45` | La durata proposta a una fascia nuova nel modulo Lezione |
| 8 | `durataPausaPredefinita` | `number` (minuti) | `15` | La durata proposta a una pausa fra due fasce |
| 9 | `pdfAutomatici` | `QuandoRifarePdf` = `'mai' \| 'chiusura' \| 'sempre'` | `'sempre'` | Quando il registro rifà da sé i PDF di un corso. `chiusura` = quando un'ora è segnata svolta; `sempre` = anche a ogni modifica che tocca il corso, con il debounce di `programmaRigenerazione` (8 s dall'ultima modifica, tetto 60 s dalla prima); `mai` = solo coi pulsanti. Si cambia dai tre comandi `documenti.rifare.*` |
| 10 | `liste` | `Record<string, VoceLista[]>` (facoltativo) | `{}` | Le voci dei menu a tendina, **solo dove qualcuno le ha cambiate**: una chiave che manca vuol dire «la lista di fabbrica», non «nessuna voce». Le liste riconosciute stanno in [`src/domain/lists.ts`](../src/domain/lists.ts); quel che non è una lista riconosciuta non si salva |

Nove campi obbligatori più `liste` facoltativo. Il resto di ciò che si regola
«nel registro» — semestri, vacanze, settimane A/B, materie — non sta qui: sta
nell'`AnnoScolastico` e nelle collezioni `materie`/`classi`, e si tocca con
`anno.salva`, `anno.settimana`, `materia.salva`.

---

## 6. Azioni del protocollo

È la tabella più importante del documento: **tutte e 141 le varianti** di
`type Azione` in [`src/protocol.ts`](../src/protocol.ts), organizzate per i
**15 file di gestori** in [`src/actions/`](../src/actions/). L'indice che li somma
è [`src/actions.ts`](../src/actions.ts), che costruisce `GESTORI: Mappa`: il
compilatore non lascia passare un'azione senza gestore, né un gestore senza
azione.

**Erano 143.** `modello.leggi` e `modello.prova` sono state ritirate dal
protocollo, e non perché non servissero più: perché non erano scritture. Non
toccavano il registro, non toccavano il disco — `modello.prova` componeva un
PDF *in memoria* — e chiedevano di tornare indietro con un dato. Per portarlo
si erano aperti tre campi facoltativi nella busta di **ogni** `Risposta`:
`testo`, `nomi`, `pdf`. Tre campi che un salvataggio di voto, una spunta e una
riga d'appello si portavano dietro vuoti, per servire due chiamate su
centoquarantatré. Adesso il protocollo ha un canale per le domande, quelle due
sono le procedure di lettura `modelli.leggi` e `modelli.prova` (§6.17), e i tre
campi sono spariti da `Risposta` e da `EsitoAzione` (§7.1).

**Ogni azione, adesso, ha una procedura davanti.** Le 141 procedure di
scrittura di [`src/api/procedures/`](../src/api/procedures/) dichiarano
`azione: '…'` e prendono il posto di quel gestore in `GESTORI` — il lavoro
resta nel gestore, davanti ci sono la forma dell'ingresso convalidata a
runtime, un codice d'errore e una riga di giornale. La colonna **procedura**
della tabella dice quale.

### 6.0 Come leggere le colonne

**effetto**

| segno | significato |
|---|---|
| **R** | tocca il `Registro` in memoria (e quindi fa rispingere lo stato) |
| **F** | tocca il filesystem: scrive/cestina file nel documento, apre dialoghi di sistema, apre file col programma predefinito |
| **P** | esce sulla rete: posta (Exchange/`.eml`), geocodifica, OCR |
| **∅** | nessun effetto oltre la risposta — il gestore ritorna `invariato` e il `Registro` non viene rispinto |

**collezioni riscritte** — i nomi letterali che il gestore dichiara a
`contesto.modifica(op, collezioni)` o che `suVoce(collezione, …)` deduce da sé.
È il write-behind selettivo: un voto non fa riscrivere le classi. Le collezioni
note a `suVoce` sono `lezioni`, `piani`, `valutazioni`, `consegne`, `classi`,
`corsi`, `smistamenti`, `anni`, `materie` (le ultime due si riscrivono come
collezione `registro`). `nelFascicolo()` scrive sempre su `fascicoli`.
Le eliminazioni a cascata non dichiarano collezioni fisse: le decide il piano di
`eliminazione(registro, bersaglio)` in
[`src/domain/deletions.ts`](../src/domain/deletions.ts).

**idempotente** — rieseguire la stessa richiesta con lo stesso payload lascia il
sistema nello stesso stato? «parziale» vuol dire che il secondo giro non
rompe niente ma non è un no-op (un timbro `aggiornatoIl` cambia, oppure il
secondo tentativo viene rifiutato con un messaggio leggibile).

**procedura** — il nome della procedura di
[`src/api/procedures/`](../src/api/procedures/) che prende in carico quell'azione.
È l'informazione che serve davvero: dice **dove sta dichiarata la forma
dell'ingresso** e come si chiama quella stessa operazione per chi la invoca da
fuori dal pannello — dalla riga di comando, dal widget dell'agenda, da un
condotto. Il nome della procedura non è il nome dell'azione: le azioni sono
cresciute una alla volta, le procedure sono state rinominate per area
(`presenze.riga` → `ore.appello.riga`, `allievi.importa` →
`persone.importa`), e questa colonna è l'unico posto in cui le due
nomenclature stanno accanto.

Dove la cella porta un «+ `validaAnno`» o simile, il gestore chiama **anche** una funzione
di dominio di
[`src/domain/validation.ts`](../src/domain/validation.ts): lo schema della
procedura dice che l'oggetto è arrivato intero, il validatore di dominio dice
se sta in piedi come entità della scuola. Sono due controlli diversi, e per le
entità intere lo schema non li riscrive — `entita()` in
[`src/api/schemas.ts`](../src/api/schemas.ts) passa la palla al validatore del
dominio invece di ridire le sue regole in un'altra forma. L'elenco completo
delle 18 azioni con un `valida*` dietro è nel riepilogo del §6.16.

*Questa colonna prima diceva «validazione runtime», e serviva a distinguere i
gestori difesi da quelli che si fidavano del tipo TypeScript. Non serve più:
adesso sono difesi tutti, e 141 «sì» identici non sono un'informazione.*

**Helper comuni a tutti i gestori** (da
[`src/actions/context.ts`](../src/actions/context.ts)): `fatto` = `{ok:true}`;
`invariato` = `{ok:true, invariato:true}`; `rifiuta(...errori)`;
`conMessaggio(testo, livello?, resto?)`; `riassumiInvii(...)`;
`riponi(elenco, voce, ordina?)` (upsert per id); `apriFile`, `cestina`,
`scegliFile`, `scegliUnFile`; `consegnaConClasse`; `tipoMime`.

### 6.1 `src/actions/register.ts` — anno, materia, corso, orario, classe, persone (20 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `stato.leggi` | — | F | — | sì | `stato.leggi` | Primo messaggio del webview: segnala «sono pronto» e sblocca `navigazioneInAttesa`. Rilegge l'inventario di `templates/` |
| `stato.ricarica` | — | F | — | sì | `stato.ricarica` | `archivio.carica()` + `aggiornaInventarioModelli()` |
| `anno.crea` | `inizio: Iso`, `fine: Iso`, `etichetta?: string`, `confine?: Iso`, `sospensioni?: Sospensione[]`, `etichetteSemestri?: [string, string]` | R, F | — (crea un **documento nuovo**, non passa da `modifica`) | no — ogni giro crea un documento | `anni.crea` + `validaAnno` | Apre `showSaveDialog`; annullato ⇒ `invariato`, non errore |
| `anno.salva` | `anno: AnnoScolastico` | R, F | `registro` (solo se è l'anno aperto) | sì — upsert per id | `anni.salva` + `validaAnno` | Un anno che non è quello aperto va scritto direttamente sul suo file con `archivio.salvaAnno` |
| `anno.settimana` | `annoId: string`, `giorno: Iso`, `lettera: LetteraSettimana \| null` | R, F | `registro` | sì | `anni.settimana` | Azione a sé per non rimandare semestri e sospensioni da una copia client stantia |
| `materia.salva` | `materia: Materia` | R | `registro` | sì — `riponi` per id | `materie.salva` + `validaMateria` | Bypassa `contesto.modifica` (chiama `archivio.modifica` diretto); **ritorna sempre `creato`**, anche in aggiornamento |
| `materia.elimina` | `materiaId: string` | R, F | decise dal piano di eliminazione | parziale — poi rifiuta «già sparita» | `materie.elimina` | I corsi spariscono con lei, i piani restano riagganciabili |
| `materia.unisci` | `daId: string`, `aId: string` | R | `registro`, `corsi`, `lezioni`, `piani`, `valutazioni`, `consegne` | no — la seconda volta la materia non c'è più | `materie.unisci` | Fonde i corsi gemelli e rifà i titoli; unica scrittura su sei collezioni insieme |
| `corso.crea` | `classeId: string`, `materiaId: string`, `titolo?: string` | R | `corsi` | **sì per progetto** — stessa coppia classe+materia torna l'id esistente | `corsi.crea` | Riordina i corsi per titolo |
| `corso.salva` | `corso: Corso` | R | `corsi` | sì — `riponi` per id | `corsi.salva` + `validaCorso` | `aggiornatoIl` lo timbra l'host; `creato` solo se nuovo |
| `corso.elimina` | `corsoId: string` | R, F | decise dal piano | parziale | `corsi.elimina` | — |
| `orario.imposta` | `corsoId: string`, `orario: Ricorrenza[]` | R | `corsi` | sì | `orario.imposta` + `validaCorso` | Sostituzione per indice, non `riponi` |
| `orario.genera` | `corsoId: string`, `dal: Iso`, `al: Iso` | R | `lezioni` | **sì per progetto** — quel che c'è già non si tocca | `orario.genera` | Riepilogo con `saltate` e `conflitti`; avviso se ci sono conflitti |
| `classe.salva` | `classe: Classe` | R | `classi` | sì — `riponi` per id | `classi.salva` + `validaClasse` | Timbra `aggiornataIl`; `creato` solo se nuova |
| `classe.elimina` | `classeId: string` | R, F | decise dal piano | parziale | `classi.elimina` | Porta via corsi, ore, voti e fascicolo |
| `allievo.elimina` | `classeId: string`, `allievoId: string` | R, F | decise dal piano | parziale | `persone.elimina` | Presenze, voti e osservazioni se ne vanno con lui |
| `allievo.foto.imposta` | `classeId: string`, `allievoId: string` | R, F | `classi` | no — ricopia il file a ogni giro | `persone.foto.imposta` | Dialogo annullato ⇒ `fatto`; scrive lo stato **poi** cestina la vecchia foto |
| `allievo.foto.togli` | `classeId: string`, `allievoId: string` | R, F | `classi` | sì — senza foto risponde subito `fatto` | `persone.foto.togli` | Cestina il file dopo la scrittura |
| `classe.duplica` | `classeId: string`, `annoId: string`, `nome: string` | R | `classi`, `corsi` | no — id nuovi a ogni duplicazione | `classi.duplica` + `validaClasse` | Ogni allievo riceve un id nuovo; **non** copia lezioni, valutazioni, fascicolo, consegne |
| `allievi.importa` | `classeId: string`, `testo: string` | R | `classi` | sì — gli omonimi si saltano | `persone.importa` | Dedup su cognome+nome in minuscolo; **nessun messaggio di riepilogo** (a differenza di `assenze.importa`) |

### 6.2 `src/actions/hours.ts` — lezione, appello, osservazioni (14 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `lezione.salva` | `lezione: Lezione` | R | `lezioni` | sì — `riponi` per id | `ore.salva` + `validaLezione` | Timbra `aggiornataIl`, riordina per data |
| `lezione.elimina` | `lezioneId: string` | R, F | decise dal piano | parziale | `ore.elimina` | La valutazione già svolta resta, perde solo il rimando |
| `lezione.duplica` | `lezioneId: string`, `data: Iso`, `inizio?: Ora` | R | `lezioni` | no — una copia nuova ogni volta | `ore.duplica` | Copia la scaletta; **appello e voti no**. `slotSpostati` se arriva un'ora d'inizio |
| `lezione.stato` | `lezioneId: string`, `stato: StatoLezione` | R, F | `lezioni` | parziale — rigenera i documenti a ogni giro | `ore.stato` | Se `svolta` e l'appello è vuoto lo inizializza; poi `aggiornaDopoChiusura` rifà subito verbale, presenze, griglia e schede del corso senza aspettare il debounce |
| `lezione.sposta` | `lezioneId: string`, `data: Iso`, `inizio?: Ora` | R | `lezioni` | sì | `ore.sposta` | Sposta tutti gli slot insieme; appello, osservazioni e consuntivo restano |
| `lezione.testi` | `lezioneId: string`, `argomenti?: string`, `materiali?: string`, `consuntivo?: string` | R | `lezioni` | sì | `ore.testi` | Scrive **solo** i campi presenti: pensata per la scrittura a campo mentre l'ora è in corso |
| `presenze.ud` | `lezioneId: string`, `allievoId: string`, `ud: number`, `stato: StatoPresenza` | R | `lezioni` | sì | `ore.appello.casella` | Una casella della matrice; `appelloScritto` ricostruisce l'appello completo |
| `presenze.riga` | `lezioneId: string`, `allievoId: string`, `stato: StatoPresenza` | R | `lezioni` | sì | `ore.appello.riga` | Tutta la riga di un allievo; i minuti cadono se non resta un ritardo |
| `presenze.colonna` | `lezioneId: string`, `ud: number`, `stato: StatoPresenza` | R | `lezioni` | sì | `ore.appello.colonna` | Tutta un'unità didattica |
| `presenze.tutti` | `lezioneId: string`, `stato: StatoPresenza` | R | `lezioni` | sì | `ore.appello.tutti` | L'intera matrice; filtro sempre vero |
| `presenze.campi` | `lezioneId: string`, `allievoId: string`, `minuti?: number`, `nota?: string` | R | `lezioni` | sì | `ore.appello.campi` | Solo minuti e nota di una riga; le altre righe — compresi gli allievi non più frequentanti — restano intatte |
| `osservazione.cella` | `lezioneId: string`, `allievoId: string`, `aspetto: string`, `segno?: SegnoOsservato \| null`, `nota?: string` | R | `lezioni` | sì | `ore.comportamento.cella` | Campo assente = lascia com'era; `segno: null` toglie il segno e lascia la nota; cella senza segno né nota sparisce da sé |
| `osservazione.salva` | `lezioneId: string`, `osservazione: Osservazione` | R | `lezioni` | sì — `riponi` per id | `ore.osservazione.salva` | — |
| `osservazione.elimina` | `lezioneId: string`, `osservazioneId: string` | R | `lezioni` | sì | `ore.osservazione.elimina` | Filtra senza rifiutare se non c'era |

### 6.3 `src/actions/plans.ts` — piano lezione, risorse, avanzamento (11 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `piano.salva` | `piano: PianoLezione` | R | `piani` | sì — `riponi` per id | `piani.salva` + `validaPiano` | Timbra `aggiornatoIl`; `creato` solo se nuovo |
| `piano.elimina` | `pianoId: string` | R, F | decise dal piano | parziale | `piani.elimina` | Porta via la cartella delle risorse |
| `piano.perLezione` | `lezioneId: string`, `daPianoId?: string \| null` | R | `piani`, `lezioni` | no — la seconda volta rifiuta | `piani.perLezione` | Crea un piano vuoto o copiato, lo aggancia all'ora, inizializza `avanzamento`; messaggio diverso fra copia e piano vuoto |
| `piano.duplica` | `pianoId: string` | R, F | `piani` | no — id e file nuovi | `piani.duplica` | **Ricopia davvero i file** delle risorse, uno per uno: due piani non condividono mai lo stesso file. Un file mancante non ferma la copia |
| `piano.assegna` | `lezioneId: string`, `pianoId: string \| null` | R | `lezioni` | sì | `piani.assegna` | Cambiare piano **azzera l'avanzamento**: si riferirebbe alle tappe di un altro piano |
| `risorsa.aggiungi` | `pianoId: string`, `attivitaId: string \| null`, `genere: TipoRisorsa`, `titolo?: string`, `url?: string` | R, F | `piani` | no — una risorsa nuova ogni giro | `risorse.aggiungi` + `validaRisorsa` | `attivitaId` nullo = «del piano intero». Dialogo annullato ⇒ `fatto`; copia il file **prima** di scrivere |
| `risorsa.salva` | `pianoId: string`, `attivitaId: string \| null`, `risorsa: Risorsa` | R | `piani` | sì — sostituisce per indice | `risorse.salva` + `validaRisorsa` | Aggiorna i metadati, **non il file** (si sostituisce aggiungendone un'altra); `file` e `nome` della riga vecchia si conservano |
| `risorsa.sposta` | `pianoId: string`, `daAttivitaId: string \| null`, `aAttivitaId: string \| null`, `risorsaId: string` | R, F | `piani` | parziale | `risorse.sposta` | Stessa tappa ⇒ `fatto`. **Rinomina il file** per riflettere la nuova tappa; se la rinomina fallisce la riga si sposta lo stesso |
| `risorsa.elimina` | `pianoId: string`, `attivitaId: string \| null`, `risorsaId: string` | R, F | `piani` | parziale — poi rifiuta «non trovata» | `risorse.elimina` | Cestina il file **prima** di togliere la riga |
| `risorsa.apri` | `pianoId: string`, `attivitaId: string \| null`, `risorsaId: string` | F | — | sì | `risorse.apri` | Collegamento con `openExternal`, altrimenti `apriFile` |
| `avanzamento.imposta` | `lezioneId: string`, `attivitaId: string`, `stato: StatoAttivita`, `nota?: string` | R | `lezioni` | sì | `avanzamento.imposta` | Crea la riga prendendo il titolo dall'attività del piano |

### 6.4 `src/actions/assessments.ts` — momenti, voti, recuperi, allegati (11 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `valutazione.daAttivita` | `lezioneId: string`, `attivitaId: string` | R | `valutazioni` | **sì per progetto** — se esiste già torna il suo id | `valutazioni.daAttivita` | Eredita titolo, tipo e peso dalla tappa-prova; data e corso dalla lezione |
| `valutazione.salva` | `valutazione: MomentoValutazione` | R | `valutazioni` | sì — `riponi` per id | `valutazioni.salva` + `validaValutazione` | Timbra `aggiornatoIl`, riordina per data |
| `valutazione.elimina` | `valutazioneId: string` | R, F | decise dal piano | parziale | `valutazioni.elimina` | Porta i PDF nel cestino |
| `valutazione.eliminaOrfane` | `ids: string[]` | R, F | decise dal piano | sì — i già tolti si saltano in silenzio | `valutazioni.eliminaOrfane` | Uno per uno, dagli id passati esplicitamente; riepilogo con momenti tolti e voti persi |
| `voto.imposta` | `valutazioneId: string`, `allievoId: string`, `valore: number \| null`, `assente: boolean`, `nota?: string` | R | `valutazioni` | sì | `valutazioni.voto.imposta` | Unico punto con validazione numerica esplicita fuori da `valida*`; `arrotondaVoto` sul passo della scala; crea la riga se manca |
| `valutazione.riconsegna` | `valutazioneId: string`, `il: string \| null` | R | `valutazioni` | sì — chi ha già la sua data la tiene | `valutazioni.riconsegna` | Una data per tutta la classe; salta assenti e caselle vuote; `il: null` toglie a tutti |
| `recupero.imposta` | `valutazioneId: string`, `allievoId: string`, `previstoIl: string \| null`, `nota?: string`, `dispensato?: boolean`, `riconsegnataIl?: string \| null` | R | `valutazioni` | parziale — riscrive `aggiornatoIl` | `valutazioni.recupero.imposta` | `riconsegnataIl` assente = «lascia com'era» (evita perdite silenziose), `null` la toglie; `dispensato` azzera anche la riconsegna; riga tolta se non resta né data né nota né dispensa; crea il voto «assente» iniziale |
| `voto.riconsegna` | `valutazioneId: string`, `allievoId: string`, `il: string \| null` | R | `valutazioni` | sì | `valutazioni.voto.riconsegna` | Sovrascrive la data di gruppo per un singolo; senza casella non scrive niente e non inventa il voto |
| `allegato.aggiungi` | `valutazioneId: string`, `ruolo: RuoloAllegato`, `allievoId?: string \| null` | R, F | `valutazioni` | no — ricopia il PDF ogni volta | `valutazioni.allegato.aggiungi` | Un solo allegato per ruolo (più allievo se `prova`): sostituisce il file vecchio, non accumula. Dialogo annullato ⇒ `fatto` |
| `allegato.apri` | `valutazioneId: string`, `allegatoId: string` | F | — | sì | `valutazioni.allegato.apri` | Delega ad `apriFile` |
| `allegato.elimina` | `valutazioneId: string`, `allegatoId: string` | R, F | `valutazioni` | parziale — poi rifiuta «non trovato» | `valutazioni.allegato.elimina` | Cestina il file **prima** di togliere la voce |

### 6.5 `src/actions/assignments.ts` — consegne, raccolta, distribuzione (10 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `consegna.salva` | `consegna: Consegna` | R | `consegne` | parziale — upsert per id, ma `aggiornataIl` sempre nuovo | `consegne.salva` + `validaConsegna` | Prima volta risponde `creato: {id}`, poi `fatto` |
| `consegna.elimina` | `consegnaId: string` | R, F | decise dal piano | parziale | `consegne.elimina` | Cestina anche i documenti raccolti |
| `consegna.spunta` | `consegnaId: string`, `chi: string`, `fatta: boolean` | R | `consegne` | parziale | `consegne.spunta` | Il foglio raccolto va tolto esplicitamente con `consegna.documento.togli` |
| `consegna.spuntaTutti` | `consegnaId: string`, `fatta: boolean` | R | `consegne` | parziale | `consegne.spuntaTutti` | Spunta tutti i mancanti, o toglie **solo le spunte nude**: quelle con un file restano. Ha sostituito «Chiudi comunque», che mentiva sull'esito |
| `consegna.raccogli` | `consegnaId: string`, `chi: string` | R, F | `consegne` | no — ricopia il file e riscrive i timbri | `consegne.raccogli` | Sceglie il file, lo archivia, spunta **e** aggancia il documento in un gesto solo. Annullando non succede niente |
| `consegna.documento.allega` | `consegnaId: string`, `allievoId: string \| null` | R, F | `consegne` | parziale — sostituisce il vecchio ma ricopia sempre | `consegne.documento.allega` | `allievoId` nullo = «lo stesso per tutti» (`fileTutti`/`nomeTutti`). Avere il documento non è averlo consegnato |
| `consegna.documento.apri` | `consegnaId: string`, `allievoId: string \| null` | F | — | sì | `consegne.documento.apri` | Nessuna scrittura |
| `consegna.documento.togli` | `consegnaId: string`, `allievoId: string \| null` | R, F | `consegne` | parziale — poi «nessun documento» | `consegne.documento.togli` | Cestina il file **prima** di toccare il registro |
| `consegna.consegnato` | `consegnaId: string`, `allievoId: string`, `fatta: boolean` | R | `consegne` | parziale — riscrive `fattaIl` ogni volta | `consegne.consegnato` | Spunta «a mano», copiando `file`/`nome` del documento dentro la spunta |
| `consegna.distribuisci` | `consegnaId: string`, `allieviIds?: string[]` | R, F, P | `consegne` (via `archivio.modifica` diretto) | no — rispedisce e riscrive le bozze | `consegne.distribuisci` | Un messaggio per allievo con l'allegato in base64; destinatari filtrati per `mailAllievo`/`mailTutore`; niente copia nascosta. Chi non ha documento o indirizzo finisce in `falliti`, **mai in silenzio**. Con invio diretto attivo chiede conferma **prima** di generare qualunque bozza; le bozze si scrivono sempre, e **solo chi è partito davvero** viene segnato come consegnato |

### 6.6 `src/actions/classTeacher.ts` — fascicolo di classe: firme, recapiti, comunicazioni, assenze (19 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `consegna.firme.aggiungi` | `consegnaId: string` | R, F | `consegne` | parziale — sostituisce ma ricopia | `consegne.firme.aggiungi` | Un solo foglio firme per richiesta: sta sulla consegna, non sulle spunte |
| `consegna.firme.apri` | `consegnaId: string` | F | — | sì | `consegne.firme.apri` | — |
| `consegna.firme.togli` | `consegnaId: string` | R, F | `consegne` | parziale — poi «non c'è nessun foglio firme» | `consegne.firme.togli` | Cestina prima, scrive dopo |
| `consegna.file.apri` | `consegnaId: string`, `chi: string` | F | — | sì | `consegne.file.apri` | Apre il file con cui qualcuno ha spuntato (`documentoPer`) |
| `consegna.file.togli` | `consegnaId: string`, `chi: string` | R, F | `consegne` | parziale — poi «non c'è niente da togliere» | `consegne.file.togli` | Toglie file **e** spunta insieme: il documento torna atteso |
| `recapito.salva` | `classeId: string`, `recapito: Recapito` | R | `fascicoli` (`nelFascicolo`) | parziale — upsert per id, timbro sempre nuovo | `classe.recapiti.salva` + `validaRecapito` | Crea il fascicolo alla prima scrittura |
| `recapito.elimina` | `classeId: string`, `recapitoId: string` | R | `fascicoli` | parziale | `classe.recapiti.elimina` | Lo toglie anche da `recapitiIds` di ogni comunicazione |
| `comunicazione.salva` | `classeId: string`, `comunicazione: Comunicazione` | R | `fascicoli` | parziale | `classe.comunicazioni.salva` + `validaComunicazione` | `riponi` per id |
| `comunicazione.elimina` | `classeId: string`, `comunicazioneId: string` | R | `fascicoli` | parziale | `classe.comunicazioni.elimina` | — |
| `comunicazione.invia` | `classeId: string`, `comunicazioneId: string` | R, F, P | `fascicoli` (via `segnaComunicazione`, `archivio.modifica` diretto) | parziale — la guardia «già partita» blocca il bis | `classe.comunicazioni.invia` + `validaComunicazione` | Un solo messaggio, destinatari in copia nascosta. Scrive lo stato **solo** se davvero spedita: nessuna scrittura prematura |
| `comunicazione.spunta` | `classeId: string`, `comunicazioneId: string`, `spedita: boolean` | R | `fascicoli` | sì — stato assoluto | `classe.comunicazioni.spunta` | Spunta manuale «l'ho mandata dal programma di posta»; togliendola azzera destinatari e data. Bypassa `contesto.modifica` |
| `assenze.salva` | `classeId: string`, `blocco: BloccoAssenze` | R | `fascicoli` | parziale | `classe.assenze.salva` + `validaBloccoAssenze` | Se il blocco esiste già **mantiene le righe del server** e ignora quelle del client: è la difesa di concorrenza più esplicita del codice. `creato` solo al primo salvataggio |
| `assenze.elimina` | `classeId: string`, `bloccoId: string` | R, F | `fascicoli` (`nelFascicolo`) | parziale — poi «Periodo non trovato» | `classe.assenze.elimina` | Cestina ogni foglio di ogni riga, più la vecchia cartella piatta |
| `assenze.foglio.aggiungi` | `classeId: string`, `bloccoId: string`, `allievoId: string`, `genere: TipoRapporto`, `firmato: boolean` | R, F | `fascicoli` | parziale — sostituisce ma ricopia | `classe.assenze.foglio.aggiungi` | Sovrascrive il foglio dello stesso genere+firmato; `copiaFoglio` esige un anno aperto |
| `assenze.importa` | `classeId: string`, `bloccoId: string`, `genere: TipoRapporto`, `firmato: boolean` | R, F | `fascicoli` | no — ricopia tutti i file scelti | `classe.assenze.importa` | Fino a 25 PDF in un colpo, matching per nome file; **riepilogo sempre presente** (assegnati + non riconosciuti) |
| `assenze.foglio.apri` | `classeId: string`, `bloccoId: string`, `allievoId: string`, `genere: TipoRapporto`, `firmato: boolean` | F | — | sì | `classe.assenze.foglio.apri` | — |
| `assenze.foglio.togli` | `classeId: string`, `bloccoId: string`, `allievoId: string`, `genere: TipoRapporto`, `firmato: boolean` | R, F | `fascicoli` | parziale — poi «nessun foglio da togliere» | `classe.assenze.foglio.togli` | Cestina prima, `togliFoglioAssenze` dopo |
| `assenze.invia` | `classeId: string`, `bloccoId: string`, `allieviIds: string[]` | R, F, P | `fascicoli` (via `segnaInvio`, `archivio.modifica` diretto) | parziale — senza `allieviIds` salta i già inviati | `classe.assenze.invia` + `validaBloccoAssenze` | Una mail per allievo, destinatari in chiaro; esito scritto riga per riga. **Rischio noto**: le righe con indirizzo mancante o allegato illeggibile sono segnate come fallite *prima* del dialogo di conferma, e restano scritte così anche se si annulla |
| `assenze.spunta` | `classeId: string`, `bloccoId: string`, `allievoId: string`, `spedita: boolean` | R | `fascicoli` | sì — scrive o azzera `riga.invio` in modo assoluto | `classe.assenze.spunta` | Spunta manuale dell'invio. Bypassa `contesto.modifica` |

### 6.7 `src/actions/sorting.ts` — ingresso PDF, OCR, matrice di assegnazione (19 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `smistamento.assegnaManuale` | `smistamentoId: string`, `consegnaId: string`, `allievoId: string`, `da: number`, `a: number` | R, F | `smistamenti` (via `chiudiSeFinito`) | no — riarchivia e rifà il ritaglio | `smistamento.pagine.assegnaManuale` | **Legacy**: nessuna vista attuale lo invoca, tenuto per le prove automatiche |
| `smistamento.dividi` | `smistamentoId: string`, `divisione: Divisione` | R | `smistamenti` | sì — `sanaDivisione` è deterministica | `smistamento.pdf.dividi` | **Legacy** come sopra. Non tocca le pagine già assegnate |
| `smistamento.carica` | `consegnaId: string \| null`, `classeId?: string \| null`, `divisione: Divisione` | R, F | — (scrive via `smistatore.smista`) | no — ogni giro crea nuovi smistamenti | `smistamento.pdf.carica` | Dialogo di sistema multi-file: legge i byte, **non sposta** l'originale. Se ci sono pagine mute e l'OCR è acceso, accoda la lettura |
| `smistamento.deposita` | `consegnaId: string \| null`, `classeId?: string \| null`, `nome: string`, `contenuto: string` (base64), `divisione: Divisione` | R | — (scrive via `smistatore.smista`) | no — ogni drop crea un nuovo smistamento | `smistamento.pdf.deposita` | Drag&drop: i byte viaggiano nel messaggio perché il webview in sandbox non conosce i percorsi disco. Nome ripulito dai caratteri vietati |
| `smistamento.assegnaPagine` | `smistamentoId: string`, `consegnaId: string`, `allievoId: string`, `pagine: number[]` | R, F | `smistamenti` (via `chiudiSeFinito`) | no — il bis è rifiutato se la casella è piena | `smistamento.pagine.assegna` | Ritaglia le pagine dal PDF originale, archivia il file, aggiorna la consegna, toglie le pagine da `letture` |
| `smistamento.confermaTutto` | `smistamentoId: string` | R, F | `smistamenti` (via `chiudiSeFinito`) | parziale — poi «nessuna proposta da confermare» | `smistamento.bozza.conferma` | Conferma in blocco ogni riga che ha già un nome, dall'ultima pagina alla prima. Quel che non ha un nome resta dov'è |
| `smistamento.scartaPagine` | `smistamentoId: string`, `pagine: number[]` | R | `smistamenti` | parziale | `smistamento.pagine.scarta` | Via dalla quarantena senza finire da nessuno: la copertina dello scanner, il foglio bianco. Lavora a intervalli |
| `smistamento.leggiPagine` | `smistamentoId: string`, `pagine: number[]` | R (differito, via coda OCR) | — (`accodaLettura`) | parziale — riaccoda e rilegge | `smistamento.lettura.pagine` | Fire-and-forget: ritorna `fatto` subito, il lavoro lo fa lo `Smistatore`. Rilegge anche pagine che un testo ce l'hanno |
| `smistamento.apriPagine` | `smistamentoId: string`, `pagine: number[]` | F | — | sì | `smistamento.pagine.apri` | Ritaglio di servizio aperto nel lettore di sistema, fuori dall'archivio dell'anno |
| `smistamento.assegnaAssenze` | `smistamentoId: string`, `classeId: string`, `bloccoId: string`, `allievoId: string`, `genere: TipoRapporto`, `firmato: boolean`, `pagine: number[]` | R, F | `smistamenti` (via `chiudiSeFinito`) | no — riarchivia il foglio | `smistamento.assenze.assegna` | Tipo e «firmato» li dice la casella della matrice, non il file |
| `smistamento.assegnaFirme` | `smistamentoId: string`, `consegnaId: string`, `pagine: number[]` | R, F | `smistamenti` (via `chiudiSeFinito`) | no — riarchivia il foglio firme | `smistamento.firme.assegna` | La casella firme sta in cima alla matrice |
| `smistamento.riprendiPagine` | `smistamentoId: string`, `pagine: number[]` | R, F | `consegne`, `fascicoli`, `smistamenti` | parziale — poi «non archiviate da nessuna parte» | `smistamento.pagine.riprendi` | **Unico rollback del sistema**: toglie il documento dal fascicolo di chi l'aveva, cestina il file, rimette le pagine in `letture` rileggendo il testo dal PDF originale (senza OCR). Torna indietro il documento intero, non la singola pagina |
| `smistamento.leggiTutto` | `smistamentoId: string` | R (differito) | — (`accodaLettura`) | parziale — riaccoda solo le pagine ancora mute | `smistamento.lettura.tutto` | Le pagine che un testo ce l'hanno restano fuori |
| `smistamento.rileggiAttive` | `smistamentiId: string[]` | R (differito) | — (`accodaLettura`) | parziale — riaccoda tutte le attive | `smistamento.lettura.attive` | L'unico comando che porta più PDF insieme |
| `smistamento.fermaLettura` | — | ∅ | — | sì | `smistamento.lettura.ferma` | `fermaLettura()` sullo smistatore |
| `smistamento.attribuisci` | `smistamentoId: string`, `classeId: string` | R | `smistamenti` | sì — esce subito se già di quella classe e senza consegna | `smistamento.pdf.attribuisci` | Cambia la classe bersaglio, **azzera `consegnaId`**, non rilegge il PDF |
| `smistamento.apri` | `smistamentoId: string` | F | — | sì | `smistamento.pdf.apri` | Apre il PDF nel lettore di sistema |
| `smistamento.elimina` | `smistamentoId: string` | R, F | `smistamenti` | parziale — poi «quello smistamento non c'è più» | `smistamento.pdf.elimina` | Cestina PDF e anteprime, poi toglie la riga |
| `smistamento.impostazioni` | — | F | — | sì | `smistamento.lettura.impostazioni` | `workbench.action.openSettings` filtrato su `registroDocenti.ocr` |

### 6.8 `src/actions/reports.ts` — generazione PDF (3 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `rapporto.genera` | `genere: 'lezione' \| 'piano' \| 'valutazioni' \| 'presenze' \| 'fascicolo' \| 'allievo' \| 'momento' \| 'foto-classe'`, `id: string`, `corsoId?: string \| null`, `semestreId?: string \| null` | F | — | parziale — stesso percorso riscritto, ma `fascicolo` e `foto-classe` portano la data nel nome e cambiano di giorno in giorno | `rapporti.genera` | Sola lettura sul `Registro`; il percorso relativo torna in `Risposta.documento`. Non apre niente |
| `rapporto.completo` | `corsoId: string \| null`, `semestreId: string \| null` | F | — | parziale — come sopra, più `aggiornaComposizioni()` | `rapporti.completo` | Tutti i PDF automatici di uno o di tutti i corsi, **in serie** e non in parallelo (per non litigare con OneDrive); dedup per percorso; continua sugli errori e riepiloga scritti/errori |
| `rapporto.modelli` | — | F | — | sì — `assicuraModelli` scrive solo ciò che manca | `rapporti.modelli` | Materializza i modelli di serie mancanti e apre `templates/_base.tpl` nel gestore file |

`programmaRigenerazione(registro, corsi, giorno)` è esportata ma **non è un
gestore**: la chiama `esegui()` dopo ogni azione riuscita che ha cambiato
`archivio.revisione`, con un debounce di 8 s dall'ultima modifica e un tetto di
60 s dalla prima, e rifà in background i PDF automatici dei corsi toccati se
`pdfAutomatici === 'sempre'`. I corsi e il giorno li deduce
`corsiDaRifare`/`giornoDaRifare` ([`src/domain/automation.ts`](../src/domain/automation.ts))
leggendo i campi standard che il protocollo porta ovunque: `corsoId`,
`lezioneId`, `valutazioneId`, `pianoId`, `classeId`, `allievoId`. Un'azione
nuova entra nell'automazione senza che nessuno debba registrarla a mano.
`aggiornaDopoChiusura` è la variante immediata, chiamata da `lezione.stato`.

### 6.9 `src/actions/system.ts` — impostazioni, esportazioni, manutenzione, posta (15 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `impostazioni.salva` | `impostazioni: Impostazioni` | R | `registro` | sì | `impostazioni.salva` | Unico gestore del file che scrive nel `Registro` |
| `programma.salva` | `chiave: string`, `valore: string \| number \| boolean` | F (file JSON in `userData`) | — | sì | `programma.salva` | `update` con `ConfigurationTarget.Global`, per far scattare gli avvisi di ricarica |
| `programma.azzera` | `chiave: string` | F | — | sì | `programma.azzera` | Ritira il valore scritto: torna a valere il manifesto |
| `esporta.valutazioni` | `corsoId: string`, `semestreId: string \| null` | F (CSV) | — | sì — contenuto deterministico | `esporta.valutazioni` | `percorsoCsv` mette il CSV accanto al PDF corrispondente, stesso nome; poi lo apre |
| `esporta.presenze` | `corsoId: string`, `semestreId: string \| null` | F (CSV) | — | sì | `esporta.presenze` | Denominatore da `udPrevisteDaOrario`, lo stesso del PDF |
| `esporta.lezione` | `lezioneId: string` | F (Markdown) | — | sì | `esporta.lezione` | `percorsoDi(dove, 'md')`: stesso posto del verbale |
| `manutenzione.ripara` | — | R | dinamiche: l'unione di `correzione.collezioni` da `riparazioni()` | sì — a valle non resta niente da riparare | `manutenzione.ripara` | Tutte le correzioni automatiche in **una sola** `modifica` |
| `sistema.apriCartella` | — | ∅ | — | sì | `sistema.apriCartella` | `cartellaDocumento() ?? cartellaAnno()`, poi `revealFileInOS` |
| `sistema.chiama` | `numero: string` | P | — | sì | `sistema.chiama` | Dipende da `registroDocenti.recapiti.telefono`; modo `nessuno` ⇒ messaggio informativo. Torna `invariato` |
| `sistema.scrivi` | `indirizzo: string` | P | — | sì | `sistema.scrivi` | Dipende da `registroDocenti.recapiti.posta`; Outlook via eseguibile, poi ripiego su `mailto:` / Outlook Web. Torna `invariato` |
| `posta.prova` | — | P (rete) | — | sì — non manda nulla | `posta.prova` | Verifica il collegamento senza spedire; `invariato` |
| `posta.invioProva` | — | P (invio reale) | — | **no** — ogni chiamata spedisce | `posta.invioProva` | L'indirizzo lo sceglie l'host con una finestra di sistema, non il webview. Dialogo annullato ⇒ `invariato` silenzioso |
| `posta.collega` | — | P + portachiavi di sistema | — | sì | `posta.collega` | Login Microsoft dal browser di sistema; **salva il gettone solo se il server accetta**. Non è `invariato`: la pastiglia «collegata» deve accendersi |
| `posta.scollega` | — | P + portachiavi | — | sì | `posta.scollega` | Esito raccontato da `scollegaAccount` |
| `sistema.messaggio` | `livello: 'info' \| 'avviso' \| 'errore'`, `testo: string` | ∅ | — | sì | `sistema.messaggio` | Mostra la notifica scegliendo error/warning/info |

**Il gettone OAuth non attraversa mai il ponte.**
`registraPortachiaviOauth(contesto.secrets)` è la prima riga di `avvia()`: il
segreto sta nel portachiavi di sistema, e il webview vede solo i booleani e le
stringhe derivati in `MessaggioStato.posta` (`exchange`, `server`,
`invioDiretto`, `mittente`, `accesso`).

### 6.10 `src/actions/documents.ts` — documento d'anno e recenti (5 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `stato.salva` | — | F | — | sì — a vuoto non scrive nulla di nuovo | `stato.salva` | Il Ctrl+S esplicito: forza `archivio.salva()` anche se il registro salva già da sé in write-behind. `invariato`; risponde «Tutto salvato.» |
| `documento.apri` | `percorso?: string` | F / ∅ (il lavoro è del guscio) | — | sì | `documento.apri` | Delega a `registroDocenti.apriDocumento`; senza percorso apre il dialogo di sistema. Può finire con un riavvio se il documento sta in un'altra cartella di lavoro |
| `documento.chiudi` | — | ∅ | — | sì | `documento.chiudi` | Delega a `registroDocenti.chiudiDocumento`: libera il file e la sua serratura, il pannello si chiude e torna il benvenuto |
| `documento.preferito` | `percorso: string`, `preferito: boolean` | F (elenco recenti in `src/environment/documents.ts`) | — | sì | `documento.preferito` | Non `invariato`: l'elenco spinto nello stato cambia |
| `documento.dimentica` | `percorso: string` | F (elenco recenti) | — | sì — la seconda volta è un no-op | `documento.dimentica` | Toglie la voce dall'elenco; **il file sul disco non si tocca** |

### 6.11 `src/actions/exports.ts` — i file già generati (3 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `esportazione.apri` | `percorso: string` | ∅ (materializza una copia del file) | — | sì | `esportazioni.apri` | `apriConIlSistema`; torna `invariato` |
| `esportazione.mostra` | `percorso: string`, `titolo?: string` | ∅ (materializza una copia) | — | sì | `esportazioni.mostra` | Comando `registroDocenti.mostraDocumento`: lettore PDF **interno** |
| `esportazione.elimina` | `percorso: string` | F | — | parziale — poi «Quel documento non c'è più» | `esportazioni.elimina` | Se il percorso è di un fascicolo devia su `buttaIlFascicolo` (toglie ricetta **e** PDF insieme) |

### 6.12 `src/actions/compositions.ts` — fascicoli multi-PDF (3 azioni)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `composizione.crea` | `nome: string`, `percorsi: string[]` | F (PDF + ricetta JSON nel deposito) | — | no — nuovo `identificatore('fas')`, e il bis viene rifiutato per collisione | `composizioni.crea` | `scriviGenerato` con `doppioni: false`: qui il suffisso «(2)» è voluto. Dedup sul percorso del PDF risultante, non sul nome |
| `composizione.aggiorna` | `id: string` | F (PDF + ricetta) | — | parziale — stessi percorsi, ma `aggiornataIl` cambia | `composizioni.aggiorna` | Rifà il PDF con i fogli presenti *adesso*, nello stesso ordine; conta separatamente mancanti, protetti e illeggibili (tre rimedi diversi) |
| `composizione.elimina` | `id: string` | F | — | parziale — poi «non c'è più» | `composizioni.elimina` | Toglie **prima la ricetta, poi il PDF**: ordine dichiarato per garantire l'idempotenza del retry |

### 6.13 `src/actions/map.ts` — geocodifica (1 azione)

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `mappa.geocodifica` | `classeIds?: string[]`, `allievoId?: string`, `rifaiTutto?: boolean` | R, P (rete) | `coordinate` — una `modifica` per ogni indirizzo trovato | parziale — salta i già risolti salvo `rifaiTutto`, e `trovatoIl` cambia a ogni riscrittura | `mappa.geocodifica` | Nominatim/OpenStreetMap via `fetch` dal main process (mai dal webview: CSP `default-src 'none'`); rate-limit forzato 1,1 s fra richieste; 4 query in cascata (via+civico+NAP+paese → … → solo NAP+paese, marcato `approssimato`); tetto 60 indirizzi per invocazione; scrittura incrementale; **sincrono e bloccante nel gestore**, a differenza dell'OCR. Le coordinate stanno per indirizzo, non per persona |

### 6.14 `src/actions/templates.ts` — editor dei modelli di stampa (3 azioni)

Erano cinque. `modello.leggi` e `modello.prova` sono diventate letture: stanno
nel §6.17.

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `modello.salva` | `nome: string`, `testo: string`, `attesoSuDisco?: string` | F | — | sì | `modelli.salva` | Gestione conflitti ottimistica: se il file è stato toccato fuori dal registro l'hash diverge e si rifiuta invece di sovrascrivere in silenzio |
| `modello.ripristina` | `nome: string` | F | — | sì | `modelli.ripristina` | Rimette la copia di serie; la conferma la chiede la pagina, non il gestore |
| `modello.immagine` | — | F | — | parziale — riscrive con lo stesso nome file | `modelli.immagine` | Copia un'immagine in `templates/`. Dialogo annullato ⇒ `invariato` |

### 6.15 `src/actions/projection.ts` — lo schermo per la classe (4 azioni)

Nessuna tocca il `Registro`: tutte tornano `invariato` e scrivono variabili di
modulo in [`src/panels/projection.ts`](../src/panels/projection.ts),
ricalcolando e rispingendo `MessaggioProiezione` con un debounce a microtask.

| `tipo` | payload | effetto | collezioni riscritte | idempotente | procedura | note |
|---|---|---|---|---|---|---|
| `proiezione.apri` | — | ∅ | — | sì — riusa il pannello già aperto | `proiezione.apri` | `PannelloProiezione.apri()` |
| `proiezione.chiudi` | — | ∅ | — | sì | `proiezione.chiudi` | `PannelloProiezione.chiudi()` |
| `proiezione.mira` | `mira: MiraProiezione` = `{lezioneId, corsoId, classeId, semestreId, data}` (tutti nullable) | ∅ | — | sì | `proiezione.mira` | `invariato` apposta: arriva a **ogni** cambio di vista del pannello. È l'unica azione esclusa dal contatore «sto lavorando» |
| `proiezione.impostazioni` | `impostazioni: ImpostazioniProiezione` | ∅ | — | sì | `proiezione.impostazioni` | `impostaProiezione(...)` |

### 6.16 Riepilogo per area

| File di gestori | Azioni | Aree toccate |
|---|---|---|
| [`registro.ts`](../src/actions/register.ts) | 20 | anno, materia, corso, orario, classe, persone, lettura dello stato |
| [`hours.ts`](../src/actions/hours.ts) | 14 | lezione, appello, matrice del comportamento |
| [`piani.ts`](../src/actions/plans.ts) | 11 | piano lezione, risorse, avanzamento |
| [`valutazioni.ts`](../src/actions/assessments.ts) | 11 | momenti, voti, recuperi, riconsegne, allegati |
| [`consegne.ts`](../src/actions/assignments.ts) | 10 | consegne, raccolta, distribuzione per mail |
| [`docenteClasse.ts`](../src/actions/classTeacher.ts) | 19 | fogli firme, recapiti, comunicazioni, blocchi assenze |
| [`smistamento.ts`](../src/actions/sorting.ts) | 19 | ingresso PDF, quarantena, OCR, matrice di assegnazione |
| [`rapporti.ts`](../src/actions/reports.ts) | 3 | generazione PDF |
| [`system.ts`](../src/actions/system.ts) | 15 | impostazioni, CSV/MD, manutenzione, telefono, posta |
| [`documenti.ts`](../src/actions/documents.ts) | 5 | documento d'anno, elenco recenti |
| [`esportazioni.ts`](../src/actions/exports.ts) | 3 | i file già generati |
| [`composizioni.ts`](../src/actions/compositions.ts) | 3 | fascicoli multi-PDF |
| [`mappa.ts`](../src/actions/map.ts) | 1 | geocodifica |
| [`modelli.ts`](../src/actions/templates.ts) | 3 | editor dei modelli (leggere e provare sono letture: §6.17) |
| [`proiezione.ts`](../src/actions/projection.ts) | 4 | schermo per la classe |
| **Totale** | **141** | |

Conteggi trasversali:

| | Quante | Quali |
|---|---|---|
| Azioni che toccano il `Registro` (**R**) | **95** | tutte tranne le 46 che non lo toccano |
| Azioni che toccano il filesystem (**F**) | **72** | — |
| Azioni che escono sulla rete o sulla posta (**P**) | **10** | `consegna.distribuisci`, `comunicazione.invia`, `assenze.invia`, `mappa.geocodifica`, `sistema.chiama`, `sistema.scrivi`, `posta.prova`, `posta.invioProva`, `posta.collega`, `posta.scollega` |
| Azioni **solo** `∅` (nessun effetto oltre la risposta) | **10** | `smistamento.fermaLettura`, `sistema.apriCartella`, `sistema.messaggio`, `documento.chiudi`, `esportazione.apri`, `esportazione.mostra`, `proiezione.apri`, `proiezione.chiudi`, `proiezione.mira`, `proiezione.impostazioni` |
| Azioni con una funzione `valida*` di dominio | **18** | `anno.crea`, `anno.salva` (`validaAnno`); `materia.salva` (`validaMateria`); `corso.salva`, `orario.imposta` (`validaCorso`); `classe.salva`, `classe.duplica` (`validaClasse`); `lezione.salva` (`validaLezione`); `piano.salva` (`validaPiano`); `risorsa.aggiungi`, `risorsa.salva` (`validaRisorsa`); `valutazione.salva` (`validaValutazione`); `consegna.salva` (`validaConsegna`); `recapito.salva` (`validaRecapito`); `comunicazione.salva`, `comunicazione.invia` (`validaComunicazione`); `assenze.salva`, `assenze.invia` (`validaBloccoAssenze`) |
| Azioni dichiaratamente idempotenti per progetto | **3** | `corso.crea`, `valutazione.daAttivita`, `orario.genera` |
| Azioni che aprono un dialogo di sistema dentro il gestore | **11** | `anno.crea` (`showSaveDialog`), `allievo.foto.imposta`, `risorsa.aggiungi`, `allegato.aggiungi`, `consegna.raccogli`, `consegna.documento.allega`, `consegna.firme.aggiungi`, `assenze.foglio.aggiungi`, `assenze.importa` (multi-file), `smistamento.carica` (multi-file), `modello.immagine` |
| Azioni che aprono un dialogo **fuori** dal gestore | **2** | `posta.invioProva` (finestra dell'host in `data/mail.ts`), `documento.apri` senza percorso (dialogo del guscio) |
| Azioni marcate legacy nel codice | **2** | `smistamento.assegnaManuale`, `smistamento.dividi` |
| Azioni che scrivono bypassando `contesto.modifica` (chiamano `archivio.modifica` diretto) | **5** | `materia.salva`, `comunicazione.invia`, `comunicazione.spunta`, `assenze.invia`, `assenze.spunta` |

---

### 6.17 Le 8 letture e il canale delle domande

La superficie più nuova, e l'unica che non attraversa la coda delle scritture.

Le procedure di [`src/api/`](../src/api/) si dividono in due: quelle che
prendono in carico un'azione del protocollo (§6.1–§6.15) e **8 che non ne
prendono nessuna**, perché non c'è niente da prendere — sono domande, e il
protocollo di prima non sapeva fare domande. Il pannello non ne aveva bisogno:
l'host gli spinge il `Registro` intero dopo ogni scrittura, e per quel che sta
nei dati continua a leggerselo da sé, che è più svelto di qualunque andata e
ritorno. Le domande servono a quel che nel registro **non c'è** — il sorgente
di un modello, l'inventario dei file scritti, un PDF composto per prova, la
diagnosi dei riferimenti rotti — e a chi il registro non ce l'ha affatto: la
riga di comando, e il widget dell'agenda, che riceve schede già composte.

| procedura | dove | ingresso | che cosa torna | perché non è un'azione |
|---|---|---|---|---|
| `registro.riassunto` | [`api/procedures/registro/riassunto.ts`](../src/api/procedures/registro/riassunto.ts) | — | `versione`, `anno` (nullabile), e i conteggi di `classi`, `corsi`, `lezioni`, `valutazioni`, `consegne`, `daSmistare` | è il «che cosa ho aperto» di chi arriva da fuori |
| `corsi.elenco` | `lettura.ts` | `annoId?` (senza, l'anno in uso) | `corsi[]`: `id`, `titolo`, `classe`, `classeId`, `materia`, `allievi`, `lezioni`, `fasce` | l'indice da cui si parte per chiedere il resto |
| `corso.presenze` | `lettura.ts` | `corsoId`, `dal?`, `al?` | `udPreviste`, `udACalendario`, `righe[]` con **i tre denominatori accanto ai numeri**: `udConAppello`, `assenza` (sulle UD previste), `presenza` (su quelle con appello), `frequenza`, più `ritardi`, `prove`, `media`, `nota` | torna **il conto già fatto dal dominio** (`courseMatrix.ts`), mai i dati grezzi da ricontare: un secondo consumatore che rifacesse la divisione la rifarebbe diversa |
| `ore.appello.leggi` | [`api/procedures/ore/appello/leggi.ts`](../src/api/procedures/ore/appello/leggi.ts) | `lezioneId` | `lezioneId`, `data`, `ud`, `righe[]` | leggere l'appello non è segnarlo |
| `registro.integrita` | [`api/procedures/registro/integrita.ts`](../src/api/procedures/registro/integrita.ts) | — | `riferimentiRotti`, `riparazioni` | dice che cosa **si saprebbe** riparare; riparare è un'altra cosa, ed è un'azione |
| `documenti.inventario` | `rapporti.ts` | — | `esportazioni`, `archivio`, `composizioni`, `modelli` | guarda il documento d'anno e conta; non ci scrive |
| `modelli.leggi` | `rapporti.ts` | `nome` | `testo` (il sorgente) e `nomi: NomiModello` | **era** l'azione `modello.leggi` |
| `modelli.prova` | `rapporti.ts` | `nome`, `bozza?` (il testo non ancora salvato; senza, quello su disco) | `pdf` in base64, composto in memoria e mai scritto su disco | **era** l'azione `modello.prova` |

`NomiModello` ha dieci campi, tutti `string[]`: `valori` (i `{{segnaposto}}`),
`elenchi`, `tabelle`, `grafici`, `gallerie`, `gruppi` (su cui gira `ripeti:`),
`blocchi` (i pezzi di `_blocchi.tpl` che `usa:` richiama), `frasi`
(`_testi.tpl`, `{{frase.nome}}`), `immagini` (i file in `templates/`),
`modelli` (quelli che `estende:` può nominare). Sono calcolati dai dati veri
del registro, non da una tabella scritta a mano.

#### Il canale

Non è il canale delle azioni. È un secondo giro di buste sullo stesso IPC
(`registro:messaggio`), con due tipi propri in
[`src/protocol.ts`](../src/protocol.ts):

| verso | busta | campi | chi |
|---|---|---|---|
| pannello → host | `Domanda` | `id: number`, `procedura: string`, `ingresso?: unknown` | `chiedi()` in [`src/ui/bridge.ts`](../src/ui/bridge.ts) |
| host → pannello | `Riscontro` | `tipo: 'riscontro'`, `id`, `ok`, `dati?`, `errori?: string[]`, `codice?: string` | `rispondiDomanda()` in [`src/panels/panel.ts`](../src/panels/panel.ts) |

`chiedi<T>(procedura, ingresso)` torna un `Esito<T> = { ok, dati, errori,
codice }` e **non mostra niente da sé**: una lettura che non riesce quasi
sempre si disegna dentro il riquadro — «non è stato possibile leggere il
modello» — e non si annuncia con una notifica che passa. Il `codice` è quello
dell'API (`non-trovato`, `rifiutato`, `ingresso-non-valido`…), cioè la prima
cosa che nel protocollo di prima non c'era.

L'unico consumatore dentro il pannello è oggi **la pagina Modelli**
([`src/ui/views/templates.ts`](../src/ui/views/templates.ts)),
che con `chiedi('modelli.leggi', …)` prende sorgente e nomi e con
`chiedi('modelli.prova', …)` l'anteprima in PDF. Fuori dal pannello ci sono la
riga di comando ([`src/cli/`](../src/cli/)) e il condotto
([`src/api/transports/conduit.ts`](../src/api/transports/conduit.ts)).

#### Perché sta fuori dalla coda, e a quale condizione

`gestisci()` in `panels/panel.ts` riconosce una domanda dal campo
`procedura` e la serve **subito**, senza metterla in `this.coda`. Le scritture
invece restano in fila una dietro l'altra, ed è la garanzia più forte che il
sistema abbia: due richieste vicine — un doppio clic, un salvataggio e una
spunta nello stesso istante — non si intrecciano mai sullo stesso registro.

Il motivo di tenerne fuori le letture è pratico: una lettura è sincrona sul
registro in memoria, e metterla in fila dietro la generazione di venti PDF
vorrebbe dire un'agenda ferma dieci secondi per disegnare la settimana.

Il motivo per cui è **sicuro** farlo è uno solo, e sta scritto in tre righe di
`rispondiDomanda()`:

> una procedura che non è dichiarata `genere: 'lettura'` viene rifiutata su
> questo canale, con `codice: 'rifiutato'` e il messaggio «"x" scrive: va
> chiesta come azione, non come domanda.»

Senza quel rifiuto basterebbe il nome giusto dentro una `Domanda` per scrivere
nel registro saltando la serializzazione. Il privilegio di stare fuori dalla
coda regge su quel controllo e su nient'altro — ed è il vincolo che ADR-29
mette per iscritto.

---

## 7. Messaggi host → pannello

Tutti dichiarati in [`src/protocol.ts`](../src/protocol.ts);
`MessaggioVersoWebview` è la loro unione più `Risposta` e `Riscontro`. Il canale
è unico e bidirezionale (`registro:messaggio`); il pannello li riconosce dal
campo `tipo` in [`src/ui/bridge.ts`](../src/ui/bridge.ts).

Le buste sono otto, e si leggono in due gruppi: quelle che **rispondono** a
qualcosa che il pannello ha chiesto — `Risposta` a una `Richiesta`, `Riscontro`
a una `Domanda`, ciascuna correlata per `id` — e quelle che l'host **spinge**
senza che nessuno le abbia chieste.

### 7.0 Quadro d'insieme

| Messaggio | `tipo` | Chi lo emette | Chi lo consuma | Quando |
|---|---|---|---|---|
| `Risposta` | `'risposta'` | `pannelli/pannello.ts: eseguiRichiesta()`, o il ramo «azione sconosciuta» | `ponte.ts`, che risolve la `Promise` in `inAttesa` | dopo ogni `Richiesta`, **sempre dopo** l'eventuale `MessaggioStato` |
| `Riscontro` | `'riscontro'` | `pannelli/pannello.ts: rispondiDomanda()` | `ponte.ts`, che risolve la `Promise` in `domandeInAttesa` | dopo ogni `Domanda`, **fuori dalla coda delle scritture** (§6.17): non aspetta le richieste in fila davanti |
| `MessaggioStato` | `'stato'` | `pannelli/pannello.ts: flushStato()` | `ui/state.ts` (lo store del client) | dopo ogni azione con `ok && !invariato`; su `archivio.alCambiamento` (anche cambi esterni al file); a ogni cambio di una `registroDocenti.*`; a ogni cambio dell'elenco documenti |
| `MessaggioNavigazione` | `'naviga'` | `apriRegistro()` / `PannelloRegistro.naviga()`, chiamate da comandi di menu, vassoio, agenda, promemoria | `ui/main.ts` (router); messo in coda in `navigazioneInAttesa` se il webview non ha ancora mandato `stato.leggi` | quando qualcosa fuori dal pannello chiede di aprirlo su un posto preciso |
| `MessaggioNotifica` | `'notifica'` | `PannelloRegistro.avvisa()` | `components/notifications.ts` | errori non legati a una richiesta puntuale (file-watcher, errori d'archivio) e ogni eccezione non catturata in un gestore |
| `MessaggioLavoro` | `'lavoro'` | `Smistatore.allAvanzamento` (`src/data/sorter.ts`), sottoscritto in `panel.ts` | UI di smistamento e quarantena | a ogni pagina letta dall'OCR (circa una al minuto) |
| `MessaggioProiezione` | `'proiezione'` | `pannelli/proiezione.ts: PannelloProiezione.spingi()` (debounce a microtask) | **solo** il webview della proiezione | a ogni cambio di mira, impostazioni o registro |
| `MessaggioStatoProiezione` | `'proiezione.stato'` | `pannelli/proiezione.ts: annuncia()` | **solo** il pannello principale | quando la proiezione si apre, si chiude o cambia impostazioni |

Il verso opposto sono due buste, e `gestisci()` in `panels/panel.ts` le
distingue da un campo:

- `Richiesta { id: number; azione: Azione }` — la scrittura, emessa da
  `ponte.ts: invia()`. Va **in coda**, una dietro l'altra.
- `Domanda { id: number; procedura: string; ingresso?: unknown }` — la lettura,
  emessa da `ponte.ts: chiedi()`. Riconosciuta perché `typeof busta.procedura
  === 'string'`, servita subito, **fuori dalla coda** (§6.17).

Il contatore degli `id` è uno solo per tutte e due, incrementale e mai riusato
nella vita della pagina.

### 7.1 `Risposta`

| campo | tipo | significato | chi lo riempie |
|---|---|---|---|
| `tipo` | `'risposta'` | discriminante | sempre |
| `id` | `number` | lo stesso numero della `Richiesta`, identico | sempre |
| `ok` | `boolean` | l'azione è andata a buon fine | sempre |
| `errori` | `string[]` (facoltativo) | messaggi in italiano, pensati per essere mostrati così come sono in testa al modulo aperto | ogni `rifiuta(...)`, più il catch generale e il ramo «Azione sconosciuta» |
| `creato` | `{ id: string }` (facoltativo) | l'entità appena nata, perché la vista ci si apra sopra | `anno.crea`, `materia.salva`, `corso.crea`, `corso.salva`, `classe.salva`, `piano.salva`, `piano.duplica`, `piano.perLezione`, `valutazione.salva`, `valutazione.daAttivita`, `lezione.salva`, `lezione.duplica`, `consegna.salva`, `assenze.salva`, `composizione.crea` |
| `documento` | `string` (facoltativo) | il percorso del documento appena scritto, relativo alla cartella dei dati; la pagina Documenti lo apre nella sua cornice | `rapporto.genera` |
| `messaggio` | `Messaggio` = `{livello: 'info' \| 'avviso' \| 'errore', testo: string}` (facoltativo) | quel che l'host vuole dire a chi ha chiesto: «12 lezioni aggiunte», «3 spediti, 1 indietro» | ogni `conMessaggio(...)` |

**Sette campi, non dieci.** Qui stavano anche `testo`, `nomi` e `pdf`: tre
campi facoltativi che ogni `Risposta` si portava dietro — un salvataggio di
voto, una spunta, una riga d'appello — per servire `modello.leggi` e
`modello.prova`, due chiamate su centoquarantatré, e due chiamate che scrittura
non erano. Sono spariti da `Risposta` e dal suo gemello interno `EsitoAzione`
([`src/actions/context.ts`](../src/actions/context.ts)) quando quelle due sono
diventate le letture `modelli.leggi` e `modelli.prova`: adesso quel che tornano
lo dichiara il loro schema d'uscita, e `Riscontro.dati` lo porta senza che
nessun altro debba portarselo dietro (§6.17, §7.8).

**Ordine garantito**: se l'azione è riuscita e ha cambiato qualcosa, il
`MessaggioStato` viene spedito **prima** della `Risposta`, apposta: quando la
`Promise` del client si risolve, il registro è già quello nuovo.
**Non c'è timeout**: una richiesta senza risposta resta appesa per sempre, senza
watchdog lato client.

### 7.2 `MessaggioStato`

| campo | tipo | perché è lì |
|---|---|---|
| `tipo` | `'stato'` | discriminante |
| `registro` | `Registro` | **l'intero documento**: anni, materie, classi, corsi, lezioni, piani, valutazioni, fascicoli, consegne, smistamenti, coordinate, impostazioni. Non c'è push differenziale |
| `programma` | `VoceProgramma[]` | le impostazioni macchina, che il webview non può leggere da sé (sandbox). Ogni voce: `chiave`, `tipo`, `descrizione`, `formato`, `scelte`, `predefinito`, `valore`, `scritta` |
| `avvisi` | `string[]` | le riparazioni pendenti da mostrare in cima al guscio |
| `radiceDati` | `string \| null` | la cartella dei dati come indirizzo `registro://` caricabile dentro la sandbox: serve alle immagini |
| `radiceApp` | `string \| null` | la radice dei bundle, per dire a pdf.js dove stanno i caratteri standard del PDF: senza, le miniature userebbero un carattere di ripiego |
| `ocrAttivo` | `boolean` | se la lettura automatica delle scansioni è accesa: senza saperlo la quarantena offrirebbe un pulsante che risponde solo «è spento» |
| `posta.exchange` | `boolean` | la casella è collegata (indirizzo scritto + gettone nel portachiavi) |
| `posta.server` | `string` | il server a cui si consegna |
| `posta.invioDiretto` | `boolean` | se si spedisce invece di preparare bozze |
| `posta.mittente` | `string` | l'indirizzo che le famiglie vedono in «Da» |
| `posta.accesso` | `string` | il nome con cui si entra, quando è diverso dall'indirizzo |
| `documenti.corrente` | `string \| null` | il percorso del documento in uso |
| `documenti.elenco` | `DocumentoRecente[]` | `{percorso, nome, cartella, preferito, mancante}` — recenti e messi da parte |
| `esportati` | `DocumentoEsportato[]` | l'inventario di `esportazioni/`: `{percorso, misura, revisione}` |
| `archiviati` | `DocumentoEsportato[]` | l'inventario di `archivio/`: stessa forma, mestiere diverso (l'anteprima deve sapere che il foglio c'è ancora, quanto misura e quante volte è stato riscritto) |
| `composizioni` | `Composizione[]` | i fascicoli composti dell'anno: nome, di che cosa sono fatti, quando rifatti |
| `modelli` | `VoceModello[]` | che cosa c'è in `templates/`, **senza il testo dei file** |

`DocumentoEsportato.revisione` conta quante volte quel file è stato riscritto da
quando l'anno è aperto: serve perché il lettore PDF tiene in memoria quel che ha
caricato, e un rapporto rifatto sta allo stesso percorso di prima.

`VoceModello` ha undici campi: `nome`, `file`, `titolo`, `ruolo`, `aiuto`,
`genere` (`GenereRapporto | null`), `misura`, `suDisco`, `haDiSerie`,
`modificato`, `arretrato`. `arretrato` è l'unica cosa che il registro sa e chi
lo usa no: il modello è modificato **e** la copia di serie è cambiata da quando
lo si è salvato.

### 7.3 `MessaggioNavigazione`

| campo | tipo | significato |
|---|---|---|
| `tipo` | `'naviga'` | discriminante |
| `vista` | `Vista` | la destinazione, fra i 16 valori dichiarati nel protocollo |
| `elementoId` | `string` (facoltativo) | l'elemento su cui aprirsi; `contestoDellElemento(vista, id)` risale da solo la catena prova → corso → classe → semestre |
| `data` | `Iso` (facoltativo) | il giorno su cui posizionarsi |
| `nuovo` | `boolean` (facoltativo) | apre direttamente il modulo di creazione della vista di destinazione |
| `avvio` | `boolean` (facoltativo) | apre l'avvio guidato: anno, classe, materia e orario in una finestra sola |

### 7.4 `MessaggioNotifica`

| campo | tipo | significato |
|---|---|---|
| `tipo` | `'notifica'` | discriminante |
| `livello` | `'info' \| 'avviso' \| 'errore'` | il tono del toast |
| `testo` | `string` | il messaggio, già in italiano |

### 7.5 `MessaggioLavoro`

È un messaggio a sé e non un pezzo dello stato perché cambia a ogni pagina —
circa ogni minuto — mentre il registro resta fermo.

| campo | tipo | significato |
|---|---|---|
| `tipo` | `'lavoro'` | discriminante |
| `corrente` | `{smistamentoId: string, pagina: number, etichetta: string} \| null` | la pagina che si sta leggendo adesso |
| `fatte` | `number` | quante pagine sono già state lette in questa infornata |
| `totale` | `number` | quante erano |
| `coda` | `Array<{smistamentoId, pagina, etichetta}>` | quel che aspetta |

### 7.6 `MessaggioProiezione`

| campo | tipo | significato |
|---|---|---|
| `tipo` | `'proiezione'` | discriminante |
| `contenuto` | `ContenutoProiezione` | il pacchetto **già filtrato**: solo i blocchi accesi, mai il registro con dentro un interruttore. La scelta di che cosa esce si applica nell'host, dove sta scritta in un posto solo |
| `radiceDati` | `string \| null` | la cartella dei dati vista dal webview: serve alle immagini delle risorse |

La finestra di proiezione non rimanda **mai** niente indietro: è un webview di
sola lettura con il proprio bootstrap minimo.

### 7.7 `MessaggioStatoProiezione`

| campo | tipo | significato |
|---|---|---|
| `tipo` | `'proiezione.stato'` | discriminante |
| `aperta` | `boolean` | se la finestra di proiezione è viva |
| `impostazioni` | `ImpostazioniProiezione` | `blocchi` accesi, `aperto`, `sospesa`, `nomi`, `compatta`, `calendario` |

Va **al pannello del docente**, non alla proiezione: è lui a disegnarne i
comandi, perché ogni comando sullo schermo grande è un comando che si preme
davanti a tutti.

### 7.8 `Riscontro`

La risposta a una `Domanda` (§6.17). È l'unica busta del protocollo che non
nasce da una `Richiesta` né da un cambiamento di stato.

| campo | tipo | significato | chi lo riempie |
|---|---|---|---|
| `tipo` | `'riscontro'` | discriminante | sempre |
| `id` | `number` | lo stesso numero della `Domanda`, identico | sempre |
| `ok` | `boolean` | la lettura è riuscita | sempre |
| `dati` | `unknown` (facoltativo) | quel che la procedura ha risposto, **nella forma che il suo schema d'uscita dichiara** — convalidata dal nucleo prima di partire | ogni lettura riuscita |
| `errori` | `string[]` (facoltativo) | le frasi in italiano, già pronte da mostrare | ogni rifiuto |
| `codice` | `string` (facoltativo) | il codice dell'API: `non-trovato`, `rifiutato`, `ingresso-non-valido`, `conflitto`, `non-disponibile`, `procedura-sconosciuta`, `non-permesso`, `interno` | ogni rifiuto |

Due cose lo distinguono da `Risposta`, e non sono dettagli.

La prima: **`dati` è tipizzato dal chiamante** (`chiedi<T>(…)`) e garantito
dall'host, perché il nucleo convalida anche l'*uscita* di una procedura contro
lo schema che la procedura dichiara. Se rispondesse in una forma diversa, il
nucleo risponde `interno` invece di lasciar arrivare nel pannello un oggetto
storto che si manifesterà tre ridisegni più tardi.

La seconda: **`codice` c'è.** Nella `Risposta` gli errori sono frasi e basta —
si leggono, non si distinguono senza confrontare stringhe (vedi §11 di
[ARCHITETTURA](ARCHITETTURA.md), voce 14). Qui il codice arriva fino alla
pagina.

---

## 8. Canali del guscio

Sopra il canale IPC unico `registro:messaggio` convivono **cinque
sotto-protocolli** distinti, ognuno con un discriminante di stringa diverso nel
payload e un type guard scritto a mano (`eRichiesta`, `eComando`, `eRisposta`).
Ogni ascoltatore filtra per `evento.sender.id` perché più finestre condividono
lo stesso canale. Un refuso nel discriminante fallisce in silenzio: il listener
scarta il messaggio senza log.

| Sotto-protocollo | Discriminante | Finestra | File |
|---|---|---|---|
| Webview del registro e della proiezione | nessuno (è la forma `Richiesta`/`Domanda` in salita e `MessaggioVersoWebview` in discesa: il protocollo vero, §6–§7) | Pannello, Proiezione | [`src/environment/windows.ts`](../src/environment/windows.ts) |
| Benvenuto | `benvenuto: '…'` | Benvenuto | [`shell/windows/welcome.ts`](../shell/windows/welcome.ts) + [`shell/pages/welcome/welcome.html`](../shell/pages/welcome/welcome.html) |
| Impostazioni | `impostazioni: '…'` | Impostazioni | [`shell/windows/menu.ts`](../shell/windows/menu.ts) + [`shell/pages/settings/settings.html`](../shell/pages/settings/settings.html) |
| Dialogo | `dialogo: '…'` | Dialogo (input/elenco) | [`src/environment/dialogs.ts`](../src/environment/dialogs.ts) + [`shell/pages/dialog/dialog.html`](../shell/pages/dialog/dialog.html) |
| Agenda | `agenda: { … }` | Agenda (widget) | [`src/environment/agenda.ts`](../src/environment/agenda.ts) + [`shell/pages/agenda/agenda.html`](../shell/pages/agenda/agenda.html) |

### 8.1 Benvenuto

**Pagina → main** (`type Richiesta`):

| comando | payload | che cosa fa |
|---|---|---|
| `{benvenuto: 'pronto'}` | — | la pagina è disegnata: `aperta.show()` |
| `{benvenuto: 'apri'}` | — | apre il dialogo di sistema per scegliere un `.registro` |
| `{benvenuto: 'apriPercorso'}` | `percorso: string` | apre quel documento |
| `{benvenuto: 'crea'}` | — | risolve con `{tipo:'crea'}` |
| `{benvenuto: 'preferito'}` | `percorso: string`, `valore: boolean` | mette da parte un documento o lo rimette fra i recenti |
| `{benvenuto: 'dimentica'}` | `percorso: string` | toglie il documento dall'elenco |
| `{benvenuto: 'esci'}` | — | chiude senza scelta |

**Main → pagina**: `{benvenuto: 'elenco', invito, versione, voci}` — mandato al
`did-finish-load` e ogni volta che `documentiNoti()` cambia (`alCambioDocumenti`).

**Esito** (`type Scelta`): `{tipo:'apri', documento: Uri}` |
`{tipo:'crea'}` | `{tipo:'altrove'}` (la finestra si è chiusa perché un
documento è arrivato da un'altra strada — non è una rinuncia) | `null`.

### 8.2 Impostazioni

**Pagina → main** (`type Richiesta`):

| comando | payload | che cosa fa |
|---|---|---|
| `{impostazioni: 'pronto'}` | — | mostra la finestra |
| `{impostazioni: 'apriPannello'}` | — | esegue `registroDocenti.impostazioni` e chiude questa finestra (la pagina vera sta nel pannello, questa è il ripiego) |
| `{impostazioni: 'scrivi'}` | `chiave: string`, `valore: unknown` | `getConfiguration().update(...)`, poi risponde con `annunciaValore` |
| `{impostazioni: 'azzera'}` | `chiave: string` | `update(chiave, undefined)`, poi `annunciaValore` |

**Main → pagina**:

| risposta | payload | quando |
|---|---|---|
| `{impostazioni: 'valore'}` | `chiave`, `valore`, `scritta` | dopo ogni `scrivi`/`azzera` |
| `{impostazioni: 'schema'}` | `titolo`, `voci: VoceProgramma[]`, `filtro` | al `did-finish-load` |
| `{impostazioni: 'filtro'}` | `testo: string` | quando si riporta la finestra in primo piano con un filtro già scelto |

### 8.3 Dialogo

Il tipo e i parametri arrivano **nella query string** dell'URL
(`registro://app/dist/dialogo.html?p=<json>`), non via IPC: così la pagina ha i
suoi dati al primo render. Solo la risposta passa dal canale.

**Pagina → main** (`type Risposta`):

| risposta | payload | significato |
|---|---|---|
| `{dialogo: 'conferma'}` | `indice?: number`, `testo?: string` | scelta confermata: indice per la variante elenco (`showQuickPick`), testo per la variante campo (`showInputBox`) |
| `{dialogo: 'annulla'}` | — | rinuncia (Esc o clic fuori) |
| `{dialogo: 'valida'}` | `testo: string` | chiede all'host di convalidare quel che si sta scrivendo, mentre lo si scrive |
| `{dialogo: 'altezza'}` | `valore: number` | la pagina dice quanto è alta, perché la finestra si adatti |

### 8.4 Agenda

**Pagina → main**: `ponte.postMessage({agenda: comando})` con **18 varianti**
di `ComandoAgenda`.

| comando | payload | che cosa fa |
|---|---|---|
| `{tipo:'settimana'}` | `lunedi: string` | mostra un'altra settimana |
| `{tipo:'oggi'}` | — | torna a oggi |
| `{tipo:'apri'}` | `lezioneId: string` | apre il registro su quell'ora |
| `{tipo:'registro'}` | — | apre il registro |
| `{tipo:'apriDocumento'}` | — | apre un documento d'anno |
| `{tipo:'chiudi'}` | — | chiude il widget |
| `{tipo:'scheda'}` | `scheda: 'calendario' \| 'pendenze' \| 'lezione'` | la linguetta premuta; si ricorda in `registroDocenti.agenda.scheda` |
| `{tipo:'mese'}` | `primo: string` | le frecce sopra la griglia del mese |
| `{tipo:'giorno'}` | `data: string` | una casella del mese premuta: la settimana sotto ci si sposta |
| `{tipo:'ora'}` | `lezioneId: string \| null` | l'ora che la scheda «lezione» tiene sotto gli occhi; `null` torna ad adesso |
| `{tipo:'presenza'}` | `lezioneId`, `allievoId`, `stato: string` | una riga d'appello: tutte le unità didattiche di quella persona insieme |
| `{tipo:'presenzeTutti'}` | `lezioneId`, `stato: string` | tutta la classe in un gesto |
| `{tipo:'argomenti'}` | `lezioneId`, `testo: string` | l'argomento battuto mentre l'ora è in corso |
| `{tipo:'chiudiOra'}` | `lezioneId: string` | «Fatta»: l'ora si segna svolta |
| `{tipo:'apriPendenze'}` | `classeId: string` | il registro si apre sulla scheda di quella classe |
| `{tipo:'larghezza'}` | `x: number` | il bordo sinistro trascinato, in pixel Electron |
| `{tipo:'altezza'}` | `y: number` | il bordo di sotto trascinato |
| `{tipo:'sposta'}` | `x: number`, `y: number` | la testata trascinata: dove va l'angolo in alto a sinistra |

**Main → pagina**: `{tipo:'agenda', ...datiScheda}` (il contenuto della scheda
corrente) e `{tipo:'agenda.misure', celle, celleAltezza, libero}` (le misure
dopo un trascinamento, convertite da pixel a celle di icone del desktop).

L'agenda è l'**unico webview oltre al pannello che può scrivere sui dati**, e
per un pezzo è stata anche l'unico posto dove gli enum in arrivo venivano
ricontrollati a mano — un elenco degli stati dell'appello copiato dentro
[`src/agenda.ts`](../src/agenda.ts), perché «un messaggio malformato non deve
poter scrivere *pres3nte* dentro l'appello di una classe», e perché il tipo che
tiene insieme pannello e host non arriva fin qui.

Quell'elenco non c'è più. Adesso `scrivi()` passa dal nucleo dell'API —
`chiama(archivio, procedura, ingresso, { origine: 'agenda' })` — e il controllo
lo fa lo schema della procedura, una volta, per tutti quelli che chiamano. Ci
si guadagnano altre due cose che qui mancavano: un rifiuto adesso **si vede**
(prima l'esito si buttava via e la striscia continuava a mostrare quel che
credeva; ora finisce in un `showErrorMessage`), e `origine: 'agenda'` lascia nel
giornale la differenza fra quel che ha scritto la striscia e quel che ha
scritto il pannello — che è la prima domanda che si fa quando un dato risulta
cambiato e nessuno se lo ricorda.

### 8.5 Il canale sincrono `registro:interfaccia`

Non fa parte del protocollo applicativo. È `ipcRenderer.sendSync`, invocato una
volta al boot di ogni pagina da [`shell/preload.ts`](../shell/preload.ts):

| chiamata | argomenti | risposta |
|---|---|---|
| `sendSync('registro:interfaccia', 'leggi')` | — | lo stato-UI locale persistito di quella finestra (il `getState()` di `acquireVsCodeApi()`) |
| `sendSync('registro:interfaccia', 'scrivi', nuovo)` | il nuovo stato | — |

Risponde `gestisciStatoInterfaccia` in
[`src/environment/windows.ts`](../src/environment/windows.ts), filtrando per tipo di
finestra (`tipiFinestre`). È ciò che fa ritrovare il pannello dove lo si era
lasciato: `StatoPersistito`, una trentina di campi di `stato.ts` (vista, pagina,
schede, filtri, id selezionati). **Non confonderlo con `MessaggioStato`**: quello
porta i dati, questo porta le preferenze di visualizzazione.

### 8.6 Le 4 autorità di `registro://`

Schema custom registrato da
[`shell/protocol/fileProtocol.ts`](../shell/protocol/fileProtocol.ts) —
`privilegiaSchema()` prima di `app.whenReady()`, poi `registraProtocollo()`.
È l'equivalente desktop di `asWebviewUri`.

| Autorità | Forma dell'URL | Che cosa serve | Sorgente |
|---|---|---|---|
| `pagina` | `registro://pagina/<id>` | l'HTML delle `VistaWeb` (pannello e proiezione) | `htmlDellaPagina(id)` in `src/environment/windows.ts`, in memoria |
| `app` | `registro://app/dist/pannello.js` | i bundle e le pagine HTML del guscio | `Uri.joinPath(radiceApp(), ...segmenti)`, verificato da `concesso()` |
| `dati` | `registro://dati/D:/…/foto.png` | i file del docente: foto, PDF, risorse | `Uri.file(segmenti.join('/'))`, verificato da `concesso()` |
| `mappa` | `registro://mappa/<z>/<x>/<y>.png` | i tasselli OpenStreetMap in cache | [`shell/protocol/tiles.ts`](../shell/protocol/tiles.ts): cache in `userData/tasselli/`, altrimenti scarica |

Difese del protocollo:

- rifiuta i segmenti `.` e `..` **dopo** `decodeURIComponent` (per bloccare
  `%2e%2e`) → 403;
- `concesso(file)`: il file deve stare dentro una delle `radiciConcesse()` —
  la cartella `dist/` più le radici concesse ai pannelli aperti, in unione
  globale (la richiesta arriva senza sapere quale finestra l'ha fatta);
- `conOrigine`: rimanda `Access-Control-Allow-Origin` uguale all'origine
  richiedente, e solo se comincia per `registro://`; mai `*`;
- streaming con `net.fetch(pathToFileURL(...))`: niente file interi in memoria;
- `serviFile` materializza su richiesta i file del documento non ancora estratti
  dal pacchetto (`deposito()?.materializzaChiesto(file)`);
- `leggiCoordinate` valida z/x/y come interi entro `ZOOM_MASSIMO = 19` prima di
  comporre il percorso di cache.

---

## 9. Rapporti e modelli di stampa

### 9.1 Gli 8 `GenereRapporto`

Fonte: [`src/domain/locations.ts`](../src/domain/locations.ts). I dati
che finiscono dentro ogni foglio li compone
[`src/domain/reportData.ts`](../src/domain/reportData.ts); il PDF lo
disegna [`src/data/reportsPdf.ts`](../src/data/reportsPdf.ts).

**Regola del percorso** (`sotto` + `percorsoEsportazione`):

```
esportazioni/<ambito | 'docente-di-classe'>/<classe>/{ 'classe' | 'allievi'/<Cognome Nome> }/<file>
```

dove ogni pezzo passa da `nomeSicuro()` e l'«ambito» è la materia (o il titolo)
del corso.

**Regola del nome** (`nomeFileArchivio` + `intestazione`): i pezzi non vuoti di

```
[ <anno>_<classe>_<ambito|docente-di-classe> , <documento> , <chi> , <dettaglio> ]
```

uniti con `_`, più l'estensione minuscola. `dataNelNome` → `AAMMGG`
(es. `260907`); `oraNelNome` → `HH.MM` (es. `08.20`); `etichettaPeriodo` →
l'etichetta del semestre oppure `anno intero`.

| # | genere | quando si genera | dove finisce il file | nome che prende | formati | che cosa ci finisce dentro |
|---|---|---|---|---|---|---|
| 1 | `lezione` | `rapporto.genera`; automaticamente quando un'ora è segnata svolta (`aggiornaDopoChiusura`) e col debounce se `pdfAutomatici === 'sempre'`; `rapporto.completo` | `esportazioni/<materia>/<classe>/classe/` | `<anno>_<classe>_<materia>_Verbali_<AAMMGG> <HH.MM>.pdf` (`datato: false`) | PDF, **MD** (`esporta.lezione`, stesso posto) | `datiLezione(registro, lezione, consegne)`: appello, consuntivo, osservazioni, consegne di quell'ora |
| 2 | `piano` | `rapporto.genera`; `rapporto.completo` | `esportazioni/<materia>/<classe>/classe/` | `<anno>_<classe>_<materia>_Piani_<documentoPiano>.pdf`, dove `documentoPiano` è `Piano <AAMMGG> <HH.MM>` se il piano sta su un'ora, `Piano bozza <AAMMGG>[ (n)]` se è una bozza, `Piano in preparazione` altrimenti (`datato: false`) | PDF | `datiPiano(registro, piano)`: la scaletta dell'ora |
| 3 | `valutazioni` | `rapporto.genera`; `rapporto.completo`; automatico su chiusura d'ora e col debounce | `esportazioni/<materia>/<classe>/classe/` | `<anno>_<classe>_<materia>_Valutazioni_<etichetta semestre \| anno intero>.pdf` (`datato: false`) | PDF, **CSV** (`esporta.valutazioni`, `percorsoCsv`, stesso nome) | `datiValutazioni(registro, corso, semestre)`: riga per allievo, colonna per prova, medie |
| 4 | `presenze` | come sopra | `esportazioni/<materia>/<classe>/classe/` | `<anno>_<classe>_<materia>_Presenze_<etichetta semestre \| anno intero>.pdf` (`datato: false`) | PDF, **CSV** (`esporta.presenze`) | `datiPresenze(registro, corso, semestre)`: assenze, ritardi, percentuali sul previsto d'orario |
| 5 | `momento` | `rapporto.genera`; `rapporto.completo`; automatico col debounce | `esportazioni/<materia>/<classe>/classe/` | `<anno>_<classe>_<materia>_Prove_<titolo[ (n)]>_<AAMMGG della prova>.pdf` — il `(n)` distingue prove omonime dello stesso giorno (`datato: false`) | PDF | `datiMomento(registro, momento)`: la prova per esteso con la distribuzione dei voti |
| 6 | `fascicolo` | `rapporto.genera`; `rapporto.completo` | `esportazioni/docente-di-classe/<classe>/classe/` — l'ambito è forzato a `null`: il fascicolo non è di una materia | `<anno>_<classe>_docente-di-classe_Fascicolo_<AAMMGG del giorno di stampa>.pdf` (**`datato: true`**) | PDF | `datiFascicolo(registro, classe)`: recapiti, documenti, assenze della classe |
| 7 | `foto-classe` | `rapporto.genera` (dalla pagina Documenti, scheda Corso) | `esportazioni/<materia del corso da cui si chiede \| docente-di-classe>/<classe>/classe/` | `<anno>_<classe>_<ambito>_Foto della classe_<AAMMGG del giorno di stampa>.pdf` (**`datato: true`**) | PDF | `datiFotoClasse(registro, classe)`: i ritratti con i nomi sotto |
| 8 | `allievo` | `rapporto.genera`; `rapporto.completo`; automatico col debounce | `esportazioni/<materia \| docente-di-classe>/<classe>/allievi/<Cognome Nome>/` | `<anno>_<classe>_<ambito>_Scheda PiF_<Cognome Nome>_<etichetta semestre \| anno intero>.pdf` (`datato: false`) | PDF | `datiAllievo(registro, classe, allievo, semestre, corso)`: voti, presenze, osservazioni |

I due documenti `datato: true` (`fascicolo`, `foto-classe`) portano il giorno di
stampa nel nome e quindi ne nasce una copia nuova ogni giorno; sono gli unici
esclusi da `percorsiDiUnDocumento`, che serve a chi elimina per trovare tutte le
versioni di uno stesso foglio.

Per `allievo` e `foto-classe` il corso lo dice `contesto.corsoId`; se manca e la
classe ha un corso solo, è quello; con più corsi e nessuno indicato l'ambito
resta `null` e la cartella diventa `docente-di-classe`.

**Funzioni e costanti esportate da `locations.ts`**

| Nome | Scopo |
|---|---|
| `ARCHIVIO = 'archivio'` | la radice dei documenti **caricati** (unica copia, non rifacibile) |
| `ESPORTAZIONI = 'esportazioni'` | la radice dei documenti **generati** (sempre rifacibili) |
| `QUARANTENA = 'quarantena'` | la sala d'attesa dei PDF di classe non ancora divisi |
| `DOCENTE_DI_CLASSE = 'docente-di-classe'` | la cartella di ciò che non appartiene a una materia |
| `DI_CLASSE = 'classe'` | la sottocartella dei documenti di tutta la classe |
| `DEGLI_ALLIEVI = 'allievi'` | la sottocartella delle schede personali |
| `FOTO = 'foto'` | la cartella dei ritratti |
| `percorsoArchivio(classe, ambito, file, chi?)` | percorso sotto `archivio/` |
| `percorsoEsportazione(classe, ambito, file, chi?)` | lo stesso sotto `esportazioni/` |
| `nomeFileArchivio(classe, chi, documento, dettaglio, estensione)` | l'unico posto che incolla i pezzi del nome file |
| `cartellaDelPercorso(relativo)` | la cartella che contiene un percorso |
| `documentoPiano(registro, piano)` | il nome stabile del dettaglio di un piano |
| `percorsoDi(collocazione, estensione = 'pdf')` | **la funzione che produce anche CSV e Markdown**: l'estensione è un parametro, e `actions/system.ts` la chiama con `'csv'` e `'md'` |
| `radiceDi(collocazione)` | il prefisso senza dettaglio né estensione: così si riconoscono le copie dei `datato` |
| `precedentiDi(collocazione)` | i vecchi nomi della stessa scheda (`DOCUMENTO_SCHEDE_PRIMA = ['Schede allievo', 'Scheda allievo', 'Schede PiF']`), per non lasciare orfani |
| `collocazioneDi(registro, genere, id, contesto?)` | la collocazione completa, con l'anno scolastico in testa |
| `percorsiDiUnDocumento(registro, genere, id, dentro?)` | tutti i percorsi con cui quel documento può essere stato scritto (ogni periodo, ogni corso), per chi elimina; esclude i `datato` |
| tipi `GenereRapporto`, `Collocazione`, `ContestoRapporto` | il vocabolario |

### 9.2 Le 13 voci di `CATALOGO_MODELLI`

Fonte: [`src/domain/templateCatalog.ts`](../src/domain/templateCatalog.ts).

`RuoloModello` ha quattro valori:

| Ruolo | Significato |
|---|---|
| `comune` | uno **strato** sotto tutti: cambiandolo cambiano tutti i rapporti |
| `rapporto` | disegna un foglio solo, quello che porta il suo nome |
| `posta` | non è un rapporto: è la firma in fondo alle e-mail |
| `immagine` | un file che i modelli mostrano (il logo della sede) |

Nessuna voce del catalogo ha oggi ruolo `immagine`: il valore esiste per i file
portati con `modello.immagine`, e `nomiDelModello` in `actions/templates.ts` filtra
via `immagine` e `posta`.

| # | nome | file su disco | titolo | ruolo (strato) | genere per l'anteprima | a che cosa serve |
|---|---|---|---|---|---|---|
| 1 | `_base` | `_base.tpl` | Intestazione e piede | `comune` | `lezione` | Testata e piè di pagina di tutti i rapporti: sede, logo, firma |
| 2 | `_stile` | `_stile.tpl` | Misure del foglio | `comune` | `valutazioni` | Formato, margini, corpi, altezza delle righe |
| 3 | `_testi` | `_testi.tpl` | Frasi e nomi delle colonne | `comune` | `presenze` | Le frasi con dentro un numero e i titoli delle colonne (`{{frase.nome}}`) |
| 4 | `_blocchi` | `_blocchi.tpl` | Pezzi riusabili | `comune` | `lezione` | I pezzi di corpo richiamati con `usa:`: apertura, appello |
| 5 | `verbale-lezione` | `verbale-lezione.tpl` | Verbale della lezione | `rapporto` | `lezione` | Il foglio di un'ora svolta: appello, consuntivo, osservazioni |
| 6 | `piano-lezione` | `piano-lezione.tpl` | Piano lezione | `rapporto` | `piano` | La scaletta di un'ora, da avere in mano prima di entrare |
| 7 | `valutazioni-classe` | `valutazioni-classe.tpl` | Griglia dei voti | `rapporto` | `valutazioni` | Riga per allievo, colonna per prova, media in fondo |
| 8 | `presenze-classe` | `presenze-classe.tpl` | Presenze della classe | `rapporto` | `presenze` | Assenze, ritardi e percentuali di un corso nel periodo |
| 9 | `scheda-allievo` | `scheda-allievo.tpl` | Scheda personale | `rapporto` | `allievo` | Il foglio di una persona in formazione: voti, presenze, osservazioni |
| 10 | `momento-valutazione` | `momento-valutazione.tpl` | Scheda di una prova | `rapporto` | `momento` | Una prova per esteso, con la distribuzione dei voti |
| 11 | `fascicolo-classe` | `fascicolo-classe.tpl` | Fascicolo di classe | `rapporto` | `fascicolo` | Il quadro della classe per chi ne è docente: recapiti, documenti, assenze |
| 12 | `foto-classe` | `foto-classe.tpl` | Parete di ritratti | `rapporto` | `foto-classe` | Le facce della classe su un foglio solo, con i nomi |
| 13 | `_firma.html` | `_firma.html` | Firma delle e-mail | `posta` | — | Quel che il registro mette in fondo a ogni messaggio. È HTML, non un `.tpl` |

L'ordine è quello dell'elenco a schermo: prima i quattro strati comuni, poi gli
otto rapporti (uno per `GenereRapporto`), in fondo la firma. Gli strati comuni
non hanno un genere proprio e ne prendono uno in prestito per l'anteprima
(`genereDiProva`).

Altre funzioni esportate: `voceModello(nome)`, `titoloModello(nome)`,
`genereDiProva(nome)`, `fileDelModello(nome)`, `modelloDelFile(file)`,
`nomeFileAmmesso(file)` (`^[A-Za-z0-9_ -]+\.(tpl|html|png|jpe?g)$`),
`fileDiTesto(file)` (`.tpl` e `.html`), `sorteModello(quadro)` che torna
`'manca' | 'aggiorna' | 'uguale' | 'tuo' | 'arretrato'`.

### 9.3 Il motore di template

File `.tpl` in `templates/`, risolti in due fasi
([`src/domain/reports.ts`](../src/domain/reports.ts) +
[`src/data/reportsPdf.ts`](../src/data/reportsPdf.ts)): `componiCorpo` espande
le direttive in un albero di blocchi e pota le sezioni vuote, poi `componiPdf`
disegna con pdf-lib.

| Direttiva | Forma | Che cosa fa |
|---|---|---|
| segnaposto | `{{valore}}` | sostituisce un valore |
| frase | `{{frase.nome}}` | una frase da `_testi.tpl` |
| elenco | `elenco:` | una lista |
| tabella | `tabella: nome \| Col1, Col2` | una tabella con le sue colonne |
| grafico | `grafico:` | l'istogramma dei voti |
| galleria | `galleria: \| colonne N \| altezza N` | una parete di immagini |
| immagine | `immagine: file \| altezza N \| sinistra\|destra` | un'immagine singola |
| ciclo | `ripeti: gruppo` … `fine:` | cicli annidati fino a un tetto |
| condizione | `se:` … `altrimenti:` … `fine:` | rami condizionali |
| richiamo | `usa: blocco` | richiama un pezzo di `_blocchi.tpl` |
| ereditarietà | `estende: modello` | catena di ereditarietà, tetto di profondità 3, cicli interrotti in silenzio |

---

## 10. Moduli (form)

[`src/ui/forms/`](../src/ui/forms/) contiene **14 file**: 13
di moduli veri più `comune.ts`, che è l'infrastruttura. I punti d'ingresso
esportati sono **25**.

**Pattern comune**: dati di partenza (l'oggetto esistente, oppure una `crea*` di
[`src/domain/factories.ts`](../src/domain/factories.ts)) →
`apriModale({titolo, larghezza, corpo, alSalva, azioniSecondarie})` → corpo
costruito con `campo()`/`riga()`/`sezioneModulo()` → `alSalva` ricompone
l'oggetto, eventualmente lo passa a `domain/validation.ts`, e chiama
`salva(contesto, azione, messaggio, dopo?)` → `azioniSecondarie` di solito
`tastoElimina`/`tastoDuplica` in modalità modifica.

`salva()` è il cuore: manda l'azione; se tornano errori li rimette in cima al
modulo **senza chiuderlo**; altrimenti chiude, notifica e chiama
`dopo(idCreato)`.

Eccezioni al pattern: `moduloImportaAssenze` e `moduloComposizione` chiudono e
chiamano `azione`/`invia` direttamente; `moduloAssegnaPiano` e `moduloRecupero`
hanno bottoni di stato alternativo oltre a Elimina; `editorPiano` e
`bloccoRisorse` non sono modali ma blocchi incorporabili.

| # | Modulo | File | Firma | Scopo | Azioni che invia |
|---|---|---|---|---|---|
| 1 | `moduloAnno` | `anno.ts` | `(anno?: AnnoScolastico) => void` | Crea o modifica un anno: etichetta, date, due semestri, pause (`editorPause` incorporato) | `anno.crea`, `anno.salva` |
| 2 | `moduloPause` | `anno.ts` | `(anno: AnnoScolastico) => void` | Solo vacanze e sospensioni di un anno esistente | `anno.salva` |
| 3 | `moduloBloccoAssenze` | `assenze.ts` | `(classe: Classe, blocco?: BloccoAssenze) => void` | Periodo di rilevamento assenze: date, testo della mail, destinatari, note | `assenze.salva`, `assenze.elimina` |
| 4 | `moduloImportaAssenze` | `assenze.ts` | `(classe: Classe, blocco: BloccoAssenze) => void` | Sceglie la cartella di PDF di assenze/ritardi da assegnare per nome file | `assenze.importa` |
| 5 | `moduloClasse` | `class.ts` | `(classe?: Classe, dopo?: (classeId: string) => void) => void` | Crea o modifica una classe: nome, materia iniziale, sede, colore, docenza di classe | `classe.salva`, `corso.crea`, `classe.elimina` |
| 6 | `moduloAllievo` | `class.ts` | `(classe: Classe, allievo?: Allievo) => void` | Anagrafica di una persona: dati, foto, indirizzo, contatti propri, tutore, datore | `classe.salva`, `allievo.elimina`, `allievo.foto.imposta`, `allievo.foto.togli` |
| 7 | `moduloImportaAllievi` | `class.ts` | `(classe: Classe) => void` | Incolla-elenco di nomi per popolare una classe | `allievi.importa` |
| 8 | `moduloComposizione` | `composition.ts` | `(scelti: Array<{percorso, nome}>) => void` | Nome e ordine di un fascicolo composto dai documenti spuntati (minimo 2) | `composizione.crea` |
| 9 | `moduloConsegna` | `assignment.ts` | `(opzioni?: OpzioniModuloConsegna) => void` | Consegna: testo, tipo, destinatario (`a: 'classe' \| 'docente'`), eventuale raccolta di un documento, scadenza | `consegna.salva`, `consegna.elimina` |
| 10 | `moduloCorso` | `course.ts` | `(opzioni?: OpzioniModuloCorso) => void` | Crea o modifica un corso: titolo, classe, materia, ore fisse settimanali (`editorRicorrenze`), generazione delle lezioni | `corso.crea`, `corso.salva`, `corso.elimina`, `orario.imposta`, `orario.genera` |
| 11 | `moduloAvvio` | `course.ts` | `() => void` | Avvio guidato: da zero alla prima lezione — anno, classe, materia, corso, orario in sequenza | `anno.crea`, `classe.salva`, `materia.salva`, `corso.crea`, `orario.imposta`, `orario.genera` |
| 12 | `moduloRecapito` | `docenteClasse.ts` | `(classe: Classe, recapito?: Recapito) => void` | Un recapito fisso della classe (capoclasse, azienda, servizio) | `recapito.salva`, `recapito.elimina` |
| 13 | `moduloComunicazione` | `docenteClasse.ts` | `(classe: Classe, comunicazione?: Comunicazione) => void` | Comunicazione a gruppi con allegati; «salva e apri nella posta» | `comunicazione.salva`, `comunicazione.invia`, `comunicazione.elimina` |
| 14 | `moduloLezione` | `lezione.ts` | `(opzioni?: OpzioniModuloLezione) => void` | Crea o modifica un'ora: corso, data, aula, stato, fasce orarie (`editorSlot`), piano collegabile | `lezione.salva`, `lezione.duplica`, `lezione.elimina` |
| 15 | `moduloOsservazione` | `lezione.ts` | `(lezione: Lezione, classe: Classe \| null, osservazione?: Osservazione) => void` | Annotazione su una lezione, rivolta alla classe o a una persona | `osservazione.salva`, `osservazione.elimina` |
| 16 | `moduloMateria` | `subject.ts` | `(materia?: Materia, dopo?: (materiaId: string) => void) => void` | Crea o modifica una materia, con avviso sui doppioni mentre si scrive | `materia.salva`, `materia.elimina` |
| 17 | `moduloUnisciMaterie` | `subject.ts` | `(da: Materia) => void` | Unisce due materie doppie, dicendo prima quanti corsi e piani ne sono toccati | `materia.unisci` |
| 18 | `editorPiano` | `plan.ts` | `(opzioni: {piano?, corsoDaProporre?, lezione?, …}) => EditorPiano` | I campi dell'editor di piano **senza** la finestra: riusabile in modale o in linea | `piano.salva` |
| 19 | `moduloPiano` | `plan.ts` | `(piano?, dopo?, corsoDaProporre?, lezione?) => void` | La modale attorno a `editorPiano` | `piano.salva`, `piano.duplica`, `piano.elimina` |
| 20 | `moduloAssegnaPiano` | `plan.ts` | `(lezione: Lezione) => void` | Assegna, crea o toglie il piano di un'ora | `piano.assegna` |
| 21 | `moduloRecupero` | `retake.ts` | `(recupero: Recupero, dopo?: () => void) => void` | Data del recupero di una prova, note, documenti, oppure la dispensa | `recupero.imposta` |
| 22 | `bloccoRisorse` | `resources.ts` | `(opzioni: OpzioniRisorse) => HTMLElement` | Blocco **non modale** con le risorse di un piano o di una tappa | `risorsa.aggiungi`, `risorsa.apri`, `risorsa.elimina` |
| 23 | `moduloCollegamento` | `resources.ts` | `(pianoId: string, attivitaId: string \| null, dopo?) => void` | Aggiunge un collegamento: url più titolo | `risorsa.aggiungi` |
| 24 | `moduloRisorsa` | `resources.ts` | `(pianoId, attivitaId, risorsa, dopo?) => void` | Modifica o sposta una risorsa esistente | `risorsa.sposta`, `risorsa.salva`, `risorsa.elimina` |
| 25 | `moduloValutazione` | `assessment.ts` | `(momento: MomentoValutazione, dopo?: () => void) => void` | Corregge un momento già nato — non ne crea mai uno: un momento nasce da una tappa-prova del piano | `valutazione.salva`, `valutazione.elimina` |

### 10.1 `forms/common.ts` — l'infrastruttura condivisa

| Nome | Firma | Scopo |
|---|---|---|
| `testo` | `(valore: unknown) => string` | legge e normalizza un campo di testo |
| `numero` | `(valore: unknown, predefinito: number) => number` | legge e normalizza un campo numerico |
| `richiedeAnno` | `(seNonCe: () => void) => AnnoScolastico \| null` | guardia: senza anno notifica e apre l'avvio guidato |
| `salva` | `(contesto, azione, messaggio, dopo?) => Promise<void>` | manda l'azione, rimette gli errori in cima al modulo senza chiuderlo, altrimenti chiude+notifica+`dopo(idCreato)` |
| `chiediEliminazione` | `(bersaglio: Bersaglio) => Promise<boolean>` | mostra tutto ciò che sparirebbe insieme all'elemento, usando `domain/deletions.ts` |
| `tastoElimina` | `(opzioni) => HTMLButtonElement` | il bottone Elimina completo, usato in 14 moduli |
| `tastoDuplica` | `(opzioni) => HTMLButtonElement` | il bottone Duplica completo |
| `vociTipoAttivita` | `() => VoceLista[]` | le voci della tendina «tipo di attività» |
| `campoCollegato` | `(opzioni: OpzioniCampoCollegato) => HTMLElement` | select con «+» che apre il modulo per creare al volo la voce mancante e la seleziona appena arriva dallo stato |
| `opzioniMaterie` | `() => …` | le materie per una tendina |
| `corsoProposto` | `(classeId?: string) => string` | quale corso proporre |
| `corsoBuono` | `(suggerito?: string) => string` | il corso da usare quando quello suggerito non va |
| `campoCorso` | `(opzioni) => HTMLElement` | la tendina Corso preconfigurata |
| `campoDi` | `<T extends HTMLElement>(…) => T` | recupera l'elemento di un campo |
| `campiRecapiti` | `(…) => …` | i campi telefono/mail ripetibili |
| `recapitiScelti` | `(…) => …` | li rilegge al salvataggio |
| `applicaOrario` | `(…) => Promise<…>` | manda `orario.imposta` e poi `orario.genera` |
| `spostaVoce` | `<T>(elenco: T[], da: number, a: number) => T[]` | riordina un array |
| `riordinatore` | `(…) => …` | drag&drop più tastiera per riordinare righe |
| `fuocoSullaPresa` | `(righe: HTMLElement, indice: number) => void` | rimette il fuoco sulla maniglia dopo un riordino |
| `presaDiRiga` | `() => HTMLButtonElement` | la maniglia di trascinamento |

Editor interni non esportati ma centrali: `editorPause` (`anno.ts`),
`editorTelefoni`, `campoFoto`, `campiIndirizzo` (`class.ts`),
`editorRicorrenze` (`course.ts`), `editorSlot` (`lezione.ts`), `editorAttivita`
(`plan.ts`). Tutti costruiscono la riga una volta sola e aggiornano solo i nodi
che cambiano, per non perdere il fuoco della tastiera mentre si digita.

---

## 11. Esportazioni e integrazioni

### 11.1 Che cosa esce dal registro

| Formato | Azione che lo produce | Dove finisce | Contenuto |
|---|---|---|---|
| PDF (rapporto) | `rapporto.genera`, `rapporto.completo`, la rigenerazione automatica | `esportazioni/…` secondo la collocazione del genere | vedi §9.1 |
| PDF (fascicolo composto) | `composizione.crea`, `composizione.aggiorna` | `esportazioni/…`, più una **ricetta** `Composizione` in JSON dentro il documento | da 2 a 200 PDF esistenti messi in fila |
| PDF (anteprima di modello) | `modelli.prova` (una **lettura**, §6.17) | **da nessuna parte**: vive in memoria e torna in `Riscontro.dati.pdf` come base64 | il modello in bozza composto sui dati d'esempio |
| CSV | `esporta.valutazioni`, `esporta.presenze` | accanto al PDF corrispondente, stesso nome, estensione `.csv` (`percorsoCsv`) | `csvValutazioni`, `csvPresenze` in [`src/data/exports.ts`](../src/data/exports.ts) |
| Markdown | `esporta.lezione` | stesso posto del verbale, estensione `.md` (`percorsoDi(dove, 'md')`) | `testoLezione` in `src/data/exports.ts` |
| `.eml` | `consegna.distribuisci`, `assenze.invia`, `comunicazione.invia` quando l'invio diretto è spento o fallisce | `bozze/` dentro il documento dell'anno, nome da `nomeBozza(classe, chi, argomento, periodo)` | il messaggio completo con gli allegati |

### 11.2 Posta

Tre vie, decise da `puoSpedire()` (casella collegata **e**
`registroDocenti.posta.invioDiretto` acceso):

1. **Invio diretto via Exchange** — `bozzeDiGruppo` prova prima questa strada; se
   riesce, `spediti: true` e chi ha chiamato segna le spunte nel `Registro`.
2. **Bozza `.eml` su disco** — fallito o spento l'invio diretto, scrive un file
   `.eml` per messaggio in `cartellaBozze(classe)` e risponde `spediti: false`.
   Con `spediti: false` **nessuna azione segna niente**: la spunta la dà
   l'utente a mano con `comunicazione.spunta` o `assenze.spunta`.
3. **Apertura col programma di posta** — una sola bozza si apre da sé; da due in
   su si apre la cartella, per non aprire venticinque finestre di posta insieme.
   `apriBozzaSingola` fa lo stesso per un messaggio solo (`comunicazione.invia`).

Dettagli che contano:

- nell'`.eml` la firma del registro viene **tolta** (`firma: undefined`): la
  mette il programma di posta; nell'invio diretto invece resta;
- il periodo finisce nel nome della bozza, così un secondo giro non sovrascrive
  il primo;
- `consegna.distribuisci` manda **un messaggio per allievo** con il documento in
  allegato, destinatari filtrati per `mailAllievo`/`mailTutore`, senza copia
  nascosta; `comunicazione.invia` manda **un solo messaggio** con i destinatari
  in copia nascosta; `assenze.invia` manda una mail per allievo in chiaro;
- con l'invio diretto attivo si chiede conferma **prima** di generare qualunque
  bozza: un documento mandato alla famiglia sbagliata non si riprende;
- il gettone OAuth non attraversa mai il ponte (§6.9).

Comandi di servizio: `posta.prova` (bussa senza spedire), `posta.invioProva`
(spedisce davvero a un indirizzo scelto con una finestra dell'host),
`posta.collega` (login Microsoft dal browser di sistema, gettone salvato solo se
il server accetta), `posta.scollega`, più il comando di menu
`registroDocenti.azzeraPosta` (portachiavi, memoria e impostazioni).

### 11.3 Geocodifica

`mappa.geocodifica` interroga Nominatim/OpenStreetMap con `fetch` **dal main
process** — mai dal webview, la cui CSP è `default-src 'none'`. Rate-limit
forzato di 1,1 s fra richieste; quattro query in cascata (via + civico + NAP +
paese → … → solo NAP + paese, marcata `approssimato`); tetto di 60 indirizzi per
invocazione; scrittura incrementale in `Registro.coordinate`, che sono
**per indirizzo e non per persona**. È l'unico gesto del registro che manda
fuori un dato dell'anagrafica, e per questo si preme a mano.

I tasselli della mappa passano invece da `registro://mappa/<z>/<x>/<y>.png`
([`shell/protocol/tiles.ts`](../shell/protocol/tiles.ts)): cache locale in
`userData/tasselli/`, scaricati da `tile.openstreetmap.org` con uno
`User-Agent` dedicato, così la pagina non ha mai bisogno di permesso di rete.

### 11.4 OCR

Acceso da `registroDocenti.ocr.attivo`, vuole tre cose sulla macchina: il
modello `registroDocenti.ocr.modello` (un `.gguf` che sappia guardare le
immagini), il suo proiettore `registroDocenti.ocr.proiettore` — l'`mmproj`,
senza il quale il programma parte, ignora la pagina e risponde immaginando — e
il programma `registroDocenti.ocr.programma`, cioè `llama-mtmd-cli` di
llama.cpp. L'attesa massima per pagina è
`registroDocenti.ocr.attesaMassimaSecondi`.

I due modelli si scaricano dalla pagina «Modelli linguistici», che li prende da
Hugging Face o accoglie un `.gguf` trascinato dentro. Il **programma**, invece,
non si sceglie e non si scarica a mano: alla prima pagina da leggere se lo
prende il registro ([`src/data/visionKit.ts`](../src/data/visionKit.ts)),
con la stessa macchina e le stesse quattro guardie del corredo della dettatura
— indirizzo nel sorgente, versione fissa, impronta SHA-256 verificata prima di
eseguire, estrazione appiattita e stretta
([`src/data/kit.ts`](../src/data/kit.ts)). Lo spegne
`registroDocenti.ocr.scaricoAutomatico`, e un percorso scritto a mano in
`registroDocenti.ocr.programma` vince comunque.

La differenza fra il programma e i modelli non è di principio ma di decisione:
`llama-mtmd-cli` è sempre lo stesso, mentre quale modello ci stia su quella
macchina lì lo sa soltanto chi ci insegna.

Quattro azioni lo accodano (`smistamento.leggiPagine`, `.leggiTutto`,
`.rileggiAttive`) e una lo ferma (`.fermaLettura`). Sono **fire-and-forget**: il
gestore accoda e ritorna `fatto` subito. Il lavoro vero lo fa lo `Smistatore`
([`src/data/sorter.ts`](../src/data/sorter.ts)), un singleton per
finestra con un `while` che consuma **una pagina alla volta**, mai in parallelo,
e racconta l'avanzamento con `MessaggioLavoro` — un canale separato dallo stato,
perché una pagina al minuto non deve ridisegnare il pannello intero.

### 11.5 Smistamento

Ciclo di vita di uno `Smistamento` (un PDF di classe in quarantena finché ogni
pagina non è stata decisa):

| Fase | Azioni | Che cosa succede ai file |
|---|---|---|
| Ingresso | `smistamento.carica` (dialogo multi-file), `smistamento.deposita` (drag&drop, byte in base64) | i byte entrano in `quarantena/` dentro `<anno>.registro`; l'originale non si sposta; le anteprime finiscono in `quarantena/anteprime/<id>-p<n>.png` |
| Ricostruzione | `smistamento.dividi` (legacy), `smistamento.attribuisci` | cambia la bozza di divisione o la classe bersaglio, senza rileggere il PDF |
| Lettura | `smistamento.leggiPagine`, `.leggiTutto`, `.rileggiAttive`, `.fermaLettura` | nessun file cambia: si riempie solo `letture` |
| Assegnazione | `smistamento.assegnaPagine`, `.assegnaAssenze`, `.assegnaFirme`, `.confermaTutto`, `.assegnaManuale` (legacy) | il ritaglio esce dalla quarantena e finisce in `archivio/<materia>/<classe>/<chi>/`; la pagina esce da `letture` e l'intervallo entra in `assegnate` |
| Scarto | `smistamento.scartaPagine` | le pagine spariscono dalla quarantena senza finire da nessuno |
| Rollback | `smistamento.riprendiPagine` | toglie il documento dal fascicolo, cestina il file, rimette le pagine in `letture` rileggendo il testo dal PDF ancora in quarantena |
| Chiusura | automatica (`chiudiSeFinito`), oppure `smistamento.elimina` | finiti i blocchi, il PDF originale e le anteprime vanno nel cestino di sistema e la riga sparisce da `smistamenti` |
| Servizio | `smistamento.apri`, `.apriPagine`, `.impostazioni` | apre il PDF o un ritaglio col lettore di sistema; apre le impostazioni OCR |

**Motore di riconoscimento**
([`src/domain/sorting.ts`](../src/domain/sorting.ts)): indicizza fino
a 4 chiavi per allievo (cognome+nome, nome+cognome, cognome solo se univoco,
nome solo se univoco), cerca come parola intera nel testo normalizzato della
pagina, marca `ambiguo` se due candidati sono troppo vicini in fiducia.
**Non archivia mai da solo**: anche un nome riconosciuto con fiducia alta resta
«da confermare» se manca una consegna associata, se il nome non è fra i
destinatari attesi, o se quella persona ha già consegnato in questo giro. Solo
un gesto umano scrive davvero un documento.

---

## 12. Scorciatoie da tastiera

Tre origini diverse, che non si pestano i piedi.

| Tasti | Che cosa fa | Dove è dichiarata | Note |
|---|---|---|---|
| `Ctrl+K` | Apre la palette dei comandi | `installaScorciatoie()` in [`comandi.ts`](../src/ui/commands.ts) | gesto del telaio, non un comando del registro; risponde anche dentro un campo di testo |
| `Ctrl+B` | Mostra o nasconde la riga delle azioni | `installaScorciatoie()` | **non** la barra laterale, che ha il suo pulsante. Non risponde dentro un campo di testo: lì `Ctrl+B` è il grassetto |
| `Ctrl+O` | Apri un anno… | `COMANDI_UI: file.apri` (`dalMenu: true`) | l'acceleratore lo gestisce il menu Electron |
| `Ctrl+S` | Salva (o salva il modello, in pagina Modelli) | `COMANDI_UI: file.salva` | risponde anche dentro un campo di testo: `Ctrl+S` in mezzo a un consuntivo è proprio il momento in cui lo si vuole |
| `Ctrl+Alt+T` | Oggi | `COMANDI_UI: registro.oggi` (`dalMenu: true`) **e** `COMANDI: registroDocenti.oggi` (`CommandOrControl+Alt+T`) | doppia dichiarazione, un solo firing: `installaScorciatoie` salta i comandi `dalMenu` |
| `Ctrl+Alt+N` | Nuova ora / Nuova lezione | `COMANDI_UI: registro.nuovaLezione` (`dalMenu: true`) **e** `COMANDI: registroDocenti.nuovaLezione` | come sopra |
| `Ctrl+Alt+R` | Mostra il registro | `COMANDI: registroDocenti.apri` | acceleratore globale del menu nativo: funziona anche a pannello chiuso |
| `Ctrl+,` | Impostazioni | `COMANDI: registroDocenti.impostazioni` | acceleratore globale |
| `Ctrl+Alt+A` | Agenda sul desktop | `COMANDI: registroDocenti.agenda` | acceleratore globale |

**Come funziona `installaScorciatoie()`**: ascolta `keydown` a livello
`document` in cattura, e risponde solo se `Ctrl`/`Cmd` è premuto e **non** c'è
una modale aperta (`document.querySelector('.modale')`) — dentro una finestra di
form il gesto appartiene al modulo: Invio salva, Escape annulla. Dopo i due
gesti del telaio, confronta il tasto con `comando.scorciatoia` di ogni comando
che **non** ha `dalMenu: true`, perché quelli li intercetta già l'acceleratore
del menu Electron e scatterebbero due volte.

Nel manifesto le scorciatoie sono scritte nella grafia Electron
(`CommandOrControl+Alt+R` e non `Control+Alt+R`): su macOS chi insegna prova il
tasto mela, e scritta `Control` la scorciatoia lì non risponderebbe.

---

## Appendice — divergenze fra i rapporti di ricognizione e il codice

Segnalate qui perché i numeri circolano in altri documenti.

| Cosa | Nei rapporti / nei commenti | Nel codice (verificato) |
|---|---|---|
| Varianti di `Azione` | «~150» (commento in `actions.ts`: «centocinquanta gestori»), «152» in un rapporto, **143** in questo stesso documento fino alla revisione precedente | **141**, senza duplicati; 141 gestori, uno per azione. Erano 143: `modello.leggi` e `modello.prova` sono state ritirate e sono diventate letture (§6.14, §6.17). Il conteggio è provato a macchina da [`tests/api/coverage.test.mjs`](../tests/api/coverage.test.mjs), che legge l'unione `Azione` dal sorgente |
| Procedure di `src/api/` | il commento in `api/bridge.ts` dice «centocinquanta azioni», quello in `api/core.ts` «le centocinquanta azioni» | il numero non si ricorda: lo stampa `npm run procedures` e lo verifica `tests/api/coverage.test.mjs`. 8 sono letture, senza `azione:`; tutte le altre ne dichiarano una. I due commenti arrotondano il numero delle *azioni* com'era prima del ritiro |
| Azioni con **F** (filesystem) | 73 in questo documento fino alla revisione precedente | **72**: `modello.leggi` era una di quelle |
| Azioni **solo** `∅` | 11 | **10**: `modello.prova` era una di quelle |
| Azioni che non toccano il `Registro` | 48 | **46** (95 **R** + 46 = 141) |
| Superfici catalogate nel §1 | la prosa diceva «quattro», la tabella ne elencava cinque | **sei**: la tabella ne elenca sei e la prosa lo dice. Quella in più è la superficie delle **procedure di lettura** (§6.17), che prima non esisteva |
| Comandi di `COMANDI_UI` | «~95» | **89** (60 letterali + 29 generati) |
| Pagine di `PAGINE` | «22» | **18** |
| Impostazioni di `manifest.ts` | «~25» | **26** |
| Moduli in `moduli/` | «24» | **25** punti d'ingresso esportati in 13 file (più `comune.ts`) |
| File di gestori in `src/actions/` | «15» | **15** file di gestori + `contesto.ts`, che è l'infrastruttura |
| `Vista` | 16 | **16** |
| `GenereRapporto` | 8 | **8** |
| `CATALOGO_MODELLI` | 13 | **13** |
| `COMANDI` del manifesto | 21 | **21** |

Elementi presenti nel codice e assenti dai rapporti, inclusi qui: le 18 varianti
di `ComandoAgenda` (§8.4); i quattro comandi registrati fuori dal manifesto
(§4); il campo `Impostazioni.liste` (§5.2); le azioni `smistamento.scartaPagine`
e `valutazione.eliminaOrfane`; i quattro valori di `RuoloModello` (§9.2); le 8
procedure di lettura e le buste `Domanda`/`Riscontro` (§6.17, §7.8).

**Come si rifanno questi conti.** Non a mano: `npm test` esegue
[`tests/api/coverage.test.mjs`](../tests/api/coverage.test.mjs), che legge
l'unione `Azione` da [`src/protocol.ts`](../src/protocol.ts) contando le
graffe, la confronta con le procedure registrate e verifica che **nessuno schema
perda per strada un campo dell'azione** — perché quello è l'unico modo in cui
questa migrazione poteva fallire in silenzio: `oggetto()` scarta le chiavi che
non dichiara, il ponte passa al gestore quel che resta, e un campo mancante non
romperebbe niente di visibile. L'azione risponderebbe «fatto» e quel campo
smetterebbe semplicemente di arrivare. Una nota che non si salva. Una scadenza
che sparisce.
