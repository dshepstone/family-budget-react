export function getStatusAmount(expense) {
  const proj = parseFloat(expense?.projected) || 0;
  const act = parseFloat(expense?.actual) || 0;
  const mode = expense?.transferStatus || 'none';

  if (mode === 'actual') return act;
  if (mode === 'full') return proj;
  if (mode === 'half') return proj * 0.5;
  if (mode === 'quarter') return proj * 0.25;
  return 0;
}
