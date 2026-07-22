import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

interface QuotaState {
  yearMonth: string; // ex: "2026-07"
  charactersUsed: number;
}

/**
 * Guarda em um json local quantos caracteres ja foram usados no mes
 * corrente, para nunca estourar o free tier do ElevenLabs sem perceber.
 */
export class QuotaTracker {
  constructor(
    private readonly statePath: string,
    private readonly monthlyLimit: number
  ) {
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      throw new Error(
        `Limite mensal de cota invalido: ${monthlyLimit}. Configure ELEVENLABS_MONTHLY_CHAR_LIMIT com um numero finito maior que zero.`
      );
    }
  }

  private currentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private async loadState(): Promise<QuotaState> {
    try {
      const raw = await readFile(this.statePath, "utf-8");
      const state = JSON.parse(raw) as QuotaState;
      if (state.yearMonth !== this.currentYearMonth()) {
        return { yearMonth: this.currentYearMonth(), charactersUsed: 0 };
      }
      return state;
    } catch {
      return { yearMonth: this.currentYearMonth(), charactersUsed: 0 };
    }
  }

  async assertHasBudget(additionalChars: number): Promise<void> {
    const state = await this.loadState();
    if (state.charactersUsed + additionalChars > this.monthlyLimit) {
      throw new Error(
        `Cota mensal do ElevenLabs estourada: ${state.charactersUsed}/${this.monthlyLimit} caracteres ja usados.`
      );
    }
  }

  async recordUsage(chars: number): Promise<void> {
    const state = await this.loadState();
    state.charactersUsed += chars;
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, JSON.stringify(state, null, 2));
  }
}
