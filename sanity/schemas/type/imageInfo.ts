import { defineField, defineType } from 'sanity'

const imageInfo = defineType({
  name: 'imageInfo',
  type: 'image',
  options: {
    hotspot: true
  },

  fields: [
    defineField({
      type: 'string',
      name: 'alt',
      description: 'Text for sight-impaired visitors.',
      validation: rule => rule.required()
    }),
    defineField({
      type: 'string',
      name: 'photoCredit'
    })
  ]
})

export default imageInfo
