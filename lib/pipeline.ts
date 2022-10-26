import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Artifacts, BuildSpec, Project } from "aws-cdk-lib/aws-codebuild";
import { Repository } from "aws-cdk-lib/aws-codecommit";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { CodeBuildAction, CodeCommitSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { ManagedPolicy, PolicyDocument, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BuildConfig } from "../common_config/build_config";
import { EksStack } from "./eks";

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, buildConfig: BuildConfig, eksStack: EksStack, props: StackProps) {
        super(scope, id, props)

        const prefix = `${buildConfig.environment}-${buildConfig.project}`;
        const pipeConfig = buildConfig.stacks.pipeline;

        //Bucket s3
        const s3Bucket = new Bucket(this, 'PipelineS3Bucket,', {
            bucketName: `${prefix}-s3-bucket`,
            removalPolicy: RemovalPolicy.DESTROY
        });

        //CodeCommit repository
        const repository = Repository.fromRepositoryName(this, "importedRepo", pipeConfig.importRepoName)

        //CodeCommit
        const sourceOutput = new Artifact();
        const sourceAction = new CodeCommitSourceAction({
            actionName: `${prefix}-CodeCommit`,
            repository: repository,
            branch: pipeConfig.sourceBranchName,
            output: sourceOutput
        });


        /*const svAccRoleName = `${prefix}-svAcc-role`;
        const svAccrole = new Role(this, "svole", {
            roleName: svAccRoleName,
            assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
            managedPolicies:[
                ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSServicePolicy"),
            ] 
        });*/
        const roleFromEks = new Role(this, "codebuildRole", {
			assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
			inlinePolicies: {
				ecrEks: PolicyDocument.fromJson({
					Version: "2012-10-17",
					Statement: [
						{
							Effect: "Allow",
							Action: ["ecr:*", "eks:*"],
							Resource: "*",
						},
					],
				}),
				assumeRole: PolicyDocument.fromJson({
					Version: "2012-10-17",
					Statement: [
						{
							Sid: "STSASSUME",
							Effect: "Allow",
							Action: "sts:AssumeRole",
							Resource: eksStack.eksRoleArn,
						},
					],
				}),
			},
		});

        //Project (CodeBuild)
        const projectName = `${prefix}-codebuild-project`;
        const project = new Project(this, 'MyProject', {
            projectName: projectName,
            buildSpec: BuildSpec.fromObject({
                version: '0.2',
            }),
            artifacts: Artifacts.s3({
                bucket: s3Bucket,
                includeBuildId: false,
                encryption: false
            }),
            role: roleFromEks
        });

        
        //CodeBuild 
        const buildOutput = new Artifact();
        const buildAction = new CodeBuildAction({
            actionName: `${prefix}-CodeBuild`,
            input: sourceOutput,
            project: project,
            outputs: [buildOutput],
            executeBatchBuild: false,
            
        });

        const pipeline = new Pipeline(this, 'EKSPipeline', {
            pipelineName: `${prefix}-Pipeline`,
            artifactBucket: s3Bucket,
            stages: [
                {
                    stageName: "Source",
                    actions: [sourceAction]
                },
                {
                    stageName: "Build",
                    actions: [buildAction]
                }

            ]

        });

        pipeline.node.addDependency(s3Bucket);
        repository.grantPullPush(pipeline.role);
    }
}