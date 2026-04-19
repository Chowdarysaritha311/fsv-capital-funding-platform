async function sendConfirmationEmail({ to, startupName, referenceId, dealScore }) {
  console.log(`[Email] Confirmation to ${to} — ${startupName} — Ref: ${referenceId} — Score: ${dealScore}`);
}

async function sendInternalAlert({ startup, dealScore, referenceId }) {
  console.log(`[Email] Internal alert — ${referenceId} — Score: ${dealScore}`);
}

module.exports = { sendConfirmationEmail, sendInternalAlert };