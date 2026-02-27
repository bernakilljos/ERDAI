import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/app'
import { bootstrap } from '../src/lib/bootstrap'

beforeAll(async () => {
  await bootstrap()
})

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('projects', () => {
  it('lists projects', async () => {
    const res = await request(app).get('/projects')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
