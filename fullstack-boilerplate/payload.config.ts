import { buildConfig } from 'payload/config'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { viteBundler } from '@payloadcms/bundler-vite'
import Users from './cms/collections/Users'
import path from 'path'

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: viteBundler(),
    vite: incomingViteConfig => {
      const existingAliases = incomingViteConfig?.resolve?.alias || {}
      let aliasArray: { find: string | RegExp; replacement: string }[] = []

      // Pass the existing Vite aliases
      if (Array.isArray(existingAliases)) {
        aliasArray = existingAliases
      } else {
        aliasArray = Object.values(existingAliases)
      }

      // Add your own aliases using the find and replacement keys
      // remember, vite aliases are exact-match only
      // aliasArray.push({
      //   find: '../hooks/resize-images',
      //   replacement: path.resolve(__dirname, './mock.js')
      // })

      return {
        ...incomingViteConfig,
        resolve: {
          ...(incomingViteConfig?.resolve || {}),
          alias: aliasArray
        }
      }
    }
  },
  editor: lexicalEditor({}),
  db: mongooseAdapter({
    url: process.env.MONGODB_URI ?? false
  }),
  collections: [Users],
  typescript: {
    outputFile: path.resolve(__dirname, 'cms/payload-types.ts')
  },
  upload: {
    limits: {
      fileSize: 5000000 // 5MB, written in bytes
    }
  }
})
