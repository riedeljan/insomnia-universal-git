import axios from 'axios';
import { UserConfig } from '../interfaces/UserConfig';

export class Gitlab {

  constructor (private config) {}

  authenticate() {
    return axios.create({
      baseURL: `${this.config.baseUrl}`,
      timeout: 1000,
      headers: { Authorization: `Bearer ${this.config.token}` },
      responseType: 'json'
    });
  }

  private async initRemoteConfigFile() {
    try {
      await this.authenticate().post(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${this.config.configFileName}`,
        {
          "branch": this.config.branch,
          "content": "{}",
          "commit_message": `Init new config file ${this.config.configFileName}`
        }
      );
    } catch(e) {
      console.error(e.response);
      throw 'Creating a new file via GitLab API failed.'
   }
  }

  async createRemoteBranchFromCurrent(branchName) {
    try {
      await this.authenticate().post(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/branches?branch=${branchName}&ref=${this.config.branch}`,
      );
    } catch(e) {
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
    } catch(e) {
      console.error(e);
      throw 'Fetching the projects branches via GitLab API failed.'
    }
  }

  async pullWorkspace() {
    try {
      const response = await this.authenticate().get(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${this.config.configFileName}/raw?ref=${this.config.branch}`
      );
      return(response.data);
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
   } catch(e) {
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
