"use client";
import Background from "@/libs/asemic/src/Background";
import LineBrush from "@/libs/asemic/src/LineBrush";
import { TextureLoader } from "three";
import { Asemic, AsemicCanvas } from "@/libs/asemic/src/Asemic";
import img1 from "./assets/img1.png";
import img10 from "./assets/img10.png";
import img11 from "./assets/img11.png";
import img12 from "./assets/img12.png";
import img2 from "./assets/img2.png";
import img3 from "./assets/img3.png";
import img4 from "./assets/img4.png";
import img5 from "./assets/img5.png";
import img6 from "./assets/img6.png";
import img7 from "./assets/img7.png";
import img8 from "./assets/img8.png";
import img9 from "./assets/img9.png";
import "../../tailwind.css";
import { useEffect, useState } from "react";

function App() {
  let [textures, setTextures] = useState();
  useEffect(() => {
    const newTextures = [
      img1,
      img2,
      img3,
      img4,
      img5,
      img6,
      img7,
      img8,
      img9,
      img10,
      img11,
      img12,
    ].map((tex) => new TextureLoader().load(tex.src));
    setTextures(newTextures);
  }, []);

  return (
    textures && (
      <>
        <AsemicCanvas>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[0]} />
                <LineBrush
                  onInit={(g) =>
                    g.newText("a\nmans\nface").setCurves("all", {
                      left: 0,
                      middle: 0.75 * h,
                      width: 0.5,
                    })
                  }
                ></LineBrush>
                <LineBrush
                  renderInit
                  maxLength={5}
                  onInit={(g) =>
                    g
                      .newText("mouth", {
                        scale: (g.time % 1) + 0.01,
                        thickness: g.getRange((g.time % 1) ** 2, [1, 100]),
                      })
                      .setCurves("all", { center: 0.5, middle: 0.5 * h })
                  }
                ></LineBrush>
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[1]} />
                <LineBrush
                  renderInit
                  onInit={(g) =>
                    g
                      .newText(
                        "gaping at\nthe camera",
                        {
                          reset: true,
                          thickness: () =>
                            g.getRange(
                              g.noise([g.hash(), g.time], { advance: false }),
                              [1, 10],
                            ),
                          alpha: () =>
                            g.noise([g.hash(), g.time], { advance: false }),
                        },
                        {},
                        (i) =>
                          g.transform({
                            rotate:
                              g.noise([i * 100, g.time * 0.5], {
                                signed: true,
                              }) * 0.01,
                          }),
                      )
                      .setCurves("new", {
                        width: 0.8,
                        center: 0.5,
                        middle: 0.5 * h,
                      })
                  }
                />
                <LineBrush
                  onInit={(g) =>
                    g
                      .newText(
                        "as if a tiger were\n     taking the moon down",
                        {
                          reset: true,
                          thickness: 5,
                        },
                      )
                      .setCurves("new", { width: 0.7, top: 0.2 })
                  }
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[2]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "joy",
                      {
                        thickness: () => g.getRandomWithin(5, 15),
                        scale: 0.5,
                      },
                      {
                        top: 0.85 * h,
                        center: 0.5,
                        width: 0.5,
                      },
                      (i) =>
                        g.transform({
                          translate: [0, g.getWaveNoise(1) * 0.1],
                        }),
                    )

                      .newText(
                        "of being seen",
                        {
                          reset: true,
                          thickness: () => g.getRange(g.hash(), [1, 10]),
                        },
                        { width: 0.5, middle: 0.2, left: 0.12 },
                      );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[3]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "and",
                      { thickness: () => g.getRange(g.hash(), [1, 10]) },
                      { center: 0.46, middle: 0.78 * h, width: 0.5 },
                    ).newText(
                      "seeing oneself",
                      { thickness: 1 },
                      { center: 0.5, width: 0.9, middle: 0.2 },
                      (i) =>
                        g
                          .transform({
                            translate: [1, 0],
                            push: true,
                            reset: "pop",
                          })
                          .transform({
                            scale: [
                              1,
                              g.getWave(1, { signed: true }) * (i % 2 ? -1 : 1),
                            ],
                          }),
                    );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[4]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "and being unseen",
                      {
                        color: [0, 0, 0],
                        thickness: 5,
                        alpha: () => g.noise([0, g.time]) * 0.25,
                      },
                      { center: 0.5, middle: 0.25 * h, width: 0.5 },
                    );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[5]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "but what if the posterity of the camera self isolates\n                      behind that hall of mirrors",
                      { thickness: 3 },
                      { left: 0, middle: 0.1, width: 0.9 },
                    )
                      .newText(
                        "and the annotations on what we sought are the\n      reflections of",
                        { reset: true, thickness: 3 },
                        { left: 0.3, width: 0.7, middle: 0.9 * h },
                      )
                      .newText(
                        "ourselves",
                        {
                          alpha: () => g.getWaveNoise(1, {}),
                          thickness: 15,
                        },
                        { middle: 0.5 * h, center: 0.5, width: 1 },
                        () =>
                          g.transform({
                            scale: g.getRange(g.getWaveNoise(1), [0.5, 1.5]),
                          }),
                      );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[6]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "worth being decided already",
                      {},
                      { width: 0.8, middle: 0.2, left: 0 },
                      (i) => {
                        if (Math.random() < 0.2 && i) {
                          g.transform({ translate: [0, 0.2] });
                        }
                      },
                    );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[7]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "and an expanded field of motion",
                      { thickness: g.getRange(g.getWave(1), [1, 5]) },
                      { width: 0.9, middle: 0.2 * h, center: 0.5 },
                      () =>
                        g.transform({
                          translate: [g.getRange(g.getWave(1), [-0.5, 1]), 0],
                        }),
                    );
                  }}
                />
              </>
            )}
          </Asemic>
          <Asemic>
            {({ h }) => (
              <>
                <Background map={textures[8]} />
                <LineBrush
                  renderInit
                  onInit={(g) => {
                    g.newText(
                      "to dissolve at the\n   center of the\n     frame",
                      {
                        alpha: () => g.noise([g.time, 0]),
                        thickness: 5,
                        scale: 1 / 15,
                      },
                      { middle: 0.5 * h, center: 0.5 },
                      () =>
                        g.transform({
                          scale: g.getRange(g.getWave(1), [0.8, 1]),
                        }),
                    );
                  }}
                />
              </>
            )}
          </Asemic>
          {/* <Asemic>
          {({ h }) => (
            <>
              <Background map={textures[9]} />
              <LineBrush onInit={g => {}} />
            </>
          )}
        </Asemic>
        <Asemic>
          {({ h }) => (
            <>
              <Background map={textures[10]} />
              <LineBrush onInit={g => {}} />
            </>
          )}
        </Asemic>
        <Asemic>
          {({ h }) => (
            <>
              <Background map={textures[11]} />
              <LineBrush onInit={g => {}} />
            </>
          )}
        </Asemic>
        <Asemic>
          {({ h }) => (
            <>
              <Background map={textures[12]} />
              <LineBrush onInit={g => {}} />
            </>
          )}
        </Asemic> */}
        </AsemicCanvas>
      </>
    )
  );
}

export default App;
