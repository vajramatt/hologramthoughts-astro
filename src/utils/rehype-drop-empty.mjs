// Drop paragraphs that contain only whitespace / non-breaking spaces.
// WordPress exports left many `&nbsp;` spacer paragraphs that render as gaps.
const BLANK = /^[\s ​]*$/;

function isBlank(node) {
  if (node.type === 'text') return BLANK.test(node.value);
  if (node.type === 'element' && node.tagName === 'br') return true;
  if (node.type === 'element' && node.tagName === 'p') return (node.children ?? []).every(isBlank);
  return false;
}

export function rehypeDropEmptyParagraphs() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.filter((c) => !(c.type === 'element' && c.tagName === 'p' && isBlank(c)));
      node.children.forEach(walk);
    };
    walk(tree);
  };
}
