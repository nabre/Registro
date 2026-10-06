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

# Una riga a testa con i numeri che altrimenti stanno sparsi in sei sezioni:
# media e nota, assenza e ritardi, consegne fatte, check, recuperi aperti, i
# segni della matrice. Si legge per primo in conferenza: dice chi ha bisogno
# di che cosa, e le sezioni sotto dicono perché.
sezione: {{frase.quadro-per-persona}}
tabella: quadro

sezione: {{frase.presenze}}
se: {{presenze}}
tabella: presenze
paragrafo: {{frase.nota-presenze}}
fine:

# La stessa «% assenza» della tabella, come barra: una a testa sulla stessa
# scala, con la riga della soglia. Chi è oltre ha la barra piena e la cifra in
# grassetto, che si legge anche su una fotocopia in bianco e nero.
sezione: {{frase.assenza-per-persona}}
grafico: assenze

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

sezione: {{frase.andamento}}
grafico: andamento

sezione: {{frase.diario-lezioni}}
tabella: diario

sezione: {{frase.osservazioni}}
tabella: osservazioni

sezione: {{frase.com-e-andata}}
tabella: comportamento

# I piani in ordine di data della lezione, le bozze in fondo: prima il quadro,
# poi la scaletta di ognuno sotto la sua data. Un piano corto non si spezza fra
# due pagine.
sezione: {{frase.piani-lezione}}
tabella: piani
ripeti: piani
sottosezione: {{intestazionePiano}}
tabella: scaletta
fine:

# Tutte le consegne del periodo, anche quelle chiuse: le pendenze dicono
# solo le aperte.
sezione: {{frase.consegne}}
tabella: consegne

sezione: {{frase.pendenze}}
tabella: pendenze

sezione: {{frase.check}}
tabella: check
