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
	spec: specConfig;
}

export interface metadataConfig{
	name: string;
	namespace: string
}

export interface specConfig{
	type: string,
    ports: portsConfig
}

export interface portsConfig{
	protocol: string;
	port: number
	targetPort: number
	nodePort: number
}

