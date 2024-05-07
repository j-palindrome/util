import { defineArrayMember, defineField, defineType } from 'sanity'

const service = defineType({
  name: 'service',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string'
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      validation: rule => rule.required(),
      options: {
        source: 'title',
        maxLength: 32
      }
    }),
    defineField({
      name: 'order',
      type: 'number'
    }),
    defineField({
      name: 'scenes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'sceneInfo'
        })
      ]
    })
  ]
})

export default service
