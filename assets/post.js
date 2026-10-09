const headingLinkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

document.querySelectorAll('h2[id]').forEach((heading) => {
  const link = document.createElement('a');
  link.className = 'heading-anchor';
  link.href = `#${heading.id}`;
  link.setAttribute('aria-label', 'Link to this section');
  link.innerHTML = headingLinkIcon;
  heading.appendChild(link);
});
