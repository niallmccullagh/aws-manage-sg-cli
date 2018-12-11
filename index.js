#!/usr/local/bin/node
const AWS = require('aws-sdk');
const delay = require('timeout-as-promise');
const fs = require('fs');
const request = require('request-promise');
const yargs = require('yargs');

function EC2(config) {
  const region = config.region || 'us-east-1';
  return new AWS.EC2({ apiVersion: '2016-11-15', region });
}

async function getSecurityGroups(config) {
  const params = {
    GroupIds: config.rules.map(({ securityGroupId }) => securityGroupId),
  };

  const { SecurityGroups: securityGroups } = await EC2(config)
    .describeSecurityGroups(params)
    .promise();

  if (securityGroups === undefined) {
    throw new Error(`No security groups found with for ${JSON.stringify(params)}`);
  }

  return securityGroups;
}
function isRangeForUser(username, range) {
  return range.Description === username;
}

function hasPermissionARangeForUser(username, permission) {
  return (
    permission.IpRanges
        && permission.IpRanges.some(range => isRangeForUser(username, range))
  );
}

async function revokePermission(config, securityGroupId, permission) {
  const revokeParam = {
    IpRanges: permission.IpRanges.filter(range => isRangeForUser(config.username, range)),
    FromPort: permission.FromPort,
    ToPort: permission.ToPort,
    IpProtocol: permission.IpProtocol,
  };

  console.log(`Revoking rule ${JSON.stringify(revokeParam)} on ${securityGroupId}`);

  return EC2(config).revokeSecurityGroupIngress({
    GroupId: securityGroupId,
    IpPermissions: [revokeParam],
  }).promise();
}

async function grantPermission(config, ipAddress, { securityGroupId, ports }) {
  console.log(`Granting rule to ${securityGroupId} on ports ${ports} for IP ${ipAddress}`);

  const permissions = await ports.map((port) => {
    const p = parseInt(port, 10);
    return {
      IpRanges: [
        {
          CidrIp: `${ipAddress}/32`,
          Description: `${config.username}`,
        },
      ],
      FromPort: p,
      ToPort: p,
      IpProtocol: 'tcp',
    };
  });

  return EC2(config).authorizeSecurityGroupIngress({
    GroupId: securityGroupId,
    IpPermissions: permissions,
  }).promise();
}

async function getIPAddress() {
  const response = await request('http://checkip.amazonaws.com/');
  return response.replace(/\s/g, '');
}


async function revokePermissions(config) {
  const results = [];

  for (const securityGroup of await getSecurityGroups(config)) {
    const result = securityGroup.IpPermissions
      .filter(permission => hasPermissionARangeForUser(config.username, permission))
      .map(permission => revokePermission(config, securityGroup.GroupId, permission));
    results.push(result);
  }
  return Promise.all(results);
}

function useAWSProfile(profile) {
  const credentials = new AWS.SharedIniFileCredentials({ profile });
  AWS.config.credentials = credentials;
}

async function run(options, config) {
  async function giveRevocationTimeToSet() {
    await delay(1000);
  }

  function shouldRunByDefault() {
    return !options.revoke && !options.grant;
  }

  const ipAddress = await getIPAddress();
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
    const results = [];
    for (const rule of config.rules) {
      grantPermission(config, ipAddress, rule);
    }
    await Promise.all(results);
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

(async () => {
  try {
    const options = getOptions();
    const config = JSON.parse(fs.readFileSync(options.file));
    await run(options, config);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    process.exit(1);
  }
})();
