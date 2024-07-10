'use client'

import Section from '@/components/Section'
import Client from './client'

export type EmailData = {
  name: string
  email: string
  message: string
}

// function sendEmail(data: EmailData) {
//   const apiEndpoint = '/api/email'

//   fetch(apiEndpoint, {
//     method: 'POST',
//     body: JSON.stringify(data)
//   })
//     .then(res => res.json())
//     .then(response => {
//       alert(response.message)
//     })
//     .catch(err => {
//       alert(err)
//     })
// }

export default function Contact() {
  // async function onSubmit(event: FormEvent<HTMLFormElement>) {
  //   event.preventDefault()
  //   const formData = new FormData(event.currentTarget)
  //   const response = await fetch('/api/email', {
  //     method: 'POST',
  //     body: formData
  //   })

  //   const data = await response.json()
  //   console.log('data is', data)

  //   // sendEmail(data)
  // }

  return (
    <>
      <Client />
      <Section>
        <form>
          <div className='mb-5'>
            <label
              htmlFor='name'
              className='mb-3 block text-base font-medium text-black'>
              Full Name
            </label>
            <input
              type='text'
              placeholder='Full Name'
              className='w-full rounded-md border border-gray-300 bg-white py-3 px-6 text-base font-medium text-gray-700 outline-none focus:border-purple-500 focus:shadow-md'
              name='name'
            />
          </div>
          <div className='mb-5'>
            <label
              htmlFor='email'
              className='mb-3 block text-base font-medium text-black'>
              Email Address
            </label>
            <input
              type='email'
              placeholder='example@domain.com'
              className='w-full rounded-md border border-gray-300 bg-white py-3 px-6 text-base font-medium text-gray-700 outline-none focus:border-purple-500 focus:shadow-md'
              name='email'
            />
          </div>
          <div className='mb-5'>
            <label
              htmlFor='message'
              className='mb-3 block text-base font-medium text-black'>
              Message
            </label>
            <textarea
              rows={4}
              placeholder='Type your message'
              className='w-full resize-none rounded-md border border-gray-300 bg-white py-3 px-6 text-base font-medium text-gray-700 outline-none focus:border-purple-500 focus:shadow-md'
              name='message'></textarea>
          </div>
          <div>
            <button className='hover:shadow-form rounded-md bg-purple-500 py-3 px-8 text-base font-semibold text-white outline-none'>
              Submit
            </button>
          </div>
        </form>
      </Section>
    </>
  )
}
