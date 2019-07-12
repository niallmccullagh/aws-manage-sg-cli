#!/usr/local/bin/node
const fs = require('fs');
const yargs = require('yargs');
const delay = require('timeout-as-promise');
const request = require('request-promise');
const debugCore = require('debug');
const AWS = require('aws-sdk');
const { revokePermissions, grantPermissions, useAWSProfile } = require('../index');

const debug = debugCore('aws-manage-sg-cli');
debugCore.enable('aws-manage-sg*');

async function getLoggedInUserName() {
  const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
  try {
    const loggedInUser = await iam.getUser({}).promise();
    return loggedInUser.User.UserName;
  } catch (e) {
    debug(`Error determining AWS username: ${e.message}`);
  }
  return undefined;
}

function usernameFromEnv() {
  return process.env.USER;
}

async function getIPAddress() {
  const response = await request('http://checkip.amazonaws.com/');
  return response.replace(/\s/g, '');
}

function validate(config) {
  if (!config.username) {
    throw new Error('Username not set in config');
  }
}

async function buildConfig(options, configFile) {
  const config = {
    ...configFile,
    ipAddress: options.ip || await getIPAddress(),
    username: options.username
      || configFile.username
      || await getLoggedInUserName()
      || usernameFromEnv(),
  };

  validate(config);
  return config;
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
    .boolean('g')
    .alias('r', 'revoke')
    .describe('r', 'Run only the revoke')
    .boolean('r')
    .alias('p', 'profile')
    .describe('p', 'AWS profile to use')
    .alias('u', 'username')
    .describe('u', 'Username to tag rules with. If not supplied the detected username will be used')
    .describe('ip', 'Use specified IP address. If not supplied the detected IP will be used')
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
    await run(options, await buildConfig(options, config));
  } catch (e) {
    debug(`ERROR: ${e.message}`);
    process.exit(1);
  }
})();
