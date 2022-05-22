import * as express from 'express'
import base64url from 'base64url'
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

const router = express.Router()

import type {
  Models,
  Instances,
} from './models'

const loadUser: express.RequestHandler = async function (req, res, next) {
  const User = req.app.get('sequelize').model('User');
  console.info('[session]', req.url, req.sessionID, req.session.userId)
  try {
    if (!req.session.userId) throw new Error('No session');
    const user = await User.findByPk(req.session.userId);
    res.locals.user = user;
    next()
  } catch (err) {
    next(err)
  }
}

router.post('/registration/check-username', async function (req, res, next) {
  try {
    const User = <Models['User']>req.app.get('sequelize').model('User');
    const username = req.body.username;
    const user = await User.findOne({ where: { username } });
    res.json({ available: !user })
  } catch (err) {
    next(err)
  }
})

/**
 * Registration (a.k.a. "Registration")
 */
router.get('/registration/generate-options', async (req, res, next) => {
  try {
    const User: Models['User'] = req.app.get('sequelize').model('User');
    const user: Instances['User'] = await User.build();

    const {
      // /**
      //  * The username can be a human-readable name, email, etc... as it is intended only for display.
      //  */
      // username = 'anonymous',
      // devices: rawDevices = '',
    } = user || {};
    // const devices = rawDevices.split(',').map(d => d.trim());
    // console.info('username', username);
    // console.info('devices', devices);
    const opts: GenerateRegistrationOptionsOpts = {
      rpName: req.app.get('rp'),
      rpID: req.app.get('rpId'),
      userID: user.id,
      userName: 'Anonymous',
      timeout: 60000,
      attestationType: 'none',
      // /**
      //  * Passing in a user's list of already-registered authenticator IDs here prevents users from
      //  * registering the same device multiple times. The authenticator will simply throw an error in
      //  * the browser if it's asked to perform registration when one of these ID's already resides
      //  * on it.
      //  */
      // excludeCredentials: devices.map(dev => ({
      //   id: dev.credentialID,
      //   type: 'public-key',
      //   transports: dev.transports,
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

    // /**
    //  * The server needs to temporarily remember this value for verification, so don't lose it until
    //  * after you verify an authenticator response.
    //  */
    user.currentChallenge = options.challenge;
    await user.save()

    req.session.userId = user.id

    res.send(options);
  } catch (err) {
    next(err)
  }
});

router.post('/registration/verify', loadUser, async (req, res, next) => {
  try {
    const body: RegistrationCredentialJSON = req.body;

    const user: Instances['User'] = res.locals.user;
    const Authenticator: Models['Authenticator'] = req.app.get('sequelize').model('Authenticator');

    const expectedChallenge = user.currentChallenge;

    const opts: VerifyRegistrationResponseOpts = {
      credential: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: req.app.get('publicUrl'),
      expectedRPID: req.app.get('rpId'),
      requireUserVerification: true,
    };
    console.info('[registration verification]', opts);
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse(opts);

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      // const existingDevice = user.devices.find(device => device.credentialID === credentialID);

      // if (!existingDevice) {
      //   /**
      //    * Add the returned device to the user's list of devices
      //    */
      //   const newDevice: AuthenticatorDevice = {
      //     credentialPublicKey,
      //     credentialID,
      //     counter,
      //     transports: body.transports,
      //   };
      //   user.devices = user.devices.push(newDevice);
      // }
      const existingDevice = await Authenticator.findOne({ where: { credentialID } });
      if (!existingDevice) {
        const newDevice: AuthenticatorDevice = {
          credentialPublicKey,
          credentialID,
          counter,
          transports: body.transports,
        };
        const device = await Authenticator.build(newDevice as any);
        // @ts-ignore
        await user.addDevice(device)
        await device.save();
      }
    }

    res.send({ verified });
  } catch (err) {
    next(err)
  }
});

/**
 * Login (a.k.a. "Authentication")
 */
router.get('/authentication/generate-options', async (req, res, next) => {
  try {
    // // You need to know the user by this point
    // // const user = inMemoryUserDeviceDB[loggedInUserId];
    // const User = req.app.get('sequelize').model('User');
    // const user = await User.findByPk(loggedInUserId);
    const User: Models['User'] = req.app.get('sequelize').model('User')
    const user: Instances['User'] = res.locals.user
    const devices: Instances['Authenticator'] = []

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials: devices.map(device => ({
        id: device.credentialID,
        type: 'public-key',
        transports: device.transports ?? ['usb', 'ble', 'nfc', 'internal'],
      })),
      userVerification: 'required',
      rpID: req.app.get('rpId'),
    };

    const options = generateAuthenticationOptions(opts);

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    // inMemoryUserDeviceDB[loggedInUserId].currentChallenge = options.challenge;
    user.currentChallenge = options.challenge;
    await user.save()

    res.send(options);
  } catch (err) {
    next(err)
  }
});

router.post('/authentication/verify', loadUser, async (req, res, next) => {
  try {
    const body: AuthenticationCredentialJSON = req.body;

    const User: Models['User'] = req.app.get('sequelize').model('User');
    const user: Instances['User'] = res.locals.user;

    const expectedChallenge = user.currentChallenge;

    let dbAuthenticator;
    const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
    // // "Query the DB" here for an authenticator matching `credentialID`
    // for (const device of user.devices) {
    //   if (device.credentialID.equals(bodyCredIDBuffer)) {
    //     dbAuthenticator = device;
    //     break;
    //   }
    // }

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
    }

    res.send({ verified });
  } catch (err) {
    next(err)
  }
});


export default router