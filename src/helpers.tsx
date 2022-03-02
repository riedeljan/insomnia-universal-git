import {UserConfig} from "./interfaces/UserConfig";
import {GitHub} from "./gitProviders/github";
import {GitLab} from "./gitProviders/gitlab";

export async function storeConfig(context: any, userConfig: UserConfig) {
    await context.store.setItem('gitlab-sync:config', JSON.stringify(userConfig));
}


export async function loadConfig(context: any) : Promise<UserConfig | null>{
    const storedConfig = await context.store.getItem('gitlab-sync:config');
    try {
        return JSON.parse(storedConfig);
    } catch(e) {
        return null;
    }
}

export function getProvider(config){
    return (config.provider == "github")?new GitHub(config):new GitLab(config);
}