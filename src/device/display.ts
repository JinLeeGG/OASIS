import { exec } from "child_process";
import { resolve } from "path";
import { Socket } from "net";
import { getCurrentTimeTag } from "../utils";

export class WhisplayButton {
  private client = null as Socket | null;
  private buttonPressedCallback: () => void = () => {};
  private buttonReleasedCallback: () => void = () => {};
  private buttonDoubleClickCallback: (() => void) | null = null;
  private isReady: Promise<void>;
  private pythonProcess: any;
  private buttonPressTimeArray: number[] = [];
  private buttonReleaseTimeArray: number[] = [];
  private buttonDetectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPythonProcess();
    this.isReady = new Promise<void>((resolve) => {
      this.connectWithRetry(15, resolve);
    });
  }

  startMonitoringDoubleClick(): void {
    if (this.buttonDetectInterval || !this.buttonDoubleClickCallback) return;
    this.buttonDetectInterval = setTimeout(() => {
      const now = Date.now();
      this.buttonPressTimeArray = this.buttonPressTimeArray.filter(
        (time) => now - time <= 1000
      );
      this.buttonReleaseTimeArray = this.buttonReleaseTimeArray.filter(
        (time) => now - time <= 1000
      );
      const doubleClickDetected =
        this.buttonPressTimeArray.length >= 2 &&
        this.buttonReleaseTimeArray.length >= 2;

      if (doubleClickDetected) {
        this.buttonDoubleClickCallback?.();
      } else {
        const lastReleaseTime = this.buttonReleaseTimeArray.pop() || 0;
        const lastPressTime = this.buttonPressTimeArray.pop() || 0;
        if (!lastReleaseTime || lastReleaseTime < lastPressTime) {
          this.buttonPressedCallback();
        }
      }

      this.buttonPressTimeArray = [];
      this.buttonReleaseTimeArray = [];
      this.buttonDetectInterval = null;
    }, 800);
  }

  startPythonProcess(): void {
    const command = `cd ${resolve(
      __dirname,
      "../../python"
    )} && python3 chatbot-ui.py`;
    console.log("Starting Python process...");
    this.pythonProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error starting Python process:", error);
        return;
      }
      console.log("Python process stdout:", stdout);
      console.error("Python process stderr:", stderr);
    });
    this.pythonProcess.stdout.on("data", (data: any) =>
      console.log(data.toString())
    );
    this.pythonProcess.stderr.on("data", (data: any) =>
      console.error(data.toString())
    );
  }

  killPythonProcess(): void {
    if (this.pythonProcess) {
      console.log("Killing Python process...", this.pythonProcess.pid);
      this.pythonProcess.kill();
      process.kill(this.pythonProcess.pid, "SIGKILL");
      this.pythonProcess = null;
    }
  }

  async connectWithRetry(
    retries: number = 10,
    outerResolve: () => void
  ): Promise<void> {
    await new Promise((resolve, reject) => {
      const attemptConnection = (attempt: number) => {
        this.connect()
          .then(() => {
            resolve(true);
          })
          .catch((err) => {
            if (attempt < retries) {
              console.log(`Connection attempt ${attempt} failed, retrying...`);
              setTimeout(() => attemptConnection(attempt + 1), 5000);
            } else {
              console.error("Failed to connect after multiple attempts:", err);
              reject(err);
            }
          });
      };
      attemptConnection(1);
    });
    outerResolve();
  }

  async connect(): Promise<void> {
    console.log("Connecting to button socket...");
    return new Promise<void>((resolve, reject) => {
      if (this.client) {
        this.client.destroy();
      }
      this.client = new Socket();
      this.client.connect(12345, "0.0.0.0", () => {
        console.log("Connected to button socket");
        resolve();
      });
      this.client.on("data", (data: Buffer) => {
        const dataString = data.toString();
        if (dataString.trim() === "OK") {
          return;
        }
        console.log(
          `[${getCurrentTimeTag()}] Received data from Whisplay hat:`,
          dataString
        );
        try {
          const json = JSON.parse(dataString);
          if (json.event === "button_pressed") {
            this.buttonPressTimeArray.push(Date.now());
            this.startMonitoringDoubleClick();
            if (!this.buttonDetectInterval) {
              console.log("emit pressed");
              this.buttonPressedCallback();
            }
          }
          if (json.event === "button_released") {
            this.buttonReleaseTimeArray.push(Date.now());
            if (!this.buttonDetectInterval) {
              console.log("emit released");
              this.buttonReleasedCallback();
            }
          }
        } catch {
          console.error("Failed to parse JSON from data");
        }
      });
      this.client.on("error", (err: any) => {
        console.error("Button Socket error:", err);
        if (err.code === "ECONNREFUSED") {
          reject(err);
        }
      });
    });
  }

  onButtonPressed(callback: () => void): void {
    this.buttonPressedCallback = callback;
  }

  onButtonReleased(callback: () => void): void {
    this.buttonReleasedCallback = callback;
  }

  onButtonDoubleClick(callback: (() => void) | null): void {
    this.buttonDoubleClickCallback = callback || null;
  }
}

const buttonInstance = new WhisplayButton();

export const onButtonPressed =
  buttonInstance.onButtonPressed.bind(buttonInstance);
export const onButtonReleased =
  buttonInstance.onButtonReleased.bind(buttonInstance);
export const onButtonDoubleClick =
  buttonInstance.onButtonDoubleClick.bind(buttonInstance);

function cleanup() {
  console.log("Cleaning up button process before exit...");
  buttonInstance.killPythonProcess();
}

process.on("exit", cleanup);
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, exiting...`);
    cleanup();
    process.exit(0);
  });
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  cleanup();
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  cleanup();
  process.exit(1);
});
