# Fase 8 — L'accesso Microsoft come si deve

**Rende possibile:** entrare nella casella senza codici da copiare.
**È l'unico punto in cui l'app desktop può diventare migliore dell'estensione**,
non solo diversa.

> Leggere `00-premessa.md` prima di cominciare.

---

## Quando fare questa fase — e se farla

**Solo se la fase 5 ha mostrato che il device-code dà davvero fastidio.**

Il device-code funziona: il registro apre il browser, l'utente incolla un codice,
aspetta. È scomodo ma non è rotto, e se lo si fa una volta all'anno la scomodità è
teorica. Se invece il gettone scade spesso e il giro va rifatto ogni poche
settimane, allora vale la pena.

La domanda da porre prima di cominciare è quante volte l'utente ha dovuto rifare
il collegamento nel mese in cui ha usato l'app. Sotto le due, non fare questa fase.

## Prerequisiti

- La fase 5 è chiusa, e c'è un'esperienza d'uso reale che la giustifica.
- Leggere `src/dati/oauth.ts` per intero, in particolare come i gettoni vengono
  conservati e rinnovati.
- Verificare sulla documentazione Microsoft corrente: le regole dei client
  pubblici nativi cambiano, e quel che era vero l'anno scorso può non esserlo.

## Perimetro

**Si crea:** un modo di accesso nuovo dentro `src/dati/oauth.ts`, e la finestra
che lo serve.
**Si modifica:** `src/dati/oauth.ts` — e questa volta sul serio, non una stringa.
**Fermarsi e chiedere** prima di toccare `exchange.ts` o `posta.ts`.

---

## 1. Il flusso

*Authorization code* con PKCE, in una `BrowserWindow` dedicata:

1. il registro alza un server HTTP effimero su `http://localhost:<porta a caso>`
2. apre una finestra sulla pagina di accesso Microsoft, con `code_challenge`
3. l'utente entra come entrerebbe in qualunque sito Microsoft — compreso il secondo
   fattore, che è quel che rende il device-code fastidioso
4. Microsoft reindirizza su `localhost` con il codice
5. il server lo raccoglie, chiude, e il registro scambia codice e `code_verifier`
   per i gettoni
6. la finestra si chiude da sola

`@azure/msal-node` fa tutto questo, ed è la libreria che Microsoft mantiene: non
scrivere il flusso a mano.

## 2. Che cosa cambia nella registrazione dell'applicazione

L'`clientId` va registrato su `entra.microsoft.com` come **client pubblico /
nativo**, con `http://localhost` fra gli URI di reindirizzamento, e l'autorizzazione
delegata `SMTP.Send`.

Le istruzioni che `oauth.ts` stampa all'utente (righe ~370-390) vanno riscritte di
conseguenza — sono già state ritoccate alla fase 5, e qui cambiano ancora. Scriverle
nello stesso tono: sono per un docente che apre per la prima volta il portale di
Microsoft, non per uno sviluppatore.

## 3. Che cosa non deve cambiare

- **I tre modi restano tre.** Il nuovo modo si affianca a `oauth` e `password`, non
  li sostituisce: il device-code resta la via che funziona anche quando il browser
  incorporato dà problemi, e in un tenant scolastico capita.
- **Il portachiavi non cambia forma.** I gettoni si conservano dove si conservano
  già, con le stesse chiavi: un utente che passa da un modo all'altro non deve
  perdere niente.
- **`registroDocenti.posta.autenticazione` prende un valore in più**, e va aggiunto
  in `package.json` con la sua `enumDescription` — la finestra delle impostazioni
  (fase 4) e la palette del `.vsix` se lo trovano allora da sole.

## 4. La finestra di accesso

Va trattata come una finestra che mostra una pagina di terzi, perché è quello:

- `contextIsolation: true`, `nodeIntegration: false`, **nessun preload**
- niente `webSecurity: false`, per nessuna ragione
- navigazione limitata ai domini Microsoft e a `localhost`: intercettare
  `will-navigate` e rifiutare il resto
- la finestra si chiude da sé al reindirizzamento, e comunque quando l'utente la
  chiude — con la promessa che risolve `undefined`, come tutti i dialoghi (fase 3)

## 5. Il server effimero

- porta 0, cioè scelta dal sistema, e letta dopo l'ascolto
- solo su `127.0.0.1`, mai su `0.0.0.0`
- si chiude appena ricevuto il codice, o dopo un timeout di pochi minuti
- verifica lo `state` prima di accettare il codice

---

## Criterio di accettazione

- [ ] il collegamento si completa senza copiare niente a mano
- [ ] il secondo fattore funziona dentro la finestra
- [ ] il gettone si rinnova da solo, e il rinnovo si vede nei log
- [ ] i modi `oauth` e `password` continuano a funzionare come prima
- [ ] un utente che aveva già collegato con il device-code non perde il collegamento
- [ ] chiudere la finestra a metà non lascia il registro in uno stato strano
- [ ] il server effimero è chiuso dopo l'accesso (verificarlo con `netstat`)
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi
- [ ] nel `.vsix` la posta funziona esattamente come prima

