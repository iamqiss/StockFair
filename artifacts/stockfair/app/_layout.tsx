import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/context/LanguageContext";
import { StokvelProvider } from "@/context/StokvelContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"               options={{ headerShown: false }} />
      <Stack.Screen name="auth/welcome"          options={{ headerShown: false }} />
      <Stack.Screen name="auth/login"            options={{ headerShown: false }} />
      <Stack.Screen name="auth/register"         options={{ headerShown: false }} />
      <Stack.Screen name="auth/forgot-password"  options={{ headerShown: false }} />
      <Stack.Screen name="stokvel/[id]"          options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="stokvel/invest"        options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="stokvel/tax"           options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="portfolio/index"       options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="fairscore/index"      options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="payments/autopay"     options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="notifications"         options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="kyc/index"             options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <ThemeProvider>
                <LanguageProvider>
                  <StokvelProvider>
                    <CartProvider>
                      <AuthGate>
                        <RootLayoutNav />
                      </AuthGate>
                    </CartProvider>
                  </StokvelProvider>
                </LanguageProvider>
              </ThemeProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
