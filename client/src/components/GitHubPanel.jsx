import { atom, useAtom } from "jotai";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "./SocketManager";
import {
  githubStatusAtom,
  connectedReposAtom,
  githubResponsesAtom,
  githubIssuesAtom,
  githubIssueDetailAtom,
  streamerModeAtom,
  agentFixStatusAtom,
} from "./SocketManager";

export const githubPanelOpenAtom = atom(false);

const TABS = ["Dashboard", "Repos", "Files", "Ask", "Tasks"];
const MAX_GUIDELINE_FILES = 5;

/** Custom dropdown to replace native <select> */
function RepoDropdown({ value, onChange, options, placeholder, size = "md" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const hasValue = value !== "" && value != null;
  const isSm = size === "sm";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 bg-gray-900/80 border border-gray-700/50 rounded-lg font-mono transition-all duration-150 hover:border-gray-600 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 ${
          isSm ? "px-3 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm"
        } ${open ? "border-emerald-600/50 ring-1 ring-emerald-600/20" : ""}`}
      >
        <span className={hasValue ? "text-emerald-300" : "text-gray-600"}>
          {selected?.label || placeholder || "Select..."}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full bg-gray-900 border border-gray-700/50 rounded-lg shadow-xl shadow-black/40 overflow-hidden backdrop-blur-sm"
          >
            <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-sm font-mono transition-colors duration-100 ${
                    opt.value === value
                      ? "text-emerald-300 bg-emerald-500/10"
                      : "text-gray-400 hover:text-emerald-300 hover:bg-gray-800/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Parse simple markdown-like code blocks: ```...``` -> <pre><code> */
function renderMessageContent(text) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^\w*\n/, "");
      return (
        <pre
          key={i}
          className="bg-gray-950 text-emerald-300 p-3 rounded-lg overflow-x-auto text-sm my-2 border border-gray-800"
        >
          <code>{code}</code>
        </pre>
      );
    }
    if (!part) return null;
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

const GitHubPanel = ({ onClose }) => {
  const [githubStatus] = useAtom(githubStatusAtom);
  const [connectedRepos] = useAtom(connectedReposAtom);
  const [githubResponses, setGithubResponses] = useAtom(githubResponsesAtom);
  const [githubIssues] = useAtom(githubIssuesAtom);
  const [githubIssueDetail, setGithubIssueDetail] = useAtom(githubIssueDetailAtom);
  const [streamerMode, setStreamerMode] = useAtom(streamerModeAtom);
  const [agentFixStatus, setAgentFixStatus] = useAtom(agentFixStatusAtom);

  const toggleStreamerMode = useCallback(() => {
    setStreamerMode((prev) => {
      const next = !prev;
      localStorage.setItem("clawland_streamer_mode", String(next));
      return next;
    });
  }, [setStreamerMode]);

  /** Redact sensitive text in streamer mode (e.g. "devgwardo" → "dev•••••") */
  const redact = useCallback(
    (text) => {
      if (!streamerMode || !text) return text;
      const s = String(text);
      if (s.length <= 3) return "•••";
      return s.slice(0, 3) + "•".repeat(Math.min(s.length - 3, 8));
    },
    [streamerMode]
  );

  /** Redact owner/repo keys (e.g. "owner/repo" → "own•••••/rep•••••") */
  const redactRepo = useCallback(
    (key) => {
      if (!streamerMode || !key) return key;
      const parts = String(key).split("/");
      if (parts.length === 2) return `${redact(parts[0])}/${redact(parts[1])}`;
      return redact(key);
    },
    [streamerMode, redact]
  );

  const [activeTab, setActiveTab] = useState(0);
  const [token, setToken] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [files, setFiles] = useState([]);
  const [tasksFiles, setTasksFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [fileContent, setFileContent] = useState(null);
  const [fileContentPath, setFileContentPath] = useState("");
  const [question, setQuestion] = useState("");
  const [contextFiles, setContextFiles] = useState([]); // selected file paths for Ask context
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerSearch, setFilePickerSearch] = useState("");

  // Tasks tab state
  const [tasksView, setTasksView] = useState("list"); // "list" | "create" | "detail"
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [tasksRepo, setTasksRepo] = useState("");
  const [newIssueGuidelineFiles, setNewIssueGuidelineFiles] = useState([]);
  const [showCreateGuidelinePicker, setShowCreateGuidelinePicker] = useState(false);
  const [createGuidelineSearch, setCreateGuidelineSearch] = useState("");
  const [extraFixGuidelineFiles, setExtraFixGuidelineFiles] = useState([]);
  const [showFixGuidelinePicker, setShowFixGuidelinePicker] = useState(false);
  const [fixGuidelineSearch, setFixGuidelineSearch] = useState("");

  const messagesEndRef = useRef(null);
  const filesContainerRef = useRef(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [githubResponses]);

  // Listen for file listing responses
  useEffect(() => {
    const onFiles = (data) => {
      if (data && data.tree) {
        if (data.repoKey === selectedRepo) {
          setFiles(data.tree);
        }
        if (data.repoKey === tasksRepo) {
          setTasksFiles(data.tree);
        }
      }
    };
    const onFileContent = (data) => {
      if (data && data.content !== undefined && data.repoKey === selectedRepo) {
        setFileContent(data.content);
        setFileContentPath(data.path || "");
      }
    };
    socket.on("github:fileTree", onFiles);
    socket.on("github:fileContent", onFileContent);
    return () => {
      socket.off("github:fileTree", onFiles);
      socket.off("github:fileContent", onFileContent);
    };
  }, [selectedRepo, tasksRepo]);

  // Fetch files when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      setFiles([]);
      setFileContent(null);
      setFileContentPath("");
      socket.emit("github:getFiles", { repoKey: selectedRepo });
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (tasksRepo) {
      setTasksFiles([]);
      socket.emit("github:getFiles", { repoKey: tasksRepo });
      return;
    }
    setTasksFiles([]);
  }, [tasksRepo]);

  const handleAuth = useCallback(() => {
    if (!token.trim()) return;
    localStorage.setItem("clawland_github_token", token.trim());
    socket.emit("github:auth", { token: token.trim() });
    setToken("");
  }, [token]);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem("clawland_github_token");
    socket.emit("github:disconnect");
  }, []);

  const handleAddRepo = useCallback(() => {
    const trimmed = repoInput.trim();
    if (!trimmed || !trimmed.includes("/")) return;
    const [owner, repo] = trimmed.split("/");
    socket.emit("github:connectRepo", { owner, repo });
    setRepoInput("");
  }, [repoInput]);

  const handleDisconnectRepo = useCallback((repoKey) => {
    socket.emit("github:disconnectRepo", { repoKey });
  }, []);

  const handleFileClick = useCallback(
    (path) => {
      if (!selectedRepo) return;
      setFileContent(null);
      setFileContentPath(path);
      socket.emit("github:getFile", { repoKey: selectedRepo, path });
    },
    [selectedRepo]
  );

  const toggleFolder = useCallback((path) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleAsk = useCallback(() => {
    if (!question.trim()) return;
    const q = question.trim();
    const filesLabel = contextFiles.length > 0 ? ` [${contextFiles.length} file${contextFiles.length > 1 ? "s" : ""} attached]` : "";
    setGithubResponses((prev) => [
      ...prev,
      { type: "question", text: q + filesLabel, timestamp: Date.now() },
      { type: "answer", text: "", timestamp: Date.now(), streaming: true },
    ]);
    const payload = {
      question: q,
      repoKey: selectedRepo || undefined,
    };
    if (contextFiles.length > 0) {
      payload.files = contextFiles.slice(0, 5);
    }
    socket.emit("github:askQuestion", payload);
    setQuestion("");
    setContextFiles([]);
  }, [question, selectedRepo, contextFiles, setGithubResponses]);

  const toggleContextFile = useCallback((path) => {
    setContextFiles((prev) => {
      if (prev.includes(path)) return prev.filter((f) => f !== path);
      if (prev.length >= 5) return prev; // max 5
      return [...prev, path];
    });
  }, []);

  const toggleNewIssueGuidelineFile = useCallback((path) => {
    setNewIssueGuidelineFiles((prev) => {
      if (prev.includes(path)) return prev.filter((f) => f !== path);
      if (prev.length >= MAX_GUIDELINE_FILES) return prev;
      return [...prev, path];
    });
  }, []);

  const toggleExtraFixGuidelineFile = useCallback((path) => {
    setExtraFixGuidelineFiles((prev) => {
      if (prev.includes(path)) return prev.filter((f) => f !== path);
      const alreadyPinned = Array.isArray(githubIssueDetail?.guidelineFiles)
        ? githubIssueDetail.guidelineFiles
        : [];
      if (new Set([...alreadyPinned, ...prev]).size >= MAX_GUIDELINE_FILES) return prev;
      return [...prev, path];
    });
  }, [githubIssueDetail]);

  // Tasks handlers
  const handleFetchIssues = useCallback((repoKey) => {
    if (!repoKey) return;
    socket.emit("github:listIssues", { repoKey });
  }, []);

  const handleCreateIssue = useCallback(() => {
    if (!newIssueTitle.trim() || !tasksRepo) return;
    socket.emit("github:createIssue", {
      repoKey: tasksRepo,
      title: newIssueTitle.trim(),
      body: newIssueBody.trim(),
      guidelineFiles: newIssueGuidelineFiles,
    });
    setNewIssueTitle("");
    setNewIssueBody("");
    setNewIssueGuidelineFiles([]);
    setShowCreateGuidelinePicker(false);
    setCreateGuidelineSearch("");
    setTasksView("list");
  }, [newIssueTitle, newIssueBody, newIssueGuidelineFiles, tasksRepo]);

  const handleViewIssue = useCallback((issueNumber) => {
    if (!tasksRepo) return;
    setGithubIssueDetail(null);
    setExtraFixGuidelineFiles([]);
    setShowFixGuidelinePicker(false);
    setFixGuidelineSearch("");
    socket.emit("github:getIssue", { repoKey: tasksRepo, issueNumber });
    setTasksView("detail");
  }, [tasksRepo, setGithubIssueDetail]);

  const handleAgentFix = useCallback((issueNumber) => {
    if (!tasksRepo) return;
    const issueGuidelineFiles = Array.isArray(githubIssueDetail?.guidelineFiles)
      ? githubIssueDetail.guidelineFiles
      : [];
    const guidelineFiles = Array.from(
      new Set([...issueGuidelineFiles, ...extraFixGuidelineFiles])
    );
    setAgentFixStatus({
      running: true,
      issueNumber,
      repoKey: tasksRepo,
      progress: "Starting...",
      result: null,
      error: null,
    });
    socket.emit("github:agentFix", { repoKey: tasksRepo, issueNumber, guidelineFiles });
  }, [tasksRepo, githubIssueDetail, extraFixGuidelineFiles, setAgentFixStatus]);

  const isConnected = githubStatus?.connected;
  const username = githubStatus?.username;

  // Build file tree structure
  const buildTree = (fileList) => {
    if (!fileList || fileList.length === 0) return [];
    const items = fileList.map((f) =>
      typeof f === "string" ? { path: f, type: "file" } : f
    );
    return items.sort((a, b) => {
      const aIsDir = a.type === "dir" || a.type === "tree";
      const bIsDir = b.type === "dir" || b.type === "tree";
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.path.localeCompare(b.path);
    });
  };

  const fileTree = buildTree(files);

  const getVisibleFiles = (tree) => {
    return tree.filter((item) => {
      const parts = item.path.split("/");
      if (parts.length === 1) return true;
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join("/");
        if (!expandedFolders.has(parentPath)) return false;
      }
      return true;
    });
  };

  const visibleFiles = getVisibleFiles(fileTree);
  const selectableTaskFiles = tasksFiles.filter(
    (f) => f.type === "blob" || f.type === "file"
  );
  const issueGuidelineFiles = Array.isArray(githubIssueDetail?.guidelineFiles)
    ? githubIssueDetail.guidelineFiles
    : [];
  const combinedFixGuidelineFiles = Array.from(
    new Set([...issueGuidelineFiles, ...extraFixGuidelineFiles])
  );

  const getRepoKey = (repo) =>
    typeof repo === "string" ? repo : repo.key || `${repo.owner}/${repo.repo}`;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="terminal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-[24]"
      />

      {/* Outer bezel — monitor frame */}
      <motion.div
        key="terminal-bezel"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed z-[25] flex flex-col items-center"
        style={{ inset: "6vh 10vw", maxWidth: "860px", maxHeight: "640px", margin: "auto" }}
      >
        {/* Monitor body */}
        <div
          className="flex flex-col w-full flex-1 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-600 overflow-hidden"
          style={{ boxShadow: "0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)" }}
        >
        {/* Top bar — close, power LED, title, streamer toggle */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-800 via-gray-750 to-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
              title="Close"
            />
            {/* Power LED */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-gray-600"}`}
              style={isConnected ? { boxShadow: "0 0 6px rgba(52, 211, 153, 0.7)" } : {}}
            />
            <span className="text-xs sm:text-sm font-mono text-gray-400 tracking-wide">
              OpenClaw Terminal
            </span>
          </div>
          {/* Streamer mode toggle */}
          <button
            onClick={toggleStreamerMode}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              streamerMode
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-400"
            }`}
            title={streamerMode ? "Streamer mode ON — sensitive info hidden" : "Enable streamer mode to hide sensitive info"}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {streamerMode ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              )}
            </svg>
            {streamerMode ? "HIDDEN" : "STREAM"}
          </button>
        </div>

        {/* Screen area */}
        <div className="flex-1 flex flex-col m-2 sm:m-3 bg-gray-950 rounded-lg overflow-hidden relative" style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)" }}>
          {/* CRT overlays */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.03) 0%, transparent 70%)" }}
          />

          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-950/80 relative z-20">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-xs font-mono text-emerald-500">
              github@openclaw:~$
            </span>
            {isConnected && (
              <span className="text-xs font-mono text-emerald-300 opacity-60">
                {redact(username)}
              </span>
            )}
            <span className="terminal-cursor text-emerald-400 text-xs font-mono ml-auto">_</span>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-800 bg-gray-950/60 relative z-20">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2 text-xs sm:text-sm font-mono transition-colors relative ${
                  activeTab === i
                    ? "text-emerald-400"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {tab}
                {activeTab === i && (
                  <motion.div
                    layoutId="terminal-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto terminal-content relative z-20">
            {/* === DASHBOARD TAB === */}
            {activeTab === 0 && (
              <div className="p-4 space-y-4">
                {!isConnected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-mono">
                      &gt; Enter a GitHub Personal Access Token to connect.
                    </p>
                    {streamerMode ? (
                      <div className="border border-purple-800/50 rounded-lg p-3 bg-purple-950/20">
                        <p className="text-xs text-purple-300 font-mono">
                          Streamer mode is active. Disable it to enter your token safely, then re-enable.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                          placeholder="ghp_xxxxxxxxxxxx"
                          className="flex-1 border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-900 text-emerald-300 font-mono focus:outline-none focus:border-emerald-600 placeholder-gray-700"
                        />
                        <button
                          onClick={handleAuth}
                          className="bg-emerald-600 text-gray-950 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors whitespace-nowrap font-mono"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status card */}
                    <div className="border border-emerald-800/50 rounded-lg p-3 bg-emerald-950/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52, 211, 153, 0.7)" }} />
                          <span className="text-sm font-mono text-emerald-400">
                            {redact(username) || "Connected"}
                          </span>
                        </div>
                        <button
                          onClick={handleDisconnect}
                          className="text-xs text-red-400 hover:text-red-300 font-mono transition-colors"
                        >
                          disconnect
                        </button>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-mono">Repos</p>
                        <p className="text-lg text-emerald-400 font-mono">{connectedRepos?.length || 0}</p>
                      </div>
                      <div className="border border-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-mono">Queries</p>
                        <p className="text-lg text-emerald-400 font-mono">
                          {githubResponses?.filter((r) => r.type === "question").length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Repos summary */}
                    {connectedRepos && connectedRepos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">&gt; Connected Repos</p>
                        {connectedRepos.map((repo) => {
                          const key = getRepoKey(repo);
                          const fileCount = typeof repo === "object" ? repo.fileCount : null;
                          return (
                            <div key={key} className="flex items-center justify-between border border-gray-800 rounded-lg px-3 py-2">
                              <span className="text-sm font-mono text-emerald-300 truncate">{redactRepo(key)}</span>
                              {fileCount != null && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-mono flex-shrink-0 ml-2">
                                  {fileCount} files
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === REPOS TAB === */}
            {activeTab === 1 && (
              <div className="p-4 space-y-4">
                {/* Auth section */}
                {!isConnected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-mono">
                      &gt; Authenticate first via the Dashboard tab.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Connected repos */}
                    {connectedRepos && connectedRepos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                          &gt; Connected Repos
                        </p>
                        {connectedRepos.map((repo) => {
                          const key = getRepoKey(repo);
                          const fileCount = typeof repo === "object" ? repo.fileCount : null;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between border border-gray-800 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                                <span className="text-sm font-mono text-emerald-300 truncate">{redactRepo(key)}</span>
                                {fileCount != null && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-mono flex-shrink-0">
                                    {fileCount} files
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDisconnectRepo(key)}
                                className="text-xs text-red-400 hover:text-red-300 font-mono transition-colors flex-shrink-0 ml-2"
                              >
                                disconnect
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add repo */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                        &gt; Add Repository
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={repoInput}
                          onChange={(e) => setRepoInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddRepo()}
                          placeholder="owner/repo"
                          className="flex-1 border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-900 text-emerald-300 font-mono focus:outline-none focus:border-emerald-600 placeholder-gray-700"
                        />
                        <button
                          onClick={handleAddRepo}
                          className="bg-emerald-600 text-gray-950 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors font-mono"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* === FILES TAB === */}
            {activeTab === 2 && (
              <div className="p-4 space-y-3">
                {/* Repo selector */}
                <RepoDropdown
                  value={selectedRepo}
                  onChange={setSelectedRepo}
                  placeholder="Select a repo..."
                  options={[
                    { value: "", label: "Select a repo..." },
                    ...(connectedRepos || []).map((repo) => {
                      const key = getRepoKey(repo);
                      return { value: key, label: redactRepo(key) };
                    }),
                  ]}
                />

                {/* File tree */}
                {selectedRepo && (
                  <div
                    ref={filesContainerRef}
                    className="border border-gray-800 rounded-lg overflow-hidden"
                  >
                    {visibleFiles.length === 0 && (
                      <p className="text-center text-gray-600 text-xs py-6 font-mono">
                        Loading files...
                      </p>
                    )}
                    {visibleFiles.map((item) => {
                      const depth = item.path.split("/").length - 1;
                      const isDir = item.type === "dir" || item.type === "tree";
                      const isExpanded = expandedFolders.has(item.path);
                      const fileName = item.path.split("/").pop();

                      return (
                        <button
                          key={item.path}
                          onClick={() =>
                            isDir
                              ? toggleFolder(item.path)
                              : handleFileClick(item.path)
                          }
                          className={`w-full text-left flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono hover:bg-gray-900 border-b border-gray-800/50 last:border-b-0 ${
                            fileContentPath === item.path
                              ? "bg-emerald-950/30 text-emerald-400"
                              : "text-gray-500"
                          }`}
                          style={{ paddingLeft: `${12 + depth * 16}px` }}
                        >
                          {isDir ? (
                            <svg
                              className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                          <span className="truncate">{fileName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* File content viewer */}
                {fileContent !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 font-mono truncate">
                        {fileContentPath}
                      </p>
                      <button
                        onClick={() => {
                          setFileContent(null);
                          setFileContentPath("");
                        }}
                        className="text-xs text-gray-600 hover:text-gray-400 font-mono"
                      >
                        close
                      </button>
                    </div>
                    <pre className="bg-gray-950 text-emerald-300 p-3 rounded-lg overflow-x-auto text-xs max-h-80 overflow-y-auto font-mono border border-gray-800">
                      {fileContent}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* === ASK TAB === */}
            {activeTab === 3 && (
              <div className="flex flex-col h-full">
                {/* Conversation history */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 terminal-content">
                  {(!githubResponses || githubResponses.length === 0) && (
                    <p className="text-center text-gray-600 text-xs mt-8 font-mono">
                      &gt; Ask questions about your connected repos.
                    </p>
                  )}
                  {githubResponses &&
                    githubResponses.map((entry, i) => {
                      if (entry.type === "question") {
                        return (
                          <div key={i} className="flex justify-end">
                            <div className="max-w-[85%] bg-emerald-800/40 border border-emerald-700/30 text-emerald-300 px-3 py-2 rounded-xl rounded-br-sm text-sm font-mono">
                              <p className="break-words">{entry.text}</p>
                            </div>
                          </div>
                        );
                      }
                      if (entry.type === "error") {
                        return (
                          <div key={i} className="flex justify-start">
                            <div className="max-w-[85%] bg-red-950/30 border border-red-800/30 text-red-400 px-3 py-2 rounded-xl rounded-bl-sm text-sm font-mono">
                              <p className="break-words">{entry.error}</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="flex justify-start">
                          <div className="max-w-[85%] bg-gray-900 border border-gray-800 text-emerald-300 px-3 py-2 rounded-xl rounded-bl-sm text-sm font-mono">
                            {entry.answer ? (
                              <div className="break-words">
                                {renderMessageContent(entry.answer)}
                              </div>
                            ) : entry.streaming ? (
                              <span className="text-gray-600 text-xs font-mono">
                                Processing<span className="terminal-cursor">_</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* === TASKS TAB === */}
            {activeTab === 4 && (
              <div className="p-4 space-y-3">
                {!isConnected ? (
                  <p className="text-sm text-gray-500 font-mono">
                    &gt; Authenticate first via the Dashboard tab.
                  </p>
                ) : (
                  <>
                    {/* Repo selector for tasks */}
                    <RepoDropdown
                      value={tasksRepo}
                      onChange={(val) => {
                        setTasksRepo(val);
                        setTasksView("list");
                        setNewIssueGuidelineFiles([]);
                        setShowCreateGuidelinePicker(false);
                        setCreateGuidelineSearch("");
                        setExtraFixGuidelineFiles([]);
                        setShowFixGuidelinePicker(false);
                        setFixGuidelineSearch("");
                        setGithubIssueDetail(null);
                        if (val) handleFetchIssues(val);
                      }}
                      placeholder="Select a repo..."
                      options={[
                        { value: "", label: "Select a repo..." },
                        ...(connectedRepos || []).map((repo) => {
                          const key = getRepoKey(repo);
                          return { value: key, label: redactRepo(key) };
                        }),
                      ]}
                    />

                    {tasksRepo && tasksView === "list" && (() => {
                      const openIssues = (githubIssues || []).filter((i) => i.state === "open");
                      const closedIssues = (githubIssues || []).filter((i) => i.state === "closed");

                      const renderIssueRow = (issue) => (
                        <button
                          key={issue.number}
                          onClick={() => handleViewIssue(issue.number)}
                          className={`group w-full text-left px-3.5 py-3 rounded-lg transition-all duration-150 ${
                            issue.state === "closed"
                              ? "opacity-50 hover:opacity-70 hover:bg-gray-800/30"
                              : "hover:bg-gray-800/50 hover:translate-x-0.5"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                              issue.state === "closed"
                                ? "bg-purple-500/50"
                                : issue.fixPRUrl
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-mono truncate ${
                                  issue.state === "closed" ? "text-gray-500" : "text-gray-200 group-hover:text-emerald-300"
                                } transition-colors`}>
                                  {issue.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-gray-600 font-mono">
                                  #{issue.number}
                                </span>
                                {issue.fixPRUrl && issue.state === "open" && (
                                  <a
                                    href={issue.fixPRUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0 hover:bg-amber-500/20 transition-colors"
                                  >
                                    PR pending
                                  </a>
                                )}
                                {issue.labels && issue.labels.map((label) => (
                                  <span
                                    key={label.name}
                                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                    style={{
                                      backgroundColor: label.color ? `#${label.color}15` : "rgba(52, 211, 153, 0.08)",
                                      color: label.color ? `#${label.color}` : "rgb(52, 211, 153)",
                                      border: `1px solid ${label.color ? `#${label.color}30` : "rgba(52, 211, 153, 0.15)"}`,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                                <span className="text-[10px] text-gray-700 font-mono ml-auto flex-shrink-0">
                                  {redact(issue.user)} &middot; {new Date(issue.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );

                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400 font-mono font-medium tracking-wide">
                                Issues
                              </p>
                              {(openIssues.length > 0 || closedIssues.length > 0) && (
                                <span className="text-[10px] text-gray-600 font-mono bg-gray-800/50 px-1.5 py-0.5 rounded">
                                  {openIssues.length + closedIssues.length}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setTasksView("create")}
                              className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg px-3 py-1.5 font-mono font-medium hover:bg-emerald-500/25 hover:border-emerald-500/30 transition-all"
                            >
                              + New Issue
                            </button>
                          </div>

                          {openIssues.length === 0 && closedIssues.length === 0 ? (
                            <div className="text-center py-10">
                              <p className="text-gray-600 text-xs font-mono">No issues found.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Open issues */}
                              {openIssues.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-widest mb-1.5 px-1">
                                    Open ({openIssues.length})
                                  </p>
                                  <div className="space-y-0.5">
                                    {openIssues.map(renderIssueRow)}
                                  </div>
                                </div>
                              )}

                              {/* Closed issues */}
                              {closedIssues.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-1.5 px-1">
                                    Closed ({closedIssues.length})
                                  </p>
                                  <div className="space-y-0.5">
                                    {closedIssues.map(renderIssueRow)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {tasksRepo && tasksView === "create" && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setTasksView("list");
                            setShowCreateGuidelinePicker(false);
                            setCreateGuidelineSearch("");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-400 font-mono transition-colors"
                        >
                          &lt; Back to issues
                        </button>
                        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                          &gt; Create Issue
                        </p>
                        <input
                          type="text"
                          value={newIssueTitle}
                          onChange={(e) => setNewIssueTitle(e.target.value)}
                          placeholder="Issue title"
                          className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-900 text-emerald-300 font-mono focus:outline-none focus:border-emerald-600 placeholder-gray-700"
                        />
                        <textarea
                          value={newIssueBody}
                          onChange={(e) => setNewIssueBody(e.target.value)}
                          placeholder="Description (optional)"
                          rows={4}
                          className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-900 text-emerald-300 font-mono focus:outline-none focus:border-emerald-600 placeholder-gray-700 resize-none"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] text-emerald-400 font-mono uppercase tracking-wider">
                                Guideline Files
                              </p>
                              <p className="text-[10px] text-gray-600 font-mono">
                                Include repo files like CONTRIBUTING.md in the issue body.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setShowCreateGuidelinePicker((prev) => !prev);
                                setCreateGuidelineSearch("");
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-lg font-mono border transition-colors ${
                                showCreateGuidelinePicker
                                  ? "border-emerald-600/40 text-emerald-400 bg-emerald-900/20"
                                  : "border-gray-700 text-gray-500 hover:text-gray-400 hover:border-gray-600"
                              }`}
                            >
                              {showCreateGuidelinePicker ? "Hide files" : "Add files"}
                            </button>
                          </div>

                          {newIssueGuidelineFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {newIssueGuidelineFiles.map((fp) => (
                                <span
                                  key={fp}
                                  className="inline-flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full font-mono"
                                >
                                  {fp}
                                  <button
                                    onClick={() => toggleNewIssueGuidelineFile(fp)}
                                    className="hover:text-red-400 transition-colors"
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                              <span className="text-[10px] text-gray-600 font-mono self-center">
                                {newIssueGuidelineFiles.length}/{MAX_GUIDELINE_FILES} files
                              </span>
                            </div>
                          )}

                          {showCreateGuidelinePicker && (
                            <div className="border border-gray-700 rounded-lg bg-gray-900 max-h-40 overflow-hidden">
                              <input
                                type="text"
                                value={createGuidelineSearch}
                                onChange={(e) => setCreateGuidelineSearch(e.target.value)}
                                placeholder="Search repo files..."
                                className="w-full px-3 py-1.5 text-xs bg-gray-900 text-emerald-300 font-mono border-b border-gray-800 focus:outline-none placeholder-gray-700"
                                autoFocus
                              />
                              <div className="overflow-y-auto max-h-28">
                                {selectableTaskFiles
                                  .filter((f) => f.path.toLowerCase().includes(createGuidelineSearch.toLowerCase()))
                                  .slice(0, 50)
                                  .map((f) => (
                                    <button
                                      key={f.path}
                                      onClick={() => toggleNewIssueGuidelineFile(f.path)}
                                      className={`w-full text-left px-3 py-1 text-xs font-mono hover:bg-gray-800 transition-colors truncate ${
                                        newIssueGuidelineFiles.includes(f.path)
                                          ? "text-emerald-400 bg-emerald-900/20"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {newIssueGuidelineFiles.includes(f.path) ? "[x] " : "[ ] "}
                                      {f.path}
                                    </button>
                                  ))}
                                {selectableTaskFiles.filter((f) =>
                                  f.path.toLowerCase().includes(createGuidelineSearch.toLowerCase())
                                ).length === 0 && (
                                  <p className="text-xs text-gray-600 font-mono p-2 text-center">
                                    {selectableTaskFiles.length === 0 ? "Loading repo files..." : "No matching files"}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleCreateIssue}
                          disabled={!newIssueTitle.trim()}
                          className="bg-emerald-600 text-gray-950 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Create Issue
                        </button>
                      </div>
                    )}

                    {tasksRepo && tasksView === "detail" && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setTasksView("list");
                            setGithubIssueDetail(null);
                            setExtraFixGuidelineFiles([]);
                            setShowFixGuidelinePicker(false);
                            setFixGuidelineSearch("");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-400 font-mono transition-colors"
                        >
                          &lt; Back to issues
                        </button>
                        {!githubIssueDetail ? (
                          <p className="text-center text-gray-600 text-xs py-6 font-mono">
                            Loading<span className="terminal-cursor">_</span>
                          </p>
                        ) : (
                          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-600">
                                #{githubIssueDetail.number}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                  githubIssueDetail.state === "open"
                                    ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/30"
                                    : "bg-purple-900/40 text-purple-400 border border-purple-700/30"
                                }`}
                              >
                                {githubIssueDetail.state}
                              </span>
                            </div>
                            <h3 className="text-base font-mono text-emerald-300">
                              {githubIssueDetail.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
                              <span>@{redact(githubIssueDetail.user)}</span>
                              <span>-</span>
                              <span>{new Date(githubIssueDetail.created_at).toLocaleDateString()}</span>
                              {githubIssueDetail.comments > 0 && (
                                <span>- {githubIssueDetail.comments} comments</span>
                              )}
                            </div>
                            {githubIssueDetail.labels && githubIssueDetail.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {githubIssueDetail.labels.map((label) => (
                                  <span
                                    key={label.name}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                                    style={{
                                      backgroundColor: label.color ? `#${label.color}20` : "rgba(52, 211, 153, 0.1)",
                                      color: label.color ? `#${label.color}` : "rgb(52, 211, 153)",
                                      border: `1px solid ${label.color ? `#${label.color}40` : "rgba(52, 211, 153, 0.2)"}`,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {githubIssueDetail.body && (
                              <div className="border-t border-gray-800 pt-3">
                                <pre className="text-sm text-emerald-300/80 font-mono whitespace-pre-wrap break-words">
                                  {githubIssueDetail.body}
                                </pre>
                              </div>
                            )}
                            <div className="border-t border-gray-800 pt-3 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[11px] text-emerald-400 font-mono uppercase tracking-wider">
                                    Fix Guidelines
                                  </p>
                                  <p className="text-[10px] text-gray-600 font-mono">
                                    Add repo files the fixer should follow, like CONTRIBUTING.md.
                                  </p>
                                </div>
                                {githubIssueDetail.state === "open" && (
                                  <button
                                    onClick={() => {
                                      setShowFixGuidelinePicker((prev) => !prev);
                                      setFixGuidelineSearch("");
                                    }}
                                    className={`text-[11px] px-2.5 py-1 rounded-lg font-mono border transition-colors ${
                                      showFixGuidelinePicker
                                        ? "border-emerald-600/40 text-emerald-400 bg-emerald-900/20"
                                        : "border-gray-700 text-gray-500 hover:text-gray-400 hover:border-gray-600"
                                    }`}
                                  >
                                    {showFixGuidelinePicker ? "Hide files" : "Add files"}
                                  </button>
                                )}
                              </div>

                              {combinedFixGuidelineFiles.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {issueGuidelineFiles.map((fp) => (
                                    <span
                                      key={`issue-${fp}`}
                                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full font-mono"
                                      title="Stored on the issue"
                                    >
                                      {fp}
                                    </span>
                                  ))}
                                  {extraFixGuidelineFiles
                                    .filter((fp) => !issueGuidelineFiles.includes(fp))
                                    .map((fp) => (
                                      <span
                                        key={`extra-${fp}`}
                                        className="inline-flex items-center gap-1 text-[10px] bg-sky-900/30 text-sky-300 border border-sky-700/30 px-2 py-0.5 rounded-full font-mono"
                                        title="Only used for this fix run"
                                      >
                                        {fp}
                                        <button
                                          onClick={() => toggleExtraFixGuidelineFile(fp)}
                                          className="hover:text-red-300 transition-colors"
                                        >
                                          x
                                        </button>
                                      </span>
                                    ))}
                                  <span className="text-[10px] text-gray-600 font-mono self-center">
                                    {combinedFixGuidelineFiles.length}/{MAX_GUIDELINE_FILES} files
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-600 font-mono">
                                  No guideline files selected for this fix yet.
                                </p>
                              )}

                              {showFixGuidelinePicker && githubIssueDetail.state === "open" && (
                                <div className="border border-gray-700 rounded-lg bg-gray-900 max-h-40 overflow-hidden">
                                  <input
                                    type="text"
                                    value={fixGuidelineSearch}
                                    onChange={(e) => setFixGuidelineSearch(e.target.value)}
                                    placeholder="Search repo files..."
                                    className="w-full px-3 py-1.5 text-xs bg-gray-900 text-emerald-300 font-mono border-b border-gray-800 focus:outline-none placeholder-gray-700"
                                    autoFocus
                                  />
                                  <div className="overflow-y-auto max-h-28">
                                    {selectableTaskFiles
                                      .filter((f) => f.path.toLowerCase().includes(fixGuidelineSearch.toLowerCase()))
                                      .slice(0, 50)
                                      .map((f) => {
                                        const isSelected = combinedFixGuidelineFiles.includes(f.path);
                                        const isPinned = issueGuidelineFiles.includes(f.path);
                                        return (
                                          <button
                                            key={f.path}
                                            onClick={() => !isPinned && toggleExtraFixGuidelineFile(f.path)}
                                            disabled={isPinned}
                                            className={`w-full text-left px-3 py-1 text-xs font-mono transition-colors truncate ${
                                              isPinned
                                                ? "text-emerald-300 bg-emerald-950/30 cursor-default"
                                                : isSelected
                                                  ? "text-sky-300 bg-sky-900/20 hover:bg-sky-900/30"
                                                  : "text-gray-400 hover:bg-gray-800"
                                            }`}
                                          >
                                            {isPinned ? "[issue] " : isSelected ? "[x] " : "[ ] "}
                                            {f.path}
                                          </button>
                                        );
                                      })}
                                    {selectableTaskFiles.filter((f) =>
                                      f.path.toLowerCase().includes(fixGuidelineSearch.toLowerCase())
                                    ).length === 0 && (
                                      <p className="text-xs text-gray-600 font-mono p-2 text-center">
                                        {selectableTaskFiles.length === 0 ? "Loading repo files..." : "No matching files"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {githubIssueDetail.html_url && !streamerMode && (
                                <a
                                  href={githubIssueDetail.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block text-xs text-emerald-500 hover:text-emerald-400 font-mono underline transition-colors"
                                >
                                  View on GitHub
                                </a>
                              )}
                              {(() => {
                                const prUrl =
                                  (agentFixStatus && !agentFixStatus.running && agentFixStatus.issueNumber === githubIssueDetail.number && agentFixStatus.result?.pr?.html_url) ||
                                  (githubIssues || []).find((i) => i.number === githubIssueDetail.number)?.fixPRUrl;
                                return prUrl && !streamerMode ? (
                                  <a
                                    href={prUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-900/30 text-amber-400 border border-amber-700/30 hover:bg-amber-900/50 transition-colors no-underline"
                                  >
                                    View Pull Request
                                  </a>
                                ) : null;
                              })()}
                              {githubIssueDetail.state === "open" && !(
                                (agentFixStatus && !agentFixStatus.running && agentFixStatus.issueNumber === githubIssueDetail.number && agentFixStatus.result?.pr) ||
                                (githubIssues || []).find((i) => i.number === githubIssueDetail.number)?.fixPRUrl
                              ) && (
                                <button
                                  onClick={() => handleAgentFix(githubIssueDetail.number)}
                                  disabled={agentFixStatus?.running && agentFixStatus?.issueNumber === githubIssueDetail.number}
                                  className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                                    agentFixStatus?.running && agentFixStatus?.issueNumber === githubIssueDetail.number
                                      ? "bg-amber-900/30 text-amber-400 border border-amber-700/30 cursor-wait"
                                      : "bg-emerald-600 text-gray-950 hover:bg-emerald-500"
                                  }`}
                                >
                                  {agentFixStatus?.running && agentFixStatus?.issueNumber === githubIssueDetail.number
                                    ? "Agent working..."
                                    : "Fix with OpenClaw"}
                                </button>
                              )}
                            </div>

                            {/* Agent fix progress / errors */}
                            {agentFixStatus && agentFixStatus.issueNumber === githubIssueDetail.number && (
                              <div className="border-t border-gray-800 pt-3 space-y-2">
                                {agentFixStatus.running && agentFixStatus.progress && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-xs font-mono text-amber-300">
                                      {agentFixStatus.progress}
                                    </span>
                                  </div>
                                )}
                                {!agentFixStatus.running && agentFixStatus.result?.pr && (
                                  <div className="border border-emerald-800/50 rounded-lg p-3 bg-emerald-950/30">
                                    <p className="text-xs font-mono text-emerald-400">
                                      PR #{agentFixStatus.result.pr.number} created successfully!
                                    </p>
                                  </div>
                                )}
                                {!agentFixStatus.running && agentFixStatus.error && (
                                  <div className="border border-red-800/50 rounded-lg p-3 bg-red-950/30">
                                    <p className="text-xs font-mono text-red-400">
                                      Error: {agentFixStatus.error}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Ask input (always visible on Ask tab) */}
          {activeTab === 3 && (
            <div className="p-3 border-t border-gray-800 bg-gray-950 relative z-20">
              {connectedRepos && connectedRepos.length > 1 && (
                <div className="mb-2">
                  <RepoDropdown
                    value={selectedRepo}
                    onChange={setSelectedRepo}
                    placeholder="All repos"
                    size="sm"
                    options={[
                      { value: "", label: "All repos" },
                      ...connectedRepos.map((repo) => {
                        const key = getRepoKey(repo);
                        return { value: key, label: redactRepo(key) };
                      }),
                    ]}
                  />
                </div>
              )}

              {/* Context files chips */}
              {contextFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {contextFiles.map((fp) => (
                    <span
                      key={fp}
                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full font-mono"
                    >
                      {fp.split("/").pop()}
                      <button
                        onClick={() => toggleContextFile(fp)}
                        className="hover:text-red-400 transition-colors"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <span className="text-[10px] text-gray-600 font-mono self-center">
                    {contextFiles.length}/5 files
                  </span>
                </div>
              )}

              {/* File picker dropdown */}
              {showFilePicker && (
                <div className="mb-2 border border-gray-700 rounded-lg bg-gray-900 max-h-40 overflow-hidden">
                  <input
                    type="text"
                    value={filePickerSearch}
                    onChange={(e) => setFilePickerSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full px-3 py-1.5 text-xs bg-gray-900 text-emerald-300 font-mono border-b border-gray-800 focus:outline-none placeholder-gray-700"
                    autoFocus
                  />
                  <div className="overflow-y-auto max-h-28">
                    {files
                      .filter((f) => (f.type === "blob" || f.type === "file") && f.path.toLowerCase().includes(filePickerSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((f) => (
                        <button
                          key={f.path}
                          onClick={() => toggleContextFile(f.path)}
                          className={`w-full text-left px-3 py-1 text-xs font-mono hover:bg-gray-800 transition-colors truncate ${
                            contextFiles.includes(f.path) ? "text-emerald-400 bg-emerald-900/20" : "text-gray-400"
                          }`}
                        >
                          {contextFiles.includes(f.path) ? "[x] " : "[ ] "}
                          {f.path}
                        </button>
                      ))}
                    {files.filter((f) => (f.type === "blob" || f.type === "file") && f.path.toLowerCase().includes(filePickerSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-gray-600 font-mono p-2 text-center">
                        {files.length === 0 ? "Connect a repo first" : "No matching files"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowFilePicker((v) => !v);
                    setFilePickerSearch("");
                  }}
                  className={`px-2 py-2 rounded-xl text-sm font-mono transition-colors border ${
                    showFilePicker
                      ? "border-emerald-600 text-emerald-400 bg-emerald-900/20"
                      : "border-gray-700 text-gray-500 hover:text-gray-400 hover:border-gray-600"
                  }`}
                  title="Attach files for context"
                >
                  +
                </button>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="Ask about the code..."
                  className="flex-1 border border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-900 text-emerald-300 font-mono focus:outline-none focus:border-emerald-600 placeholder-gray-700"
                />
                <button
                  onClick={handleAsk}
                  className="bg-emerald-600 text-gray-950 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors font-mono"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
        {/* Monitor stand */}
        <div className="flex flex-col items-center flex-shrink-0">
          {/* Neck */}
          <div className="w-8 h-4 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-sm" />
          {/* Base */}
          <div className="w-28 h-2.5 bg-gradient-to-b from-gray-700 to-gray-800 rounded-full border border-gray-600" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GitHubPanel;
