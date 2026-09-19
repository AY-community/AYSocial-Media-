const assert = require('assert');
const { getCountryFromRequest } = require('./getCountryFromRequest');

const req = {
  headers: {
    'x-forwarded-for': '8.8.8.8, 10.0.0.1',
  },
  ip: '10.0.0.1',
};

const country = getCountryFromRequest(req);
assert.strictEqual(typeof country, 'string' || country === null, true);
console.log('country detection ok:', country);
