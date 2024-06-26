// Copyright 2019-2023 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ThemeProps } from '../types';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import plusIcon from '../assets/add.svg';
import { AccountContext, Svg } from '../components';
import Checkbox from '../components/Checkbox';
import FaviconBox from '../components/FaviconBox';
import useTranslation from '../hooks/useTranslation';
import Account from '../Popup/Accounts/Account';
import AccountsTree from '../Popup/Accounts/AccountsTree';
import { createGroupedAccountData } from '../util/createGroupedAccountData';

interface Props extends ThemeProps {
  className?: string;
  url: string;
  showHidden?: boolean;
  withWarning?: boolean;
  onChange?: (value: boolean) => void;
}

const StyledCheckbox = styled(Checkbox)`
  display: flex;
  justify-content: flex-end;
  margin-right: 24px;
  margin-bottom: 16px;
`;

const StyledFaviconBox = styled(FaviconBox)`
  :hover {
    background: ${({ theme }: ThemeProps) => theme.inputBorderColor};
  }
`;

function AccountSelection({
  className,

  onChange,
  showHidden = false,
  url,
  withWarning = true
}: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { accounts, hierarchy, selectedAccounts = [], setSelectedAccounts } = useContext(AccountContext);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const allVisibleAccounts = useMemo(() => accounts.filter(({ isHidden }) => !isHidden), [accounts]);
  const noAccountSelected = useMemo(() => selectedAccounts.length === 0, [selectedAccounts.length]);
  const { flattened } = createGroupedAccountData(hierarchy);
  const allDisplayedAddresses = useMemo(
    () => (showHidden ? accounts.map(({ address }) => address) : allVisibleAccounts.map(({ address }) => address)),
    [accounts, allVisibleAccounts, showHidden]
  );
  const areAllAccountsSelected = useMemo(
    () => selectedAccounts.length === allDisplayedAddresses.length,
    [allDisplayedAddresses.length, selectedAccounts.length]
  );

  useEffect(() => {
    const nextIndeterminateState = !noAccountSelected && !areAllAccountsSelected;

    setIsIndeterminate(nextIndeterminateState);
  }, [areAllAccountsSelected, noAccountSelected]);

  const _onSelectAllToggle = useCallback(() => {
    if (onChange) {
      onChange(true);
    }

    if (areAllAccountsSelected) {
      setSelectedAccounts && setSelectedAccounts([]);

      return;
    }

    setSelectedAccounts && setSelectedAccounts(allDisplayedAddresses);
  }, [allDisplayedAddresses, areAllAccountsSelected, onChange, setSelectedAccounts]);

  return (
    <div className={className}>
      {withWarning && (
        <div className='withWarning'>
          <div className='heading'>{t<string>('Connect app')}</div>
          <StyledFaviconBox
            url={url}
            withoutProtocol
          />
          <div className='separator'>
            <div className='line'></div>
            <Svg
              className='plus-icon'
              src={plusIcon}
            />
            <div className='line'></div>
          </div>
          <div className='subtitle'>
            {t<string>(
              'Choose accounts to use with this app. It will access addresses, balances, activities and request transactions to sign.'
            )}
          </div>
        </div>
      )}
      {flattened.length > 1 && (
        <StyledCheckbox
          checked={areAllAccountsSelected}
          className='accountTree-checkbox'
          indeterminate={isIndeterminate}
          label={t('Select all')}
          onChange={_onSelectAllToggle}
        />
      )}
      <div className={`accountList ${flattened.length > 1 ? '' : 'select-all-margin'}`}>
        {hierarchy.map(
          (json, index): React.ReactNode => (
            <AccountsTree
              {...json}
              checkBoxOnChange={onChange}
              isAuthList
              key={`${index}:${json.address}`}
              showHidden={showHidden}
              withCheckbox={true}
              withMenu={false}
            />
          )
        )}
      </div>
    </div>
  );
}

export default styled(AccountSelection)(
  ({ theme }: Props) => `

  .select-all-margin {
    margin-top: 22px;
  }

  ${Checkbox}:not(.accountTree-checkbox) label span {
    left: -10px;
  }

  .accountList {
    height: 180px;
    scrollbar-color: ${theme.boxBorderColor};
    scrollbar-width: 2px;
  
    ::-webkit-scrollbar-thumb {
      background:${theme.boxBorderColor};
      border-radius: 50px;  
      width: 2px;  
      border-right: 2px solid #111B24;
    }
  
    ::-webkit-scrollbar {
      width: 4px;
    }
    ${Account} {
      ${Checkbox} {
        margin-left: 8px;
        margin-right: 16px;
      }
    }
  }

  .tab-name,
  .tab-url {
    color: ${theme.textColor};
    display: inline-block;
    max-height: 10rem;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: top;
    cursor: pointer;
    text-decoration: underline;
    white-space: nowrap;
  }

  .heading {
    font-family: ${theme.secondaryFontFamily};
    font-style: normal;
    font-weight: 700;
    font-size: 24px;
    line-height: 118%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    letter-spacing: 0.03em;
    color: ${theme.textColor};
    margin: 24px 0px 8px 0px;
    text-align: center;
    white-space: pre-line;
  }

  .separator {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .line {
    height: 1px;
    background: ${theme.boxBorderColor};
    width: 120px;
  }

  .plus-icon {
    width: 32px;
    height: 32px;
    background: ${theme.subTextColor};
  }

  .subtitle {
    margin-top: 12px;
    font-style: normal;
    font-weight: 300;
    font-size: 14px;
    line-height: 145%;
    text-align: center;
    letter-spacing: 0.07em;
    white-space: pre-line;
    color: ${theme.subTextColor};
  }

  .withWarning {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
`
);
