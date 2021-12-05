import fs from 'fs'
import sharp from 'sharp'
import opencv from 'opencv-wasm'
const { cv } = opencv

const THRESH_TRUNC = 242

export default async function sliderCaptchaRecognizer(
  bigImage,
  smallImage,
  n
) {
  const pngBufBig = Buffer.from(bigImage, 'base64')
  const pngBufSmall = Buffer.from(smallImage, 'base64')

  const templImgIns = sharp(pngBufSmall).ensureAlpha()

  const { data: captchaImg, info: captchaImgInfo } =
    await sharp(pngBufBig)
      .ensureAlpha()
      .threshold(THRESH_TRUNC)
      .raw()
      .toBuffer({ resolveWithObject: true })
  const { data: templImg, info: templImgInfo } = await (
    await cropSlider(
      templImgIns,
      await templImgIns.metadata()
    )
  )
    .threshold(THRESH_TRUNC)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const srcProcessed = new cv.matFromImageData({
    ...captchaImgInfo,
    data: captchaImg,
  })
  const templProcessed = new cv.matFromImageData({
    ...templImgInfo,
    data: templImg,
  })

  const mask = new cv.Mat()

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
    movePercent = matchOriginPoint[0] / captchaImgInfo.width
    if (process.env.SAVE_IMG) {
      printRec(
        srcProcessed,
        templProcessed,
        matchOriginPoint
      )
    }
  } else {
    return
  }

  if (process.env.SAVE_IMG) {
    saveProcessedImg(srcProcessed, {
      ...captchaImgInfo,
      fileName: `${n}-srcProcessed.png`,
    })
    saveProcessedImg(templProcessed, {
      ...templImgInfo,
      fileName: `${n}-templProcessed.png`,
    })
  }

  return movePercent
}

async function cropSlider(imageIns, imageInfo) {
  const { width, height } = imageInfo
  const data = await imageIns.raw().toBuffer()

  let cropY = 0
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const idx = 4 * (r * width + c)
      const rgba = [
        data[idx],
        data[idx + 1],
        data[idx + 2],
        data[idx + 3],
      ]

      const isNotTransparent = rgba.some((e) => e !== 0)
      if (isNotTransparent) {
        cropY--
        r = height
        break
      }
    }
    cropY++
  }
  const croppedIns = imageIns.extract({
    left: 0,
    top: cropY,
    width: width,
    height: width,
  })

  return croppedIns
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

function saveProcessedImg(processedMat, info) {
  const folder = 'processed-img'
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder)
  }
  sharp(Buffer.from(processedMat.data), {
    raw: {
      ...info,
    },
  }).toFile(`${folder}/${info.fileName}`)
}
