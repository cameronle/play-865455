// Independent clue solver: no access to the hidden answer during search.
function lineCandidates(size, clues) {
  if (clues.length === 1 && clues[0] === 0) return [Array(size).fill(0)];
  const result = [];
  function build(i, start, prefix) {
    if (i === clues.length) {
      result.push([...prefix, ...Array(size - prefix.length).fill(0)]);
      return;
    }
    const rest =
      clues.slice(i + 1).reduce((a, b) => a + b, 0) + clues.length - i - 1;
    for (let s = start; s <= size - clues[i] - rest; s++) {
      const next = [
        ...prefix,
        ...Array(s - prefix.length).fill(0),
        ...Array(clues[i]).fill(1),
      ];
      build(i + 1, s + clues[i] + 1, next);
    }
  }
  build(0, 0, []);
  return result;
}
function solutions(puzzle, limit = 2) {
  const n = puzzle.size,
    givens = puzzle.givens || [],
    results = [];
  const rows = puzzle.clues.rows.map((c, r) =>
    lineCandidates(n, c).filter((a) =>
      givens.every((g) => g.r !== r || a[g.c] === g.value),
    ),
  );
  const cols = puzzle.clues.cols.map((c, i) =>
    lineCandidates(n, c).filter((a) =>
      givens.every((g) => g.c !== i || a[g.r] === g.value),
    ),
  );
  function search(rs, cs) {
    if (results.length >= limit) return;
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < n; r++) {
        const keep = rs[r].filter((a) =>
          cs.every((list, c) => list.some((b) => b[r] === a[c])),
        );
        if (!keep.length) return;
        if (keep.length < rs[r].length) {
          rs[r] = keep;
          changed = true;
        }
      }
      for (let c = 0; c < n; c++) {
        const keep = cs[c].filter((b) =>
          rs.every((list, r) => list.some((a) => a[c] === b[r])),
        );
        if (!keep.length) return;
        if (keep.length < cs[c].length) {
          cs[c] = keep;
          changed = true;
        }
      }
    }
    let chosen = -1;
    for (let r = 0; r < n; r++)
      if (rs[r].length > 1 && (chosen < 0 || rs[r].length < rs[chosen].length))
        chosen = r;
    if (chosen < 0) {
      results.push(rs.map((a) => a[0].slice()));
      return;
    }
    for (const candidate of rs[chosen]) {
      const next = rs.slice();
      next[chosen] = [candidate];
      search(next, cs.slice());
      if (results.length >= limit) return;
    }
  }
  search(rows, cols);
  return results;
}
module.exports = { solutions };
