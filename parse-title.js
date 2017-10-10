const semver = require('semver');

const prefix = 'Release ';

function parseTitle(title) {
  if (!title.startsWith(prefix)) {
    return false;
  }
  const version = title.substr(prefix.length);
  // enforce v prefix in title
  if (!version.startsWith('v')) {
    return false;
  }
  if (!semver.valid(version)) {
    return false;
  }
  return {
    version,
    prerelease: Boolean(semver.prerelease(version)),
  };
}

module.exports = parseTitle;
