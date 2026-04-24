import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TAB_BAR_BG = '#0F172A';
const ACTIVE = '#6366F1';
const INACTIVE = '#64748B';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: TAB_BAR_BG, borderTopWidth: 0 },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: 'Groups', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Notifications', tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
