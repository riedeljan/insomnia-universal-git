import {Gitlab} from './gitProviders/gitlab';
import {WorkspaceConfig} from './models/WorkspaceConfig';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import './styles.css';
import {GitLogDialog} from "./components/gitLogDialog";
import {PushWorkspaceDialog} from "./components/pushWorkspaceDialog";
import {GitlabConfigForm} from "./components/gitlabConfigForm";
import {loadConfig} from "./configUtils";


async function pullWorkspace(context, models) {
  try {
    const config: WorkspaceConfig = await loadConfig(context, models);
    const gitlabProvider = new Gitlab(config);

    const workspace = await gitlabProvider.pullWorkspace();
    await context.data.import.raw(JSON.stringify(workspace));

    await context.app.alert('Success!', 'Your workspace config was successfully pulled.');
  } catch (e) {
    await context.app.alert('Error!', 'Something went wrong. Please try pulling again and check your setup.');
  }
}

const workspaceActions = [
  {
    label: 'Gitlab - Setup',
    icon: 'fa-gitlab',
    action(context, models) {
      const root = document.createElement('div');
      ReactDom.render(<GitlabConfigForm context={context} models={models}/>, root);

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
    action: async (context, models) => {
      await pullWorkspace(context, models);
    },
  },
  {
    label: 'GitLab - Push Workspace',
    icon: 'fa-arrow-up',
    action: async (context, models) => {
      const root = document.createElement('div');
      ReactDom.render(<PushWorkspaceDialog context={context} models={models}/>, root);

      context.app.dialog('GitLab - Push Workspace', root, {
        skinny: false,
        onHide() {
          ReactDom.unmountComponentAtNode(root);
        },
      });
    },
  },
  {
    label: 'Git Log',
    icon: 'fa-list-alt',
    action: async (context, models) => {
      const root = document.createElement('div');
      ReactDom.render(<GitLogDialog context={context} models={models}/>, root);

      context.app.dialog('Git Log', root, {
        skinny: false,
        onHide() {
          ReactDom.unmountComponentAtNode(root);
        },
      });
    },
  },
];

export {workspaceActions}