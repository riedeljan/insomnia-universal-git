import { UserConfig } from './interfaces/UserConfig';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import * as Helpers from './helpers'
import {ProviderSelector} from "./providerselector";

async function pushWorkspace(context, models) {
    try {
        const config: UserConfig = await Helpers.loadConfig(context);

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

        const provider = Helpers.getProvider(config);

        // parse, format, stringify again. Ugly but necessary because of Insomnia API design
        await provider.pushWorkspace(
            JSON.stringify(
                JSON.parse(workspaceData), // is already stringified JSON
                null,                      // replacer method
                2                          // indentation
            ),
            commitMessage,
            config
        );

        await context.app.alert('Success!', 'Your workspace config was successfully pushed.');
    } catch (e) {
        console.error(e);
        await context.app.alert('Error!', 'Something went wrong. Please try pushing again and check your setup.');
    }
}

async function pullWorkspace(context) {
    try {
        const config: UserConfig = await Helpers.loadConfig(context);
        const provider = Helpers.getProvider(config);

        const workspace = await provider.pullWorkspace(config);
        await context.data.import.raw(JSON.stringify(workspace));

        await context.app.alert('Success!', 'Your workspace config was successfully pulled.');
    } catch(e) {
        await context.app.alert('Error!', 'Something went wrong. Please try pulling again and check your setup.');
    }
}

const workspaceActions = [
    {
        label: 'Setup',
        icon: 'fa-cogs',
        action(context, models) {
            const root = document.createElement('div');
            ReactDom.render(<ProviderSelector context={context}/>,root);
           // ReactDom.render(<GitLab context={context}/>, root);

            context.app.dialog('Git Setup', root, {
                skinny: true,
                onHide() {
                    ReactDom.unmountComponentAtNode(root);
                },
            });
        }
    },
    {
        label: 'Pull Workspace',
        icon: 'fa-arrow-down',
        action: async(context) => {
            await pullWorkspace(context);
        },
    },
    {
        label: 'Push Workspace',
        icon: 'fa-arrow-up',
        action: async(context, models) => {
            await pushWorkspace(context, models);
        },
    }
];

export { workspaceActions }