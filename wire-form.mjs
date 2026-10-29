// Injects the form-submit interceptor before </body> in the contact pages.
// Reads the HTML, appends the script tag, writes back. Idempotent.
import fs from 'fs';

const pages = ['site/contact/index.html', 'site/contact/3/index.html'];

const script = `
<script id="helinorth-form-handler">
(function () {
  var form = document.getElementById('form_contact-form');
  if (!form || form.dataset.helinorthWired) return;
  form.dataset.helinorthWired = '1';

  // Neutralise Formidable's AJAX (it posts to /wp-admin/admin-ajax.php which is dead here).
  if (window.frm_js) { window.frm_js.ajax_url = '/contact/'; }

  var btn = form.querySelector('button[type="submit"]');
  var note = document.createElement('div');
  note.style.cssText = 'margin-top:12px;padding:12px 16px;border-radius:4px;font-size:15px;display:none;';
  btn && btn.parentNode.insertBefore(note, btn.nextSibling);

  function show(ok, msg) {
    note.style.display = 'block';
    note.style.background = ok ? '#e6f4e6' : '#fdeaea';
    note.style.border = ok ? '1px solid #2e7d32' : '1px solid #c62828';
    note.style.color = ok ? '#2e7d32' : '#c62828';
    note.textContent = msg;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
    show(true, 'Sending your message...');

    var body = new FormData(form);
    fetch('/contact/', { method: 'POST', body: body, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }).then(function (j) { return { status: r.status, json: j }; }); })
      .then(function (res) {
        if (res.ok !== false && res.status === 200 && res.json.ok) {
          form.reset();
          show(true, 'Thanks — your message has been sent. We\\'ll be in touch shortly. Or phone 0800 435 464.');
        } else {
          show(false, (res.json && res.json.error) || 'Sorry, something went wrong. Please phone 0800 435 464.');
        }
      })
      .catch(function () {
        show(false, 'Sorry, the message could not be sent. Please phone 0800 435 464.');
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      });
  }, true);
})();
</script>`;

for (const p of pages) {
  if (!fs.existsSync(p)) { console.log('missing:', p); continue; }
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('helinorth-form-handler')) { console.log('already wired:', p); continue; }
  html = html.replace('</body>', script + '\n</body>');
  fs.writeFileSync(p, html);
  console.log('wired:', p);
}
