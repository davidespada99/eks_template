import { Stack, StackProps } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AuroraEngineVersion, AuroraMysqlEngineVersion, AuroraPostgresEngineVersion, DatabaseCluster, DatabaseClusterEngine } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import { BuildConfig } from "../common_config/build_config";
import { NetworkImportStack } from "./network-import";

export class AuroraDBStack extends Stack{
    constructor(scope: Construct, id: string, buildConfig: BuildConfig, netProps: NetworkImportStack, props?: StackProps) {
        super(scope, id, props);

        const prefix = `${buildConfig.environment}-${buildConfig.project}`;
        const auroraConfig = buildConfig.stacks.aurora;

        let dbEngine;
        if(auroraConfig.engine == "aurora"){
            dbEngine =  DatabaseClusterEngine.aurora({
                version: AuroraEngineVersion.of(`${auroraConfig.majorVersion}.mysql_aurora.${auroraConfig.version}`, auroraConfig.majorVersion)
            })
        }
        else if(auroraConfig.engine == "auroraMysql"){
            dbEngine = DatabaseClusterEngine.auroraMysql({
                version: AuroraMysqlEngineVersion.of(`${auroraConfig.majorVersion}.mysql_aurora.${auroraConfig.version}`, auroraConfig.majorVersion)
            })
        }
        else if(auroraConfig.engine == "auroraPostgres"){
            dbEngine = DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.of(`${auroraConfig.version}`,`${auroraConfig.majorVersion}` )
            })
        }
        else{
            dbEngine = DatabaseClusterEngine.auroraMysql({
                version: AuroraMysqlEngineVersion.of("5.7.mysql_aurora.2.04.0")
            })
        }

        /*const dbRole = new Role(this, "dbRole", {
            assumedBy: new ServicePrincipal("rds.amazonaws.com"),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AmazonRDSServiceRolePolicy"),]
          });
          */

        const auroraCluster = new DatabaseCluster(this, 'AuroraCluster', {
            clusterIdentifier: `${prefix}-aurora-cluster`,
            engine: dbEngine,
            instanceProps: {
                vpc: netProps.vpc,
                instanceType: new InstanceType(`${auroraConfig.istanceClass}.${auroraConfig.istanceSize}`),
                vpcSubnets: {subnets: auroraConfig.privateSubnets? netProps.privateSubnets : netProps.publicSubnets},
            },
            deletionProtection: auroraConfig.deletionProtection,
            instances: auroraConfig.istancesNumber,
            //monitoringRole: dbRole,
        })
    }
}