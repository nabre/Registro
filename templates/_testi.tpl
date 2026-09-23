# Le parole comuni a tutti i rapporti.
#
# Il terzo strato, accanto a _base (che cosa c'è in testata) e _stile (quanto è
# grande). Qui ci sono le due cose che i modelli non potevano toccare perché
# stavano nel codice: le frasi che contengono un numero, e come si chiamano le
# colonne delle tabelle.
#
# Non si estende e non si dichiara: vale per tutti i rapporti, sempre.
# Una riga che non si capisce viene saltata, e vale quel che il registro dice
# di suo.

[frasi]

# Si richiamano da un modello con «{{frase.nome}}», e dentro possono avere i
# segnaposto del rapporto. Un segnaposto vuoto sparisce, e la riga con lui:
# per questo l'appello incompleto si scrive dentro un «se:», così la frase non
# compare quando non c'è niente da dire.

# Le due righe fisse della carta intestata: il reparto in cima a destra, chi
# firma in fondo a sinistra. Non cambiano da un rapporto all'altro e non
# vengono dai dati — nel registro non c'è l'anagrafica della scuola, e non deve
# esserci: si scrivono qui una volta e valgono per tutto quel che si stampa.
# Lasciandone una vuota, la sua riga sparisce dal foglio invece di lasciare un
# vuoto.
sede: Area del disegno SPAI
docente: ing. Michel Brenna

appello-incompleto: Appello incompleto: {{udSenzaAppello}} caselle non impostate.

riepilogo-presenze: Presenti {{presenti}}/{{conAppello}} · assenti {{assenti}} · parziali {{parziali}} · ritardi {{ritardi}}

# La legenda delle sigle dell'appello. Le lettere vengono dal registro — sono
# le stesse che si premono nella griglia, e riscriverle qui vorrebbe dire poter
# dire una cosa diversa da quella che si compila — mentre le parole si scrivono
# qui: «X assente» diventa «X non c'era» cambiando questa riga e nient'altro.
legenda-presenze: {{siglaPresente}} {{nomePresente}} · {{siglaAssente}} {{nomeAssente}} · {{siglaRitardo}} {{nomeRitardo}} · {{siglaEsonerato}} {{nomeEsonerato}}

# Chi legge «8%» ha il diritto di sapere su che cosa è fatto: messe una accanto
# all'altra senza dirlo, le due percentuali sembrerebbero in contraddizione.
nota-presenze: Le UD previste dall'orario del corso nel periodo sono {{udPrevisteCorso}}, di cui {{udACalendario}} già a calendario. «% presenza» e «% assenza» sono calcolate su quelle previste: la seconda è quanto si è perso di ciò che era in programma, la prima è la frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna delle due. La «% appello» è invece calcolata sulle sole UD in cui l'appello è stato fatto, e dice quanto i primi due numeri sono affidabili: un'ora di cui nessuno ha segnato niente non è un'ora di assenze per nessuno.

esecuzione-riconsegna: Ogni casella dice il giorno in cui la prova è stata fatta e, dopo il segno «>», quello in cui è stata riconsegnata. Un trattino vuol dire che quel foglio non è ancora tornato indietro.

[colonne]

# Come si chiamano le colonne delle tabelle: a sinistra il nome di serie, a
# destra quello che si vuole leggere sul foglio. Vale per tutte le tabelle di
# tutti i rapporti, perché la stessa colonna deve chiamarsi allo stesso modo
# dappertutto — è lo stesso motivo per cui la testata sta in un file solo.
#
# Per nome e non per posizione: le colonne di una griglia non sono sempre le
# stesse — una per unità didattica, una per prova — e «la terza colonna» di due
# classi diverse non è la stessa cosa.
#
# Sono commentate perché di serie non si cambia niente. Togliendo il cancelletto
# a una riga, quel nome cambia dalla stampa dopo.
#
# PiF: Nome e cognome
# UD seguite: Ore seguite
# UD di assenza: Ore di assenza
# % presenza: Frequenza
# Min.: Minuti persi
