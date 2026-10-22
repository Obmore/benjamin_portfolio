import { expect, test, type Locator, type Page } from '@playwright/test'

const DEMO = '/demos/lapszabaszat/'
const CONFIRM = /lecseréli a most kitöltött adatokat/

// Each entry is one thing a visitor can type or pick before pressing "Kitöltési példa".
// The sample overwrites every one of them, so every one of them has to trigger the prompt.
const field = (page: Page, key: string): Locator => page.locator(`.item [data-key="${key}"]`).first()
const EDITS: Array<[string, (page: Page) => Promise<unknown>]> = [
  ['customer', (page) => page.locator('#customer').fill('Kiss Béla')],
  ['contact', (page) => page.locator('#contact').fill('kiss@example.com')],
  ['billing', (page) => page.locator('#billing').fill('1111 Budapest, Fő utca 1.')],
  ['material', (page) => page.locator('#material').fill('Tölgy')],
  ['project', (page) => page.locator('#project').fill('Konyha')],
  ['due', (page) => page.locator('#due').fill('2030-01-31')],
  ['delivery', (page) => page.locator('#delivery').selectOption('igen')],
  ['board', (page) => field(page, 'board').fill('BL-9')],
  ['note', (page) => field(page, 'note').fill('Polc')],
  ['length', (page) => field(page, 'length').fill('800')],
  ['width', (page) => field(page, 'width').fill('300')],
  ['quantity', (page) => field(page, 'qty').fill('4')],
  ['rotate', (page) => field(page, 'rotate').check()],
  ['thin edge count', (page) => field(page, 'thinLong').selectOption('2')],
  ['thin edge code', (page) => field(page, 'thinCode').fill('K-12')],
  ['thick edge count', (page) => field(page, 'thickShort').selectOption('1')],
  ['thick edge code', (page) => field(page, 'thickCode').fill('ABS-3')],
]

function watchDialogs(page: Page, accept = false) {
  const messages: string[] = []
  page.on('dialog', (dialog) => {
    messages.push(dialog.message())
    void (accept ? dialog.accept() : dialog.dismiss())
  })
  return messages
}

test.describe('lapszabaszat demo sample button', () => {
  test('an untouched form loads the sample without asking', async ({ page }) => {
    const dialogs = watchDialogs(page)
    await page.goto(DEMO)
    await page.locator('#sample').click()
    await expect(page.locator('#customer')).toHaveValue('Minta Megrendelő')
    await expect(page.locator('.item')).toHaveCount(2)
    expect(dialogs).toEqual([])
  })

  for (const [name, edit] of EDITS) {
    test(`asks before replacing an entered ${name}`, async ({ page }) => {
      const dialogs = watchDialogs(page)
      await page.goto(DEMO)
      await edit(page)
      await page.locator('#sample').click()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0]).toMatch(CONFIRM)
      // Declining keeps the visitor's own work.
      await expect(page.locator('#customer')).not.toHaveValue('Minta Megrendelő')
      await expect(page.locator('.item')).toHaveCount(1)
    })
  }

  test('accepting the prompt replaces the entered data with the sample', async ({ page }) => {
    const dialogs = watchDialogs(page, true)
    await page.goto(DEMO)
    await page.locator('#contact').fill('kiss@example.com')
    await page.locator('#sample').click()
    expect(dialogs).toHaveLength(1)
    await expect(page.locator('#contact')).toHaveValue('minta@example.com')
    await expect(page.locator('.item')).toHaveCount(2)
  })
})
