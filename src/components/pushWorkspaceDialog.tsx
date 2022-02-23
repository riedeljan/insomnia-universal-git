import {DialogProps} from "../models/dialogProps";
import * as React from "react";
import {useState} from "react";
import {WorkspaceConfig} from "../models/WorkspaceConfig";
import {Gitlab} from "../gitProviders/gitlab";
import {CircularLoader} from "./circularLoader";
import {loadConfig} from "../configUtils";

export function PushWorkspaceDialog({context, models}: DialogProps) {
  const [commitMessage, setCommitMessage] = useState("Update workspace");
  const [isCommitting, setIsCommitting] = useState(false);
  const [status, setStatus] = useState("");

  const commit = async () => {
    if (!commitMessage)
      return;
    try {
      setIsCommitting(true)
      setStatus("Loading Config...");
      const config: WorkspaceConfig = await loadConfig(context, models);

      setStatus("Exporting Workspace...");
      let workspaceData = await context.data.export.insomnia({
        includePrivate: false,
        format: 'json',
        workspace: models.workspace
      });

      const gitlabProvider = new Gitlab(config);

      setStatus("Uploading export file...");
      await gitlabProvider.pushWorkspace(
        JSON.stringify(
          JSON.parse(workspaceData),
          null,
          2
        ),
        commitMessage
      );

      setStatus("Done!");
    } catch (e) {
      console.log(e);
      setStatus(`Error! ${e}`);
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
        {status && (<p
          className={status == "Done!" ? "success status" : status.startsWith("Error!") ? "errorMessage status" : ""}>{status}</p>)}
      </div>
    </form>

  )
}