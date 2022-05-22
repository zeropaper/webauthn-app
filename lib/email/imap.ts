import type { Application } from "express";
import Imap, { Config } from 'imap'

const fetchOptions = {
  bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
  struct: true,
  // markSeen: true,
}

type MailInfo = {
  seqno: number,
  attributes: any,
  body: any,
  headers: any,
}

function processMessage(msg: Imap.ImapMessage, seqno: any) {
  return new Promise((resolve, reject) => {
    let attributes: any
    let body: any
    let headers: any

    msg.on('body', function (stream: any, info: any) {
      let buffer = '';
      stream.on('data', function (chunk: any) {
        buffer += chunk.toString('utf8');
      });
      stream.once('end', function () {
        body = buffer
        headers = Imap.parseHeader(buffer)
      });
    });
    msg.once('attributes', function (attrs: any) {
      attributes = attrs;
    });
    msg.once('error', reject)
    msg.once('end', function () {
      resolve({
        seqno,
        headers,
        attributes,
        body
      })
    });
  })
}

export async function addIMAPEmail(app: Application, options: Config) {
  const imap = new Imap(options);

  function tearDown(): Promise<void> {
    return new Promise((resolve, reject) => {
      async function finish() {
        imap.expunge(function (err) {
          if (err) return reject(err)

          imap.closeBox(true, function (err) {
            if (err) return reject(err)
            resolve()
          })
        })
      }

      // delete all mails that are seen
      imap.search(['SEEN'], function (err, results) {
        if (err) return reject(err)

        if (!results.length) return finish()

        imap.setFlags(results, ['\\Deleted'], function (err) {
          if (err) return reject(err)
          finish()
        })
      });
    })
  }

  imap.once('ready', function () {
    console.info('imap ready')
    // imap.openBox('INBOX', false, async function (err, box: Imap.Box) {
    //   if (err) throw err;
    //   const mails = await getMailsForToken('something', box)
    //   console.info('mails', mails)
    //   await tearDown()
    // });
  });

  imap.once('error', function (err: any) {
    console.error('imap error', err)
  });

  // imap.once('end', function () {});

  imap.connect();

  // QUESTION: move that to when `imap` is ready?
  app.set('emailin', imap)
}