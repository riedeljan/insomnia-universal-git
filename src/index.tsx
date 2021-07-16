import { Gitlab } from './gitProviders/gitlab';
import { UserConfig } from './interfaces/UserConfig';
import * as React from 'react';
import * as ReactDom from 'react-dom';

async function loadConfig(context): Promise<UserConfig | null> {
    const storedConfig = await context.store.getItem('gitlab-sync:config');
    try {
        return JSON.parse(storedConfig);
    } catch(e) {
        return null;
    }
}

async function storeConfig(context, userConfig: UserConfig) {
    await context.store.setItem('gitlab-sync:config', JSON.stringify(userConfig));
}

class GitlabConfigForm extends React.Component<any, any> {
    constructor(props) {
        super(props);
        this.state = {
            'baseUrl': "",
            'token': "",
            'projectId': null,
            'configFileName': "",
            'branch': "",
            'branchOptions': []
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.createNewBranch = this.createNewBranch.bind(this);
    }

    async componentDidMount() {
        const config: UserConfig = await loadConfig(this.props.context);
        this.setState(config);
        await this.loadBranches();
    }

    private handleChange(event) {
        const { target: { name, value } } = event;
        console.debug("Update state property: ", name, value);
        this.setState({[name]: value});
    }
    
    private async handleSubmit(event) {
        try {
            storeConfig(this.props.context, this.state as UserConfig);
            await this.props.context.app.alert('Success!', 'To change your configuration, just start the setup again.');
        } catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong. Please start the setup again.');
        }
        event.preventDefault();
    }

    private async loadBranches() {
        const provider = new Gitlab(this.state);

        const branches: Array<any> = await provider.fetchBranches();
        const branchOptions = branches.map((b) => {
            let rObj = {};
            rObj['value'] = b;
            rObj['label'] = b;
            return rObj;
        });

        this.setState({
            'branch': this.state.branch ? this.state.branch : branches[0],
            'branchOptions': branchOptions
        });
    }

    private async createNewBranch() {
          try {
            var branchName = await this.props.context.app.prompt(
                'Set new branch name:', {
                label: 'Branch name',
                defaultValue: 'develop',
                submitName: 'Submit',
                cancelable: true,
                }
            );

            const provider = new Gitlab(this.state);
            await provider.createRemoteBranchFromCurrent(branchName);
            
            this.setState({
                'branch': branchName
            });
            this.loadBranches();
            await this.props.context.app.alert('Success!', `Created new branch "${branchName}".`);

          } catch (e) { 
              console.error(e);
              await this.props.context.app.alert('Error!', 'Something went wrong. Does the branch exist already?.');
              throw 'Creating a new branch via GitLab API failed.';
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

    private submitButtonStyle = {
        'display': 'flex',
        'flex-direction': 'row-reverse',
        'flex-basis': '50%'
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit} className="pad">
                <div className="form-control form-control--outlined">
                    <label>
                        BaseURL:
                        <input name="baseUrl" type="text" placeholder="https://your.gitlab-instance.com" value={this.state.baseUrl} onChange={this.handleChange} />
                    </label>
                    <label>
                        Access Token:
                        <input name="token" type="text" placeholder="accessToken123" value={this.state.token} onChange={this.handleChange} />
                    </label>
                    <label>
                        Project ID:
                        <input name="projectId" type="text" placeholder="23" value={String(this.state.projectId)} onChange={this.handleChange} />
                    </label>
                    <label>
                        Workspace File Name:
                        <input name="configFileName" type="text" placeholder="config.json" value={this.state.configFileName} onChange={this.handleChange} />
                    </label>
                    <label>
                        Branch:
                        <select name="branch" value={this.state.branch} onChange={this.handleChange}>
                            {this.state.branchOptions.map((branch) => (<option key={branch.value} value={branch.value}>{branch.label}</option>))}
                        </select>
                    </label>
                </div>
                <div style={this.flexContainerStyle}>
                    <div className="margin-top" style={this.newBranchButtonStyle}>
                        <button type="button" onClick={this.createNewBranch}>New Branch</button>
                    </div>
                    <div className="margin-top" style={this.submitButtonStyle}>
                        <button type="submit">Submit</button>
                    </div>
                </div>
            </form>
        );
      }
}

async function pushWorkspace(context, models) {
    try {
        const config: UserConfig = await loadConfig(context);

        var commitMessage = await context.app.prompt(
            'GitLab - Push Workspace - Commit Message', {
                label: 'Commit Message',
                defaultValue: 'Update workspace',
                submitName: 'Commit',
                cancelable: true,
            }
        );

        let workspaceData = await context.data.export.insomnia({
            includePrivate: false,
            format: 'json',
            workspace: models.workspace
        });

        const gitlabProvider = new Gitlab(config);
        
        // parse, format, stringify again. Ugly but necessary because of Insomnia API design
        gitlabProvider.pushWorkspace(
            JSON.stringify(
                JSON.parse(workspaceData), // is already stringified JSON
                null,                      // replacer method
                2                          // indentation
            ),
            commitMessage
        );

        await context.app.alert('Success!', 'Your workspace config was successfully pushed.');
    } catch (e) {
        console.error(e);
        await context.app.alert('Error!', 'Something went wrong. Please try pushing again and check your setup.');
    }
}

async function pullWorkspace(context) {
    try {
        const config: UserConfig = await loadConfig(context);
        const gitlabProvider = new Gitlab(config);

        const workspace = await gitlabProvider.pullWorkspace();
        await context.data.import.raw(JSON.stringify(workspace));

        await context.app.alert('Success!', 'Your workspace config was successfully pulled.');
    } catch(e) {
        await context.app.alert('Error!', 'Something went wrong. Please try pulling again and check your setup.');
    }
}

const workspaceActions = [
    {
        label: 'Gitlab - Setup',
        icon: 'fa-gitlab',
        action(context, models) {
            const root = document.createElement('div');
            ReactDom.render(<GitlabConfigForm context={context}/>, root);

            context.app.dialog('GitLab - Setup', root, {
                skinny: true,
                onHide() {
                    ReactDom.unmountComponentAtNode(root);
                },
            });
        }
    },
    {
        label: 'GitLab - Pull Workspace',
        icon: 'fa-arrow-down',
        action: async(context) => {
            await pullWorkspace(context);
        },
    },
    {
        label: 'GitLab - Push Workspace',
        icon: 'fa-arrow-up',
        action: async(context, models) => {
            await pushWorkspace(context, models);

        },
    }
];

export { workspaceActions }