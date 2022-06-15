import * as express from 'express';
import base64url from 'base64url';

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
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
} from '@simplewebauthn/typescript-types';

import loadUser from '../middlewares/loadUser';
import { Instances, Models } from '../models';

const webauthnRouter = express.Router();

webauthnRouter.use(loadUser);

// returns the options for webauthn registration
webauthnRouter.get('/registration', async (req, res: express.Response<any, {
  user: Instances['User'];
  authenticatorDevices: Instances['AuthenticatorDevice'][];
}>, next) => {
  try {
    const sequelize = req.app.get('sequelize');
    const user = res.locals.user;
    const devices = res.locals.authenticatorDevices;

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
      excludeCredentials: devices.map((dev) => ({
        // should be a BufferSource
        id: dev.credentialID as any,
        type: 'public-key',
        transports: dev.transports as any,
      })),
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
webauthnRouter.post('/registration', async (req, res: express.Response<any, {
  user: Instances['User'];
  authenticatorDevices: Instances['AuthenticatorDevice'][];
}>, next) => {
  try {
    const sequelize = req.app.get('sequelize');
    const AuthticatorDevice = <Models['AuthenticatorDevice']>sequelize.model('AuthenticatorDevice');
    const user: Instances['User'] = res.locals.user;
    const body: RegistrationCredentialJSON = req.body;
    const devices = res.locals.authenticatorDevices;

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
      return next(error);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const {
        credentialPublicKey,
        credentialID,
        counter,
      } = registrationInfo;

      const existingDevice = devices.find(device => device.credentialID === credentialID);

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        const newDevice: Parameters<typeof AuthticatorDevice.create>[0] = {
          credentialPublicKey,
          credentialID,
          counter,
          transports: body.transports,
          userId: user.id,
        };
        await AuthticatorDevice.create(newDevice);
      }
    }

    user.setDataValue('currentChallenge', null);
    await user.save();

    res.send({ verified });
  } catch (err) {
    next(err);
  }
});

// returns the options for webauthn authentication
webauthnRouter.get('/authentication', async (req, res: express.Response<any, {
  user: Instances['User'];
  authenticatorDevices: Instances['AuthenticatorDevice'][];
}>, next) => {
  try {
    const user: Instances['User'] = res.locals.user;
    const devices = res.locals.authenticatorDevices;

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials: devices.map(dev => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: dev.transports ?? ['usb', 'ble', 'nfc', 'internal'],
      })) as any,
      userVerification: 'required',
      rpID: req.app.get('rpId'),
    };

    const options = generateAuthenticationOptions(opts);

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

// verifies of a webauthn authentication
webauthnRouter.post('/authentication', async (req, res: express.Response<any, {
  user: Instances['User'];
  authenticatorDevices: Instances['AuthenticatorDevice'][];
}>, next) => {
  try {
    const sequelize = req.app.get('sequelize');
    const user: Instances['User'] = res.locals.user;
    const devices = res.locals.authenticatorDevices;
    const body: AuthenticationCredentialJSON = req.body;

    const expectedChallenge = user.currentChallenge;

    let dbAuthenticator;
    const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
    // "Query the DB" here for an authenticator matching `credentialID`
    for (const device of devices) {
      if (device.credentialID.equals(bodyCredIDBuffer)) {
        dbAuthenticator = device;
        break;
      }
    }

    if (!dbAuthenticator) {
      throw new Error(`could not find authenticator matching ${body.id}`);
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      const opts: VerifyAuthenticationResponseOpts = {
        credential: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin: req.app.get('publicUrl'),
        expectedRPID: req.app.get('rpId'),
        authenticator: dbAuthenticator,
        requireUserVerification: true,
      };
      verification = verifyAuthenticationResponse(opts);
    } catch (error) {
      const _error = error as Error;
      console.error(_error);
      return res.status(400).send({ error: _error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the authenticator's counter in the DB to the newest count in the authentication
      dbAuthenticator.counter = authenticationInfo.newCounter;
      await dbAuthenticator.save();
    }

    res.json({ verified });
  } catch (err) {
    next(err);
  }
});

export default webauthnRouter;