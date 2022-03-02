import * as React from "react";
import axios from 'axios';

export class GitHub extends React.Component<any, any>{

    constructor(props) {
        super(props);
        console.debug("GitHub component context:", this.context);
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

    createNewBranch = async () =>{

        try {
            const branchName = await this.props.app.prompt(
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
            await this.props.app.alert('Success!', `Created new branch "${branchName}".`);

        } catch (e) {
            console.error(e);
            await this.props.app.alert('Error!', 'Something went wrong. Does the branch exist already?.');
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
                Organization:
                <input name="organization" type="text" placeholder="" value={this.props.context.organization}
                       onChange={this.handleChange}/>
                <input name="baseUrl" type="hidden" placeholder="https://api.github.com" value="https://api.github.com" onChange={this.handleChange} />
                <input name="provider" type="hidden" value="github" onChange={this.handleChange} />
            </label>
        <label>
            Access Token:
            <input name="token" type="text" placeholder="accessToken123" value={this.props.context.token} onChange={this.handleChange} />
        </label>
        <label>
        Project Name:
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

    private static authenticate(context) {
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
            await GitHub.authenticate(this.props.context).post(
                `${this.props.context.baseUrl}/repos/${this.props.context.organization}/${this.props.context.projectId}/contents/${this.props.context.configFileName}`,
                {
                    "branch": this.props.context.branch,
                    "content": "IA==",
                    "message": `Init new config file ${this.props.context.configFileName}`
                }
            );
        } catch(e) {
            console.error(e.response);
            throw 'Creating a new file via Github API failed.'
        }
    }

    async createRemoteBranchFromCurrent(branchName) {
        try {
            await GitHub.authenticate(this.props.context).post(`${this.props.context.baseUrl}/repos/${this.props.context.organization}/${this.props.context.projectId}/git/refs`,{"ref":"refs/heads/"+branchName,"sha":this.props.context.branch});
        } catch(e) {
            console.error(e.response);
            throw 'Creating a new branch via Github API failed.'
        }
    }

    async fetchBranches() {
        if (!this.props?.context.baseUrl || !this.props?.context.projectId || !this.props?.context.token) {
            return [];
        }
        try {
            const response = await GitHub.authenticate(this.props.context).get(`${this.props.context.baseUrl}/repos/${this.props.context.organization}/${this.props.context.projectId}/git/refs/heads`,);
            return response.data.map((o) => {
                let heads = o.ref.split("/");
                return heads[heads.length-1];
            });

        } catch(e) {
            console.error(e);
            throw 'Fetching the projects branches via Github API failed.'
        }
    }

    async pullWorkspace(context) {
        try {
            const getFileResponse = await GitHub.authenticate(context).get(`${context.baseUrl}/repos/${context.organization}/${context.projectId}/contents/${context.configFileName}`);
            const response = await GitHub.authenticate(context).get(getFileResponse.data.download_url);
            return(response.data);
        } catch (e) {
            console.error(e);
            throw 'Fetching the workspace via Github API failed.'
        }
    }

    private static findObjectByKey(array, key, value) {
        for (let i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return array[i];
            }
        }
        return null;
    }

    async pushWorkspace(content, messageCommit,context) {
        try {
            const buff = Buffer.from(content, 'utf-8');
            const contentBase64 = buff.toString('base64');

            let data = {
                "branch": context.branch,
                "message": messageCommit,
                "content":contentBase64,
                sha: null
            };
            console.debug("props:", this.props);

            const refs = await GitHub.authenticate(context).get(`${context.baseUrl}/repos/${context.organization}/${context.projectId}/git/refs/heads`);
            const info = GitHub.findObjectByKey(refs.data, "ref", `refs/heads/${context.branch}`);
            const tree = await GitHub.authenticate(context).get(`${context.baseUrl}/repos/${context.organization}/${context.projectId}/git/trees/${info.object.sha}`);
            const fileTreeInfo = GitHub.findObjectByKey(tree.data.tree,"path",context.configFileName);

            if(fileTreeInfo){
                data.sha=fileTreeInfo.sha;
            }

            await GitHub.authenticate(context).put(
                `${context.baseUrl}/repos/${context.organization}/${context.projectId}/contents/${context.configFileName}`,
                data,
            );
        } catch(e) {
            console.error("response:", e.response);
            throw 'Pushing the workspace via Github API failed.'
        }
    }
}
