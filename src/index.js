import fs from 'fs'
import sharp from 'sharp'

// For counting test-case img index
let globalN = 0
const folder = 'processed-img'
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder)
}

export default async function sliderCaptchaRecognizer(
  bigImage,
  smallImage,
  n
) {
  const [bigImageBuffer, smallImageBuffer] = [
    bigImage,
    smallImage,
  ].map((image) => Buffer.from(image, 'base64'))
  const [bigImageSharp, smallImageSharp] = [
    sharp(bigImageBuffer).ensureAlpha(1),
    sharp(smallImageBuffer).ensureAlpha(1),
  ]

  const [
    { data: bigImageData, info: bigImageMetaInfo },
    { data: smallImageData, info: smallImageMetaInfo },
  ] = [
    await bigImageSharp
      .raw()
      .toBuffer({ resolveWithObject: true }),
    await smallImageSharp
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]

  // Pure white (255, 255, 255) pixel's coordinates
  const sliderBoundaries = []
  traverseArrayBuffer(
    smallImageData,
    smallImageMetaInfo,
    ([[x, y], [r, g, b]]) => {
      if (r === 255 && g === 255 && b === 255) {
        sliderBoundaries.push([x, y])
      }
    }
  )

  // Race match boudaries, accumulating differences, recording x-axis offset
  let bestMatchResult = [Infinity, 0]
  for (
    let offset = 0;
    offset <=
    bigImageMetaInfo.width - smallImageMetaInfo.width;
    offset++
  ) {
    const deltaWithWhite = sliderBoundaries
      .map(([x, y]) => {
        const index =
          4 * (y * bigImageMetaInfo.width + x + offset)
        return [0, 1, 2]
          .map((i) => 255 - bigImageData[index + i])
          .reduce((acc, cur) => acc + cur, 0)
      })
      .reduce((acc, cur) => acc + cur, 0)
    if (deltaWithWhite < bestMatchResult[0]) {
      bestMatchResult = [deltaWithWhite, offset]
    }
  }

  // The moving distance is determined by the left border of the slider
  const movePercent =
    bestMatchResult[1] / bigImageMetaInfo.width

  if (process.env.SAVE_IMG) {
    sharp(bigImageData, { raw: bigImageMetaInfo })
      .composite([
        {
          input: smallImageData,
          top: 0,
          left: argMin,
          raw: smallImageMetaInfo,
        },
      ])
      .toFile(`${folder}/${n ?? ++globalN}-combined.png`)
  }
  return movePercent
}

function traverseArrayBuffer(
  imageData,
  { width, height },
  callback
) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = 4 * (y * width + x)
      callback([
        [x, y],
        [0, 1, 2].map((i) => imageData[idx + i]),
      ])
    }
  }
}
