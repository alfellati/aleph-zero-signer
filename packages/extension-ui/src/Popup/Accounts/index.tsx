// Copyright 2019-2023 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ThemeProps } from '../../types';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AuthUrls } from '@polkadot/extension-base/background/handlers/State';
import { AccountJson, AccountWithChildren } from '@polkadot/extension-base/background/types';
import getNetworkMap from '@polkadot/extension-ui/util/getNetworkMap';

import {
  AccountContext,
  AddButton,
  Address,
  BottomWrapper,
  ButtonArea,
  ScrollWrapper,
  VerticalSpace
} from '../../components';
import { ActionContext } from '../../components/contexts';
import { ALEPH_ZERO_GENESIS_HASH } from '../../constants';
import useConnectedActiveTabUrl from '../../hooks/useConnectedActiveTabUrl';
import useTranslation from '../../hooks/useTranslation';
import { getAuthList } from '../../messaging';
import { Header } from '../../partials';
import { createGroupedAccountData } from '../../util/createGroupedAccountData';
import AccountsTree from './AccountsTree';
import AddAccount from './AddAccount';

interface Props extends ThemeProps {
  className?: string;
}

const StyledScrollWrapper = styled(ScrollWrapper)`
  ${BottomWrapper} {
    position: absolute;
    bottom: 0px;
    right: 0;
    left: 0;
  }

  .network-group:last-of-type {
    padding-bottom: 70px;
  }
`;

const StyledButtonArea = styled(ButtonArea)`
  padding-right: 0px;
`;

function Accounts({ className }: Props): React.ReactElement {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [filteredAccount, setFilteredAccount] = useState<AccountWithChildren[]>([]);
  const [authList, setAuthList] = useState<AuthUrls | null>(null);
  const connectedActiveTabUrl = useConnectedActiveTabUrl();
  const { hierarchy } = useContext(AccountContext);
  const onAction = useContext(ActionContext);
  const networkMap = useMemo(() => getNetworkMap(), []);
  const defaultNetwork = 'Aleph Zero';
  const { filterChildren, flattened, getParentName, groupedParents } = useMemo(
    () => createGroupedAccountData(filteredAccount),
    [filteredAccount]
  );
  const [accountsCreatedAfterLastAuth, setAccountsCreatedAfterLastAuth] = useState<AccountJson[] | []>([]);

  useEffect(() => {
    getAuthList()
      .then(({ list }) => setAuthList(list))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (!authList) {
      return;
    }

    if (connectedActiveTabUrl) {
      setAccountsCreatedAfterLastAuth(
        flattened.filter(
          (account) => account?.whenCreated && account?.whenCreated > authList[connectedActiveTabUrl]?.lastAuth
        )
      );
    }

    if (accountsCreatedAfterLastAuth.length > 0 && connectedActiveTabUrl) {
      onAction(`/url/new?url=${connectedActiveTabUrl}`);
    }
  }, [accountsCreatedAfterLastAuth.length, authList, connectedActiveTabUrl, flattened, onAction]);

  useEffect(() => {
    setFilteredAccount(
      filter
        ? hierarchy.filter(
            (account) =>
              account.name?.toLowerCase().includes(filter) ||
              (account.genesisHash && networkMap.get(account.genesisHash)?.toLowerCase().includes(filter))
          )
        : hierarchy
    );
  }, [filter, hierarchy, networkMap]);

  const _onFilter = useCallback((filter: string) => {
    setFilter(filter.toLowerCase());
  }, []);

  const areAllAleph = flattened.every((account) => account.genesisHash === ALEPH_ZERO_GENESIS_HASH);

  const accounts = Object.entries(groupedParents)
    .filter(([, details]) => details.length > 0)
    .map(([networkName, details]) => {
      return (
        <div
          className='network-group'
          key={networkName}
        >
          {!areAllAleph && <span className='network-heading'>{networkName}</span>}
          {details.map((json) => (
            <AccountsTree
              {...json}
              key={json.address}
              parentName={getParentName(json)}
            />
          ))}
          {filterChildren(networkName, defaultNetwork, details).map((json) => (
            <AccountsTree
              {...json}
              key={json.address}
              parentName={getParentName(json)}
            />
          ))}
        </div>
      );
    });

  return (
    <>
      {hierarchy.length === 0 ? (
        <AddAccount />
      ) : (
        <>
          <Header
            className='header'
            onFilter={_onFilter}
            text={t<string>('Accounts')}
            withConnectedAccounts
            withHelp
            withSettings
          />
          <StyledScrollWrapper>
            <div className={`${className || ''} ${areAllAleph ? 'all-aleph-main' : ''}`}>{accounts}</div>
            <StyledButtonArea>
              <AddButton />
            </StyledButtonArea>
          </StyledScrollWrapper>
          <VerticalSpace />
        </>
      )}
    </>
  );
}

export default styled(Accounts)(
  ({ theme }: Props) => `
  &.all-aleph-main {
    margin-top: 32px;
  }

  .network-heading {
    display: flex;
    align-items: center;
    font-family: ${theme.secondaryFontFamily};
    font-style: normal;
    font-weight: 300;
    font-size: 11px;
    line-height: 120%;
    text-align: right;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${theme.subTextColor};
    padding: 8px 0 8px 8px;
    margin: 24px 0 16px 0;
    border-bottom: 1px solid ${theme.boxBorderColor};
  }

  ${Address} {
    width: 100%;
  }
`
);
