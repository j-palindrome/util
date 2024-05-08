import { defineArrayMember, defineType, defineField } from 'sanity'

const rawAssetInfo = defineType({
  name: 'rawAssetInfo',
  type: 'object',
  fields: [
    defineField({
      type: 'slug',
      name: 'id',
      validation: rule => rule.required()
    }),
    defineField({
      type: 'string',
      name: 'assetType',
      options: { list: ['link', 'file'], layout: 'radio' },
      validation: rule => rule.required()
    }),
    defineField({
      type: 'file',
      name: 'uploadSource',
      hidden: context => {
        if (!context.parent) return false
        return context.parent['assetType'] !== 'file'
      },
      validation: rule =>
        rule.custom((value, context) => {
          return (context.parent as any)['assetType'] !== 'file' || value
            ? true
            : 'Please add a file.'
        })
    }),
    defineField({
      type: 'url',
      name: 'linkSource',
      hidden: context => {
        if (!context.parent) return false
        return context.parent['assetType'] !== 'link'
      },
      validation: rule =>
        rule.custom((value, context) => {
          return (context.parent as any)['assetType'] !== 'link' || value
            ? true
            : 'Please add a link.'
        })
    }),
    defineField({
      type: 'string',
      name: 'title',
      description:
        'If embedding, provides a heading title. If linking out, provides text for the button (default: "See more").'
    }),
    defineField({ type: 'text', name: 'description', rows: 3 })
  ],
  preview: {
    select: { title: 'id.current' }
  }
})

export default rawAssetInfo
