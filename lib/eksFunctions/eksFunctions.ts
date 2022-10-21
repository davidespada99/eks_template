import { containersConfig, deployConfig, envMapKeyRef, envSecretConfig } from "../../common_config/build_config";

export function getContainers(deploy: deployConfig) {
    let containers: any[] = [];
    deploy.spec.template.containers.forEach((container: containersConfig) => {
        containers.push({
            name: container.name,
            image: container.image,
            containerPort: container.containerPort,
            env: [
                getSecret(container),
                getMapKeyRef(container)
            ]
        })
    })
    return containers;
}

function getSecret(container: containersConfig) {
    let secrets: any[] = [];
    if (container.envSecret) {
        container.envSecret.forEach((secret: envSecretConfig) => {
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
        return secrets;
    }
    else { return null; }

}

function getMapKeyRef(container: containersConfig) {
    let mapKeys: any[] = [];
    if (container.envMapKey) {
        container.envMapKey.forEach((mapkey: envMapKeyRef) => {
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
        return mapKeys;
    }
    else { return null; }

}