import { defineType, defineField } from 'sanity'

const settings = defineType({
  name: 'settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteTitle',
      type: 'string'
    }),
    defineField({
      name: 'inspiration',
      type: 'text',
      description:
        "Tell me about what you're looking for out of this website. This is just for ideas, it won't be displayed on the site."
    }),
    defineField({
      name: 'backgroundColor',
      type: 'color',
      options: {
        disableAlpha: true
      }
    }),
    defineField({
      name: 'backgroundAltColor',
      type: 'color',
      options: {
        disableAlpha: true
      }
    }),
    defineField({
      name: 'foregroundColor',
      type: 'color',
      options: {
        disableAlpha: true
      }
    }),
    defineField({
      name: 'accentColor',
      type: 'color',
      options: {
        disableAlpha: true
      }
    }),
    defineField({
      name: 'accentAltColor',
      type: 'color',
      options: {
        disableAlpha: true
      }
    }),
    defineField({
      name: 'bodyFont',
      type: 'fontInfo',
      description: (
        <div>
          The font for body text (descriptions and paragraphs). See{' '}
          <a href='https://fonts.google.com' target='_blank'>
            Google Fonts
          </a>{' '}
          for a free library.
        </div>
      )
    }),
    defineField({
      name: 'headingFont',
      type: 'fontInfo',
      description: (
        <div>
          The font for headings. See{' '}
          <a href='https://fonts.google.com' target='_blank'>
            Google Fonts
          </a>{' '}
          for a free library.
        </div>
      )
    })
  ]
})

export default settings
