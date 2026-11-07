import { solutionToCells } from './board';
import { LogicState, nextStep, UnitTables, type LogicStep, type UnitRef } from './logic';
import { describeRegionPosition } from './regions';
import type { CellIndex, Puzzle } from './types';

export type HintLevel = 1 | 2 | 3;

export type HintKind = 'wrong-cat' | 'wrong-x' | 'deduction' | 'reveal' | 'solved';

export interface Hint {
  readonly level: HintLevel;
  readonly kind: HintKind;
  readonly message: string;
  /** Cells to spotlight on the board. */
  readonly cells: readonly CellIndex[];
  /** Units (row / column / region) to spotlight. */
  readonly units: readonly UnitRef[];
  /** Level 3: cat to place. */
  readonly place?: CellIndex;
  /** Level 3: wrong cat or wrong cross to remove. */
  readonly remove?: CellIndex;
  /** Technique of the underlying deduction, when relevant. */
  readonly technique?: LogicStep['technique'];
}

export interface HintContext {
  readonly puzzle: Puzzle;
  readonly cats: readonly CellIndex[];
  readonly crosses: readonly CellIndex[];
  /** Optional naming of regions, e.g. "la région rose". */
  readonly regionName?: (regionId: number) => string;
}

function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one;
}

function listFr(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/**
 * Logic-based hints, never random. They are built from the human deduction
 * engine (levels 1–2) and from the unique solution (level 3).
 */
export function getHint(ctx: HintContext, level: HintLevel): Hint {
  const { puzzle } = ctx;
  const layout = { size: puzzle.size, regions: puzzle.regions };
  const solutionCells = solutionToCells(puzzle.size, puzzle.solution);
  const solutionSet = new Set(solutionCells);
  const regionLabel = (id: number): string => {
    const base = ctx.regionName ? ctx.regionName(id) : `la région n°${id + 1}`;
    return `${base} ${describeRegionPosition(layout, id)}`;
  };
  const unitLabel = (u: UnitRef): string =>
    u.kind === 'region' ? regionLabel(u.index) : u.kind === 'row' ? `la ligne ${u.index + 1}` : `la colonne ${u.index + 1}`;
  const regionOf = (cell: CellIndex): number => puzzle.regions[cell] as number;

  // 1. A cat that is not part of the solution blocks any logical progress.
  const wrongCat = ctx.cats.find((c) => !solutionSet.has(c));
  if (wrongCat !== undefined) {
    const reg: UnitRef = { kind: 'region', index: regionOf(wrongCat) };
    if (level === 1)
      return { level, kind: 'wrong-cat', message: `Un de tes chats n'est pas à sa place. Vérifie ${regionLabel(reg.index)}.`, cells: [], units: [reg] };
    if (level === 2)
      return { level, kind: 'wrong-cat', message: 'Ce chat-ci est mal placé : avec lui, la grille ne peut pas être terminée.', cells: [wrongCat], units: [reg] };
    return { level, kind: 'wrong-cat', message: 'Ce chat était mal placé, je le retire.', cells: [wrongCat], units: [reg], remove: wrongCat };
  }

  // 2. A cross on a cell that must hold a cat.
  const wrongCross = ctx.crosses.find((c) => solutionSet.has(c));
  if (wrongCross !== undefined) {
    const reg: UnitRef = { kind: 'region', index: regionOf(wrongCross) };
    if (level === 1)
      return { level, kind: 'wrong-x', message: `Une de tes croix est de trop dans ${regionLabel(reg.index)}.`, cells: [], units: [reg] };
    if (level === 2)
      return { level, kind: 'wrong-x', message: 'Cette croix cache en réalité l’emplacement d’un chat.', cells: [wrongCross], units: [reg] };
    return { level, kind: 'wrong-x', message: 'Je retire cette croix : un chat doit aller ici.', cells: [wrongCross], units: [reg], remove: wrongCross };
  }

  const missing = solutionCells.filter((c) => !ctx.cats.includes(c));
  if (missing.length === 0) {
    return { level, kind: 'solved', message: 'La grille est complète. Bravo !', cells: [], units: [] };
  }

  // 3. Next human deduction from the current position.
  const state = new LogicState(new UnitTables(layout));
  for (const cat of ctx.cats) state.place(cat);
  state.eliminate(ctx.crosses);
  const step = nextStep(state, 5);

  if (level === 3 || !step) {
    // Reveal: the cat the deduction points to, or the tightest missing one.
    let target: CellIndex | undefined;
    if (step?.place !== undefined) target = step.place;
    else if (step) {
      const unit = step.victim ?? step.sources[0] ?? step.targets[0];
      if (unit) target = missing.find((c) => state.t.unitOf(unit.kind, c) === unit.index);
    }
    target ??= [...missing].sort(
      (a, b) =>
        state.candidatesOf('region', regionOf(a)).length - state.candidatesOf('region', regionOf(b)).length,
    )[0] as CellIndex;
    const reg: UnitRef = { kind: 'region', index: regionOf(target) };
    return {
      level: 3,
      kind: 'reveal',
      message: `Le chat de ${regionLabel(reg.index)} se place ici.`,
      cells: [target],
      units: [reg],
      place: target,
      ...(step ? { technique: step.technique } : {}),
    };
  }

  const n = step.eliminate.length;
  const technique = step.technique;
  switch (technique) {
    case 'single': {
      const src = step.sources[0] as UnitRef;
      if (level === 1) {
        const what = src.kind === 'region' ? `Observe ${regionLabel(src.index)}.` : `Regarde ${unitLabel(src)}.`;
        return { level, kind: 'deduction', technique, message: `${what} Il ne reste plus qu’un seul emplacement possible.`, cells: [], units: [src] };
      }
      return {
        level,
        kind: 'deduction',
        technique,
        message: `Toutes les autres cases de ${unitLabel(src)} sont bloquées par un chat (même ligne, colonne, région ou case voisine). Il ne reste que celle-ci.`,
        cells: [step.place as CellIndex],
        units: [src],
      };
    }
    case 'confinement':
    case 'subset': {
      const sources = step.sources;
      const targets = step.targets;
      const k = sources.length;
      const srcText = listFr(sources.map(unitLabel));
      const kindWord = (kind: UnitRef['kind'], many: boolean): string =>
        kind === 'row' ? (many ? 'lignes' : 'ligne') : kind === 'column' ? (many ? 'colonnes' : 'colonne') : many ? 'régions' : 'région';
      const tgtKind = targets[0]?.kind ?? 'row';
      if (level === 1) {
        const msg =
          k === 1
            ? `Observe ${srcText} : toutes ses cases possibles sont dans la même ${kindWord(tgtKind, false)}.`
            : `Observe ${srcText} : à ${plural(k, 'elle', 'elles')} ${k}, leurs cases possibles n’occupent que ${k} ${kindWord(tgtKind, true)}.`;
        return { level, kind: 'deduction', technique, message: msg, cells: [], units: sources };
      }
      const tgtText = listFr(targets.map(unitLabel));
      const msg =
        k === 1
          ? `Le chat de ${srcText} sera forcément dans ${tgtText}. ${plural(n, 'La case marquée est donc impossible', `Les ${n} cases marquées sont donc impossibles`)}.`
          : `Les ${k} chats de ${srcText} occuperont forcément ${tgtText}. Aucun autre chat ne peut y aller : ${plural(n, 'la case marquée est impossible', `les ${n} cases marquées sont impossibles`)}.`;
      return { level, kind: 'deduction', technique, message: msg, cells: step.eliminate, units: [...sources, ...targets] };
    }
    case 'blocker':
    case 'trial': {
      const victim = step.victim;
      const pivot = step.pivot as CellIndex;
      if (level === 1) {
        const msg =
          technique === 'blocker' && victim
            ? `Observe ${unitLabel(victim)} et les cases qui l’entourent : l’une d’elles la bloquerait complètement.`
            : 'Essaie un raisonnement par l’absurde : une case de la grille mène à une impasse.';
        return { level, kind: 'deduction', technique, message: msg, cells: [], units: victim ? [victim] : [] };
      }
      const msg =
        technique === 'blocker' && victim
          ? `Un chat sur cette case empêcherait ${unitLabel(victim)} d’accueillir son chat. Elle est donc impossible.`
          : victim
            ? `Si un chat était placé ici, en poursuivant la logique, ${unitLabel(victim)} n’aurait plus aucune case disponible. Cette case est donc impossible.`
            : 'Si un chat était placé ici, la grille deviendrait impossible à terminer. Cette case est donc impossible.';
      return { level, kind: 'deduction', technique, message: msg, cells: [pivot], units: victim ? [victim] : [] };
    }
  }
}
