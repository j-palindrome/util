import { defineConfig, loadEnv } from 'vite'

loadEnv('', '..')
console.log(process.env)

export default defineConfig({})
