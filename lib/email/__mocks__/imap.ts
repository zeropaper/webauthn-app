import {
  Application
} from "express";

type MailSummary = {
  from: string;
  sessionId: string;
  [key: string]: any;
}

export const processInbox = jest.fn(async function processInboxMock(app: Application, options: { [k: string]: any }): Promise<MailSummary[]> {
  return Promise.resolve([])
})

export const addIMAPEmail = jest.fn(async function addIMAPEmailMock(app: Application, options: { [k: string]: any }): Promise<void> {
})
