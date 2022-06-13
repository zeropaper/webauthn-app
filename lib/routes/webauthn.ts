import * as express from 'express'
import https from 'https';
import http from 'http';
import fs, { appendFile } from 'fs';

import dotenv from 'dotenv';
import base64url from 'base64url';

dotenv.config();

import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';

import type {
  RegistrationCredentialJSON,
  AuthenticationCredentialJSON,
  AuthenticatorDevice,
} from '@simplewebauthn/typescript-types';

import loadUser from '../middlewares/loadUser';
import { Instances, Models } from '../models';

const webauthnRouter = express.Router();

webauthnRouter.use(loadUser);

// returns the options for webauthn registration
webauthnRouter.get('/registration', async (req, res: express.Response<any, {
  user: Instances['User'];
}>, next) => {
  try {
    // const sequelize = req.app.get('sequelize');
    // const AuthticatorDevice = <Models['AuthenticatorDevice']>sequelize.model('AuthenticatorDevice');
    const user = res.locals.user;
    console.info('[webauthn] GET registration', user);

    // const devices = await AuthticatorDevice.findAll({
    //   where: {
    //     userId: user.id,
    //   }
    // });

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: req.app.get('rp'),
      rpID: req.app.get('rpId'),
      userID: user.id,
      userName: user.email,
      timeout: 60000,
      attestationType: 'none',
      /**
       * Passing in a user's list of already-registered authenticator IDs here prevents users from
       * registering the same device multiple times. The authenticator will simply throw an error in
       * the browser if it's asked to perform registration when one of these ID's already resides
       * on it.
       */
      // excludeCredentials: devices.map((dev) => ({
      //   // should be a BufferSource
      //   id: dev.credentialID as any,
      //   type: 'public-key',
      //   transports: dev.transports as any,
      // })),
      /**
       * The optional authenticatorSelection property allows for specifying more constraints around
       * the types of authenticators that users to can use for registration
       */
      authenticatorSelection: {
        userVerification: 'required',
      },
      /**
       * Support the two most common algorithms: ES256, and RS256
       */
      supportedAlgorithmIDs: [-7, -257],
    };

    const options = generateRegistrationOptions(opts);

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    user.setDataValue('currentChallenge', options.challenge);
    await user.save();
    res.json(options);
  } catch (err) {
    next(err);
  }
});

// verifies of a webauthn registration
webauthnRouter.post('/registration', async (req, res, next) => {
  try {
    const user: Instances['User'] = res.locals.user;
    const body: RegistrationCredentialJSON = req.body;
    console.info('[webauthn] POST registration', user, body);

    const expectedChallenge = user.currentChallenge;

    let verification: VerifiedRegistrationResponse;
    try {
      const opts: VerifyRegistrationResponseOpts = {
        credential: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin: req.app.get('publicUrl'),
        expectedRPID: req.app.get('rpId'),
        requireUserVerification: true,
      };
      verification = await verifyRegistrationResponse(opts);
    } catch (error) {
      const _error = error as Error;
      console.error(_error);
      return res.status(400).send({ error: _error.message });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      const existingDevice = user.devices.find(device => device.credentialID === credentialID);

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        const newDevice: AuthenticatorDevice = {
          credentialPublicKey,
          credentialID,
          counter,
          transports: body.transports,
        };
        user.devices.push(newDevice);
      }
    }

    res.send({ verified });
  } catch (err) {
    next(err);
  }
});

// returns the options for webauthn authentication
webauthnRouter.get('/authentication', async (req, res, next) => {
  try {
    const user: Instances['User'] = res.locals.user;
    console.info('[webauthn] GET authentication', user)
    res.status(501).json({ error: 'Not Implemented' });
  } catch (err) {
    next(err);
  }
});

// verifies of a webauthn authentication
webauthnRouter.post('/authentication', async (req, res, next) => {
  try {
    const user: Instances['User'] = res.locals.user;
    console.info('[webauthn] POST authentication', user)
    res.status(501).json({ error: 'Not Implemented' });
  } catch (err) {
    next(err);
  }
});

export default webauthnRouter;