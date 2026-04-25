import React from 'react';
import { Pressable } from 'react-native';
import { BellIcon } from '../icons/BellIcon';

interface Props {
  onPress: () => void;
}

export const NotificationBell: React.FC<Props> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="View notifications"
      accessibilityRole="button"
    >
      <BellIcon />
    </Pressable>
  );
};
