import type { RouletteColor, RouletteNumberMeta } from '../types/roulette.ts';

// European Roulette Wheel Sequence (37 pockets) clockwise
export const EUROPEAN_WHEEL_NUMBERS: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS: number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
];

export const BLACK_NUMBERS: number[] = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
];

export const VOISINS_NUMBERS: number[] = [
  22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25
];

export const TIERS_NUMBERS: number[] = [
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33
];

export const ORPHELINS_NUMBERS: number[] = [
  1, 20, 14, 31, 9, 17, 34, 6
];

export const ZERO_SPIEL_NUMBERS: number[] = [
  12, 35, 3, 26, 0, 32, 15
];

export function getNumberColor(num: number): RouletteColor {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
}

export function getNumberSector(num: number): 'voisins' | 'tiers' | 'orphelins' | 'zero_spiel' {
  if (ZERO_SPIEL_NUMBERS.includes(num)) return 'zero_spiel';
  if (VOISINS_NUMBERS.includes(num)) return 'voisins';
  if (TIERS_NUMBERS.includes(num)) return 'tiers';
  return 'orphelins';
}

export function getNumberDozen(num: number): 1 | 2 | 3 | 0 {
  if (num === 0) return 0;
  if (num <= 12) return 1;
  if (num <= 24) return 2;
  return 3;
}

export function getNumberColumn(num: number): 1 | 2 | 3 | 0 {
  if (num === 0) return 0;
  const rem = num % 3;
  if (rem === 1) return 1; // 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
  if (rem === 2) return 2; // 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
  return 3; // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
}

export const NUMBER_METADATA: Record<number, RouletteNumberMeta> = {};

for (let i = 0; i <= 36; i++) {
  NUMBER_METADATA[i] = {
    number: i,
    color: getNumberColor(i),
    dozen: getNumberDozen(i),
    column: getNumberColumn(i),
    isEven: i === 0 ? null : i % 2 === 0,
    isHigh: i === 0 ? null : i >= 19,
    sector: getNumberSector(i),
    wheelIndex: EUROPEAN_WHEEL_NUMBERS.indexOf(i)
  };
}

export const SECTOR_NAMES_THAI: Record<string, { name: string; en: string; description: string }> = {
  zero_spiel: {
    name: 'ซีโร่ สเปียล (Zero Spiel)',
    en: 'Zero Spiel',
    description: '7 ช่องรอบเลข 0 มีความถี่สูงเมื่อดีลเลอร์โยนเบา'
  },
  voisins: {
    name: 'วัวแซง ดู เซโร (Voisins du Zéro)',
    en: 'Voisins du Zéro',
    description: '17 ช่องขนาดใหญ่รอบ 0 ครอบคลุม 45.9% ของวงล้อ'
  },
  tiers: {
    name: 'เตียร์ ดู ซีแลนด์ (Tiers du Cylindre)',
    en: 'Tiers du Cylindre',
    description: '12 ช่องฝั่งตรงข้ามเลข 0 ครอบคลุม 32.4% ของวงล้อ'
  },
  orphelins: {
    name: 'ออร์เฟแลงส์ (Orphelins)',
    en: 'Orphelins',
    description: '8 ช่องปีกซ้าย-ขวา เหมาะสำหรับดักจับโซนดีดตัว'
  }
};
