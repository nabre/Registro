# La scheda del corso: un unico documento che raccoglie tutto il corso nel periodo.
# Presenze, valutazioni, diario delle lezioni, osservazioni, comportamento (+/-),
# piani lezione e scaletta, pendenze e check.

titolo: {{titolo}}
estende: _base
orientamento: orizzontale
margini: 18 14 16 14

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
campi: {{frase.lezioni-a-calendario}}={{quanti}}; {{frase.ud-previste}}={{ud}}; {{frase.ud-a-calendario}}={{udTenute}}
campi: {{frase.assenza-di-classe}}={{assenza}}; {{frase.presenza-di-classe}}={{presenza}}; {{frase.media-di-classe}}={{media}}

sezione: {{frase.presenze}}
tabella: presenze
paragrafo: {{frase.nota-presenze}}

se: {{oltreSoglia}}
sezione: {{frase.da-seguire}}
avviso: {{frase.oltre-soglia}}
elenco: oltreSoglia
fine:

sezione: {{frase.quadro-orario}}
campi: {{frase.orario}}={{orarioSettimanale}}; {{frase.aula}}={{aule}}; {{frase.ud-settimanali}}={{udSettimanali}}
tabella: orario

sezione: {{frase.sospensioni-calendario}}
tabella: sospensioni

sezione: {{frase.voti-e-medie}}
tabella: voti

sezione: {{frase.diario-lezioni}}
tabella: diario

sezione: {{frase.osservazioni}}
tabella: osservazioni

sezione: {{frase.com-e-andata}}
tabella: comportamento

sezione: {{frase.piani-lezione}}
tabella: piani
tabella: scaletta

sezione: {{frase.pendenze}}
tabella: pendenze

sezione: {{frase.check}}
tabella: check
