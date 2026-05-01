// GitHub REST API wrapper — pure stateless functions, zero dependencies beyond native fetch()

import { extractGuidelineFilesFromIssueBody } from "./issueGuidelines.js";

const GITHUB_API = "https://api.github.com";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

function headers(token) {
  return { ...GITHUB_HEADERS, Authorization: `Bearer ${token}` };
}

async function ghFetch(token, path, opts = {}) {
  const url = path.startsWith("https://") ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers(token), ...opts.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    let message;
    try {
      message = JSON.parse(body).message;
    } catch {
      message = body;
    }
    throw new Error(`GitHub API ${res.status}: ${message} (${opts.method || "GET"} ${path})`);
  }
  return res.json();
}

/**
 * Validate a personal access token. Returns the authenticated user info.
 */
export async function validateToken(token) {
  const data = await ghFetch(token, "/user");
  return { login: data.login, id: data.id, avatar_url: data.avatar_url };
}

/**
 * Fetch the full file tree of a repository using the Git Trees API (recursive).
 */
export async function fetchRepoTree(token, owner, repo) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`
  );
  return {
    tree: data.tree.map((entry) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size,
      sha: entry.sha,
    })),
    truncated: data.truncated,
  };
}

/**
 * Fetch a single file's content (base64 decoded).
 */
export async function fetchFileContent(token, owner, repo, path) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`
  );
  if (data.type !== "file") {
    throw new Error(`Path "${path}" is not a file (type: ${data.type})`);
  }
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha, size: data.size };
}

/**
 * Fetch the SHA of the default branch (main) for branching operations.
 */
export async function fetchDefaultBranchSha(token, owner, repo) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/main`
  );
  return data.object.sha;
}

/**
 * Create a new branch from a base SHA.
 */
export async function createBranch(token, owner, repo, branchName, baseSha) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    }
  );
  return { ref: data.ref, sha: data.object.sha };
}

/**
 * Create or update a file in a repository (PUT contents endpoint).
 * If updating, pass the current file SHA via an `options.sha` parameter.
 */
export async function createOrUpdateFile(token, owner, repo, path, content, message, branch, sha) {
  const payload = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
  };
  if (sha) {
    payload.sha = sha;
  }
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return { sha: data.content.sha, commit_sha: data.commit.sha };
}

/**
 * Create a pull request.
 */
export async function createPullRequest(token, owner, repo, title, body, head, base) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, head, base }),
    }
  );
  return { number: data.number, html_url: data.html_url };
}

/**
 * Search code within a specific repository.
 */
export async function searchCode(token, owner, repo, query) {
  const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
  const data = await ghFetch(token, `/search/code?q=${q}`);
  return {
    items: data.items.map((item) => ({
      path: item.path,
      text_matches: item.text_matches,
    })),
  };
}

/**
 * List issues for a repository (excludes pull requests).
 * Returns all issues (open + closed) with a `hasFixPR` flag for issues that
 * have an open OpenClaw fix PR.
 */
export async function listIssues(token, owner, repo, opts = {}) {
  const perPage = opts.perPage || 30;

  // Fetch open issues, recently closed issues, and open PRs in parallel
  const [openData, closedData, pulls] = await Promise.all([
    ghFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=${perPage}`
    ),
    ghFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=closed&per_page=${perPage}&sort=updated&direction=desc`
    ),
    ghFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=100`
    ).catch(() => []), // non-critical — if it fails, skip enrichment
  ]);

  // Map issue numbers to their OpenClaw fix PR URL
  const fixPRByIssue = new Map();
  for (const pr of pulls) {
    const branch = pr.head?.ref || "";
    const m = branch.match(/^openclaw\/fix-issue-(\d+)/);
    if (m) fixPRByIssue.set(Number(m[1]), pr.html_url);
  }

  // Merge and deduplicate (open first, then closed)
  const seen = new Set();
  const all = [...openData, ...closedData];

  // GitHub includes PRs in the issues endpoint — filter them out
  return all
    .filter((item) => {
      if (item.pull_request) return false;
      if (seen.has(item.number)) return false;
      seen.add(item.number);
      return true;
    })
    .map((item) => ({
      number: item.number,
      title: item.title,
      state: item.state,
      user: item.user?.login,
      labels: (item.labels || []).map((l) => ({ name: l.name, color: l.color })),
      created_at: item.created_at,
      closed_at: item.closed_at || null,
      html_url: item.html_url,
      fixPRUrl: fixPRByIssue.get(item.number) || null,
    }));
}

/**
 * Create a new issue in a repository.
 */
export async function createIssue(token, owner, repo, title, body, labels) {
  const payload = { title, body: body || "" };
  if (labels && labels.length > 0) payload.labels = labels;
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return { number: data.number, title: data.title, state: data.state, html_url: data.html_url };
}

/**
 * Get a single issue with full body and comment count.
 */
export async function getIssue(token, owner, repo, issueNumber) {
  const data = await ghFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`
  );
  const body = data.body || "";
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    user: data.user?.login,
    labels: (data.labels || []).map((l) => ({ name: l.name, color: l.color })),
    created_at: data.created_at,
    html_url: data.html_url,
    body,
    guidelineFiles: extractGuidelineFilesFromIssueBody(body),
    comments: data.comments,
  };
}
