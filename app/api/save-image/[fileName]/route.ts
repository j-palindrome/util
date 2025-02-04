import { writeFile, writeFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(
  request: Request,
  params: Promise<{ params: { fileName: string } }>
) {
  try {
    const {
      params: { fileName }
    } = await params

    const dataURL = await request.text()
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')
    const filePath = `./output/${fileName}.png` // Specify the file path

    const p = path.resolve(process.cwd(), filePath)
    // console.log(filePath, p)
    writeFileSync(p, base64Data, { encoding: 'base64' })
    return new NextResponse('File saved successfully')
  } catch (error) {
    console.error('Error writing file:', error)
    return new NextResponse('Error saving file', { status: 500 })
  }
}
