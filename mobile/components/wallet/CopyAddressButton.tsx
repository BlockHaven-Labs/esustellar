import React from 'react';
import { Pressable } from 'react-native';
import { CopyIcon } from '../icons/CopyIcon';

interface Props {
  onPress: () => void;
}

export const CopyAddressButton: React.FC<Props> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Copy wallet address"
      accessibilityRole="button"
      accessibilityHint="Copies your wallet address to the clipboard"
    >
      <CopyIcon />
    </Pressable>
  );
};
