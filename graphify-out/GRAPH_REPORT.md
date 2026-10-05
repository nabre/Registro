# Graph Report - Registro  (2026-10-05)

## Corpus Check
- Large corpus: 1524 files · ~1,800,775 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 11849 nodes · 47254 edges · 261 communities (237 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 582 edges (avg confidence: 0.85)
- Token cost: 444,020 input · 0 output

## Community Hubs (Navigation)
- Prove ambiente e file temporanei
- Prove dominio (A)
- Prove API
- Validazione e anno
- Moduli del pannello
- Prove dominio (B)
- Cataloghi testi i18n
- Protocollo e pannelli desktop
- Viste e azioni del pannello
- Procedure: definisci e letture
- Agenda, compleanni, giornata
- Contratto e ambito procedure
- Check e consegne
- Testi delle azioni
- Appello e ritardi
- Orario e tratti della giornata
- Assenze e segnalazioni
- Voti, scale e recuperi
- Guscio Electron e pacchetto
- Archivio consegne su disco
- Stato UI e compleanni
- Azioni applicative
- Impaginazione PDF
- Progetti nel corso (vista UI)
- Account Microsoft
- Testi comuni e voci sparite
- Prove dati e archivio
- Prove calcoli e arrotondamenti
- Navigazione e percorso
- Esportazioni e giornale
- Exchange e autenticazione
- Indirizzi e mappa
- Procedure assenze e rapporti
- Prove posta e allegati
- Prove catalogo API
- Procedure progetti
- Procedure anni e calendario
- Icone e barra titolo
- Osservatori e avvio
- Prove date e formato
- Tipi di attività
- Ponte e chiamante
- Risorse asincrone del pannello
- Apparato e contesto
- Documenti e avvisi del corso
- core/apparato · enumerations.ts
- core/dominio · calendarioToccato()
- core/dominio · breaks.ts
- contract/procedure · inoltra()
- contract/procedure · esigiLezione()
- core/dominio · cruscotto.ts
- esterno · dist_tests_domain_catalogo_modelli
- tests/api · prova()
- desktop/apparato · chiamante()
- tests/ui · ADR-0045
- ui/views · lezioneFinita()
- desktop/apparato · chokidar
- desktop/apparato · requisitoMancante()
- desktop/apparato · impianta()
- desktop/apparato · updateInstaller.ts
- core/azioni · motivoSicuro()
- ui/views · voce()
- ui/views · VoceProgramma
- desktop/apparato · .fire()
- core/dominio · impaginazioneDi()
- ui/views · corrispondeAlla()
- tests/data · dist_tests_dictation
- contract/procedure · scrittura
- contract/manifest.ts · manifest.ts
- contract/procedure · consegne/common.ts
- core/controlli · control.ts
- ui/views · PaginaSmistamento
- core/dominio · scriviGenerato()
- tools/sample.mjs · assistantTools.mjs
- cli/main.mjs · access.mjs
- ui/views · Azione
- ui/views · dominio/letterhead.ts
- ui/components · bilancioSegni()
- desktop/apparato · .joinPath()
- ui/views · SEZIONI_ASSISTENTE
- core/dati · dati/archive.ts
- core/dati · dati/calendar.ts
- tests/interfaccia · @playwright/test
- core/dati · llamaCpp.ts
- ui/views · attivitaConPendenza()
- desktop/shell · bandiera()
- tests/ui · controlli.test.mjs
- core/dati · Archivio
- contract/procedure · errore
- contract/procedure · common/plans.ts
- tools/collections.mjs · buttons.mjs
- ui/memory.ts · Voce
- core/dominio · richiesteAperte()
- core/dominio · addresses.ts
- core/dominio · normalization/check.ts
- core/dati · .accoda()
- package.json · scripts
- desktop/transports · Genere
- core/dominio · creaProgetto()
- tests/helpers · fake-node-llama.mjs
- ui/assistant · chat.ts
- ui/views · help/assistant.testi.ts
- desktop/apparato · fermaRapporti()
- core/dati · .leggiAltroAnno()
- core/dominio · duplicaIntegrazione()
- package.json · eslint.config.mjs
- ui/views · help/assistant.ts
- desktop/transports · impagina()
- desktop/shell · senzaAnno()
- ui/commandBar.ts · RaggruppamentoCorsi
- core/dati · dati/dictation.ts
- core/dati · appData.ts
- ui/projection.ts · AppelloProiettato
- esterno · dist_tests_domain_chiaveindirizzo
- cli/comandi · aspetta.mjs
- contract/procedure · llm/annulla.ts
- core/dominio · .suVoce()
- ui/views · ordinalePausa()
- ui/views · tracciatoIcona()
- tools/calendario · argparse
- core/dati · p()
- ui/views · automation.testi.ts
- ui/dom.ts · collegaRidisegno()
- ui/views · behind.ts
- core/dominio · formatoDi()
- os/windows · aggiornamento.ps1
- ui/components · pdfjs-dist/legacy/build/pdf.mjs
- tools/icons.cjs · icons.cjs
- ui/commands.ts · eseguiDalPulsante()
- core/dominio · istanteAdesso()
- ui/commands · BLOCCHI
- desktop/shell · ParametriDialogo
- esterno · dist_tests_domain_annidaproporre
- tools/i18n.mjs · i18n/page.ts
- tests/api · reads.test.mjs
- contract/procedure · ErroreApi
- core/dati · gguf.testi.ts
- core/dominio · oraValida()
- core/dominio · chiaveValore()
- ui/dom.ts · ui/dom.ts
- cli/uninstall.mjs · cli/common.mjs
- contract/tools.ts · azioniSottoContratto()
- ui/views · comeElenco()
- ui/views · durataPiano()
- core/dominio · calendarIcs.ts
- core/dominio · fogliDeiProgetti()
- core/dati · .prendiPacchetto()
- core/dati · dati/history.ts
- tools/layers.mjs · ADR-0055
- ui/assistant.ts · ui/assistant.ts
- ui/assistant · bottoneDelContesto()
- contract/procedure · registro/altrove.ts
- core/dati · destinazione()
- tests/helpers · finestraChiusa()
- ui/views · signature.ts
- .claude/skills · nuova.mjs
- contract/procedure · testi
- core/dominio · Raggruppamento
- docs/DECISIONI.md · Motore di template dei rapporti
- tests/interfaccia · attendi()
- esbuild.mjs · aliasApparato
- package.json · devDependencies
- core/azioni · UsoModello
- desktop/shell · formerName.ts
- ui/sidebar.ts · raggruppamentoDeiCorsi()
- desktop/shell · BottoneMessaggio
- esterno · dist_tests_contextparts
- tools/licenses.mjs · applicazione
- ui/views · search.ts
- .claude/skills · Skill sciame
- contract/procedure · aggiornamenti.testi.ts
- core/controlli · Ascolta
- core/dominio · .portaAlFormato()
- tests/interfaccia · ref_node_child_process
- ui/statusBar.ts · FUOCO_ANNO
- desktop/shell · commandLine.ts
- ui/pages.ts · voceDiCorso()
- ui/views · outside.ts
- core/dominio · outlook.ts
- contract/presentation.ts · presentation.ts
- tests/interfaccia · schermata()
- tools/census.mjs · census.mjs
- tools/coverage.mjs · coverage.mjs
- tsconfig.json · tsconfig.json
- ui/assistant · answer.ts
- ui/views · righe()
- .claude/skills · Skill architettura
- .claude/skills · togli.mjs
- desktop/transports · procedura()
- ui/views · ImpostazioniDaSalvare
- docs/immagini · anno_esempio (documento campione)
- stryker.config.json · stryker.config.json
- ui/views · casella()
- ui/views · help/lesson.ts
- tests/interfaccia · ADR-0007
- docs/immagini · Screenshot: Calendario (vista Settimana)
- ui/shortcuts.ts · COMANDI_UI
- .claude/skills · Skill formato
- docs/API.md · core/azioni README (copertura API delle azioni
- tools/dev.mjs · copiaCaratteriPdf()
- tests/interfaccia · settingsKeyboard.spec.ts
- tools/procedures.mjs · procedures.mjs
- core/dati · geocoding.ts
- esterno · dist_tests_domain_allineasemestri
- esterno · dist_tests_letterheadcourses
- docs/immagini · Documento anno_esempio
- tools/mutants.mjs · ref_node_util
- tsconfig.js.json · ./tsconfig.json
- .github/workflows · Compattare VERSIONE_DATI prima di una re
- ui/assistant · IdVisto
- tests/ui · domSintetico.mjs
- tools/mail-probe.ps1 · mail-probe.ps1
- ui/bookmark.ts · daRicordare()
- ui/components · VoceScelta
- .claude/skills · core/controlli: DOM condiviso dei controlli
- .claude/skills · Riferimento prove delle procedure
- docs/immagini · Pendenze screenshot
- tests/interfaccia · accessibility.spec.ts
- .claude/skills · Riferimento LLM (catalogo per il modello)
- contract/procedure · intestazione/index.ts
- core/i18n · flags.ts
- tests/helpers · Emettitore
- core/dominio · CellaOsservata
- docs/immagini · Screenshot Valutazioni (Momenti di valutazio
- tools/signing.mjs · ref_app_builder_lib
- tests/helpers · .constructor()
- tests/interfaccia · misure.spec.ts
- ui/assistant · voice.ts
- CODE_OF_CONDUCT.md · CODE_OF_CONDUCT.md (Codice di comportam
- core/dominio · csvPresenze()
- desktop/shell · reader/reader.ts
- knip.config.ts · knip.config.ts
- package.json · dependencies
- tools/screenshotDocs.mjs · screenshotDocs.mjs
- contract/procedure · cerca.testi.ts
- docs/VALUTAZIONE-PYTHON.md · Alias apparato (fatto architett
- tests/interfaccia · calendarContrast.spec.ts
- core/dominio · isoValida()
- package.json · imports
- tests/data · oauth.test.mjs
- .claude/settings.json · settings.json
- core/azioni · nonSupportato()
- .dependency-cruiser.cjs · .dependency-cruiser.cjs
- desktop/apparato · dialogs.testi.ts
- os/macos · aggiornamento.sh
- ui/breadcrumb.testi.ts · breadcrumb.testi.ts
- ui/commands · commands/plans.testi.ts
- ui/views · projectIntegration.testi.ts
- .claude/skills · Skill canvas-design
- .github/ISSUE_TEMPLATE · Issue template Difetto
- .claude/hooks · coda-sciame.sh
- os/linux · after-remove.sh
- ui/components · pdfjs-worker.d.ts
- ui/components · WorkerMessageHandler

## God Nodes (most connected - your core abstractions)
1. `h()` - 679 edges
2. `parole` - 317 edges
3. `inoltra()` - 311 edges
4. `catalogo` - 308 edges
5. `pulsante()` - 258 edges
6. `lessico` - 243 edges
7. `formattaData()` - 226 edges
8. `oggetto()` - 222 edges
9. `scrittura` - 194 edges
10. `azione()` - 192 edges

## Surprising Connections (you probably didn't know these)
- `corpo()` --indirect_call--> `pezzi()`  [INFERRED]
  tests/data/templateLanguages.test.mjs → ui/assistant/format.ts
- `leggi()` --indirect_call--> `letto()`  [INFERRED]
  ui/forms/registerImport.ts → tests/domain/reports.test.mjs
- `smaltisciVoce()` --indirect_call--> `bozza()`  [INFERRED]
  ui/assistant/chat.ts → tests/domain/schoolCalendar.test.mjs
- `D6: export vivo si rende interno, si cancella dopo una prova` --semantically_similar_to--> `Export senza consumatori non è codice morto`  [INFERRED] [semantically similar]
  .claude/skills/verifica/SKILL.md → CLAUDE.md
- `La firma del codice` --semantically_similar_to--> `Code signing policy (SignPath Foundation)`  [INFERRED] [semantically similar]
  docs/GUIDA.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Controlli statici di architettura in CI** — _claude_skills_architettura_skill_npm_run_layers, _claude_skills_procedure_api_skill_npm_run_procedures, _claude_skills_verifica_skill_npm_run_docs, _claude_skills_verifica_skill_npm_run_i18n, _claude_skills_verifica_skill_otto_controlli_statici, _github_workflows_verifica_job_verifica [EXTRACTED 1.00]
- **Giro di un cambiamento del formato .regi** — _claude_skills_formato_skill_versione_dati, _claude_skills_formato_skill_passi_del_formato, _claude_skills_formato_skill_normalizzazione, _claude_skills_formato_skill_campioni_formato, _claude_skills_formato_skill_impronta_campi [EXTRACTED 1.00]
- **Punti d'aggancio di una procedura API** — _claude_skills_procedure_api_skill_definisci_chiama, _claude_skills_procedure_api_skill_npm_run_procedures, _claude_skills_procedure_api_skill_npm_run_tools, _claude_skills_procedure_api_references_llm_catalogo_modello, _claude_skills_procedure_api_references_schemi_valibot, _claude_skills_procedure_api_references_prove_conti_scritti_a_mano [INFERRED 0.85]
- **Pagine del guscio: CSP registro:// e testi da catalogo** — desktop_shell_pages_dev_dev, desktop_shell_pages_dialog_dialog, desktop_shell_pages_reader_reader, desktop_shell_pages_settings_settings, desktop_shell_pages_splash_splash, desktop_shell_pages_welcome_welcome [EXTRACTED 1.00]
- **Chiamanti dietro il contratto: procedure, centralino, domande, condotto, assistente** — docs_api_procedura, docs_api_centralino, docs_api_canale_domande, docs_api_condotto, docs_api_assistente, docs_api_riga_di_comando [EXTRACTED 1.00]
- **Documento .regi: ZIP+JSON, storico, serratura informativa, migrazioni a passi** — docs_decisioni_adr_17, docs_decisioni_adr_18, docs_decisioni_adr_19, docs_decisioni_adr_37, docs_modello_dati_versione_dati [INFERRED 0.85]
- **Navigazione del calendario** — docs_immagini_calendario_scuro_navigazione_temporale, docs_immagini_calendario_scuro_selettore_viste, docs_immagini_calendario_scuro_settimane_dell_anno, docs_immagini_calendario_scuro_filtri_periodo_corso [INFERRED 0.85]
- **Lettura della settimana: griglia, striscia annuale e riepilogo** — docs_immagini_calendario_settimane_dell_anno, docs_immagini_calendario_blocco_lezione, docs_immagini_calendario_riepilogo_settimana, docs_immagini_calendario_lezione_da_svolgere [INFERRED 0.85]
- **Scheda Amministrazione della lezione: appello, consegne e check per la classe** — docs_immagini_classe_appello, docs_immagini_classe_consegne, docs_immagini_classe_check, docs_immagini_classe_persona_in_formazione [INFERRED 0.85]

## Communities (261 total, 24 thin omitted)

### Community 0 - "Prove ambiente e file temporanei"
Cohesion: 0.02
Nodes (102): PREFISSI, archivio, domanda(), MODELLI, radice, radice, radice, SCRIPT (+94 more)

### Community 1 - "Prove dominio (A)"
Cohesion: 0.01
Nodes (35): esegui(), { radice, lavoro, dati }, scuola(), dueClassi(), conOraEVerifica(), documento(), dueDiTutto(), foglio() (+27 more)

### Community 2 - "Prove API"
Cohesion: 0.02
Nodes (100): PRIMO, { radice, lavoro, dati }, SECONDO, creaConsegna(), finti, { radice, lavoro, dati }, DEROGHE, { radice, lavoro, dati } (+92 more)

### Community 3 - "Validazione e anno"
Cohesion: 0.02
Nodes (163): annoValido(), Conto, Conto, erroriImpostazioni(), TestaAnno, Indirizzo, LIMITI_PAUSE, lezioneDelPiano() (+155 more)

### Community 4 - "Moduli del pannello"
Cohesion: 0.05
Nodes (162): titoloComando(), etichettaPeriodo(), spunteCheCadono(), corsiDellaMateria(), formattaData(), giorniLunghi(), minutiDaUd(), oggi() (+154 more)

### Community 5 - "Prove dominio (B)"
Cohesion: 0.02
Nodes (34): PERIODO, scuolaConRitirata(), PERIODO, scuolaConOre(), scuola(), scuolaDiDodici(), allineate(), scelta() (+26 more)

### Community 6 - "Cataloghi testi i18n"
Cohesion: 0.01
Nodes (90): it, it, it, it, it, it, it, it (+82 more)

### Community 7 - "Protocollo e pannelli desktop"
Cohesion: 0.03
Nodes (114): convalidaRisultato(), convalidaTurni(), BloccoRisultato, ContestoAssistente, Conversazione, Dettatura, ElencoVisibile, GiroAssistente (+106 more)

### Community 8 - "Viste e azioni del pannello"
Cohesion: 0.04
Nodes (145): criterioRegola(), parole, azione(), segnaLezione(), allega(), allegatoDi(), OpzioniPostoAllegato, postoAllegato() (+137 more)

### Community 9 - "Procedure: definisci e letture"
Cohesion: 0.06
Nodes (127): definisci(), c(), procedura, t(), c(), p(), procedura, t() (+119 more)

### Community 10 - "Agenda, compleanni, giornata"
Cohesion: 0.05
Nodes (132): Compleanno, fraseCompleanno(), testi, lezioniDelGiorno(), EventiSenzaCorso, LezioneDaCalendario, daIso(), formattaMese() (+124 more)

### Community 11 - "Contratto e ambito procedure"
Cohesion: 0.03
Nodes (103): Ambito, Contesto, Lessico, NomeTermine, Procedura, ProceduraQualunque, Spia, termineDetto() (+95 more)

### Community 12 - "Check e consegne"
Cohesion: 0.05
Nodes (126): attivitaValutata(), colonneCheckDi(), conColonnaCheck(), verificaColonna(), avanzamentoConsegna, consegneDaFare, consegneDelCorso(), consegneDocumento() (+118 more)

### Community 13 - "Testi delle azioni"
Cohesion: 0.03
Nodes (79): it, testi, it, testi, it, it, testi, it (+71 more)

### Community 14 - "Appello e ritardi"
Cohesion: 0.04
Nodes (121): p(), procedura, t(), allieviAttivi(), ammetteRitardo(), minutiRitardoUd(), ordinaAllievi(), SIGLE_PRESENZA (+113 more)

### Community 15 - "Orario e tratti della giornata"
Cohesion: 0.04
Nodes (123): TrattoDellaGiornata, BloccoUd, fineLezione(), inizioLezione(), minutiTotali(), slotDelCalendario(), slotLiberi(), UnitaDidattica (+115 more)

### Community 16 - "Assenze e segnalazioni"
Cohesion: 0.04
Nodes (125): avanzamentoAssenze, daSpedire(), destinatariAssenze, FaseAssenze, faseRiga(), firmati(), foglioDi(), inviata() (+117 more)

### Community 17 - "Voti, scale e recuperi"
Cohesion: 0.04
Nodes (117): SegnalazioneAssenza, votiDellaScala(), dataDaTesto(), Allegato, Recupero, Riconsegna, descriviFamiglia(), FamigliaTodo (+109 more)

### Community 18 - "Guscio Electron e pacchetto"
Cohesion: 0.05
Nodes (115): èPacchetto(), percorsoPacchetto(), icona(), impostaCartellaLavoro(), impostazioniSviluppo, posizioneDellaConsole(), tipoDellaFinestra(), èTipoFinestra() (+107 more)

### Community 19 - "Archivio consegne su disco"
Cohesion: 0.04
Nodes (95): chiDellaConsegna(), segnaInvio(), ricopiaRisorse(), archivia(), percorsoConsegna(), aBitmap(), apri(), Bitmap (+87 more)

### Community 20 - "Stato UI e compleanni"
Cohesion: 0.04
Nodes (113): classiDove(), compleanniDelGiorno(), compleanniPerGiorno(), compleannoDi(), etaCompiuta(), ordina(), ricorrenza(), lezioniDellaClasse() (+105 more)

### Community 21 - "Azioni applicative"
Cohesion: 0.04
Nodes (89): fuoriClasse(), collezioniDocumento(), Fetta, fettaDelDocumento(), haFette(), segnaSpedito(), staccaFette(), ApriFinestra (+81 more)

### Community 22 - "Impaginazione PDF"
Cohesion: 0.04
Nodes (117): aCapo(), altaRigaGalleria(), altaRiquadro(), altaVoce(), altezzaBanda(), altezzaBlocco(), andamento(), attacco() (+109 more)

### Community 23 - "Progetti nel corso (vista UI)"
Cohesion: 0.05
Nodes (109): consegneDellaLezione, ProgettoNelCorso, avanzamentoDelProgetto(), celleDi(), giornoDellaVoce(), lezioniDelProgetto(), lezioniScelte(), momentiDelProgetto() (+101 more)

### Community 24 - "Account Microsoft"
Cohesion: 0.04
Nodes (106): accountMicrosoft(), AccountSalvato, aggiungiAccount(), aGraph(), alCambio, cambiAccount, caricaElenco(), chiaveRinnovo() (+98 more)

### Community 25 - "Testi comuni e voci sparite"
Cohesion: 0.04
Nodes (86): it, it, sparita(), it, testi, it, accorda(), ai() (+78 more)

### Community 26 - "Prove dati e archivio"
Cohesion: 0.03
Nodes (41): annoAperto(), lavoro, posto(), radice, annoScritto(), documento(), { radice, lavoro, dati }, cartella (+33 more)

### Community 27 - "Prove calcoli e arrotondamenti"
Cohesion: 0.02
Nodes (11): GIORNATA, PAUSE, SENZA_PAUSE, scala(), applica(), azione(), Elemento, FINTI (+3 more)

### Community 28 - "Navigazione e percorso"
Cohesion: 0.04
Nodes (98): nonElencate(), ANELLI_SOLO_A_VOCE, elementoAperto(), passiDelPercorso(), Passo, Ruolo, suCheCosa(), finestraMese (+90 more)

### Community 29 - "Esportazioni e giornale"
Cohesion: 0.05
Nodes (70): ultimeVociGiornale(), semestreDiEsportazione(), it, testi, procedureEsporta, procedura, procedura, procedura (+62 more)

### Community 30 - "Exchange e autenticazione"
Cohesion: 0.05
Nodes (86): apri(), attendi(), autentica(), autenticaConGettone(), cifra(), collegato(), collegatoNoto(), Colloquio (+78 more)

### Community 31 - "Indirizzi e mappa"
Cohesion: 0.05
Nodes (100): scriviIndirizzo(), anniCompiuti(), conSecolo(), numeriDi(), barraScala(), chiaveIndirizzo(), Condivisione, condivisioni() (+92 more)

### Community 32 - "Procedure assenze e rapporti"
Cohesion: 0.07
Nodes (66): daGestore(), procedura, RAPPORTI, t(), procedureSmistamentoAssenze, procedura, t(), procedureSmistamentoBozza (+58 more)

### Community 33 - "Prove posta e allegati"
Cohesion: 0.03
Nodes (25): @cantoo/pdf-lib, dati, documentoDi(), impostazioni, lavoro, radice, dati, impostazioni (+17 more)

### Community 34 - "Prove catalogo API"
Cohesion: 0.02
Nodes (38): AZIONI, protocollo, APERTO, BYTE_FOTO, FUTURO, { radice, lavoro, dati }, SCORSO, APERTO (+30 more)

### Community 35 - "Procedure progetti"
Cohesion: 0.07
Nodes (66): c(), procedura, t(), esigiCompito(), esigiIntegrazione(), esigiProgetto(), c(), procedura (+58 more)

### Community 36 - "Procedure anni e calendario"
Cohesion: 0.05
Nodes (59): it, testi, procedura, t(), calendarioDellAnno, procedura, sospensione, t() (+51 more)

### Community 37 - "Icone e barra titolo"
Cohesion: 0.06
Nodes (87): percorso(), pulsanteTendina(), icona(), TRACCIATI, logo(), tendinaAperta(), andaturaScorrimento(), h() (+79 more)

### Community 38 - "Osservatori e avvio"
Cohesion: 0.06
Nodes (82): annota(), osserva(), esegui(), registraProiettore(), registraNavigatore(), dividiClasseEAllievi(), dividiPerOrigine(), migraArchivio() (+74 more)

### Community 39 - "Prove date e formato"
Cohesion: 0.03
Nodes (36): ADR-0003, fast-check, campioni, giorno, guastato(), guasto, ADR-0050, opzioni() (+28 more)

### Community 40 - "Tipi di attività"
Cohesion: 0.06
Nodes (80): ChiaveParametro, nomeTipoAttivita(), NOMI_TIPO_ATTIVITA, PARAMETRI_ATTIVITA, parametriDi(), ParametroAttivita, riassuntoParametri(), Scheletro (+72 more)

### Community 41 - "Ponte e chiamante"
Cohesion: 0.05
Nodes (60): gestoriDelleProcedure(), ChiamanteNodo, FunzioneChiamabile, OpzioniChiamata, Codice, EsitoScrittura, Origine, Risultato (+52 more)

### Community 42 - "Risorse asincrone del pannello"
Cohesion: 0.05
Nodes (80): Risposta, OpzioniLettura, risorse, annota(), avvia(), mostra(), Voce, api (+72 more)

### Community 43 - "Apparato e contesto"
Cohesion: 0.03
Nodes (26): Event, Smaltibile, CartellaDiLavoro, ContestoApplicazione, DepositoSegreti, Impianto, InterfacciaFileSystem, OpzioniWebview (+18 more)

### Community 44 - "Documenti e avvisi del corso"
Cohesion: 0.12
Nodes (75): documentiDelCorso(), supplenzeDelCorso(), tuttoDelCorso(), datiDiProva(), oltreSoglia(), percentoAssenza(), percentoDaLeggere(), segnalazioniDelCorso() (+67 more)

### Community 45 - "core/apparato · enumerations.ts"
Cohesion: 0.04
Nodes (64): AmbitoImpostazione, CartellaDiLavoro, Global, Workspace, ViewColumn, Beside, One, testi (+56 more)

### Community 46 - "core/dominio · calendarioToccato()"
Cohesion: 0.07
Nodes (76): calendarioToccato(), AnnoScolastico, CalendarioDellAnno, Sospensione, anniDaProporre(), annoDelMarcatore(), annoUfficiale, applicaVoci() (+68 more)

### Community 47 - "core/dominio · breaks.ts"
Cohesion: 0.07
Nodes (75): ancorataSullePause(), fineNellaGiornata(), fineSullaGriglia(), inizioAllIndietro(), inizioSullaGriglia(), intervalli(), Intervallo, invadeLePause() (+67 more)

### Community 48 - "contract/procedure · inoltra()"
Cohesion: 0.09
Nodes (49): inoltra(), procedura, t(), procedura, t(), procedura, procedureClasseAssenzeFoglio, procedura (+41 more)

### Community 49 - "contract/procedure · esigiLezione()"
Cohesion: 0.10
Nodes (48): esigiLezione(), STATI_APPELLO, procedura, t(), procedura, t(), procedura, procedureOreAppello (+40 more)

### Community 50 - "core/dominio · cruscotto.ts"
Cohesion: 0.07
Nodes (67): p(), procedura, t(), procedura, p(), procedura, t(), p() (+59 more)

### Community 51 - "esterno · dist_tests_domain_catalogo_modelli"
Cohesion: 0.04
Nodes (16): pngGrigio(), scansione(), ALTRE, corpo(), italiano, modelli, letto(), conIGruppi() (+8 more)

### Community 52 - "tests/api · prova()"
Cohesion: 0.05
Nodes (47): prova(), bussa(), chiedi(), PARTENZA, { radice, lavoro, dati }, chiedi(), PARTENZA, { radice, lavoro, dati } (+39 more)

### Community 53 - "desktop/apparato · chiamante()"
Cohesion: 0.06
Nodes (59): chiamante(), linkDiretto(), minutiDiAvviso(), alberoProcedure, foglie(), isProcedura(), verificaPercorsi(), percorsoIcona() (+51 more)

### Community 54 - "tests/ui · ADR-0045"
Cohesion: 0.04
Nodes (42): ADR-0045, electron-builder, esbuild, typescript, IMPRONTA, RADICE, configurazione(), file() (+34 more)

### Community 55 - "ui/views · lezioneFinita()"
Cohesion: 0.09
Nodes (65): lezioneFinita(), riepilogaPresenze(), lezioneCompilata(), ancorataAIcs(), eventiDellaLezione(), coloreDiLezione(), corsoDiLezione(), nomeClasseDiLezione() (+57 more)

### Community 56 - "desktop/apparato · chokidar"
Cohesion: 0.05
Nodes (56): EventEmitter, Smaltitore, impostaLingua(), apriConsole(), avviaConsoleAllAvvio(), avviaRicaricamento(), cambiaImpostazioniSviluppo(), chiediRiavvio() (+48 more)

### Community 57 - "desktop/apparato · requisitoMancante()"
Cohesion: 0.06
Nodes (55): requisitoMancante(), sospesa(), titoloImpostazioni(), DialogoPercorso, alCambioLingua(), executeCommand(), registerCommand(), caricate() (+47 more)

### Community 58 - "desktop/apparato · impianta()"
Cohesion: 0.05
Nodes (59): impianta(), limita(), appunti, aSchermoIntero(), Comando, dellApparato, finestraDeiContenuti(), openExternal() (+51 more)

### Community 59 - "desktop/apparato · updateInstaller.ts"
Cohesion: 0.08
Nodes (59): aggiornamentoInCorso(), argomentiAiutante(), concludiAggiornamento(), Consegna, consegnaAllAiutante(), decidiAllAvvio(), Decisione, FaseAiutante (+51 more)

### Community 60 - "core/azioni · motivoSicuro()"
Cohesion: 0.07
Nodes (57): motivoSicuro(), esitoDi(), it, testi, torna(), Ancora, ancoraAdesso(), conPosto() (+49 more)

### Community 61 - "ui/views · voce()"
Cohesion: 0.08
Nodes (58): voce(), testoLezione(), voceRisorsa(), contaComeAssenza(), contaUd(), deciso(), momentoLezione(), prossimaLezione() (+50 more)

### Community 62 - "ui/views · VoceProgramma"
Cohesion: 0.07
Nodes (56): VoceProgramma, Area, AREE, AREE_DELL_ANNO, avvertenzaCondotto(), Divisione, divisioneDi(), DIVISIONI (+48 more)

### Community 63 - "desktop/apparato · .fire()"
Cohesion: 0.07
Nodes (48): CANALE, CANALE_INTERFACCIA, CANALE_LINGUA, DISCRIMINANTI_CANALE, haDiscriminanteCanale(), escludiDaiDialoghi(), caricate(), deposito (+40 more)

### Community 64 - "core/dominio · impaginazioneDi()"
Cohesion: 0.07
Nodes (51): impaginazioneDi(), Contesto, FORMATI_LOGO, leggiModello(), Letto, nomiDelModello(), perchéNiente(), provaModello() (+43 more)

### Community 65 - "ui/views · corrispondeAlla()"
Cohesion: 0.08
Nodes (54): corrispondeAlla(), pezziDiRicerca(), EVENTO_MODALE_APERTA, apriPalette(), chiudiPalette(), corrisponde(), GruppoTrovato, ORDINE (+46 more)

### Community 66 - "tests/data · dist_tests_dictation"
Cohesion: 0.04
Nodes (16): FILE, USERDATA, voiceboxFinto(), finto, FILE, MAGIA, USERDATA, servitore() (+8 more)

### Community 67 - "contract/procedure · scrittura"
Cohesion: 0.11
Nodes (37): scrittura, procedura, RUOLI, t(), procedura, procedura, procedureValutazioniAllegato, esigiAllegato() (+29 more)

### Community 68 - "contract/manifest.ts · manifest.ts"
Cohesion: 0.05
Nodes (48): ACCESSI_DEL_CONDOTTO, aiutoDellaLingua(), aiutoDellaScelta(), ChiaveImpostazione, CHIAVI_DEL_COLLEGAMENTO, CHIAVI_DISMESSE, COMANDI, Comando (+40 more)

### Community 69 - "contract/procedure · consegne/common.ts"
Cohesion: 0.13
Nodes (35): chiRiguarda(), chiSpunta, esigiConsegna(), perChi, procedura, t(), it, testi (+27 more)

### Community 70 - "core/controlli · control.ts"
Cohesion: 0.10
Nodes (50): Aggiunte, attese, campoNumero(), campoTesto(), collegamento(), Contesto, controllo(), conUnita() (+42 more)

### Community 71 - "ui/views · PaginaSmistamento"
Cohesion: 0.10
Nodes (54): PaginaSmistamento, RiquadroPagina, dicePagine(), impostaCaratteri(), gestisci(), ZOOM_PREDEFINITO, alClic(), anteprimeDellHost() (+46 more)

### Community 72 - "core/dominio · scriviGenerato()"
Cohesion: 0.07
Nodes (49): scriviGenerato(), diventatiDelCorso(), documentiGenerati(), EsitoArchivio, paroleDelleStampe(), percorsoRisorsaPiano(), percorsoValutazione(), radiceDelNome() (+41 more)

### Community 73 - "tools/sample.mjs · assistantTools.mjs"
Cohesion: 0.04
Nodes (38): nuovo, PERCORSO, lavori, PREPARAZIONE, riepilogo, WORKFLOW, BUNDLE, CACHE (+30 more)

### Community 74 - "cli/main.mjs · access.mjs"
Cohesion: 0.09
Nodes (41): fileDellaChiave(), leggiChiave(), presentati(), indirizzo(), nomeUtente(), processoCondottoAttivo(), segretoDelCondotto(), comandoCatalogo() (+33 more)

### Community 75 - "ui/views · Azione"
Cohesion: 0.13
Nodes (49): Azione, dataDalNome(), carica(), aggiorna(), nomeSemestreScelto(), delCorso(), delDocente(), dellaClasse() (+41 more)

### Community 76 - "ui/views · dominio/letterhead.ts"
Cohesion: 0.11
Nodes (50): cartaDeiCorsi(), cartaDelCorso(), cartaVuota(), completaCarte(), spostaCorsi(), togliCarta(), ALTEZZA_LOGO, CartaIntestata (+42 more)

### Community 77 - "ui/components · bilancioSegni()"
Cohesion: 0.09
Nodes (47): bilancioSegni(), telefoniDi(), testataVista(), colFuoco(), contenitore(), controlla(), dopoIlDisegno(), finestra (+39 more)

### Community 78 - "desktop/apparato · .joinPath()"
Cohesion: 0.09
Nodes (41): ZOOM_MASSIMO, cartellaBundle(), cartellaCopie(), cartellaLavoro(), CARTELLE_BUNDLE, cartelleDiLavoro(), ContestoApplicazione, creaContesto() (+33 more)

### Community 79 - "ui/views · SEZIONI_ASSISTENTE"
Cohesion: 0.06
Nodes (43): SEZIONI_ASSISTENTE, AZIONI_CALENDARIO, COLONNE, FIGURA_CONFRONTO, FIGURA_ICS, FIGURA_PENDENZE, FIGURA_SETTIMANA, FIGURA_SMISTARE (+35 more)

### Community 80 - "core/dati · dati/archive.ts"
Cohesion: 0.09
Nodes (30): AltroAnno, COLLEZIONI, controllaDichiarate(), controllaSenzaBozze(), controllaVivo(), dichiarazioneSevera(), FilePersistito, GiroTrattenuto (+22 more)

### Community 81 - "core/dati · dati/calendar.ts"
Cohesion: 0.10
Nodes (21): copiaDallOrigine(), daFile(), eliminaCopia(), inRete(), leggiOrigine(), letti, percorsoCopia(), percorsoCopiaCalendario() (+13 more)

### Community 82 - "tests/interfaccia · @playwright/test"
Cohesion: 0.11
Nodes (17): @playwright/test, attendiRisposte(), FOTOGRAMMA, FRAME, OpzioniPannello, pannello(), valutaTutti(), Telaio (+9 more)

### Community 83 - "core/dati · llamaCpp.ts"
Cohesion: 0.07
Nodes (38): addormenta(), addormentaPesi(), apparecchia(), apri(), Budget, Caldo, carica(), chiusura() (+30 more)

### Community 84 - "ui/views · attivitaConPendenza()"
Cohesion: 0.10
Nodes (41): attivitaConPendenza(), indirizzoScrivibile(), numeroComponibile(), collegamento(), GenereRecapito, recapitoPremibile(), testi, mostraFiloDiLavoro() (+33 more)

### Community 85 - "desktop/shell · bandiera()"
Cohesion: 0.08
Nodes (38): bandiera(), DocumentoNoto, disegnaAmbiente(), allEsc(), ascolta(), ATTRIBUTI_DA_LEGGERE, elemento(), manda() (+30 more)

### Community 86 - "tests/ui · controlli.test.mjs"
Cohesion: 0.09
Nodes (19): BOOLEANE, cambia(), cercaTutti(), clic(), combacia(), discendenti(), DURATE, Elemento (+11 more)

### Community 87 - "core/dati · Archivio"
Cohesion: 0.10
Nodes (4): Archivio, motivoDi(), sottoEsportazioni(), nomeDelPacchetto()

### Community 88 - "contract/procedure · errore"
Cohesion: 0.13
Nodes (33): errore, procedura, t(), procedura, t(), procedura, t(), procedura (+25 more)

### Community 89 - "contract/procedure · common/plans.ts"
Cohesion: 0.15
Nodes (28): esigiPiano(), procedura, t(), procedura, procedura, procedurePiani, p(), procedura (+20 more)

### Community 90 - "tools/collections.mjs · buttons.mjs"
Cohesion: 0.05
Nodes (29): COMPORTAMENTO_ALTROVE, daGuardare, FABBRICHE, letti, muti, percorsi, CARTELLE, daGuardare (+21 more)

### Community 91 - "ui/memory.ts · Voce"
Cohesion: 0.09
Nodes (42): Voce, ammesso(), booleano(), CampiVecchi, contestoDa(), conVoce(), copiaDefiniti(), coppie() (+34 more)

### Community 92 - "core/dominio · richiesteAperte()"
Cohesion: 0.10
Nodes (38): richiesteAperte(), segnalazioniAssenza(), RecuperoProva, valoriDi(), assenteAllOra(), documentoDelRecupero(), ordina(), recuperiDaFare (+30 more)

### Community 93 - "core/dominio · addresses.ts"
Cohesion: 0.06
Nodes (40): CASELLE_POSTALI, INDIRIZZO_VUOTO, leggiIndirizzo(), PAROLE_TOPONIMO, sembraToponimo(), chiaviDi(), SIGLE_PRESENZA, AvanzamentoAttivita (+32 more)

### Community 94 - "core/dominio · normalization/check.ts"
Cohesion: 0.17
Nodes (41): fondiCheck(), normalizzaCheck(), normalizzaSpuntaCheck(), unCheckPerCorso(), compitiDiventatiConsegne(), conSpunteDiChiusura(), booleano(), coordinateDellAnno() (+33 more)

### Community 95 - "core/dati · .accoda()"
Cohesion: 0.09
Nodes (31): ultimiByte(), Voce, apriZip(), assembla(), comprimi(), comprimiAsync(), conCorpo(), corpi() (+23 more)

### Community 96 - "package.json · scripts"
Cohesion: 0.05
Nodes (41): scripts, build, buttons, calendario, census, ci, clean, collections (+33 more)

### Community 97 - "desktop/transports · Genere"
Cohesion: 0.10
Nodes (37): Genere, Forma, Accesso, avviaCondotto(), bustaEsito(), bustaGuasto(), cartellaDelSocket(), cartellaUtentePredefinita() (+29 more)

### Community 98 - "core/dominio · creaProgetto()"
Cohesion: 0.10
Nodes (37): creaProgetto(), nuovoIdFaseProgetto(), nuovoIdGiudizioProgetto(), nuovoIdProgetto(), coloreValido(), CellaProgetto, CompitoProgetto, CriterioProgetto (+29 more)

### Community 99 - "tests/helpers · fake-node-llama.mjs"
Cohesion: 0.07
Nodes (18): azzera(), Contesto, LlamaChatSession, Modello, parole(), resa(), Sequenza, altriCataloghi() (+10 more)

### Community 100 - "ui/assistant · chat.ts"
Cohesion: 0.12
Nodes (38): accendiVoce(), annullaVoce(), attesa(), attrezzo(), AttrezzoVisto, bolla(), chiudiGiro(), codaVoce (+30 more)

### Community 101 - "ui/views · help/assistant.testi.ts"
Cohesion: 0.06
Nodes (29): DE, EN, FR, it, it, DE, EN, FR (+21 more)

### Community 102 - "desktop/apparato · fermaRapporti()"
Cohesion: 0.08
Nodes (21): fermaRapporti(), Deposito, depositoJson(), EsitoLettura, leggiJson(), mancante(), OCCUPATO, rinominaConPazienzaSync() (+13 more)

### Community 103 - "core/dati · .leggiAltroAnno()"
Cohesion: 0.08
Nodes (10): jsonDi(), registroDa(), stessoDocumento(), testaDa(), testi, versioneDati(), Pacchetto, uguali() (+2 more)

### Community 104 - "core/dominio · duplicaIntegrazione()"
Cohesion: 0.10
Nodes (38): duplicaIntegrazione(), duplicaPiano(), casuale(), identificatore(), nuovoIdAllegato(), nuovoIdAllievo(), nuovoIdAnno(), nuovoIdAttivita() (+30 more)

### Community 105 - "package.json · eslint.config.mjs"
Cohesion: 0.06
Nodes (36): FORMA, FUORI, ADR-0052, SOSTANZA, SOSTANZA_TIPATA, author, bugs, url (+28 more)

### Community 106 - "ui/views · help/assistant.ts"
Cohesion: 0.18
Nodes (37): bottone(), figuraConfine(), figuraContesto(), figuraDettatura(), figuraModelli(), figuraRiquadro(), interruttore(), largoBottone() (+29 more)

### Community 107 - "desktop/transports · impagina()"
Cohesion: 0.11
Nodes (37): impagina(), contestoDelRegistro(), Battuta, conMotivo(), accorcia(), ammetteNiente(), Argomenti, AttrezzoUsato (+29 more)

### Community 108 - "desktop/shell · senzaAnno()"
Cohesion: 0.08
Nodes (30): senzaAnno(), titoloArea(), Valore, Annuncio, cerca, chiedi(), controlloDi(), disegna() (+22 more)

### Community 109 - "ui/commandBar.ts · RaggruppamentoCorsi"
Cohesion: 0.13
Nodes (36): RaggruppamentoCorsi, anticipaElenco(), barraComandi(), comandiInVolo, DocumentoInElenco, elementiDeiRegistri(), elementiDelProgramma(), filtriAgenda() (+28 more)

### Community 110 - "core/dati · dati/dictation.ts"
Cohesion: 0.10
Nodes (30): Collegamento, collegamentoDettatura(), dettaturaAccesa(), durataMs(), forza(), MotoreVoce, MOTORI, portaDi() (+22 more)

### Community 111 - "core/dati · appData.ts"
Cohesion: 0.12
Nodes (32): cartellaApplicazione(), Avanzamento, biglietto(), calcolaImpronta(), cartellaModelli(), cartellaPronta(), copieInCorso, dimenticaSorgente() (+24 more)

### Community 112 - "ui/projection.ts · AppelloProiettato"
Cohesion: 0.14
Nodes (32): AppelloProiettato, DocumentoProiettato, agenda(), appello(), argomenti(), calendario(), cellaAnno(), classiGiorno() (+24 more)

### Community 113 - "esterno · dist_tests_domain_chiaveindirizzo"
Cohesion: 0.06
Nodes (7): INDIRIZZI, PUNTI, { radice, lavoro, dati }, riga(), punto(), rubricaPiena(), TUTTO

### Community 114 - "cli/comandi · aspetta.mjs"
Cohesion: 0.11
Nodes (27): comandoAspetta(), comandoChiama(), componiIngresso(), converti(), deduci(), ErroreUso, FALSO, SENZA_VALORE (+19 more)

### Community 115 - "contract/procedure · llm/annulla.ts"
Cohesion: 0.13
Nodes (26): procedura, t(), p(), procedura, t(), procedura, t(), p() (+18 more)

### Community 116 - "core/dominio · .suVoce()"
Cohesion: 0.13
Nodes (30): allegateAComunicazioni(), chiusura(), contaAllievi(), contaVoti(), eliminazione, FileDaTogliere, fileDellaConsegna(), fileDelProgetto() (+22 more)

### Community 117 - "ui/views · ordinalePausa()"
Cohesion: 0.13
Nodes (29): ordinalePausa(), PausaSeguente, LaPausa(), notificaAnnullabile(), avanzateAnno(), campoAnno(), it, testi (+21 more)

### Community 118 - "ui/views · tracciatoIcona()"
Cohesion: 0.13
Nodes (31): tracciatoIcona(), testi, figuraDueComputer(), figuraOggi(), mucchio(), oraDiOggi(), largaPastiglia(), larghezzaTesto() (+23 more)

### Community 119 - "tools/calendario · argparse"
Cohesion: 0.09
Nodes (12): aggiungi_vacanze_estive(), _data(), estrai(), aggiungi(), intestato(), main(), _norm(), scarica() (+4 more)

### Community 120 - "core/dati · p()"
Cohesion: 0.10
Nodes (28): p(), procedura, t(), LLAMA_CPP, Attrezzo, ChiamataAttrezzo, collegamento, Domanda (+20 more)

### Community 121 - "ui/views · automation.testi.ts"
Cohesion: 0.07
Nodes (22): it, it, ordinaleInglese(), testi, PIF, un(), it, testi (+14 more)

### Community 122 - "ui/dom.ts · collegaRidisegno()"
Cohesion: 0.11
Nodes (29): collegaRidisegno(), disegna(), finestra(), radice, ADR-0048, aggiornaElemento(), contenutoTestuale(), inFondo() (+21 more)

### Community 123 - "ui/views · behind.ts"
Cohesion: 0.13
Nodes (30): figuraAvvisi(), figuraCopie(), figuraDate(), figuraDati(), SEZIONI_QUINTE, T, testi, rigaDelTrascinamento() (+22 more)

### Community 124 - "core/dominio · formatoDi()"
Cohesion: 0.16
Nodes (27): formatoDi(), ricopiaFoto(), immaginiDelDocumento(), nomeRitaglio(), pdfDi(), testi, percorsoFoto(), documentoFoglio() (+19 more)

### Community 125 - "os/windows · aggiornamento.ps1"
Cohesion: 0.22
Nodes (29): Addio(), Avvia-Installatore(), Barra-Colore(), Barra-Corre(), Barra-Misura(), Cartella-Scrivibile(), Chiudi-Bene(), Concludi-Installazione() (+21 more)

### Community 126 - "ui/components · pdfjs-dist/legacy/build/pdf.mjs"
Cohesion: 0.11
Nodes (21): pdfjs-dist, chiaveDi(), chiudi(), coda, CompitoPdf, disegna(), documentoDi(), DocumentoPdf (+13 more)

### Community 127 - "tools/icons.cjs · icons.cjs"
Cohesion: 0.10
Nodes (24): aMisura(), conDistintivo(), disegno(), disegnoDisinstallatore(), disegnoFascia(), disegnoInstallatore(), disegnoPortabile(), disegnoTestata() (+16 more)

### Community 128 - "ui/commands.ts · eseguiDalPulsante()"
Cohesion: 0.11
Nodes (29): eseguiDalPulsante(), interruttore(), pulsanteComando(), rinasceInVolo(), voceDiComando(), aiutoDi(), Ambito, COMANDI_CHECK (+21 more)

### Community 129 - "core/dominio · istanteAdesso()"
Cohesion: 0.18
Nodes (27): istanteAdesso(), Documento, SpuntaConsegna, DESTINATARI_CONSEGNA, documentiDiventatiConsegne(), MODI_CONSEGNA, normalizzaConsegna(), normalizzaSpunta() (+19 more)

### Community 130 - "ui/commands · BLOCCHI"
Cohesion: 0.13
Nodes (25): BLOCCHI, blocchiAccesi(), bloccoAperto(), BloccoProiezione, bloccoScorrendo(), riservato(), schedeProiezione(), VISTE_CALENDARIO (+17 more)

### Community 131 - "desktop/shell · ParametriDialogo"
Cohesion: 0.12
Nodes (27): ParametriDialogo, RispostaDialogo, annulla(), combacia(), dichiaraAltezza(), disegnaElenco(), conferma(), disegna() (+19 more)

### Community 132 - "esterno · dist_tests_domain_annidaproporre"
Cohesion: 0.09
Nodes (11): bozza(), CALENDARIO, componiFile(), FILE_GENERATO, FILE_JSON, fondi(), indirizzi(), python() (+3 more)

### Community 133 - "tools/i18n.mjs · i18n/page.ts"
Cohesion: 0.10
Nodes (25): argomenti, CARTELLE, CHIAMATE_DI_CODICE, contiene(), daSaltare(), dentroUnaFunzione(), elenco, esamina() (+17 more)

### Community 134 - "tests/api · reads.test.mjs"
Cohesion: 0.07
Nodes (12): ANNO_SCORSO, CALENDARIO, { radice, lavoro, dati }, momento(), byte(), deposito(), esegui(), pianoConFile() (+4 more)

### Community 135 - "contract/procedure · ErroreApi"
Cohesion: 0.21
Nodes (20): ErroreApi, it, testi, procedura, t(), esigiAllievoDelCorso(), esigiCasella(), esigiCheck() (+12 more)

### Community 136 - "core/dati · gguf.testi.ts"
Cohesion: 0.13
Nodes (22): Consigliato, it, testi, Deposito, FileRemoto, Avanzamento, consegna(), estrai() (+14 more)

### Community 137 - "core/dominio · oraValida()"
Cohesion: 0.16
Nodes (23): oraValida(), IMPOSTAZIONI_PREDEFINITE, nuovoIdCarta(), coloreLetto(), normalizzaListe(), normalizzaRicorrenza(), normalizzaScala(), numero() (+15 more)

### Community 138 - "core/dominio · chiaveValore()"
Cohesion: 0.12
Nodes (25): chiaveValore(), DIRETTIVE, FORMATI, NOME_LOGO, APRONO, CHIAVI_TESTA, controllaImmagine(), controllaMisura() (+17 more)

### Community 139 - "ui/dom.ts · ui/dom.ts"
Cohesion: 0.10
Nodes (24): aggiungi(), allaDiscesa(), allaSalita(), applicaClasse(), cammino(), campoDaScrivere(), chiama(), chiaveDiMorfosi() (+16 more)

### Community 140 - "cli/uninstall.mjs · cli/common.mjs"
Cohesion: 0.15
Nodes (25): cartellaDelSistema(), cartellaUtente(), cartellaUtentePrecedente(), NOME_APPLICAZIONE, NOME_PRECEDENTE, maiAcceso(), argomenti(), attendiChiusura() (+17 more)

### Community 141 - "contract/tools.ts · azioniSottoContratto()"
Cohesion: 0.15
Nodes (24): azioniSottoContratto(), procedure, presentazioneDetta(), registraTutte(), TUTTE, schemaJson(), azioneValida(), passaDaChiama() (+16 more)

### Community 142 - "ui/views · comeElenco()"
Cohesion: 0.18
Nodes (26): comeElenco(), ancoreDeiCapi(), fineConUd(), inizioConUd(), MINIMO_UD_AI_CAPI, udAiCapi(), oreConAppello(), gruppoAnno() (+18 more)

### Community 143 - "ui/views · durataPiano()"
Cohesion: 0.19
Nodes (25): durataPiano(), minutiDiScarto(), numeriDelleLezioni(), formattaDurata(), lezioneDiPiano(), pianoPerId(), pianoMostrato(), apriElenco() (+17 more)

### Community 144 - "core/dominio · calendarIcs.ts"
Cohesion: 0.12
Nodes (25): CalendarioLetto, eventiGrezzi(), EventoGrezzo, fusiValidi, fusoValido(), GIORNI_ICS, istanteDa(), leggiCalendario() (+17 more)

### Community 145 - "core/dominio · fogliDeiProgetti()"
Cohesion: 0.20
Nodes (23): fogliDeiProgetti(), allieviDelProgetto(), contiPresenze(), data(), datiProgetto(), datiProgettoAllievo(), durataDi(), fasiDi() (+15 more)

### Community 146 - "core/dati · .prendiPacchetto()"
Cohesion: 0.12
Nodes (19): codifica, daTenere(), decodifica, ErrorePacchetto, fileSerratura(), FORMATO, MANIFESTO, momentoDellaCopia() (+11 more)

### Community 147 - "core/dati · dati/history.ts"
Cohesion: 0.13
Nodes (5): Passo, PassoAperto, perDisfare(), Storia, ADR-0050

### Community 148 - "tools/layers.mjs · ADR-0055"
Cohesion: 0.09
Nodes (23): ADR-0055, dependency-cruiser, piano(), chiaviGiri, codiceTs, conTrePunti, daGuardare, derogate (+15 more)

### Community 149 - "ui/assistant.ts · ui/assistant.ts"
Cohesion: 0.19
Nodes (24): acceso(), altrove(), assistenteAperto(), abbandona(), conversazioneInCorso(), prendi(), rimetti(), svuota() (+16 more)

### Community 150 - "ui/assistant · bottoneDelContesto()"
Cohesion: 0.12
Nodes (25): bottoneDelContesto(), conGruppo(), conTendina(), eNonElencate(), ID_DELLA_TENDINA, NOME_DI_ADESSO, ParteAccendibile, PARTI (+17 more)

### Community 151 - "contract/procedure · registro/altrove.ts"
Cohesion: 0.19
Nodes (18): p(), procedura, t(), procedura, t(), procedureRegistro, p(), procedura (+10 more)

### Community 152 - "core/dati · destinazione()"
Cohesion: 0.17
Nodes (20): destinazione(), importaInDisparte(), perchéNonEntra(), Pacco, argomenti(), esegui(), programmaDa(), programmaValido() (+12 more)

### Community 154 - "ui/views · signature.ts"
Cohesion: 0.17
Nodes (22): AMMESSI, ATTRIBUTI, barra(), campoFirma(), chiediCollegamento(), comando(), consegna(), costruisci() (+14 more)

### Community 155 - ".claude/skills · nuova.mjs"
Cohesion: 0.11
Nodes (21): azione, cammello(), capitale(), cartelle, collezioni, corpoLettura, dentro, fatti (+13 more)

### Community 156 - "contract/procedure · testi"
Cohesion: 0.15
Nodes (17): testi, procedura, t(), VOCE, procedureAssistente, procedura, RISULTATO, t() (+9 more)

### Community 157 - "core/dominio · Raggruppamento"
Cohesion: 0.10
Nodes (16): Raggruppamento, TipoAttivita, TipoConsegna, TipoOsservazione, TipoValutazione, agganciato(), MomentoOrfano, MOTIVI_ORFANO (+8 more)

### Community 158 - "docs/DECISIONI.md · Motore di template dei rapporti"
Cohesion: 0.11
Nodes (12): Motore di template dei rapporti, Integrita referenziale e cascata, contaComeAssenza (regola di calcolo), Le dodici collezioni persistite, Entita Impostazioni (Intestazione, CartaIntestata), Unita didattiche e minutiUd, Entita Progetto (IntegrazioneProgetto, FaseProgetto), Entita Registro (+4 more)

### Community 159 - "tests/interfaccia · attendi()"
Cohesion: 0.11
Nodes (18): attendi(), eseguiTesto(), OGGI, ponte(), ULTIMA, Azione, C1, C2 (+10 more)

### Community 160 - "esbuild.mjs · aliasApparato"
Cohesion: 0.10
Nodes (17): aliasApparato, applicazioneIn(), cataloghi(), comune, CON_FINTO, CON_FINTO_E_APPARATO, conTemporal, filePagine() (+9 more)

### Community 161 - "package.json · devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, axe-core, @cantoo/pdf-lib, chokidar, dependency-cruiser, electron, electron-builder, esbuild (+14 more)

### Community 162 - "core/azioni · UsoModello"
Cohesion: 0.14
Nodes (19): UsoModello, avvia(), CHIAVI_DEI_MODELLI, coda, imposta(), nomiInCoda(), racconta(), raccontaCoda() (+11 more)

### Community 163 - "desktop/shell · formerName.ts"
Cohesion: 0.17
Nodes (17): comeLiConfronta(), EsitoTrasloco, FILE_CON_PERCORSI, ripassa(), riscriviPercorsi(), sostituisciPrefisso(), traslocaDati(), èCartella() (+9 more)

### Community 164 - "ui/sidebar.ts · raggruppamentoDeiCorsi()"
Cohesion: 0.22
Nodes (19): raggruppamentoDeiCorsi(), scegliClasseDelFascicolo(), guscio(), chiudiSidebarMobile(), entraNelGruppo(), imposta(), interruttoreSidebar(), sfondoSidebar() (+11 more)

### Community 165 - "desktop/shell · BottoneMessaggio"
Cohesion: 0.19
Nodes (18): BottoneMessaggio, chiediMessaggio(), onDidChangeConfiguration, applicaAvvioConWindows(), osservaAvvioConWindows(), togliAvvioConWindows(), voceDiAvvio(), chiedi() (+10 more)

### Community 167 - "tools/licenses.mjs · applicazione"
Cohesion: 0.10
Nodes (16): applicazione, license-checker-rseidelsohn, AMMESSE, AMMESSE_RISORSE, AMMESSE_SVILUPPO, avvisi, dichiarate, eccezioni (+8 more)

### Community 168 - "ui/views · search.ts"
Cohesion: 0.19
Nodes (19): campo(), cerca(), distanza(), formeDi(), forseCercavi(), parolaInFila(), paroleDellaGuida(), paroleDi() (+11 more)

### Community 169 - ".claude/skills · Skill sciame"
Cohesion: 0.18
Nodes (12): Skill sciame, Tempo zero: linea di partenza verde, Skill verifica, Config issue template, AGENTS.md (istruzioni agenti), CLAUDE.md (istruzioni progetto), CONTRIBUTING.md (Contribuire a Regiklass), CANTIERE.md (lavoro aperto) (+4 more)

### Community 170 - "contract/procedure · aggiornamenti.testi.ts"
Cohesion: 0.27
Nodes (12): it, testi, procedura, procedureAggiornamenti, procedura, procedura, procedura, p() (+4 more)

### Community 171 - "core/controlli · Ascolta"
Cohesion: 0.15
Nodes (18): Ascolta, Cambia, Disegno, Esito, Scelta, ValoreCampo, campo(), disegnoDi() (+10 more)

### Community 172 - "core/dominio · .portaAlFormato()"
Cohesion: 0.15
Nodes (17): DatiGrezzi, ErroreVersionePiuRecente, FormatoAggiornato, fraseVersionePiuRecente(), integrazioneDalCorso(), letterale(), noteNeiPrerequisiti(), PASSI_DEL_FORMATO (+9 more)

### Community 173 - "tests/interfaccia · ref_node_child_process"
Cohesion: 0.11
Nodes (11): sorgente(), BUNDLE, RADICE, Dom, ADR-0050, Assegnazione, pdf, STILI (+3 more)

### Community 174 - "ui/statusBar.ts · FUOCO_ANNO"
Cohesion: 0.22
Nodes (19): FUOCO_ANNO, menuDeiRegistri(), alternaMenuSotto(), stessoPulsante(), barraStato(), nomeDelModello(), quando(), schedaDelCorso() (+11 more)

### Community 175 - "desktop/shell · commandLine.ts"
Cohesion: 0.20
Nodes (17): aggiungiAlPercorsoDiUnix(), aggiungiAlPercorsoDiWindows(), BLOCCO, cartellaDeiComandi(), giàNelPercorso(), installa(), percorsoDelPonte(), perLaShell() (+9 more)

### Community 177 - "ui/pages.ts · voceDiCorso()"
Cohesion: 0.21
Nodes (17): voceDiCorso(), nomeDelCorso(), gruppiDiPagine(), GruppoPagina, nomeDelGruppo(), ORDINE, Pagina, paginaVisibile() (+9 more)

### Community 178 - "ui/views · outside.ts"
Cohesion: 0.12
Nodes (16): eccesso(), FIGURA_CONDOTTO, FIGURA_PROMEMORIA, FIGURA_RISERVATI, FIGURA_VASSOIO, figuraProiezione(), IT, MENU_VASSOIO (+8 more)

### Community 179 - "core/dominio · outlook.ts"
Cohesion: 0.18
Nodes (16): apriConOutlook(), candidatiWindows(), dalRegistro(), eseguibileOutlook(), esiste(), outlookAccettabile(), primoCheEsiste(), argomentiOutlook() (+8 more)

### Community 180 - "contract/presentation.ts · presentation.ts"
Cohesion: 0.17
Nodes (16): allinea(), Blocco, BloccoLetto, campo(), cella(), Colonna, ColonnaAnnidata, ColonnaLetta (+8 more)

### Community 181 - "tests/interfaccia · schermata()"
Cohesion: 0.19
Nodes (11): schermata(), valutaSu(), Anno, apri(), Misura, Ora, aspetto(), provaNativa() (+3 more)

### Community 182 - "tools/census.mjs · census.mjs"
Cohesion: 0.12
Nodes (14): CARTELLE, citazioni, dichiarati, doppi, ESTENSIONI, fileMorti, giàQui, mai (+6 more)

### Community 183 - "tools/coverage.mjs · coverage.mjs"
Cohesion: 0.18
Nodes (14): conteggiNeiPunti(), GREZZI, gruppo(), percento(), preparaScript(), registra(), riassunto(), riporta() (+6 more)

### Community 184 - "tsconfig.json · tsconfig.json"
Cohesion: 0.12
Nodes (16): compilerOptions, exactOptionalPropertyTypes, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch, noImplicitOverride (+8 more)

### Community 185 - "ui/assistant · answer.ts"
Cohesion: 0.24
Nodes (15): corpoDellaRisposta(), disegna(), paragrafo(), scritti(), tabella(), allineamenti(), Allineamento, blocchi() (+7 more)

### Community 186 - "ui/views · righe()"
Cohesion: 0.19
Nodes (16): righe(), tastino(), figuraFoglio(), menu(), doveSiVedeLaVersione(), eccesso(), GIORNATA_ESEMPIO, giornataDisegnata() (+8 more)

### Community 187 - ".claude/skills · Skill architettura"
Cohesion: 0.17
Nodes (11): Skill architettura, Guida decisionale «Dove metto questo codice?», npm run layers (tools/layers.mjs), Posto e navigazione vai()/vaiA() (ADR-47), Riferimento albero delle procedure, Contratto davanti al nucleo (contract/), Decisione D8 (cinque strati), Trasporti condotto/assistente (+3 more)

### Community 188 - ".claude/skills · togli.mjs"
Cohesion: 0.13
Nodes (11): argomenti, cammello(), capitale(), cartelle, citazioni, fatti, nome, segmenti (+3 more)

### Community 189 - "desktop/transports · procedura()"
Cohesion: 0.19
Nodes (14): procedura(), breviDeiCampi(), chiaveIntoccabile(), eseguiMetodo(), GuastoRpc, INGRESSO_ATTREZZI, permessoMancante(), permessoMancantePerMetodo() (+6 more)

### Community 190 - "ui/views · ImpostazioniDaSalvare"
Cohesion: 0.23
Nodes (14): ImpostazioniDaSalvare, sezioneAnno(), daSalvare(), detto(), IntestazioneDaSalvare, ModificheImpostazioni, PASSI_FINE_SEMESTRE, PASSI_VOTI (+6 more)

### Community 191 - "docs/immagini · anno_esempio (documento campione)"
Cohesion: 0.17
Nodes (16): anno_esempio (documento campione), Barra di stato (prossima lezione, pendenze), Barra laterale di navigazione (Agenda, Registro corso, Docente di classe, L'anno, Il programma), Corsi (I MEC A, III INF C, II ELE B), Filtri Anno/Periodo/Corso, Lezione corrente evidenziata (bordo tratteggiato rosa), Azioni Modifica / Proietta, Navigazione Oggi/Indietro/Avanti/Prossima lezione (+8 more)

### Community 192 - "stryker.config.json · stryker.config.json"
Cohesion: 0.12
Nodes (15): buildCommand, concurrency, coverageAnalysis, htmlReporter, fileName, ignorePatterns, jsonReporter, fileName (+7 more)

### Community 193 - "ui/views · casella()"
Cohesion: 0.17
Nodes (14): casella(), casellaSigla(), BARRA_LATERALE, figuraMatrice(), figuraPersone(), figuraScheda(), forte, linguette() (+6 more)

### Community 194 - "ui/views · help/lesson.ts"
Cohesion: 0.14
Nodes (15): casella(), CICLO_ORA, COLONNE_UD, ELENCO_ORE, LATERALI, MATRICE_APPELLO, MODULO_CONSEGNA, PAGINA_LEZIONE (+7 more)

### Community 195 - "tests/interfaccia · ADR-0007"
Cohesion: 0.22
Nodes (10): ADR-0007, riquadro(), valuta(), assesta(), griglia(), ADR-0050, salvaSenzaRisposta(), apriOggi() (+2 more)

### Community 196 - "docs/immagini · Screenshot: Calendario (vista Settimana)"
Cohesion: 0.15
Nodes (15): Screenshot: Calendario (vista Settimana), Documento anno_esempio, Barra di stato (prossima lezione, pendenze), Barra laterale di navigazione (Agenda, Registro, Docente di classe, L'anno, Il programma), Blocco lezione (orario, classe, corso, numero lezione, UD), Filtri Anno / Periodo / Corso, Lezione da svolgere (bordo tratteggiato), Modalità vista (Settimana / Mese / Anno / Agenda) (+7 more)

### Community 197 - "ui/shortcuts.ts · COMANDI_UI"
Cohesion: 0.31
Nodes (14): COMANDI_UI, comandoPerId(), dentroUnCampo(), avanti(), indietro(), vaiA(), consegnaIlCampo(), coperta() (+6 more)

### Community 198 - ".claude/skills · Skill formato"
Cohesion: 0.19
Nodes (10): Skill formato, Campioni tests/samples/formato (npm run sample), Impronta dei campi (AGGIORNA_IMPRONTA=1 npm test), Normalizzazione con predefiniti (core/dominio/normalization), PASSI_DEL_FORMATO e porta (core/dominio/upgrades.ts), VERSIONE_DATI (core/dominio/models.ts), Glossario del registro, Skill testi (+2 more)

### Community 199 - "docs/API.md · core/azioni README (copertura API delle azioni"
Cohesion: 0.19
Nodes (9): core/azioni README (copertura API delle azioni), API.md (interfaccia di programmazione), Assistente LLM (solo letture, dati non passano dal modello), Canale delle domande (letture fuori coda), Centralino delle Azioni (contract/switchboard.ts), Condotto JSON-RPC, Procedura API (busta, codici, schema), Riga di comando regi (+1 more)

### Community 200 - "tools/dev.mjs · copiaCaratteriPdf()"
Cohesion: 0.24
Nodes (10): copiaCaratteriPdf(), applicazione, avviaElectron(), chiudi(), contesti, dice(), finitoIlPrimoGiro(), primoGiro (+2 more)

### Community 201 - "tests/interfaccia · settingsKeyboard.spec.ts"
Cohesion: 0.14
Nodes (11): ACCESO, ALTEZZA, annuncia(), CONTROLLI, DIMENSIONE, FIGLIA, MINUTI, RECAPITI (+3 more)

### Community 202 - "tools/procedures.mjs · procedures.mjs"
Cohesion: 0.14
Nodes (12): aree, azioni, cartelle, DICHIARA, doppie, file, generale, indici (+4 more)

### Community 203 - "core/dati · geocoding.ts"
Cohesion: 0.24
Nodes (11): chiedi(), Domanda, domandePer(), EsitoGeocodifica, geocodifica(), PuntoTrovato, rispettaIlPasso(), RispostaNominatim (+3 more)

### Community 205 - "esterno · dist_tests_letterheadcourses"
Cohesion: 0.15
Nodes (5): anagrafe, classi, corsi, materie, visibili

### Community 206 - "docs/immagini · Documento anno_esempio"
Cohesion: 0.21
Nodes (13): Documento anno_esempio, Appello (presenze P/X/R per UD, minuti ritardo, nota), Barra laterale di navigazione (Agenda, Registro, Docente di classe, L'anno, Il programma), Check (documenti da firmare per persona in formazione), Consegne (compiti aperti con avanzamento per persona), Navigatore lezioni (20 di 36), Pendenze (contatore in barra laterale e di stato), Persona in formazione (+5 more)

### Community 207 - "tools/mutants.mjs · ref_node_util"
Cohesion: 0.15
Nodes (9): @stryker-mutator/core, inizio, minuti, prove, sopravvissuti, sorgente, UCCISI, { values: opzioni, positionals: sciolti } (+1 more)

### Community 208 - "tsconfig.js.json · ./tsconfig.json"
Cohesion: 0.15
Nodes (12): ./tsconfig.json, compilerOptions, allowJs, checkJs, lib, noImplicitAny, paths, strict (+4 more)

### Community 209 - ".github/workflows · Compattare VERSIONE_DATI prima di una re"
Cohesion: 0.17
Nodes (10): Prova del fumo (tools/smoke.mjs), Tre controlli d'obbligo: typecheck, eslint, npm test, Pull request template, Workflow rilascio, latest.yml per electron-updater, Firma del codice con SignPath, Workflow verifica, Job fumo (build + smoke) (+2 more)

### Community 210 - "ui/assistant · IdVisto"
Cohesion: 0.27
Nodes (11): IdVisto, RisultatoAssistente, tabellaAssistente(), Turno, blocco(), coda(), haForma(), risultatoLetto() (+3 more)

### Community 211 - "tests/ui · domSintetico.mjs"
Cohesion: 0.21
Nodes (4): preparaDomSintetico(), suDocumento, NIENTE, TABELLA

### Community 212 - "tools/mail-probe.ps1 · mail-probe.ps1"
Cohesion: 0.35
Nodes (11): Base64(), Chiedi-Microsoft(), Decodifica-Jwt(), Gettone-ConCodice(), Leggi-Smtp(), Prova-AuthSmtp(), Prova-Oauth(), Prova-Password() (+3 more)

### Community 213 - "ui/bookmark.ts · daRicordare()"
Cohesion: 0.21
Nodes (11): daRicordare(), contenitore(), misura(), riprendi(), seguiScorrimento(), scriviStatoPersistito(), setState(), Segnalibro (+3 more)

### Community 214 - "ui/components · VoceScelta"
Cohesion: 0.17
Nodes (12): VoceScelta, OpzioniPulsante, NomeIcona, TitoloMenu, VoceMenu, Voce, GruppoDiPagine, Porzione (+4 more)

### Community 215 - ".claude/skills · core/controlli: DOM condiviso dei controlli"
Cohesion: 0.20
Nodes (8): core/controlli: DOM condiviso dei controlli (ADR-52), Skill impostazione, Dogana valoreConMotivo, Due superfici: pagina del pannello e finestra nativa, Manifesto IMPOSTAZIONI (contract/manifest.ts), Riferimento schemi d'ingresso, Convalida valibot (ADR-28, ADR-50), Dependabot config

### Community 216 - ".claude/skills · Riferimento prove delle procedure"
Cohesion: 0.18
Nodes (9): Riferimento prove delle procedure, Conti scritti a mano (tests/counts.test.mjs), Prove che leggono il sorgente, Skill prove, Proprietà con fast-check, Prove sul sorgente diventano regole ESLint, Prove protette (ADR-03, 05, 11, 12, 13, 17, 18, 28, 37, 43), Snapshot per i rapporti (+1 more)

### Community 217 - "docs/immagini · Pendenze screenshot"
Cohesion: 0.22
Nodes (11): Pendenze screenshot, anno_esempio (documento campione), Barra laterale di navigazione, Raggruppamento per corso (I MEC A - Calcolo professionale), Momenti di valutazione, Nuova consegna, Selettore Anno e Periodo, Recuperi da fissare / da riconsegnare (+3 more)

### Community 218 - "tests/interfaccia · accessibility.spec.ts"
Cohesion: 0.18
Nodes (7): AXE, CONFIGURAZIONE, prepara(), SCELTE, TUTTI_I_CONTROLLI, Violazione, PAGINA_CON_TITOLO

### Community 219 - ".claude/skills · Riferimento LLM (catalogo per il modello)"
Cohesion: 0.27
Nodes (6): Riferimento LLM (catalogo per il modello), Catalogo per il modello (resources/tools.json), Comando regi catalogo, Skill procedure-api, npm run procedures, npm run tools / resources/tools.json

### Community 220 - "contract/procedure · intestazione/index.ts"
Cohesion: 0.38
Nodes (6): procedureIntestazione, it, testi, procedura, procedura, modelli

### Community 221 - "core/i18n · flags.ts"
Cohesion: 0.24
Nodes (7): BANDIERE, Disegno, figuraLingua(), Forma, REGNO_UNITO, schermo(), span()

### Community 222 - "tests/helpers · Emettitore"
Cohesion: 0.20
Nodes (3): Emettitore, FintoIpc, Tray

### Community 223 - "core/dominio · CellaOsservata"
Cohesion: 0.31
Nodes (7): CellaOsservata, SegnoOsservato, CellaDiOra, ContoAspetto, NOMI_SEGNO, it, testi

### Community 224 - "docs/immagini · Screenshot Valutazioni (Momenti di valutazio"
Cohesion: 0.31
Nodes (9): Screenshot Valutazioni (Momenti di valutazione), anno_esempio (documento campione), Barra laterale di navigazione Registro, Filtri Anno / Periodo / Corso, Griglia voti per persona in formazione, Media pesata, Momento di valutazione, Pannello dettaglio valutazione con statistiche (+1 more)

### Community 225 - "tools/signing.mjs · ref_app_builder_lib"
Cohesion: 0.28
Nodes (6): [comando, argomento], fileDiAggiornamento(), firmati(), impronta(), NON_AGGIORNAMENTO, PACCHETTI

### Community 228 - "tests/interfaccia · misure.spec.ts"
Cohesion: 0.31
Nodes (8): aTurno(), campione(), Caso, confronta(), migliore(), Misura, ADR-0006, ADR-0050

### Community 229 - "ui/assistant · voice.ts"
Cohesion: 0.33
Nodes (8): apriMicrofono(), Ascolto, forza(), FREQUENZA, interi(), perchéNo(), Presa, unisci()

### Community 230 - "CODE_OF_CONDUCT.md · CODE_OF_CONDUCT.md (Codice di comportam"
Cohesion: 0.29
Nodes (5): CODE_OF_CONDUCT.md (Codice di comportamento), Contributor Covenant 2.1, La firma del codice, README.md (Regiklass vetrina), SECURITY.md (Sicurezza)

### Community 231 - "core/dominio · csvPresenze()"
Cohesion: 0.38
Nodes (6): csvPresenze(), csvValutazioni(), cella(), leggiCsv(), righe(), scopri()

### Community 232 - "desktop/shell · reader/reader.ts"
Cohesion: 0.29
Nodes (3): cornice, segni, titolo

### Community 233 - "knip.config.ts · knip.config.ts"
Cohesion: 0.33
Nodes (5): citatiComeStringa(), fileSotto(), giàVisti, PERCORSO, ADR-0047

### Community 234 - "package.json · dependencies"
Cohesion: 0.29
Nodes (7): dependencies, electron-updater, idiomorph, immer, node-llama-cpp, @tanstack/virtual-core, valibot

### Community 235 - "tools/screenshotDocs.mjs · screenshotDocs.mjs"
Cohesion: 0.48
Nodes (6): attendiDisegno(), cartellaDaArgomenti(), creaPagina(), dimensioniPng(), generaTutto(), SCATTI

### Community 236 - "contract/procedure · cerca.testi.ts"
Cohesion: 0.53
Nodes (5): fraCaporali(), fraGuillemets(), fraVirgolette(), it, testi

### Community 238 - "tests/interfaccia · calendarContrast.spec.ts"
Cohesion: 0.40
Nodes (4): Colore, luminanza(), rapporto(), Stile

### Community 239 - "core/dominio · isoValida()"
Cohesion: 0.40
Nodes (5): isoValida(), conRiconsegnaDelMomento(), validaRicorrenza(), letteraValida(), ordinaSettimane()

### Community 242 - "package.json · imports"
Cohesion: 0.40
Nodes (5): imports, #contract/*, #core/*, #desktop/*, #ui/*

### Community 244 - ".claude/settings.json · settings.json"
Cohesion: 0.50
Nodes (3): hooks, UserPromptSubmit, $schema

### Community 245 - "core/azioni · nonSupportato()"
Cohesion: 0.50
Nodes (3): nonSupportato(), it, testi

### Community 246 - ".dependency-cruiser.cjs · .dependency-cruiser.cjs"
Cohesion: 0.50
Nodes (3): ADR-0050, ADR-0052, VALORE

## Ambiguous Edges - Review These
- `Consegne (compiti aperti con avanzamento per persona)` → `Pendenze (contatore in barra laterale e di stato)`  [AMBIGUOUS]
  docs/immagini/classe.png · relation: conceptually_related_to
- `Momento di valutazione` → `Indicatore R (recupero)`  [AMBIGUOUS]
  docs/immagini/valutazioni.png · relation: conceptually_related_to

## Knowledge Gaps
- **2065 isolated node(s):** `coda-sciame.sh script`, `$schema`, `UserPromptSubmit`, `{ liberi, opzioni }`, `genere` (+2060 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 3202 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Consegne (compiti aperti con avanzamento per persona)` and `Pendenze (contatore in barra laterale e di stato)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Momento di valutazione` and `Indicatore R (recupero)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `parole` connect `Viste e azioni del pannello` to `desktop/shell · ParametriDialogo`, `Moduli del pannello`, `Procedure: definisci e letture`, `Agenda, compleanni, giornata`, `Check e consegne`, `Appello e ritardi`, `Orario e tratti della giornata`, `Assenze e segnalazioni`, `core/dominio · fogliDeiProgetti()`, `Guscio Electron e pacchetto`, `Voti, scale e recuperi`, `Azioni applicative`, `ui/assistant · bottoneDelContesto()`, `contract/procedure · registro/altrove.ts`, `Account Microsoft`, `Progetti nel corso (vista UI)`, `Navigazione e percorso`, `Esportazioni e giornale`, `Indirizzi e mappa`, `Procedure progetti`, `Procedure anni e calendario`, `desktop/shell · BottoneMessaggio`, `Osservatori e avvio`, `Icone e barra titolo`, `Tipi di attività`, `contract/procedure · aggiornamenti.testi.ts`, `Risorse asincrone del pannello`, `Documenti e avvisi del corso`, `core/dominio · calendarioToccato()`, `contract/procedure · inoltra()`, `contract/procedure · esigiLezione()`, `core/dominio · cruscotto.ts`, `contract/presentation.ts · presentation.ts`, `ui/views · lezioneFinita()`, `desktop/apparato · chokidar`, `desktop/apparato · requisitoMancante()`, `desktop/apparato · impianta()`, `desktop/apparato · updateInstaller.ts`, `ui/views · righe()`, `ui/views · voce()`, `ui/views · ImpostazioniDaSalvare`, `core/dominio · impaginazioneDi()`, `ui/views · casella()`, `ui/views · help/lesson.ts`, `contract/procedure · scrittura`, `core/controlli · control.ts`, `ui/views · PaginaSmistamento`, `ui/views · Azione`, `ui/views · dominio/letterhead.ts`, `ui/components · bilancioSegni()`, `ui/views · SEZIONI_ASSISTENTE`, `ui/views · attivitaConPendenza()`, `desktop/shell · bandiera()`, `contract/procedure · errore`, `core/dominio · csvPresenze()`, `ui/views · help/assistant.ts`, `ui/commandBar.ts · RaggruppamentoCorsi`, `ui/projection.ts · AppelloProiettato`, `ui/views · tracciatoIcona()`, `ui/views · behind.ts`, `core/dominio · formatoDi()`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `h()` connect `Icone e barra titolo` to `ui/commands.ts · eseguiDalPulsante()`, `ui/commands · BLOCCHI`, `Moduli del pannello`, `Viste e azioni del pannello`, `Agenda, compleanni, giornata`, `ui/dom.ts · ui/dom.ts`, `Check e consegne`, `Appello e ritardi`, `ui/views · comeElenco()`, `Assenze e segnalazioni`, `Voti, scale e recuperi`, `Orario e tratti della giornata`, `ui/views · durataPiano()`, `Stato UI e compleanni`, `ui/assistant.ts · ui/assistant.ts`, `Progetti nel corso (vista UI)`, `ui/views · signature.ts`, `Navigazione e percorso`, `Indirizzi e mappa`, `ui/sidebar.ts · raggruppamentoDeiCorsi()`, `Tipi di attività`, `Risorse asincrone del pannello`, `core/controlli · Ascolta`, `core/dominio · calendarioToccato()`, `core/dominio · breaks.ts`, `ui/statusBar.ts · FUOCO_ANNO`, `ui/views · lezioneFinita()`, `ui/assistant · answer.ts`, `ui/views · voce()`, `ui/views · ImpostazioniDaSalvare`, `ui/views · corrispondeAlla()`, `ui/views · PaginaSmistamento`, `ui/views · Azione`, `ui/views · dominio/letterhead.ts`, `ui/components · bilancioSegni()`, `ui/assistant · IdVisto`, `ui/views · attivitaConPendenza()`, `ui/assistant · chat.ts`, `ui/commandBar.ts · RaggruppamentoCorsi`, `ui/projection.ts · AppelloProiettato`, `ui/views · ordinalePausa()`, `ui/dom.ts · collegaRidisegno()`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `lingua()` connect `Account Microsoft` to `core/dominio · impaginazioneDi()`, `Icone e barra titolo`, `core/controlli · control.ts`, `Cataloghi testi i18n`, `Protocollo e pannelli desktop`, `Prove date e formato`, `ui/views · search.ts`, `Documenti e avvisi del corso`, `Testi delle azioni`, `core/dati · dati/dictation.ts`, `desktop/shell · commandLine.ts`, `Guscio Electron e pacchetto`, `esterno · dist_tests_domain_catalogo_modelli`, `desktop/shell · bandiera()`, `desktop/apparato · chokidar`, `desktop/apparato · updateInstaller.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `coda-sciame.sh script`, `$schema`, `UserPromptSubmit` to the rest of the system?**
  _2065 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prove ambiente e file temporanei` be split into smaller, more focused modules?**
  _Cohesion score 0.0176759410801964 - nodes in this community are weakly interconnected._