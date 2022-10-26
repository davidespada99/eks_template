import { Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AlbController, AlbControllerVersion, Cluster, KubernetesVersion, Selector} from 'aws-cdk-lib/aws-eks';
import { IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal, User } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BuildConfig } from '../common_config/build_config';
import { NetworkImportStack } from './network-import';
import { getContainers } from './eksFunctions/eksFunctions';

export class EksStack extends Stack {

  public eksRoleArn: string;

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
      vpcSubnets: [{ subnets: eksConfig.privateSubnets ? netProps.privateSubnets : netProps.publicSubnets }],
      defaultCapacity: 0,
      role: clusterRole,
    });

    //alb (Ingress) Controller
    const albController = new AlbController(this, "alb-controller", {
      cluster: eksCluster,
      version: AlbControllerVersion.V2_4_1
    });

    //add a Node Group of aws ec2 istances self-managed 
    if (eksConfig.nodeGroup) {
      let istancesType: InstanceType[] = [];
      eksConfig.istanceTypes.forEach((type) => {
        istancesType.push(new InstanceType(`${type.class}.${type.size}`))
      });

      eksCluster.addNodegroupCapacity(`${prefix}-eks-cluster`, {
        nodegroupName: `${prefix}-node-group`,
        instanceTypes: istancesType,
        desiredSize: eksConfig.desiredCapacity,
        minSize: eksConfig.minSize,
        maxSize: eksConfig.maxSize,
        diskSize: eksConfig.diskSize
      });
    }

    //add Fargate profile to EKS Cluster
    if (eksConfig.fargate) {
      let selectors: Selector[] = [];
      eksConfig.fargateSelector.forEach((sel) => {
        selectors.push(
          {
            namespace: sel.fargateNamespaceSelector,
            labels: { [sel.fargatePodLabels.labelName]: sel.fargatePodLabels.labelValue }
          }
        )
      })

      eksCluster.addFargateProfile("MyFargateProfile", {
        vpc: netProps.vpc,
        fargateProfileName: `${prefix}-fargate-profile`,
        selectors: selectors
      })
    }


    //Resources must be deployed in a specific order. 
    //You cannot define a resource in a Kubernetes namespace before the namespace was created

    //namespace(beside the defaul namespace)
    /*const namespace = eksCluster.addManifest("namespaceManifest", {
      apiVersion: eksConfig.resources.namespace.apiversion,
      kind: 'Namespace',
      metadata: {
        name: eksConfig.resources.namespace.name,
        labels: {
          name: eksConfig.resources.namespace.name
        }
      },
    })*/

    //configMap
    eksConfig.resources.configMap.forEach((config) => {
      eksCluster.addManifest("configMapManifest",
        {
          apiVersion: config.apiVersion,
          kind: "ConfigMap",
          metadata: {
            name: config.metadata.name,
            namespace: config.metadata.namespace
          },
          data: {
            [config.data.key]: config.data.value
          }
        }
      )
    })



    //secret
    eksConfig.resources.secret.forEach((sec) => {
      eksCluster.addManifest("secretManifest",
        {
          apiVersion: sec.apiVersion,
          kind: "Secret",
          metadata: {
            name: sec.metadata.name,
            namespace: sec.metadata.namespace
          },
          type: sec.type,
          data: {
            [sec.data.keyUser]: sec.data.userValue,
            [sec.data.keyPassword]: sec.data.passwordValue
          }
        }
      )
    })


    //deployments
    eksConfig.resources.deployments.forEach((deploy) => {
      const deployment = eksCluster.addManifest("deploymentsManifest",
        {
          apiVersion: deploy.apiVersion,
          kind: "Deployment",
          metadata: {
            name: deploy.metadata.name,
            namespace: deploy.metadata.namespace,
            labels: {
              app: eksConfig.resources.selectorLabel
            }
          },
          spec: {
            replicas: deploy.spec.replicas,
            selector: {
              matchLabels: {
                app: eksConfig.resources.selectorLabel
              }
            },
            template: {
              metadata: {
                labels: { app: eksConfig.resources.selectorLabel },
                namespace: deploy.metadata.namespace
              },
              spec: {
                containers: getContainers(deploy)
              }
            }
          }
        })
    })



    //services
    eksConfig.resources.services.forEach((service) => {
      const sv = eksCluster.addManifest("serviceManifest",
        {
          apiVersion: service.apiVersion,
          kind: "Service",
          metadata: {
            name: service.metadata.name,
            namespace: service.metadata.namespace
          },
          spec: {
            type: service.spec.type,
            selector:{
               app: eksConfig.resources.selectorLabel
              },
            ports:
            [
             { protocol: service.spec.ports.protocol,
              port: service.spec.ports.port,
              targetPort: service.spec.ports.targetPort,
              nodePort: service.spec.ports.nodePort ? service.spec.ports.nodePort : null}
            ]
          }
        }
      )

    });

    //add permission to access eks cluster from aws console
    eksCluster.awsAuth.addUserMapping(
      User.fromUserArn(this, `${prefix}-auth`, "arn:aws:iam::663614489119:user/d.spada"),
      {
        groups: ["system:masters"],
        username: "d.spada_663614489119",
      }
    );

    const eksRole = new Role(this, "eksRole", {
      assumedBy: new ServicePrincipal("codebuild.amazonaws.com")
    })

    this.eksRoleArn = eksRole.roleArn;

    //creates IAM role, then referenced in codebuild to access k8
    eksCluster.awsAuth.addRoleMapping(
      Role.fromRoleArn(this, `code-build`, eksRole.roleArn),
      {
        groups: ["system:masters"],
        username: "codebuild",
      }
    );

  }
}
