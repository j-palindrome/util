import { FontBuilder } from '../builders/FontBuilder'
import GroupBuilder from '../builders/GroupBuilder'

export class DefaultFont extends FontBuilder {
  letters: Record<string, (g: GroupBuilder) => GroupBuilder> = {
    ' ': (g) => g.transform({ translate: [0.5, 0], reset: 'pop' }),
    '\t': (g) => g.transform({ translate: [2, 0], reset: 'pop' }),
    a: (g) =>
      g
        .newCurve([1, 1], [0.5, 1.3], [0, 0.5], [0.5, -0.3], [1, 0])
        .newCurve([0, 1, { translate: [1, 0] }], [-0.1, 0.5], [0, -0.3])
        .slide(0.1)
        .within([0, 0, { reset: 'pop' }], [0.5, 0.6], 2)
        .transform({ translate: [0.5, 0] }),
    b: (g) =>
      g
        .newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 1, { scale: [0.5, 0.5] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0],
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    c: (g) =>
      g
        .newCurve(
          [1, 0.75, { scale: [0.5, 0.5] }],
          [0.9, 1],
          [0, 1],
          [0, 0],
          [0.9, 0],
          [1, 1 - 0.75],
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 1)
        .transform({ translate: [0.5, 0] }),
    d: (g) =>
      g
        .newCurve([1, 1], [1, 0])
        .newCurve(
          [0, 1, { scale: [-0.5, 0.5], translate: [1, 0] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0],
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    e: (g) =>
      g
        .newCurve([0, 0.5], [1, 0.5])
        .newCurve([1, 0.5], [1, 1], [0, 1], [0, 0], [0.9, 0], [1, 0.2])
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    f: (g) =>
      g
        .newCurve([0, 0], [0, 1 / 2], [0, 1], [1 / 2, 1], [1 / 2, 0.75])
        .newCurve([0, 1 / 2], [1 / 2, 1 / 2])
        .slide(1 / 4)
        .within([0, 0, { reset: 'pop' }], [1 / 2, 1], 2)
        .transform({ translate: [0.35, 0] }),
    g: (g) =>
      g
        .newCurve(
          [0.5, 0.5],
          [0.5, 0],
          [0, 0],
          [0, 0.5],
          [0.3, 0.6],
          [0.5, 0.5],
        )
        .newCurve([0.5, 0.5], [0.5, 0], [0.5, -0.5], [0, -0.5], [0.05, -0.25])
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    h: (g) =>
      g
        .newCurve([0, 0], [0, 1])
        .newCurve([0, 0.6, { scale: [0.5, 0.7] }], [1, 1], [1, 0])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    i: (g) =>
      g
        .transform({ translate: [0.2, 0], push: true })
        .newCurve([0, 0], [0, 1, { scale: [1, 0.5] }])
        .newCurve(
          [0, 0, { reset: 'last', translate: [0, 0.52], scale: 0.05 / 0.5 }],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        )
        .transform({ reset: 'pop' })
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    j: (g) =>
      g
        .transform({ translate: [-0.25, 0], push: true })
        .newCurve(
          [0, 0, { translate: [1 - 0.4, 1], scale: [0.7, 1], rotate: 0.05 }],
          [0, -1],
          [-1, -1],
          [-1, -0.5],
        )
        .transform({ rotate: -0.05 })
        .newCurve(
          [
            0,
            0,
            {
              translate: [0, 0.2],
              scale: [0.1 / 2, 0.1],
            },
          ],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.25, 0], reset: 'pop' }),
    k: (g) =>
      g
        .newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 0, { translate: g.getIntersect(0.6), push: true }],
          [0.3, 0, { rotate: 0.15 }],
        )
        .newCurve([0, 0, { reset: 'pop' }], [0.3, 0, { reset: 'pop' }])
        .within([0, 0], [0.5, 1], 3)
        .transform({ translate: [0.5, 0] }),
    l: (g) =>
      g.newCurve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
        translate: [0.2, 0],
        reset: 'pop',
      }),
    m: (g) =>
      g
        .newCurve([0, 0, { scale: [0.5, 0.5] }], [0, 1], [1, 1], [1, 0])
        .newCurve([0, 0, { translate: [1, 0] }], [0, 1], [1, 1], [1, 0])
        .transform({ translate: [1, 0], reset: 'pop' }),
    n: (g) =>
      g
        .newCurve([0, 0, { scale: [0.5, 0.5] }], [0, 1], [1, 1], [1, 0])
        .transform({
          translate: [0.5, 0],
          reset: 'pop',
        }),
    o: (g) =>
      g
        .newCurve(
          [0, 0, { translate: [0.25, 0], scale: 0.5 }],
          [-0.5, 0],
          [-0.5, 1],
          [0.5, 1],
          [0.5, 0],
          [0, 0],
        )
        .transform({ reset: 'pop', translate: [0.5, 0] }),
    p: (g) =>
      g
        .newCurve([0, 0, { translate: [0, -0.5] }], [0, 1])
        .newCurve(
          [0, 1, { reset: 'last', scale: 0.5 }],
          [1, 1.3],
          [1, -0.3],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    q: (g) =>
      g
        .newCurve(
          [0, 1, { translate: [0, -0.5], push: true }],
          [0, 0, { strength: 1 }],
          [0.2, 0, { rotate: 0.15 }],
        )
        .newCurve(
          [0, 1, { reset: 'pop', scale: [0.5, 0.5], translate: [0, 0.5] }],
          [-1, 1.3],
          [-1, -0.3],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    r: (g) =>
      g
        .newCurve([0, 0], [0, 0.5])
        .newCurve(
          [0, 0, { translate: g.getIntersect(0.9) }],
          [0.25, 0.1],
          [0.5, 0],
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    s: (g) =>
      g
        .newCurve(
          [0.5, 1, { translate: [-0.1, 0], push: true }],
          [0.2, 1],
          [0.2, 0.6],
          [0.5, 0.6],
          [1, 0.6],
          [1, 0],
          [0, 0],
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 1)
        .transform({ translate: [0.45, 0], reset: 'pop' }),
    t: (g) =>
      g
        .newCurve([0, 0], [0, 1])
        .newCurve([0, 0, { translate: [0, 0.65], scale: [0.4, 1] }], [1, 0])
        .slide(0.5)
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    u: (g) =>
      g
        .newCurve(
          [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
          [0, -1],
          [1, -1],
          [1, 0],
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    v: (g) =>
      g
        .newCurve(
          [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
          [0.5, -1, { strength: 1 }],
          [1, 0],
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    w: (g) =>
      g
        .newCurve(
          [0, 0.5, { scale: [0.7, 1], strength: 1 }],
          [0.25, 0, { strength: 1 }],
          [0.5, 0.5, { strength: 1 }],
          [0.75, 0, { strength: 1 }],
          [1, 0.5, { strength: 1 }],
        )
        .transform({ translate: [0.7, 0], reset: 'pop' }),
    x: (g) =>
      g
        .newCurve([1, 1, { translate: [0.25, 0.25], scale: 0.25 }], [-1, -1])
        .newCurve([-1, 1], [1, -1])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    y: (g) =>
      g
        .newCurve([0, -1, { scale: [0.5, 0.5], translate: [-0.05, 0] }], [1, 1])
        .newCurve([0.5, 0], [0, 1])
        .transform({ translate: [0.55, 0], reset: 'pop' }),
    z: (g) =>
      g
        .newCurve(
          [0, 1, { scale: 0.5, strength: 1 }],
          [1, 1, { strength: 1 }],
          [0, 0, { strength: 1 }],
          [1, 0],
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
  }
}
