import { expect, test } from '@playwright/test'
import sliderCaptchaRecognizer from './src/index.js'

const peakTestInterval = 1000

test.describe.parallel('Verify Captcha', () => {
  for (let i = 0; i < peakTestInterval; i++) {
    test(`Verify Captcha ${i}`, async ({ page }) => {
      await page.goto(
        'https://hqu.campusphere.net/portal/login'
      )

      await page.click('#casLoginForm>p>input')

      await page.fill('#casLoginForm>p>input', '1')

      await page.click('#casLoginForm>p:nth-child(2)>input')

      await page.fill(
        '#casLoginForm>p:nth-child(2)>input',
        '1'
      )

      await page.click(
        '#casLoginForm>p:nth-child(4)>button'
      )

      // Get Captcha
      const response = await page.waitForResponse(
        '**/sliderCaptcha.do**'
      )
      const data = await response.json()
      const movePercent = await sliderCaptchaRecognizer(
        data.bigImage,
        data.smallImage,
        i.toString()
      )

      const url = `http://id.hqu.edu.cn/authserver/verifySliderImageCode.do?canvasLength=280&moveLength=${Math.floor(
        (movePercent ?? 0) * 280
      )}`

      const verifyRes = await page.goto(url)
      if (verifyRes.ok) {
        const data = await verifyRes.json()
        data.url = url
        expect(data.code).toBe(0)
      }

      await page.close()
    })
  }
})
