import { AboutQueryResult, SocialsQueryResult } from '@/sanity/sanity-types'

export default function Socials({ socials }: { socials: SocialsQueryResult }) {
  return (
    <>
      <div className='flex space-x-2'>
        {socials?.socials?.map(social => {
          const socialLogos = {
            Facebook: '/img/facebook-logo.svg',
            Instagram: '/img/instagram-logo.svg',
            X: '/img/x-logo.svg',
            SoundCloud: '/img/soundcloud-logo.svg',
            Bandcamp: '/img/bandcamp-logo.svg'
          }

          const socialLinks = {
            SoundCloud: 'https://soundcloud.com/$HANDLE$',
            X: 'https://x.com/$HANDLE$',
            Instagram: 'https://instagram.com/$HANDLE$',
            Facebook: 'https://facebook.com/$HANDLE$',
            Bandcamp: 'https://$HANDLE$.bandcamp.com/'
          }

          return (
            <a
              href={socialLinks[social.Site!].replace(
                '$HANDLE$',
                social.Handle!
              )}
              key={social._key}
              target='_blank'
              className='invert w-10 h-10 drop-shadow-xl'>
              <img src={socialLogos[social.Site!]} className='w-full h-full' />
            </a>
          )
        })}
      </div>
    </>
  )
}
