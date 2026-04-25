import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

interface Props {
  group: { id: string; name: string };
  onPress: (id: string) => void;
}

export const GroupCard: React.FC<Props> = ({ group, onPress }) => {
  return (
    <Pressable
      onPress={() => onPress(group.id)}
      accessibilityLabel={`View ${group.name} savings group`}
      accessibilityRole="button"
    >
      <View style={styles.card}>
        <Text style={styles.name}>{group.name}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
});
