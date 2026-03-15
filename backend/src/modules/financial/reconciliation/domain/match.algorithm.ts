/**
 * Algoritmo de match automático para conciliação bancária.
 *
 * Busca entries com mesmo valor absoluto e data dentro da janela de ±3 dias.
 * Retorna candidatos ordenados por score (quanto mais próximos, maior o score).
 */

export type StatementEntry = {
  amount: string;
  paymentDate: string;
};

export type EntryCandidate = {
  id: string;
  amount: string;
  dueDate: string;
  description?: string;
};

export type MatchCandidate = EntryCandidate & {
  score: number;
  daysDifference: number;
};

export const MATCH_DATE_WINDOW_DAYS = 3;

export class MatchAlgorithm {
  /**
   * Encontra entries candidatas para um item do extrato.
   *
   * Critérios:
   * 1. Valor absoluto igual (dentro de tolerância de 1 centavo)
   * 2. Data de vencimento dentro de ±3 dias da data do pagamento no extrato
   *
   * Score: 100 - (daysDifference * 10) — mais próximo = maior score.
   */
  findCandidates(
    statement: StatementEntry,
    entries: EntryCandidate[],
  ): MatchCandidate[] {
    const statementAmount = Math.abs(parseFloat(statement.amount));
    const statementDate = new Date(statement.paymentDate);

    const candidates: MatchCandidate[] = [];

    for (const entry of entries) {
      const entryAmount = Math.abs(parseFloat(entry.amount));
      const amountDiff = Math.abs(statementAmount - entryAmount);

      // Tolerância de 1 centavo para diferenças de arredondamento
      if (amountDiff > 0.01) {
        continue;
      }

      const entryDate = new Date(entry.dueDate);
      const daysDifference = Math.round(
        (statementDate.getTime() - entryDate.getTime()) / 86_400_000,
      );

      if (Math.abs(daysDifference) > MATCH_DATE_WINDOW_DAYS) {
        continue;
      }

      const score = Math.max(0, 100 - Math.abs(daysDifference) * 10);
      candidates.push({ ...entry, score, daysDifference });
    }

    // Ordenar: maior score primeiro, em caso de empate, menor diferença de dias
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.abs(a.daysDifference) - Math.abs(b.daysDifference);
    });

    return candidates;
  }

  /**
   * Retorna o melhor candidato (maior score) ou null se não houver correspondência.
   */
  bestMatch(
    statement: StatementEntry,
    entries: EntryCandidate[],
  ): MatchCandidate | null {
    const candidates = this.findCandidates(statement, entries);
    return candidates[0] ?? null;
  }
}
