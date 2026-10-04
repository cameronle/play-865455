// Independent full-coverage Numberlink witness search; never loaded by the browser.
function solve(level, limit = 2000000) {
  const n = level.size,
    total = n * n,
    eps = level.endpoints;
  const neighbors = Array.from({ length: total }, (_, i) =>
    [i - n, i + 1, i + n, i - 1].filter(
      (j) =>
        j >= 0 &&
        j < total &&
        Math.abs(Math.floor(i / n) - Math.floor(j / n)) +
          Math.abs((i % n) - (j % n)) ===
          1,
    ),
  );
  const board = Array(total).fill(-1),
    heads = [],
    targets = [],
    paths = [],
    done = [];
  eps.forEach((ep, k) => {
    heads[k] = ep.start[0] * n + ep.start[1];
    targets[k] = ep.end[0] * n + ep.end[1];
    paths[k] = [heads[k]];
    done[k] = false;
    board[heads[k]] = k;
    board[targets[k]] = k;
  });
  let nodes = 0,
    empty = total - eps.length * 2;
  function viable() {
    const tips = new Set();
    for (let k = 0; k < eps.length; k++)
      if (!done[k]) {
        tips.add(heads[k]);
        tips.add(targets[k]);
        const seen = new Set([heads[k]]),
          q = [heads[k]];
        for (let p = 0; p < q.length; p++)
          for (const j of neighbors[q[p]])
            if (!seen.has(j) && (board[j] === -1 || j === targets[k])) {
              seen.add(j);
              q.push(j);
            }
        if (!seen.has(targets[k])) return false;
      }
    const seen = new Set();
    for (let i = 0; i < total; i++)
      if (board[i] === -1) {
        if (
          neighbors[i].filter((j) => board[j] === -1 || tips.has(j)).length < 2
        )
          return false;
        if (seen.has(i)) continue;
        const q = [i],
          edge = new Set();
        seen.add(i);
        for (let p = 0; p < q.length; p++)
          for (const j of neighbors[q[p]]) {
            if (tips.has(j)) edge.add(j);
            if (board[j] === -1 && !seen.has(j)) {
              seen.add(j);
              q.push(j);
            }
          }
        if (edge.size < 2) return false;
      }
    return true;
  }
  function dfs(left) {
    if (++nodes > limit)
      throw Error("Search budget exceeded, not proof of unsolvability");
    if (!left) return empty === 0;
    if (!viable()) return false;
    let k = -1,
      choices = [];
    for (let a = 0; a < eps.length; a++)
      if (!done[a]) {
        const options = neighbors[heads[a]].filter(
          (j) => board[j] === -1 || j === targets[a],
        );
        if (!options.length) return false;
        if (k < 0 || options.length < choices.length) {
          k = a;
          choices = options;
        }
      }
    for (const j of choices) {
      if (j === targets[k]) {
        done[k] = true;
        paths[k].push(j);
        if (dfs(left - 1)) return true;
        paths[k].pop();
        done[k] = false;
      } else {
        const prev = heads[k];
        heads[k] = j;
        board[j] = k;
        empty--;
        paths[k].push(j);
        if (dfs(left)) return true;
        paths[k].pop();
        empty++;
        board[j] = -1;
        heads[k] = prev;
      }
    }
    return false;
  }
  const success = dfs(eps.length);
  return {
    nodes,
    solution: success
      ? Object.fromEntries(
          eps.map((ep, k) => [
            ep.color,
            paths[k].map((i) => ({ r: Math.floor(i / n), c: i % n })),
          ]),
        )
      : null,
  };
}
module.exports = { solve };
