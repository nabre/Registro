# Il conto delle presenze di un corso, persona per persona.
#
# Di un corso e per un semestre: le ore sono di un insegnamento, e la
# percentuale di presenza di un semestre non è quella dell'altro. Un foglio che
# sommasse tutto l'anno nasconderebbe proprio il caso che si vuole vedere —
# chi ha cominciato a mancare dopo gennaio.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
campi: {{frase.lezioni-a-calendario}}={{quanti}}; {{frase.ud-previste}}={{ud}}; {{frase.ud-a-calendario}}={{udTenute}}
campi: {{frase.assenza-di-classe}}={{assenza}}; {{frase.presenza-di-classe}}={{presenza}}

sezione: {{frase.per-persona}}
tabella: presenze
paragrafo: {{frase.nota-presenze}}

# Chi è oltre la soglia, per nome. Nella tabella qui sopra la stessa
# percentuale sta in una colonna di nove, e non salta all'occhio: il motivo per
# cui questo foglio si guarda è proprio sapere di chi ci si deve occupare.
#
# La soglia si cambia nelle impostazioni del registro, e a zero questa sezione
# non esce mai — come non esce quando non è oltre nessuno.
se: {{oltreSoglia}}
sezione: {{frase.da-seguire}}
avviso: {{frase.oltre-soglia}}
elenco: oltreSoglia
fine:
