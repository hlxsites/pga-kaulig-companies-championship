export default function decorate(block) {
  block.querySelectorAll('img').forEach((img) => {
    img.closest('div').classList.add('columns-contains-image');
  });
  const subtitles = block.querySelectorAll('h2 + p strong');
  if (subtitles) {
    subtitles.forEach((subtitle) => {
      if (subtitle && subtitle.parentNode.textContent === subtitle.textContent) {
        const title = subtitle.parentNode.previousElementSibling;
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'columns-column-title';
        titleWrapper.append(title.cloneNode(true), subtitle.parentNode);
        title.replaceWith(titleWrapper);
      }
    });
  }
}
