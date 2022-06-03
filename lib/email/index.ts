import { Application } from "express";
import { addSMTPEmail, GmailOptions } from "./smtp";
import { addIMAPEmail } from "./imap";

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type DefaultOptions = {
  user: string;
  password: string;
  host: string,
  port: number,
  tls: boolean,
}

export type EmailOptions = {
  user?: string,
  password?: string,
  imap: Omit<Parameters<typeof addIMAPEmail>[1], 'user' | 'password'>,
  smtp?: Omit<Parameters<typeof addSMTPEmail>[1], 'user' | 'password'>,
}

export interface AddEmail {
  (app: Application, options: EmailOptions): Promise<void>;
}

export default <AddEmail>async function addEmail(app, options) {
  if (options.smtp?.gmailAppPassword && options.smtp?.gmailUser) {
    await addSMTPEmail(app, <GmailOptions>options.smtp);
  } else if (options.smtp?.host) {
    await addSMTPEmail(app, {
      host: options.smtp.host,
      port: options.smtp.port,
      tls: options.smtp.tls,
      user: options.user,
      password: options.password,
    });
  } else {
    await addSMTPEmail(app);
  }

  await addIMAPEmail(app, {
    ...options.imap,
    user: options.user,
    password: options.password,
  });
}
