import Section from '@/components/Section'
import ViewButton from '@/components/ViewButton'
import Image from 'next/image'
import aliceTierney from './assets/alice-tierney.webp'
import candidePoster from './assets/candide-poster.webp'
import newKindOrchestra from './assets/new-kind-orchestra.webp'
import professionalDevelopment from './assets/professional-development.webp'
import quote1 from './assets/quote-4.png'
import timara1 from './assets/timara-1.png'
import timara2 from './assets/timara-2.png'

export default function Communications() {
  const posterData = [
    {
      title: 'Conducting at Oberlin',
      href: 'https://www.oberlin.edu/news/conducting-oberlin',
      text: `What we see a conductor do during a performance is just the tip of the iceberg—the real work starts years before. When Maurice Cohn ’17 stepped off the plane to conduct the Cincinnati Symphony, he had only a few days to prepare. Strikes in France had grounded the orchestra’s regular maestro, Louis Langrée, and Cohn, 27, had been offered an opportunity to fill in for the performance of "Also sprach Zarathustra" by Richard Strauss.`,
      photo: candidePoster
    },
    {
      title: 'A New Kind of Orchestra at Oberlin',
      href: 'https://www.oberlin.edu/news/new-kind-orchestra-oberlin',
      text: `An orchestra is about to perform. The hall falls quiet. What do you expect will happen next? It\'s probably not what Weedie Braimah, leader of Oberlin\'s new Djembe Orchestra, has in mind. His orchestra is a circle of thirty or so students, each with a drum held between their knees, playing a dense polyrhythmic song and singing in call-and-response. At the center is Braimah, a legendary Djembefola (Djembe player), whose ambition is to teach his students a new way of understanding music.`,
      photo: newKindOrchestra
    },
    {
      title: 'Alice Tierney',
      href: 'https://www.oberlin.edu/news/oberlin-opera-theater-presents-world-premiere-alice-tierney-jan-27-29-0',
      text: `When composer Melissa Dunphy started construction on her new house, she had no idea she would dig up the inspiration for an opera. But upon excavating the foundation of the site, a defunct magic theater in Philadelphia, she discovered two toilet pits from the 1700s filled with hundreds of ceramic pieces, animal bones, and artifacts from before the Revolutionary War—some of national significance. And when the intrigued composer began tracking the history of the site, she discovered a dark secret: in 1880, newspapers reported the death of a mysterious woman, discovered hung upside down on the fence. At the time, authorities dismissed her death as an accident, describing her as a “dissipated woman” and supposing that she tried to climb the fence, got herself tangled up in her own petticoats, and strangled herself. “Which is, like, ridiculous,” says Dunphy, who collaborated with her friend, playwright Jacqueline Goldfinger, to reimagine this woman's story.`,
      photo: aliceTierney
    },
    {
      title: 'Candide',
      href: 'https://www.oberlin.edu/news/oberlin-opera-theater-presents-candide-march-9-12',
      text: `Candide, or Optimism, was first published anonymously in 1759 by Voltaire, constituting the French satirist's response to the tragedy of an earthquake that practically destroyed Lisbon, and questioning the prevailing philosophy of the time that we live in “the best of all possible worlds.” Voltaire's message was just as relevant in the 1950s, when Leonard Bernstein turned the novel into an operetta in collaboration with Lillian Hellman, John LaTouche, and Richard Wilbur; and Candide continues to be a touchstone for comic opera today.`,
      photo: candidePoster
    },
    {
      title: 'Take it For Granted',
      href: 'https://www.oberlin.edu/news/take-it-granted',
      text: `Internal funding opportunities—along with the practiced guidance of professional development faculty and staff—help Oberlin Conservatory students bring their projects and ambitions to life. As the excitement of the school year begins, it can seem like Oberlin is so full of opportunities that it's hard to remember them all. But there are a few that you may not have heard about yet, and that you surely don't want to miss: funding! Oberlin students are brimming with creative ideas and aspirations, and part of a complete education is being able to bring these ideas to fruition. That's where the Office of Conservatory Professional Development comes in.`,
      photo: professionalDevelopment
    }
  ]

  const socialData = [
    {
      src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fposts%2Fpfbid025KuUJz9xst9pViKvAh8eJc7rVYqwr2yrny7Nd3xhgkqAxrA3Cy8KhJixAVpZ3zs6l&show_text=true&width=500',
      height: 788
    },
    {
      src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fposts%2Fpfbid0s6avzf9m7u6mZ5bSnJ5FEdviR8mhET8tn9FoRkjKSWYCLQowRqFouRBAycL55mUnl&show_text=true&width=500',
      height: 769
    },
    {
      src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fposts%2Fpfbid02ZdfJ1h5w4SUHo5jjQbfqFSHZJDxkAbuUc4aGd8Su7ZhqZH1xpMbQqqPyq7nniCQ9l&show_text=true&width=500',
      height: 757
    },
    {
      src: 'https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fvideos%2F261957202876644%2F&show_text=true&width=560&t=0',
      height: 314
    },
    {
      src: 'https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fvideos%2F406293638383073%2F&show_text=true&width=264&t=0',
      height: 476,
      width: 264
    },
    {
      src: 'https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fvideos%2F1629060527491485%2F&show_text=true&width=560&t=0',
      height: 314
    },
    {
      src: 'https://www.facebook.com/plugins/video.php?height=448&href=https%3A%2F%2Fwww.facebook.com%2Foberlincon%2Fvideos%2F473932521462444%2F&show_text=true&width=560&t=0',
      height: 563
    }
  ]
  return (
    <>
      <Section>
        <h1 className='text-h1 text-center'>Jay Reinier</h1>
        <Divider />
        <h2 className='text-h2 text-center'>Web Design</h2>

        <h2 className='text-h3 text-center'>
          Electronic Music at Oberlin: A Brief History
        </h2>
        <video
          src={'/timara-cover.webm'}
          muted
          loop
          autoPlay
          className='w-full'
        />
        <img src={timara1.src} />
        <img src={timara2.src} />
        <img src={quote1.src} />
        <ViewButton href='https://timara.oberlin.edu/history/'>
          View full article
        </ViewButton>
        <Divider />
        <h2 className='text-h2 text-center'>Video & Graphics</h2>
        <div>
          <h3 className='text-center pt-8'>Grants at Oberlin</h3>
          <iframe
            className='w-full aspect-video'
            src='https://www.youtube.com/embed/reXPIl8gee8?si=t00Ibbnm29GmoF7V'
            title='YouTube video player'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            referrerPolicy='strict-origin-when-cross-origin'
            allowFullScreen></iframe>
        </div>
        <div>
          <h3 className='text-center pt-8'>
            "Bitumine:" Performance Documentation
          </h3>
          <iframe
            allowFullScreen
            src='https://player.vimeo.com/video/928647990?h=a6b93e7719&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479&amp;wmode=opaque'
            data-embed='true'
            title='vimeo-player'
            className='w-full aspect-video'></iframe>
        </div>
        <Divider />
        <h2 className='text-h2 text-center'>Social Media & Marketing</h2>
        <div className='overflow-y-hidden overflow-x-auto flex h-[600px] w-full *:flex-none'>
          {socialData.map(x => (
            <div className='px-2' key={x.src}>
              <iframe src={x.src} width={x.width ?? 500} height='100%' />
            </div>
          ))}
        </div>
        <Divider />
        <h2 className='text-h2 text-center'>Copywriting</h2>
        <div>
          {posterData.map(x => (
            <div className='w-full pt-8' key={x.href}>
              <div className='w-full'>
                <h2 className='text-3xl text-center'>
                  <a href={x.href}>{x.title}</a>
                </h2>
              </div>
              <div className='w-full md:flex'>
                <div className='md:w-1/3 flex-none relative overflow-hidden md:pr-2'>
                  <div className='h-full w-full relative'>
                    <Image
                      {...x.photo}
                      alt='image'
                      className='h-full w-full object-cover'
                    />
                  </div>
                </div>
                <div className='md:w-2/3 flex-none md:pl-2'>
                  <p>{x.text}</p>
                  <div className='w-full flex justify-end'>
                    <button>
                      <a href={x.href} target='__blank'>
                        read more
                      </a>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function Divider() {
  return (
    <div className='py-8'>
      <hr className='border-gray-400' />
    </div>
  )
}
