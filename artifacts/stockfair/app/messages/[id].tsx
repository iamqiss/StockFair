import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useStokvel } from '@/context/StokvelContext';
import { StokvelChat } from '@/components/StokvelChat';
import { useColors } from '@/hooks/useColors';

export default function GroupChatScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const { isDark }= useTheme();
  const colors    = useColors();
  const { stokvels } = useStokvel();

  const stokvel = stokvels.find((s) => s.id === id);

  if (!stokvel) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Group not found</Text>
      </View>
    );
  }

  return (
    <StokvelChat
      stokvel={stokvel}
      onClose={() => router.back()}
      isDark={isDark}
    />
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
