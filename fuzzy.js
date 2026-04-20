// fuzzy.js — fzf-style fuzzy search

/**
 * Score a candidate string against a query.
 * Returns null if no match, otherwise a numeric score (higher = better).
 *
 * Scoring rewards:
 *  - Consecutive character matches
 *  - Matches at word boundaries (after space, slash, dash, start)
 *  - Earlier position in string
 *  - Exact substring match bonus
 */
function fuzzyScore(candidate, query) {
  if (!query) return { score: 0, indices: [] };

  const cLower = candidate.toLowerCase();
  const qLower = query.toLowerCase();

  // Fast exact-contains check
  const exactIdx = cLower.indexOf(qLower);
  if (exactIdx !== -1) {
    const indices = [];
    for (let i = 0; i < qLower.length; i++) indices.push(exactIdx + i);
    return {
      score: 1000 + (candidate.length - exactIdx) + qLower.length * 10,
      indices,
    };
  }

  // Fuzzy match
  let qi = 0;
  let score = 0;
  let consecutive = 0;
  let firstMatchIdx = -1;
  const indices = [];

  for (let ci = 0; ci < cLower.length && qi < qLower.length; ci++) {
    if (cLower[ci] === qLower[qi]) {
      if (firstMatchIdx === -1) firstMatchIdx = ci;
      indices.push(ci);

      // Consecutive bonus
      consecutive++;
      score += consecutive * 8;

      // Word boundary bonus
      if (ci === 0 || /[\s/\-_.]/.test(cLower[ci - 1])) {
        score += 15;
      }

      // Earlier position bonus
      score += Math.max(0, 20 - ci);

      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < qLower.length) return null; // didn't match all query chars

  return { score, indices };
}

/**
 * Search folders by their pathStr using fuzzy scoring.
 * Returns sorted array of { folder, score, indices } objects.
 */
function fuzzySearch(folders, query) {
  if (!query.trim()) {
    return folders.map(f => ({ folder: f, score: 0, indices: [] }));
  }

  const results = [];
  for (const folder of folders) {
    const result = fuzzyScore(folder.pathStr, query);
    if (result !== null) {
      results.push({ folder, score: result.score, indices: result.indices });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Highlight matched characters in a string using <mark> spans.
 */
function highlightMatch(text, indices) {
  if (!indices || indices.length === 0) return escapeHtml(text);

  const indexSet = new Set(indices);
  let result = "";
  let inMark = false;

  for (let i = 0; i < text.length; i++) {
    const ch = escapeHtml(text[i]);
    if (indexSet.has(i)) {
      if (!inMark) { result += '<mark>'; inMark = true; }
      result += ch;
    } else {
      if (inMark) { result += '</mark>'; inMark = false; }
      result += ch;
    }
  }
  if (inMark) result += '</mark>';
  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Export for use in palette.js (loaded as classic script in extension page)
window.fuzzySearch = fuzzySearch;
window.highlightMatch = highlightMatch;
