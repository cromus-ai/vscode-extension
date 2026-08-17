"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarProvider = void 0;
const vscode = __importStar(require("vscode"));
const cromusClient_1 = require("./cromusClient");
const SEVERITY_ICONS = {
    excellent: "$(check-all)",
    good: "$(check)",
    fair: "$(warning)",
    poor: "$(error)",
    critical: "$(error)",
};
class StatusBarProvider {
    constructor(context) {
        this.pending = false;
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.item.command = "cromus.scoreCurrentFile";
        this.item.tooltip = "Cromus CROMS score — click to refresh";
        context.subscriptions.push(this.item);
    }
    async update(doc) {
        if (!vscode.workspace.getConfiguration("cromus").get("showScoreInStatusBar", true)) {
            this.item.hide();
            return;
        }
        if (!vscode.workspace.getConfiguration("cromus").get("apiKey")) {
            this.item.text = "$(key) Cromus: add API key";
            this.item.tooltip = "Click to open Cromus settings";
            this.item.command = "workbench.action.openSettings";
            this.item.show();
            return;
        }
        if (this.pending)
            return;
        this.pending = true;
        this.item.text = "$(loading~spin) Croms…";
        this.item.show();
        try {
            const result = await (0, cromusClient_1.scoreSkill)(doc.getText());
            if (!result) {
                this.item.text = "$(dash) Croms: —";
                this.item.tooltip = "Could not score — check API key and connectivity";
            }
            else {
                const icon = SEVERITY_ICONS[result.cromsSeverity?.toLowerCase()] ?? "$(pulse)";
                this.item.text = `${icon} Croms: ${result.croms}`;
                const costStr = result.costPerRun !== undefined
                    ? `  ·  $${result.costPerRun.toFixed(4)}/run`
                    : "";
                this.item.tooltip = `CROMS ${result.croms} (${result.cromsSeverity})${costStr}\nClick to refresh`;
            }
        }
        catch {
            this.item.text = "$(dash) Croms: —";
        }
        finally {
            this.pending = false;
        }
    }
    hide() {
        this.item.hide();
    }
}
exports.StatusBarProvider = StatusBarProvider;
//# sourceMappingURL=statusBarProvider.js.map