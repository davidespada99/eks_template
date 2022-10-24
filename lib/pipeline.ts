import { Stack, StackProps } from "aws-cdk-lib";
import { Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { BuildConfig } from "../common_config/build_config";

export class PipelineStack extends Stack{
    constructor(scope: Construct, id: string, buildConfig: BuildConfig,  props: StackProps){
        super(scope, id, props)

        const prefix = `${buildConfig.environment}-${buildConfig.project}`;
        //const pipeConfig = buildConfig.stacks.pipeline;

        const repository: 
        //CodeCommit
        const sourceOutput = new Artifact();
        const sourceAction = new CodeCommitSourceAction({
            actionName: `${prefix}-CodeCommit`,
            repository: repo,
            branch: "main",
            output: sourceOutput
        });

        const pipeline = new Pipeline(this, 'EKS-Pipeline',{
            pipelineName: `${prefix}-pipeline`,
            stages: []

        })

    }
}