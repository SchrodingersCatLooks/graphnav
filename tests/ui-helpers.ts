import { expect, type Page } from '@playwright/test';

export async function closeTools(page: Page) {
  const close = page.getByRole('button', { name: 'Close tools', exact: true });
  if (await close.isVisible()) await close.click();
}
export async function tools(page: Page, name: 'Sources' | 'Add idea' | 'More' | 'AI' | 'Connect') {
  if (name === 'AI') { await newAiGraph(page); return; }
  if (name !== 'More') await editGraph(page);
  if (name === 'Connect') {
    await closeTools(page);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.getByRole('button', { name: 'Choose by name', exact: true }).click();
  } else {
    const button = page.getByRole('button', { name, exact: true });
    if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  }
}
export async function selectNode(page: Page, name: string) {
  if (await page.locator('.graphnav-editor.embedded').count()) await tools(page, 'More');
  await page.locator('.node-list').getByRole('button', { name, exact: true }).click();
}
export async function mapOptions(page: Page) {
  const details = page.locator('.map-options');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
export async function panelSettings(page: Page) {
  const details = page.locator('.panel-settings');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
export async function blankMap(page: Page, title: string) {
  await page.getByRole('button', { name: 'New graph', exact: true }).click();
  await page.getByRole('button', { name: 'Manually', exact: true }).click();
  await page.getByLabel('New map name', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Create map', exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
  await tools(page, 'Sources');
}

export async function editGraph(page: Page) {
  const button = page.getByRole('button', { name: 'Edit graph', exact: true });
  if (await button.isVisible()) await button.click();
}
export async function newAiGraph(page: Page, title = 'AI exploration') {
  await page.getByRole('button', { name: 'New graph', exact: true }).click();
  await page.getByRole('button', { name: 'With AI', exact: true }).click();
  await page.getByLabel('New map name', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Continue with AI', exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
}
export async function restoreMap(page: Page, id: string) {
  await tools(page, 'More');
  await page.getByLabel('Open a map', { exact: true }).selectOption(id);
  await expect(page.locator('.save-state')).toHaveText('Saved locally');
}
export async function currentMapId(page: Page) {
  await tools(page, 'More');
  const id = await page.getByLabel('Open a map', { exact: true }).inputValue();
  await closeTools(page);
  return id;
}
