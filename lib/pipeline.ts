import { Stack, StackProps } from "aws-cdk-lib";
import { BuildSpec, Project } from "aws-cdk-lib/aws-codebuild";
import { Repository } from "aws-cdk-lib/aws-codecommit";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { CodeBuildAction, CodeCommitSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Construct } from "constructs";
import { BuildConfig } from "../common_config/build_config";
import { EksStack } from "./eks";

export class PipelineStack extends Stack{
    constructor(scope: Construct, id: string, buildConfig: BuildConfig, eksStack: EksStack, props: StackProps){
        super(scope, id, props)

        const prefix = `${buildConfig.environment}-${buildConfig.project}`;
        const pipeConfig = buildConfig.stacks.pipeline;

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


        //CodeBuild
        const projectName = `${prefix}-codebuild-project`;
            const project = new Project(this, 'MyProject', {
                projectName: projectName,
                buildSpec: BuildSpec.fromObject({
                  version: '0.2',
                }),
                //prendo il service account creato in eksStack, ottendo il ruolo e glielo passo
                //role: eksStack.serviceAccount.role 
              });

        const buildOutput = new Artifact();
        const buildAction = new CodeBuildAction({
            actionName: `${prefix}-CodeBuild`,
            input: sourceOutput,
            project: project,
            outputs: [buildOutput],
            executeBatchBuild: false,
        });


        const pipeline = new Pipeline(this, 'EKSPipeline',{
            pipelineName: `${prefix}-Pipeline`,
            stages: [
                {
                    stageName: "Source",
                    actions: [sourceAction]
                },
                {
                    stageName: "Build",
                    actions:[buildAction]
                }

            ]

        })

    }
}