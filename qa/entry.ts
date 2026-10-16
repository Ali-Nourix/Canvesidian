import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  history,
  defaultKeymap,
  historyKeymap,
  undo,
  redo,
} from "@codemirror/commands";
import Canvesidian from "../src/main";
import {
  editorInfoField,
  editorLivePreviewField,
  changeMode,
} from "./obsidian-mock";
import { normalize } from "../src/model";
import { floatAt, toggleSpatial } from "../src/spatial";
const w = window as any;
w.notices = [];
w.commands = [];
w.leafCreates = 0;
w.fileWrites = 0;
const plugin = new Canvesidian() as any;
plugin.app = {
  workspace: {
    on: () => {},
    getLeaf: () => {
      w.leafCreates++;
    },
  },
  vault: { on: () => {} },
};
w.plugin = plugin;
await plugin.onload();
const original =
  '# A note, with room to think\n\nThis paragraph stays in the normal text flow.\n\nMove this paragraph anywhere, then edit it right there.\n\nاین یک پاراگراف فارسی است؛ در همان نوت باقی می‌ماند.\n\n```js\nconst idea = "space to think";\n```\n\n![Sketch](sketch.png)\n\nThe rest of this note is still a normal editor.';
w.original = original;
function mount(doc = original) {
  const parent = document.querySelector("#editor")!;
  const state = EditorState.create({
    doc,
    extensions: [
      editorInfoField,
      editorLivePreviewField,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      w.extension,
    ],
  });
  const view = new EditorView({ state, parent });
  w.view = view;
  return view;
}
mount();
w.floatText = (text: string) => {
  const pos = w.view.state.doc.toString().indexOf(text);
  if (pos < 0) throw Error("Missing text");
  return floatAt(w.view, plugin, pos);
};
w.source = () => w.view.state.doc.toString();
w.toggle = () => toggleSpatial(w.view);
w.mode = (live: boolean) => w.view.dispatch({ effects: changeMode.of(live) });
w.undo = () => undo(w.view);
w.redo = () => redo(w.view);
w.remount = async () => {
  const source = w.source();
  w.view.destroy();
  await plugin.flush();
  plugin.store = normalize(w.saved);
  mount(source);
};
w.reset = () => {
  w.view.destroy();
  plugin.store.notes = {};
  mount(original);
};
w.testFutureData = async () => {
  const before = w.saved;
  w.saved = { version: 99, precious: "keep" };
  const blocked = new Canvesidian() as any;
  blocked.app = plugin.app;
  await blocked.onload();
  blocked.onunload();
  await blocked.flush();
  const kept = w.saved.version === 99 && w.saved.precious === "keep";
  w.saved = before;
  return kept;
};
w.ready = true;
