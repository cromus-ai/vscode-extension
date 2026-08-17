import * as vscode from "vscode";
import { scoreSkill } from "./cromusClient";

const SEVERITY_ICONS: Record<string, string> = {
  excellent: "$(check-all)",
  good: "$(check)",
  fair: "$(warning)",
  poor: "$(error)",
  critical: "$(error)",
};

export class StatusBarProvider {
  private item: vscode.StatusBarItem;
  private pending = false;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = "cromus.scoreCurrentFile";
    this.item.tooltip = "Cromus CROMS score — click to refresh";
    context.subscriptions.push(this.item);
  }

  async update(doc: vscode.TextDocument): Promise<void> {
    if (!vscode.workspace.getConfiguration("cromus").get<boolean>("showScoreInStatusBar", true)) {
      this.item.hide();
      return;
    }
    if (!vscode.workspace.getConfiguration("cromus").get<string>("apiKey")) {
      this.item.text = "$(key) Cromus: add API key";
      this.item.tooltip = "Click to open Cromus settings";
      this.item.command = "workbench.action.openSettings";
      this.item.show();
      return;
    }

    if (this.pending) return;
    this.pending = true;
    this.item.text = "$(loading~spin) Croms…";
    this.item.show();

    try {
      const result = await scoreSkill(doc.getText());
      if (!result) {
        this.item.text = "$(dash) Croms: —";
        this.item.tooltip = "Could not score — check API key and connectivity";
      } else {
        const icon = SEVERITY_ICONS[result.cromsSeverity?.toLowerCase()] ?? "$(pulse)";
        this.item.text = `${icon} Croms: ${result.croms}`;
        const costStr = result.costPerRun !== undefined
          ? `  ·  $${result.costPerRun.toFixed(4)}/run`
          : "";
        this.item.tooltip = `CROMS ${result.croms} (${result.cromsSeverity})${costStr}\nClick to refresh`;
      }
    } catch {
      this.item.text = "$(dash) Croms: —";
    } finally {
      this.pending = false;
    }
  }

  hide(): void {
    this.item.hide();
  }
}
