import { exec } from "child_process";

export function runCommandCompose(
  command: string,
  cwd: string,
  onlyStdout = false
): Promise<string> {
  const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";

  return new Promise((resolve, reject) => {
    try {
      const child = exec(
        command,
        { shell: shell, cwd: cwd, encoding: "buffer" },
        (error, stdout, stderr) => {
          if (error) {
            resolve(`Error: ${error.message}`);
            return;
          }
  
          const out = stdout.toString("utf8");
          if (onlyStdout) {
            resolve(out);
            return;
          }
  
          const err = stderr.toString("utf8");
  
          const output = `stdout:\n${out}\nstderr:\n${err}`;
          resolve(output);
        }
      );
  
      child.on("error", (error) => {
        reject(new Error(`Failed to start process: ${error.message}`));
      });
    } catch (error: any) {
      resolve(`Error: ${error.message}`);
    }
  });
}