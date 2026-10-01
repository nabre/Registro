# Un progetto per esteso, per tutta la classe: in che lezioni si è lavorato,
# a che punto è ognuno con i compiti, dove è arrivato con i criteri e come ci è
# arrivato, che voti ne sono usciti.
#
# Le date sono tutte quelle del registro: un'ora spostata sposta le righe che
# la citano, e la progressione si legge in ordine di giorno.
#
# In orizzontale perché due tabelle hanno una colonna per compito e una per
# criterio, e in verticale non ci stanno.

titolo: {{titolo}}
estende: _base
orientamento: orizzontale
margini: 18 14 16 14

[corpo]
usa: apertura | titolo={{progetto}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
campi: {{frase.stato}}={{stato}}; {{frase.lezioni}}={{quanti}}; {{frase.avanzamento}}={{avanzamento}}
paragrafo: {{descrizione}}

sezione: {{frase.obiettivi}}
elenco: obiettivi

# Prima i criteri e la scala: le tabelle dei livelli più sotto si leggono con
# questa legenda accanto.
sezione: {{frase.criteri}}
tabella: criteri

sezione: {{frase.scala-livelli}}
elenco: livelli

# Il progetto fase per fase: quando, quanto se ne è fatto, le attività ora per
# ora con il loro stato (dal consuntivo delle lezioni, come la scaletta del
# verbale) e le prove nate in quella fase. Le fasi senza ore restano, con
# «nessuna lezione»: dicono che cosa manca.
ripeti: fasi
sezione: {{fase}}
campi: {{frase.periodo}}={{periodoFase}}; {{frase.avanzamento}}={{avanzamentoFase}}
paragrafo: {{descrizioneFase}}
se: {{attivitaFase}}
testo: {{frase.avanzamento-attivita}}
tabella: attivitaFase
fine:
se: {{momentiFase}}
testo: {{frase.valutazioni-della-fase}}
tabella: momentiFase
fine:
fine:

sezione: {{frase.lezioni-del-progetto}}
tabella: lezioni

sezione: {{frase.presenze-progetto}}
tabella: presenze

sezione: {{frase.compiti-del-progetto}}
tabella: compiti

sezione: {{frase.avanzamento-compiti}}
se: {{statoCompiti}}
testo: {{frase.legenda-compiti}}
fine:
tabella: statoCompiti

# L'ultimo livello in una griglia che si legge d'un colpo; il percorso, che in
# una casella non ci sta, nella tabella sotto.
sezione: {{frase.livelli-raggiunti}}
se: {{matrice}}
testo: {{frase.nota-livelli}}
fine:
tabella: matrice

sezione: {{frase.progressione}}
tabella: progressione

sezione: {{frase.valutazioni-del-progetto}}
tabella: momenti
tabella: voti

sezione: {{frase.giudizi}}
tabella: giudizi

sezione: {{frase.annotazioni}}
tabella: annotazioni

sezione: {{frase.risorse}}
tabella: risorse

sezione: {{frase.note}}
paragrafo: {{note}}
