import {Gitlab} from './gitProviders/gitlab';
import {WorkspaceConfig} from './models/WorkspaceConfig';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import * as ReactDom from 'react-dom';
import {CommitInfo} from "./models/CommitInfo";
import {Project} from "./models/Project";
import {Branch} from "./models/Branch";
import './styles.css';

function getWorkspaceConfigKey(workspaceId: string) {
  return `gitlab-sync:config-${workspaceId}`;
}

async function loadConfig(context, models): Promise<WorkspaceConfig | null> {
  const storedConfig = await context.store.getItem(getWorkspaceConfigKey(models.workspace._id));
  try {
    return JSON.parse(storedConfig);
  } catch (e) {
    return null;
  }
}

async function storeConfig(context, models, userConfig: WorkspaceConfig) {
  await context.store.setItem(getWorkspaceConfigKey(models.workspace._id), JSON.stringify(userConfig));
}

async function clearConfig(context, models) {
  await context.store.setItem(getWorkspaceConfigKey(models.workspace._id), null);
}

function GitlabConfigFormFunction({context, models}: DialogProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [token, setToken] = useState("");
  const [project, setProject] = useState<Project>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [configFileName, setConfigFileName] = useState("");
  const [branch, setBranch] = useState<Branch>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingBranch, setIsLoadingBranch] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInitProjectSelected = useRef(false);
  const isInitBranchSelected = useRef(false);

  const loadInitialConfig = async () => {
    const config: WorkspaceConfig | null = await loadConfig(context, models);
    if (config) {
      setBaseUrl(config.baseUrl)
      setToken(config.token)
      setProject(config.project)
      setBranch(config.branch)
      setConfigFileName(config.configFileName)
    }
  };
  useEffect(() => {
    loadInitialConfig();
  }, []);

  useEffect(() => {
    if (baseUrl && token && project && !isInitProjectSelected.current) {
      isInitProjectSelected.current = true;
      reloadProjects("");
    }

    return () => {
    };
  }, [baseUrl, token, project]);

  useEffect(() => {
    if (baseUrl && token && project && branch && !isInitBranchSelected.current) {
      isInitBranchSelected.current = true;
      reloadBranches();
    }

    return () => {
    };
  }, [baseUrl, token, project]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (baseUrl && token)
        reloadProjects(projectName);
    }, 500);

    return () => clearTimeout(timeout);
  }, [projectName]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isInitBranchSelected)
      timeout = setTimeout(() => {
        if (project)
          reloadBranches();
      }, 200);

    return () => clearTimeout(timeout);
  }, [project]);


  const handleOnBranchChange = event => {
    setBranch(branches.find((e) => e.name == event.target.value))
  };

  const handleOnProjectChange = event => {
    setProject(projects.find((e) => e.name == event.target.value))
  };

  const handleSubmit = async event => {
    try {
      setIsSubmitting(true);
      await storeConfig(context, models, buildConfig());
      await context.app.alert('Success!', 'Configuration has been saved.\nTo change your configuration, just start the setup again.');
    } catch (e) {
      console.error(e);
      await context.app.alert('Error!', 'Something went wrong. Please start the setup again.');
    }
    setIsSubmitting(false);
    event.preventDefault();
  };

  const reloadBranches = async () => {
    await loadBranches();
  };

  const reloadProjects = async (search?: string) => {
    await loadProjects(0, search);
  };

  const buildConfig = (): WorkspaceConfig => {
    return {
      project: project,
      baseUrl: baseUrl,
      token: token,
      branch: branch,
      configFileName: configFileName
    }
  }

  const loadBranches = async () => {
    setIsLoadingBranch(true);
    setErrorMessage("");
    try {
      const provider = new Gitlab(buildConfig());
      const branches = await provider.fetchBranches();
      if (branch && !branches.find((e) => e.web_url == branch.web_url)) {
        setBranch(branches[0]);
      }
      setBranches(branches)
    } catch (e) {
      setErrorMessage(e);
    } finally {
      setIsLoadingBranch(false);
    }
  };

  const loadProjects = async (pageNo: number, search?: string) => {
    setIsLoadingProjects(true)
    setErrorMessage("");
    try {
      const provider = new Gitlab(buildConfig());
      let newProjects: Project[] = await provider.fetchProjects(pageNo, search);
      if (project && pageNo == 0 && !newProjects.find((e) => e.id == project.id)) {
        newProjects = [project, ...newProjects];
      }
      if (pageNo == 0) {
        setProjects(newProjects);
      } else {
        setProjects([...projects, ...newProjects]);
      }
    } catch (e) {
      setErrorMessage(e);
    } finally {
      setIsLoadingProjects(false)
    }
  };

  const clearCurrentConfig = async () => {
    await clearConfig(context, models)
    await context.app.alert('Success!', `Configs Cleared.`);
  };

  const createNewBranch = async () => {
    try {
      const branchName = await context.app.prompt(
        'Set new branch name:', {
          label: 'Branch name',
          defaultValue: 'develop',
          submitName: 'Submit',
          cancelable: true,
        }
      );

      const provider = new Gitlab(buildConfig());
      const newBranch = await provider.createRemoteBranchFromCurrent(branchName);

      setBranches([...branches, newBranch]);

      await context.app.alert('Success!', `Created new branch "${branchName}".`);

    } catch (e) {
      console.error(e);
      await context.app.alert('Error!', 'Something went wrong. Does the branch exist already?.');
      throw 'Creating a new branch via GitLab API failed.';
    }
  };


  return (
    <form onSubmit={handleSubmit} className="pad">
      <div className="form-control form-control--outlined">
        <label>
          BaseURL:
          <input className="inputStyle"
                 name="baseUrl"
                 type="text"
                 placeholder="https://your.gitlab-instance.com"
                 value={baseUrl}
                 onChange={(event => setBaseUrl(event.target.value))}/>
        </label>
        <label>
          Access Token:
          <div className="dropDownStyle">
            <input
              className="inputStyle"
              name="token"
              type="text"
              placeholder="accessToken123"
              value={token}
              onChange={(event => setToken(event.target.value))}/>
            <button
              type="button"
              className="reloadButtonStyle"
              onClick={() => reloadProjects()}>Check
            </button>
          </div>
        </label>
        <label>
          Project:
          <div>
            <div className="dropDownStyle">
              <input
                className="inputStyle"
                name="projectName"
                type="text"
                placeholder="search and select your project..."
                value={projectName}
                onChange={(event => setProjectName(event.target.value))}/>
              <button
                type="button"
                className="reloadButtonStyle"
                onClick={() => reloadProjects()}>
                {isLoadingProjects ? <CircularLoader/> : "Search"}</button>
            </div>
            <select
              style={{height: 100}}
              size={20}
              value={project?.name}
              name="project"
              onChange={handleOnProjectChange}>
              {projects.map((p: Project) => (
                <option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
        </label>
        <label>
          Branch:
          <div className="dropDownStyle">
            <select
              name="branch"
              value={branch?.name}
              onChange={handleOnBranchChange}>
              {branches.map((branch: Branch) => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>))}
            </select>

            <button
              type="button"
              className="reloadButtonStyle"
              onClick={reloadBranches}>{isLoadingBranch ?
              <CircularLoader/> : "Reload"}</button>
          </div>
        </label>
        <label>
          Workspace File Name (set folder path by "/"):
          <input
            className="inputStyle"
            name="configFileName"
            type="text"
            placeholder="api.json"
            value={configFileName}
            onChange={(event => setConfigFileName(event.target.value))}/>
          <p className="configPathStyle">ex: api.json or SomeShatFolder/api.json</p>
        </label>
      </div>
      <div className="flexContainerStyle">
        <div className="newBranchButtonStyle margin-top">
          <button type="button" onClick={createNewBranch}>New Branch</button>
        </div>
        <div className="newBranchButtonStyle margin-top">
          <button type="button" onClick={clearCurrentConfig}>Clear Config</button>
        </div>
        <div className="submitButtonStyle margin-top">
          <button type="submit">{isSubmitting ? <CircularLoader/> : "Submit"}</button>
        </div>
      </div>
      {errorMessage != "" && <div><br/><p>{errorMessage}</p></div>}
    </form>
  );
}

function CircularLoader(props) {
  return (<div className={"loader"}/>)
}

interface DialogProps {
  context: any,
  models: any
}

function GitLogDialog({context, models}: DialogProps) {
  const [pagination, setPagination] = useState(1);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(true);

  async function loadBranches(context, models, pagination: number) {
    setIsLoadingCommits(true);
    const config: WorkspaceConfig = await loadConfig(context, models);
    const provider = new Gitlab(config);
    let fetchedCommits = await provider.fetchCommits(pagination);
    setCommits([...commits, ...fetchedCommits])
    setIsLoadingCommits(false);
  }

  useEffect(() => {
    loadBranches(context, models, pagination);
  }, [context, models, pagination]);

  const nextPage = () => {
    setPagination(pagination + 1);
  }

  return (
    <div className="gitLogDialog">
      <label className="pad">
        Git Last Commits:
        {
          commits.map(value => {
            return (<div key={value.id} className="commitBorderStyle">
              <p>message: {value.title}</p>
              <p>author: {value.author_name}</p>
              <p>date: {value.committed_date}</p>
            </div>);
          })
        }
      </label>
      <button
        type="button"
        className="loadMoreButtonStyle"
        onClick={nextPage}>
        {isLoadingCommits ? <CircularLoader/> : commits.length != 0 ? "LoadMore" : "Reload"}</button>
    </div>
  )
}


function PushWorkspaceComponent({context, models}: DialogProps) {
  const [commitMessage, setCommitMessage] = useState("Update workspace");
  const [isCommitting, setIsCommitting] = useState(false);

  const commit = async () => {
    try {
      setIsCommitting(true)
      const config: WorkspaceConfig = await loadConfig(context, models);

      let workspaceData = await context.data.export.insomnia({
        includePrivate: false,
        format: 'json',
        workspace: models.workspace
      });

      const gitlabProvider = new Gitlab(config);

      // parse, format, stringify again. Ugly but necessary because of Insomnia API design
      await gitlabProvider.pushWorkspace(
        JSON.stringify(
          JSON.parse(workspaceData), // is already stringified JSON
          null,                      // replacer method
          2                          // indentation
        ),
        commitMessage
      );

      await context.app.alert('Success!', 'Your workspace config was successfully pushed.');
    } catch (e) {
      console.log(e);
      await context.app.alert('Error!', 'Something went wrong. Please try pushing again and check your setup.');
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <form onSubmit={commit} className="pad">
      <div className="form-control form-control--outlined">
        <label>
          Enter your Commit Message:
          <div className="dropDownStyle">
            <input
              className="inputStyle"
              name="commitMessage"
              type="text"
              placeholder="Enter your Commit message..."
              value={commitMessage}
              onChange={(event => setCommitMessage(event.target.value))}/>
            <button
              type="submit"
              className="reloadButtonStyle">
              {isCommitting ? <CircularLoader/> : "Commit"}</button>
          </div>
        </label>
      </div>
    </form>

  )
}

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
      ReactDom.render(<GitlabConfigFormFunction context={context} models={models}/>, root);

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
      ReactDom.render(<PushWorkspaceComponent context={context} models={models}/>, root);

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