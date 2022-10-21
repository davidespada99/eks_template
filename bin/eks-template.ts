#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from '../lib/eks';
import { Stack, Tags } from 'aws-cdk-lib';
import { getConfig } from '../common_config/get_config';
import { NetworkStack } from '../lib/network';
import { NetworkImportStack } from '../lib/network-import';
import { AuroraDBStack } from '../lib/aurora-db';

function addTagsToStack(stack: Stack, name: string): void {
    Tags.of(stack).add("Project", buildConfig.project);
    Tags.of(stack).add("Environment", buildConfig.environment);
  }
  
const app = new cdk.App();
const buildConfig = getConfig(app);
const envDetails = {
  account: buildConfig.account,
  region: buildConfig.region
};
const prefix = `${buildConfig.environment}-${buildConfig.project}`;

//network
const networkStackName = `${prefix}-network-stack`;
const networkStack = new NetworkStack(app, networkStackName, buildConfig,{
  stackName:networkStackName,
  env: envDetails,
});
addTagsToStack(networkStack as NetworkStack, networkStackName);

//network import
const netImportName = `${prefix}-netImport-stack`;
const netImportStack = new NetworkImportStack(app, netImportName, buildConfig,{
  stackName:netImportName,
  env: envDetails,
});
addTagsToStack(netImportStack as NetworkImportStack, netImportName);

//eks
const eksStackName = `${prefix}-eks-stack`;
const eksStack = new EksStack(app, eksStackName, buildConfig, netImportStack, {
    stackName: eksStackName,
    env: envDetails,
});
addTagsToStack(eksStack as EksStack, eksStackName);

//aurora db
const auroraDBStackName = `${prefix}-aurora-stack`;
const auroraStack = new AuroraDBStack(app, auroraDBStackName, buildConfig, netImportStack, {
  stackName: eksStackName,
  env: envDetails,
})
addTagsToStack(auroraStack as AuroraDBStack, auroraDBStackName);