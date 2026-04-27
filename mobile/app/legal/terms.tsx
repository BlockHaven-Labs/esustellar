import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.content}>
        Welcome to EsuStellar. By using this app, you agree to comply with all
        platform rules, contribution guidelines, and Stellar transaction policies.
        Users are responsible for maintaining account security and lawful use of
        the platform.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 24 },
});
