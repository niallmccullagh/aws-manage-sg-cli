const AWS = require('aws-sdk');
const debug = require('debug')('aws-manage-sg');

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

  debug(`Revoking rule ${JSON.stringify(revokeParam)} on ${securityGroupId}`);

  return EC2(config).revokeSecurityGroupIngress({
    GroupId: securityGroupId,
    IpPermissions: [revokeParam],
  }).promise();
}

async function grantPermission(config, { securityGroupId, ports }) {
  debug(`Granting rule to ${securityGroupId} on ports ${ports} for IP ${config.ipAddress} tagged with user ${config.username}`);

  const permissions = await ports.map((port) => {
    const p = parseInt(port, 10);
    return {
      IpRanges: [
        {
          CidrIp: `${config.ipAddress}/32`,
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
  })
    .promise();
}

function useAWSProfile(profile) {
  const credentials = new AWS.SharedIniFileCredentials({ profile });
  AWS.config.credentials = credentials;
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

async function grantPermissions(config) {
  const results = [];
  for (const rule of config.rules) {
    results.push(grantPermission(config, rule));
  }

  await Promise.all(results);
}

module.exports = {
  revokePermissions,
  grantPermissions,
  useAWSProfile,
};
