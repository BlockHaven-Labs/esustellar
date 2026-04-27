import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.content}>
        EsuStellar collects only necessary account, wallet, and contribution
        activity data to provide secure platform operations. We do not sell user
        data. Security logs may be retained for fraud prevention and compliance.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 24 },
});
