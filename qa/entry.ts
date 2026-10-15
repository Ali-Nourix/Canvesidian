import Canvesidian from "../src/main";
import { TFile } from "./obsidian-mock";
const file = new TFile();
let source =
  "# A workspace, not a column\nIdeas need room to breathe. Move each section to where it makes sense.\n\n# به ایده‌ها فضا بده\nهر بخش جای خودش را دارد؛ یادداشت‌ها و استیکرها با همان بخش حرکت می‌کنند.\n\n# Built on Markdown\nYour original note stays a normal Markdown file. Layout lives separately.";
const listeners: Record<string, Function[]> = {};
const app: any = {
  vault: {
    getAbstractFileByPath: (path: string) => (path === file.path ? file : null),
    read: async () => source,
    process: async (_f: any, cb: any) => {
      source = cb(source);
      for (const cb of listeners.modify ?? []) cb(file);
    },
    on: (event: string, cb: Function) => {
      (listeners[event] ??= []).push(cb);
    },
  },
  workspace: {
    on: () => {},
    getActiveFile: () => file,
    getLeavesOfType: () => [],
    getLeaf: () => ({ openFile: () => {} }),
  },
};
const plugin = new Canvesidian() as any;
plugin.app = app;
(window as any).plugin = plugin;
(window as any).getSource = () => source;
await plugin.onload();
const view = app.factory({ app });
(window as any).view = view;
await view.onOpen();
await view.setState({ path: file.path }, {});
(window as any).ready = true;
