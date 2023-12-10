import test, { expect } from "@playwright/test";

const ACTION_CALLBACK_TYPE = "action_callback";

test('Get device info (system, actions, config)', async({ request }) => {
    const info = await request.get('/info/system');
    expect(info.ok()).toBeTruthy();
    expect(await info.json(), "Correct info format").toMatchObject({
        version: expect.any(Number),
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
    expect(await config.json(), "Contains new values")
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

test('Perform action (first from the actions list)', async ({ request }) => {
    const actionsResponse = await request.get('/info/actions');
    expect(actionsResponse.ok()).toBeTruthy();
    const actions = Object.keys(await actionsResponse.json());
    expect(actions.length !== 0, "Got configured action").toBeTruthy();
    const performAction = await request.put('/action', { params: {
        action: actions[0]
    }});
    expect(performAction.ok(), "Action " + actions[0] + " performed").toBeTruthy();
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

test('Test callbacks (create, get, update, delete)', async({ request }) => {
    const templatesResponse = await request.get('/callback/template');
    expect(templatesResponse.ok()).toBeTruthy();
    const templates = await templatesResponse.json();
    expect(templates[ACTION_CALLBACK_TYPE]).not.toBeUndefined();
    expect(templates[ACTION_CALLBACK_TYPE].action).toEqual(expect.objectContaining({
        required: expect.any(Boolean),
        values: expect.any(Object)
    }));
    const actions = Object.keys(templates[ACTION_CALLBACK_TYPE].action.values);

    const statesResponse = await request.get('/states');
    expect(statesResponse.ok()).toBeTruthy();
    const states = Object.keys(await statesResponse.json());
    expect(states.length !== 0).toBeTruthy();

    const callback = {
        observable: {
            type: "state",
            name: states[0]
        },
        callback: {
            type: ACTION_CALLBACK_TYPE,
            action: actions[0],
            compareType: "eq",
            trigger: "1"
        }
    };

    const createResponse = await request.post('/callback', { data: callback });
    expect(createResponse.ok(), "Action callback created").toBeTruthy();
    const { id } = await createResponse.json();
    expect(id, "Callback id not empty").not.toBeUndefined();

    const createdCallback = await request.get('/callback/by/id', { params: {
        observableType: callback.observable.type,
        name: callback.observable.name,
        id
    }});
    expect(createdCallback.ok()).toBeTruthy();
    expect(await createdCallback.json(), "Created callback contains all values").toEqual(
        expect.objectContaining({
            ...callback.callback,
            id
        }
    ));

    callback.callback.id = id;
    callback.callback.trigger = "2";
    callback.callback.compareType = "neq";
    if (actions.length > 1) {
        callback.callback.action = actions[1];
    }
    const updateResponse = await request.put('/callback', { data: callback });
    expect(updateResponse, "Callback updated").toBeTruthy();
    
    const updatedCallback = await request.get('/callback/by/id', { params: {
        observableType: callback.observable.type,
        name: callback.observable.name,
        id
    }});
    expect(updatedCallback.ok()).toBeTruthy();
    expect(await updatedCallback.json(), "Updated callback contains all new values").toEqual(
        expect.objectContaining({
            ...callback.callback,
            id
        }
    ));

    const deleteResponse = await request.delete('/callback', { params: {
        observableType: callback.observable.type,
        name: callback.observable.name,
        id
    }});
    expect(deleteResponse.ok(), "Callback deleted").toBeTruthy();
});