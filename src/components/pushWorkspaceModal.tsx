import {DialogProps} from "../models/dialogProps";
import * as React from "react";
import {useState} from "react";
import {WorkspaceConfig} from "../models/WorkspaceConfig";
import {Gitlab} from "../gitProviders/gitlab";
import {CircularLoader} from "./circularLoader";
import {loadConfig} from "../configUtils";

export function PushWorkspaceModal({context, models}: DialogProps) {
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