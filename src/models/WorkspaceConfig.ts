import {Project} from "./Project";
import {Branch} from "./Branch";

export interface WorkspaceConfig {
  'baseUrl': string,
  'token': string,
  'project': Project,
  'configFileName': string,
  'branch': Branch
}