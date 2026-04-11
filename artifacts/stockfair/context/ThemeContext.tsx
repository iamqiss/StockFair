import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorPalette = 'obsidian' | 'forge' | 'bloom';
export type ThemeMode    = 'system' | 'light' | 'dark';

type ThemeContextType = {
  palette:      ColorPalette;
  setPalette:   (p: ColorPalette) => void;
  themeMode:    ThemeMode;
  isDark:       boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme:  () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  palette:      'obsidian',
  setPalette:   () => {},
  themeMode:    'system',
  isDark:       false,
  setThemeMode: () => {},
  toggleTheme:  () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode,  setThemeModeState]  = useState<ThemeMode>('system');
  const [palette,    setPaletteState]    = useState<ColorPalette>('obsidian');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@stockfair_theme'),
      AsyncStorage.getItem('@stockfair_palette'),
    ]).then(([savedMode, savedPalette]) => {
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setThemeModeState(savedMode);
      }
      if (savedPalette === 'obsidian' || savedPalette === 'forge' || savedPalette === 'bloom') {
        setPaletteState(savedPalette);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem('@stockfair_theme', mode);
  };

  const setPalette = (p: ColorPalette) => {
    setPaletteState(p);
    AsyncStorage.setItem('@stockfair_palette', p);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ palette, setPalette, themeMode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
