# Il percorso di una persona in formazione dentro un progetto: i suoi compiti
# con le sue date, dove è arrivata criterio per criterio e come, i voti delle
# prove del progetto, quel che se ne è scritto, e se c'era.
#
# È il foglio del colloquio: risponde a «come sta andando questo lavoro?» con
# le date accanto a ogni cosa, perché la domanda dopo è sempre «da quando?».

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{allievo}}; sottotitolo={{progetto}} · {{materia}} · {{periodo}}
campi: {{frase.classe}}={{classe}}; {{frase.stato}}={{stato}}; {{frase.avanzamento}}={{avanzamento}}; {{frase.media-progetto}}={{media}}

sezione: {{frase.obiettivi}}
elenco: obiettivi

# Fase per fase: quando, quanto se ne è fatto in classe, e se c'era.
sezione: {{frase.fasi-del-progetto}}
tabella: fasi

sezione: {{frase.compiti-del-progetto}}
tabella: compiti

# Criterio per criterio, dal primo giorno all'ultimo: il percorso, non solo
# dove è arrivata. La scala sotto, per chi non l'ha mai vista a schermo.
sezione: {{frase.progressione}}
tabella: progressione

sezione: {{frase.scala-livelli}}
se: {{progressione}}
elenco: livelli
fine:

sezione: {{frase.valutazioni-del-progetto}}
tabella: voti

sezione: {{frase.giudizi}}
tabella: giudizi

sezione: {{frase.annotazioni}}
tabella: annotazioni

# L'appello delle sole ore del progetto, con le sigle della griglia e la loro
# legenda accanto.
sezione: {{frase.presenze-progetto}}
campi: {{frase.ud-di-assenza}}={{udAssenza}}; {{frase.assenza}}={{assenza}}; {{frase.ritardi}}={{ritardi}}
se: {{presenze}}
tabella: presenze
testo: {{frase.legenda-presenze}}
fine:
