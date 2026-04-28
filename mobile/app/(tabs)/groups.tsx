import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function GroupsScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: colors.text }}>Groups</Text>
    </View>
  );
}
