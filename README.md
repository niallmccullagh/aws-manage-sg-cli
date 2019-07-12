# AWS Security Group Manager

[![NPM version](https://badge.fury.io/js/aws-manage-sg.svg)](https://www.npmjs.com/package/aws-manage-sg)
[![Build Status](https://travis-ci.org/niallmccullagh/aws-manage-sg-cli.svg?branch=master)](https://travis-ci.org/niallmccullagh/aws-manage-sg-cli)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Greenkeeper badge](https://badges.greenkeeper.io/niallmccullagh/aws-manage-sg-cli.svg)](https://greenkeeper.io/)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fniallmccullagh%2Faws-manage-sg-cli.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fniallmccullagh%2Faws-manage-sg-cli?ref=badge_shield)

`aws-manage-sg` is a utility to manage multi security group rules for a remote worker.
It revokes old rules, and grants new rules with the user's current ip address.

## Running

* Create a config file to contain

```json
{
   "username": "johndoe",
   "rules": [
     {
       "name": "basiton",
       "securityGroupId": "sg-396jk989f",
       "ports": [22]
     },
     {
       "name": "kibana",
       "securityGroupId": "sg-3960686b",
       "ports": [443]
     }
   ],
   "region": "us-east-1"
 }
```

* username is optional.
* Install aws-manage-sg `npm install -g aws-manage-sg`
* Run to remove old rules and whitelist new ip. `aws-manage-sg -f config.json`

## Notes

* It is recommended to use the AWS username to ensure that users don't override each others settings. Username resolution happens in this order: command line argument, config file, AWS user, USER env property
* By default the cli will try to authenticate using details from environment variables, to use a specific profile set the profile explicitly.
* The AWS user must have the following permissions: `ec2:AuthorizeSecurityGroupIngress` and `ec2:DescribeSecurityGroups`
* If checking in a shared config file, ensure that you have not set the username.

## Command Line

Find out the full range of options by running `aws-manage-sg -h`

```bash

$ aws-manage-sg -h
Usage: aws-manage-sg [options]

Options:
  --version       Show version number                                  [boolean]
  -f, --file      Path to config file                                 [required]
  -g, --grant     Run only the grant                                   [boolean]
  -r, --revoke    Run only the revoke                                  [boolean]
  -p, --profile   AWS profile to use
  -u, --username  Username to tag rules with
  --ip            Use specified IP address. If not supplied the detected IP will
                  be used
  -h              Show help                                            [boolean]

```

## Using in another application/library

The library exports a number of functions:

1. `revokePermissions`, revokes any permissions for the user in the supplied user groups
1. `grantPermissions`, grants permissions for the user in the supplied ip and user groups
1. `useAWSProfile`, configures the AWS authentication to use the supplied profile.

See `bin/aws-manage-sg.js` for an example.

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fniallmccullagh%2Faws-manage-sg-cli.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fniallmccullagh%2Faws-manage-sg-cli?ref=badge_large)
