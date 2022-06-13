import { createHmac } from "crypto";
import type { Application } from "express";
import Imap, { Config } from 'imap'
import { deprecate } from "util";

const fetchOptions = {
  bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
  struct: true,
  // markSeen: true,
}

type MailInfo = {
  seqno: number,
  attributes: {
    uid: number,
    [key: string]: any,
  },
  body: any,
  headers: {
    from: string[]
    to: string[]
  },
}

function getEmailAddress([info]: string[]): string {
  if (!info.includes('<')) return info;
  return /<([^>]+)>/.exec(info)?.at(1)
}

type MailSummary = { from: string; sessionId: string; }
function mailSummary(mail: MailInfo): MailSummary {
  const sessionId = getEmailAddress(mail.headers.to)
    .split('@').at(0)
    .split('+').at(1);
  return {
    from: getEmailAddress(mail.headers.from),
    // from: createHmac('sha256', getEmailAddress(mail.headers.from)).digest('hex'),
    sessionId,
  }
}

function mailUids(mails: MailInfo[]): number[] {
  return mails.map(mail => mail.attributes.uid)
}

function deleteMails(imap: Imap, mails: MailInfo[]): Promise<MailInfo[]> {
  return new Promise((resolve, reject) => {
    imap.setFlags(mailUids(mails), ['\\Deleted'], function (err) {
      if (err) return reject(err)

      imap.expunge((err) => {
        if (err) return reject(err)
        resolve(mails)
      })
    });
  });
}

function processMessage(msg: Imap.ImapMessage, seqno: any): Promise<MailInfo> {
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

export const getMailsForToken = deprecate(function getMailsForToken(imap: Imap, email: string, token: string): Promise<MailInfo[]> {
  const [user, domain] = email.split('@')
  const emailWithToken = `${user}+${token}@${domain}`
  const mails: any[] = []

  return new Promise((resolve, reject) => {
    async function finish() {
      const filtered = mails.filter((mail: any) => {
        const included = mail.headers.to.includes(emailWithToken)
        if (included) return true;

        for (const item in mail.headers.to) {
          if (mail.headers.to[item].includes(emailWithToken)) return true
        }
      })

      if (!filtered.length) return resolve([]);

      try {
        await deleteMails(imap, filtered)
        resolve(filtered)
      } catch (e) {
        reject(e)
      }
    }

    // imap.openBox('INBOX', false, async function (err, box) {
    //   if (err) return reject(err);
    //   console.info('[imap] box open and writeable', box.messages);
    //   if (!box.messages.total) return finish();
    imap.search([
      'UNSEEN',
      // ['TO', emailWithToken]
    ], function (err, results) {
      // console.info('[imap] search', err, results);
      if (err) return reject(err)
      if (!results.length) return resolve(mails)

      const f = imap.fetch(results, {
        ...fetchOptions,
        // markSeen: true
      });
      f.on('message', async (msg, seqno) => {
        const mail = await processMessage(msg, seqno)
        mails.push(mail)
        if (mails.length === results.length) finish()
      });
      f.once('error', reject);
    });
    // })
  })
}, 'getMailsForToken is deprecated. Use processInbox instead.')

export async function processInbox(app: Application, options: { [k: string]: any }): Promise<MailSummary[]> {
  const imap = app.get('imap');
  const mails: MailInfo[] = []

  return new Promise((resolve, reject) => {
    async function finish() {
      try {
        await deleteMails(imap, mails)
        resolve(mails.map(mailSummary))
      } catch (e) {
        reject(e)
      }
    }
    imap.search([
      'UNSEEN',
    ], function (err, results) {
      if (err) return reject(err)
      if (!results.length) return resolve([])

      const f = imap.fetch(results, {
        ...fetchOptions,
        markSeen: true
      });
      f.on('message', async (msg, seqno) => {
        const mail = await processMessage(msg, seqno)
        mails.push(mail)
        if (mails.length === results.length) finish()
      });
      f.once('error', reject);
    });
  })
}

export async function addIMAPEmail(app: Application, options: Config): Promise<void> {
  app.set('imapoptions', options);
  // not really elegant, but for now, i guess it's OK
  if (!options) {
    app.set('imap', null);
    app.set('imapbox', null);
    return Promise.resolve();
  }
  const imap = new Imap(options);

  return new Promise((resolve, reject) => {
    imap.once('ready', function () {
      app.set('imap', imap)
      imap.openBox('INBOX', false, async function (err, box) {
        if (err) return reject(err)
        app.set('imapbox', box)
        resolve()
      })
    });

    imap.once('error', function (err: any) {
      console.error('[imap] error', err)
      reject(err)
    });

    imap.once('end', function () {
      console.info('[imap] end')
    });

    imap.connect();
  })
}