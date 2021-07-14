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
    private branchOptions;

    constructor(props) {
        super(props);
        this.state = {
            'baseUrl': "",
            'token': "",
            'projectId': null,
            'configFileName': "",
            'branch': "",
            'branchOptions': []
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        const { target: { name, value } } = event;
        console.debug("Update state property: ", name, value);
        this.setState({[name]: value});
      }
    
    async handleSubmit(event) {
        try {
            storeConfig(this.props.context, this.state as UserConfig);
            await this.props.context.app.alert('Success!', 'To change your configuration, just start the setup again.');
        } catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong. Please start the setup again.');
        }
        event.preventDefault();
    }

    async componentDidMount() {
        const config: UserConfig = await loadConfig(this.props.context);
        this.setState(config);

        const provider = new Gitlab(this.props.context);
        await provider.init();

        const branches = await provider.fetchBranches();
        const branchOptions = branches.map((b) => {
            let rObj = {};
            rObj['value'] = b;
            rObj['label'] = b;
            return rObj;
        });
        this.setState({
            'branchOptions': branchOptions
        });
    }

    private buttonStyle = {
        'display': 'flex',
        'flex-direction': 'row-reverse'
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
                        <select onChange={this.handleChange} value={this.state.branch}>
                            {this.state.branchOptions.map((branch) => (<option key={branch.value} value={branch.value}>{branch.label}</option>))}
                        </select>
                    </label>
                </div>
                <div className="margin-top" style={this.buttonStyle}>
                    <button type="submit">Submit</button>
                </div>
            </form>
        );
      }
}

async function pushWorkspace(context, models) {
    try {
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

        const gitlabProvider = new Gitlab(context);
        await gitlabProvider.init();
        
        // parse, pretty format, stringify again. Ugly but necessary because of Insomnia API design
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
        const gitlabProvider = new Gitlab(context);
        await gitlabProvider.init();

        await gitlabProvider.pullWorkspace();

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
            const provider = new Gitlab(context);
            await pushWorkspace(context, models);

        },
    }
];

export { workspaceActions }