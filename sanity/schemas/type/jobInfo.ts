import { defineType } from 'sanity'
const jobInfo = defineType({
  type: 'object',
  name: 'jobInfo',
  fields: [
    { name: 'Company', type: 'string', validation: rule => rule.required() },
    { name: 'Role', type: 'string', validation: rule => rule.required() },
    { name: 'startDate', type: 'date', validation: rule => rule.required() },
    { name: 'endDate', type: 'date' },
    {
      name: 'description',
      type: 'array',
      of: [
        {
          type: 'text',
          options: {
            lines: 3
          }
        }
      ],
      validation: rule => rule.required()
    },
    {
      name: 'highlightedProjects',
      type: 'reference',
      to: {
        type: 'work'
      }
    },
    {
      name: 'category',
      type: 'reference',
      to: {
        type: 'category'
      }
    }
  ]
})

export default jobInfo
