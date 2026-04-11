import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current palette + brightness.
 * All three palettes support independent light/dark switching.
 */
export function useColors() {
  const { isDark, palette } = useTheme();

  let tokens;
  switch (palette) {
    case 'forge':
      tokens = isDark ? colors.forgeDark : colors.forgeLight;
      break;
    case 'bloom':
      tokens = isDark ? colors.bloomDark : colors.bloomLight;
      break;
    case 'obsidian':
    default:
      tokens = isDark ? colors.obsidianDark : colors.obsidianLight;
      break;
  }

  return { ...tokens, radius: colors.radius };
}
