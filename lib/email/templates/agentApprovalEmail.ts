export function agentApprovalEmail(name: string) {
  return `
  <div style="font-family: Arial; max-width:600px">

  <h2 style="color:#001F3F;">Epoch Journeys</h2>

  <p>Dear ${name},</p>

  <p>Your agent account has been approved.</p>

  <p>You may now access the B2B portal:</p>

  <p>
  <a href="https://epochjourneys.com/agent-login">
  Agent Portal Login
  </a>
  </p>

  <p>Best regards,<br>
  Epoch Journeys Team</p>

  </div>
  `
}