import Jimp from 'jimp'
import opencv from 'opencv-wasm'
import path from 'path'
import { fileURLToPath } from 'url'

const { cv } = opencv
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
)

export async function findMovePercent(
  bigImage,
  smallImage,
  n
) {
  const pngBufBig = Buffer.from(bigImage, 'base64')
  const pngBufSmall = Buffer.from(smallImage, 'base64')

  const captchaImg = (
    await Jimp.read(pngBufBig)
  ).grayscale()

  const templImg = (
    await Jimp.read(
      path.resolve(__dirname, '../template.png')
    )
  ).resize(
    (await Jimp.read(pngBufSmall)).getWidth(),
    Jimp.AUTO
  )

  const src = new cv.matFromImageData(captchaImg.bitmap)
  const templ = new cv.matFromImageData(templImg.bitmap)

  const [srcProcessed, templProcessed] = [
    new cv.Mat(),
    new cv.Mat(),
  ]

  const mask = new cv.Mat()

  cv.threshold(
    src,
    srcProcessed,
    241,
    255,
    cv.THRESH_BINARY
  )
  cv.threshold(
    templ,
    templProcessed,
    60,
    255,
    cv.THRESH_BINARY
  )

  const matchResult = new cv.Mat()
  cv.matchTemplate(
    srcProcessed,
    templProcessed,
    matchResult,
    cv.TM_CCOEFF_NORMED,
    mask
  )
  matchResult.convertTo(matchResult, cv.CV_8UC1)
  const [contours, hierarchy] = [
    new cv.MatVector(),
    new cv.Mat(),
  ]
  cv.findContours(
    matchResult,
    contours,
    hierarchy,
    cv.RETR_CCOMP,
    cv.CHAIN_APPROX_SIMPLE
  )

  let movePercent
  if (contours.size()) {
    const matchOriginPoint = contours.get(0).data32S
    movePercent =
      matchOriginPoint[0] / captchaImg.getWidth()
  } else {
    console.error(
      `Error: Recognizing slider ${n ?? 'test'}`
    )
  }

  return movePercent
}

function printRec(srcProcessed, templProcessed, point) {
  const x = point[0]
  const y = point[1]
  const color = new cv.Scalar(0, 255, 0, 255)
  const pointA = new cv.Point(x, y)
  const pointB = new cv.Point(
    x + templProcessed.cols,
    y + templProcessed.rows
  )
  cv.rectangle(
    srcProcessed,
    pointA,
    pointB,
    color,
    2,
    cv.LINE_8,
    0
  )
}
