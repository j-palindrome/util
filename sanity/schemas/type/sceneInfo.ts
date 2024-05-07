import { defineType, defineField } from 'sanity'

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
        {
          type: 'reference',
          to: [
            {
              type: 'work'
            }
          ]
        }
      ]
    })
  ]
})

export default sceneInfo
