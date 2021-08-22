import axios from 'axios';
import * as React from "react";

export class GitLab extends React.Component<any, any>{

    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.createNewBranch = this.createNewBranch.bind(this);
    }

    async componentDidMount() {
        await this.loadBranches();
    }

    private handleChange(event) {
        const { target: { name, value } } = event;
        this.props.onElementChange(name,value);
        console.debug("Update state property: ", name, value);
    }

    private async loadBranches() {

        const branches: Array<any> = await this.fetchBranches();
        console.debug("branches:", branches);
        const branchOptions = branches.map((b) => {
            let rObj = {};
            rObj['value'] = b;
            rObj['label'] = b;
            return rObj;
        });
        this.props.onElementChange('branch',this.props.context.branch ? this.props.context.branch : branches[0]);
        this.props.onElementChange('branchOptions',branchOptions);
    }

    private async createNewBranch() {
        try {
            const branchName = await this.props.context.app.prompt(
                'Set new branch name:', {
                    label: 'Branch name',
                    defaultValue: 'develop',
                    submitName: 'Submit',
                    cancelable: true,
                }
            );

            await this.createRemoteBranchFromCurrent(branchName);
            this.props.onElementChange('branch',branchName);

            await this.loadBranches();
            await this.props.context.app.alert('Success!', `Created new branch "${branchName}".`);

        } catch (e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong. Does the branch exist already?.');
            throw 'Creating a new branch via API failed.';
        }
    }

    private flexContainerStyle = {
        'display': 'flex'
    }

    private newBranchButtonStyle = {
        'display': 'flex',
        'flex-direction': 'row',
        'flex-basis': '50%'
    }

    private flexChild ={
        'flex':  '1 1 auto'
    }

    render() {
        return (
            <form className="pad">
        <div className="form-control form-control--outlined">
        <label>
            BaseURL:
            <input name="baseUrl" type="text" placeholder="https://your.gitlab-instance.com" value={this.props.context.baseUrl} onChange={this.handleChange} />
            <input name="provider" type="hidden" value="gitlab" onChange={this.handleChange} />

        </label>
        <label>
            Access Token:
            <input name="token" type="text" placeholder="accessToken123" value={this.props.context.token} onChange={this.handleChange} />
        </label>
        <label>
        Project ID:
        <input name="projectId" type="text" placeholder="23" value={String(this.props.context.projectId)} onChange={this.handleChange} />
        </label>
        <label>
        Workspace File Name:
            <input name="configFileName" type="text" placeholder="config.json" value={this.props.context.configFileName} onChange={this.handleChange} />
        </label>
        <label>
            Branch:
            <div style={this.flexContainerStyle}>
                <select name="branch" style={this.flexChild} value={this.props.context.branch} onChange={this.handleChange}>
                    {this.props.context.branchOptions.map((branch) => (<option key={branch.value} value={branch.value}>{branch.label}</option>))}
                </select>
                <div style={this.flexChild}>
                    <button type="button" style={this.newBranchButtonStyle} onClick={this.createNewBranch}>New Branch</button>
                </div>
            </div>
                </label>
                </div>
            </form>
    );
    }

  authenticate(context) {
    const baseUrl =  context.baseUrl;
    const token = context.token;


    return axios.create({
      baseURL: baseUrl,
      timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'json'
    });
  }

  private async initRemoteConfigFile() {
    try {
      await this.authenticate(this.props.context).post(
        `${this.props.context.baseUrl}/api/v4/projects/${this.props.context.projectId}/repository/files/${this.props.context.configFileName}`,
        {
          "branch": this.props.context.branch,
          "content": "{}",
          "commit_message": `Init new config file ${this.props.context.configFileName}`
        }
      );
    } catch(e) {
      console.error(e.response);
      throw 'Creating a new file via GitLab API failed.'
   }
  }

  async createRemoteBranchFromCurrent(branchName) {
    try {
      await this.authenticate(this.props.context).post(
        `${this.props.context.baseUrl}/api/v4/projects/${this.props.context.projectId}/repository/branches?branch=${branchName}&ref=${this.props.context.branch}`,
      );
    } catch(e) {
      console.error(e.response);
      throw 'Creating a new branch via GitLab API failed.'
   }
  }

  async fetchBranches() {
    if (!this.props.context?.baseUrl || !this.props.context?.projectId || !this.props.context?.token) {
      return [];
    }
    try {
      const response = await this.authenticate(this.props.context).get(
        `${this.props.context.baseUrl}/api/v4/projects/${this.props.context.projectId}/repository/branches`
      );

      return response.data.map((o) => o.name);
    } catch(e) {
      console.error(e);
      throw 'Fetching the projects branches via GitLab API failed.'
    }
  }

  async pullWorkspace(context) {
    try {
      const response = await this.authenticate(context).get(
        `${context.baseUrl}/api/v4/projects/${context.projectId}/repository/files/${context.configFileName}/raw?ref=${context.branch}`
      );
      return(response.data);
    } catch (e) {
        console.error(e);
        throw 'Fetching the workspace via GitLab API failed.'
    }
  }

  async pushWorkspace(content, messageCommit,context) {
   try {
    await this.authenticate(context).post(
      `${context.baseUrl}/api/v4/projects/${context.projectId}/repository/commits`,
      {
        "branch": context.branch,
        "commit_message": messageCommit,
        "actions": [
          {
            "action": "update",
            "file_path": context.configFileName,
            "content": content
          }
        ]
      },
    );
   } catch(e) {
      if (e.response.data.message === "A file with this name doesn't exist") {
        await this.initRemoteConfigFile()
        await this.authenticate(context).post(
          `${context.baseUrl}/api/v4/projects/${context.projectId}/repository/commits`,
          {
            "branch": context.branch,
            "commit_message": messageCommit,
            "actions": [
              {
                "action": "update",
                "file_path": context.configFileName,
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
