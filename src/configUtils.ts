import {WorkspaceConfig} from "./models/WorkspaceConfig";

export function getWorkspaceConfigKey(workspaceId: string) {
  return `gitlab-sync:config-${workspaceId}`;
}

export async function loadConfig(context, models): Promise<WorkspaceConfig | null> {
  const storedConfig = await context.store.getItem(getWorkspaceConfigKey(models.workspace._id));
  try {
    return JSON.parse(storedConfig);
  } catch (e) {
    return null;
  }
}

export async function storeConfig(context, models, userConfig: WorkspaceConfig) {
  await context.store.setItem(getWorkspaceConfigKey(models.workspace._id), JSON.stringify(userConfig));
}

export async function clearConfig(context, models) {
  await context.store.setItem(getWorkspaceConfigKey(models.workspace._id), null);
}

