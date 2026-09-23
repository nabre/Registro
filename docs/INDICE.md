# La documentazione del registro

Il `README.md` alla radice resta quel che era: il racconto del progetto, che
dice **perché** le cose sono come sono. Questi sette documenti non lo
sostituiscono — lo indicizzano, e aggiungono quel che un racconto non sa fare:
tabelle complete, diagrammi e contratti.

| Documento | Risponde a | Quando si apre |
| --- | --- | --- |
| [ARCHITETTURA.md](ARCHITETTURA.md) | com'è fatto, e che cosa succede quando | si arriva nuovi sul progetto, o si tocca un confine fra strati |
| [MODELLO-DATI.md](MODELLO-DATI.md) | che forma hanno i dati e quali regole li tengono in piedi | si aggiunge un campo, si scrive una migrazione, si legge un `.registro` a mano |
| [CATALOGO.md](CATALOGO.md) | tutto quel che l'applicazione sa fare, voce per voce | si cerca «esiste già un'azione per questo?» |
| [API.md](API.md) | il contratto: le 179 procedure, i tre canali del pannello, come si chiama il registro da fuori e come lo interroga l'assistente | si scrive una procedura, una lettura, uno script, si accende il condotto o si tocca l'assistente |
| [DECISIONI.md](DECISIONI.md) | perché è così e non altrimenti, e che cosa non si può rompere | si sta per cambiare qualcosa di strutturale |
| [IMPIANTO.md](IMPIANTO.md) | dove va la struttura: i cinque strati, il router, i tre link | si tocca un confine fra cartelle, o si sposta un file |
| [CANTIERE.md](CANTIERE.md) | che cosa sta cambiando adesso: scelte aperte e lavoro da fare | si riprende in mano il lavoro, o si vuole sapere perché una cosa è a metà |

## Da dove cominciare

- **Capire il progetto:** il `README.md`, poi ARCHITETTURA § 1–5.
- **Correggere un difetto:** CATALOGO per trovare l'azione, ARCHITETTURA § 6
  per il giro che fa.
- **Aggiungere una funzione:** MODELLO-DATI per i dati, API § 11 per metterla
  sotto contratto, DECISIONI § vincoli prima di toccare qualcosa di condiviso.
- **Far chiedere qualcosa a una pagina senza scrivere:** API § 6, il canale
  delle domande.
- **Far rispondere il registro a una domanda in italiano:** API § 9, l'assistente
  — e la riga sul cancello, prima di allargarlo.
- **Pilotare il registro da uno script:** API § 7–8 — e la tabella delle dodici
  procedure che aspettano un clic, prima di scriverlo.

## Come si tiene in vita

Questi file dicono il falso il giorno in cui il codice cambia e loro no, ed è
peggio che non averli. Le due regole minime:

1. **I conteggi vanno verificati, non ricordati.** Quelli scritti qui sono
   stati contati a macchina: 152 azioni, 179 procedure (152 scritture e 27
   letture), 94 comandi dell'interfaccia, 19 destinazioni, 17 viste, 43
   impostazioni macchina, 45 entità. Se un numero non torna, ricontare e
   correggere — non arrotondare.

   Per le azioni e le procedure non serve contarle a mano:
   `prove/api/copertura.test.mjs` legge l'unione `Azione` dal sorgente e
   fallisce se il numero cambia, e `npm run procedure` stampa quante ne sono
   in quante aree — legge il testo e non compila, quindi risponde anche quando
   `tsc` non passa. Le azioni erano 143 finché `modello.leggi` e
   `modello.prova` sono state azioni; sono diventate letture, e con loro se ne
   sono andati i tre campi — `testo`, `nomi`, `pdf` — che stavano nella busta
   di ogni scrittura per servire quelle due sole.
2. **Un vincolo si aggiunge a DECISIONI quando nasce, non quando si scopre.**
   Un vincolo scoperto è un vincolo già violato almeno una volta.

## Che cosa è emerso scrivendoli

Leggere tutto il codice per documentarlo ha fatto affiorare cose che nessuno
stava cercando. Stanno scritte nei rispettivi documenti, nelle sezioni dei
debiti; qui l'elenco, per non perderle:

- `LACUNE.md` è stato cancellato nel commit `9470241` insieme a `REVISIONE.md`,
  ma il `README.md` lo cita ancora due volte come documento vivo (righe 124 e
  260). Il contenuto — 57 voci in 7 categorie — è recuperabile con
  `git show 9470241^:LACUNE.md`.
- Il `README.md` dichiara `archivio/` ed `esportazioni/` unificate in
  `documentazione/`, ma il codice dice il contrario: `documentazione/` è il
  nome **vecchio**, e `archiviazione.ts` lo ridivide nelle due radici.
- `Smistamento.divisione` non viene riletto da `normalizzaSmistamento`: il
  campo non sopravvive a un ciclo di apertura.
- `'a-mano'` manca da `MOTIVI_QUARANTENA` in `validazione.ts`, ma
  `smistamento.ts` lo produce: alla rilettura diventa `'senza-nome'`.
- La cascata di eliminazione di un allievo non filtra
  `MomentoValutazione.recuperi`: le righe con il suo id restano.
- La normalizzazione di `''` → `null` non è uniforme fra i campi di
  riferimento; l'elenco dei due gruppi è in MODELLO-DATI § 10.
