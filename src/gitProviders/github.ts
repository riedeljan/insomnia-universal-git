import axios from 'axios';

export class Github {

    constructor (private config) {    }

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
                `${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/contents/${this.config.configFileName}`,
                {
                    "branch": this.config.branch,
                    "content": "IA==",
                    "message": `Init new config file ${this.config.configFileName}`
                }
            );
        } catch(e) {
            console.error(e.response);
            throw 'Creating a new file via Github API failed.'
        }
    }

    async createRemoteBranchFromCurrent(branchName) {
        try {
            await this.authenticate().post(`${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/git/refs`,{"ref":"refs/heads/"+branchName,"sha":this.config.branch});
        } catch(e) {
            console.error(e.response);
            throw 'Creating a new branch via Github API failed.'
        }
    }

    async fetchBranches() {
        if (!this.config?.baseUrl || !this.config?.projectId || !this.config?.token) {
            return [];
        }
        try {
            const response = await this.authenticate().get(`${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/git/refs/heads`,);

            return response.data.map((o) => {
                let heads = o.ref.split("/");
                return heads[heads.length-1];
            });

        } catch(e) {
            console.error(e);
            throw 'Fetching the projects branches via Github API failed.'
        }
    }

    async pullWorkspace() {
        try {
            const getFileResponse = await this.authenticate().get(`${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/contents/${this.config.configFileName}`);
            const response = await this.authenticate().get(getFileResponse.data.download_url);
            return(response.data);
        } catch (e) {
            console.error(e);
            throw 'Fetching the workspace via Github API failed.'
        }
    }

    findObjectByKey(array, key, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return array[i];
            }
        }
        return null;
    }

    async pushWorkspace(content, messageCommit) {
        try {
            const buff = Buffer.from(content, 'utf-8');
            const contentBase64 = buff.toString('base64');

            let data = {
                "branch": this.config.branch,
                "message": messageCommit,
                "content":contentBase64,
                sha: null
            };

            const refs = await this.authenticate().get(`${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/git/refs/heads`);
            const info = this.findObjectByKey(refs.data, "ref", `refs/heads/${this.config.branch}`);
            const tree = await this.authenticate().get(`${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/git/trees/${info.object.sha}`);
            const fileTreeInfo = this.findObjectByKey(tree.data.tree,"path",this.config.configFileName);

            if(fileTreeInfo != null){
                data.sha=fileTreeInfo.sha;
            }

            await this.authenticate().put(
                `${this.config.baseUrl}/repos/${this.config.organization}/${this.config.projectId}/contents/${this.config.configFileName}`,
                data,
            );
        } catch(e) {
            console.error("response:", e.response);
            throw 'Pushing the workspace via Github API failed.'
        }
    }
}
