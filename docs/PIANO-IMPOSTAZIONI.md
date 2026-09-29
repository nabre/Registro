# Piano: pagine impostazioni

Stato: **approvato** 2026-09-29 (§ 8 chiuso). In lavorazione per fasi (§ 7). Fonte: giro di sciame 2026-09-28, quattro
esplorazioni parallele (programma, documento, navigazione e doppioni, controlli).
Ogni riga cita il posto nel codice; i dettagli di lettura stanno nel codice, non
qui. Voce aperta in [CANTIERE.md](CANTIERE.md) § «Impostazioni».

## 1. Problemi, in breve

- 5 livelli (ambito › gruppo › sezione › scheda › gruppo di chiavi). Troppi.
- 3 gruppi su 7 con una sezione sola: Liste, Comunicazioni, Account.
- Sezioni senza impostazioni: «Questo file», elenco anni. Azioni di file dentro le impostazioni.
- Due paradigmi: righe del programma con predefinito/Ritira/chiave; schede del documento con campi nudi.
- Ambito detto a metà: pastiglia «file» solo su riga 2 (Liste non la mostra mai), nessuna pastiglia «computer».
- Stessa scelta in più posti: modelli `.gguf` (6), cartella modelli (2), posta (scheda, Ctrl+K, menu nativo), account Microsoft vs posta, OneDrive (3 porte), materie (impostazioni e Corsi), tipi di settimana (Liste e Anno).
- Finestra nativa diversa dal pannello: 13 gruppi con altri nomi, valori grezzi (`tel`, `outlookWeb`), niente avanzate, posta modificabile a mano, figure copiate a mano.
- Controlli: testo libero dove c'è una scelta; unità in etichetta o assenti; `passo:'any'` sui minuti; tendine con frasi intere come opzioni; controlli senza nome accessibile (`program.ts:88,106,128`), checkbox col nome «Acceso».
- Conferme e riscontri incoerenti fra schede (toast sì/no, conferma sì/no/pericolo).

## 2. Guasti trovati (da correggere per primi)

| # | Guasto | Dove | Stato |
|---|---|---|---|
| G0 | Ogni salvataggio da scala, giornata, liste, firma cancellava appellativo/nome/cognome | `ui/pannello/views/settings/document.ts` `intestazioneDaSalvare`; rete in `core/azioni/system.ts` `partiDelNome` | **fatto**, prova in `tests/api/writes.test.mjs` |
| G1 | Dogana `formato:'modello'` vuole un percorso assoluto, il valore giusto è un nome nudo: rifiuta il giusto, accetta e ignora il sbagliato | `desktop/apparato/settings.ts:350`, `core/dati/gguf.ts:228` | **fatto**: `nomeDiModello` in `core/dati/ggufName.ts`, prova in `tests/environment/settings.test.mjs` |
| G2 | Il filtro mostra `ocr.modello`, `ocr.proiettore`, `assistente.modello` come testo libero | `sections.ts` `vociMostrateDaSezione`, `program.ts` `controllo` | **fatto**: sola lettura + «Scegli in Modelli linguistici» (`program.ts` `campoModello`), il filtro si svuota |
| G3 | «Lettura spenta» in Da smistare apre la finestra nativa, dove il modello non si sceglie: vicolo cieco | `core/azioni/sorting.ts:592` | **fatto**: `vista.apri` su `modelliLinguistici`, prova in `tests/api/conduitGuards.test.mjs` |
| G4 | Etichetta delle avanzate «Programmi già installati (n)» su ogni sezione | `program.ts:308`, `program.testi.ts:33` | **fatto**: «Avanzate (n)», guida aggiornata |
| G5 | Nativa: `posta.utente`/`posta.mittente` modificabili e ritirabili; `avanzata` ignorata | `desktop/shell/pages/settings/settings.ts:420` e `:586` | **fatto**: `CHIAVI_DEL_COLLEGAMENTO` in `contract/manifesto.ts`, `VoceProgramma.delCollegamento`; avanzate in `<details>` |
| G6 | `assistente.modello` non bloccato dal condotto (`ocr.modello` sì) | `desktop/transports/conduit.ts:443` | **fatto**, prova in `tests/api/conduitGuards.test.mjs` |
| G7 | `avvio.soloVassoio` senza `dipendeDa vassoio.attivo`; `dettatura.attivo` senza `dipendeDa assistente.attivo` (il programma le rispetta, la pagina no) | `contract/manifesto.ts` | **fatto**, prova in `tests/environment/settings.test.mjs` |
| G8 | Vecchie chiavi posta (`server`, `porta`, `autenticazione`, `clientId`, `tenant`) non in `CHIAVI_DISMESSE` | `contract/manifesto.ts:385`, `core/dati/mail.ts` | **fatto**, prova in `tests/environment/settings.test.mjs` |

## 3. Sistema proposto

### 3.1 Gerarchia: 4 aree, 3 livelli

1. **Area** — quattro schede fisse in testata: Calendario · Didattica · Utente · Programma. Coprono tutto; niente raccoglitore visibile.
2. **Sezione** — indice a sinistra dell'area. L'area è **una pagina sola che scorre**; l'indice segue lo scorrimento (scroll-spy) e un clic salta, senza ridisegnare. Su stretto: indice a tendina in cima.
3. **Gruppo di voci** — titolo h3. Dentro ogni sezione: *Stato e gesti* → *Scelte* → *Avanzate* (chiuso).

Regole:
- Niente sezione senza impostazioni.
- L'ambito **non è un livello**: pastiglia su ogni blocco, sempre, nei due sensi: «Questo anno» / «Questo computer».
- Azioni di file (apri, nuovo anno, mostra cartella, ricarica, OneDrive) fuori: menu File, Ctrl+K, dialogo «Informazioni documento».
- Ogni voce ha un indirizzo `impostazioni/<area>#<voce>`: rimandi, filtro e Ctrl+K arrivano sul controllo e lo accendono.
- Punto di stato sulla scheda dell'area se lì qualcosa chiede attenzione (account scollegato, assistente acceso senza modello).

### 3.2 Aree e sezioni

| Area | Sezione | Contenuto | Ambito |
|---|---|---|---|
| **Calendario** | Anno | etichetta, date, semestri | anno |
| | Chiusure | vacanze e sospensioni; calendario ufficiale (scelta e catalogo) | anno (catalogo: computer) |
| | Settimane | griglia A/B **con la lista dei tipi** | anno |
| | Giornata | UD, pause, orari, giorni visibili | anno |
| | Calendari esterni | ICS: calendari e regole | anno |
| **Didattica** | Valutazione | scala, arrotondamento fine semestre, soglia assenze | anno |
| | Liste | le 8 liste restanti | anno |
| **Utente** | Chi sei | appellativo, nome, cognome, anteprima | anno |
| | Carta e stampa | carte intestate, PDF automatici | anno |
| | Account | un elenco per account; capacità **Posta** e **OneDrive** con stato e un solo «Collega»; Azzera | computer |
| | Posta | mittente, invio diretto, firma e-mail, recapiti telefono/mail | misto, pastiglia per blocco |
| **Programma** | Aspetto | lingua, tema | computer |
| | Avvio e promemoria | avvio, icona accanto all'orologio, promemoria, proiezione | computer |
| | Assistente e modelli | righe d'uso Assistente, Scansioni, Dettatura (interruttore + modello + stato); «Sul computer» con cartella; catalogo in sottopagina «Scarica modelli» | computer |
| | Aggiornamenti | versione, controllo, scarico, installazione | computer |
| | Avanzate | integrazione di sistema, condotto con avvertenza | computer |

Fuori: «Questo file» → dialogo «Informazioni documento» (File, Ctrl+K); elenco anni e nuovo anno → File.
Senza documento aperto (finestra nativa): solo Utente › Account/Posta e Programma; Calendario e Didattica dicono «apri un anno».
Area di partenza: l'ultima aperta, alla sezione dove si era.

### 3.3 Una vista sola

- Solo sintesi (deciso 2026-09-29): nome, controllo, «i». Niente modo Dettagli, niente chiave tecnica, niente «modificata · prima», niente Ritira per voce, niente pastiglia «predefinito».
- Numero delle modificate sull'area, tono neutro.
- «Ripristina» per area: conta e tocca solo le voci dell'elenco, mai quelle promosse nelle schede, mai quelle del collegamento.

### 3.4 Filtro unico

Un filtro in testata per i due ambiti (voci del documento comprese), risultati per area con pastiglia d'ambito. Stessa sorgente per Ctrl+K (specie «Impostazioni»: oggi Ctrl+K non trova «tema» né «lingua», `palette.ts:29`).

### 3.5 Regola del tipo di input

Ordine di preferenza; il testo libero solo per ultimo.

1. **Figura** — l'effetto si vede: tema, lingua.
2. **Segmentato** — fino a 4 scelte brevi. **Tendina** — oltre 4, o elenco dinamico. Opzione = nome corto; la frase va nell'aiuto sotto.
3. **Interruttore** — vero switch, nome accessibile = nome della voce. Le figlie indentate sotto il padre.
4. **Numero con unità** — suffisso sempre visibile, min/max/passo interi dove serve. **Cursore** solo per intervalli piccoli e continui.
5. **Ora / data / colore** — controllo nativo dedicato.
6. **File o cartella** — una sola resa: percorso, Sfoglia, verifica (esiste? scrivibile?), Apri.
7. **Testo libero** — solo nomi propri, indirizzi, URL. Validazione in linea.

Nel manifesto: `controllo?: 'segmenti' | 'tendina' | 'cursore'`, `unita`, `passo`, `figura`, `scelteDinamiche` + `sceltaLibera`, `formato: 'ora' | 'colore'`. Viaggiano in `VoceProgramma` (`contract/protocollo.ts`); un solo `controllo()` per pannello e nativa. Codice DOM condiviso fra le due superfici: serve una decisione (ADR), vedi `core/i18n/flags.ts` come precedente.

### 3.6 Coerenza di comportamento

- Salvataggio: sempre al cambio (niente modali per un campo); testo al change, non ogni 700 ms (nativa).
- Riscontro: una riga «salvato» discreta per ogni salvataggio, uguale ovunque.
- Togliere: conferma solo se si perde qualcosa che non torna; per il resto «Annulla» nella notifica. Stessa regola in tutte le schede.
- Correzioni dell'host (valore raddrizzato): sempre dette accanto al campo.

## 4. Inventario: impostazioni del programma (32 chiavi)

Legenda stato: ✅ ok · ⚠️ da cambiare · 🔁 doppione · 🔗 catena da rivedere.

| Chiave | Oggi | Stato | Proposta | Area |
|---|---|---|---|---|
| `aspetto.lingua` | figure | ✅ | invariato | Programma |
| `aspetto.tema` | figure | ✅ (figure copiate in nativa) | figura dichiarata, un disegno solo | Programma |
| `vassoio.attivo` | interruttore | ⚠️ vale al riavvio, detto solo nella «i» | pastiglia «al prossimo avvio» | Programma |
| `vassoio.chiusuraNelVassoio` | interruttore, figlio | ✅ | invariato | Programma |
| `avvio.conWindows` | interruttore | ⚠️ descrizione promette «resta l'icona» anche col vassoio spento | correggere descrizione | Programma |
| `avvio.soloVassoio` | interruttore | 🔗 dipendenza nascosta (G7) | `dipendeDa vassoio.attivo` | Programma |
| `avvio.integrazioneSistema` | interruttore avanzato | ⚠️ riquadro sbagliato (G4), vale all'avvio | Avanzate; «al prossimo avvio» | Programma |
| `promemoria.attivo` | interruttore | 🔗 con anticipo | fondere: tendina «Nessun avviso / all'ora / 2 / 5 / 10 / 15 min prima» | Programma |
| `promemoria.anticipoMinuti` | numero `passo:any` | ⚠️ decimali ammessi, unità in etichetta | assorbito dalla tendina sopra (o numero intero con «min») | Programma |
| `proiezione.schermoIntero` | interruttore | ✅ | invariato | Programma |
| `posta.mittente` | scheda Posta: tendina indirizzi | ✅ pannello · ⚠️ nativa (G5) | `scelteDinamiche: indirizziPosta` in tutte e due | Utente |
| `posta.utente` | scheda Posta: sola lettura | ✅ pannello · ⚠️ nativa (G5) | sola lettura ovunque | Utente |
| `posta.invioDiretto` | interruttore in scheda | ⚠️ acceso senza casella: non dice che non ha effetto | pastiglia «senza effetto: casella non collegata» | Utente |
| `recapiti.telefono` | tendina, frasi intere | ⚠️ opzioni = frasi; nativa valore grezzo | segmentato/tendina a nomi corti + disponibilità | Utente |
| `recapiti.posta` | tendina, frasi intere | ⚠️ idem (Outlook non installato non detto) | idem | Utente |
| `modelli.cartella` | percorso in fondo + testo «Stanno in…» | 🔁 due posti; Svuota = Ritira | nella scheda «Sul computer», un solo gesto | Programma |
| `modelli.scaricoAutomatico` | interruttore | 🔁🔗 vale solo per il programma OCR; con `ocr.programma` | fondere in «Programma di lettura»: lo scarica il registro / questo .exe / non scaricare | Programma |
| `ocr.attivo` | interruttore in fondo + barra di stato | 🔁 lontano dal suo modello | nella riga d'uso «Scansioni» | Programma |
| `ocr.modello` | tendina + pulsanti di riga + testo nel filtro | 🔁 G1 G2 | solo la tendina della riga d'uso | Programma |
| `ocr.proiettore` | solo pulsante di riga | ⚠️ G1 G2, nessuna tendina | tendina mmproj nella riga «Scansioni» | Programma |
| `ocr.programma` | percorso avanzato, sospeso | 🔗 non si prepara prima del modello | assorbito da «Programma di lettura» | Programma |
| `assistente.attivo` | interruttore in fondo + barra | 🔁 | nella riga d'uso «Assistente» | Programma |
| `assistente.modello` | tendina + pulsanti + filtro | 🔁 G1 G2 G6 | solo tendina della riga d'uso | Programma |
| `dettatura.attivo` | interruttore | 🔗 G7 | riga d'uso «Dettatura», `dipendeDa assistente.attivo` | Programma |
| `dettatura.taglia` | tendina frasi | ⚠️ | segmentato a nomi corti (turbo…base) + misura nell'aiuto | Programma |
| `dettatura.indirizzo` | testo libero, avanzato | ⚠️ URL intero a mano; nativa salva mentre si scrive | numero «Porta» 1–65535, host fisso `127.0.0.1` | Programma |
| `aggiornamenti.controlloAutomatico` | interruttore | ✅ | invariato | Programma |
| `aggiornamenti.scaricoAutomatico` | interruttore | ✅ | invariato | Programma |
| `aggiornamenti.installaAllaChiusura` | interruttore | ✅ | invariato | Programma |
| `api.condotto` | interruttore | 🔗 3 interruttori per 3 stati utili | tendina «Spento / Solo lettura / Lettura e scrittura»; vecchie chiavi in `CHIAVI_DISMESSE` con migrazione | Programma |
| `api.lettura` | interruttore figlio | 🔗 | assorbita | — |
| `api.scrittura` | interruttore figlio | 🔗 | assorbita | — |

Da sapere: nessuna chiave morta (tutte lette). Lette ma non dichiarate: `assistente.proiettore`, `assistente.programma` (`core/dati/llm.ts:177` e `:183`, sempre vuote). Stato nel file fuori manifesto: `registroDocenti.ultimoDocumento`, `cartellaLavoro` (da spostare in `userData/interfaccia/`).

## 5. Inventario: impostazioni dell'anno (documento)

| Campo | Oggi | Stato | Proposta | Area |
|---|---|---|---|---|
| `anno.etichetta` | testo nel modale | ⚠️ segue le date | precompilata dalle date, modificabile | Calendario |
| `semestri[].inizio/fine`, confine | date nel modale | ✅ (2° semestre non anticipato a vista) | anteprima «2° sem. dal …»; bloccate se dal calendario ufficiale | Calendario |
| `semestri[].etichetta` | testo | ✅ | invariato | Calendario |
| `sospensioni[]` | 3 posti (modale anno, modale pause, cestino) | 🔁 nome «Pause» nel modale = pause della giornata | un posto (scheda Chiusure); chiamate «Chiusure»; ufficiali bloccate (lavoro in corso) | Calendario |
| `calendarioUfficiale` | assente | ⚠️ | marcatore + guardia (lavoro in corso, formato v5) | Calendario |
| `settimane` | griglia A/B | ⚠️ «Alterna» senza conferma, clic senza riscontro | conferma su Alterna; lista dei tipi qui | Calendario |
| `note` | mai esposto | ⚠️ campo morto | esporre (testo) o togliere | Calendario |
| `minutiUd` | numero | ⚠️ | tendina 45/50/60/90 + «altro» | Calendario |
| `durataSlotPredefinita` | numero in UD | ✅ | numero con «UD» | Calendario |
| `pause.prima.inizio` | ora | ✅ | invariato | Calendario |
| `pause.*.durataMin`, `seguenti[].dopoUd` | numero | ⚠️ unità in etichetta | numero con unità | Calendario |
| pause aggiungi/togli | pulsanti | ⚠️ cestino senza conferma, ridispone le ore | «Annulla» nella notifica | Calendario |
| `durataPausaPredefinita` | numero | ✅ | con «min» | Calendario |
| `oraInizio/FineGiornata` | ora | ✅ | invariato | Calendario |
| `giorniVisibili` | pulsanti a interruttore | ✅ (unico segmentato multiplo) | componente segmentato generico | Calendario |
| `calendario.calendari[]` | testo nome/origine | ⚠️ origine file a mano | «Sfoglia…» accanto | Calendario |
| `calendario.regole[]` | testo + tendina corso | ⚠️ tolta singola senza conferma | Annulla in notifica | Calendario |
| `scala.min/max` | numero senza limiti | ⚠️ | numero con limiti | Didattica |
| `scala.sufficienza` | numero | ⚠️ nessun legame con la scala | cursore fra min e max | Didattica |
| `scala.passo` | numero | ⚠️ 4 valori sensati | segmentato 0.1/0.25/0.5/1 | Didattica |
| `passoFineSemestre` | numero 0–10 | ⚠️ | segmentato 0/0.25/0.5/1 | Didattica |
| `sogliaAssenza` | numero, unità nel formato | ⚠️ | numero con «%» | Didattica |
| materie (collezione) | elenco + modale | 🔁 anche in Corsi | rimando a Corsi | Corsi |
| `liste.*` (9 liste) | elenco modificabile | ⚠️ riordino solo a pulsanti, un salvataggio per passo | trascinamento + tastiera (`riordinatore`) | Didattica (tipi di settimana → Calendario) |
| `intestazione.docente` + `docenteAppellativo/Nome/Cognome` | 4 testi | 🔁 due fonti di verità (G0 corretto) | blocco strutturato: appellativo (tendina modificabile), nome, cognome, anteprima; `docente` calcolato | Utente |
| `carte[].sede` | testo | ✅ | invariato | Utente |
| `carte[].logo` | pulsanti | ⚠️ Togli senza conferma | Annulla in notifica | Utente |
| `carte[].altezzaLogo` | numero (mm) | ⚠️ correzione silenziosa | cursore 6–40 mm | Utente |
| `carte[].corsi` | trascina/menu | ✅ | invariato | Utente |
| carte: predefinita | la prima, non riordinabile | ⚠️ | «Rendi predefinita» | Utente |
| `firma` (HTML) | editor in Comunicazioni | ✅ posto (è posta) · ⚠️ sottotitolo Intestazione promette «mail» | Utente › Posta, con pastiglia «Questo anno»; correggere sottotitolo | Utente |
| `pdfAutomatici` | **solo** Ctrl+K | ⚠️ assente dalla pagina | segmentato «Mai / Alla chiusura / Sempre» | Utente |

## 6. Doppioni da togliere

| Cosa | Posti oggi | Posto che resta | Gli altri | Fatto |
|---|---|---|---|---|
| Modello `.gguf` per uso | tendina, pulsanti di riga, filtro, nativa | tendina della riga d'uso | pulsanti di riga via (o «Usa» che apre la riga); filtro e nativa: sola lettura con rimando | ✅ |
| Interruttore assistente/OCR | elenco in fondo, barra di stato | riga d'uso | barra di stato resta scorciatoia | ✅ |
| Cartella modelli | testo in alto, campo in fondo | scheda «Sul computer» | — | ✅ |
| Programma OCR | `modelli.scaricoAutomatico` + `ocr.programma` | «Programma di lettura» | chiavi fuse | ✅ |
| Posta: collega/prova/scollega | scheda, Ctrl+K, menu nativo | area Account (capacità Posta) | Ctrl+K e menu portano lì; «Azzera» anche nella pagina | ✅ |
| Account per posta vs OneDrive | due sezioni, due «Collega» | area Account, capacità per account | — | ✅ |
| OneDrive apri | Account, Questo file, Ctrl+K | File/Ctrl+K | Account rimanda | ✅ |
| Materie | Impostazioni, Corsi | Corsi | rimando | ✅ |
| Tipi di settimana | Liste, Anno | Calendario › Settimane | — | ✅ |
| Chiusure | modale anno, modale pause, scheda | scheda Chiusure | modale anno solo date e semestri | ✅ |
| Anno apri/nuovo | impostazioni, File | File | — | ✅ |
| «Impostazioni» nel menu | Vai a › Impostazioni, Registro › Impostazioni del programma… | pannello; nativa solo senza documento | voce rinominata «…senza documento aperto» | ✅ |
| Figure tema/lingua | pannello, copia nativa | un disegno condiviso | — | ✅ |

## 7. Fasi e sciami

Ogni fase: perimetri di file disgiunti, verifica `npm run ci -- --solo verifica` a fine giro (skill `sciame`, `verifica`).

| Fase | Contenuto | Perimetri paralleli |
|---|---|---|
| **0 Guasti** ✅ | G1–G8 | A: `desktop/apparato/settings.ts` + `core/dati/gguf.ts` (G1) · B: `ui/pannello/views/settings/{sections,program}.ts` (G2, G4) · C: `core/azioni/sorting.ts` (G3) · D: `desktop/shell/pages/settings/*` (G5) · E: `contract/manifesto.ts` + `desktop/transports/conduit.ts` (G6–G8) |
| **1 Contratto dei controlli** ✅ | campi manifesto (`controllo`, `unita`, `passo`, `figura`, `scelteDinamiche`, `formato ora/colore`), `VoceProgramma`, `vociImpostazioni()`, dogana; ADR del DOM condiviso | uno solo (contratto) |
| **2 Controlli** ✅ | segmentato generico (Home/Fine), numero con unità, cursore con `aria-valuetext`, percorso con verifica, switch con nome; `controllo()` unico | A: componenti pannello · B: nativa |
| **3 Gerarchia** ✅ | aree, pagina Stato/Scelte/Avanzate, pastiglia d'ambito, modi Sintesi/Dettagli (poi tolti: § 3.3), filtro unico + Ctrl+K, Ripristina per area | A: `settings.ts`/`sections.ts`/`posto.ts` · B: palette · C: stili |
| **4 Aree** ✅ | Calendario · Didattica · Utente · Programma | uno per area (file separati per sezione) |
| **5 Fuori** ✅ (voce nel menu nativo: cantiere) | «Informazioni documento», Materie in Corsi, anni in File, nativa come scialuppa | A: File/menu · B: Corsi · C: nativa |
| **6 Guida e documenti** ✅ | `help/settings*`, CATALOGO, skill `impostazione` (superata: sezioni, nativa, `pagina`) | uno |

Migrazioni necessarie: condotto (3 chiavi → 1), promemoria (2 → 1, facoltativo), programma OCR (2 → 1), dettatura indirizzo → porta. Tutte programma (`impostazioni.json`), non documento: `CHIAVI_DISMESSE` + lettura del vecchio valore al primo avvio.

## 8. Da decidere

1. ~~Aree~~: **deciso** 2026-09-29 — quattro: Calendario, Didattica, Utente, Programma (§ 3.2).
2. ~~Condotto~~: **deciso** — tendina «Spento / Solo lettura / Lettura e scrittura»; «solo scrittura» sparisce.
3. ~~Promemoria~~: **deciso** — tendina unica, via l'interruttore.
4. ~~Account unico~~: **deciso** — Utente › Account, gettoni separati per capacità.
5. ~~Materie~~: **deciso** — solo in Corsi; nessuna sezione in Didattica (2026-09-29).
6. ~~DOM condiviso~~: **deciso** — un disegno solo dei controlli per pannello e nativa; ADR in fase 1.
