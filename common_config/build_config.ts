export interface BuildConfig {
	readonly account: string;
	readonly region: string;
	readonly project: string;
	readonly environment: string;
	readonly stacks: BuildStacks;
}

export interface BuildStacks {
	network: BuildNetworkStack;
	eks: EksStack;
}

export interface BuildNetworkStack {
    vpcCidr: string;
    privateSubnets: SubnetConfig[];
    publicSubnets: SubnetConfig[];
}
export interface SubnetConfig {
    zone: string;
    cidr: string;
    id: string;
}

export interface EksStack{
	version: string;
	private: boolean;
	desiredCapacity: number;
	minSize: number;
	maxSize: number;
	diskSize: number;
	istanceTypes: istanceConfig[];
	resources: resourcesConfig;
}

export interface istanceConfig{
	class: string;
	size: string;
}

export interface resourcesConfig{
	appLabel: string
	namespaces: nsConfig[];
	services: servicesConfig[];
	deployments: deployConfig[];
	secret: secretConfig;
	configmap: configMapConfig;
}

export interface nsConfig{
	apiversion: string
	metadataName: string
}

export interface servicesConfig{
	apiVersion: string;
	metadata: metadataConfig;
	spec: serviceSpecConfig;
}

export interface metadataConfig{
	name: string;
	namespace: string
}

export interface serviceSpecConfig{
	type: string,
    ports: portsConfig
}

export interface portsConfig{
	protocol: string;
	port: number
	targetPort: number
	nodePort: number
}

export interface deployConfig{
	apiVersion: string;
	metadata: metadataConfig;
	spec: deploySpecConfig;
}

export interface deploySpecConfig{
	replicas: number;
	template: templateConfig;
}

export interface templateConfig{
	metadata: metadataConfig;
	containers: containersConfig[];
}

export interface containersConfig{
	name: string
	image: string;
	containerPort: number
	envSecret: envSecretConfig[];
	envMapKey: envMapKeyRef[];	
}

export interface envSecretConfig{
	name: string;
	secretName: string;
	secretKey: string
}

export interface envMapKeyRef{
	name: string;
	MapKeyRefName: string;
	MapKeyRefKey: string
}
