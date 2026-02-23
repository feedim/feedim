// Feedim - Basit toast utility (feedimAlert sistemi kurulana kadar geçici)
// react-hot-toast yerine kullanılır

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  duration?: number;
}

function showToast(message: string, type: ToastType, options?: ToastOptions) {
  const duration = options?.duration || (type === 'error' ? 4000 : 3000);

  // Remove existing toast
  const existing = document.getElementById('fdm-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'fdm-toast';
  toast.setAttribute('role', 'alert');

  const bgColor = type === 'success'
    ? 'var(--success-color)'
    : type === 'error'
    ? 'var(--error-color)'
    : 'var(--info-color)';

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: ${bgColor};
    color: #fff;
    padding: 12px 24px;
    border-radius: 27px;
    font-size: 14px;
    font-weight: 600;
    z-index: 2147483647;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    max-width: 90vw;
    text-align: center;
    font-family: 'Inter', -apple-system, sans-serif;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
};

export default toast;
