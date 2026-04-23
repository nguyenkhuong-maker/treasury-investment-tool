const CONFIG = (() => {
  const props = PropertiesService.getScriptProperties();
  return {
    makerEmail: props.getProperty('MAKER_EMAIL') || 'nguyen.khuong@atherlabs.com',
    cfoEmail: props.getProperty('CFO_EMAIL') || 'kdhn1911@gmail.com',
    dashboardBaseUrl: props.getProperty('DASHBOARD_BASE_URL') || 'https://nguyenkhuong-maker.github.io/treasury-investment-tool/',
    githubOwner: props.getProperty('GITHUB_OWNER') || 'nguyenkhuong-maker',
    githubRepo: props.getProperty('GITHUB_REPO') || 'treasury-investment-tool',
    githubBranch: props.getProperty('GITHUB_BRANCH') || 'main',
    githubToken: props.getProperty('GITHUB_TOKEN') || '',
    approvalDataPrefix: props.getProperty('APPROVAL_DATA_PREFIX') || 'treasury-master-dashboard/data/monthly-plans/approvals'
  };
})();

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : '';
  const action = e && e.parameter ? e.parameter.action : '';
  if (!token || !action) {
    return HtmlService.createHtmlOutput('<h3>Thiếu token hoặc action.</h3>');
  }

  try {
    const result = handleReviewAction(token, action);
    return HtmlService.createHtmlOutput(buildResultHtml(result));
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h3>Lỗi xử lý review</h3><pre>${escapeHtml(String(error))}</pre>`);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const result = submitPlanToCfo(payload);
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function submitPlanToCfo(plan) {
  validatePlanPayload(plan);

  const tokenBase = Utilities.getUuid();
  const tokenApprove = `${tokenBase}-approve`;
  const tokenRevise = `${tokenBase}-revise`;
  const now = new Date().toISOString();
  const record = {
    planId: plan.planId,
    month: plan.month,
    planType: plan.planType,
    title: plan.title,
    version: plan.version,
    contentHash: plan.contentHash,
    planUrl: plan.planUrl,
    makerEmail: CONFIG.makerEmail,
    approverEmail: CONFIG.cfoEmail,
    submittedAt: now,
    status: 'pending_cfo_review',
    tokens: {
      approve: tokenApprove,
      revise: tokenRevise
    }
  };

  const store = PropertiesService.getScriptProperties();
  store.setProperty(`approval_record::${tokenApprove}`, JSON.stringify(record));
  store.setProperty(`approval_record::${tokenRevise}`, JSON.stringify(record));

  const approveUrl = buildActionUrl(tokenApprove, 'approve');
  const reviseUrl = buildActionUrl(tokenRevise, 'revise');

  const planTypeLabel = plan.planType === 'company'
    ? 'VIHALI'
    : plan.planType === 'personal'
      ? 'CÁ NHÂN'
      : plan.planType;
  const subject = `[Treasury] Trình CFO phê duyệt kế hoạch ${plan.month} - ${planTypeLabel}`;
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Trình CFO phê duyệt kế hoạch</h2>
      <p><strong>Người trình:</strong> ${CONFIG.makerEmail}</p>
      <p><strong>Kế hoạch:</strong> ${escapeHtml(plan.title)}</p>
      <p><strong>Tháng:</strong> ${escapeHtml(plan.month)}</p>
      <p><strong>Version:</strong> ${escapeHtml(plan.version)}</p>
      <p><strong>Link xem kế hoạch:</strong><br/><a href="${plan.planUrl}">${plan.planUrl}</a></p>
      <p>
        <a href="${reviseUrl}" style="display:inline-block;padding:10px 14px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">Cần điều chỉnh</a>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 14px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px">Duyệt kế hoạch</a>
      </p>
      <p style="color:#64748b;font-size:12px">Mail này được gửi từ Google Apps Script do ${CONFIG.makerEmail} deploy.</p>
    </div>
  `;

  GmailApp.sendEmail(CONFIG.cfoEmail, subject, `Mở mail HTML để review kế hoạch. Plan: ${plan.planUrl}`, {
    htmlBody,
    name: 'Treasury Approval',
    replyTo: CONFIG.makerEmail
  });

  upsertGitHubApproval({
    planId: plan.planId,
    month: plan.month,
    planType: plan.planType,
    makerEmail: CONFIG.makerEmail,
    approverEmail: CONFIG.cfoEmail,
    version: plan.version,
    contentHash: plan.contentHash,
    status: 'pending_cfo_review',
    submittedAt: now,
    channel: 'google_apps_script_mail'
  });

  return {
    submittedAt: now,
    to: CONFIG.cfoEmail,
    from: Session.getActiveUser().getEmail() || CONFIG.makerEmail,
    approveUrl,
    reviseUrl
  };
}

function handleReviewAction(token, action) {
  const store = PropertiesService.getScriptProperties();
  const raw = store.getProperty(`approval_record::${token}`);
  if (!raw) throw new Error('Không tìm thấy approval token hợp lệ.');
  const record = JSON.parse(raw);
  const now = new Date().toISOString();

  let status = 'pending_cfo_review';
  if (action === 'approve') status = 'approved';
  if (action === 'revise') status = 'revision_requested';
  if (!['approved', 'revision_requested'].includes(status)) {
    throw new Error('Action không hợp lệ.');
  }

  const approvalPayload = {
    planId: record.planId,
    month: record.month,
    planType: record.planType,
    makerEmail: record.makerEmail,
    approverEmail: record.approverEmail,
    version: record.version,
    contentHash: record.contentHash,
    status,
    channel: 'google_apps_script_mail',
    reviewedAt: now
  };

  if (status === 'approved') {
    approvalPayload.approvedBy = record.approverEmail;
    approvalPayload.approvedAt = now;
  }

  upsertGitHubApproval(approvalPayload);
  return approvalPayload;
}

function upsertGitHubApproval(payload) {
  if (!CONFIG.githubToken) {
    throw new Error('Thiếu GITHUB_TOKEN trong Script Properties.');
  }
  const path = `${CONFIG.approvalDataPrefix}/${payload.planId}.json`;
  const url = `https://api.github.com/repos/${CONFIG.githubOwner}/${CONFIG.githubRepo}/contents/${encodeURIComponent(path)}`;

  let sha = null;
  const getRes = UrlFetchApp.fetch(url + `?ref=${CONFIG.githubBranch}`, {
    method: 'get',
    headers: { Authorization: `Bearer ${CONFIG.githubToken}`, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 200) {
    const existing = JSON.parse(getRes.getContentText());
    sha = existing.sha;
  }

  const body = {
    message: `Update approval status for ${payload.planId}`,
    content: Utilities.base64Encode(JSON.stringify(payload, null, 2)),
    branch: CONFIG.githubBranch
  };
  if (sha) body.sha = sha;

  const putRes = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.githubToken}`, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  if (putRes.getResponseCode() >= 300) {
    throw new Error(`GitHub update failed: ${putRes.getResponseCode()} ${putRes.getContentText()}`);
  }

  return JSON.parse(putRes.getContentText());
}

function validatePlanPayload(plan) {
  ['planId', 'month', 'planType', 'title', 'version', 'contentHash', 'planUrl'].forEach((key) => {
    if (!plan[key]) throw new Error(`Thiếu field bắt buộc: ${key}`);
  });
}

function buildActionUrl(token, action) {
  const base = ScriptApp.getService().getUrl();
  return `${base}?token=${encodeURIComponent(token)}&action=${encodeURIComponent(action)}`;
}

function buildResultHtml(result) {
  const label = result.status === 'approved' ? 'CFO đã duyệt kế hoạch' : 'CFO yêu cầu điều chỉnh kế hoạch';
  return `
    <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6">
      <h2>${label}</h2>
      <p><strong>Plan:</strong> ${escapeHtml(result.planId)}</p>
      <p><strong>Approver:</strong> ${escapeHtml(result.approverEmail)}</p>
      <p><strong>Trạng thái mới:</strong> ${escapeHtml(result.status)}</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(result.reviewedAt || result.approvedAt || '')}</p>
      <p>Anh có thể quay lại dashboard để xem trạng thái mới sau khi GitHub Pages cập nhật.</p>
    </div>
  `;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
