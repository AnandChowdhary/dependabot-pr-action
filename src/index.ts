import { getInput, setFailed } from "@actions/core";
import { getOctokit } from "@actions/github";
import { diff, valid } from "semver";

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
  const octokit = getOctokit(token);
  const ignoreStatusChecks = getInput("ignore-status-checks");

  const addLabels = async (prNumber: number, labels?: string) => {
    console.log("addLabels", prNumber, labels);
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
  const autoMerge = async (prNumber: number, prTitle: string, tryNumber = 1) => {
    if (tryNumber > 10) return;
    console.log("autoMerge", prNumber, tryNumber);
    try {
      await octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        commit_title: (
          getInput("merge-commit") || `:twisted_rightwards_arrows: Merge #$PR_NUMBER ($PR_TITLE)`
        )
          .replace("$PR_NUMBER", prNumber.toString())
          .replace("$PR_TITLE", prTitle),
      });
    } catch (error) {
      console.log(error);
      await wait(tryNumber * 1000);
      await autoMerge(prNumber, prTitle, tryNumber + 1);
    }
  };
  const autoApprove = async (prNumber: number) => {
    console.log("autoApprove", prNumber);
    try {
      await octokit.pulls.createReview({ owner, repo, pull_number: prNumber, event: "APPROVE" });
    } catch (error) {}
  };

  const pullRequests = await octokit.pulls.list({ owner, repo, state: "open" });
  const dependabotPRs = pullRequests.data.filter((pr) => pr.user.login.includes("dependabot"));
  console.log("Found dependabot PRs", dependabotPRs.length);
  for await (const pr of dependabotPRs) {
    console.log("Starting PR", pr.number);
    const lastCommitHash = pr._links.statuses.href.split("/").pop() || "";
    const checkRuns = await octokit.checks.listForRef({ owner, repo, ref: lastCommitHash });

    const allChecksHaveSucceeded = checkRuns.data.check_runs.every(
      (run) => run.conclusion === "success"
    );
    if (!allChecksHaveSucceeded && !ignoreStatusChecks)
      return console.log("All check runs are not success", checkRuns.data);

    const statuses = await octokit.repos.listCommitStatusesForRef({
      owner,
      repo,
      ref: lastCommitHash,
    });
    const uniqueStatuses = statuses.data.filter(
      (item, index, self) => self.map((i) => i.context).indexOf(item.context) === index
    );
    const allStatusesHaveSucceeded = uniqueStatuses.every((run) => run.state === "success");
    if (!allStatusesHaveSucceeded && !ignoreStatusChecks)
      return console.log("All statuses are not success", uniqueStatuses);

    console.log("All status checks", allChecksHaveSucceeded, allStatusesHaveSucceeded);

    const commits = await octokit.pulls.listCommits({ owner, repo, pull_number: pr.number });
    let version: string | null = "";
    commits.data.forEach((commit) => {
      let first = "";
      let last = "";
      console.log(pr.title);
      try {
        first = pr.title
          .split("from ")[1]
          .split(" ")[0]
          .split("\n")[0]
          .substr(0, 8)
          .trim();
        last = pr.title
          .split(" to ")[1]
          .split(" ")[0]
          .split("\n")[0]
          .substr(0, 8)
          .trim();
        console.log("From version", first, valid(first));
        console.log("To version", last, valid(last));
        if (first && last) version = diff(first, last);
      } catch (error) {}
    });
    console.log("Diff version is", version);
    if (version === "major") {
      await addLabels(pr.number, getInput("labels-major"));
      if (getInput("auto-label") || getInput("auto-label-major"))
        await addLabels(pr.number, "major");
      if (getInput("merge") || getInput("merge-major")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-major")) autoApprove(pr.number);
    } else if (version === "premajor") {
      await addLabels(pr.number, getInput("labels-premajor"));
      if (getInput("auto-label") || getInput("auto-label-premajor"))
        await addLabels(pr.number, "premajor");
      if (getInput("merge") || getInput("merge-premajor")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-premajor")) autoApprove(pr.number);
    } else if (version === "minor") {
      await addLabels(pr.number, getInput("labels-minor"));
      if (getInput("auto-label") || getInput("auto-label-minor"))
        await addLabels(pr.number, "minor");
      if (getInput("merge") || getInput("merge-minor")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-minor")) autoApprove(pr.number);
    } else if (version === "preminor") {
      await addLabels(pr.number, getInput("labels-preminor"));
      if (getInput("auto-label") || getInput("auto-label-preminor"))
        await addLabels(pr.number, "preminor");
      if (getInput("merge") || getInput("merge-preminor")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-preminor")) autoApprove(pr.number);
    } else if (version === "patch") {
      await addLabels(pr.number, getInput("labels-patch"));
      if (getInput("auto-label") || getInput("auto-label-patch"))
        await addLabels(pr.number, "patch");
      if (getInput("merge") || getInput("merge-patch")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-patch")) autoApprove(pr.number);
    } else if (version === "prepatch") {
      await addLabels(pr.number, getInput("labels-prepatch"));
      if (getInput("auto-label") || getInput("auto-label-prepatch"))
        await addLabels(pr.number, "prepatch");
      if (getInput("merge") || getInput("merge-prepatch")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-prepatch")) autoApprove(pr.number);
    } else if (version === "prerelease") {
      await addLabels(pr.number, getInput("labels-prerelease"));
      if (getInput("auto-label") || getInput("auto-label-prerelease"))
        await addLabels(pr.number, "prerelease");
      if (getInput("merge") || getInput("merge-prerelease")) autoMerge(pr.number, pr.title);
      if (getInput("approve") || getInput("approve-prerelease")) autoApprove(pr.number);
    }
  }

  console.log("All done!");
};

run()
  .then(() => {})
  .catch((error) => {
    console.error("ERROR", error);
    setFailed(error.message);
  });
