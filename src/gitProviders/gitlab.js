import axios from 'axios';
export class Gitlab {
    constructor(context) {
        this.context = context;
    }
    async init() {
        this.config = await this.loadConfig(this.context);
    }
    async loadConfig(context) {
        const storedConfig = await context.store.getItem('gitlab-sync:config');
        try {
            return JSON.parse(storedConfig);
        }
        catch (e) {
            return null;
        }
    }
    // TODO: Write proper config validation
    /* private validateConfig(config): any {
      if( typeof(config.token) !== "string" || config.token == "" ){
        throw "Invalid token";
      }
      if(typeof(config.timeout) !== "number" || config.timeout == "") {
         config.timeout = 5000;
      }
      return config;
    } */
    authenticate() {
        return axios.create({
            baseURL: `${this.config.baseUrl}`,
            timeout: 10000,
            headers: { Authorization: `Bearer ${this.config.token}` },
        });
    }
    async pullWorkspace() {
        try {
            const response = await this.authenticate().get(`${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${this.config.configFileName}/raw?ref=${this.config.branch}`);
            await this.context.data.import.raw(JSON.stringify(response.data));
        }
        catch (e) {
            console.error(e);
            throw 'Fetching the workspace via GitLab API failed.';
        }
    }
    async pushWorkspace(content, messageCommit) {
        try {
            await this.authenticate().post(`${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits`, {
                "branch": this.config.branch,
                "commit_message": messageCommit,
                "actions": [
                    {
                        "action": "update",
                        "file_path": this.config.configFileName,
                        "content": content
                    }
                ]
            });
        }
        catch (e) {
            console.error(e);
            throw 'Pushing the workspace via GitLab API failed.';
        }
    }
}
//# sourceMappingURL=gitlab.js.map
