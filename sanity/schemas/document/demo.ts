import { defineArrayMember, defineField, defineType } from 'sanity'

const demo = defineType({
  name: 'demo',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: rule => rule.required()
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      validation: Rule => Rule.required(),
      options: {
        source: 'title',
        maxLength: 96
      }
    }),
    defineField({
      name: 'files',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'rawAssetInfo'
        })
      ]
    }),
    defineField({
      name: 'images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image'
        })
      ]
    })
  ]
})

export default demo
