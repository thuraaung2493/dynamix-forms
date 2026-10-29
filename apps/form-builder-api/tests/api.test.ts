import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { PasswordService } from '../src/auth/password.js';
import type { AppConfig } from '../src/config.js';
import type { TestDatabase } from './database.js';
import { createTestDatabase } from './database.js';

const config: AppConfig = {
  appOrigin: 'http://localhost:5173',
  databaseUrl: 'postgresql://test',
  nodeEnv: 'test',
  port: 3001,
  session: {
    absoluteLifetimeMs: 30 * 24 * 60 * 60 * 1_000,
    cookieName: 'dynamix_session',
    rollingLifetimeMs: 7 * 24 * 60 * 60 * 1_000,
    secureCookie: false,
  },
};

const passwordService: PasswordService = {
  async hash(password) {
    return `test:${password}`;
  },
  async verify(hash, password) {
    return hash === `test:${password}`;
  },
};

const schema = {
  fields: [
    { label: 'Name', name: 'name', required: true, type: 'text' },
  ],
  id: 'customer-details',
  schemaVersion: 1,
  title: 'Customer details',
} as const;

describe('Dynamix Forms API', () => {
  let testDatabase: TestDatabase;
  let now: Date;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    now = new Date('2026-10-26T08:00:00.000Z');
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  function testApp() {
    return createApp({
      config,
      database: testDatabase.database,
      now: () => new Date(now),
      passwordService,
      tokenFactory: randomUUID,
    });
  }

  async function register(agent: ReturnType<typeof request.agent>, email: string) {
    return agent.post('/api/auth/register').send({
      displayName: email.split('@')[0],
      email,
      password: 'valid-passwordA!',
    });
  }

  it('registers, authenticates, logs in, and logs out with an opaque cookie', async () => {
    const app = testApp();
    const agent = request.agent(app);
    const registration = await register(agent, 'user@example.com');
    expect(registration.status).toBe(201);
    expect(registration.headers['set-cookie']?.[0]).toContain('dynamix_session=');
    expect(registration.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(registration.headers['set-cookie']?.[0]).toContain('SameSite=Lax');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: 'user@example.com' });

    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);

    const login = await agent.post('/api/auth/login').send({
      email: 'USER@example.com',
      password: 'valid-passwordA!',
    });
    expect(login.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('enforces password requirements and protects form routes', async () => {
    const app = testApp();
    const invalid = await request(app).post('/api/auth/register').send({
      displayName: 'User',
      email: 'user@example.com',
      password: 'not-long',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('invalid_request');

    const protectedResponse = await request(app).get('/api/forms');
    expect(protectedResponse.status).toBe(401);
    expect(protectedResponse.body.error.code).toBe('authentication_required');
  });

  it('rejects cross-origin state-changing requests', async () => {
    const response = await request(testApp())
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'user@example.com', password: 'valid-passwordA!' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('origin_not_allowed');
  });

  it('creates, saves, publishes, exports, and restores immutable versions', async () => {
    const agent = request.agent(testApp());
    await register(agent, 'owner@example.com');

    const created = await agent.post('/api/forms').send({ key: 'customer', title: 'Customer' });
    expect(created.status).toBe(201);
    const formId = created.body.form.id as string;
    expect(created.body.form.draftRevision).toBe(1);

    const saved = await agent.put(`/api/forms/${formId}/draft`).send({
      expectedRevision: 1,
      schema,
      title: 'Customer details',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.form.draftRevision).toBe(2);

    const stale = await agent.put(`/api/forms/${formId}/draft`).send({
      expectedRevision: 1,
      schema,
    });
    expect(stale.status).toBe(409);
    expect(stale.body.error.details.currentRevision).toBe(2);

    const publishedV1 = await agent.post(`/api/forms/${formId}/publish`).send({ expectedRevision: 2 });
    expect(publishedV1.status).toBe(201);
    expect(publishedV1.body.version.version).toBe(1);

    const changedSchema = { ...schema, title: 'Changed draft' };
    await agent.put(`/api/forms/${formId}/draft`).send({ expectedRevision: 2, schema: changedSchema });
    const oldVersion = await agent.get(`/api/forms/${formId}/versions/1`);
    expect(oldVersion.body.version.schema.title).toBe('Customer details');

    const publishedV2 = await agent.post(`/api/forms/${formId}/publish`).send({ expectedRevision: 3 });
    expect(publishedV2.body.version.version).toBe(2);
    const restored = await agent
      .post(`/api/forms/${formId}/versions/1/restore`)
      .send({ expectedRevision: 3 });
    expect(restored.status).toBe(200);
    expect(restored.body.form.draftSchema.title).toBe('Customer details');
    expect(restored.body.form.currentPublishedVersion).toBe(2);

    const exported = await agent.get(`/api/forms/${formId}/export?source=published&version=1`);
    expect(exported.status).toBe(200);
    expect(exported.headers['content-disposition']).toContain('published-v1.json');
    expect(exported.body).toEqual(schema);

    const versions = await agent.get(`/api/forms/${formId}/versions`);
    expect(versions.body.versions.map((version: { version: number }) => version.version)).toEqual([2, 1]);
  });

  it('validates imported schemas before replacing a draft', async () => {
    const agent = request.agent(testApp());
    await register(agent, 'owner@example.com');
    const created = await agent.post('/api/forms/import').send({
      key: 'imported',
      schema,
      title: 'Imported',
    });
    expect(created.status).toBe(201);

    const invalid = await agent.put(`/api/forms/${created.body.form.id}/import`).send({
      confirmReplace: true,
      expectedRevision: 1,
      schema: { fields: [], id: 'bad', schemaVersion: 999 },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('invalid_form_schema');

    const unchanged = await agent.get(`/api/forms/${created.body.form.id}`);
    expect(unchanged.body.form.draftRevision).toBe(1);
    expect(unchanged.body.form.draftSchema).toEqual(schema);
  });

  it('does not expose or mutate another owner\'s forms', async () => {
    const app = testApp();
    const owner = request.agent(app);
    const stranger = request.agent(app);
    await register(owner, 'owner@example.com');
    await register(stranger, 'stranger@example.com');
    const created = await owner.post('/api/forms').send({ key: 'private', schema, title: 'Private' });
    const formId = created.body.form.id as string;

    expect((await stranger.get(`/api/forms/${formId}`)).status).toBe(404);
    expect((await stranger.put(`/api/forms/${formId}/draft`).send({ expectedRevision: 1, schema })).status).toBe(404);
    expect((await stranger.post(`/api/forms/${formId}/publish`).send({ expectedRevision: 1 })).status).toBe(404);
    expect((await stranger.get(`/api/forms/${formId}/export`)).status).toBe(404);
    expect((await stranger.delete(`/api/forms/${formId}`)).status).toBe(404);

    const ownerView = await owner.get(`/api/forms/${formId}`);
    expect(ownerView.status).toBe(200);
  });

  it('soft-deletes, restores, and only permanently deletes after explicit confirmation', async () => {
    const agent = request.agent(testApp());
    await register(agent, 'owner@example.com');
    const created = await agent.post('/api/forms').send({ key: 'deletable', schema, title: 'Delete me' });
    const formId = created.body.form.id as string;

    expect((await agent.delete(`/api/forms/${formId}`)).status).toBe(200);
    expect((await agent.get(`/api/forms/${formId}`)).status).toBe(404);
    const deletedList = await agent.get('/api/forms?deleted=true');
    expect(deletedList.body.forms).toHaveLength(1);

    expect((await agent.delete(`/api/forms/${formId}/permanent`).send({ confirmation: 'DELETE' })).status).toBe(400);
    expect((await agent.post(`/api/forms/${formId}/restore-deleted`)).status).toBe(200);
    const deletedAgain = await agent.delete(`/api/forms/${formId}`);
    expect(deletedAgain.status).toBe(200);
    const removed = await agent
      .delete(`/api/forms/${formId}/permanent`)
      .send({ confirmation: 'PERMANENTLY DELETE' });
    expect(removed.status).toBe(200);
    expect(removed.body.deleted.id).toBe(formId);
    expect((await agent.get('/api/forms?deleted=true')).body.forms).toHaveLength(0);
  });

  it('expires sessions at the rolling deadline', async () => {
    const agent = request.agent(testApp());
    await register(agent, 'owner@example.com');
    now = new Date(now.getTime() + config.session.rollingLifetimeMs + 1);
    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
