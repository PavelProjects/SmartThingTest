import test, { expect } from "@playwright/test";

const ACTION_HOOK_TYPE = "action";

test('Get device info (system, actions, config)', async({ request }) => {
    const info = await request.get('/info/system');
    expect(info.ok()).toBeTruthy();
    expect(await info.json(), "Correct info format").toMatchObject({
        stVersion: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        ip: expect.any(String),
        board: expect.any(String),
    });

    const actions = await request.get('/actions/info');
    expect(actions.ok()).toBeTruthy();
    expect(await actions.json(), "Correct actions format")
        .toEqual(expect.any(Object));

    const config = await request.get('/config');
    expect(config.ok()).toBeTruthy();
    expect(await config.json(), "Correct config info format")
        .toEqual(expect.any(Object));
});

test('Update device name', async ({ request }) => {
    const name = "autotest_" +  Math.floor(Math.random() * 100);
    const updateResponse = await request.put('/info/system', { data: {
        name
    }});
    expect(updateResponse.ok(), "Name updated").toBeTruthy();

    const info = await request.get('/info/system');
    expect(info.ok()).toBeTruthy();
    expect((await info.json()).name === name, "New name saved").toBeTruthy();
});

test('Test device configuration (add, get, delete)', async({ request }) => {
    const values = {
        "gtw": "localhost:8080",
        "test-value": "ooga;booga",
    }

    const addValues = await request.post('/config', { data: values });
    expect(addValues.ok(), "New values added").toBeTruthy();

    const config = await request.get('/config');
    expect(config.ok()).toBeTruthy();
    expect(await config.json(), "Config contains new values")
        .toEqual(expect.objectContaining(values));

    for (const key of Object.keys(values)) {
        const deleteKey = await request.delete('/config', { params: {
            name: key
        }});
        expect(deleteKey.ok(), `Value key=${key} removed`).toBeTruthy();
    };

    const deleteWrongKey = await request.delete('/config', { params: {
        name: "asojfsoifdjgsdf"
    }});
    expect(deleteWrongKey.status()).toEqual(404);
});

test('Perform actions', async ({ request }) => {
    const actionsResponse = await request.get('/actions/info');
    expect(actionsResponse.ok()).toBeTruthy();
    const actions = await actionsResponse.json();

    expect(actions.length !== 0, "Got configured actions").toBeTruthy();
    for (const { name } of actions) {
        const performAction = await request.get('/actions/call', { params: { name }});
        expect(performAction.ok(), "Done").toBeTruthy();
    }

    const name = actions[0].name
    const callDelay = 15000
    expect(
        (await request.put("/actions/schedule", { data: { name, callDelay } })).ok(),
        `Updated action's ${name} schedule delay to ${callDelay}`
    ).toBeTruthy()

    const updatedActions = await (await request.get('/actions/info')).json();
    expect(updatedActions[0].callDelay === callDelay, "Delay update confirmed").toBeTruthy()

    expect(
        (await request.put("/actions/schedule", { data: { name, callDelay: 0 } })).ok(),
        `Action's ${name} schedule delay removed`
    ).toBeTruthy()
});

test('Get device sensors', async ({ request }) => {
    const sensors = await request.get('/sensors');
    expect(sensors.ok()).toBeTruthy();
    expect(await sensors.json()).toEqual(expect.any(Object));
});

test('Test hooks (create, get, update, delete)', async({ request }) => {
    const sensor = "wifi"
    const templatesResponse = await request.get('/hooks/templates?sensor=' + sensor);
    expect(templatesResponse.ok()).toBeTruthy();
    const templates = await templatesResponse.json();
    expect(templates[ACTION_HOOK_TYPE]).not.toBeUndefined();
    expect(templates[ACTION_HOOK_TYPE].action).toEqual(expect.objectContaining({
        required: expect.any(Boolean),
        values: expect.any(Object)
    }));
    const actions = Object.keys(templates[ACTION_HOOK_TYPE].action.values);

    const sensorsResponse = await request.get('/sensors');
    expect(sensorsResponse.ok()).toBeTruthy();
    const states = Object.keys(await sensorsResponse.json());
    expect(states.length !== 0).toBeTruthy();

    const hook = {
        sensor,
        hook: {
            type: ACTION_HOOK_TYPE,
            action: actions[0],
            compareType: "eq",
            trigger: "autotest",
            triggerEnabled: true
        }
    };

    const createResponse = await request.post('/hooks', { data: hook });
    expect(createResponse.ok(), "Action hook created").toBeTruthy();
    const body = await createResponse.json();
    const createdId = Number(body.id);
    expect(createdId, "Created hook id=" + createdId).not.toBeUndefined();

    const getHookById = async (hookId) => {
        const hooksResponse = await request.get('/hooks', { params: { sensor }});
        expect(hooksResponse.ok()).toBeTruthy();
        const hooks = await hooksResponse.json();
        return hooks.find(({ id }) => id === hookId)
    }

    const createdhook = await getHookById(createdId)
    expect(createdhook, "Created hook contains all values").toMatchObject(
        {
            ...hook.hook,
            id: createdId
        }
    );

    hook.hook.id = createdId;
    hook.hook.trigger = "2";
    hook.hook.compareType = "neq";
    if (actions.length > 1) {
        hook.hook.action = actions[1];
    }
    const updateResponse = await request.put('/hooks', { data: hook });
    expect(updateResponse, "hook updated").toBeTruthy();
    
    const updatedhook = await getHookById(createdId)
    expect(updatedhook, "Updated hook contains all new values").toEqual(
        expect.objectContaining(hook.hook)
    );

    const deleteResponse = await request.delete('/hooks', { params: {
        sensor,
        id: createdId
    }});
    expect(deleteResponse.ok(), "hook deleted").toBeTruthy();
});