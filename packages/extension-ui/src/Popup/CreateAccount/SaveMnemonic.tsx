import type { ThemeProps } from '../../types';

import React, { useCallback, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import styled from 'styled-components';

import copyIcon from '../../assets/copy.svg';
import { BackButton, Button, ButtonArea, Checkbox, Header, HelperFooter, MnemonicPill, Svg } from '../../components';
import useToast from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';

interface Props extends ThemeProps {
  className?: string;
  onPreviousStep: () => void;
  onNextStep: () => void;
  seed: string;
}

function SaveMnemonic({ className, onNextStep, onPreviousStep, seed }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { show } = useToast();

  const [isSecretCopied, setIsSecretCopied] = useState(false);

  const seedArray = seed.split(' ');

  const _onCopy = useCallback(
    (test: string, success: boolean) => {
      if (success) {
        show(t('Secret phrase copied to clipboard'), 'success');
      } else {
        show(t('Failed copying to clipboard'), 'critical');
      }
    },
    [show, t]
  );

  const footer = (
    <HelperFooter>
      <Checkbox
        checked={isSecretCopied}
        label={t('I have safely stored the secret phrase. The clipboard will be cleared upon clicking "Next".')}
        onChange={setIsSecretCopied}
        variant='small'
      />
    </HelperFooter>
  );

  return (
    <>
      <ContentContainer className={className}>
        <StyledHeader
          text={
            <>
              {t<string>('Remember to save your secret phrase\nand')}
              <Bold>{t<string>(' keep it safe!')}</Bold>
            </>
          }
          title={t<string>('Save your secret phrase')}
        />
        <MnemonicContainer>
          {seedArray.map((word, index) => (
            <MnemonicPill
              className='mnemonic-pill'
              index={index}
              key={index}
              name={`mnemonic-${index}`}
              word={word}
            />
          ))}
        </MnemonicContainer>
        <CopyToClipboard
          onCopy={_onCopy}
          text={seed}
        >
          <StyledButton
            className='copy-button'
            tertiary
          >
            <div className='copy-to-clipboard'>
              <Svg
                className='copyIcon'
                src={copyIcon}
              />
              {t<string>('Copy to clipboard')}
            </div>
          </StyledButton>
        </CopyToClipboard>
      </ContentContainer>
      <ButtonArea footer={footer}>
        <BackButton onClick={onPreviousStep} />
        <CopyToClipboard text=' '>
          <Button
            isDisabled={!isSecretCopied}
            onClick={onNextStep}
          >
            {t<string>('Next')}
          </Button>
        </CopyToClipboard>
      </ButtonArea>
    </>
  );
}

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-block: auto;
`;

const StyledHeader = styled(Header)`
  margin-bottom: 36px;
`;

const Bold = styled.span`
  font-weight: 600;
`;

const MnemonicContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
  user-select: all;
  margin-bottom: 24px;
  row-gap: 12px;

  .mnemonic-index {
    user-select: none;
  }
`;

const StyledButton = styled(Button)`
  margin-inline: auto;
  margin-bottom: 24px;

  &:active {
    margin-top: 0px;
  }
`;

export default React.memo(
  styled(SaveMnemonic)(
    ({ theme }: Props) => `
    .copyIcon {
      width: 16px;
      height: 16px;
      background: ${theme.primaryColor};
    }

    .copy-to-clipboard {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;

      :hover {
        ${Svg} {
          background: ${theme.buttonBackgroundHover};
        }
      }
    }
`
  )
);
