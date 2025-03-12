import GroupBuilder from './GroupBuilder'

export abstract class FontBuilder {
  abstract letters: Record<string, (g: GroupBuilder) => GroupBuilder>
}
