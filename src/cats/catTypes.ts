/** Description of one illustrated cat. Collections are just lists of these. */
export type EyeStyle = 'round' | 'iris' | 'happy' | 'sleepy';
export type Pattern = 'none' | 'tabby' | 'calico' | 'points' | 'blaze';
export type HeadShape = 'round' | 'fluffy' | 'slim';
export type EarShape = 'normal' | 'small' | 'large';

export interface CatDesign {
  readonly id: string;
  readonly name: string;
  readonly fur: string;
  /** Outline and shading colour (darker fur). */
  readonly line: string;
  readonly muzzle: string;
  readonly innerEar: string;
  readonly nose: string;
  readonly eyes: EyeStyle;
  readonly iris?: string;
  readonly pattern: Pattern;
  /** Pattern colours (stripes, patches, points…). */
  readonly patternColors?: readonly string[];
  readonly head: HeadShape;
  readonly ears: EarShape;
  readonly wrinkles?: boolean;
  readonly blush?: string;
}

export interface CatCollection {
  readonly id: string;
  readonly name: string;
  readonly cats: readonly CatDesign[];
}
