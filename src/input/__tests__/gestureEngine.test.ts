import { describe, expect, it } from 'vitest';
import { GestureEngine, type GestureIntent, type Mark } from '../gestureEngine';

const N = 8;
const at = (r: number, c: number) => r * N + c;
/** Centre of a cell in grid units. */
const pt = (r: number, c: number) => ({ x: c + 0.5, y: r + 0.5 });

/** Minimal board that applies intents like the store does. */
function setup(doubleTapMs = 280) {
  const marks: Mark[] = new Array(N * N).fill('empty');
  const engine = new GestureEngine({ size: N, doubleTapMs }, (c) => marks[c] as Mark);
  const log: GestureIntent[] = [];
  const apply = (intents: GestureIntent[]) => {
    for (const it of intents) {
      log.push(it);
      if (it.type === 'cross-down') marks[it.cell] = 'cross';
      if (it.type === 'stroke') for (const c of it.cells) if (marks[c] === 'empty') marks[c] = 'cross';
      if (it.type === 'cross-off') marks[it.cell] = 'empty';
      if (it.type === 'double') marks[it.cell] = marks[it.cell] === 'cat' ? 'empty' : 'cat';
    }
  };
  let t = 1000;
  const tap = (r: number, c: number, gap = 400) => {
    t += gap;
    apply(engine.down(1, pt(r, c), t));
    t += 60;
    apply(engine.up(1, pt(r, c), t));
  };
  const drag = (path: { x: number; y: number }[], id = 2) => {
    t += 500;
    apply(engine.down(id, path[0]!, t));
    for (const p of path.slice(1)) {
      t += 16;
      apply(engine.move(id, p));
    }
    t += 16;
    apply(engine.up(id, path[path.length - 1]!, t));
  };
  return { engine, marks, log, apply, tap, drag, time: () => t, advance: (ms: number) => (t += ms) };
}

describe('Tap / double tap', () => {
  it('un tap pose une croix immédiatement (au contact)', () => {
    const s = setup();
    expect(s.engine.down(1, pt(2, 2), 0)).toEqual([{ type: 'cross-down', cell: at(2, 2) }]);
  });

  it('un tap sur une croix la retire', () => {
    const s = setup();
    s.tap(2, 2);
    expect(s.marks[at(2, 2)]).toBe('cross');
    s.tap(2, 2);
    expect(s.marks[at(2, 2)]).toBe('empty');
  });

  it('un double tap produit une intention « chat »', () => {
    const s = setup();
    s.tap(3, 3);
    s.tap(3, 3, 150);
    expect(s.log.filter((i) => i.type === 'double')).toEqual([{ type: 'double', cell: at(3, 3) }]);
    expect(s.marks[at(3, 3)]).toBe('cat');
  });

  it('un double tap trop lent = deux taps simples (croix puis plus de croix)', () => {
    const s = setup(280);
    s.tap(3, 3);
    s.tap(3, 3, 400);
    expect(s.log.some((i) => i.type === 'double')).toBe(false);
    expect(s.marks[at(3, 3)]).toBe('empty');
  });

  it('la fenêtre de double tap est réglable', () => {
    const s = setup(380);
    s.tap(1, 1);
    s.tap(1, 1, 350);
    expect(s.marks[at(1, 1)]).toBe('cat');
  });

  it('deux taps rapides sur deux cases différentes ne font pas de chat', () => {
    const s = setup();
    s.tap(1, 1);
    s.tap(1, 2, 100);
    expect(s.log.some((i) => i.type === 'double')).toBe(false);
    expect(s.marks[at(1, 1)]).toBe('cross');
    expect(s.marks[at(1, 2)]).toBe('cross');
  });

  it('un triple tap ne déclenche pas deux chats', () => {
    const s = setup();
    s.tap(4, 4);
    s.tap(4, 4, 100);
    s.tap(4, 4, 100);
    expect(s.log.filter((i) => i.type === 'double')).toHaveLength(1);
  });

  it('double tap sur un chat : intention de retrait', () => {
    const s = setup();
    s.marks[at(5, 5)] = 'cat';
    s.tap(5, 5);
    expect(s.marks[at(5, 5)]).toBe('cat'); // a single tap never touches a cat
    s.tap(5, 5, 100);
    expect(s.marks[at(5, 5)]).toBe('empty');
  });

  it('le second appui d’un double tap ne dessine jamais', () => {
    const s = setup();
    s.tap(0, 0);
    s.apply(s.engine.down(1, pt(0, 0), s.advance(100)));
    expect(s.engine.move(1, pt(0, 3))).toEqual([]);
  });

  it('un second doigt est ignoré pendant un geste', () => {
    const s = setup();
    s.engine.down(1, pt(0, 0), 0);
    expect(s.engine.down(9, pt(5, 5), 10)).toEqual([]);
  });
});

describe('Glisser pour poser des croix', () => {
  it('glisser sur 3 cases pose 3 croix', () => {
    const s = setup();
    s.drag([pt(2, 1), pt(2, 2), pt(2, 3)]);
    expect([at(2, 1), at(2, 2), at(2, 3)].map((c) => s.marks[c])).toEqual(['cross', 'cross', 'cross']);
    expect(s.marks.filter((m) => m === 'cross')).toHaveLength(3);
  });

  it('un glissement rapide sur 8 cases n’en oublie aucune (2 événements seulement)', () => {
    const s = setup();
    s.drag([pt(6, 0), pt(6, 7)]);
    for (let c = 0; c < 8; c++) expect(s.marks[at(6, c)]).toBe('cross');
  });

  it('glissement rapide en diagonale : toutes les cases traversées', () => {
    const s = setup();
    s.drag([{ x: 0.2, y: 0.2 }, { x: 7.8, y: 7.8 }]);
    for (let i = 0; i < 8; i++) expect(s.marks[at(i, i)]).toBe('cross');
  });

  it('une case n’est traitée qu’une fois par glissement (allers-retours)', () => {
    const s = setup();
    s.drag([pt(1, 0), pt(1, 3), pt(1, 0), pt(1, 3)]);
    const strokes = s.log.filter((i) => i.type === 'stroke').flatMap((i) => (i.type === 'stroke' ? i.cells : []));
    expect(new Set(strokes).size).toBe(strokes.length);
  });

  it('glisser sur un chat ne le remplace pas', () => {
    const s = setup();
    s.marks[at(3, 2)] = 'cat';
    s.drag([pt(3, 0), pt(3, 4)]);
    expect(s.marks[at(3, 2)]).toBe('cat');
    expect(s.marks[at(3, 4)]).toBe('cross');
  });

  it('glisser ne retire jamais une croix et ne produit jamais de chat', () => {
    const s = setup();
    s.marks[at(0, 2)] = 'cross';
    s.drag([pt(0, 0), pt(0, 5)]);
    expect(s.marks[at(0, 2)]).toBe('cross');
    expect(s.log.some((i) => i.type === 'double' || i.type === 'cross-off')).toBe(false);
  });

  it('un glissement qui part d’une croix la conserve', () => {
    const s = setup();
    s.tap(4, 0);
    s.drag([pt(4, 0), pt(4, 2)]);
    expect([0, 1, 2].map((c) => s.marks[at(4, c)])).toEqual(['cross', 'cross', 'cross']);
  });

  it('sortir de la grille ne provoque ni erreur ni croix hors grille', () => {
    const s = setup();
    expect(() => s.drag([pt(0, 6), { x: 12, y: -5 }, { x: -3, y: 20 }, pt(7, 7)])).not.toThrow();
    expect(s.marks).toHaveLength(N * N);
    expect(s.marks[at(0, 6)]).toBe('cross');
  });

  it('appuyer hors de la grille ne fait rien', () => {
    const s = setup();
    expect(s.engine.down(1, { x: -1, y: 3 }, 0)).toEqual([]);
    expect(s.engine.busy).toBe(false);
  });

  it('un tremblement dans la même case reste un tap', () => {
    const s = setup();
    s.drag([{ x: 2.3, y: 2.3 }, { x: 2.6, y: 2.4 }, { x: 2.4, y: 2.7 }]);
    s.tap(2, 2, 100);
    expect(s.marks[at(2, 2)]).toBe('cat');
  });

  it('un glissement n’ouvre pas de double tap', () => {
    const s = setup();
    s.drag([pt(5, 0), pt(5, 2)]);
    s.tap(5, 2, 50);
    expect(s.log.some((i) => i.type === 'double')).toBe(false);
  });

  it('annulation du pointeur : le geste se termine proprement', () => {
    const s = setup();
    s.engine.down(3, pt(1, 1), 0);
    expect(s.engine.cancel(3)).toEqual([{ type: 'end' }]);
    expect(s.engine.busy).toBe(false);
  });
});
