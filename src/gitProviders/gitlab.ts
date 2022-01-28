import axios, {AxiosResponse} from 'axios';
import {UserConfig} from '../interfaces/UserConfig';
import {CommitInfo} from "../interfaces/CommitInfo";

export class Gitlab {

  constructor(private config) {
  }

  authenticate() {
    return axios.create({
      baseURL: `${this.config.baseUrl}`,
      timeout: 10000,
      headers: {Authorization: `Bearer ${this.config.token}`},
      responseType: 'json'
    });
  }

  private validateQueryPart(query) {
    return query.replaceAll("/", "%2F")
  }

  private async initRemoteConfigFile() {
    try {
      await this.authenticate().post(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${this.validateQueryPart(this.config.configFileName)}`,
        {
          "branch": this.config.branch,
          "content": "{}",
          "commit_message": `Init new config file ${this.config.configFileName.split("/").pop()}`
        }
      );
    } catch (e) {
      console.error(e.response);
      throw 'Creating a new file via GitLab API failed.'
    }
  }

  async createRemoteBranchFromCurrent(branchName) {
    try {
      await this.authenticate().post(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/branches?branch=${branchName}&ref=${this.config.branch}`,
      );
    } catch (e) {
      console.error(e.response);
      throw 'Creating a new branch via GitLab API failed.'
    }
  }

  async fetchBranches() {
    if (!this.config?.baseUrl || !this.config?.projectId || !this.config?.token) {
      return [];
    }
    try {
      const response = await this.authenticate().get(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/branches`
      );

      const branches = response.data.map((o) => o.name);

      return branches;
    } catch (e) {
      console.error(e);
      throw 'Fetching the projects branches via GitLab API failed.'
    }
  }

  async fetchCommits(pageNo: number) {
    if (!this.config?.baseUrl || !this.config?.projectId || !this.config?.token) {
      return [];
    }
    try {
      const response: AxiosResponse<CommitInfo[]> = await this.authenticate().get(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits?page=${pageNo}`
      );

      return response.data
    } catch (e) {
      console.error(e);
      throw 'Fetching the projects branch commit via GitLab API failed.'
    }
  }

  async pullWorkspace() {
    try {
      const response = await this.authenticate().get(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${this.validateQueryPart(this.config.configFileName)}/raw?ref=${this.config.branch}`
      );
      return (response.data);
    } catch (e) {
      console.error(e);
      throw 'Fetching the workspace via GitLab API failed.'
    }
  }

  async pushWorkspace(content, messageCommit) {
    try {
      await this.authenticate().post(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits`,
        {
          "branch": this.config.branch,
          "commit_message": messageCommit,
          "actions": [
            {
              "action": "update",
              "file_path": this.config.configFileName,
              "content": content
            }
          ]
        },
      );
    } catch (e) {
      if (e.response.data.message === "A file with this name doesn't exist") {
        await this.initRemoteConfigFile()
        await this.authenticate().post(
          `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits`,
          {
            "branch": this.config.branch,
            "commit_message": messageCommit,
            "actions": [
              {
                "action": "update",
                "file_path": this.config.configFileName,
                "content": content
              }
            ]
          },
        );
      } else {
        console.error("response:", e.response);
        throw 'Pushing the workspace via GitLab API failed.'
      }
    }
  }
}
