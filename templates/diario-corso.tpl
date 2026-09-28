# Il diario cumulativo delle lezioni di un corso: tutte le ore del periodo.
#
# In orizzontale perché le colonne contengono argomenti, compiti e presenze.

titolo: {{titolo}}
estende: _base
orientamento: orizzontale
margini: 18 14 16 14

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
campi: {{frase.lezioni-svolte}}={{quanti}}; {{frase.ud-svolte}}={{udSvolte}}; {{frase.presenza-media}}={{presenzaMedia}}

sezione: {{frase.diario-lezioni}}
tabella: diario
