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
	aurora: AuroraDBStack;
	pipeline: PipelineStack;
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
	privateSubnets: boolean;
	desiredCapacity: number;
	minSize: number;
	maxSize: number;
	albVersion: string;
	diskSize: number;
	istanceTypes: istanceConfig[];
	resources: resourcesConfig;
	nodeGroup: boolean;
	fargate: boolean;
	fargateSelector: fargateConfig[];
	
}
export interface fargateConfig{
	fargateNamespaceSelector: string;
	fargatePodLabels: labelsFargate;
}
export interface labelsFargate{
	labelName: string;
	labelValue: string;
}

export interface istanceConfig{
	class: string;
	size: string;
}

export interface resourcesConfig{
	selectorLabel: string
	namespace: nsConfig;
	services: servicesConfig[];
	deployments: deployConfig[];
	secret: secretConfig[];
	configMap: configMapConfig[];
}

export interface nsConfig{
	apiversion: string
	name: string
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

export interface secretConfig{
	apiVersion: string;
	metadata: metadataConfig;
	type: string;
	data: dataSecretCongif;
}

export interface dataSecretCongif{
	keyUser: string;
	userValue: string;
	keyPassword: string;
	passwordValue: string;
}

export interface configMapConfig{
	apiVersion: string;
	metadata: metadataConfig;
	data: dataMapConfig;
}

export interface dataMapConfig{
	key: string;
	value: string;
}

export interface AuroraDBStack{
	engine: string;
	majorVersion: string;
	version: string;
	istanceClass: string;
	istanceSize: string;
	privateSubnets: boolean;
	deletionProtection: boolean;
	istancesNumber: number;
}

export interface PipelineStack{
	importRepoName: string;
	sourceBranchName: string;
}