# Il registro raccontato a un modello

Due cose distinte, che si assomigliano:

- **`risorse/attrezzi.json`** — il catalogo generato: tutte le procedure con il
  loro schema in JSON Schema, più le istruzioni per il modello. Sta nel
  versionamento.
- **`registro chiedi "…"`** — il comando che fa guidare la riga di comando a un
  modello locale, in italiano.

E una terza, che esisteva già e non va confusa: **l'assistente della finestra**
(`src/api/trasporti/assistente.ts`), che fa lo stesso mestiere dentro il
pannello.

## Indice

- [Il catalogo](#il-catalogo)
- [Perché sta nel versionamento](#perché-sta-nel-versionamento)
- [Il comando `chiedi`](#il-comando-chiedi)
- [Solo le letture](#solo-le-letture)
- [Quando si tocca che cosa](#quando-si-tocca-che-cosa)

## Il catalogo

`src/api/attrezzi.ts` lo costruisce dalle procedure registrate. Non c'è nessun
elenco scritto a mano: il `titolo` della procedura diventa la descrizione
dell'attrezzo, lo `Schema` dell'ingresso diventa `parameters` via `schemaJson()`.
Un attrezzo scritto a mano sarebbe una seconda verità, e la seconda verità è
quella che resta indietro.

```json
{
  "api": 1,
  "comando": "registro",
  "istruzioni": "Sei l’assistente della riga di comando del Registro docenti…",
  "attrezzi": [
    {
      "nome": "corso.presenze",
      "funzione": "corso_presenze",
      "genere": "lettura",
      "titolo": "Presenze, assenze e medie di un corso in un periodo",
      "idempotente": true,
      "riga": "registro chiama corso.presenze --corsoId <testo>",
      "parametri": { "type": "object", "properties": { … } }
    }
  ]
}
```

`nome` ha i punti, `funzione` no: una parte dei modelli tratta il punto come
accesso a un campo e risponde `corso` con dentro `presenze`. La traduzione sta in
`nomeFunzione` / `daNomeFunzione`, in un posto solo, e la usano sia il catalogo
sia l'assistente della finestra.

Il catalogo è **deterministico**: nessuna data, nessun contatore, nessun ordine
che dipenda dall'inserimento. Un catalogo che cambia da sé non si può
confrontare, e una prova che non si può fare non protegge niente.

## Perché sta nel versionamento

Perché è il posto in cui una modifica al contratto diventa **una differenza
leggibile**. Una procedura aggiunta, tolta o con un campo in meno compare lì
come righe rosse e verdi, e chi rilegge la modifica vede che cos'è successo
all'API senza doverlo dedurre dai file delle procedure.

È lo stesso motivo di `prove/api/copertura.test.mjs`, con un altro mezzo.

Che non resti indietro lo tiene fermo `prove/api/attrezzi.test.mjs`, che lo
ricostruisce e lo confronta **byte per byte**. Se fallisce non c'è niente da
aggiustare nel JSON: si dà `npm run attrezzi` e si legge la differenza.

Un byte in particolare: il file è dichiarato `eol=lf` in `.gitattributes`.
Senza, su Windows git lo riscriverebbe in CRLF al checkout e la prova
fallirebbe su un clone appena fatto. Se ti capita dopo un `git stash pop` o un
cambio di ramo, `npm run attrezzi` rimette a posto.

## Il comando `chiedi`

```sh
registro chiedi "quante ore ha perso Rossi in matematica?"
registro chiedi "chi ha più assenze in DIC4a?" --passi
registro catalogo > attrezzi.json      # il catalogo vivo, per un altro programma
```

Il giro, in breve:

1. la riga di comando chiede `$attrezzi` al condotto — il catalogo **vivo**, non
   quello su disco, più come l'assistente è collegato (indirizzo, modello);
2. manda al modello le sole procedure di lettura, in formato tool calling;
3. per ogni attrezzo chiesto ricontrolla il genere, chiama il condotto, taglia il
   risultato a 6000 caratteri e lo rimanda;
4. al massimo cinque giri, poi si ferma e lo dice;
5. `--passi` stampa sotto la risposta **i comandi con cui il modello l'ha
   letta**.

Quel `--passi` è la ragione per cui il comando ha senso: chi legge sta davanti a
un terminale e può ribattere la riga. Una risposta che si verifica vale più di
una risposta che si deve credere.

Il catalogo su disco serve quando il registro è chiuso — per darlo a un altro
programma, o per leggerlo — ma `chiedi` usa sempre quello vivo: è l'unico che non
possa essere rimasto indietro di una modifica.

## Solo le letture

Al modello si danno gli attrezzi con `genere: 'lettura'`, e **prima di chiamarne
uno si ricontrolla il genere**. La whitelist vera non è l'elenco che si è
mandato: è il controllo che si fa al ritorno. Un modello che si inventa
`ore.appello.riga` — cosa che i modelli fanno — riceve un errore e non una
scrittura.

Non c'è nessuna impostazione per allargare questo confine, e non è una
dimenticanza: **una scrittura decisa da un modello è una scrittura che nessuno ha
chiesto**, e nel registro di una classe non si disfa. Quel che si ottiene al
posto suo è il comando da battere, che una persona legge e decide.

Il genere è dichiarato dalla procedura, non da un secondo elenco. Un elenco a
parte resterebbe indietro alla prima procedura nuova, e resterebbe indietro
*nella direzione pericolosa*.

Vale la pena sapere anche dove finiscono i dati: le domande e i risultati vanno
in `fetch` verso il servizio configurato, e i risultati contengono nomi, medie e
assenze di persone minorenni. Il predefinito è la macchina locale; chi sposta
l'indirizzo sta decidendo di mandarli altrove.

## Quando si tocca che cosa

| Hai fatto | Tocca |
| --- | --- |
| aggiunto, cambiato o tolto una procedura | `npm run attrezzi`, e basta |
| cambiato la forma del catalogo (un campo nuovo in `AttrezzoCatalogo`) | `src/api/attrezzi.ts`, poi `npm run attrezzi`, poi `prove/api/attrezzi.test.mjs` |
| cambiato le istruzioni per il modello | `istruzioni()` in `src/api/attrezzi.ts` — e ricorda che una prova controlla che ci sia ancora scritto che non può scrivere |
| aggiunto un comando alla riga di comando | `src/cli/registro.mjs`: l'elenco in `AIUTO`, il controllo dei nomi e lo smistamento |
| cambiato come il condotto risponde | `src/api/trasporti/condotto.ts`, `eseguiMetodo` |

**`src/cli/registro.mjs` non si tocca per esporre una procedura.** Non ha una
copia dell'elenco: chiede tutto al condotto. Si tocca solo per aggiungere un
comando nuovo.
