"use client";

import { useEffect, useRef } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
      "a-box": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
      "a-sphere": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
      "a-cylinder": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
      "a-plane": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
      "a-sky": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { children?: React.ReactNode };
    }
  }
}

export default function Page() {
  const scene = useRef(0);
  useEffect(() => {
    console.log(scene);
  }, []);

  return (
    <div className="">
      <h2>Response to Virtual Worlds</h2>
      <p>
        As a preface, this blog is mainly intended to support some
        interactivity, as the site is built in Next.js and I can use React-based
        components.
      </p>
      <p>
        In some way, it is a system in a virtual world, existing as language
        wrapped in code. I'm excited about that possibility.
      </p>
      <p>
        The 3d-renderings of worlds are beautiful objects designed to be
        explored with simple interaction. I think this concept can also be
        applied to a point-and-click style interface which is more of a 2d
        layout. How can text be rendered within virtual worlds, as overlays, as
        UIs, as floating signposts. I'm interested in how text gets layered onto
        virtual space.
      </p>
      <p>
        And what is the capacity for a world to exist in connection to the real?
        Like the people of <i>Peach Blossom Spring</i> who are living in their
        own time, an illusion of accessibility but an inability to find the
        pathway. We can enter these worlds so easily, but can we truly reach
        them?
      </p>
    </div>
  );
}
