import React from 'react';
import { Pressable } from 'react-native';
import { DisconnectIcon } from '../icons/DisconnectIcon';

interface Props {
  onPress: () => void;
}

export const DisconnectButton: React.FC<Props> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Disconnect wallet"
      accessibilityRole="button"
    >
      <DisconnectIcon />
    </Pressable>
  );
};
