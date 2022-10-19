import { addHeaderSizing, decorateBlock, loadBlock } from '../../scripts/scripts.js';

export default async function decorate(block) {
  addHeaderSizing(block);
  const btns = block.querySelector('.button-container');
  if (btns) {
    const readMoreBtn = btns.querySelector('a[title="Read More"], a[title="READ MORE"]');
    // pull 'read more' button out of button container
    if (readMoreBtn) {
      readMoreBtn.classList.add('read-more');
      btns.parentElement.insertBefore(readMoreBtn, btns);
      // if 'read more' is only button, remove button container
      if (!btns.hasChildNodes()) btns.remove();
    }
  }
  if (btns && btns.hasChildNodes()) block.classList.add('hero-buttons');
  const video = block.querySelector('.video');
  if (video) {
    block.classList.add('hero-video');
    video.classList.add(`${video.className}-hero`);
    decorateBlock(video);
    await loadBlock(video);
  }
  const em = block.querySelector('em');
  if (em) {
    const caption = document.createElement('div');
    caption.className = 'section';
    caption.innerHTML = `<p class="hero-caption">
      ${em.innerHTML}
    </p>`;
    em.remove();
    block.parentNode.append(caption);
  }
}
