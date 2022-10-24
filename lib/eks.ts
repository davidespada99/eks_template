import { Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AlbControllerVersion, Cluster, KubernetesVersion, Selector } from 'aws-cdk-lib/aws-eks';
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
      //ingress alb
      albController: {
        version: AlbControllerVersion.of(eksConfig.albVersion)
      },

    });

    let istancesType: InstanceType[] = [];
    eksConfig.istanceTypes.forEach((type) => {
      istancesType.push(new InstanceType(`${type.class}.${type.size}`))
    });

    //add a Node Group of aws ec2 istances self-managed 
    if(eksConfig.nodeGroup){
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

    
    if(eksConfig.fargate){
      let selectors: Selector[] = [];
      eksConfig.fargateSelector.forEach((sel)=>{
        selectors.push(
          {
            namespace: sel.fargateNamespaceSelector,
            labels: {[sel.fargatePodLabels.labelName]: sel.fargatePodLabels.labelValue }
          }
        )
      })
      
      eksCluster.addFargateProfile( "MyFargateProfile", {
        vpc: netProps.vpc,
        fargateProfileName: `${prefix}-fargate-profile`,
        selectors: selectors
      })
    }
    

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
    eksConfig.resources.configmap.forEach((cm) => {
      resources.push(
        {
          apiVersion: cm.apiVersion,
          kind: "ConfigMap",
          metadata: {
            name: cm.metadata.name,
            namespace: cm.metadata.namespace
          },
          data:{
            [cm.data.key] : cm.data.value
          }
  
        }
      )
    })
    


    //secret
    eksConfig.resources.secret.forEach((sec) => {
      resources.push(
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
            selector: { matchLabels: eksConfig.resources.selectorAppLabel, },
            template: {
              metadata: {
                labels: eksConfig.resources.selectorAppLabel,
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
            selector: eksConfig.resources.selectorAppLabel,
            ports:
            {
              port: service.spec.ports.port,
              targetPort: service.spec.ports.targetPort,
              nodePort: service.spec.ports.nodePort ? service.spec.ports.nodePort : null 
            }
          }
        }
      )
    });

    //adding resources to k8 cluster
    eksCluster.addManifest("k8-resources", resources);

  }
}
