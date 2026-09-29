# Piano: pagine impostazioni

Stato: **proposta**, da approvare. Fonte: giro di sciame 2026-09-28, quattro
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

### 3.1 Gerarchia: 3 livelli

1. **Area** — colonna a sinistra (su stretto: tendina in cima). Per compito del docente.
2. **Pagina dell'area** — sempre nello stesso ordine: *Stato e gesti* → *Scelte* → *Avanzate* (chiuso).
3. **Gruppo di voci** — titolo h3.

Regole:
- Niente area con una sezione sola che serve solo a passare oltre; niente sezione senza impostazioni.
- L'ambito **non è un livello**: pastiglia su ogni blocco, sempre, nei due sensi: «Questo anno» / «Questo computer».
- Azioni di file (apri, nuovo anno, mostra cartella, ricarica, OneDrive) fuori: menu File, Ctrl+K, dialogo «Informazioni documento».

### 3.2 Aree

| Area | Contenuto | Ambito |
|---|---|---|
| **Anno e giornata** | date e semestri, chiusure (con calendario ufficiale), tipi di settimana **con la loro lista**, giornata (UD, pause, orari, giorni), calendari ICS | anno |
| **Valutare** | scala (min, max, sufficienza, passo), arrotondamento fine semestre, soglia assenze; rimando a Corsi per le materie | anno |
| **Stampa** | chi firma (un blocco strutturato con anteprima), carte intestate, PDF automatici | anno |
| **Liste** | le 8 liste restanti (senza tipi di settimana) | anno |
| **Comunicare** | mittente, invio diretto, firma e-mail (pastiglia anno), recapiti telefono/mail | misto, pastiglia per blocco |
| **Account** | un elenco per account; per ognuno le capacità **Posta** e **OneDrive** con il loro stato e un solo «Collega»; Azzera | computer |
| **Assistente e modelli** | tre righe d'uso (Assistente, Scansioni, Dettatura): interruttore + modello + stato; «Sul computer» con cartella; catalogo in sottopagina «Scarica modelli» | computer |
| **Programma** | lingua, tema, avvio e icona, promemoria, proiezione, aggiornamenti; Avanzate: integrazione di sistema, condotto con avvertenza | computer |

Fuori: «Questo file» → dialogo «Informazioni documento» (File, Ctrl+K); elenco anni e nuovo anno → File; Materie → pagina Corsi.
Area di partenza: l'ultima aperta (oggi sempre «Anno scolastico»).

### 3.3 Modi di vista

- **Sintesi** (di serie): nome, controllo, «i». Niente chiave tecnica, niente pastiglia «predefinito».
- **Dettagli** (interruttore in testata, ricordato): mostra avanzate, chiave in piccolo, «modificata · prima: …», Ritira.
- Numero delle modificate sull'area, tono neutro (oggi `--attenzione`, `settings.css:104`).
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
| `posta.mittente` | scheda Posta: tendina indirizzi | ✅ pannello · ⚠️ nativa (G5) | `scelteDinamiche: indirizziPosta` in tutte e due | Comunicare |
| `posta.utente` | scheda Posta: sola lettura | ✅ pannello · ⚠️ nativa (G5) | sola lettura ovunque | Account |
| `posta.invioDiretto` | interruttore in scheda | ⚠️ acceso senza casella: non dice che non ha effetto | pastiglia «senza effetto: casella non collegata» | Comunicare |
| `recapiti.telefono` | tendina, frasi intere | ⚠️ opzioni = frasi; nativa valore grezzo | segmentato/tendina a nomi corti + disponibilità | Comunicare |
| `recapiti.posta` | tendina, frasi intere | ⚠️ idem (Outlook non installato non detto) | idem | Comunicare |
| `modelli.cartella` | percorso in fondo + testo «Stanno in…» | 🔁 due posti; Svuota = Ritira | nella scheda «Sul computer», un solo gesto | Assistente e modelli |
| `modelli.scaricoAutomatico` | interruttore | 🔁🔗 vale solo per il programma OCR; con `ocr.programma` | fondere in «Programma di lettura»: lo scarica il registro / questo .exe / non scaricare | Assistente e modelli |
| `ocr.attivo` | interruttore in fondo + barra di stato | 🔁 lontano dal suo modello | nella riga d'uso «Scansioni» | Assistente e modelli |
| `ocr.modello` | tendina + pulsanti di riga + testo nel filtro | 🔁 G1 G2 | solo la tendina della riga d'uso | Assistente e modelli |
| `ocr.proiettore` | solo pulsante di riga | ⚠️ G1 G2, nessuna tendina | tendina mmproj nella riga «Scansioni» | Assistente e modelli |
| `ocr.programma` | percorso avanzato, sospeso | 🔗 non si prepara prima del modello | assorbito da «Programma di lettura» | Assistente e modelli |
| `assistente.attivo` | interruttore in fondo + barra | 🔁 | nella riga d'uso «Assistente» | Assistente e modelli |
| `assistente.modello` | tendina + pulsanti + filtro | 🔁 G1 G2 G6 | solo tendina della riga d'uso | Assistente e modelli |
| `dettatura.attivo` | interruttore | 🔗 G7 | riga d'uso «Dettatura», `dipendeDa assistente.attivo` | Assistente e modelli |
| `dettatura.taglia` | tendina frasi | ⚠️ | segmentato a nomi corti (turbo…base) + misura nell'aiuto | Assistente e modelli |
| `dettatura.indirizzo` | testo libero, avanzato | ⚠️ URL intero a mano; nativa salva mentre si scrive | numero «Porta» 1–65535, host fisso `127.0.0.1` | Assistente e modelli › Avanzate |
| `aggiornamenti.controlloAutomatico` | interruttore | ✅ | invariato | Programma |
| `aggiornamenti.scaricoAutomatico` | interruttore | ✅ | invariato | Programma |
| `aggiornamenti.installaAllaChiusura` | interruttore | ✅ | invariato | Programma |
| `api.condotto` | interruttore | 🔗 3 interruttori per 3 stati utili | tendina «Spento / Solo lettura / Lettura e scrittura»; vecchie chiavi in `CHIAVI_DISMESSE` con migrazione | Programma › Avanzate |
| `api.lettura` | interruttore figlio | 🔗 | assorbita | — |
| `api.scrittura` | interruttore figlio | 🔗 | assorbita | — |

Da sapere: nessuna chiave morta (tutte lette). Lette ma non dichiarate: `assistente.proiettore`, `assistente.programma` (`core/dati/llm.ts:177` e `:183`, sempre vuote). Stato nel file fuori manifesto: `registroDocenti.ultimoDocumento`, `cartellaLavoro` (da spostare in `userData/interfaccia/`).

## 5. Inventario: impostazioni dell'anno (documento)

| Campo | Oggi | Stato | Proposta | Area |
|---|---|---|---|---|
| `anno.etichetta` | testo nel modale | ⚠️ segue le date | precompilata dalle date, modificabile | Anno e giornata |
| `semestri[].inizio/fine`, confine | date nel modale | ✅ (2° semestre non anticipato a vista) | anteprima «2° sem. dal …»; bloccate se dal calendario ufficiale | Anno e giornata |
| `semestri[].etichetta` | testo | ✅ | invariato | Anno e giornata |
| `sospensioni[]` | 3 posti (modale anno, modale pause, cestino) | 🔁 nome «Pause» nel modale = pause della giornata | un posto (scheda Chiusure); chiamate «Chiusure»; ufficiali bloccate (lavoro in corso) | Anno e giornata |
| `calendarioUfficiale` | assente | ⚠️ | marcatore + guardia (lavoro in corso, formato v5) | Anno e giornata |
| `settimane` | griglia A/B | ⚠️ «Alterna» senza conferma, clic senza riscontro | conferma su Alterna; lista dei tipi qui | Anno e giornata |
| `note` | mai esposto | ⚠️ campo morto | esporre (testo) o togliere | Anno e giornata |
| `minutiUd` | numero | ⚠️ | tendina 45/50/60/90 + «altro» | Anno e giornata |
| `durataSlotPredefinita` | numero in UD | ✅ | numero con «UD» | Anno e giornata |
| `pause.prima.inizio` | ora | ✅ | invariato | Anno e giornata |
| `pause.*.durataMin`, `seguenti[].dopoUd` | numero | ⚠️ unità in etichetta | numero con unità | Anno e giornata |
| pause aggiungi/togli | pulsanti | ⚠️ cestino senza conferma, ridispone le ore | «Annulla» nella notifica | Anno e giornata |
| `durataPausaPredefinita` | numero | ✅ | con «min» | Anno e giornata |
| `oraInizio/FineGiornata` | ora | ✅ | invariato | Anno e giornata |
| `giorniVisibili` | pulsanti a interruttore | ✅ (unico segmentato multiplo) | componente segmentato generico | Anno e giornata |
| `calendario.calendari[]` | testo nome/origine | ⚠️ origine file a mano | «Sfoglia…» accanto | Anno e giornata |
| `calendario.regole[]` | testo + tendina corso | ⚠️ tolta singola senza conferma | Annulla in notifica | Anno e giornata |
| `scala.min/max` | numero senza limiti | ⚠️ | numero con limiti | Valutare |
| `scala.sufficienza` | numero | ⚠️ nessun legame con la scala | cursore fra min e max | Valutare |
| `scala.passo` | numero | ⚠️ 4 valori sensati | segmentato 0.1/0.25/0.5/1 | Valutare |
| `passoFineSemestre` | numero 0–10 | ⚠️ | segmentato 0/0.25/0.5/1 | Valutare |
| `sogliaAssenza` | numero, unità nel formato | ⚠️ | numero con «%» | Valutare |
| materie (collezione) | elenco + modale | 🔁 anche in Corsi | rimando a Corsi | Corsi |
| `liste.*` (9 liste) | elenco modificabile | ⚠️ riordino solo a pulsanti, un salvataggio per passo | trascinamento + tastiera (`riordinatore`) | Liste (tipi di settimana → Anno) |
| `intestazione.docente` + `docenteAppellativo/Nome/Cognome` | 4 testi | 🔁 due fonti di verità (G0 corretto) | blocco strutturato: appellativo (tendina modificabile), nome, cognome, anteprima; `docente` calcolato | Stampa |
| `carte[].sede` | testo | ✅ | invariato | Stampa |
| `carte[].logo` | pulsanti | ⚠️ Togli senza conferma | Annulla in notifica | Stampa |
| `carte[].altezzaLogo` | numero (mm) | ⚠️ correzione silenziosa | cursore 6–40 mm | Stampa |
| `carte[].corsi` | trascina/menu | ✅ | invariato | Stampa |
| carte: predefinita | la prima, non riordinabile | ⚠️ | «Rendi predefinita» | Stampa |
| `firma` (HTML) | editor in Comunicazioni | ✅ posto (è posta) · ⚠️ sottotitolo Intestazione promette «mail» | resta in Comunicare con pastiglia «Questo anno»; correggere sottotitolo | Comunicare |
| `pdfAutomatici` | **solo** Ctrl+K | ⚠️ assente dalla pagina | segmentato «Mai / Alla chiusura / Sempre» | Stampa |

## 6. Doppioni da togliere

| Cosa | Posti oggi | Posto che resta | Gli altri |
|---|---|---|---|
| Modello `.gguf` per uso | tendina, pulsanti di riga, filtro, nativa | tendina della riga d'uso | pulsanti di riga via (o «Usa» che apre la riga); filtro e nativa: sola lettura con rimando |
| Interruttore assistente/OCR | elenco in fondo, barra di stato | riga d'uso | barra di stato resta scorciatoia |
| Cartella modelli | testo in alto, campo in fondo | scheda «Sul computer» | — |
| Programma OCR | `modelli.scaricoAutomatico` + `ocr.programma` | «Programma di lettura» | chiavi fuse |
| Posta: collega/prova/scollega | scheda, Ctrl+K, menu nativo | area Account (capacità Posta) | Ctrl+K e menu portano lì; «Azzera» anche nella pagina |
| Account per posta vs OneDrive | due sezioni, due «Collega» | area Account, capacità per account | — |
| OneDrive apri | Account, Questo file, Ctrl+K | File/Ctrl+K | Account rimanda |
| Materie | Impostazioni, Corsi | Corsi | rimando |
| Tipi di settimana | Liste, Anno | Anno › Settimane | — |
| Chiusure | modale anno, modale pause, scheda | scheda Chiusure | modale anno solo date e semestri |
| Anno apri/nuovo | impostazioni, File | File | — |
| «Impostazioni» nel menu | Vai a › Impostazioni, Registro › Impostazioni del programma… | pannello; nativa solo senza documento | voce rinominata «…senza documento aperto» |
| Figure tema/lingua | pannello, copia nativa | un disegno condiviso | — |

## 7. Fasi e sciami

Ogni fase: perimetri di file disgiunti, verifica `npm run ci -- --solo verifica` a fine giro (skill `sciame`, `verifica`).

| Fase | Contenuto | Perimetri paralleli |
|---|---|---|
| **0 Guasti** | G1–G8 | A: `desktop/apparato/settings.ts` + `core/dati/gguf.ts` (G1) · B: `ui/pannello/views/settings/{sections,program}.ts` (G2, G4) · C: `core/azioni/sorting.ts` (G3) · D: `desktop/shell/pages/settings/*` (G5) · E: `contract/manifesto.ts` + `desktop/transports/conduit.ts` (G6–G8) |
| **1 Contratto dei controlli** | campi manifesto (`controllo`, `unita`, `passo`, `figura`, `scelteDinamiche`, `formato ora/colore`), `VoceProgramma`, `vociImpostazioni()`, dogana; ADR del DOM condiviso | uno solo (contratto) |
| **2 Controlli** | segmentato generico (Home/Fine), numero con unità, cursore con `aria-valuetext`, percorso con verifica, switch con nome; `controllo()` unico | A: componenti pannello · B: nativa |
| **3 Gerarchia** | aree, pagina Stato/Scelte/Avanzate, pastiglia d'ambito, modi Sintesi/Dettagli, filtro unico + Ctrl+K, Ripristina per area | A: `settings.ts`/`sections.ts`/`posto.ts` · B: palette · C: stili |
| **4 Aree** | Anno e giornata · Valutare · Stampa · Liste · Comunicare+Account · Assistente e modelli · Programma | uno per area (file separati per scheda) |
| **5 Fuori** | «Informazioni documento», Materie in Corsi, anni in File, nativa come scialuppa | A: File/menu · B: Corsi · C: nativa |
| **6 Guida e documenti** | `help/settings*`, CATALOGO, skill `impostazione` (superata: sezioni, nativa, `pagina`) | uno |

Migrazioni necessarie: condotto (3 chiavi → 1), promemoria (2 → 1, facoltativo), programma OCR (2 → 1), dettatura indirizzo → porta. Tutte programma (`impostazioni.json`), non documento: `CHIAVI_DISMESSE` + lettura del vecchio valore al primo avvio.

## 8. Da decidere

1. Le 8 aree del § 3.2: vanno bene così?
2. Condotto a tendina: «Solo scrittura» (oggi possibile) si toglie?
3. Promemoria: tendina unica (via l'interruttore) o numero intero con unità?
4. Account unico per posta e OneDrive: si tiene la separazione dei gettoni (serve: permessi diversi), ma un'area sola?
5. Materie: solo in Corsi?
6. Codice DOM condiviso fra pannello e nativa (in `core/`): sì o doppia implementazione?
