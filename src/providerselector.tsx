import * as React from "react";
import {GitHub} from './gitProviders/github'
import {UserConfig} from "./interfaces/UserConfig";
import * as Helpers from './helpers'
import {GitLab} from "./gitProviders/gitlab";

export class ProviderSelector extends React.Component<any, any>{

    constructor(props) {
        super(props);
        console.log(this.props);
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
    }

    async componentDidMount() {
        const config: UserConfig = await Helpers.loadConfig(this.props.context);
        this.setState(config);
    }

    private handleChange(event) {
        const { target: { name, value } } = event;
        console.debug("Update state property: ", name, value);
        this.setState({[name]: value});
    }

    handleChildChange = (name,value) =>{
        console.debug("Update state property: ", name, value);
        this.setState({[name]: value});
    }

    private async handleSubmit(event) {
        try {
            await Helpers.storeConfig(this.props.context, this.state as UserConfig);
            await this.props.context.app.alert('Success!', 'To change your configuration, just start the setup again.');
        } catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong. Please start the setup again.');
        }
        event.preventDefault();
    }

    private flexContainerStyle = {
        'display': 'flex'
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
                        Provider:
                        <select name="provider" value={this.state.provider} onChange={this.handleChange}>
                            <option value="github">GitHub</option>
                            <option value="gitlab">GitLab</option>
                        </select>
                    </label>
                </div>
                {this.state.provider == "github" &&
                    <GitHub context={this.state} app={this.props.context.app} onElementChange={this.handleChildChange}/>
                }

                {this.state.provider == "gitlab" &&
                    <GitLab context={this.state} onElementChange={this.handleChildChange}/>
                }

                <div style={this.flexContainerStyle}>
                    <div className="margin-top" style={this.submitButtonStyle}>
                        <button type="submit" onClick={this.handleSubmit}>Submit</button>
                    </div>
                </div>
            </form>
        );
    }
}
