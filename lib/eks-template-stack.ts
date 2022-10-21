import { Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { SelfManagedKafkaEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { BuildConfig } from '../common_config/build_config';
import { NetworkImportStack } from './network-import';

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, netProps: NetworkImportStack, props?: StackProps) {
    super(scope, id, props);

    const prefix = `${buildConfig.environment}-${buildConfig.project}`;
    const eksConfig = buildConfig.stacks.eks;

    const clusterRole = new Role(this, "clusterRole", {
      assumedBy: new ServicePrincipal("eks.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),]
    });

    const cluster = new Cluster(this, "ClusterTemplate", {
      clusterName: `${prefix}-eks-cluster`,
      version: KubernetesVersion.of(eksConfig.version),
      vpc: netProps.vpc,
      vpcSubnets: [{ subnets: eksConfig.private ? netProps.privateSubnets : netProps.publicSubnets },],
      defaultCapacity: 0,
      role: clusterRole

    });

    let istancesType: InstanceType[] = [];
    eksConfig.istanceTypes.forEach((type) => {
      istancesType.push(new InstanceType(`${type.class}.${type.size}`))
    });

    //add a Node Group of aws ec2 istances self-managed 
    cluster.addNodegroupCapacity(`${prefix}-eks-cluster`, {
      nodegroupName: `${prefix}-node-group`,
      instanceTypes: istancesType,
      desiredSize: eksConfig.desiredCapacity,
      minSize: eksConfig.minSize,
      maxSize: eksConfig.maxSize,
      diskSize: eksConfig.diskSize
    });

    let resources: any[] = [];
    //Resources must be deployed in a specific order. 
    //You cannot define a resource in a Kubernetes namespace before the namespace was created

    //namspaces
    resources.push(
      {
        apiVersion: eksConfig.resources.namespaces.forEach((ns) => {
          resources.push({
            apiVersion: ns.apiversion,
            kind: 'Namespace',
            metadata: { name: ns.metadataName },}
          )
        }),
      }
    );

    //services
    eksConfig.resources.services.forEach((service) => {
      resources.push(
        {
          apiVersion: service.apiVersion,
          kind: "Service",
          metadata: {
            name: service.metadata.name,
            namespace: service.metadata.namespace
          },
          spec: {
            type: service.spec.type,
            ports: [
              {
                port: service.spec.ports.port,
                targetPort: service.spec.ports.targetPort,
                nodePort: service.spec.ports.nodePort //???
              }
            ],
            selector: eksConfig.resources.appLabel,
          }
        }
      )
    });

    //deployment


    //adding resources to k8 cluster
    cluster.addManifest("k8-resources", resources);



  }
}
