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
    .toHaveText(["Device name", "save", "Device type", "Ip", "Board", "SmartThing version", "Firmware version"]);

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

test('Sensors tab', async ({ page }) => {
  const sensors = page.waitForResponse((response) => response.url().endsWith("/sensors"));
  await page.getByTestId('sensors').click();
  await sensors;

  await expect(page.getByText("button:")).toBeVisible();
});

test('Actions tab', async ({ page }) => {
  const sensorsItem = page.getByTestId('sensors');
  const actionsItem = page.getByTestId('actions');

  await sensorsItem.click();
  const actionsResp = page.waitForResponse((response) => response.url().endsWith("/actions/info"));
  await actionsItem.click();
  await actionsResp;

  const actionsStates = [
    {
      action: "led_on",
      value: "on"
    },
    {
      action: "led_off",
      value: "off"
    },
  ];

  for (const { action, value } of actionsStates) {
    await actionsItem.click();

    const actionResp = page.waitForResponse(
      (response) => response.url().endsWith("/actions/call?name=" + action)
    );
    await page.getByTestId("action_" + action).click();
    expect((await actionResp).ok()).toBeTruthy();

    await sensorsItem.click();
    const sensorsResp = page.waitForResponse((response) => response.url().endsWith("/sensors"));
    await sensorsItem.click();
    await sensorsResp;

    await expect(page.getByTestId('sensors-menu-led')).toHaveText("led: " + value);
  }
});

test('Configuration tab', async ({ page }) => {
  const waitResp = async (action, path="/config") => {
    const response = page.waitForResponse(
      (r) => r.url().endsWith(path)
    );
    await action;
    return await response;
  }

  const getFieldId = (name) => "config_" + name

  const fields = [
    { name: 'gtw', value: String(Math.floor(Math.random() * 100)) },
    { name: 'test-value', value: String(Math.floor(Math.random() * 100)) },
  ]

  const updateBtn = page.getByTestId('configuration')
  waitResp(await updateBtn.click());

  for (const { name, value } of fields) {
    await page.getByTestId(getFieldId(name)).fill(value);
  }

  const res = await waitResp(page.getByTestId("config-save").click());
  expect(res.ok(), "Config saved").toBeTruthy();

  await waitResp(updateBtn.click());
  for (const { name, value } of fields) {
    const input = page.getByTestId(getFieldId(name));
    await expect(input, "Config value " + name + " present").toHaveValue(value);
  }

  page.on('dialog', dialog => dialog.accept());
  const resDel = await waitResp(page.getByTestId("config-delete").click(), "/config/delete/all");
  expect(resDel.ok(), "Config deleted").toBeTruthy();

  await waitResp(updateBtn.click());
  for (const { name } of fields) {
    const input = page.getByTestId(getFieldId(name));
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