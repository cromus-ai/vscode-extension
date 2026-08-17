import * as vscode from "vscode";
import { lookupModel } from "./cromusClient";

// Match `model: provider:model-name` or `model: provider:model-name` in YAML
const MODEL_RE = /\bmodel\s*:\s*([a-z0-9_-]+:[a-z0-9._-]+)/i;

export class HoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | null> {
    const line = document.lineAt(position).text;
    const match = MODEL_RE.exec(line);
    if (!match) return null;

    const modelKey = match[1];
    // Check cursor is within the model key span
    const keyStart = line.indexOf(modelKey, match.index);
    const keyEnd = keyStart + modelKey.length;
    if (position.character < keyStart || position.character > keyEnd) return null;

    try {
      const info = await lookupModel(modelKey);
      if (!info) return null;

      const lines: string[] = [`**${modelKey}**`];

      if (info.name) lines.push(`*${info.name}*`);
      if (info.provider) lines.push(`Provider: ${info.provider}`);

      const inputPrice = info.inputPricePer1mTokens ?? info.input_price_per_1m_tokens;
      const outputPrice = info.outputPricePer1mTokens ?? info.output_price_per_1m_tokens;
      if (inputPrice !== undefined && outputPrice !== undefined) {
        lines.push(`Input: $${Number(inputPrice).toFixed(2)}/1M tokens`);
        lines.push(`Output: $${Number(outputPrice).toFixed(2)}/1M tokens`);
      }

      if (info.contextWindow) lines.push(`Context: ${Number(info.contextWindow).toLocaleString()} tokens`);
      if (info.isActive === false || info.status === "retired" || info.status === "deprecated") {
        lines.push("⚠️ This model is no longer active");
      }
      if (info.successorModelKey) lines.push(`Successor: \`${info.successorModelKey}\``);

      const md = new vscode.MarkdownString(lines.join("\n\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    } catch {
      return null;
    }
  }
}
