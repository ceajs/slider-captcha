# Silder Captcha Recognition Helper for [Cea][cea]

No need for the original image, `@ceajs/slider-captcha` will get the slider target position by processing the slider background image [status: WIP]

```bash
npm i @ceajs/slider-captcha
```

# Demo

![demo gif](./demo.gif)

# Recognition Trustworthiness

Playwright test result(Tested by simulating the unified login of [hqu University][hqu]):

```bash
> npx playwright test

Running 10000 tests using 4 workers
  ...
  7801 passed (48m)
```

[cea]: https://github.com/ceajs/cea/issues/25
[hqu]: https://hqu.campusphere.net/portal/login
