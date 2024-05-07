import { defineField, defineType } from 'sanity'

const category = defineType({
  name: 'category',
  title: 'Categories',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string'
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      validation: Rule => Rule.required(),
      options: {
        source: 'title',
        maxLength: 32
      }
    }),
    defineField({
      name: 'description',
      type: 'description'
    })
  ]
})

export default category
