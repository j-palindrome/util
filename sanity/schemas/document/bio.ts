import { defineField, defineType } from 'sanity'

const bio = defineType({
  name: 'bio',
  title: 'Bio',
  type: 'document',
  fields: [
    defineField({
      name: 'bio',
      type: 'description',
      validation: rule => rule.required()
    }),
    defineField({
      name: 'headshot',
      type: 'image',
      validation: rule => rule.required()
    }),
    defineField({
      name: 'resume',
      type: 'array',
      of: [{ type: 'jobInfo' }]
    })
  ],
  preview: {
    select: {
      title: 'Bio'
    }
  }
})

export default bio
