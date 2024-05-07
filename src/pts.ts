import { Group, Pt } from 'pts'

export const groupList = (list: number[], group: number) => {
  const newList: number[][] = []
  for (let i = 0; i < list.length; i += group) {
    newList.push(list.slice(i, i + group))
  }
  return newList
}

export const createGroup = (list: number[], size: number) => {
  return Group.fromArray(groupList(list, size))
}
