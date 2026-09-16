import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Render trusted, authored Markdown (room and task bodies) to HTML.
 * Content is authored in-repo and reviewed in pull requests, so it is trusted;
 * we still keep rendering server-side and never interpolate user input here.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md ?? '', { async: false }) as string;
}
