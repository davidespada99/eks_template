import { containersConfig, deployConfig, envMapKeyRef, envSecretConfig } from "../../common_config/build_config";

export function getContainers(deploy: deployConfig) {
    let containers: any[] = [];
    deploy.spec.template.containers.map((container: containersConfig) => {
        containers.push({
            name: container.name,
            image: container.image,
            ports: [{containerPort: container.containerPort}],
            env: getSecret(container)
            
                
            
        })
    })
    return containers;
}

function getSecret(container: containersConfig) {
    let secrets: any[] = [];
    if (container.envSecret) {
       return container.envSecret.map((secret: envSecretConfig) => {
            secrets.push(
                {
                    name: secret.name,
                    valueFrom: {
                        secretKeyRef: {
                            name: secret.secretName,
                            key: secret.secretKey
                        }
                    }
                }
            )
        })
    }
    else { return null; }

}

function getMapKeyRef(container: containersConfig) {
    let mapKeys: any[] = [];
    if (container.envMapKey) {
       return container.envMapKey.map((mapkey: envMapKeyRef) => {
            mapKeys.push(
                {
                    name: mapkey.name,
                    valueFrom: {
                        secretKeyRef: {
                            name: mapkey.MapKeyRefName,
                            key: mapkey.MapKeyRefKey
                        }
                    }
                }
            )
        })
    }
    else { return null; }
}
