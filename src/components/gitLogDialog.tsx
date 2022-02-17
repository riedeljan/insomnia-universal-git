import * as React from "react";
import {useEffect, useState} from "react";
import {CommitInfo} from "../models/CommitInfo";
import {WorkspaceConfig} from "../models/WorkspaceConfig";
import {Gitlab} from "../gitProviders/gitlab";
import {loadConfig} from "../configUtils";
import {DialogProps} from "../models/dialogProps";
import {CircularLoader} from "./circularLoader";

export function GitLogDialog({context, models}: DialogProps) {
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