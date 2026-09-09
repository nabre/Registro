// Il file di posta che il registro consegna al programma di posta.
//
// È l'unico pezzo dell'invio che si possa provare: da qui in poi c'è Outlook, e
// quel che sbaglia questo file si vede solo quando la mail è già partita — un
// oggetto accentato che arriva a pezzi, un allegato con il nome mangiato, o la
// copia nascosta che non c'è e trenta famiglie si vedono a vicenda.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { componiEml, componiPerInvio, destinatariBusta } from '../dist-prove/dominio.mjs'

/** Le intestazioni, dalla testa fino alla prima riga vuota. */
function testate (eml) {
  return eml.split('\r\n\r\n')[0].split('\r\n')
}

function valore (eml, nome) {
  const riga = testate(eml).find((r) => r.toLowerCase().startsWith(`${nome.toLowerCase()}:`))
  return riga ? riga.slice(nome.length + 1).trim() : null
}

describe('il file di posta', () => {
  it('si apre come bozza da mandare, non come messaggio ricevuto', () => {
    // Senza `X-Unsent` Outlook lo apre in sola lettura: la bozza sarebbe
    // guardabile e non spedibile, che è il modo di rendere inutile tutto.
    const eml = componiEml({ oggetto: 'Ciao', corpo: 'testo', ccn: ['a@b.ch'] })
    assert.equal(valore(eml, 'X-Unsent'), '1')
  })

  it('mette gli indirizzi della classe in copia nascosta e non in chiaro', () => {
    const eml = componiEml({
      oggetto: 'Uscita',
      corpo: 'testo',
      ccn: ['uno@b.ch', 'due@b.ch'],
    })
    assert.equal(valore(eml, 'Bcc'), 'uno@b.ch, due@b.ch')
    assert.equal(valore(eml, 'To'), null)
  })

  it('scrive in chiaro chi deve vedersi destinatario', () => {
    // La richiesta di firma va a un'azienda sola: arrivare in copia nascosta da
    // uno sconosciuto è il modo di finire nello spam.
    const eml = componiEml({ oggetto: 'Firma', corpo: 'testo', a: ['ditta@x.ch'], ccn: [] })
    assert.equal(valore(eml, 'To'), 'ditta@x.ch')
    assert.equal(valore(eml, 'Bcc'), null)
  })

  it('non scrive niente senza destinatari, ma non inventa intestazioni vuote', () => {
    const eml = componiEml({ oggetto: 'X', corpo: 'testo', ccn: [] })
    assert.equal(valore(eml, 'To'), null)
    assert.equal(valore(eml, 'Bcc'), null)
  })

  it('dice da quale casella parte, quando lo si sa', () => {
    // Con due caselle nello stesso programma di posta il conto predefinito non
    // è per forza quello della scuola, e una circolare spedita dall'indirizzo
    // privato si scopre solo dopo, in trenta caselle diverse.
    const eml = componiEml({
      oggetto: 'x',
      corpo: 'y',
      da: 'nome.cognome@edu.ti.ch',
      ccn: ['a@b.ch'],
    })
    assert.equal(valore(eml, 'From'), 'nome.cognome@edu.ti.ch')
  })

  it('non inventa un mittente quando nessuno l’ha detto', () => {
    const eml = componiEml({ oggetto: 'x', corpo: 'y', ccn: ['a@b.ch'] })
    assert.equal(valore(eml, 'From'), null)
  })

  it('codifica un oggetto accentato invece di lasciarlo andare a pezzi', () => {
    const eml = componiEml({ oggetto: 'Assenze 1° semestre', corpo: 'x', ccn: ['a@b.ch'] })
    const oggetto = valore(eml, 'Subject')
    assert.match(oggetto, /^=\?UTF-8\?B\?/)
    const dentro = Buffer.from(oggetto.slice('=?UTF-8?B?'.length, -2), 'base64').toString('utf8')
    assert.equal(dentro, 'Assenze 1° semestre')
  })

  it('lascia in chiaro un oggetto che di accenti non ne ha', () => {
    const eml = componiEml({ oggetto: 'Uscita del 12', corpo: 'x', ccn: ['a@b.ch'] })
    assert.equal(valore(eml, 'Subject'), 'Uscita del 12')
  })

  it('porta il corpo intero, accenti compresi, e tiene gli a capo', () => {
    const corpo = 'Gentili famiglie,\nl’uscita è confermata.'
    const eml = componiEml({ oggetto: 'x', corpo, ccn: ['a@b.ch'] })
    const dopoTestate = eml.split('\r\n\r\n').slice(1).join('\r\n\r\n')
    const dentro = Buffer.from(dopoTestate.replaceAll('\r\n', ''), 'base64').toString('utf8')
    assert.match(dentro, /Gentili famiglie,<br>l’uscita è confermata\./)
  })

  it('scrive il corpo in HTML anche senza firma', () => {
    // Il file si apre in un programma di posta che ci attacca la propria
    // firma, che è in HTML. Un corpo in testo semplice lo obbliga a
    // riconciliare i due formati, e quel che resta è la firma senza il
    // messaggio: è successo davvero, con una bozza arrivata vuota.
    const eml = componiEml({ oggetto: 'x', corpo: 'ciao', ccn: ['a@b.ch'] })
    assert.match(eml, /Content-Type: text\/html; charset=UTF-8/)
    assert.ok(!eml.includes('text/plain'))
  })

  it('non lascia passare per tag quel che il docente ha scritto', () => {
    const eml = componiEml({ oggetto: 'x', corpo: 'aula <b>rossa</b> & fredda', ccn: ['a@b.ch'] })
    const dopoTestate = eml.split('\r\n\r\n').slice(1).join('\r\n\r\n')
    const dentro = Buffer.from(dopoTestate.replaceAll('\r\n', ''), 'base64').toString('utf8')
    assert.match(dentro, /aula &lt;b&gt;rossa&lt;\/b&gt; &amp; fredda/)
  })

  it('allega il file col suo nome vero, e con un ripiego per chi non lo sa leggere', () => {
    const eml = componiEml({
      oggetto: 'x',
      corpo: 'y',
      ccn: ['a@b.ch'],
      allegati: [
        { nome: 'Assenze 1° semestre.pdf', tipo: 'application/pdf', contenuto: 'AAAA' },
      ],
    })
    assert.match(eml, /Content-Type: multipart\/mixed; boundary="(.+)"/)
    assert.match(eml, /Content-Disposition: attachment; filename="Assenze_1_semestre\.pdf"/)
    assert.match(eml, /filename\*=UTF-8''Assenze%201%C2%B0%20semestre\.pdf/)
    assert.match(eml, /Content-Type: application\/pdf/)
  })

  it('chiude il multipart come vuole il MIME: ogni pezzo aperto e la coda finale', () => {
    const eml = componiEml({
      oggetto: 'x',
      corpo: 'y',
      ccn: ['a@b.ch'],
      allegati: [
        { nome: 'uno.pdf', tipo: 'application/pdf', contenuto: 'AAAA' },
        { nome: 'due.pdf', tipo: 'application/pdf', contenuto: 'BBBB' },
      ],
    })
    const confine = eml.match(/boundary="(.+)"/)[1]
    // Tre aperture — corpo e due allegati — e una chiusura sola.
    assert.equal(eml.split(`--${confine}\r\n`).length - 1, 3)
    assert.ok(eml.includes(`--${confine}--`))
    // Il confine non deve comparire dentro il contenuto, o il messaggio si
    // spezzerebbe a metà di un allegato.
    assert.ok(!confine.includes('='))
  })

  it('spezza il base64 a 76 colonne: righe più lunghe si perdono per strada', () => {
    const eml = componiEml({
      oggetto: 'x',
      corpo: 'y',
      ccn: ['a@b.ch'],
      allegati: [{ nome: 'g.pdf', tipo: 'application/pdf', contenuto: 'A'.repeat(500) }],
    })
    for (const riga of eml.split('\r\n')) assert.ok(riga.length <= 78, `riga lunga: ${riga.length}`)
  })

  it('separa le righe con CRLF, come vuole la posta', () => {
    const eml = componiEml({ oggetto: 'x', corpo: 'y', ccn: ['a@b.ch'] })
    assert.ok(!/[^\r]\n/.test(eml))
  })
})

describe('il messaggio che parte per il server', () => {
  it('non porta la copia nascosta nelle intestazioni', () => {
    // È l'errore che non si può fare: `Bcc:` in un messaggio in viaggio fa
    // leggere a ogni famiglia l'elenco di tutte le altre. Gli indirizzi
    // nascosti si dicono al server nella busta, e lì restano.
    const messaggio = componiPerInvio({
      oggetto: 'Uscita',
      corpo: 'testo',
      da: 'docente@edu.ti.ch',
      a: ['docente@edu.ti.ch'],
      ccn: ['uno@b.ch', 'due@b.ch'],
    })
    assert.equal(valore(messaggio, 'Bcc'), null)
    assert.equal(valore(messaggio, 'To'), 'docente@edu.ti.ch')
  })

  it('non si presenta come bozza da finire', () => {
    const messaggio = componiPerInvio({ oggetto: 'x', corpo: 'y', ccn: ['a@b.ch'] })
    assert.equal(valore(messaggio, 'X-Unsent'), null)
  })

  it('porta un proprio identificativo, con il dominio di chi spedisce', () => {
    const messaggio = componiPerInvio(
      { oggetto: 'x', corpo: 'y', da: 'docente@edu.ti.ch', ccn: ['a@b.ch'] },
      new Date('2026-09-08T08:00:00Z'),
      'abc123',
    )
    assert.match(valore(messaggio, 'Message-ID'), /^<[a-z0-9]+\.abc123@edu\.ti\.ch>$/)
  })

  it('spezza un elenco lungo di destinatari invece di sforare la riga', () => {
    // Oltre i 998 caratteri il server taglia la riga, e la mail arriva a un
    // elenco di destinatari monco.
    const molti = Array.from({ length: 30 }, (_, i) => `allievo.numero${i}@edu.ti.ch`)
    const messaggio = componiPerInvio({ oggetto: 'x', corpo: 'y', a: molti, ccn: [] })
    for (const riga of testate(messaggio)) assert.ok(riga.length < 998)
    // Spezzata, ma tutta lì: le righe di continuazione cominciano con uno spazio.
    const ricucito = messaggio.split('\r\n\r\n')[0].replace(/\r\n /g, ' ')
    for (const indirizzo of molti) assert.ok(ricucito.includes(indirizzo))
  })

  it('mette nella busta i destinatari in chiaro e quelli nascosti, senza doppioni', () => {
    assert.deepEqual(
      destinatariBusta({
        oggetto: 'x',
        corpo: 'y',
        a: ['docente@edu.ti.ch'],
        ccn: ['uno@b.ch', 'docente@edu.ti.ch'],
      }),
      ['docente@edu.ti.ch', 'uno@b.ch'],
    )
  })
})
