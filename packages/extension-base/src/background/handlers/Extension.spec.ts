// Copyright 2019-2023 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-misused-promises */

import type { SignerPayloadJSONWithType } from '@polkadot/extension-base/background/types';
import type { MetadataDef } from '@polkadot/extension-inject/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';
import type { KeypairType } from '@polkadot/util-crypto/types';

import chromeStub from '@polkadot/extension-mocks/chrome';
import { TypeRegistry } from '@polkadot/types';
import keyring from '@polkadot/ui-keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { AccountsStore } from '../../stores';
import Extension from './Extension';
import State from './State';
import Tabs from './Tabs';

const address = '5FbSap4BsWfjyRhCchoVdZHkDnmDm3NEgLZ25mesq4aw2WvX';
const authUrls = {
  'http://localhost:3000': {
    authorizedAccounts: [address],
    count: 0,
    id: '11',
    lastAuth: Date.now(),
    origin: 'example.com',
    url: 'http://localhost:3000'
  }
};

chromeStub.windows.getAll.resolves([]);

// @ts-expect-error the "sinon-chrome" mocking library does not provide stubs for session storage, so we have to append them ourselves
chromeStub.storage.session = {
  get: () => Promise.resolve({})
};

const stubChromeStorage = (data: Record<string, unknown> = {}) => chromeStub.storage.local.get.resolves({
  authUrls,
  ...data
});

const portMock = {
  sender: {
    tab: {
      id: 1
    }
  }
} as chrome.runtime.Port;

describe('Extension', () => {
  let extension: Extension;
  let state: State;
  let tabs: Tabs;
  const suri = 'seed sock milk update focus rotate barely fade car face mechanic mercy';
  const password = 'passw0rd';

  async function createExtension (): Promise<Extension> {
    await cryptoWaitReady();

    keyring.loadAll({ store: new AccountsStore() });

    stubChromeStorage();
    state = new State();
    tabs = new Tabs(state);

    return new Extension(state);
  }

  const createAccount = async (type?: KeypairType): Promise<string> => {
    await extension.handle('id', 'pri(accounts.create.suri)', type && type === 'ethereum'
      ? {
        name: 'parent',
        password,
        suri,
        type
      }
      : {
        name: 'parent',
        password,
        suri
      }, () => undefined, () => portMock, () => portMock);
    const { address } = await new Promise<any>((resolve) => extension.handle('id', 'pri(seed.validate)', type && type === 'ethereum'
      ? {
        suri,
        type
      }
      : {
        suri
      }, resolve, () => portMock, () => portMock));

    return address;
  };

  beforeAll(async () => {
    // The "sinon-chrome" mocking library does not provide stubs for ".action", so we have to append them ourselves
    global.chrome = {
      ...chrome,
      // @ts-ignore
      action: {
        setBadgeText: jest.fn(() => Promise.resolve())
      }
    };

    extension = await createExtension();
  });

  test('exports account from keyring', async () => {
    const { pair: { address } } = keyring.addUri(suri, password);
    const result = await new Promise<any>((resolve) => extension.handle('id', 'pri(accounts.export)', {
      address,
      password
    }, resolve, () => portMock, () => portMock));

    expect(result.exportedJson.address).toBe(address);
    expect(result.exportedJson.encoded).toBeDefined();
  });

  describe('account derivation', () => {
    let address: string;

    beforeEach(async () => {
      address = await createAccount();
    });

    test('pri(derivation.validate) passes for valid suri', async () => {
      const result = await new Promise((resolve) => extension.handle('id', 'pri(derivation.validate)', {
        parentAddress: address,
        parentPassword: password,
        suri: '//path'
      }, resolve, () => portMock, () => portMock));

      expect(result).toStrictEqual({
        address: '5FP3TT3EruYBNh8YM8yoxsreMx7uZv1J1zNX7fFhoC5enwmN',
        suri: '//path'
      });
    });

    test('pri(derivation.validate) throws for invalid suri', async () => {
      await expect(extension.handle('id', 'pri(derivation.validate)', {
        parentAddress: address,
        parentPassword: password,
        suri: 'invalid-path'
      }, () => undefined, () => portMock, () => portMock)).rejects.toStrictEqual(new Error('"invalid-path" is not a valid derivation path'));
    });

    test('pri(derivation.validate) throws for invalid password', async () => {
      await expect(extension.handle('id', 'pri(derivation.validate)', {
        parentAddress: address,
        parentPassword: 'invalid-password',
        suri: '//path'
      }, () => undefined, () => portMock, () => portMock)).rejects.toStrictEqual(new Error('invalid password'));
    });

    test('pri(derivation.create) adds a derived account', async () => {
      await extension.handle('id', 'pri(derivation.create)', {
        name: 'child',
        parentAddress: address,
        parentPassword: password,
        password,
        suri: '//path'
      }, () => undefined, () => portMock, () => portMock);
      expect(keyring.getAccounts()).toHaveLength(2);
    });

    test('pri(derivation.create) saves parent address in meta', async () => {
      await extension.handle('id', 'pri(derivation.create)', {
        name: 'child',
        parentAddress: address,
        parentPassword: password,
        password,
        suri: '//path'
      }, () => undefined, () => portMock, () => portMock);
      expect(keyring.getAccount('5FP3TT3EruYBNh8YM8yoxsreMx7uZv1J1zNX7fFhoC5enwmN')?.meta.parentAddress).toEqual(address);
    });
  });

  describe('account management', () => {
    let address: string;

    beforeEach(async () => {
      address = await createAccount();
    });

    test('pri(accounts.changePassword) changes account password', async () => {
      const newPass = 'pa55word';
      const wrongPass = 'ZZzzZZzz';

      await expect(extension.handle('id', 'pri(accounts.changePassword)', {
        address,
        newPass,
        oldPass: wrongPass
      }, () => undefined, () => portMock, () => portMock)).rejects.toStrictEqual(new Error('oldPass is invalid'));

      await expect(new Promise((resolve) => extension.handle('id', 'pri(accounts.changePassword)', {
        address,
        newPass,
        oldPass: password
      }, resolve, () => portMock, () => portMock))).resolves.toEqual(true);

      const pair = keyring.getPair(address);

      expect(pair.decodePkcs8(newPass)).toEqual(undefined);

      expect(() => {
        pair.decodePkcs8(password);
      }).toThrowError('Unable to decode using the supplied passphrase');
    });
  });

  describe('custom user extension', () => {
    let address: string, payload: SignerPayloadJSONWithType, pair: KeyringPair;

    beforeEach(async () => {
      address = await createAccount();
      pair = keyring.getPair(address);
      pair.decodePkcs8(password);
      payload = {
        signType: 'extrinsic',
        address,
        blockHash: '0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80',
        blockNumber: '0x00000393',
        era: '0x3601',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        method: '0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100',
        nonce: '0x0000000000000000',
        signedExtensions: ['CheckSpecVersion', 'CheckTxVersion', 'CheckGenesis', 'CheckMortality', 'CheckNonce', 'CheckWeight', 'ChargeTransactionPayment'],
        specVersion: '0x00000026',
        tip: '0x00000000000000000000000000000000',
        transactionVersion: '0x00000005',
        version: 4
      };
    });

    test('signs with default signed extensions', async () => {
      let generatedRequest: any;

      chromeStub.storage.local.set.callsFake(({ signRequests }) => {
        generatedRequest = signRequests?.[0];

        if (generatedRequest) {
          stubChromeStorage({
            signRequests: [generatedRequest]
          });
        }
      });

      const registry = new TypeRegistry();

      registry.setSignedExtensions(payload.signedExtensions);

      await tabs.handle('1615191860871.5', 'pub(extrinsic.sign)', payload, () => undefined, 'http://localhost:3000', () => portMock);

      // Waiting for the "state.allSignRequests" variable to get populated in the previous promise, we cannot await yet
      await new Promise((resolve) => setTimeout(resolve));
      await expect(extension.handle('1615192072290.7', 'pri(signing.approve.password)', {
        id: generatedRequest.id,
        password,
        savePass: false
      }, () => undefined, () => portMock, () => ({ postMessage: () => undefined } as unknown as chrome.runtime.Port))).resolves.toEqual(undefined);
    });

    test('signs with default signed extensions - ethereum', async () => {
      let generatedRequest: any;

      chromeStub.storage.local.set.callsFake(({ signRequests }) => {
        generatedRequest = signRequests?.[0];

        if (generatedRequest) {
          stubChromeStorage({
            signRequests: [generatedRequest]
          });
        }
      });

      const ethAddress = await createAccount('ethereum');
      const ethPair = keyring.getPair(ethAddress);

      ethPair.decodePkcs8(password);
      const ethPayload: SignerPayloadJSONWithType = {
        signType: 'extrinsic',
        address: ethAddress,
        blockHash: '0xf9fc354edc3ff49f43d5e2c14e3c609a0c4ba469ed091edf893d672993dc9bc0',
        blockNumber: '0x00000393',
        era: '0x3601',
        genesisHash: '0xf9fc354edc3ff49f43d5e2c14e3c609a0c4ba469ed091edf893d672993dc9bc0',
        method: '0x03003cd0a705a2dc65e5b1e1205896baa2be8a07c6e0070010a5d4e8',
        nonce: '0x00000000',
        signedExtensions: [
          'CheckSpecVersion',
          'CheckTxVersion',
          'CheckGenesis',
          'CheckMortality',
          'CheckNonce',
          'CheckWeight',
          'ChargeTransactionPayment'
        ],
        specVersion: '0x000003e9',
        tip: '0x00000000000000000000000000000000',
        transactionVersion: '0x00000002',
        version: 4
      };
      const registry = new TypeRegistry();

      registry.setSignedExtensions(payload.signedExtensions);

      await tabs.handle('1615191860871.5', 'pub(extrinsic.sign)', ethPayload, () => undefined, 'http://localhost:3000', () => portMock);

      // Waiting for the "state.allSignRequests" variable to get populated in the previous promise, we cannot await yet
      await new Promise((resolve) => setTimeout(resolve));

      await expect(extension.handle('1615192072290.7', 'pri(signing.approve.password)', {
        id: generatedRequest.id,
        password,
        savePass: false
      }, () => undefined, () => portMock, () => ({ postMessage: () => undefined } as unknown as chrome.runtime.Port))).resolves.toEqual(undefined);
    });

    test('signs with user extensions, known types', async () => {
      let generatedRequest: any;

      chromeStub.storage.local.set.callsFake(({ signRequests }) => {
        generatedRequest = signRequests?.[0];

        if (generatedRequest) {
          stubChromeStorage({
            signRequests: [generatedRequest]
          });
        }
      });

      const types = {} as unknown as Record<string, string>;

      const userExtensions = {
        MyUserExtension: {
          extrinsic: {
            assetId: 'AssetId'
          },
          payload: {}
        }
      } as unknown as ExtDef;

      const meta: MetadataDef = {
        chain: 'Development',
        color: '#191a2e',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        icon: '',
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: '',
        types,
        userExtensions
      };

      stubChromeStorage({
        authUrls,
        chainMetadata: {
          [meta.genesisHash]: meta
        }
      });

      const payload: SignerPayloadJSONWithType = {
        signType: 'extrinsic',
        address,
        blockHash: '0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80',
        blockNumber: '0x00000393',
        era: '0x3601',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        method: '0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100',
        nonce: '0x0000000000000000',
        signedExtensions: ['MyUserExtension'],
        specVersion: '0x00000026',
        tip: '0x00000000000000000000000000000000',
        transactionVersion: '0x00000005',
        version: 4
      };

      const registry = new TypeRegistry();

      registry.setSignedExtensions(payload.signedExtensions, userExtensions);
      registry.register(types);

      await tabs.handle('1615191860771.5', 'pub(extrinsic.sign)', payload, () => undefined, 'http://localhost:3000', () => portMock);

      // Waiting for the "state.allSignRequests" variable to get populated in the previous promise, we cannot await yet
      await new Promise((resolve) => setTimeout(resolve));

      await expect(extension.handle('1615192062290.7', 'pri(signing.approve.password)', {
        id: generatedRequest.id,
        password,
        savePass: false
      }, () => undefined, () => portMock, () => ({ postMessage: () => undefined } as unknown as chrome.runtime.Port))).resolves.toEqual(undefined);
    });

    test('override default signed extension', async () => {
      let generatedRequest: any;

      chromeStub.storage.local.set.callsFake(({ signRequests }) => {
        generatedRequest = signRequests?.[0];

        if (generatedRequest) {
          stubChromeStorage({
            signRequests: [generatedRequest]
          });
        }
      });

      const types = {
        FeeExchangeV1: {
          assetId: 'Compact<AssetId>',
          maxPayment: 'Compact<Balance>'
        },
        PaymentOptions: {
          feeExchange: 'FeeExchangeV1',
          tip: 'Compact<Balance>'
        }
      } as unknown as Record<string, string>;

      const userExtensions = {
        ChargeTransactionPayment: {
          extrinsic: {
            transactionPayment: 'PaymentOptions'
          },
          payload: {}
        }
      } as unknown as ExtDef;

      const meta: MetadataDef = {
        chain: 'Development',
        color: '#191a2e',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        icon: '',
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: '',
        types,
        userExtensions
      };

      stubChromeStorage({
        chainMetadata: {
          [meta.genesisHash]: meta
        }
      });

      const registry = new TypeRegistry();

      registry.setSignedExtensions(payload.signedExtensions, userExtensions);
      registry.register(types);

      await tabs.handle('1615191860771.5', 'pub(extrinsic.sign)', payload, () => undefined, 'http://localhost:3000', () => portMock);

      // Waiting for the "state.allSignRequests" variable to get populated in the previous promise, we cannot await yet
      await new Promise((resolve) => setTimeout(resolve));

      await expect(extension.handle('1615192062290.7', 'pri(signing.approve.password)', {
        id: generatedRequest.id,
        password,
        savePass: false
      }, () => undefined, () => portMock, () => ({ postMessage: () => undefined } as unknown as chrome.runtime.Port))).resolves.toEqual(undefined);
    });

    test('signs with user extensions, additional types', async () => {
      let generatedRequest: any;

      chromeStub.storage.local.set.callsFake(({ signRequests }) => {
        generatedRequest = signRequests?.[0];

        if (generatedRequest) {
          stubChromeStorage({
            signRequests: [generatedRequest]
          });
        }
      });

      const types = {
        myCustomType: {
          feeExchange: 'Compact<AssetId>',
          tip: 'Compact<Balance>'
        }
      } as unknown as Record<string, string>;

      const userExtensions = {
        MyUserExtension: {
          extrinsic: {
            myCustomType: 'myCustomType'
          },
          payload: {}
        }
      } as unknown as ExtDef;

      const meta: MetadataDef = {
        chain: 'Development',
        color: '#191a2e',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        icon: '',
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: '',
        types,
        userExtensions
      };

      stubChromeStorage({
        chainMetadata: {
          [meta.genesisHash]: meta
        }
      });

      const payload = {
        signType: 'extrinsic',
        address,
        blockHash: '0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80',
        blockNumber: '0x00000393',
        era: '0x3601',
        genesisHash: '0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62',
        method: '0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100',
        nonce: '0x0000000000000000',
        signedExtensions: ['MyUserExtension', 'CheckTxVersion', 'CheckGenesis', 'CheckMortality', 'CheckNonce', 'CheckWeight', 'ChargeTransactionPayment'],
        specVersion: '0x00000026',
        tip: '0x00000000000000000000000000000000',
        transactionVersion: '0x00000005',
        version: 4
      } as unknown as SignerPayloadJSONWithType;

      const registry = new TypeRegistry();

      registry.setSignedExtensions(payload.signedExtensions, userExtensions);
      registry.register(types);

      await tabs.handle('1615191860771.5', 'pub(extrinsic.sign)', payload, () => undefined, 'http://localhost:3000', () => portMock);

      // Waiting for the "state.allSignRequests" variable to get populated in the previous promise (we cannot await yet)
      await new Promise((resolve) => setTimeout(resolve));

      await expect(extension.handle('1615192062290.7', 'pri(signing.approve.password)', {
        id: generatedRequest.id,
        password,
        savePass: false
      }, () => undefined, () => portMock, () => ({ postMessage: () => undefined } as unknown as chrome.runtime.Port))).resolves.toEqual(undefined);
    });
  });
});
