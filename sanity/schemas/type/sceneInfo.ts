import { defineType, defineField, defineArrayMember } from 'sanity'

const sceneInfo = defineType({
  name: 'sceneInfo',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string'
    }),
    defineField({
      name: 'subtitle',
      type: 'text'
    }),
    defineField({
      name: 'highlightedWorks',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [
            {
              type: 'work'
            }
          ]
        })
      ]
    })
  ]
})

export default sceneInfo
