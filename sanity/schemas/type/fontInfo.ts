import { defineType, defineField } from 'sanity'

const fontInfo = defineType({
  type: 'object',
  name: 'fontInfo',
  fields: [
    defineField({
      name: 'name',
      type: 'string'
    }),
    defineField({
      name: 'linkType',
      type: 'string',
      options: { list: ['link', 'file'], layout: 'radio' }
    }),
    defineField({
      type: 'file',
      name: 'uploadSource',
      hidden: context => {
        return context.parent?.['linkType'] !== 'file'
      },
      validation: rule =>
        rule.custom((value, context) =>
          context.parent?.['linkType'] !== 'file' || value
            ? true
            : 'Please add a file.'
        )
    }),
    defineField({
      type: 'url',
      name: 'linkSource',
      hidden: context => {
        console.log('context', context)

        return context.parent?.['linkType'] !== 'link'
      },
      validation: rule =>
        rule.custom((value, context) =>
          context.parent?.['linkType'] !== 'link' || value
            ? true
            : 'Please add a link.'
        )
    })
  ]
})

export default fontInfo
