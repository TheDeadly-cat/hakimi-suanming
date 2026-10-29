const NO_ANNUAL_RELATIONSHIP_OBSTACLE = "尚无可单列的年度关系阻碍；其他领域的总体助阻不直接当作关系结果。";

/** Presentation only: keep the known no-conclusion marker verbatim as scope.
 * Other wording, including negative statements, remains an ordinary obstacle.
 * The original domain and its stored/exported arrays are never changed. */
export function splitAnnualDomainObstacles(items: readonly string[] = []): { obstacles: string[]; readingScope: string[] } {
  return {
    obstacles: items.filter((item) => item !== NO_ANNUAL_RELATIONSHIP_OBSTACLE),
    readingScope: items.filter((item) => item === NO_ANNUAL_RELATIONSHIP_OBSTACLE)
  };
}
