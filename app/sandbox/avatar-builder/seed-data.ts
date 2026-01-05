// Avatar Builder Seed Data - Parts and Palettes
import type { AvatarPart, Palette, AvatarCategory } from './types'

// =============================================================================
// COLOR PALETTES
// =============================================================================

export const PALETTES: Record<AvatarCategory, Palette[]> = {
  body: [
    { token: 'body_tone_1', label: 'Light', hex: '#FFE4C9' },
    { token: 'body_tone_2', label: 'Fair', hex: '#F5D0B5' },
    { token: 'body_tone_3', label: 'Medium', hex: '#D4A574' },
    { token: 'body_tone_4', label: 'Tan', hex: '#C68B59' },
    { token: 'body_tone_5', label: 'Brown', hex: '#8D5524' },
    { token: 'body_tone_6', label: 'Dark', hex: '#5C3317' },
    { token: 'body_tone_7', label: 'Deep', hex: '#3B2417' },
    { token: 'body_tone_8', label: 'Ebony', hex: '#2D1810' },
  ],
  face: [
    { token: 'face_default', label: 'Default', hex: '#1A1A1A' },
    { token: 'face_soft', label: 'Soft', hex: '#4A4A4A' },
    { token: 'face_warm', label: 'Warm', hex: '#5C4033' },
    { token: 'face_cool', label: 'Cool', hex: '#3A4A5C' },
    { token: 'face_rosy', label: 'Rosy', hex: '#8B4557' },
    { token: 'face_natural', label: 'Natural', hex: '#2D2D2D' },
  ],
  hair: [
    { token: 'hair_black', label: 'Black', hex: '#1A1A1A' },
    { token: 'hair_dark_brown', label: 'Dark Brown', hex: '#3B2417' },
    { token: 'hair_brown', label: 'Brown', hex: '#6B4423' },
    { token: 'hair_light_brown', label: 'Light Brown', hex: '#A67B5B' },
    { token: 'hair_blonde', label: 'Blonde', hex: '#E6C87A' },
    { token: 'hair_platinum', label: 'Platinum', hex: '#F0E68C' },
    { token: 'hair_red', label: 'Red', hex: '#A52A2A' },
    { token: 'hair_ginger', label: 'Ginger', hex: '#D35400' },
    { token: 'hair_gray', label: 'Gray', hex: '#808080' },
    { token: 'hair_white', label: 'White', hex: '#E8E8E8' },
    { token: 'hair_blue', label: 'Blue', hex: '#4A90D9' },
    { token: 'hair_pink', label: 'Pink', hex: '#E84393' },
  ],
  accessories: [
    { token: 'acc_gold', label: 'Gold', hex: '#FFD700' },
    { token: 'acc_silver', label: 'Silver', hex: '#C0C0C0' },
    { token: 'acc_rose_gold', label: 'Rose Gold', hex: '#E8B4B8' },
    { token: 'acc_bronze', label: 'Bronze', hex: '#CD7F32' },
    { token: 'acc_black', label: 'Black', hex: '#1A1A1A' },
    { token: 'acc_white', label: 'White', hex: '#FFFFFF' },
    { token: 'acc_primary', label: 'Primary', hex: '#8661ff' },
    { token: 'acc_teal', label: 'Teal', hex: '#00c7b0' },
  ],
  outfit: [
    { token: 'outfit_primary', label: 'Primary', hex: '#8661ff' },
    { token: 'outfit_teal', label: 'Teal', hex: '#00c7b0' },
    { token: 'outfit_yellow', label: 'Yellow', hex: '#ffd166' },
    { token: 'outfit_red', label: 'Red', hex: '#ef476f' },
    { token: 'outfit_blue', label: 'Blue', hex: '#118ab2' },
    { token: 'outfit_navy', label: 'Navy', hex: '#073b4c' },
    { token: 'outfit_white', label: 'White', hex: '#FFFFFF' },
    { token: 'outfit_gray', label: 'Gray', hex: '#6B7280' },
    { token: 'outfit_black', label: 'Black', hex: '#1A1A1A' },
    { token: 'outfit_purple', label: 'Purple', hex: '#9333EA' },
  ],
}

// =============================================================================
// SVG PART TEMPLATES
// =============================================================================

// Base viewBox for all parts (consistent sizing)
const VIEWBOX = '0 0 100 100'

// Helper to create colorable SVG
const colorableSvg = (content: string) => 
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="currentColor">${content}</svg>`

// =============================================================================
// BODY PARTS (shapes for body/head outline)
// =============================================================================

const BODY_PARTS: AvatarPart[] = [
  {
    id: 'body_01',
    category: 'body',
    name: 'Round',
    svg: colorableSvg('<circle cx="50" cy="45" r="35"/><ellipse cx="50" cy="85" rx="25" ry="15"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_02',
    category: 'body',
    name: 'Oval',
    svg: colorableSvg('<ellipse cx="50" cy="42" rx="30" ry="38"/><ellipse cx="50" cy="85" rx="22" ry="12"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_03',
    category: 'body',
    name: 'Square',
    svg: colorableSvg('<rect x="18" y="12" width="64" height="60" rx="12"/><ellipse cx="50" cy="85" rx="26" ry="14"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_04',
    category: 'body',
    name: 'Heart',
    svg: colorableSvg('<path d="M50 75 C20 55 15 30 30 20 C45 10 50 25 50 25 C50 25 55 10 70 20 C85 30 80 55 50 75Z"/><ellipse cx="50" cy="87" rx="20" ry="10"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_05',
    category: 'body',
    name: 'Diamond',
    svg: colorableSvg('<path d="M50 10 L80 45 L50 80 L20 45 Z"/><ellipse cx="50" cy="88" rx="18" ry="9"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_06',
    category: 'body',
    name: 'Pear',
    svg: colorableSvg('<path d="M50 12 C65 12 75 25 75 40 C75 60 65 75 50 78 C35 75 25 60 25 40 C25 25 35 12 50 12Z"/><ellipse cx="50" cy="87" rx="24" ry="12"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_07',
    category: 'body',
    name: 'Long',
    svg: colorableSvg('<ellipse cx="50" cy="40" rx="28" ry="35"/><ellipse cx="50" cy="85" rx="20" ry="12"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_08',
    category: 'body',
    name: 'Wide',
    svg: colorableSvg('<ellipse cx="50" cy="45" rx="38" ry="30"/><ellipse cx="50" cy="85" rx="28" ry="14"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_09',
    category: 'body',
    name: 'Hexagon',
    svg: colorableSvg('<polygon points="50,10 80,25 80,60 50,75 20,60 20,25"/><ellipse cx="50" cy="85" rx="22" ry="12"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_10',
    category: 'body',
    name: 'Triangle',
    svg: colorableSvg('<polygon points="50,15 85,70 15,70"/><ellipse cx="50" cy="85" rx="25" ry="12"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_11',
    category: 'body',
    name: 'Soft Square',
    svg: colorableSvg('<rect x="20" y="15" width="60" height="55" rx="18"/><ellipse cx="50" cy="85" rx="24" ry="13"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
  {
    id: 'body_12',
    category: 'body',
    name: 'Oblong',
    svg: colorableSvg('<ellipse cx="50" cy="42" rx="26" ry="36"/><ellipse cx="50" cy="86" rx="20" ry="11"/>'),
    supportsColor: true,
    defaultColorToken: 'body_tone_3',
  },
]

// =============================================================================
// FACE PARTS (eyes, nose, mouth as a combined expression)
// =============================================================================

const FACE_PARTS: AvatarPart[] = [
  {
    id: 'face_01',
    category: 'face',
    name: 'Happy',
    svg: colorableSvg('<circle cx="35" cy="40" r="4"/><circle cx="65" cy="40" r="4"/><path d="M35 55 Q50 68 65 55" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_02',
    category: 'face',
    name: 'Neutral',
    svg: colorableSvg('<circle cx="35" cy="40" r="4"/><circle cx="65" cy="40" r="4"/><line x1="38" y1="58" x2="62" y2="58" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_03',
    category: 'face',
    name: 'Wink',
    svg: colorableSvg('<circle cx="35" cy="40" r="4"/><path d="M60 38 L70 42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M35 55 Q50 65 65 55" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_04',
    category: 'face',
    name: 'Surprised',
    svg: colorableSvg('<circle cx="35" cy="40" r="5"/><circle cx="65" cy="40" r="5"/><circle cx="50" cy="60" r="6"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_05',
    category: 'face',
    name: 'Cool',
    svg: colorableSvg('<rect x="25" y="36" width="20" height="8" rx="2"/><rect x="55" y="36" width="20" height="8" rx="2"/><path d="M38 58 Q50 62 62 58" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_06',
    category: 'face',
    name: 'Sleepy',
    svg: colorableSvg('<path d="M30 40 L40 38" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M60 38 L70 40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><ellipse cx="50" cy="58" rx="5" ry="3"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_07',
    category: 'face',
    name: 'Serious',
    svg: colorableSvg('<circle cx="35" cy="40" r="3"/><circle cx="65" cy="40" r="3"/><line x1="40" y1="58" x2="60" y2="58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="32" x2="42" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="72" y1="32" x2="58" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_08',
    category: 'face',
    name: 'Laughing',
    svg: colorableSvg('<path d="M30 38 Q35 42 40 38" stroke="currentColor" stroke-width="2" fill="none"/><path d="M60 38 Q65 42 70 38" stroke="currentColor" stroke-width="2" fill="none"/><path d="M35 54 Q50 72 65 54" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_09',
    category: 'face',
    name: 'Smirk',
    svg: colorableSvg('<circle cx="35" cy="40" r="4"/><circle cx="65" cy="40" r="4"/><path d="M40 56 Q55 62 65 54" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_10',
    category: 'face',
    name: 'Kawaii',
    svg: colorableSvg('<ellipse cx="35" cy="42" rx="6" ry="8"/><ellipse cx="65" cy="42" rx="6" ry="8"/><circle cx="35" cy="40" r="2" fill="white"/><circle cx="65" cy="40" r="2" fill="white"/><path d="M45 58 Q50 62 55 58" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_11',
    category: 'face',
    name: 'Dot Eyes',
    svg: colorableSvg('<circle cx="38" cy="42" r="2"/><circle cx="62" cy="42" r="2"/><ellipse cx="50" cy="58" rx="4" ry="2"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
  {
    id: 'face_12',
    category: 'face',
    name: 'Cat',
    svg: colorableSvg('<path d="M32 42 L38 38 L38 46 Z"/><path d="M62 42 L68 38 L68 46 Z"/><ellipse cx="50" cy="56" rx="3" ry="2"/><path d="M50 58 L50 62" stroke="currentColor" stroke-width="1"/><path d="M47 62 Q50 66 53 62" fill="none" stroke="currentColor" stroke-width="2"/>'),
    supportsColor: true,
    defaultColorToken: 'face_default',
  },
]

// =============================================================================
// HAIR PARTS
// =============================================================================

const HAIR_PARTS: AvatarPart[] = [
  {
    id: 'hair_01',
    category: 'hair',
    name: 'Short',
    svg: colorableSvg('<path d="M20 45 Q20 15 50 12 Q80 15 80 45 L75 42 Q75 22 50 18 Q25 22 25 42 Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_02',
    category: 'hair',
    name: 'Spiky',
    svg: colorableSvg('<path d="M15 50 L25 20 L35 45 L45 10 L55 45 L65 15 L75 45 L85 25 L85 50 Q85 55 80 55 L20 55 Q15 55 15 50Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_03',
    category: 'hair',
    name: 'Wavy',
    svg: colorableSvg('<path d="M18 55 Q15 20 50 10 Q85 20 82 55 Q78 35 70 35 Q62 35 60 50 Q55 40 50 40 Q45 40 40 50 Q38 35 30 35 Q22 35 18 55Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_04',
    category: 'hair',
    name: 'Long',
    svg: colorableSvg('<path d="M15 45 Q15 10 50 8 Q85 10 85 45 L85 85 Q85 90 80 90 L70 90 L70 50 Q70 25 50 20 Q30 25 30 50 L30 90 L20 90 Q15 90 15 85 Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_05',
    category: 'hair',
    name: 'Afro',
    svg: colorableSvg('<circle cx="50" cy="40" r="42"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_black',
  },
  {
    id: 'hair_06',
    category: 'hair',
    name: 'Ponytail',
    svg: colorableSvg('<path d="M20 50 Q15 15 50 10 Q85 15 80 50 L75 45 Q75 25 50 18 Q25 25 25 45 Z"/><ellipse cx="50" cy="8" rx="8" ry="4"/><path d="M50 12 Q52 20 48 35 Q46 50 50 70 Q54 50 52 35 Q50 20 50 12" fill="currentColor"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_07',
    category: 'hair',
    name: 'Bun',
    svg: colorableSvg('<path d="M22 50 Q18 20 50 12 Q82 20 78 50 L72 45 Q72 28 50 20 Q28 28 28 45 Z"/><circle cx="50" cy="8" r="10"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_08',
    category: 'hair',
    name: 'Mohawk',
    svg: colorableSvg('<path d="M42 55 L42 5 Q50 0 58 5 L58 55 Q55 50 50 50 Q45 50 42 55Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_red',
  },
  {
    id: 'hair_09',
    category: 'hair',
    name: 'Curly',
    svg: colorableSvg('<circle cx="25" cy="30" r="12"/><circle cx="40" cy="18" r="12"/><circle cx="60" cy="18" r="12"/><circle cx="75" cy="30" r="12"/><circle cx="20" cy="48" r="10"/><circle cx="80" cy="48" r="10"/><circle cx="50" cy="12" r="10"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_brown',
  },
  {
    id: 'hair_10',
    category: 'hair',
    name: 'Buzz',
    svg: colorableSvg('<path d="M25 48 Q22 25 50 18 Q78 25 75 48 L70 45 Q70 32 50 26 Q30 32 30 45 Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_black',
  },
  {
    id: 'hair_11',
    category: 'hair',
    name: 'Pigtails',
    svg: colorableSvg('<path d="M22 50 Q18 20 50 12 Q82 20 78 50 L72 45 Q72 28 50 20 Q28 28 28 45 Z"/><ellipse cx="18" cy="55" rx="8" ry="15"/><ellipse cx="82" cy="55" rx="8" ry="15"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_blonde',
  },
  {
    id: 'hair_12',
    category: 'hair',
    name: 'Side Part',
    svg: colorableSvg('<path d="M18 50 Q15 18 45 12 L48 12 Q78 15 80 50 L75 45 Q75 25 50 20 Q28 22 25 45 Z"/><path d="M15 35 Q12 20 30 15 L35 20 Q20 25 18 40 Z"/>'),
    supportsColor: true,
    defaultColorToken: 'hair_dark_brown',
  },
  {
    id: 'hair_none',
    category: 'hair',
    name: 'None',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>',
    supportsColor: false,
  },
]

// =============================================================================
// ACCESSORIES
// =============================================================================

const ACCESSORIES_PARTS: AvatarPart[] = [
  {
    id: 'acc_none',
    category: 'accessories',
    name: 'None',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>',
    supportsColor: false,
  },
  {
    id: 'acc_01',
    category: 'accessories',
    name: 'Glasses',
    svg: colorableSvg('<circle cx="32" cy="42" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="68" cy="42" r="12" fill="none" stroke="currentColor" stroke-width="2"/><line x1="44" y1="42" x2="56" y2="42" stroke="currentColor" stroke-width="2"/><line x1="20" y1="42" x2="10" y2="38" stroke="currentColor" stroke-width="2"/><line x1="80" y1="42" x2="90" y2="38" stroke="currentColor" stroke-width="2"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_black',
  },
  {
    id: 'acc_02',
    category: 'accessories',
    name: 'Sunglasses',
    svg: colorableSvg('<ellipse cx="32" cy="42" rx="14" ry="10"/><ellipse cx="68" cy="42" rx="14" ry="10"/><rect x="45" y="40" width="10" height="4" rx="1"/><line x1="18" y1="40" x2="8" y2="36" stroke="currentColor" stroke-width="2"/><line x1="82" y1="40" x2="92" y2="36" stroke="currentColor" stroke-width="2"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_black',
  },
  {
    id: 'acc_03',
    category: 'accessories',
    name: 'Earring L',
    svg: colorableSvg('<circle cx="12" cy="50" r="4"/><line x1="12" y1="46" x2="12" y2="42" stroke="currentColor" stroke-width="1"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
  {
    id: 'acc_04',
    category: 'accessories',
    name: 'Earring R',
    svg: colorableSvg('<circle cx="88" cy="50" r="4"/><line x1="88" y1="46" x2="88" y2="42" stroke="currentColor" stroke-width="1"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
  {
    id: 'acc_05',
    category: 'accessories',
    name: 'Earrings',
    svg: colorableSvg('<circle cx="12" cy="50" r="4"/><circle cx="88" cy="50" r="4"/><line x1="12" y1="46" x2="12" y2="42" stroke="currentColor" stroke-width="1"/><line x1="88" y1="46" x2="88" y2="42" stroke="currentColor" stroke-width="1"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
  {
    id: 'acc_06',
    category: 'accessories',
    name: 'Headband',
    svg: colorableSvg('<path d="M15 35 Q15 15 50 12 Q85 15 85 35" fill="none" stroke="currentColor" stroke-width="4"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_primary',
  },
  {
    id: 'acc_07',
    category: 'accessories',
    name: 'Hat',
    svg: colorableSvg('<ellipse cx="50" cy="22" rx="35" ry="8"/><path d="M25 22 Q25 5 50 2 Q75 5 75 22"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_black',
  },
  {
    id: 'acc_08',
    category: 'accessories',
    name: 'Crown',
    svg: colorableSvg('<path d="M20 35 L25 15 L35 28 L50 8 L65 28 L75 15 L80 35 Z"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
  {
    id: 'acc_09',
    category: 'accessories',
    name: 'Bow',
    svg: colorableSvg('<circle cx="50" cy="12" r="5"/><ellipse cx="38" cy="12" rx="10" ry="6"/><ellipse cx="62" cy="12" rx="10" ry="6"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_primary',
  },
  {
    id: 'acc_10',
    category: 'accessories',
    name: 'Necklace',
    svg: colorableSvg('<path d="M30 82 Q50 95 70 82" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="92" r="4"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
  {
    id: 'acc_11',
    category: 'accessories',
    name: 'Bandana',
    svg: colorableSvg('<path d="M15 32 Q15 18 50 15 Q85 18 85 32 L80 30 Q80 24 50 20 Q20 24 20 30 Z"/><path d="M82 28 L92 40 L88 42 L80 32"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_primary',
  },
  {
    id: 'acc_12',
    category: 'accessories',
    name: 'Star Pin',
    svg: colorableSvg('<polygon points="50,5 53,15 63,15 55,22 58,32 50,26 42,32 45,22 37,15 47,15"/>'),
    supportsColor: true,
    defaultColorToken: 'acc_gold',
  },
]

// =============================================================================
// OUTFIT PARTS
// =============================================================================

const OUTFIT_PARTS: AvatarPart[] = [
  {
    id: 'outfit_01',
    category: 'outfit',
    name: 'T-Shirt',
    svg: colorableSvg('<path d="M25 72 L25 98 L75 98 L75 72 Q65 75 50 75 Q35 75 25 72Z"/><path d="M25 72 L15 80 L20 85 L28 78"/><path d="M75 72 L85 80 L80 85 L72 78"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_primary',
  },
  {
    id: 'outfit_02',
    category: 'outfit',
    name: 'V-Neck',
    svg: colorableSvg('<path d="M25 72 L25 98 L75 98 L75 72 Q65 75 50 82 Q35 75 25 72Z"/><path d="M25 72 L15 80 L20 85 L28 78"/><path d="M75 72 L85 80 L80 85 L72 78"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_teal',
  },
  {
    id: 'outfit_03',
    category: 'outfit',
    name: 'Hoodie',
    svg: colorableSvg('<path d="M20 68 L20 98 L80 98 L80 68 Q65 72 50 72 Q35 72 20 68Z"/><path d="M35 72 Q40 65 50 65 Q60 65 65 72"/><path d="M20 68 L10 78 L18 85 L25 75"/><path d="M80 68 L90 78 L82 85 L75 75"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_navy',
  },
  {
    id: 'outfit_04',
    category: 'outfit',
    name: 'Tank Top',
    svg: colorableSvg('<path d="M32 72 L32 98 L68 98 L68 72 Q58 75 50 75 Q42 75 32 72Z"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_white',
  },
  {
    id: 'outfit_05',
    category: 'outfit',
    name: 'Suit',
    svg: colorableSvg('<path d="M22 70 L22 98 L78 98 L78 70 Q65 74 50 74 Q35 74 22 70Z"/><path d="M50 74 L50 98"/><path d="M50 74 L42 85 L50 82 L58 85 Z" fill="white"/><path d="M22 70 L12 80 L20 88 L28 78"/><path d="M78 70 L88 80 L80 88 L72 78"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_black',
  },
  {
    id: 'outfit_06',
    category: 'outfit',
    name: 'Dress',
    svg: colorableSvg('<path d="M30 72 Q28 85 22 98 L78 98 Q72 85 70 72 Q60 76 50 76 Q40 76 30 72Z"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_purple',
  },
  {
    id: 'outfit_07',
    category: 'outfit',
    name: 'Sweater',
    svg: colorableSvg('<path d="M20 68 L20 98 L80 98 L80 68 Q65 74 50 74 Q35 74 20 68Z"/><path d="M20 75 L80 75" stroke="currentColor" stroke-width="1" opacity="0.3"/><path d="M20 82 L80 82" stroke="currentColor" stroke-width="1" opacity="0.3"/><path d="M20 89 L80 89" stroke="currentColor" stroke-width="1" opacity="0.3"/><path d="M20 68 L8 78 L16 88 L25 76"/><path d="M80 68 L92 78 L84 88 L75 76"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_red',
  },
  {
    id: 'outfit_08',
    category: 'outfit',
    name: 'Collar',
    svg: colorableSvg('<path d="M25 72 L25 98 L75 98 L75 72 Q65 76 50 76 Q35 76 25 72Z"/><path d="M35 72 L42 78 L50 72 L58 78 L65 72" fill="white"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_blue',
  },
  {
    id: 'outfit_09',
    category: 'outfit',
    name: 'Overalls',
    svg: colorableSvg('<path d="M28 75 L28 98 L72 98 L72 75 Q60 78 50 78 Q40 78 28 75Z"/><rect x="38" y="80" width="24" height="15" rx="2"/><line x1="35" y1="75" x2="40" y2="82" stroke="currentColor" stroke-width="2"/><line x1="65" y1="75" x2="60" y2="82" stroke="currentColor" stroke-width="2"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_blue',
  },
  {
    id: 'outfit_10',
    category: 'outfit',
    name: 'Jersey',
    svg: colorableSvg('<path d="M22 70 L22 98 L78 98 L78 70 Q65 75 50 75 Q35 75 22 70Z"/><text x="50" y="90" text-anchor="middle" font-size="14" font-weight="bold" fill="white">10</text><path d="M22 70 L10 80 L18 90 L28 78"/><path d="M78 70 L90 80 L82 90 L72 78"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_primary',
  },
  {
    id: 'outfit_11',
    category: 'outfit',
    name: 'Turtleneck',
    svg: colorableSvg('<path d="M24 65 L24 98 L76 98 L76 65 Q65 70 50 70 Q35 70 24 65Z"/><rect x="38" y="65" width="24" height="10" rx="2"/><path d="M24 65 L14 75 L22 85 L30 73"/><path d="M76 65 L86 75 L78 85 L70 73"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_gray',
  },
  {
    id: 'outfit_12',
    category: 'outfit',
    name: 'Crop Top',
    svg: colorableSvg('<path d="M30 72 L30 88 L70 88 L70 72 Q60 76 50 76 Q40 76 30 72Z"/>'),
    supportsColor: true,
    defaultColorToken: 'outfit_yellow',
  },
  {
    id: 'outfit_none',
    category: 'outfit',
    name: 'None',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>',
    supportsColor: false,
  },
]

// =============================================================================
// COMBINED PARTS REGISTRY
// =============================================================================

export const AVATAR_PARTS: Record<AvatarCategory, AvatarPart[]> = {
  body: BODY_PARTS,
  face: FACE_PARTS,
  hair: HAIR_PARTS,
  accessories: ACCESSORIES_PARTS,
  outfit: OUTFIT_PARTS,
}

// Helper to get a part by ID
export function getPartById(category: AvatarCategory, partId: string): AvatarPart | undefined {
  return AVATAR_PARTS[category].find(p => p.id === partId)
}

// Helper to get color hex from token
export function getColorHex(category: AvatarCategory, colorToken: string): string {
  const palette = PALETTES[category]
  const color = palette.find(c => c.token === colorToken)
  return color?.hex ?? '#888888'
}

// Helper to get all parts flat
export function getAllParts(): AvatarPart[] {
  return Object.values(AVATAR_PARTS).flat()
}
