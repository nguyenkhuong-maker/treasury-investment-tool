const CONFIG = (() => {
  const props = PropertiesService.getScriptProperties();
  return {
    makerEmail: props.getProperty('MAKER_EMAIL') || 'nguyen.khuong@atherlabs.com',
    cfoEmail: props.getProperty('CFO_EMAIL') || 'duc.ho@atherlabs.com',
    dashboardBaseUrl: props.getProperty('DASHBOARD_BASE_URL') || 'https://nguyenkhuong-maker.github.io/treasury-investment-tool/',
    githubOwner: props.getProperty('GITHUB_OWNER') || 'nguyenkhuong-maker',
    githubRepo: props.getProperty('GITHUB_REPO') || 'treasury-investment-tool',
    githubBranch: props.getProperty('GITHUB_BRANCH') || 'main',
    githubToken: props.getProperty('GITHUB_TOKEN') || '',
    approvalDataPrefix: props.getProperty('APPROVAL_DATA_PREFIX') || 'data/monthly-plans/approvals',
    slackBotToken: props.getProperty('SLACK_BOT_TOKEN') || '',
    slackApprovalChannelId: props.getProperty('SLACK_APPROVAL_CHANNEL_ID') || 'C0AT2E4CBDX',
    slackApprovalChannelName: props.getProperty('SLACK_APPROVAL_CHANNEL_NAME') || '#treasury-management',
    slackBotUsername: props.getProperty('SLACK_BOT_USERNAME') || 'vesper_treasury',
    slackCfoUserId: props.getProperty('SLACK_CFO_USER_ID') || ''
  };
})();

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : '';
  const action = e && e.parameter ? e.parameter.action : '';
  if (!token || !action) {
    return HtmlService.createHtmlOutput('<h3>Thiếu token hoặc action.</h3>');
  }

  try {
    const record = loadApprovalRecord(token);
    const result = applyReviewAction(record, action, { source: 'web_link' });
    return HtmlService.createHtmlOutput(buildResultHtml(result));
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h3>Lỗi xử lý review</h3><pre>${escapeHtml(String(error))}</pre>`);
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData ? (e.postData.contents || '') : '';
    const type = e && e.postData ? (e.postData.type || '') : '';

    if (type.indexOf('application/x-www-form-urlencoded') !== -1 && raw.indexOf('payload=') === 0) {
      const payload = JSON.parse(decodeURIComponent(raw.substring('payload='.length)));
      return handleSlackInteraction(payload);
    }

    const payload = JSON.parse(raw || '{}');
    const reviewChannel = payload.reviewChannel || payload.channel || 'mail';
    const result = reviewChannel === 'slack'
      ? submitPlanToSlack(payload)
      : submitPlanToCfo(payload);
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function submitPlanToCfo(plan) {
  validatePlanPayload(plan);
  const record = createApprovalRecord(plan, 'google_apps_script_mail');
  storeApprovalRecord(record);

  const approveUrl = buildActionUrl(record.tokens.approve, 'approve');
  const reviseUrl = buildActionUrl(record.tokens.revise, 'revise');
  const subject = `[Treasury] Trình CFO phê duyệt kế hoạch ${plan.month} - ${record.planTypeLabel}`;
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Trình CFO phê duyệt kế hoạch</h2>
      <p><strong>Người trình:</strong> ${CONFIG.makerEmail}</p>
      <p><strong>Kế hoạch:</strong> ${escapeHtml(plan.title)}</p>
      <p><strong>Tháng:</strong> ${escapeHtml(plan.month)}</p>
      <p><strong>Version:</strong> ${escapeHtml(plan.version)}</p>
      <p><strong>Link xem kế hoạch:</strong><br/><a href="${record.indexUrl}">${record.indexUrl}</a></p>
      <p>
        <a href="${reviseUrl}" style="display:inline-block;padding:10px 14px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">Cần điều chỉnh</a>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 14px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px">Duyệt kế hoạch</a>
      </p>
      <p style="color:#64748b;font-size:12px">Mail này được gửi từ Google Apps Script do ${CONFIG.makerEmail} deploy.</p>
    </div>
  `;

  GmailApp.sendEmail(CONFIG.cfoEmail, subject, `Mở mail HTML để review kế hoạch. Plan: ${record.indexUrl}`, {
    htmlBody,
    name: 'Treasury Approval',
    replyTo: CONFIG.makerEmail
  });

  upsertGitHubApproval(buildPendingApprovalPayload(record));

  return {
    submittedAt: record.submittedAt,
    to: CONFIG.cfoEmail,
    from: Session.getActiveUser().getEmail() || CONFIG.makerEmail,
    approveUrl,
    reviseUrl,
    channel: 'google_apps_script_mail'
  };
}

function submitPlanToSlack(plan) {
  validatePlanPayload(plan);
  if (!CONFIG.slackBotToken) {
    throw new Error('Thiếu SLACK_BOT_TOKEN trong Script Properties.');
  }
  const record = createApprovalRecord(plan, 'slack_interactive');
  storeApprovalRecord(record);

  const postResult = postSlackApprovalMessage(record);
  record.slackChannelId = postResult.channel || CONFIG.slackApprovalChannelId;
  record.slackChannelName = plan.slackChannelName || CONFIG.slackApprovalChannelName;
  record.slackMessageTs = postResult.ts;
  storeApprovalRecord(record);

  upsertGitHubApproval(buildPendingApprovalPayload(record));

  return {
    submittedAt: record.submittedAt,
    channel: 'slack_interactive',
    slackChannelId: record.slackChannelId,
    slackChannelName: record.slackChannelName,
    slackMessageTs: record.slackMessageTs
  };
}

function handleSlackInteraction(payload) {
  const action = payload && payload.actions && payload.actions[0] ? payload.actions[0] : null;
  if (!action || !action.value) {
    return jsonResponse({ ok: false, error: 'Thiếu action Slack hợp lệ.' });
  }

  const record = loadApprovalRecord(action.value);
  const slackUserId = payload && payload.user ? payload.user.id : '';
  const slackUserName = payload && payload.user ? (payload.user.username || payload.user.name || payload.user.id) : '';

  if (!CONFIG.slackCfoUserId || slackUserId !== CONFIG.slackCfoUserId) {
    postSlackEphemeral({
      channel: payload.channel.id,
      user: slackUserId,
      text: 'Anh/chị không có quyền duyệt kế hoạch này trên Slack.'
    });
    return jsonResponse({ ok: true, denied: true });
  }

  const reviewAction = action.action_id === 'approve_plan' ? 'approve' : 'revise';
  const result = applyReviewAction(record, reviewAction, {
    source: 'slack_interactive',
    reviewedBySlackUserId: slackUserId,
    reviewedBySlackUserName: slackUserName
  });

  updateSlackApprovalMessage(payload, record, result);
  postSlackEphemeral({
    channel: payload.channel.id,
    user: slackUserId,
    text: reviewAction === 'approve'
      ? `Đã duyệt ${record.title}.`
      : `Đã đánh dấu cần điều chỉnh cho ${record.title}.`
  });

  return jsonResponse({ ok: true, result });
}

function createApprovalRecord(plan, channel) {
  const tokenBase = Utilities.getUuid();
  const planTypeLabel = plan.planType === 'company'
    ? 'VIHALI'
    : plan.planType === 'personal'
      ? 'CÁ NHÂN'
      : plan.planType;

  return {
    planId: plan.planId,
    month: plan.month,
    planType: plan.planType,
    planTypeLabel,
    title: plan.title,
    version: plan.version,
    contentHash: plan.contentHash,
    planUrl: plan.planUrl,
    indexUrl: plan.indexUrl || `${CONFIG.dashboardBaseUrl.replace(/\/$/, '')}/monthly-plans-live.html`,
    makerEmail: CONFIG.makerEmail,
    approverEmail: CONFIG.cfoEmail,
    submittedAt: new Date().toISOString(),
    status: 'pending_cfo_review',
    channel,
    slackChannelId: plan.slackChannelId || CONFIG.slackApprovalChannelId,
    slackChannelName: plan.slackChannelName || CONFIG.slackApprovalChannelName,
    tokens: {
      approve: `${tokenBase}-approve`,
      revise: `${tokenBase}-revise`
    }
  };
}

function storeApprovalRecord(record) {
  const store = PropertiesService.getScriptProperties();
  store.setProperty(`approval_record::${record.tokens.approve}`, JSON.stringify(record));
  store.setProperty(`approval_record::${record.tokens.revise}`, JSON.stringify(record));
}

function loadApprovalRecord(token) {
  const store = PropertiesService.getScriptProperties();
  const raw = store.getProperty(`approval_record::${token}`);
  if (!raw) throw new Error('Không tìm thấy approval token hợp lệ.');
  return JSON.parse(raw);
}

function buildPendingApprovalPayload(record) {
  return {
    planId: record.planId,
    month: record.month,
    planType: record.planType,
    planTypeLabel: record.planTypeLabel,
    makerEmail: record.makerEmail,
    approverEmail: record.approverEmail,
    version: record.version,
    contentHash: record.contentHash,
    status: 'pending_cfo_review',
    channel: record.channel,
    submittedAt: record.submittedAt,
    title: record.title,
    planUrl: record.planUrl,
    indexUrl: record.indexUrl,
    slackChannelId: record.slackChannelId || null,
    slackChannelName: record.slackChannelName || null,
    slackMessageTs: record.slackMessageTs || null
  };
}

function applyReviewAction(record, action, options) {
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
    planTypeLabel: record.planTypeLabel,
    makerEmail: record.makerEmail,
    approverEmail: record.approverEmail,
    version: record.version,
    contentHash: record.contentHash,
    status,
    channel: options && options.source === 'slack_interactive' ? 'slack_interactive' : record.channel,
    reviewedAt: now,
    title: record.title,
    planUrl: record.planUrl,
    indexUrl: record.indexUrl,
    slackChannelId: record.slackChannelId || null,
    slackChannelName: record.slackChannelName || null,
    slackMessageTs: record.slackMessageTs || null
  };

  if (options && options.reviewedBySlackUserId) {
    approvalPayload.reviewedBySlackUserId = options.reviewedBySlackUserId;
    approvalPayload.reviewedBySlackUserName = options.reviewedBySlackUserName || options.reviewedBySlackUserId;
  }

  if (status === 'approved') {
    approvalPayload.approvedBy = record.approverEmail;
    approvalPayload.approvedByLabel = options && options.reviewedBySlackUserName
      ? `${record.approverEmail} (${options.reviewedBySlackUserName})`
      : record.approverEmail;
    approvalPayload.approvedAt = now;
    if (options && options.reviewedBySlackUserId) {
      approvalPayload.approvedBySlackUserId = options.reviewedBySlackUserId;
      approvalPayload.approvedBySlackUserName = options.reviewedBySlackUserName || options.reviewedBySlackUserId;
    }
  }

  upsertGitHubApproval(approvalPayload);
  return approvalPayload;
}

function postSlackApprovalMessage(record) {
  const result = slackApi('chat.postMessage', {
    channel: record.slackChannelId || CONFIG.slackApprovalChannelId,
    text: `Kế hoạch ${record.month} đã chuẩn bị: ${record.title}`,
    blocks: buildSlackApprovalBlocks(record)
  });

  if (!result.ok) {
    throw new Error(`Slack post failed: ${result.error || 'unknown_error'}`);
  }
  return result;
}

function updateSlackApprovalMessage(interactionPayload, record, result) {
  const channel = interactionPayload && interactionPayload.channel ? interactionPayload.channel.id : (record.slackChannelId || CONFIG.slackApprovalChannelId);
  const ts = interactionPayload && interactionPayload.container ? interactionPayload.container.message_ts : record.slackMessageTs;
  if (!channel || !ts) return;

  const statusText = result.status === 'approved'
    ? `✅ Đã duyệt bởi ${escapeSlackText(result.approvedByLabel || result.approvedBy || result.approverEmail)}`
    : `⚠️ CFO yêu cầu điều chỉnh`;
  const summaryText = `*Kế hoạch ngân quỹ tháng ${record.month} đã chuẩn bị*\n- Plan: *${escapeSlackText(record.title)}*\n- Version: *${escapeSlackText(record.version)}*\n- Trạng thái: *${statusText}*\n- Xem live: ${record.indexUrl}`;

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: summaryText }
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Người trình: ${record.makerEmail} · Cập nhật: ${formatIsoForSlack(result.reviewedAt || result.approvedAt)}` }
      ]
    }
  ];

  const update = slackApi('chat.update', {
    channel,
    ts,
    text: `Trạng thái mới: ${result.status}`,
    blocks
  });

  if (!update.ok) {
    throw new Error(`Slack update failed: ${update.error || 'unknown_error'}`);
  }
}

function postSlackEphemeral(payload) {
  if (!CONFIG.slackBotToken) return;
  const result = slackApi('chat.postEphemeral', payload);
  return result;
}

function buildSlackApprovalBlocks(record) {
  const intro = `*Kế hoạch ngân quỹ tháng ${record.month} đã chuẩn bị*\n- Plan: *${escapeSlackText(record.title)}*\n- Version: *${escapeSlackText(record.version)}*\n- Trạng thái: *Sẵn sàng trình CFO*\n- Xem live: ${record.indexUrl}`;
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: intro }
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Bot: ${CONFIG.slackBotUsername} · Channel: ${record.slackChannelName} · Chỉ CFO hợp lệ mới bấm được nút.` }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Duyệt kế hoạch' },
          style: 'primary',
          action_id: 'approve_plan',
          value: record.tokens.approve
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Cần điều chỉnh' },
          style: 'danger',
          action_id: 'revise_plan',
          value: record.tokens.revise
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mở index live' },
          url: record.indexUrl,
          action_id: 'open_index_live'
        }
      ]
    }
  ];
}

function slackApi(method, payload) {
  const url = `https://slack.com/api/${method}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Authorization: `Bearer ${CONFIG.slackBotToken}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const text = res.getContentText();
  const data = text ? JSON.parse(text) : {};
  if (res.getResponseCode() >= 300) {
    throw new Error(`Slack API ${method} failed: ${res.getResponseCode()} ${text}`);
  }
  return data;
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
      <p><strong>Approver:</strong> ${escapeHtml(result.approvedByLabel || result.approverEmail)}</p>
      <p><strong>Trạng thái mới:</strong> ${escapeHtml(result.status)}</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(result.reviewedAt || result.approvedAt || '')}</p>
      <p>Anh có thể quay lại dashboard để xem trạng thái mới sau khi GitHub Pages cập nhật.</p>
    </div>
  `;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatIsoForSlack(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' GMT+7';
}

function escapeSlackText(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
