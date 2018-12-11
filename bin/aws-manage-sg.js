#!/usr/local/bin/node
const fs = require('fs');
const yargs = require('yargs');
const delay = require('timeout-as-promise');
const request = require('request-promise');
const debugCore = require('debug');
const { revokePermissions, grantPermissions, useAWSProfile } = require('../index');

const debug = debugCore('aws-manage-sg-cli');

debugCore.enable('aws-manage-sg*');

async function getIPAddress() {
  const response = await request('http://checkip.amazonaws.com/');
  return response.replace(/\s/g, '');
}

async function buildConfig(configFile) {
  return {
    ...configFile,
    ipAddress: await getIPAddress(),
  };
}

async function run(options, config) {
  async function giveRevocationTimeToSet() {
    await delay(1000);
  }

  function shouldRunByDefault() {
    return !options.revoke && !options.grant;
  }

  const revoke = options.revoke || shouldRunByDefault();
  const grant = options.grant || shouldRunByDefault();

  if (options.profile) {
    useAWSProfile(options.profile);
  }

  if (revoke) {
    await revokePermissions(config);
    await giveRevocationTimeToSet();
  }

  if (grant) {
    await grantPermissions(config);
  }
}

function getOptions() {
  return yargs
    .usage('Usage: $0 <command> [options]')
    .alias('f', 'file')
    .describe('f', 'Path to config file')
    .alias('g', 'grant')
    .describe('g', 'Run only the grant')
    .alias('r', 'revoke')
    .describe('r', 'Run only the revoke')
    .alias('p', 'profile')
    .describe('p', 'AWS profile to use')
    .demandOption(['file'], 'Please provide a path to a config file')
    .help('h').argv;
}

function readConfigFile(path) {
  return JSON.parse(fs.readFileSync(path));
}

(async () => {
  try {
    const options = getOptions();
    const config = readConfigFile(options.file);
    await run(options, await buildConfig(config));
  } catch (e) {
    debug(`ERROR: ${e.message}`);
    process.exit(1);
  }
})();
