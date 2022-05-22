import { Application } from 'express'
import nodemailer from 'nodemailer'

import type { XOR, DefaultOptions } from '.'

export type GmailOptions = {
  gmailUser: string,
  gmailAppPassword: string,
}

type GetTransportOptions = XOR<GmailOptions, DefaultOptions>

export function getTransport(options?: GetTransportOptions) {
  if (!options) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      auth: {
        user: 'project.1',
        pass: 'secret.1'
      }
    });
  }

  if (options?.gmailUser) {
    if (!options?.gmailAppPassword) throw new Error('gmailAppPassword is required when gmailUser is provided')
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: options.gmailUser,
        accessToken: options.gmailAppPassword,
      },
    });
  }

  if (options.host) {
    if (!options.port) throw new Error('port is required when host is provided')
    if (!options.user) throw new Error('user is required when host is provided')
    if (!options.password) throw new Error('password is required when host is provided')
    return nodemailer.createTransport({
      host: options.host,
      port: Number(options.port),
      auth: {
        user: options.user,
        pass: options.password
      }
    });
  }
}

type PrepareAppOptions = GetTransportOptions

export async function addSMTPEmail(app: Application, options?: PrepareAppOptions) {
  app.set('emailout', getTransport(options))
}