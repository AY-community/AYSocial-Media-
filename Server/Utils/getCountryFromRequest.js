const geoip = require('geoip-lite');
const countries = require('i18n-iso-countries');

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const rawIp = forwarded
    ? forwarded.split(',')[0].trim()
    : req?.ip || req?.socket?.remoteAddress || '';

  return rawIp.replace(/^::ffff:/, '').trim();
}

function getCountryFromRequest(req) {
  const ip = getClientIp(req);

  if (!ip || ip === '::1' || ip.startsWith('127.') || ip === '::ffff:127.0.0.1') {
    return null;
  }

  const lookup = geoip.lookup(ip);
  if (!lookup || !lookup.country) {
    return null;
  }

  return countries.getName(lookup.country, 'en') || lookup.country;
}

module.exports = {
  getClientIp,
  getCountryFromRequest,
};
