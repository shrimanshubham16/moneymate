export function hapticLight(element?: HTMLElement | null) {
  if ('vibrate' in navigator) navigator.vibrate(10);
  if (element) triggerBounce(element);
}
export function hapticMedium(element?: HTMLElement | null) {
  if ('vibrate' in navigator) navigator.vibrate(25);
  if (element) triggerBounce(element);
}
export function hapticSuccess(element?: HTMLElement | null) {
  if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
  if (element) triggerBounce(element);
}
export function hapticError(element?: HTMLElement | null) {
  if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  if (element) triggerShake(element);
}

function triggerBounce(el: HTMLElement) {
  el.style.transition = 'transform 0.15s ease';
  el.style.transform = 'scale(0.95)';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 150);
  }, 80);
}

function triggerShake(el: HTMLElement) {
  el.style.transition = 'transform 0.1s ease';
  el.style.transform = 'translateX(-4px)';
  setTimeout(() => { el.style.transform = 'translateX(4px)'; }, 80);
  setTimeout(() => { el.style.transform = 'translateX(-2px)'; }, 160);
  setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 240);
}
