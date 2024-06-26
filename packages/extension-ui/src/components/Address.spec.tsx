// Copyright 2019-2023 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/extension-mocks/chrome';

import type { ReactWrapper } from 'enzyme';
import type { AccountJson } from '@polkadot/extension-base/background/types';
import type { IconTheme } from '@polkadot/react-identicon/types';
import type { Props as AddressComponentProps } from './Address';

import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { configure, mount } from 'enzyme';
import React, { ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import { BrowserRouter as Router } from 'react-router-dom';

import * as MetadataCache from '../MetadataCache';
import { westendMetadata } from '../Popup/Signing/metadataMock';
import { flushAllPromises } from '../testHelpers';
import { buildHierarchy } from '../util/buildHierarchy';
import { DEFAULT_TYPE } from '../util/defaultType';
import { ellipsisName } from '../util/ellipsisName';
import getParentNameSuri from '../util/getParentNameSuri';
import { Theme, themes } from './themes';
import { AccountContext, ActionContext, Address } from '.';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
configure({ adapter: new Adapter() });

interface AccountTestJson extends AccountJson {
  expectedIconTheme: IconTheme;
  theme: Theme;
}

interface ExtendedAccount extends AccountJson {
  theme: Theme;
}
interface AccountTestGenesisJson extends AccountTestJson {
  expectedEncodedAddress: string;
  expectedNetworkLabel: string;
  genesisHash: string;
}

const externalAccount = {
  address: '5EeaoDj4VDk8V6yQngKBaCD5MpJUCHrhYjVhBjgMHXoYon1s',
  expectedIconTheme: 'polkadot',
  isExternal: true,
  name: 'External Account',
  theme: themes.dark,
  type: 'sr25519'
} as ExtendedAccount;
const hardwareAccount = {
  address: 'HDE6uFdw53SwUyfKSsjwZNmS2sziWMPuY6uJhGHcFzLYRaJ',
  expectedIconTheme: 'polkadot',
  // Kusama genesis hash
  genesisHash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  isExternal: true,
  isHardware: true,
  name: 'Hardware Account',
  theme: themes.dark,
  type: 'sr25519'
} as ExtendedAccount;

const accounts = [
  {
    address: '5HSDXAC3qEMkSzZK377sTD1zJhjaPiX5tNWppHx2RQMYkjaJ',
    expectedIconTheme: 'polkadot',
    name: 'ECDSA Account',
    theme: themes.dark,
    type: 'ecdsa'
  },
  {
    address: '5FjgD3Ns2UpnHJPVeRViMhCttuemaRXEqaD8V5z4vxcsUByA',
    expectedIconTheme: 'polkadot',
    name: 'Ed Account',
    theme: themes.dark,
    type: 'ed25519'
  },
  {
    address: '5Ggap6soAPaP5UeNaiJsgqQwdVhhNnm6ez7Ba1w9jJ62LM2Q',
    expectedIconTheme: 'polkadot',
    name: 'Parent Sr Account',
    theme: themes.dark,
    type: 'sr25519'
  },
  {
    address: '0xd5D81CD4236a43F48A983fc5B895975c511f634D',
    expectedIconTheme: 'ethereum',
    name: 'Ethereum',
    theme: themes.dark,
    type: 'ethereum'
  },
  { ...externalAccount },
  { ...hardwareAccount }
] as AccountTestJson[];

// With Westend genesis Hash
// This account isn't part of the generic test because Westend isn't a built in network
// The network would only be displayed if the corresponding metadata are known
const westEndAccount = {
  address: 'Cs2LLqQ6DSRx8UPdVp6jny4DvwNqziBSowSu5Nb1u3R6Z7X',
  expectedEncodedAddress: '5CMQg2VXTrRWCUewro13qqc45Lf93KtzzS6hWR6dY6pvMZNF',
  expectedIconTheme: 'polkadot',
  expectedNetworkLabel: 'Westend',
  genesisHash: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  name: 'acc',
  type: 'ed25519'
} as AccountTestGenesisJson;

const accountsWithGenesisHash = [
  // with Polkadot genesis Hash
  {
    address: '5Ggap6soAPaP5UeNaiJsgqQwdVhhNnm6ez7Ba1w9jJ62LM2Q',
    expectedEncodedAddress: '15csxS8s2AqrX1etYMMspzF6V7hM56KEjUqfjJvWHP7YWkoF',
    expectedIconTheme: 'polkadot',
    expectedNetworkLabel: 'Polkadot',
    genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: 'sr25519'
  },
  // with Kusama genesis Hash
  {
    address: '5DoYawpxt6aBy1pKAt1beLMrakqtbWMtG3NF6jwRR8uKJGqD',
    expectedEncodedAddress: 'EKAFGAqWTb7ifdkwapeYHirjM88QBB4iRCzVQDNtw7p3bgF',
    expectedIconTheme: 'polkadot',
    expectedNetworkLabel: 'Kusama',
    genesisHash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    type: 'sr25519'
  },
  // with Edgeware genesis Hash
  {
    address: '5GYQRJj3NUznYDzCduENRcocMsyxmb6tjb5xW87ZMErBe9R7',
    expectedEncodedAddress: 'mzKNamvvJPM5ApxwGSYD5VjjtyfrB4g8fhMyCc29K37nuop',
    expectedIconTheme: 'substrate',
    expectedNetworkLabel: 'Edgeware',
    genesisHash: '0x742a2ca70c2fda6cee4f8df98d64c4c670a052d9568058982dad9d5a7a135c5b',
    type: 'sr25519'
  }
] as AccountTestGenesisJson[];

const mountComponent = async (
  addressComponentProps: AddressComponentProps,
  contextAccounts: AccountJson[],
  onActionMock: (to?: string) => Promise<void> = () => Promise.resolve()
): Promise<{
  wrapper: ReactWrapper;
}> => {
  const actionStub = jest.fn();
  const { actions = actionStub } = addressComponentProps;

  const wrapper = mount(
    <ActionContext.Provider value={onActionMock}>
      <Router>
        <AccountContext.Provider
          value={{
            accounts: contextAccounts,
            hierarchy: buildHierarchy(contextAccounts)
          }}
        >
          <Address
            actions={actions as ReactNode}
            {...addressComponentProps}
          />
        </AccountContext.Provider>
      </Router>
    </ActionContext.Provider>
  );

  await act(flushAllPromises);
  wrapper.update();

  return { wrapper };
};

const getWrapper = async (
  account: AccountJson & {
    theme: Theme;
  },
  contextAccounts: AccountJson[],
  withAccountsInContext: boolean,
  onActionMock?: (to: string | undefined) => Promise<void>
) => {
  // the address component can query info about the account from the account context
  // in this case, the account's address (any encoding) should suffice
  // In case the account is not in the context, then more info are needed as props
  // to display accurately
  const mountedComponent = withAccountsInContext
    ? await mountComponent(
        {
          address: account.address,
          theme: themes.dark
        },
        contextAccounts,
        onActionMock
      )
    : await mountComponent(account, [], onActionMock);

  return mountedComponent.wrapper;
};

const genericTestSuite = (account: AccountTestJson, withAccountsInContext = true) => {
  let wrapper: ReactWrapper;
  const { address, expectedIconTheme, name = '', type = DEFAULT_TYPE } = account;

  describe(`Account ${withAccountsInContext ? 'in context from address' : 'from props'} (${name}) - ${type}`, () => {
    beforeAll(async () => {
      wrapper = await getWrapper(account, accounts, withAccountsInContext);
    });

    it('shows the account address and name', () => {
      expect(wrapper.find('[data-field="address"]').text()).toEqual(ellipsisName(address));
      expect(wrapper.find('Name span').text()).toEqual(name);
    });

    it(`shows a ${expectedIconTheme} identicon`, () => {
      expect(wrapper.find('Identicon').first().prop('iconTheme')).toEqual(expectedIconTheme);
    });

    it('has settings button', () => {
      expect(wrapper.find('.settings')).toHaveLength(1);
    });

    it('has no account hidding and settings button if no action is provided', async () => {
      const additionalProps = { actions: null, theme: themes.dark };

      const mountedComponentWithoutAction = withAccountsInContext
        ? await mountComponent({ address, ...additionalProps }, accounts)
        : await mountComponent({ ...account, ...additionalProps }, []);

      wrapper = mountedComponentWithoutAction.wrapper;

      expect(wrapper.find('.settings')).toHaveLength(0);
    });
  });
};

const genesisHashTestSuite = (account: AccountTestGenesisJson, withAccountsInContext = true) => {
  const { expectedEncodedAddress, expectedIconTheme, expectedNetworkLabel } = account;

  describe(`Account ${
    withAccountsInContext ? 'in context from address' : 'from props'
  } with ${expectedNetworkLabel} genesiHash`, () => {
    let wrapper: ReactWrapper;
    const onActionMock: jest.Mock = jest.fn();

    beforeAll(async () => {
      onActionMock.mockClear();
      wrapper = await getWrapper(account, accountsWithGenesisHash, withAccountsInContext, onActionMock);
    });

    it('shows the account address correctly encoded', () => {
      expect(wrapper.find('[data-field="address"]').text()).toEqual(ellipsisName(expectedEncodedAddress));
    });

    it(`shows a ${expectedIconTheme} identicon`, () => {
      expect(wrapper.find('Identicon').first().prop('iconTheme')).toEqual(expectedIconTheme);
    });

    it.only('Copy address to clipboard on click and do not go to account menu', () => {
      // eslint-disable-next-line deprecation/deprecation
      (document.execCommand as jest.Mock).mockClear();

      wrapper.find('.fullAddress').simulate('click');
      expect(onActionMock).not.toHaveBeenCalled();
      // eslint-disable-next-line deprecation/deprecation
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('Network label shows the correct network', () => {
      expect(wrapper.find('[data-field="chain"]').text()).toEqual(expectedNetworkLabel);
    });
  });
};

describe('Address', () => {
  accounts.forEach((account) => {
    genericTestSuite(account);
    genericTestSuite(account, false);
  });

  accountsWithGenesisHash.forEach((account) => {
    genesisHashTestSuite(account);
    genesisHashTestSuite(account, false);
  });

  describe('External account', () => {
    let wrapper: ReactWrapper;

    beforeAll(async () => {
      wrapper = await getWrapper(externalAccount, [], false);
    });

    it('has an icon in front of its name', () => {
      expect(wrapper.find('Name').find('FontAwesomeIcon [data-icon="qrcode"]').exists()).toBe(true);
    });
  });

  describe('Hardware wallet account', () => {
    let wrapper: ReactWrapper;

    beforeAll(async () => {
      wrapper = await getWrapper(hardwareAccount, [], false);
    });

    it('has a usb icon in front of its name', () => {
      expect(wrapper.find('Name').find('FontAwesomeIcon [data-icon="usb"]').exists()).toBe(true);
    });
  });

  describe('Encoding and label based on Metadata', () => {
    let wrapper: ReactWrapper;

    beforeAll(async () => {
      jest.spyOn(MetadataCache, 'getSavedMeta').mockResolvedValue(westendMetadata);

      wrapper = await getWrapper(westEndAccount, [], false);
    });

    it('shows westend label with the correct color', () => {
      const bannerChain = wrapper.find('[data-field="chain"]');

      expect(bannerChain.text()).toEqual(westendMetadata.chain);
      expect(bannerChain.prop('style')?.backgroundColor).toEqual(westendMetadata.color);
    });

    it('shows the account correctly reencoded', () => {
      expect(wrapper.find('[data-field="address"]').text()).toEqual(
        ellipsisName(westEndAccount.expectedEncodedAddress)
      );
    });
  });

  describe('Derived accounts', () => {
    let wrapper: ReactWrapper;
    const childAccount = {
      address: '5Ggap6soAPaP5UeNaiJsgqQwdVhhNnm6ez7Ba1w9jJ62LM2Q',
      addressEllipsis: ellipsisName('5Ggap6soAPaP5UeNaiJsgqQwdVhhNnm6ez7Ba1w9jJ62LM2Q'),
      name: 'Luke',
      parentName: 'Dark Vador',
      suri: '//42',
      theme: themes.dark,
      type: 'sr25519'
    } as ExtendedAccount;

    beforeAll(async () => {
      wrapper = await getWrapper(childAccount, [], false);
    });

    it("shows the child's account address and name", () => {
      expect(wrapper.find('[data-field="address"]').text()).toEqual(ellipsisName(childAccount.address));
      expect(wrapper.find('Name span').text()).toEqual(childAccount.name);
    });

    it('shows the parent account and suri', () => {
      const expectedParentNameSuri = getParentNameSuri(childAccount.parentName as string, childAccount.suri);

      expect(wrapper.find('.parentName').text()).toEqual(expectedParentNameSuri);
    });
  });
});
