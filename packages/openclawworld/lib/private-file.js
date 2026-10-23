import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function writePrivateFile(file, content) {
  const requestedHome = path.resolve(process.env.HOME || process.env.USERPROFILE);
  const home = fs.realpathSync(requestedHome);
  const relative = path.relative(requestedHome, path.resolve(file));
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("Installer path must remain inside the home directory");
  }
  const target = path.join(home, relative);
  const checkDirectory = directory => {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe installer directory");
    if (typeof process.getuid === "function" &&
        (stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0)) {
      throw new Error("Installer directories must be owned by the current user and not writable by others");
    }
  };
  checkDirectory(home);
  let directory = home;
  const parts = relative.split(path.sep);
  for (const part of parts.slice(0, -1)) {
    directory = path.join(directory, part);
    try { fs.mkdirSync(directory, { mode: 0o700 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    checkDirectory(directory);
  }
  try {
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("Unsafe installer file");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const temporary = path.join(directory, ".install-" + randomUUID());
  let fd;
  try {
    fd = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(fd, content, "utf8");
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary, target);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
