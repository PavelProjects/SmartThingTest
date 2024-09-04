import { expect, test } from '@playwright/test';

test.beforeEach('Open control panel', async ({ page }) => {
  await page.goto("/");
})

test('Information tab', async ({ page }) => {
  let toastId = 0;
  const respInfo = page.waitForResponse((response) => response.url().endsWith("/info/system"));
  await page.getByTestId("info").click();
  await expect(page.getByTestId("info-content")).toBeVisible();

  await respInfo;
  await expect(page.locator(".field-container").getByRole("heading"), "Information fields present")
    .toHaveText(["Device name", "save", "Device type", "Platform", "Firmware version", "Chip model", "Chip revision"]);

  const nameInput = page.getByTestId("device-name");
  const saveBtn = page.getByTestId("save-device-name");
  
  await nameInput.clear();
  await saveBtn.click();
  await expect(page.getByTestId("toast-" + toastId++ + "-caption"), "Name can't be empty")
    .toHaveText("Device name can't be empty!");

  const name = "autotest_" + Math.floor(Math.random() * 100);
  await nameInput.fill(name);

  const response = page.waitForResponse((response) => response.url().endsWith("/info/system"));
  await saveBtn.click();
  expect((await response).ok()).toBeTruthy();;

  await expect(page.getByTestId("toast-" + toastId++ + "-description"), "Name updated")
    .toHaveText("New device name: " + name);
});

test('Actions and states tab', async ({ page }) => {
  const statesItem = page.getByTestId('states');
  const actionsItem = page.getByTestId('actions');

  await statesItem.click();
  const actionsResp = page.waitForResponse((response) => response.url().endsWith("/actions"));
  await actionsItem.click();
  await actionsResp;

  const actionsStates = [
    {
      action: "led_on",
      state: "on"
    },
    {
      action: "led_off",
      state: "off"
    },
  ];

  for (const { action, state } of actionsStates) {
    await actionsItem.click();

    const actionResp = page.waitForResponse(
      (response) => response.url().endsWith("/actions?action=" + action)
    );
    await page.getByTestId("action_" + action).click();
    expect((await actionResp).ok()).toBeTruthy();

    await statesItem.click();
    const statesResp = page.waitForResponse((response) => response.url().endsWith("/states"));
    await statesItem.click();
    await statesResp;

    await expect(page.getByTestId('state-menu-led')).toHaveText("led: " + state);
  }
});

test('Sensors tab', async ({ page }) => {
  const sensors = page.waitForResponse((response) => response.url().endsWith("/sensors"));
  await page.getByTestId('sensors').click();
  await sensors;

  await expect(page.getByText("button (digital):")).toBeVisible();
});

test('Configuration tab', async ({ page }) => {
  const updateBtn = page.getByTestId('configuration')
  await updateBtn.click();

  const waitResp = async (action, path="/config") => {
    const response = page.waitForResponse(
      (r) => r.url().endsWith(path) && !r.url().endsWith("/info/config")
    );
    await action;
    return await response;
  }

  await waitResp(page.getByTestId('configuration').click())

  const feilds = [
    { name: 'tests', value: String(Math.floor(Math.random() * 100)) },
    { name: 'testn', value: String(Math.floor(Math.random() * 100)) },
    { name: 'testb', value: String(Boolean(Math.floor(Math.random() * 2))) }
  ]

  for (const { name, value } of feilds) {
    await page.getByTestId(name).fill(value);
  }

  const res = await waitResp(page.getByTestId("config-save").click());
  expect(res.ok(), "Config saved").toBeTruthy();

  await waitResp(updateBtn.click());
  for (const { name, value } of feilds) {
    const input = page.getByTestId(name);
    await expect(input, "Config value " + name + " present").toHaveValue(value);
  }

  page.on('dialog', dialog => dialog.accept());
  const resDel = await waitResp(page.getByTestId("config-delete").click(), "/config/delete/all");
  expect(resDel.ok(), "Config deleted").toBeTruthy();

  await waitResp(updateBtn.click());
  for (const { name } of feilds) {
    const input = page.getByTestId(name);
    await expect(input, "Config value " + name + " clear").toBeEmpty();
  }
});

test('Metrics tab', async ({ page }) => {
  const resp = page.waitForResponse((r) => r.url().endsWith("/metrics"));
  await page.getByTestId("metrics").click();
  await resp;

  await expect(page.getByText("uptime:")).toBeVisible();
  await expect(page.getByText("heap:")).toBeVisible();
  await expect(page.getByText("counts:")).toBeVisible();
});