import axios, {AxiosResponse} from 'axios';
import {WorkspaceConfig} from '../models/WorkspaceConfig';
import {CommitInfo} from "../models/CommitInfo";
import {Project} from "../models/Project";
import {domainToASCII} from "url";
import {Branch} from "../models/Branch";

export class Gitlab {

  constructor(private config: WorkspaceConfig) {
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
        `${this.buildRepoUrl()}files/${this.validateQueryPart(this.config.configFileName)}`,
        {
          "branch": this.config.branch.name,
          "content": "{}",
          "commit_message": `Init new config file ${this.config.configFileName.split("/").pop()}`
        }
      );
    } catch (e) {
      console.error(e.response);
      throw 'Creating a new file via GitLab API failed.'
    }
  }

  async createRemoteBranchFromCurrent(branchName): Promise<Branch> {
    try {
      const response = await this.authenticate().post(
        `${this.buildRepoUrl()}branches?branch=${branchName}&ref=${this.config.branch.name}`,
      );

      return response.data
    } catch (e) {
      console.error(e.response);
      throw 'Creating a new branch via GitLab API failed.'
    }
  }

  async fetchBranches(): Promise<Branch[]> {
    if (!this.config?.baseUrl || !this.config?.project?.id || !this.config?.token) {
      return [];
    }
    try {
      const response = await this.authenticate().get(
        `${this.buildRepoUrl()}branches`
      );

      return response.data;
    } catch (e) {
      console.error(e);
      throw `Fetching the projects branches via GitLab API failed.  ${e}`
    }
  }

  async fetchProjects(pageNo: number, search?: string): Promise<Project[]> {
    if (!this.config?.baseUrl || !this.config?.token) {
      return [];
    }
    try {
      const response = await this.authenticate().get(
        `${this.config.baseUrl}/api/v4/projects?page=${pageNo}${search ? `&search=${search}` : ""}`
      );

      return response.data;
    } catch (e) {
      console.error(e);
      throw `Fetching the projects via GitLab API failed. ${e}`
    }
  }

  async fetchCommits(pageNo: number) {
    if (!this.config?.baseUrl || !this.config?.project?.id || !this.config?.token) {
      return [];
    }
    try {
      const response: AxiosResponse<CommitInfo[]> = await this.authenticate().get(
        `${this.buildRepoUrl()}commits?page=${pageNo}&ref_name=${this.config.branch.name}`
      );

      return response.data
    } catch (e) {
      console.error(e);
      throw `Fetching the projects branch commit via GitLab API failed. ${e}`
    }
  }

  async pullWorkspace() {
    try {
      const response = await this.authenticate().get(
        `${this.buildRepoUrl()}files/${this.validateQueryPart(this.config.configFileName)}/raw?ref=${this.config.branch.name}`
      );
      return (response.data);
    } catch (e) {
      console.error(e);
      throw `Fetching the workspace via GitLab API failed. ${e}`
    }
  }

  async pushWorkspace(content, messageCommit) {
    try {
      await this.authenticate().post(
        `${this.buildRepoUrl()}commits`,
        {
          "branch": this.config.branch.name,
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
          `${this.buildRepoUrl()}commits`,
          {
            "branch": this.config.branch.name,
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
        throw `Pushing the workspace via GitLab API failed. ${e.response}`
      }
    }
  }

  private buildRepoUrl() {
    return `${this.config.baseUrl}/api/v4/projects/${this.config.project.id}/repository/`;
  }
}
