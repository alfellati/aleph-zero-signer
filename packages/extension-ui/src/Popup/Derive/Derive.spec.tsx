// Copyright 2019-2023 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/extension-mocks/chrome';

import type { AccountJson, ResponseDeriveValidate } from '@polkadot/extension-base/background/types';

import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { configure, mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router';
import { ThemeProvider } from 'styled-components';

import { AccountContext, ActionContext, InputLock, themes } from '../../components';
import * as messaging from '../../messaging';
import { flushAllPromises } from '../../testHelpers';
import { buildHierarchy } from '../../util/buildHierarchy';
import AddressDropdown from './AddressDropdown';
import Derive from '.';

// For this file, there are a lot of them
/* eslint-disable @typescript-eslint/no-unsafe-argument */

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
configure({ adapter: new Adapter() });

const parentPassword = 'pass123';
const westendGenesis = '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e';
const defaultDerivation = '//0';
const derivedAddress = '5GYQRJj3NUznYDzCduENRcocMsyxmb6tjb5xW87ZMErBe9R7';

const accounts = [
  { address: '5FjgD3Ns2UpnHJPVeRViMhCttuemaRXEqaD8V5z4vxcsUByA', name: 'A', type: 'sr25519' },
  {
    address: '5GYmFzQCuC5u3tQNiMZNbFGakrz3Jq31NmMg4D2QAkSoQ2g5',
    genesisHash: westendGenesis,
    name: 'B',
    type: 'sr25519'
  },
  {
    address: '5D2TPhGEy2FhznvzaNYW9AkuMBbg3cyRemnPsBvBY4ZhkZXA',
    name: 'BB',
    parentAddress: '5GYmFzQCuC5u3tQNiMZNbFGakrz3Jq31NmMg4D2QAkSoQ2g5',
    type: 'sr25519'
  },
  { address: '5GhGENSJBWQZ8d8mARKgqEkiAxiW3hHeznQDW2iG4XzNieb6', isExternal: true, name: 'C', type: 'sr25519' },
  { address: '0xd5D81CD4236a43F48A983fc5B895975c511f634D', name: 'Ethereum', type: 'ethereum' },
  { address: '5EeaoDj4VDk8V6yQngKBaCD5MpJUCHrhYjVhBjgMHXoYon1s', isExternal: false, name: 'D', type: 'ed25519' },
  {
    address: '5HRKYp5anSNGtqC7cq9ftiaq4y8Mk7uHk7keaXUrQwZqDWLJ',
    name: 'DD',
    parentAddress: '5EeaoDj4VDk8V6yQngKBaCD5MpJUCHrhYjVhBjgMHXoYon1s',
    type: 'ed25519'
  }
] as AccountJson[];

describe('Derive', () => {
  const mountComponent = async (
    locked = false,
    account = 1
  ): Promise<{
    wrapper: ReactWrapper;
    onActionStub: jest.Mock;
  }> => {
    const onActionStub = jest.fn();

    const wrapper = mount(
      <MemoryRouter initialEntries={[`/account/derive/${accounts[account].address}`]}>
        <ActionContext.Provider value={onActionStub}>
          <AccountContext.Provider
            value={{
              accounts,
              hierarchy: buildHierarchy(accounts)
            }}
          >
            <ThemeProvider theme={themes.dark}>
              <Route path='/account/derive/:address'>
                <Derive isLocked={locked} />
              </Route>
            </ThemeProvider>
          </AccountContext.Provider>
        </ActionContext.Provider>
      </MemoryRouter>
    );

    await act(flushAllPromises);

    return { onActionStub, wrapper };
  };

  let wrapper: ReactWrapper;
  let onActionStub: jest.Mock;

  const type = async (input: ReactWrapper, value: string): Promise<void> => {
    input.simulate('change', { target: { value } });
    await act(flushAllPromises);
    input.update();
  };

  const enterName = (name: string): Promise<void> => type(wrapper.find('input').first(), name);
  const password = (password: string) => (): Promise<void> =>
    type(wrapper.find('input[type="password"]').first(), password);
  const repeat = (password: string) => (): Promise<void> =>
    type(wrapper.find('input[type="password"]').last(), password);

  describe('Parent selection screen', () => {
    beforeEach(async () => {
      const mountedComponent = await mountComponent();

      wrapper = mountedComponent.wrapper;
      onActionStub = mountedComponent.onActionStub;
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    jest.spyOn(messaging, 'validateAccount').mockImplementation(async (_, pass: string) => pass === parentPassword);
    // silencing the following expected console.error
    console.error = jest.fn();
    // eslint-disable-next-line @typescript-eslint/require-await
    jest.spyOn(messaging, 'validateDerivationPath').mockImplementation(async (_, path) => {
      if (path === '//') {
        throw new Error('wrong suri');
      }

      return { address: derivedAddress, suri: defaultDerivation } as ResponseDeriveValidate;
    });

    it('has form with submit button', () => {
      const submitButton = wrapper.find('button[type="submit"]');
      const form = wrapper.find('form');

      expect(form.props().id).toBeTruthy();
      expect(submitButton.props().form).toBe(form.props().id);
    });

    it('Password field is visible and not in error state', () => {
      const passwordField = wrapper.find('[data-input-password]').first();

      expect(passwordField.exists()).toBe(true);
    });

    it('No error is visible when first loading the page', () => {
      expect(wrapper.find('Warning')).toHaveLength(0);
    });

    it('The error disappears when typing a new password and "Create derived account" is enabled', async () => {
      await type(wrapper.find('input[type="password"]'), 'wrong_pass');
      wrapper.find('form').simulate('submit');
      await act(flushAllPromises);
      wrapper.update();

      expect(wrapper.find({ children: 'Wrong password.' }).length).toBeGreaterThan(0);

      await type(wrapper.find('input[type="password"]'), 'new_attempt');

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(false);
      expect(
        wrapper.findWhere((node) => node.prop('messageType') === 'critical' && node.prop('in') === true)
      ).toHaveLength(0);
    });

    it('Button is enabled when password is set', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(false);
      expect(
        wrapper.findWhere((node) => node.prop('messageType') === 'critical' && node.prop('in') === true)
      ).toHaveLength(0);
    });

    it('Derivation path gets visible, is set and locked', async () => {
      await type(wrapper.find('input[type="password"]'), 'wrong_pass');

      expect(wrapper.find('.pathInput.locked input').prop('disabled')).toBe(true);
      expect(wrapper.find('.pathInput.locked input').prop('value')).toBe('//1');
    });

    it('Derivation path can be unlocked', async () => {
      await type(wrapper.find('input[type="password"]'), 'wrong_pass');
      wrapper.find(InputLock).simulate('click');
      await act(flushAllPromises);
      wrapper.update();

      expect(wrapper.find('.pathInput').exists()).toBe(true);
      expect(wrapper.find('.pathInput input').prop('disabled')).toBe(false);
    });

    it('Derivation path placeholder contains //hard/soft', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);
      const pathInput = wrapper.find('[data-input-suri] input');

      expect(pathInput.first().prop('placeholder')).toEqual('//hard/soft');
    });

    it('An error is visible and the button is disabled when suri is incorrect', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);
      await type(wrapper.find('[data-input-suri] input'), '//');
      wrapper.find('form').simulate('submit');
      await act(flushAllPromises);
      wrapper.update();

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(true);
      expect(wrapper.find({ children: 'Invalid derivation path.' }).length).toBeGreaterThan(0);
    });

    it('An error is visible and the button is disabled when suri contains `///`', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);
      await type(wrapper.find('[data-input-suri] input'), '///');

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(true);
      expect(wrapper.find({ children: '`///password` not supported for derivation.' }).length).toBeGreaterThan(0);
    });

    it('No error is shown when suri contains soft derivation `/` with sr25519', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);
      await type(wrapper.find('[data-input-suri] input'), '//somehard/soft');

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(false);
      expect(
        wrapper.findWhere((node) => node.prop('messageType') === 'critical' && node.prop('in') === true)
      ).toHaveLength(0);
    });

    it('The error disappears and "Create derived account" is enabled when typing a new suri', async () => {
      await type(wrapper.find('input[type="password"]'), parentPassword);
      await type(wrapper.find('[data-input-suri] input'), '//');
      wrapper.find('form').simulate('submit');
      await act(flushAllPromises);
      wrapper.update();

      expect(wrapper.find({ children: 'Invalid derivation path.' }).length).toBeGreaterThan(0);

      await type(wrapper.find('[data-input-suri] input'), 'new');

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(false);
      expect(wrapper.find('Warning')).toHaveLength(0);
    });

    it('takes selected address from URL as parent account', () => {
      expect(wrapper.find('[data-field="name"]').first().text()).toBe('B');
    });

    it('selects internal root accounts as other options, no external and no Ethereum account', () => {
      const options = wrapper.find('[data-parent-option] [data-field="name"]').map((el) => el.text());

      expect(options).toEqual(['A', 'B', 'D', 'Ethereum']);
    });

    it('redirects to derive from next account when other option is selected', () => {
      wrapper.find('[data-parent-option]').first().simulate('click');

      expect(onActionStub).toBeCalledWith(`/account/derive/${accounts[0].address}`);
    });
  });

  describe('Locked parent selection', () => {
    beforeAll(async () => {
      const mountedComponent = await mountComponent(true);

      wrapper = mountedComponent.wrapper;
      onActionStub = mountedComponent.onActionStub;
    });

    it('address dropdown does not exist', () => {
      expect(wrapper.exists(AddressDropdown)).toBe(false);
    });

    it('parent is taken from URL', () => {
      expect(wrapper.find('[data-field="name"]').first().text()).toBe('B');
    });

    describe('Second phase', () => {
      it('correctly creates the derived account', async () => {
        const newAccount = {
          name: 'newName',
          password: 'Alice has a cat'
        };
        const deriveMock = jest.spyOn(messaging, 'deriveAccount');

        await type(wrapper.find('input[type="password"]'), parentPassword);
        wrapper.find('form').simulate('submit');
        await act(flushAllPromises);
        wrapper.update();
        await enterName(newAccount.name).then(password(newAccount.password)).then(repeat(newAccount.password));
        wrapper.find('form').simulate('submit');
        await act(flushAllPromises);
        wrapper.update();

        expect(deriveMock).toBeCalledWith(
          accounts[1].address,
          defaultDerivation,
          parentPassword,
          newAccount.name,
          newAccount.password,
          westendGenesis
        );
        expect(onActionStub).toBeCalledWith('/');
      });
    });
  });

  describe('Ed25519 Parent', () => {
    beforeEach(async () => {
      const mountedComponent = await mountComponent(false, 5);

      wrapper = mountedComponent.wrapper;
      onActionStub = mountedComponent.onActionStub;
      await type(wrapper.find('input[type="password"]'), parentPassword);
    });

    it('Derivation path placeholder only contains //hard', () => {
      const pathInput = wrapper.find('[data-input-suri] input');

      expect(pathInput.first().prop('placeholder')).toEqual('//hard');
    });

    it('An error is shown when suri contains soft derivation `/` with ed25519', async () => {
      const pathInput = wrapper.find('[data-input-suri] input');

      await type(pathInput, '//somehard/soft');

      const button = wrapper.find('button[type="submit"]');

      expect(button.prop('disabled')).toBe(true);
      expect(wrapper.find('[data-input-suri]').first().prop('isError')).toBe(true);
      expect(
        wrapper.find({ children: 'Soft derivation is only allowed for sr25519 accounts.' }).length
      ).toBeGreaterThan(0);
    });
  });
});
