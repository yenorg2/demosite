export default function decorate(block) {
  const image = block.querySelector('img');
  if (image) {
    image.loading = 'lazy';
  }

  const button = block.querySelector('button');
  if (button) {
    button.addEventListener('click', () => {
      alert('Đã thêm vào giỏ hàng!');
    });
  }
}
