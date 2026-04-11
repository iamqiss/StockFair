export type ColorPalette = 'obsidian' | 'forge' | 'bloom';

export type ColorTokens = {
  text:                  string;
  tint:                  string;
  background:            string;
  foreground:            string;
  card:                  string;
  cardForeground:        string;
  primary:               string;
  primaryForeground:     string;
  secondary:             string;
  secondaryForeground:   string;
  muted:                 string;
  mutedForeground:       string;
  accent:                string;
  accentForeground:      string;
  destructive:           string;
  destructiveForeground: string;
  border:                string;
  input:                 string;
  navy:                  string;
  amber:                 string;
  desert:                string;
  sand:                  string;
  grey:                  string;
  success:               string;
  successForeground:     string;
  tabBar:                string;
  tabActive:             string;
  tabInactive:           string;
};

/* ═══════════════════════════════════════════════════════════
   OBSIDIAN
═══════════════════════════════════════════════════════════ */

/* Obsidian Light — warm parchment, editorial, zero chrome */
const obsidianLight: ColorTokens = {
  text:                 '#1A160E',
  tint:                 '#1A160E',
  background:           '#F5F0E8',
  foreground:           '#1A160E',
  card:                 '#FFFFFF',
  cardForeground:       '#1A160E',
  primary:              '#1A160E',
  primaryForeground:    '#F5F0E8',
  secondary:            '#4A4036',
  secondaryForeground:  '#FFFFFF',
  muted:                '#EDE7DC',
  mutedForeground:      '#8A7E70',
  accent:               '#C4956A',
  accentForeground:     '#FFFFFF',
  destructive:          '#C0392B',
  destructiveForeground:'#FFFFFF',
  border:               '#E6DDD1',
  input:                '#FFFFFF',
  navy:                 '#2C2418',
  amber:                '#C4956A',
  desert:               '#A07050',
  sand:                 '#C8B89A',
  grey:                 '#8A7E70',
  success:              '#2A7D4F',
  successForeground:    '#FFFFFF',
  tabBar:               '#FFFFFF',
  tabActive:            '#1A160E',
  tabInactive:          '#A09080',
};

/* Obsidian Dark — deep midnight navy, cool and precise */
const obsidianDark: ColorTokens = {
  text:                 '#E4E7F2',
  tint:                 '#E4E7F2',
  background:           '#111420',
  foreground:           '#E4E7F2',
  card:                 '#1C2038',
  cardForeground:       '#E4E7F2',
  primary:              '#E4E7F2',
  primaryForeground:    '#111420',
  secondary:            '#252A45',
  secondaryForeground:  '#E4E7F2',
  muted:                '#181C30',
  mutedForeground:      '#6A7090',
  accent:               '#5B65A0',
  accentForeground:     '#E4E7F2',
  destructive:          '#E05050',
  destructiveForeground:'#FFFFFF',
  border:               '#262C48',
  input:                '#1C2038',
  navy:                 '#111420',
  amber:                '#E4E7F2',
  desert:               '#6A7090',
  sand:                 '#4A5070',
  grey:                 '#6A7090',
  success:              '#2FC86A',
  successForeground:    '#111420',
  tabBar:               '#1C2038',
  tabActive:            '#E4E7F2',
  tabInactive:          '#4A5070',
};

/* ═══════════════════════════════════════════════════════════
   FORGE
═══════════════════════════════════════════════════════════ */

/* Forge Light — warm honey cream, amber ink on parchment */
const forgeLight: ColorTokens = {
  text:                 '#28180A',
  tint:                 '#B8701E',
  background:           '#FBF7F1',
  foreground:           '#28180A',
  card:                 '#FFFFFF',
  cardForeground:       '#28180A',
  primary:              '#B8701E',
  primaryForeground:    '#FFFFFF',
  secondary:            '#5A3818',
  secondaryForeground:  '#FFFFFF',
  muted:                '#F2E9DC',
  mutedForeground:      '#8A6A48',
  accent:               '#D4863C',
  accentForeground:     '#FFFFFF',
  destructive:          '#C0392B',
  destructiveForeground:'#FFFFFF',
  border:               '#E8DDD0',
  input:                '#FFFFFF',
  navy:                 '#2C1808',
  amber:                '#B8701E',
  desert:               '#A06030',
  sand:                 '#D8C0A0',
  grey:                 '#8A6A48',
  success:              '#2A7A4F',
  successForeground:    '#FFFFFF',
  tabBar:               '#FFFFFF',
  tabActive:            '#B8701E',
  tabInactive:          '#A08058',
};

/* Forge Dark — charred walnut, molten amber embers */
const forgeDark: ColorTokens = {
  text:                 '#F0E8DC',
  tint:                 '#D4863C',
  background:           '#1E160C',
  foreground:           '#F0E8DC',
  card:                 '#2C2016',
  cardForeground:       '#F0E8DC',
  primary:              '#D4863C',
  primaryForeground:    '#1E160C',
  secondary:            '#3A2C1E',
  secondaryForeground:  '#F0E8DC',
  muted:                '#261A10',
  mutedForeground:      '#8A7260',
  accent:               '#E8A456',
  accentForeground:     '#1E160C',
  destructive:          '#D94040',
  destructiveForeground:'#FFFFFF',
  border:               '#3E2E1E',
  input:                '#2C2016',
  navy:                 '#1E160C',
  amber:                '#D4863C',
  desert:               '#8A6040',
  sand:                 '#6A5040',
  grey:                 '#8A7260',
  success:              '#5BAA78',
  successForeground:    '#1E160C',
  tabBar:               '#2C2016',
  tabActive:            '#D4863C',
  tabInactive:          '#6A5040',
};

/* ═══════════════════════════════════════════════════════════
   BLOOM
═══════════════════════════════════════════════════════════ */

/* Bloom Light — soft lavender, violet ink, airy and feminine */
const bloomLight: ColorTokens = {
  text:                 '#1A0C28',
  tint:                 '#8820A8',
  background:           '#F0EBF8',
  foreground:           '#1A0C28',
  card:                 '#FFFFFF',
  cardForeground:       '#1A0C28',
  primary:              '#8820A8',
  primaryForeground:    '#FFFFFF',
  secondary:            '#401060',
  secondaryForeground:  '#FFFFFF',
  muted:                '#E8DFF4',
  mutedForeground:      '#7058A0',
  accent:               '#B030D0',
  accentForeground:     '#FFFFFF',
  destructive:          '#C0392B',
  destructiveForeground:'#FFFFFF',
  border:               '#DDD4EE',
  input:                '#FFFFFF',
  navy:                 '#1A0C28',
  amber:                '#B030D0',
  desert:               '#805898',
  sand:                 '#C8B8E0',
  grey:                 '#7058A0',
  success:              '#2A7D50',
  successForeground:    '#FFFFFF',
  tabBar:               '#FFFFFF',
  tabActive:            '#8820A8',
  tabInactive:          '#9070B8',
};

/* Bloom Dark — midnight violet, electric fuchsia sparks */
const bloomDark: ColorTokens = {
  text:                 '#EAE0FA',
  tint:                 '#C040E0',
  background:           '#12102A',
  foreground:           '#EAE0FA',
  card:                 '#1E1A3C',
  cardForeground:       '#EAE0FA',
  primary:              '#C040E0',
  primaryForeground:    '#FFFFFF',
  secondary:            '#2A2250',
  secondaryForeground:  '#EAE0FA',
  muted:                '#1A1632',
  mutedForeground:      '#7A60A0',
  accent:               '#E060F4',
  accentForeground:     '#FFFFFF',
  destructive:          '#E04060',
  destructiveForeground:'#FFFFFF',
  border:               '#2E2854',
  input:                '#1E1A3C',
  navy:                 '#12102A',
  amber:                '#E060F4',
  desert:               '#6A4080',
  sand:                 '#5A4878',
  grey:                 '#7A60A0',
  success:              '#34D399',
  successForeground:    '#12102A',
  tabBar:               '#1E1A3C',
  tabActive:            '#C040E0',
  tabInactive:          '#5A4878',
};

const colors = {
  obsidianLight,
  obsidianDark,
  forgeLight,
  forgeDark,
  bloomLight,
  bloomDark,
  radius: 12,
};

export default colors;
