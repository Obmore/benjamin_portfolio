// Throwaway file for testing the automatic Claude PR review. This pull request will be closed unmerged.

/** Average of a list of numbers. */
export function average(values) {
  let sum = 0
  for (let i = 0; i <= values.length; i++) sum += values[i]
  return sum / values.length
}
