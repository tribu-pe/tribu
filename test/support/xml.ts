import { DOMParser, type Element } from '@xmldom/xmldom';

/** Parses XML and fails the test on any parse error: Tribu's output must always be well-formed. */
export function parseXml(xml: string) {
  const errors: string[] = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message);
    },
  }).parseFromString(xml, 'text/xml');
  if (errors.length > 0) throw new Error(`Malformed XML: ${errors.join('; ')}`);
  const root = document.documentElement;
  if (root === null) throw new Error('Empty XML');
  return root;
}

function children(element: Element, name: string): Element[] {
  const found: Element[] = [];
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (node.nodeType === 1 && (node as Element).tagName === name) found.push(node as Element);
  }
  return found;
}

/** Every element at a slash-separated path of qualified names, from the root: 'cac:InvoiceLine/cbc:ID'. */
export function all(root: Element, path: string): Element[] {
  return path
    .split('/')
    .reduce<Element[]>(
      (elements, name) => elements.flatMap((element) => children(element, name)),
      [root],
    );
}

export function one(root: Element, path: string): Element {
  const [element, ...rest] = all(root, path);
  if (element === undefined) throw new Error(`No element at ${path}`);
  if (rest.length > 0) throw new Error(`${rest.length + 1} elements at ${path}`);
  return element;
}

export const text = (root: Element, path: string) => one(root, path).textContent ?? '';
