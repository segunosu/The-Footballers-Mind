// Re-export brand tokens and component styles. Consumers import the CSS once
// at app root; the TS re-exports are reserved for future JS-side tokens.

export const BRAND = {
  name: "The Player's Mind",
  shortName: 'TPM',
  tagline: 'Evidence-based mental fitness · ages 7–14',
  colours: {
    navy900: '#0a1f44',
    navy500: '#3d5699',
    navy100: '#e6ebf5',
    gold500: '#d4a437',
    gold100: '#faefd0',
    ink: '#0a1a2e',
    inkMuted: '#4c617f',
    paper: '#f7f4ed',
    chalk: '#ffffff',
    alert: '#c82b2b',
    pitch: '#1e7a4a',
  },
  fonts: {
    display: 'Archivo',
    body: 'Inter',
  },
} as const;

export type AgeBand = 'age_7_9' | 'age_10_12' | 'age_13_14';

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  age_7_9: 'Age 7–9',
  age_10_12: 'Age 10–12',
  age_13_14: 'Age 13–14',
};
