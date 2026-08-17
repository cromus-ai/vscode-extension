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
exports.HoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const cromusClient_1 = require("./cromusClient");
// Match `model: provider:model-name` or `model: provider:model-name` in YAML
const MODEL_RE = /\bmodel\s*:\s*([a-z0-9_-]+:[a-z0-9._-]+)/i;
class HoverProvider {
    async provideHover(document, position) {
        const line = document.lineAt(position).text;
        const match = MODEL_RE.exec(line);
        if (!match)
            return null;
        const modelKey = match[1];
        // Check cursor is within the model key span
        const keyStart = line.indexOf(modelKey, match.index);
        const keyEnd = keyStart + modelKey.length;
        if (position.character < keyStart || position.character > keyEnd)
            return null;
        try {
            const info = await (0, cromusClient_1.lookupModel)(modelKey);
            if (!info)
                return null;
            const lines = [`**${modelKey}**`];
            if (info.name)
                lines.push(`*${info.name}*`);
            if (info.provider)
                lines.push(`Provider: ${info.provider}`);
            const inputPrice = info.inputPricePer1mTokens ?? info.input_price_per_1m_tokens;
            const outputPrice = info.outputPricePer1mTokens ?? info.output_price_per_1m_tokens;
            if (inputPrice !== undefined && outputPrice !== undefined) {
                lines.push(`Input: $${Number(inputPrice).toFixed(2)}/1M tokens`);
                lines.push(`Output: $${Number(outputPrice).toFixed(2)}/1M tokens`);
            }
            if (info.contextWindow)
                lines.push(`Context: ${Number(info.contextWindow).toLocaleString()} tokens`);
            if (info.isActive === false || info.status === "retired" || info.status === "deprecated") {
                lines.push("⚠️ This model is no longer active");
            }
            if (info.successorModelKey)
                lines.push(`Successor: \`${info.successorModelKey}\``);
            const md = new vscode.MarkdownString(lines.join("\n\n"));
            md.isTrusted = true;
            return new vscode.Hover(md);
        }
        catch {
            return null;
        }
    }
}
exports.HoverProvider = HoverProvider;
//# sourceMappingURL=hoverProvider.js.map