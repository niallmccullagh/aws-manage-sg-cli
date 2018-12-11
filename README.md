# AWS Security Group Manager

[![Greenkeeper badge](https://badges.greenkeeper.io/niallmccullagh/aws-manage-sg-cli.svg)](https://greenkeeper.io/)

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

* Install aws-manage-sg `npm install -g aws-manage-sg`
* Run to remove old rules and whitelist new ip. `aws-manage-sg -f config.json`

## Notes

* It is recommended to use the AWS username to ensure that users don't override each others settings
* By default the cli will try to authenticate using details from environment variables, to use a specific profile set the profile explicitly.
* The AWS user must have the following permissions: `ec2:AuthorizeSecurityGroupIngress` and `ec2:DescribeSecurityGroups`

## Command Line

Find out the full range of options by running `aws-manage-sg -h`

```bash
$ aws-manage-sg -h
Usage: aws-manage-sg [options]

Options:
  --version      Show version number                                    [boolean]
  -f, --file     Path to config file                                   [required]
  -g, --grant    Run only the grant
  -r, --revoke   Run only the revoke
  -p, --profile  AWS profile to use
  -h             Show help                                              [boolean]
```
