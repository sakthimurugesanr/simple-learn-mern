import { test, expect } from '@playwright/test';
test('browse, filter, save and add a variant to the guest bag', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: 'Good things, for every day.' })).toBeVisible();
  await page.goto('/shop?category=dresses');
  await expect(page.getByRole('heading', { name: 'Dresses', exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'View The Sunday Linen Dress', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'The Sunday Linen Dress', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).first().click();
  await page.goto('/cart');
  await expect(page.getByText('The Sunday Linen Dress', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(page.getByRole('link', { name: 'Sign in to continue' })).toBeVisible();
});
test('seeded customer completes COD order', async ({ page }) => {
  test.skip(!process.env.E2E_PASSWORD, 'Requires migrated and seeded API plus E2E_PASSWORD');
  await page.goto('/auth/login');
  await page.getByLabel('Email address').fill('user@aurel.local');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/account/);
  await page.goto('/shop?category=dresses');
  await page
    .getByRole('link', { name: 'View The Sunday Linen Dress', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).first().click();
  await page.goto('/checkout');
  for (const [label, value] of Object.entries({
    'Full name': 'Test Buyer',
    'Mobile number': '9876543210',
    'Address line 1': '123 Test Road',
    City: 'Chennai',
    State: 'Tamil Nadu',
    Pincode: '600001',
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.getByRole('button', { name: 'Review your order' }).click();
  await page.getByRole('button', { name: 'Place your order' }).click();
  await expect(page.getByRole('heading', { name: 'Something good is on its way.' })).toBeVisible();
});
