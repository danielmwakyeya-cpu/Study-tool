/**
 * Weighted running grade.
 * A marked assignment contributes (mark / markOutOf) * weighting toward 100.
 * "So far" is that contribution divided by the weight of marked work only.
 */

export function weightedGrade(assignments) {
  const rows = (assignments || []).filter((a) => !a.deleted);
  const graded = rows.filter((a) =>
    a.status === "graded" &&
    Number.isFinite(Number(a.mark)) &&
    Number.isFinite(Number(a.markOutOf)) &&
    Number(a.markOutOf) > 0 &&
    Number.isFinite(Number(a.weighting)) &&
    Number(a.weighting) > 0
  );
  const weightCounted = graded.reduce((sum, a) => sum + Number(a.weighting), 0);
  const earned = graded.reduce((sum, a) => sum + (Number(a.mark) / Number(a.markOutOf)) * Number(a.weighting), 0);
  const totalWeight = rows.reduce((sum, a) => sum + (Number(a.weighting) > 0 ? Number(a.weighting) : 0), 0);
  return {
    earned,
    weightCounted,
    totalWeight,
    soFar: weightCounted > 0 ? (earned / weightCounted) * 100 : null
  };
}
