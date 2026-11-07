import type { CatCollection, CatDesign } from './catTypes';

const classicCats: readonly CatDesign[] = [
  {
    id: 'roux', name: 'Caramel', fur: '#F2A65A', line: '#B5672A', muzzle: '#FCE6CC', innerEar: '#F7C3A8',
    nose: '#E8838A', eyes: 'round', pattern: 'tabby', patternColors: ['#D9803A'], head: 'round', ears: 'normal',
  },
  {
    id: 'noir', name: 'Réglisse', fur: '#3C3B42', line: '#1F1E23', muzzle: '#4B4A52', innerEar: '#8E7280',
    nose: '#8E6A78', eyes: 'iris', iris: '#CFDC6B', pattern: 'none', head: 'round', ears: 'normal', blush: '#7B5866',
  },
  {
    id: 'blanc', name: 'Flocon', fur: '#FFFFFF', line: '#C7BFB5', muzzle: '#FFFFFF', innerEar: '#F7C7CB',
    nose: '#F09AA6', eyes: 'iris', iris: '#86C5EA', pattern: 'none', head: 'round', ears: 'normal',
  },
  {
    id: 'gris', name: 'Nuage', fur: '#A5ADB8', line: '#6B7480', muzzle: '#CDD2D9', innerEar: '#E6C4CA',
    nose: '#C98D98', eyes: 'iris', iris: '#E9B44C', pattern: 'none', head: 'round', ears: 'normal',
  },
  {
    id: 'siamois', name: 'Moka', fur: '#F5E9D7', line: '#8C6C56', muzzle: '#F5E9D7', innerEar: '#C79C8A',
    nose: '#6D4F40', eyes: 'iris', iris: '#6DB3EA', pattern: 'points', patternColors: ['#6E5040'], head: 'slim', ears: 'normal',
  },
  {
    id: 'tigre', name: 'Tigrou', fur: '#BE9A76', line: '#6F5541', muzzle: '#EEDFCB', innerEar: '#E9B9A6',
    nose: '#C9727C', eyes: 'iris', iris: '#9CC05A', pattern: 'tabby', patternColors: ['#6F5541'], head: 'round', ears: 'normal',
  },
  {
    id: 'calico', name: 'Praline', fur: '#FFFCF6', line: '#B7ADA1', muzzle: '#FFFCF6', innerEar: '#F5C6C2',
    nose: '#EE9AA2', eyes: 'round', pattern: 'calico', patternColors: ['#EC9A4E', '#3E3A3B'], head: 'round', ears: 'normal',
  },
  {
    id: 'persan', name: 'Pompon', fur: '#F2E3D0', line: '#BBA289', muzzle: '#FBF3E8', innerEar: '#EBC1B0',
    nose: '#D98E91', eyes: 'happy', pattern: 'blaze', patternColors: ['#E3CBB0'], head: 'fluffy', ears: 'small',
  },
  {
    id: 'sphynx', name: 'Ramsès', fur: '#EDC6B7', line: '#B4806F', muzzle: '#F3D5CA', innerEar: '#E4A496',
    nose: '#C77D7E', eyes: 'iris', iris: '#7FCBA9', pattern: 'none', head: 'slim', ears: 'large', wrinkles: true,
  },
];

export const CLASSIC_COLLECTION: CatCollection = { id: 'classique', name: 'Classique', cats: classicCats };

/** Future collections (seasonal, premium…) only need to be added here. */
export const COLLECTIONS: readonly CatCollection[] = [CLASSIC_COLLECTION];

export function getCollection(id: string): CatCollection {
  return COLLECTIONS.find((c) => c.id === id) ?? CLASSIC_COLLECTION;
}

/** Cat shown in a region: one distinct cat per region, the 10th region reuses one. */
export function catForRegion(collection: CatCollection, regionId: number, seed: number): CatDesign {
  const n = collection.cats.length;
  const offset = seed % n;
  return collection.cats[(regionId + offset) % n] as CatDesign;
}
