import { App, Plugin, PluginSettingTab, Setting, Modal } from "obsidian";
import { PluginPreferences, normalizePreferences } from "./model";
export interface PreferenceHost {
  store: { settings?: PluginPreferences };
  scheduleSave(): void;
  refreshDesign(): void;
}
export function preferenceControls(
  container: HTMLElement,
  host: PreferenceHost,
) {
  const prefs = () => normalizePreferences(host.store.settings);
  const set = (patch: Partial<PluginPreferences>) => {
    host.store.settings = { ...prefs(), ...patch };
    host.scheduleSave();
    host.refreshDesign();
  };
  new Setting(container)
    .setName("Dotted note background")
    .setDesc(
      "Show the grid only while spatial effects are enabled. Your Markdown is unchanged.",
    )
    .addToggle((c) =>
      c.setValue(prefs().dotGrid).onChange((v) => set({ dotGrid: v })),
    );
  new Setting(container).setName("Dot spacing").addSlider((c) =>
    c
      .setLimits(12, 64, 4)
      .setValue(prefs().gridSpacing)
      .setDynamicTooltip()
      .onChange((v) => set({ gridSpacing: v })),
  );
  new Setting(container).setName("Dot opacity").addSlider((c) =>
    c
      .setLimits(5, 40, 5)
      .setValue(prefs().gridOpacity * 100)
      .setDynamicTooltip()
      .onChange((v) => set({ gridOpacity: v / 100 })),
  );
  const p = document.createElement("p");
  p.className = "cv-settings-note";
  p.textContent =
    "Effects visibility is per note and non-destructive. Reset is separate and asks for confirmation. Images are copied into the vault; deleting their annotation does not delete the image file.";
  container.append(p);
}
export class CanvsidianSettings extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private host: PreferenceHost,
  ) {
    super(app, plugin);
  }
  display() {
    this.containerEl.replaceChildren();
    preferenceControls(this.containerEl, this.host);
  }
}
export function openPreferences(app: App, host: PreferenceHost) {
  class Preferences extends Modal {
    onOpen() {
      this.titleEl.textContent = "Canvsidian settings";
      preferenceControls(this.contentEl, host);
    }
    onClose() {
      this.contentEl.replaceChildren();
    }
  }
  new Preferences(app).open();
}
