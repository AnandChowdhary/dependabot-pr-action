import { getInput, setFailed } from "@actions/core";
import { getOctokit } from "@actions/github";
import { diff } from "semver";

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
  const octokit = getOctokit(token);

  const addLabels = async (prNumber: number, labels?: string) => {
    if (labels) {
      const addLabels = labels.split(",").map((i) => i.trim());
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: addLabels,
      });
    }
  };
  const autoMerge = async (prNumber: number) => {
    try {
      await octokit.pulls.merge({ owner, repo, pull_number: prNumber });
    } catch (error) {}
  };
  const autoApprove = async (prNumber: number) => {
    try {
      await octokit.pulls.createReview({ owner, repo, pull_number: prNumber, event: "APPROVE" });
    } catch (error) {}
  };

  const pullRequests = await octokit.pulls.list({ owner, repo, state: "open" });
  const dependabotPRs = pullRequests.data.filter((pr) => pr.user.login.includes("dependabot"));
  for await (const pr of dependabotPRs) {
    const commits = await octokit.pulls.listCommits({ owner, repo, pull_number: pr.number });
    let version: string | null = "";
    commits.data.forEach((commit) => {
      let first = "";
      let last = "";
      try {
        first = commit.commit.message.split("from ")[1].split(" ")[0];
        last = commit.commit.message.split(" to ")[1].split(" ")[0];
      } catch (error) {}
      if (first && last) version = diff(first, last);
    });
    switch (version) {
      case "major":
        await addLabels(pr.number, getInput("labels-major"));
        if (getInput("auto-label") || getInput("auto-label-major"))
          await addLabels(pr.number, "major");
        if (getInput("merge") || getInput("merge-major")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-major")) autoApprove(pr.number);
        break;
      case "premajor":
        await addLabels(pr.number, getInput("labels-premajor"));
        if (getInput("auto-label") || getInput("auto-label-premajor"))
          await addLabels(pr.number, "premajor");
        if (getInput("merge") || getInput("merge-premajor")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-premajor")) autoApprove(pr.number);
        break;
      case "minor":
        await addLabels(pr.number, getInput("labels-minor"));
        if (getInput("auto-label") || getInput("auto-label-minor"))
          await addLabels(pr.number, "minor");
        if (getInput("merge") || getInput("merge-minor")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-minor")) autoApprove(pr.number);
        break;
      case "preminor":
        await addLabels(pr.number, getInput("labels-preminor"));
        if (getInput("auto-label") || getInput("auto-label-preminor"))
          await addLabels(pr.number, "preminor");
        if (getInput("merge") || getInput("merge-preminor")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-preminor")) autoApprove(pr.number);
        break;
      case "patch":
        await addLabels(pr.number, getInput("labels-patch"));
        if (getInput("auto-label") || getInput("auto-label-patch"))
          await addLabels(pr.number, "patch");
        if (getInput("merge") || getInput("merge-patch")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-patch")) autoApprove(pr.number);
        break;
      case "prepatch":
        await addLabels(pr.number, getInput("labels-prepatch"));
        if (getInput("auto-label") || getInput("auto-label-prepatch"))
          await addLabels(pr.number, "prepatch");
        if (getInput("merge") || getInput("merge-prepatch")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-prepatch")) autoApprove(pr.number);
        break;
      case "prerelease":
        await addLabels(pr.number, getInput("labels-prerelease"));
        if (getInput("auto-label") || getInput("auto-label-prerelease"))
          await addLabels(pr.number, "prerelease");
        if (getInput("merge") || getInput("merge-prerelease")) autoMerge(pr.number);
        if (getInput("approve") || getInput("approve-prerelease")) autoApprove(pr.number);
        break;
    }
  }
};

run()
  .then(() => {})
  .catch((error) => {
    console.error("ERROR", error);
    setFailed(error.message);
  });
