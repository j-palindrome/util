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
      type: 'string',
      description: (
        <div>
          The background color of your site. Copy the "Hex" from a color-picker
          such as{' '}
          <a href='https://htmlcolorcodes.com/color-picker/' target='_blank'>
            this one
          </a>
        </div>
      )
    }),
    defineField({
      name: 'backgroundAltColor',
      type: 'string',
      description: (
        <div>
          The alternate background color of your site. Copy the "Hex" from a
          color-picker such as{' '}
          <a href='https://htmlcolorcodes.com/color-picker/' target='_blank'>
            this one
          </a>
        </div>
      )
    }),
    defineField({
      name: 'foregroundColor',
      type: 'string',
      description: (
        <div>
          The foreground (text) color of your site. Copy the "Hex" from a
          color-picker such as{' '}
          <a href='https://htmlcolorcodes.com/color-picker/' target='_blank'>
            this one
          </a>
        </div>
      )
    }),
    defineField({
      name: 'accentColor',
      type: 'string',
      description: (
        <div>
          The accent color of your site, used for buttons and things that stand
          out. Copy the "Hex" from a color-picker such as{' '}
          <a href='https://htmlcolorcodes.com/color-picker/' target='_blank'>
            this one
          </a>
        </div>
      )
    }),
    defineField({
      name: 'accentAltColor',
      type: 'string',
      description: (
        <div>
          The alternate accent color of your site, used for alternate
          backgrounds and borders. Copy the "Hex" from a color-picker such as{' '}
          <a href='https://htmlcolorcodes.com/color-picker/' target='_blank'>
            this one
          </a>
        </div>
      )
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
