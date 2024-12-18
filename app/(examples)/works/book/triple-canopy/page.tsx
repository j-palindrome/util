import SanityImageWrapper from '@/components/SanityImageWrapper'
import Section from '@/components/Section'
import Sources from './sources'

export default function Page() {
  return (
    <>
      <Section>
        <h1>Triple Canopy</h1>
        <p className='italic'>an experiment in Internet publishing</p>
      </Section>
      <Section>
        <p>
          In this paper, I will address the magazine Triple Canopy and how they
          blend a philosophy of integrated reading into their organizational
          structure. Eschewing a prevalent form of online litmag or performance
          venue, Triple Canopy believes in "publishing systems that incorporate
          networked forms of production and circulation." They advocate an
          extended philosophy of reading that extends into digital mediums,
          gallery spaces, and performances, including their two-day symposium at
          Roulette from Nov 1-2. In my research, I will investigate modes in
          which "networked" publishing can exist in New York and beyond: how can
          we connect digital realms with physical performance spaces, and use
          them for postcolonial research? Furthermore, what are the economics
          and audience of this practice, and why advocate for a blended approach
          in publishing? In particular, I plan to format the paper as a digital
          experience on my website, using custom HTML with integrated
          audiovisuals and interactivity.
        </p>
        <div className='relative'>
          <p className='cover dropShadow bg-black/80 text-h4'>
            What can the online magazine do for how we read and analyze?
          </p>
          <SanityImageWrapper
            className='w-full'
            id={'image-750d66b1afe7b099ac58ad186af0b2ca8538f35e-1262x480-png'}
          />
        </div>
      </Section>
      <Section>
        <p>
          I'm interested in this because of the capacity to create
          more-than-texts with the Internet: sound, image, text. This is a rich
          area for growth and development.
        </p>
      </Section>

      <Sources />

      <Section>
        <h2>A History of Internet Publications</h2>
        <p>
          The question is this: how can code be made more accessible? The
          "publication format" of code and APIs.{' '}
        </p>
        <h3>WordPress</h3>
        <h3>Contemporary page-builders: SquareSpace</h3>
        <h3>Next.js, Remix, and more Flexible Formats</h3>
        <h3>Livecoding formats: Hydra, TidalCycles</h3>
      </Section>
      <h1>A History of Triple Canopy's publication styles</h1>
      <Section fullWidth>
        <h2>The Archive</h2>
        <iframe
          src='https://canopycanopycanopy.com/search?ui.canopy=true'
          className='w-full h-[90vh]'></iframe>
      </Section>
      <Section>
        <h2>Publication Styles</h2>
        <a
          className='text-h2 heading'
          href='https://canopycanopycanopy.com/contents/scheming-on-a-thing?tcapi:has_content_type=tc:contenttype_bber'
          target='_blank'>
          BB-er
        </a>
        <p>
          B-ber is an open-source framework for creating and circulating
          publications as websites, EPUBs, books, and other formats. B-ber also
          functions as a browser-based EPUB reader, which explains the name. For
          more on the rationale and functionality of B-ber, read “Working on Our
          Thoughts.”
        </p>
        <h2>Alongslide</h2>
        <p>
          "Alongslide is a responsive, horizontally oriented presentation
          framework for longform reading on the web that retains the integrity
          of visual layouts across a broad spectrum of browsing environments.
          Utilizing a lightweight templating syntax for Markdown, Alongslide
          enables editors to produce projects along with designers, writers, and
          artists. The framework integrates new forms of reading, viewing, and
          listening online by situating these disparate modalities within a
          continuous content space."
        </p>
        <h2>Horizonize</h2>
        <p>
          "Horizonize is an article-layout system that jettisons the page—the
          basis for Triple Canopy‘s previous system—in favor of a smaller
          structural unit, the column. The system is an effort to capitalize on
          tensions between media environments, and an argument for the
          high-resolution reading and viewing experience."
        </p>
        <h2>ALS</h2>
        <p>
          "ALS is Triple Canopy's first content presentation framework, and
          stands for article-layout system. When Triple Canopy debuted in 2008,
          the magazine traded the vertical scrolling that characterized most
          websites for layouts that were informed by two historical approaches
          to organizing information: the magazine page and the proto-browser
          application HyperCard."
        </p>
      </Section>
      <Section>
        <a
          href='https://canopycanopycanopy.com/contents/working-on-our-thoughts?q=working%20on%20our%20thoughts'
          className='h2'>
          Working on Our Thoughts
        </a>
        <iframe
          width='100%'
          height='600'
          src='https://github.com/triplecanopy/b-ber'>
          GitHub source code
        </iframe>
        <ul>
          <li>
            " The decisions to follow or contest these systems—and invent new
            ones—are made by writers as well as editors, designers, and
            publishers, who share a sense of how the architecture of a text
            affects its meaning. In contrast, the semantic markup of HTML and
            the CSS and JavaScript, which underlie everything that is read on
            screens, are not often part of the process of writing or editing (or
            even understood by anyone involved in the publishing process besides
            the designers and developers who are asked to reckon with Word
            documents and folders of media assets)."
          </li>
          <li>
            "As Nietzsche remarked in an 1882 letter, after he got an early
            typewriter, “Our writing tools are also working on our thoughts.”3"
          </li>
          <li>
            "In 2016, we began devising a system for publishing digital and
            printed books from the same source materials. We were initially
            motivated by practical concerns: regardless of format, the text and
            media that make up a book are similar, and we wanted to consolidate
            rather than devise separate workflows for each medium."
          </li>
          <li>
            "B-ber’s architecture allows for the styles included in each theme
            to be “scoped” to different build types. In other words, the text
            and media treatments for an EPUB can differ from those for a
            browser-based version of the same publication. Existing themes,
            developed by Triple Canopy, include combinations of styles,
            typefaces, and media layouts."
          </li>
          <li>
            "By offering high-level design flexibility and format-specific
            customization, B-ber enables authors, editors, designers, and
            technologists to simultaneously consider the ideal manifestation of
            a publication and the multiplicity of scenarios in which it will be
            encountered."
          </li>
        </ul>
      </Section>
      <Section>
        <h2>An Analysis of Form</h2>
        <ul>
          <li>
            BBer combines page-based approaches with flexible layout systems to
            allow for a presentation of BOTH print and web-based texts.
          </li>
          <li>
            N. Katherine Hayles,{' '}
            <i>My Mother Was a Computer: Digital Subject and Literary Texts</i>
          </li>
        </ul>
      </Section>
      <Section>
        <h2>My B-ber Experiment</h2>
        <p>
          I created a custom document in B-ber to test its capacities and
          limitations.
        </p>
      </Section>
      <Section>
        <h2>Electronic Writing: Custom Approaches</h2>
        <h2>Asemic</h2>
        <ul>
          <li>
            <i>Asemic</i> is a Markdown specification I created to facilitate my
            own publishing projects.
          </li>
        </ul>
      </Section>
    </>
  )
}
