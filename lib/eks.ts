import { Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AlbControllerVersion, Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BuildConfig } from '../common_config/build_config';
import { NetworkImportStack } from './network-import';
import { getContainers } from './eksFunctions/eksFunctions';

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, netProps: NetworkImportStack, props?: StackProps) {
    super(scope, id, props);

    const prefix = `${buildConfig.environment}-${buildConfig.project}`;
    const eksConfig = buildConfig.stacks.eks;

    const clusterRole = new Role(this, "clusterRole", {
      assumedBy: new ServicePrincipal("eks.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),]
    });

    const eksCluster = new Cluster(this, "ClusterTemplate", {
      clusterName: `${prefix}-eks-cluster`,
      version: KubernetesVersion.of(eksConfig.version),
      vpc: netProps.vpc,
      vpcSubnets: [{ subnets: eksConfig.privateSubnets ? netProps.privateSubnets : netProps.publicSubnets },],
      defaultCapacity: 0,
      role: clusterRole,
      albController: {
        version: AlbControllerVersion.of(eksConfig.albVersion)
      },

    });

    let istancesType: InstanceType[] = [];
    eksConfig.istanceTypes.forEach((type) => {
      istancesType.push(new InstanceType(`${type.class}.${type.size}`))
    });

    //add a Node Group of aws ec2 istances self-managed 
    eksCluster.addNodegroupCapacity(`${prefix}-eks-cluster`, {
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
    eksConfig.resources.namespaces.forEach((ns) => {
      resources.push(
        {
          apiVersion: eksConfig.resources.namespaces.forEach((ns) => {
            resources.push({
              apiVersion: ns.apiversion,
              kind: 'Namespace',
              metadata: { name: ns.metadataName },
            }
            )
          }),
        }
      );
    })

    //configMap
    resources.push(
      {
        apiVersion: eksConfig.resources.configmap.apiVersion,
        kind: "ConfigMap",
        metadata: {
          name: eksConfig.resources.configmap.metadata.name,
          namespace: eksConfig.resources.configmap.metadata.namespace
        },
        data:{
          [eksConfig.resources.configmap.data.key] : eksConfig.resources.configmap.data.value
        }

      }
    )


    //secret
    resources.push(
      {
        apiVersion: eksConfig.resources.secret.apiVersion,
        kind: "Secret",
        metadata: {
          name: eksConfig.resources.secret.metadata.name,
          namespace: eksConfig.resources.secret.metadata.namespace
        },
        type: eksConfig.resources.secret.type,
        data: {
          [eksConfig.resources.secret.data.keyUser]: eksConfig.resources.secret.data.userValue,
          [eksConfig.resources.secret.data.keyPassword]: eksConfig.resources.secret.data.passwordValue
        }
      }
    )

    //deployments
    eksConfig.resources.deployments.forEach((deploy) => {
      resources.push(
        {
          apiVersion: deploy.apiVersion,
          kind: "Deployment",
          metadata: {
            name: deploy.metadata.name,
            namespace: deploy.metadata.namespace
          },
          spec: {
            replicas: deploy.spec.replicas,
            selector: { matchLabels: eksConfig.resources.appLabel, },
            template: {
              metadata: {
                labels: eksConfig.resources.appLabel,
                namespace: deploy.metadata.namespace
              },
              spec: {
                containers: [getContainers(deploy)]
              }
            }
          }
        }
      )
    })


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
            selector: eksConfig.resources.appLabel,
            ports:
            {
              port: service.spec.ports.port,
              targetPort: service.spec.ports.targetPort,
              nodePort: service.spec.ports.nodePort ? service.spec.ports.nodePort : null //???
            }
          }
        }
      )
    });

    //adding resources to k8 cluster
    eksCluster.addManifest("k8-resources", resources);

  }
}