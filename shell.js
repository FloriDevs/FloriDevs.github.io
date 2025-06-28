const terminal = document.getElementById("terminal");
const loginInput = document.getElementById("login");

let username = "";
let cwd = ["/", "home", "user"];
let loggedIn = false;
let installedPackages = {};

let fs = {
  "/": {
    type: "dir",
    contents: {
      "bin": {}, "etc": {}, "usr": {}, "home": {
        "user": {}
      }
    }
  }
};

function formatPrompt() {
  const path = "/" + cwd.slice(2).join("/") || "";
  return `${username}@freebsd:${path || "~"}% `;
}

function resolvePath(path) {
  if (!path) return cwd;
  if (path.startsWith("/")) return path.split("/").filter(Boolean);
  const base = [...cwd];
  const parts = path.split("/");
  for (const part of parts) {
    if (part === "..") base.pop();
    else if (part !== ".") base.push(part);
  }
  return base;
}

function getDirAndName(pathArray) {
  const name = pathArray.pop();
  const parent = pathArray.reduce((dir, key) => dir.contents?.[key], fs["/"]);
  return [parent, name];
}

function getCurrentDir() {
  return cwd.reduce((dir, key) => dir.contents?.[key], fs["/"]);
}

function print(text = "") {
  terminal.innerHTML += text + "\n";
}

function inputLine() {
  const line = document.createElement("div");
  line.innerHTML = `<span>${formatPrompt()}</span><span id="input-line"><input id="shell-input" autocomplete="off" /></span>`;
  terminal.appendChild(line);
  const shellInput = document.getElementById("shell-input");
  shellInput.focus();
  shellInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const command = shellInput.value;
      line.innerHTML = `<span>${formatPrompt()}${command}</span>`;
      handleCommand(command.trim());
    }
  });
}

function login(usernameInput) {
  username = usernameInput;
  cwd = ["/", "home", "user"];
  terminal.innerHTML += `Welcome to FreeBSD!\n\n`;
  loggedIn = true;
  inputLine();
}

loginInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const name = loginInput.value.trim();
    terminal.innerHTML = terminal.innerHTML.replace('<span id="login-prompt"><input id="login" autofocus autocomplete="off" /></span>', name);
    login(name);
  }
});

function handleCommand(cmdLine) {
  const [cmd, ...args] = cmdLine.split(/\s+/);
  const out = [];
  const dir = getCurrentDir();

  switch (cmd) {
    case "pwd":
      out.push("/" + cwd.slice(1).join("/"));
      break;
    case "ls":
      const target = args[0] ? resolvePath(args[0]) : cwd;
      let d = fs["/"];
      for (const part of target) d = d.contents?.[part];
      if (!d || d.type === "file") out.push("ls: Not a directory");
      else out.push(Object.keys(d.contents).join("  "));
      break;
    case "cd":
      const newPath = resolvePath(args[0] || "/");
      let test = fs["/"];
      for (const part of newPath) test = test.contents?.[part];
      if (!test || test.type === "file") out.push("cd: No such directory");
      else cwd = ["/", ...newPath];
      break;
    case "mkdir":
      if (!args[0]) out.push("mkdir: missing operand");
      else {
        const pathArr = resolvePath(args[0]);
        const [parent, name] = getDirAndName([...pathArr]);
        if (!parent || !parent.contents) out.push("mkdir: cannot create directory");
        else parent.contents[name] = { type: "dir", contents: {} };
      }
      break;
    case "touch":
      if (!args[0]) out.push("touch: missing file operand");
      else {
        const pathArr = resolvePath(args[0]);
        const [parent, name] = getDirAndName([...pathArr]);
        if (!parent || !parent.contents) out.push("touch: cannot create file");
        else parent.contents[name] = { type: "file", content: "" };
      }
      break;
    case "rm":
      if (!args[0]) out.push("rm: missing operand");
      else {
        const pathArr = resolvePath(args[0]);
        const [parent, name] = getDirAndName([...pathArr]);
        if (!parent || !parent.contents || !parent.contents[name]) {
          out.push("rm: cannot remove: No such file or directory");
        } else {
          delete parent.contents[name];
        }
      }
      break;
    case "cat":
      if (!args[0]) out.push("cat: missing file operand");
      else {
        const pathArr = resolvePath(args[0]);
        const file = pathArr.reduce((dir, key) => dir.contents?.[key], fs["/"]);
        if (!file || file.type !== "file") out.push("cat: file not found or not a file");
        else out.push(file.content || "");
      }
      break;
    case "pkg":
      if (args[0] === "install" && args[1] === "nano") {
        installedPackages["nano"] = true;
        out.push("nano installed successfully.");
      } else {
        out.push("pkg: unknown command or package");
      }
      break;
    case "nano":
      if (!installedPackages["nano"]) {
        out.push("nano: command not found (hint: try 'pkg install nano')");
      } else {
        out.push("nano (simulated): [editor opens]");
      }
      break;
    case "echo":
      out.push(args.join(" "));
      break;
    case "clear":
      terminal.innerHTML = "";
      return;
    case "help":
      out.push("Supported: ls, cd, mkdir, touch, rm, cat, echo, pkg install nano, nano, clear");
      break;
    case "":
      break;
    default:
      out.push(`${cmd}: command not found`);
  }

  out.forEach(print);
  inputLine();
}
