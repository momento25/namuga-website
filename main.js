// Mobile nav toggle
document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const menu = document.getElementById('nav-mobile');
    if (!menu) return;
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
    menu.hidden = open;
  });
});

// Launch notify form
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setStatus(el, message, isError) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
}

function showSuccess(form) {
  const container = form.parentElement;
  if (!container) return;
  const success = document.createElement('div');
  success.className = 'notify-success';
  success.innerHTML = '🌸 감사합니다<p>서비스가 준비되면 가장 먼저 알려드릴게요.</p>';
  container.replaceChild(success, form);
}

document.querySelectorAll('[data-notify-form]').forEach((form) => {
  const status = form.querySelector('[data-notify-status]');
  const submit = form.querySelector('[data-notify-submit]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (form.email.value || '').trim();
    const consent = form.consent.checked;

    if (!EMAIL_RE.test(email)) {
      setStatus(status, '이메일 형식을 확인해 주세요.', true);
      return;
    }
    if (!consent) {
      setStatus(status, '수신 동의에 체크해 주세요.', true);
      return;
    }

    setStatus(status, '', false);
    submit.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = '신청 중...';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      });

      if (res.ok) {
        if (window.posthog) window.posthog.capture('notify_signup', { status: 'success' });
        showSuccess(form);
        return;
      }
      if (res.status === 409) {
        if (window.posthog) window.posthog.capture('notify_signup', { status: 'duplicate' });
        setStatus(status, '이미 신청해 주셨어요. 준비되면 알려드릴게요.', true);
      } else if (res.status === 400) {
        setStatus(status, '이메일 형식을 확인해 주세요.', true);
      } else {
        setStatus(status, '잠시 후 다시 시도해 주세요.', true);
      }
    } catch (_err) {
      setStatus(status, '잠시 후 다시 시도해 주세요.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
});
