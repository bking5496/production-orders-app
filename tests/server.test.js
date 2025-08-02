const request = require('supertest');
const server = require('../server');

describe('Server', () => {
  it('should be running', async () => {
    const response = await request(server).get('/api/health');
    expect(response.status).toBe(200);
  });
});
