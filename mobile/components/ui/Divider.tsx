import React from 'react';
import { View } from 'react-native';

interface Props {
  color?: string;
  thickness?: number;
  marginVertical?: number;
}

export function Divider({ color = '#334155', thickness = 1, marginVertical = 8 }: Props) {
  return (
    <View
      style={{
        height: thickness,
        backgroundColor: color,
        marginVertical,
        alignSelf: 'stretch',
      }}
    />
  );
}
