// agentTaskRunner.js — orchestrates the "Fix issue with OpenClaw agent" flow
//
// Steps: spawn pet → fetch repo tree → LLM analyze → fetch files → LLM fix → create branch+PR → despawn pet

import * as githubService from "./githubService.js";
import { extractGuidelineFilesFromIssueBody, mergeGuidelineFiles } from "./issueGuidelines.js";
import { askStructuredCodeQuestion } from "./llmBridge.js";
import { spawnPet, despawnPet } from "./petSystem.js";

const MAX_FILES_TO_FETCH = 10;
const MAX_GUIDELINE_FILES_TO_FETCH = 5;

function emitProgress(socket, repoKey, issueNumber, message) {
  socket.emit("github:agentFixProgress", { repoKey, issueNumber, message });
}

/**
 * Solve a GitHub issue by analyzing it with an LLM and creating a PR with the fix.
 *
 * @param {object} opts
 * @param {string} opts.token - GitHub PAT
 * @param {string} opts.owner - Repo owner
 * @param {string} opts.repo - Repo name
 * @param {object} opts.issue - Full issue object { number, title, body, labels }
 * @param {object} opts.io - Socket.IO server instance
 * @param {object} opts.room - Current room object
 * @param {object} opts.rooms - All rooms array (for despawnPet)
 * @param {object} opts.socket - The requesting socket
 * @param {function} opts.findPath - Pathfinding function
 * @param {function} opts.generateRandomPosition - Position generator
 * @param {string[]} [opts.guidelineFiles] - Additional repo files to treat as read-only guidance
 * @returns {object} { pr: { number, html_url } }
 */
export async function solveIssue({
  token,
  owner,
  repo,
  issue,
  io,
  room,
  rooms,
  socket,
  findPath,
  generateRandomPosition,
  guidelineFiles = [],
}) {
  const repoKey = `${owner}/${repo}`;
  const runId = `gh_agentfix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let petSpawned = false;

  try {
    // 1. Spawn a pet as visual indicator
    emitProgress(socket, repoKey, issue.number, "Starting agent...");
    if (room) {
      const pet = spawnPet({
        io,
        room,
        agentId: socket.data.agentId || socket.id,
        runId,
        taskType: "agentFix",
        taskLabel: `fixing #${issue.number}`,
        findPath,
        generateRandomPosition,
      });
      petSpawned = !!pet;
    }

    // 2. Fetch repo tree
    emitProgress(socket, repoKey, issue.number, "Fetching repository structure...");
    const treeData = await githubService.fetchRepoTree(token, owner, repo);
    const filePaths = treeData.tree
      .filter((f) => f.type === "blob")
      .map((f) => f.path);
    const repoContext = filePaths.join("\n");
    const allGuidelineFiles = mergeGuidelineFiles(
      issue.guidelineFiles,
      extractGuidelineFilesFromIssueBody(issue.body),
      guidelineFiles
    ).slice(0, MAX_GUIDELINE_FILES_TO_FETCH);

    const guidelineFileContents = {};
    if (allGuidelineFiles.length > 0) {
      emitProgress(
        socket,
        repoKey,
        issue.number,
        `Loading ${allGuidelineFiles.length} guideline file${allGuidelineFiles.length > 1 ? "s" : ""}...`
      );
      for (const filePath of allGuidelineFiles) {
        try {
          const fileData = await githubService.fetchFileContent(token, owner, repo, filePath);
          guidelineFileContents[filePath] = fileData.content;
        } catch (err) {
          console.warn(`[agentTaskRunner] Skipping guideline file ${filePath}: ${err.message}`);
        }
      }
    }

    // 3. Ask LLM to identify relevant files
    emitProgress(socket, repoKey, issue.number, "Analyzing issue...");
    const analysisPrompt = [
      `I need to fix the following GitHub issue in the repository ${owner}/${repo}.`,
      ``,
      `Issue #${issue.number}: ${issue.title}`,
      issue.body ? `\n${issue.body}` : "",
      ``,
      allGuidelineFiles.length > 0
        ? `Follow these repository guideline files while reasoning about the fix: ${allGuidelineFiles.join(", ")}.`
        : "",
      allGuidelineFiles.length > 0 ? `` : "",
      `Given the repository file tree above, identify which files are most relevant to fixing this issue.`,
      `Respond with a JSON object: { "files": ["path/to/file1.js", "path/to/file2.js"] }`,
      `List at most ${MAX_FILES_TO_FETCH} files, ordered by relevance.`,
    ].join("\n");

    const analysisResult = await askStructuredCodeQuestion({
      question: analysisPrompt,
      repoContext,
      referenceFiles: guidelineFileContents,
      systemPromptExtra:
        "You are analyzing a GitHub issue to determine which source files need to be modified to fix it. Respect any provided guideline files as read-only instructions. Respond ONLY with a JSON object containing a 'files' array of file paths.",
    });

    const relevantFiles = (analysisResult.files || []).slice(0, MAX_FILES_TO_FETCH);
    if (relevantFiles.length === 0) {
      throw new Error("LLM could not identify any relevant files to fix this issue.");
    }

    // 4. Fetch relevant file contents
    emitProgress(
      socket,
      repoKey,
      issue.number,
      `Reading ${relevantFiles.length} file${relevantFiles.length > 1 ? "s" : ""}...`
    );
    const fileContents = {};
    const fileShas = {};
    for (const filePath of relevantFiles) {
      try {
        const fileData = await githubService.fetchFileContent(token, owner, repo, filePath);
        fileContents[filePath] = fileData.content;
        fileShas[filePath] = fileData.sha;
      } catch (err) {
        // Skip files that can't be fetched (deleted, binary, etc.)
        console.warn(`[agentTaskRunner] Skipping file ${filePath}: ${err.message}`);
      }
    }

    if (Object.keys(fileContents).length === 0) {
      throw new Error("Could not fetch any of the identified files.");
    }

    // 5. Ask LLM to produce the fix
    emitProgress(socket, repoKey, issue.number, "Generating fix...");
    const fixPrompt = [
      `Fix the following GitHub issue in repository ${owner}/${repo}.`,
      ``,
      `Issue #${issue.number}: ${issue.title}`,
      issue.body ? `\n${issue.body}` : "",
      ``,
      allGuidelineFiles.length > 0
        ? `Follow these repository guideline files while preparing the fix and PR text: ${allGuidelineFiles.join(", ")}.`
        : "",
      allGuidelineFiles.length > 0
        ? `Treat those guideline files as read-only references unless the issue explicitly requires updating them.`
        : "",
      allGuidelineFiles.length > 0 ? `` : "",
      `The relevant source files are provided above. Generate the exact file changes needed to fix this issue.`,
      ``,
      `Respond with a JSON object:`,
      `{`,
      `  "changes": [`,
      `    { "path": "path/to/file.js", "content": "full updated file content", "message": "commit message for this change" }`,
      `  ],`,
      `  "prTitle": "Short PR title",`,
      `  "prBody": "Description of what was changed and why"`,
      `}`,
      ``,
      `Important:`,
      `- "content" must be the COMPLETE file content (not a diff)`,
      `- Only include files that actually need changes`,
      `- Keep changes minimal and focused on the issue`,
    ].join("\n");

    const fixResult = await askStructuredCodeQuestion({
      question: fixPrompt,
      fileContents,
      referenceFiles: guidelineFileContents,
      systemPromptExtra:
        "You are a senior developer fixing a GitHub issue. Respect any provided guideline files as read-only instructions unless the issue explicitly requires updating them. Produce exact file changes as JSON. The 'content' field must contain the COMPLETE new file content. Respond ONLY with valid JSON.",
    });

    const changes = fixResult.changes || [];
    if (changes.length === 0) {
      throw new Error("LLM did not produce any file changes.");
    }

    // 6. Create branch, commit files, create PR
    emitProgress(socket, repoKey, issue.number, "Creating pull request...");
    const branchName = `openclaw/fix-issue-${issue.number}-${Date.now()}`;

    const baseSha = await githubService.fetchDefaultBranchSha(token, owner, repo);
    await githubService.createBranch(token, owner, repo, branchName, baseSha);

    for (const change of changes) {
      const existingSha = fileShas[change.path] || undefined;
      await githubService.createOrUpdateFile(
        token,
        owner,
        repo,
        change.path,
        change.content,
        change.message || `Fix #${issue.number}: update ${change.path}`,
        branchName,
        existingSha
      );
    }

    const prBody = [
      fixResult.prBody || `Automated fix for issue #${issue.number}`,
      "",
      `Fixes #${issue.number}`,
      "",
      "_Generated by OpenClaw Agent_",
    ].join("\n");

    const pr = await githubService.createPullRequest(
      token,
      owner,
      repo,
      fixResult.prTitle || `Fix #${issue.number}: ${issue.title}`,
      prBody,
      branchName,
      "main"
    );

    emitProgress(socket, repoKey, issue.number, "Done!");
    return { pr };
  } finally {
    // 7. Despawn pet
    if (petSpawned) {
      despawnPet({ io, runId, rooms });
    }
  }
}
