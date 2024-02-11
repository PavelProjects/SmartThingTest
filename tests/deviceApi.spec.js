import test, { expect } from "@playwright/test";

const ACTION_HOOK_TYPE = "action_hook";

test('Get device info (system, actions, config)', async({ request }) => {
    const info = await request.get('/info/system');
    expect(info.ok()).toBeTruthy();
    expect(await info.json(), "Correct info format").toMatchObject({
        version: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        chip_model: expect.any(String),
        chip_revision: expect.any(Number),
    });

    const actions = await request.get('/info/actions');
    expect(actions.ok()).toBeTruthy();
    expect(await actions.json(), "Correct actions format")
        .toEqual(expect.any(Object));

    const config = await request.get('/info/config');
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
        string_v: "tehe",
        number_v: 12,
        boolean_v: true,
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
    const actionsResponse = await request.get('/info/actions');
    expect(actionsResponse.ok()).toBeTruthy();
    const actions = Object.keys(await actionsResponse.json());
    expect(actions.length !== 0, "Got configured actions").toBeTruthy();
    for (const action of actions) {
        const performAction = await request.put('/action', { params: {
            action
        }});
        expect(performAction.ok(), "Action " + action + " performed").toBeTruthy();
    }
});

test('Get device sensors', async ({ request }) => {
    const sensors = await request.get('/sensors');
    expect(sensors.ok()).toBeTruthy();
    expect(await sensors.json()).toEqual(expect.any(Object));
});

test('Get device states', async ({ request }) => {
    const sensors = await request.get('/states');
    expect(sensors.ok()).toBeTruthy();
    expect(await sensors.json()).toEqual(expect.any(Object));
});

test('Test hooks (create, get, update, delete)', async({ request }) => {
    const templatesResponse = await request.get('/hooks/templates');
    expect(templatesResponse.ok()).toBeTruthy();
    const templates = await templatesResponse.json();
    expect(templates[ACTION_HOOK_TYPE]).not.toBeUndefined();
    expect(templates[ACTION_HOOK_TYPE].action).toEqual(expect.objectContaining({
        required: expect.any(Boolean),
        values: expect.any(Object)
    }));
    const actions = Object.keys(templates[ACTION_HOOK_TYPE].action.values);

    const statesResponse = await request.get('/states');
    expect(statesResponse.ok()).toBeTruthy();
    const states = Object.keys(await statesResponse.json());
    expect(states.length !== 0).toBeTruthy();

    const hook = {
        observable: {
            type: "state",
            name: states[0]
        },
        hook: {
            type: ACTION_HOOK_TYPE,
            action: actions[0],
            compareType: "eq",
            trigger: "autotest"
        }
    };

    const createResponse = await request.post('/hooks', { data: hook });
    expect(createResponse.ok(), "Action hook created").toBeTruthy();
    const body = await createResponse.json();
    const id = Number(body.id);
    expect(id, "Created hook id=" + id).not.toBeUndefined();

    const createdhook = await request.get('/hooks/by/id', { params: {
        type: hook.observable.type,
        name: hook.observable.name,
        id
    }});
    expect(createdhook.ok()).toBeTruthy();
    expect(await createdhook.json(), "Created hook contains all values").toEqual(
        expect.objectContaining({
            ...hook.hook,
            id
        }
    ));

    hook.hook.id = id;
    hook.hook.trigger = "2";
    hook.hook.compareType = "neq";
    if (actions.length > 1) {
        hook.hook.action = actions[1];
    }
    const updateResponse = await request.put('/hooks', { data: hook });
    expect(updateResponse, "hook updated").toBeTruthy();
    
    const updatedhook = await request.get('/hooks/by/id', { params: {
        type: hook.observable.type,
        name: hook.observable.name,
        id
    }});
    expect(updatedhook.ok()).toBeTruthy();
    expect(await updatedhook.json(), "Updated hook contains all new values").toEqual(
        expect.objectContaining({
            ...hook.hook,
            id
        }
    ));

    const deleteResponse = await request.delete('/hooks', { params: {
        type: hook.observable.type,
        name: hook.observable.name,
        id
    }});
    expect(deleteResponse.ok(), "hook deleted").toBeTruthy();
});