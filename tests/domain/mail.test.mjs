// Il file di posta consegnato al programma di posta: l'unico pezzo dell'invio
// che si possa provare. Oggetto accentato, nomi degli allegati, copia nascosta,
// destinatari piegati, e gli allegati scelti che non danno un file.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  allegatiMancanti,
  componiEml,
  componiPerInvio,
  destinatariBusta,
} from '../../dist-tests/domain.mjs'

/** Le intestazioni, dalla testa fino alla prima riga vuota. */
function testate (eml) {
  return eml.split('\r\n\r\n')[0].split('\r\n')
}

function valore (eml, nome) {
  const riga = testate(eml).find((r) => r.toLowerCase().startsWith(`${nome.toLowerCase()}:`))
  return riga ? riga.slice(nome.length + 1).trim() : null
}

/** Un'intestazione ricucita: le righe di continuazione cominciano con uno spazio. */
function ricucita (messaggio, nome) {
  const testa = messaggio.split('\r\n\r\n')[0].replace(/\r\n /g, ' ')
  const riga = testa.split('\r\n').find((r) => r.startsWith(`${nome}:`))
  return riga ? riga.slice(nome.length + 1).trim() : null
}

const conAllegato = (nome) => ({
  oggetto: 'x',
  corpo: 'y',
  ccn: ['a@b.ch'],
  allegati: [{ nome, tipo: 'application/pdf', contenuto: 'AAAA' }],
})

describe('il file di posta', () => {
  it('si apre come bozza da mandare, non come messaggio ricevuto', () => {
    // Senza `X-Unsent` Outlook lo apre in sola lettura.
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
    // La richiesta di firma va a un'azienda sola: niente copia nascosta.
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
    // Con due caselle nello stesso programma il conto predefinito può non essere
    // quello della scuola.
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
    // Il programma di posta attacca la sua firma HTML: con un corpo in testo
    // semplice resterebbe la firma senza il messaggio.
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
    // Il confine non compare nel contenuto, o il messaggio si spezzerebbe.
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
    // Niente `Bcc:` nel messaggio in viaggio: gli indirizzi nascosti vanno solo
    // nella busta del server.
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
    // Oltre i 998 caratteri il server taglia la riga.
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

describe('il nome dell’allegato', () => {
  it('il `name=` di ripiego tiene l’estensione', () => {
    for (const scritto of [componiEml(conAllegato('Pagella 1° semestre.pdf')), componiPerInvio(conAllegato('Pagella 1° semestre.pdf'))]) {
      assert.match(scritto, /Content-Type: application\/pdf; name="Pagella_1_semestre\.pdf"/)
    }
  })

  it('`filename*=` codifica anche apostrofo, parentesi e asterisco', () => {
    const eml = componiEml(conAllegato("L'uscita (bozza)*.pdf"))
    const valore = eml.match(/filename\*=UTF-8''(\S+)/)[1]
    assert.doesNotMatch(valore, /['()*]/)
    assert.equal(valore, 'L%27uscita%20%28bozza%29%2A.pdf')
    assert.equal(decodeURIComponent(valore), "L'uscita (bozza)*.pdf")
  })
})

describe('l’oggetto accentato lungo', () => {
  const oggetto = 'Comunicazione alle famiglie: uscita didattica al Monte San Giorgio — ' +
    'autorizzazione, costi e orari del 12 ottobre è confermata'

  it('va in parole codificate di al più 75 caratteri, su righe di al più 76', () => {
    for (const scritto of [componiEml({ oggetto, corpo: 'x', ccn: ['a@b.ch'] }), componiPerInvio({ oggetto, corpo: 'x', ccn: [] })]) {
      const parole = ricucita(scritto, 'Subject').split(' ')
      assert.ok(parole.length > 1, 'spezzato')
      for (const parola of parole) {
        assert.match(parola, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/)
        assert.ok(parola.length <= 75, `parola lunga: ${parola.length}`)
      }
      const inizio = testate(scritto).findIndex((r) => r.startsWith('Subject:'))
      for (let i = inizio; i < testate(scritto).length; i++) {
        const riga = testate(scritto)[i]
        if (i > inizio && !riga.startsWith(' ')) break
        assert.ok(riga.length <= 76, `riga lunga: ${riga.length}`)
      }
      // Ogni parola è UTF-8 intero: niente lettere spezzate a metà.
      const dentro = parole
        .map((p) => Buffer.from(p.slice('=?UTF-8?B?'.length, -2), 'base64'))
        .map((b) => {
          const testo = b.toString('utf8')
          assert.ok(!testo.includes('�'), 'lettera spezzata')
          return testo
        })
        .join('')
      assert.equal(dentro, oggetto)
    }
  })
})

describe('il `.eml` con molti destinatari', () => {
  it('piega `To` e `Bcc` sotto i 998 caratteri, senza perdere indirizzi', () => {
    const molti = Array.from({ length: 40 }, (_, i) => `famiglia.numero${i}@edu.ti.ch`)
    const eml = componiEml({ oggetto: 'x', corpo: 'y', a: molti, ccn: molti })
    for (const riga of testate(eml)) assert.ok(riga.length < 998, `riga lunga: ${riga.length}`)
    for (const nome of ['To', 'Bcc']) {
      assert.equal(ricucita(eml, nome), molti.join(', '))
    }
  })
})

describe('gli allegati scelti di una comunicazione', () => {
  it('dice quali non danno un file: consegna sparita o senza file «a me»', () => {
    const registro = {
      consegne: [
        { id: 'csg-pronta', documento: 'modulo', documenti: [{ allievoId: 'docente', file: 'a.pdf', nome: 'a.pdf' }] },
        { id: 'csg-vuota', documento: 'modulo', documenti: [] },
      ],
    }
    const comunicazione = { documentiIds: ['csg-pronta', 'csg-vuota', 'csg-sparita'] }
    assert.deepEqual(allegatiMancanti(registro, comunicazione), ['csg-vuota', 'csg-sparita'])
  })
})
