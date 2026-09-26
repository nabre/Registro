# La documentazione del registro

Il `README.md` alla radice è la vetrina. **Come si usa** non sta in `docs/`: la
guida d'uso è nell'applicazione (`F1`, o la pagina «Guida»), in
`src/ui/views/help/`.

| Documento | Risponde a | Quando si apre |
| --- | --- | --- |
| [GUIDA.md](GUIDA.md) | com'è fatto, dove stanno i dati, come si costruisce e si rilascia, che cosa esce dal computer | si arriva sul progetto, o si cerca un file dell'utente |
| [ARCHITETTURA.md](ARCHITETTURA.md) | come funziona, e che cosa succede quando | si tocca un confine fra strati o un flusso |
| [MODELLO-DATI.md](MODELLO-DATI.md) | che forma hanno i dati e quali regole li tengono in piedi | si aggiunge un campo, si legge un `.regi` a mano |
| [CATALOGO.md](CATALOGO.md) | tutto quel che l'applicazione sa fare, voce per voce | «esiste già un'azione per questo?» |
| [API.md](API.md) | il contratto: le 202 procedure, il canale delle domande, il condotto, la riga di comando, l'assistente | si scrive una procedura o uno script, si tocca l'assistente |
| [DECISIONI.md](DECISIONI.md) | perché è così, e che cosa non si può rompere | si sta per cambiare qualcosa di strutturale |
| [IMPIANTO.md](IMPIANTO.md) | dove va la struttura: cinque strati, router, tre link | si sposta un file o un confine fra cartelle |
| [CANTIERE.md](CANTIERE.md) | il lavoro aperto, per area | si riprende in mano il lavoro |

## Da dove cominciare

- **Capire il progetto:** GUIDA, poi ARCHITETTURA § 1–5.
- **Correggere un difetto:** CATALOGO per trovare l'azione, ARCHITETTURA § 6
  per il giro che fa.
- **Aggiungere una funzione:** MODELLO-DATI per i dati, API § 11 per metterla
  sotto contratto, DECISIONI prima di toccare qualcosa di condiviso.
- **Far chiedere qualcosa a una pagina senza scrivere:** API § 6.
- **Far rispondere il registro a una domanda:** API § 9.
- **Pilotare il registro da uno script:** API § 7–8, e la tabella delle
  procedure che aspettano una persona.

## Come si tiene in vita

1. **I conteggi si verificano, non si ricordano.** Contati a macchina:
   168 azioni, 202 procedure (168 scritture e 34 letture), 95 comandi
   dell'interfaccia, 19 destinazioni, 19 viste, 31 impostazioni macchina,
   55 entità. `npm run procedures` stampa procedure e aree leggendo il testo;
   `tests/api/coverage.test.mjs` tiene il numero delle azioni;
   `tests/counts.test.mjs` confronta con il codice le cifre scritte qui, in
   API.md e nel README.
2. **Ogni citazione esiste**: `npm run docs` controlla che file e script nominati
   ci siano.
3. **Un fatto in un posto solo**: gli altri documenti rimandano.
4. **Si descrive il presente**: la storia sta in git; il lavoro aperto in
   CANTIERE; un vincolo va in DECISIONI quando nasce.
