import Builder from '../../../util/src/asemic/Builder'

export const slides: {
  asemic?: ((b: Builder) => Builder)[]
  slide?: JSX.Element
}[] = [
  {},
  // Rich Text, Poor Image
  {
    asemic: [
      b =>
        b.text('tree', {
          translate: [0.6, 0.5],
          scale: 0.5
        })
    ]
  },
  {
    asemic: [
      b =>
        b.text('tree', {
          translate: [0.6, 0.5],
          scale: 0.5,
          rotate: -0.25
        }),
      b =>
        b.repeat(
          b =>
            b
              .newGroup({
                translate: [Math.random() * 0.2 + 0.4, 0],
                reset: true,
                scale: [1, 0.5]
              })
              .newCurve([0, 0], [0, 1])
              .newCurve(
                [0, 0, { translate: [0, 1] }],
                [0, 1, { rotate: b.getRandomWithin(0, 0.25) }]
              ),
          10
        )
    ]
  },
  {
    asemic: [
      b =>
        b.text('taxonomy', {
          translate: [0.2, 0.1],
          scale: 0.6,
          rotate: 0.25
        }),
      b =>
        b.transform({ translate: [0, 1], scale: [1, -1], push: true }).repeat(
          b =>
            b
              .newGroup({
                reset: 'last',
                translate: [Math.random() * 0.2 + 0.4, 0],
                scale: [1, 0.5]
              })
              .newCurve([0, 0], [0, 1])
              .newCurve(
                [0, 0, { translate: [0, 1] }],
                [0, 1, { rotate: b.getRandomWithin(0, 0.25) }]
              ),
          10
        )
    ]
  },
  {
    asemic: [
      b =>
        b.text('field', {
          translate: [0.1, 0.1],
          scale: 0.9
        }),
      b =>
        b.text('free', {
          translate: [0.9, 0.9],
          scale: [-0.8, -0.9]
        }),
      b =>
        b
          .newGroup({
            reset: 'last',
            scale: 0.7,
            translate: [0.15, 0.15]
          })
          .newCurve()
          .repeat(
            b => b.newPoints(b.getRandomWithin([0.5, 0.5], [0.5, 0.5])),
            30
          )
          .set({ strength: 1 })
    ]
  },
  {
    // The freedom of the open consists neither in unfettered arbitrariness nor in the constraint of mere laws. Freedom is that which conceals in a way that opens to light, in whose lighting shimmers that veil that hides the essential occurrence of all truth and lets the veil appear as what veils. Freedom is the realm of the destining that at any given time starts a revealing on its way.
    // If we pay heed to this, something astounding strikes us: it is technology itself that makes the demand on us to think in another way what is usually understood by "essence." But in what way?
    // If we inquire step by step into what technology, represented as means, actually is, then we shall arrive at revealing. The possibility of all productive manufacturing lies in revealing.
    asemic: [
      b =>
        b.text('the open', {
          translate: [0.1, 0.5],
          scale: 0.8
        }),
      b =>
        b.text('revealing', {
          translate: [0.1, 0.1],
          rotate: 0.1,
          scale: 1.1
        }),
      b =>
        b
          .transform({ translate: [0.5, 0.5] })
          .repeat(
            () =>
              b
                .newGroup({ scale: b.getRandomWithin(0.8, 0.1) })
                .newCurve([-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]),
            10
          )
    ]
  },
  {
    // Edouard Glissant, "On Opacity"
    // If we examine the process of "understanding" people and ideas from the perspective of Western thought, we discover that its basis is this requirement for transparency.
    // Opacities can coexist and converge, weaving fabrics. To understand these truly one must focus on the texture of the weave and not on the nature of its components.
    // Death is the outcome of the opacities, and this is why the idea of death never leaves us.
    asemic: [
      b =>
        b.text('concealing', {
          translate: [0.1, 0.6],
          rotate: b.getRandomWithin(0.05, 0.01),
          scale: 0.9 * Math.random()
        }),
      b => b.text('transparency', { translate: [0, 0.5] }),
      b =>
        b.repeat(
          () =>
            b
              .newGroup({ translate: [0, 0.05 * Math.random()] })
              .newCurve([0, 0], [1, 0]),
          20
        )
    ]
  },
  {
    asemic: [
      b =>
        b.text('coding', {
          translate: [0.9, 0.9],
          scale: [-0.8, -0.9]
        }),
      b =>
        b.text(
          `Human beings, 
like any other component or 
   subsystem, must be
localized in a system architecture 
whose basic modes operation are
probabilistic, statistical. 
    No objects, spaces, or bodies are sacred
in themselves; any component 
can be interfaced with any other of the
proper standard, 
the proper code, can be constructed 
for processing
signals 
  in a common language.`,
          { translate: [0.1, 0.8], scale: 0.9 }
        ),
      b =>
        b.repeat(
          () =>
            b
              .newGroup()
              .newCurve(
                b.getRandomWithin([0.5, 0], [0.5, 0]),
                b.getRandomWithin([0.5, 1], [0.5, 0])
              ),
          10
        )
    ],
    slide: <></>
  },
  {
    // “Looking through these veils of race and gender but never being
    // fully seen myself, with limited reference points in the world
    // beyond, I was distanced from any accurate mirror. For my body, then,
    // subversion came via digital remix, searching for those sites of
    // experimentation where I could explore my true self, open and ready
    // to be read by those who spoke my language. Online, I sought to
    // become a fugitive from the mainstream, unwilling to accept its
    // limited definition of bodies like my own. What the world AFK offered
    // was not enough.”
    asemic: [
      b =>
        b.repeat(
          () =>
            b
              .newGroup()
              .newCurve(
                [0, Math.random()],
                [0.25, Math.random()],
                [0.5, Math.random()],
                [0.75, Math.random()],
                [1, Math.random()]
              ),
          3
        ),
      b =>
        b.text(
          `   become a fugitive
from the
mainstream`,
          { translate: [0.2, 0.8], scale: 0.7 }
        ),
      b =>
        b.text(
          `I wanted 
demanded 
more.`,
          { translate: [0, 0.5] }
        ),
      b =>
        b.text(
          `For my body then
subversion came 
via digital remix`,
          { translate: [0, 0.3], scale: 0.7 }
        )
    ]
  },
  {
    asemic: [
      b =>
        b
          .set({
            rotate: 0.25,
            translate: [1, 0]
          })
          .repeat(
            () =>
              b
                .newGroup()
                .newCurve(
                  [0, Math.random()],
                  [0.25, Math.random()],
                  [0.5, Math.random()],
                  [0.75, Math.random()],
                  [1, Math.random()]
                ),
            3
          ),
      b =>
        b.text(
          `where we could all finally be “freed” 
from the mores of gender`,
          { translate: [0.2, 0.9], scale: 0.8 }
        ),
      b =>
        b.text(
          `as dreamt of by
early cyberfeminists`,
          { translate: [0.2, 0.6], scale: 0.7 }
        ),
      b => b.text(`finally`, { translate: [0.2, 0.1], scale: 0.7 }),
      b =>
        b.text(`put into practice`, {
          translate: [0.1, 0.8],
          scale: 0.7,
          rotate: -0.1
        })
    ]
  },
  {
    asemic: [
      b =>
        b.repeat(
          b =>
            b
              .newGroup({ reset: true })
              .newCurve([0.5, 0.3], [Math.random(), 1]),
          10
        ),
      b =>
        b.text(
          `based on "relevance, which 
          represents some combination of the web page's 
presence in links 
          from other sites 
  and its popularity with 
users searching similar terms.`,
          { translate: [0, 0.7] }
        )
    ]
  },
  // based on "relevance, which represents some combination of the web page's presence in links from other sites and its popularity with users searching similar terms.
  // http://infolab.stanford.edu/~backrub/google.html
  // It makes especially heavy use of the additional structure present in hypertext to provide much higher quality search results. We chose our system name, Google, because it is a common spelling of googol, or 10100 and fits well with our goal of building very large-scale search engines.
  // Anyone who has used a search engine recently, can readily testify that the completeness of the index is not the only factor in the quality of search results. "Junk results" often wash out any results that a user is interested in.
  //  In particular, link structure [Page 98] and link text provide a lot of information for making relevance judgments and quality filtering. Google makes use of both link structure and anchor text.
  // The citation (link) graph of the web is an important resource that has largely gone unused in existing web search engines. We have created maps containing as many as 518 million of these hyperlinks, a significant sample of the total.
  // The probability that the random surfer visits a page is its PageRank. And, the d damping factor is the probability at each page the "random surfer" will get bored and request another random page.
  // PageRank handles both these cases and everything in between by recursively propagating weights through the link structure of the web.
  // Most search engines associate the text of a link with the page that the link is on. In addition, we associate it with the page the link points to.
  // Using anchor text efficiently is technically difficult because of the large amounts of data which must be processed. In our current crawl of 24 million pages, we had over 259 million anchors which we indexed.
  // For example, the standard vector space model tries to return the document that most closely approximates the query, given that both query and document are vectors defined by their word occurrence. On the web, this strategy often returns very short documents that are the query plus a few words.
  // Also, it is interesting to note that metadata efforts have largely failed with web search engines, because any text on the page which is not directly represented to the user is abused to manipulate search engines. There are even numerous companies which specialize in manipulating search engines for profit.
  // Fancy hits include hits occurring in a URL, title, anchor text, or meta tag. Plain hits include everything else. A plain hit consists of a capitalization bit, font size, and 12 bits of word position in a document
  // Fancy hits include hits occurring in a URL, title, anchor text, or meta tag. Plain hits include everything else. A plain hit consists of a capitalization bit, font size, and 12 bits of word position in a document
  // Any parser which is designed to run on the entire Web must handle a huge array of possible errors. These range from typos in HTML tags to kilobytes of zeros in the middle of a tag, non-ASCII characters, HTML tags nested hundreds deep, and a great variety of other errors that challenge anyone's imagination to come up with equally creative ones. For maximum speed, instead of using YACC to generate a CFG parser, we use flex to generate a lexical analyzer which we outfit with its own stack. Developing this parser which runs at a reasonable speed and is very robust involved a fair amount of work.
  // We designed our ranking function so that no particular factor can have too much influence. First, consider the simplest case -- a single word query. In order to rank a document with a single word query, Google looks at that document's hit list for that word. Google considers each hit to be one of several different types (title, anchor, URL, plain text large font, plain text small font, ...), each of which has its own type-weight. The type-weights make up a vector indexed by type. Google counts the number of hits of each type in the hit list. Then every count is converted into a count-weight. Count-weights increase linearly with counts at first but quickly taper off so that more than a certain count will not help. We take the dot product of the vector of count-weights with the vector of type-weights to compute an IR score for the document. Finally, the IR score is combined with PageRank to give a final rank to the document.
  {
    asemic: [
      b =>
        b.text(
          `Count-weights increase 
linearly with counts at first 
    but quickly taper off

so that more than a certain count 
          will not help`,
          { translate: [0.2, 0.9], scale: 0.8 }
        ),
      b =>
        b.repeat(
          b =>
            b
              .newGroup({ reset: true, translate: [0, Math.random()] })
              .newCurve([0, 0], [1, 0]),
          10
        )
    ]
  },
  {
    asemic: [
      b =>
        b.repeat(
          () =>
            b
              .newGroup({
                reset: true,
                translate: b.getRandomAlong([0, 0], [1, 1]),
                scale: b.getRandomWithin(0.2, 0.1)
              })
              .newCurve([-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]),
          10
        ),
      b =>
        b.text(
          `Any parser which is designed to run on the entire Web 
must handle a huge array of possible errors. These range from typos in HTML tags to 
kilobytes of zeros in the middle of a tag, non-ASCII characters, HTML tags nested hundreds 
deep, and a great variety of other errors that challenge anyone's imagination to 
come up with equally creative ones. For maximum speed, instead of using YACC to generate a CFG parser, 
we use flex to generate a lexical analyzer which we outfit with its own stack. Developing this parser 
which runs at a reasonable speed and is very 
robust involved a fair amount of work.`,
          { translate: [0, 0.8] }
        )
    ]
  }
]
