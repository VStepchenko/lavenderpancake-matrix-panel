import { test, expect } from '@grafana/plugin-e2e';

test('should change datetime format according to TimeUnit option value', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '3' });
  const options = panelEditPage.getCustomOptions('Matrix');

  const timeUnit = options.element.getByTestId('TimeUnit');
  await timeUnit.first().waitFor({ state: 'attached' }); 
  await timeUnit.fill('time:YYYY-MM-DD');

  const table = page.getByTestId('table');
  const rows = await table.locator('tr').all();
  const row2 = rows[2];
  const row9 = rows[9];

  await row2.waitFor({ state: 'attached' }); 
  await row9.waitFor({ state: 'attached' }); 

  await expect(row2).toContainText('2025-04-07');
  await expect(row9).toContainText('2025-04-08');
});

test('should remove totals from result when ShowTotals is not checked', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '3' });
  const options = panelEditPage.getCustomOptions('Matrix');

  const table = page.getByTestId('table');
  let rows = table.locator('tr');
  await rows.first().waitFor({ state: 'attached' }); 
  await expect(table).toContainText('Total');
  await expect(rows).toHaveCount(17);

  const showTotalsSwitch = options.getSwitch('ShowTotals');
  await showTotalsSwitch.uncheck();

  rows = table.locator('tr');
  await rows.first().waitFor({ state: 'attached' }); 
  await expect(rows).toHaveCount(10);
});

test('should have proper data', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '3' });
  const table = page.getByTestId('table');

  await expect(table.locator('tr')).toHaveCount(17);

  const matrixData: string[][] = [
    [  '', 'Beverages', 'Confections', 'Total'],
    [  'Chai',  'Steeleye Stout',  'Total',  'Maxilaku',  "Sir Rodney's Marmalade",  'Total',  ''],
    [  '1743958800000',  'East',  'Providence',  '5229',  '3408',  '8637',  '4021',  '4693',  '8714',  '17351'],
    [  'Wilton', '2055',  '6182',   '8237',  '2496',   '5846',  '8342',   '16579'],
    [  'Total', '7284',  '9590',  '16874',  '6517',  '10539',  '17056', '33930'],
    [  'South', 'Dallas',  '4213',  '2598',  '6811',  '2520',  '3401',  '5921',  '12732'],
    [  'Savannah', '3460',  '2733',     '6193',  '4461',     '4289',  '8750',     '14943'],
    [  'Total', '7673',  '5331',  '13004',  '6981',  '7690',  '14671', '27675'],
    [  'Total', '',  '14957', '14921',  '29878', '13498',  '18229', '31727',  '61605'],
    [  '1744045200000',  'East',  'Providence',  '3717',  '3186',  '6903',  '2982',  '3035',  '6017',  '12920'],
    [  'Wilton', '6422',  '7378',   '13800',  '3467',   '2999',  '6466',   '20266'],
    [  'Total', '10139',  '10564', '20703',  '6449',  '6034',  '12483', '33186'],
    [  'South', 'Dallas',  '3377',  '3125',  '6502',  '2573',  '3903',  '6476',  '12978'],
    [  'Savannah', '5585',  '2989',     '8574',  '2683',     '6183',  '8866',     '17440'],
    [  'Total', '8962',  '6114',  '15076',  '5256',  '10086',  '15342', '30418'],
    [  'Total', '',  '19101', '16678',  '35779', '11705',  '16120', '27825',  '63604'],
    [  'Total', '',  '',      '34058',  '31599', '65657',  '25203', '34349',  '59552', '125209'],
  ];

  const rowsLocator = table.locator('tr');
  await expect(rowsLocator).toHaveCount(17);
  const rows = await rowsLocator.all();

  for (const [index, item] of rows.entries()) {
    const rowLocator = item.locator('td');
    await rowLocator.first().waitFor({ state: 'attached' }); 
    expect(rowLocator).toHaveText(matrixData[index]);
  }

});