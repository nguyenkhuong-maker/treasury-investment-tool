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
    slackCfoUserId: props.getProperty('SLACK_CFO_USER_ID') || '',
    editorCode: props.getProperty('EDITOR_CODE') || '1993',
    planInputsPrefix: props.getProperty('PLAN_INPUTS_PREFIX') || 'data/monthly-plans/inputs',
    contractLinksPath: props.getProperty('CONTRACT_LINKS_PATH') || 'data/contract-links.json'
  };
})();

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : '';
  const action = e && e.parameter ? e.parameter.action : '';
  if (!token) {
    return HtmlService.createHtmlOutput('<h3>Thiếu token review.</h3>');
  }

  try {
    const record = loadApprovalRecord(token);
    if (!action) {
      return HtmlService.createHtmlOutput(buildReviewPageHtml(record));
    }
    // Link Duyệt / Cần điều chỉnh trong mail: mở trang để CFO ghi nội dung phản hồi rồi mới gửi
    assertActionToken(record, token, action);
    return HtmlService.createHtmlOutput(buildFeedbackPageHtml(record, token, action))
      .setTitle('Phản hồi kế hoạch ngân quỹ')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
    if (payload.action === 'savePlanInputs') return jsonResponse({ ok: true, result: savePlanInputs(payload) });
    if (payload.action === 'saveContractLink') return jsonResponse({ ok: true, result: saveContractLink(payload) });
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
      <p style="color:#475569;font-size:13px">Bấm một trong hai nút sẽ mở trang để anh ghi nội dung phản hồi (bắt buộc khi yêu cầu điều chỉnh) trước khi gửi.</p>
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
  const record = createApprovalRecord(plan, 'slack_channel_notice');
  storeApprovalRecord(record);

  const postResult = postSlackApprovalMessage(record);
  record.slackChannelId = postResult.channel || CONFIG.slackApprovalChannelId;
  record.slackChannelName = plan.slackChannelName || CONFIG.slackApprovalChannelName;
  record.slackMessageTs = postResult.ts;
  storeApprovalRecord(record);

  upsertGitHubApproval(buildPendingApprovalPayload(record));

  return {
    submittedAt: record.submittedAt,
    channel: 'slack_channel_notice',
    slackChannelId: record.slackChannelId,
    slackChannelName: record.slackChannelName,
    slackMessageTs: record.slackMessageTs,
    reviewUrl: buildReviewUrl(record.tokens.approve)
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
    submittedAt: record.submittedAt || null,
    title: record.title,
    planUrl: record.planUrl,
    indexUrl: record.indexUrl,
    slackChannelId: record.slackChannelId || null,
    slackChannelName: record.slackChannelName || null,
    slackMessageTs: record.slackMessageTs || null,
    reviewComment: options && options.comment ? String(options.comment) : null
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
    text: `Kế hoạch ${record.month} đã sẵn sàng review: ${record.title}`,
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
  const reviewUrl = buildReviewUrl(record.tokens.approve);
  const intro = `*Kế hoạch ngân quỹ tháng ${record.month} đã sẵn sàng review*\n- Plan: *${escapeSlackText(record.title)}*\n- Version: *${escapeSlackText(record.version)}*\n- Mở màn hình duyệt: ${reviewUrl}\n- Xem live: ${record.indexUrl}`;
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: intro }
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Bot: ${CONFIG.slackBotUsername} · Channel: ${record.slackChannelName} · Ai có link review đều có thể mở và thao tác duyệt trên web.` }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mở màn hình duyệt' },
          style: 'primary',
          url: reviewUrl,
          action_id: 'open_review_page'
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
  let previousHistory = [];
  if (getRes.getResponseCode() === 200) {
    const existing = JSON.parse(getRes.getContentText());
    sha = existing.sha;
    try {
      const previous = JSON.parse(Utilities.newBlob(Utilities.base64Decode(existing.content.replace(/\n/g, ''))).getDataAsString('UTF-8'));
      previousHistory = Array.isArray(previous.history) ? previous.history : [];
    } catch (err) {
      previousHistory = [];
    }
  }
  // Lịch sử trình/duyệt để dashboard vẽ timeline
  payload.history = previousHistory.concat([{
    at: payload.reviewedAt || payload.submittedAt || new Date().toISOString(),
    status: payload.status,
    version: payload.version,
    comment: payload.reviewComment || null
  }]);

  const body = {
    message: `Update approval status for ${payload.planId}`,
    content: Utilities.base64Encode(JSON.stringify(payload, null, 2), Utilities.Charset.UTF_8),
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

function buildReviewUrl(token) {
  const base = ScriptApp.getService().getUrl();
  return `${base}?token=${encodeURIComponent(token)}`;
}

function buildReviewPageHtml(record) {
  const approveUrl = buildActionUrl(record.tokens.approve, 'approve');
  const reviseUrl = buildActionUrl(record.tokens.revise, 'revise');
  return `
    <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;max-width:760px;margin:0 auto">
      <h2>Trình review kế hoạch ngân quỹ</h2>
      <p><strong>Người trình:</strong> ${escapeHtml(record.makerEmail)}</p>
      <p><strong>Kế hoạch:</strong> ${escapeHtml(record.title)}</p>
      <p><strong>Tháng:</strong> ${escapeHtml(record.month)}</p>
      <p><strong>Version:</strong> ${escapeHtml(record.version)}</p>
      <p><strong>Link xem live:</strong><br/><a href="${record.indexUrl}">${record.indexUrl}</a></p>
      <p style="color:#475569">Bất kỳ ai có link review này đều có thể thao tác trên web.</p>
      <p>
        <a href="${reviseUrl}" style="display:inline-block;padding:10px 14px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">Cần điều chỉnh</a>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 14px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px">Duyệt kế hoạch</a>
      </p>
    </div>
  `;
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


/* ---------- Dashboard: lưu nhập liệu kế hoạch và link hợp đồng ---------- */

function assertEditor(payload) {
  if (!payload || String(payload.editorCode || '') !== String(CONFIG.editorCode)) {
    throw new Error('Mã người lập không đúng.');
  }
}

function githubGetJson(path) {
  const url = `https://api.github.com/repos/${CONFIG.githubOwner}/${CONFIG.githubRepo}/contents/${encodeURIComponent(path)}?ref=${CONFIG.githubBranch}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: `Bearer ${CONFIG.githubToken}`, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { sha: null, json: null };
  const meta = JSON.parse(res.getContentText());
  const text = Utilities.newBlob(Utilities.base64Decode(meta.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
  return { sha: meta.sha, json: JSON.parse(text) };
}

function githubPutJson(path, obj, message, sha) {
  if (!CONFIG.githubToken) throw new Error('Thiếu GITHUB_TOKEN trong Script Properties.');
  const url = `https://api.github.com/repos/${CONFIG.githubOwner}/${CONFIG.githubRepo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: Utilities.base64Encode(JSON.stringify(obj, null, 2) + '\n', Utilities.Charset.UTF_8),
    branch: CONFIG.githubBranch
  };
  if (sha) body.sha = sha;
  const res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.githubToken}`, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error(`GitHub update failed: ${res.getResponseCode()} ${res.getContentText()}`);
  return JSON.parse(res.getContentText());
}

function savePlanInputs(payload) {
  assertEditor(payload);
  const month = String(payload.month || '');
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Tháng kế hoạch không hợp lệ.');
  const inputs = payload.inputs || {};
  const path = `${CONFIG.planInputsPrefix}/${month}.json`;
  const current = githubGetJson(path);
  const saved = Object.assign({}, inputs, {
    month,
    updatedAt: new Date().toISOString(),
    updatedBy: CONFIG.makerEmail
  });
  githubPutJson(path, saved, `Update plan inputs for ${month}`, current.sha);
  const indexPath = `${CONFIG.planInputsPrefix}/index.json`;
  const index = githubGetJson(indexPath);
  const months = (index.json && Array.isArray(index.json.months)) ? index.json.months : [];
  if (months.indexOf(month) === -1) {
    githubPutJson(indexPath, { months: months.concat([month]).sort() }, `Add plan month ${month}`, index.sha);
  }
  return { month, updatedAt: saved.updatedAt, version: saved.version || null };
}

function saveContractLink(payload) {
  assertEditor(payload);
  const code = String(payload.code || '').trim();
  const url = String(payload.url || '').trim();
  if (!code) throw new Error('Thiếu mã khế ước.');
  if (url && !/^https:\/\//.test(url)) throw new Error('Link hợp đồng phải bắt đầu bằng https://');
  const current = githubGetJson(CONFIG.contractLinksPath);
  const data = current.json || { links: {} };
  data.links = data.links || {};
  if (url) data.links[code] = url; else delete data.links[code];
  data.updatedAt = new Date().toISOString();
  githubPutJson(CONFIG.contractLinksPath, data, `Update contract link for ${code}`, current.sha);
  return { code, url };
}


/* ---------- Phản hồi CFO kèm nội dung (trang mở từ link trong mail) ---------- */

function assertActionToken(record, token, action) {
  const expected = action === 'approve' ? record.tokens.approve : action === 'revise' ? record.tokens.revise : null;
  if (!expected || expected !== token) throw new Error('Link phản hồi không hợp lệ.');
}

function buildFeedbackPageHtml(record, token, action) {
  const isRevise = action === 'revise';
  const done = record.reviewedStatus
    ? `<div style="padding:12px 14px;background:#f1f5f9;border-radius:8px;margin:12px 0">Kế hoạch này đã được xử lý: <strong>${record.reviewedStatus === 'approved' ? 'CFO đã duyệt' : 'CFO yêu cầu điều chỉnh'}</strong> lúc ${escapeHtml(formatVnTime(record.reviewedAt))}.${record.reviewComment ? `<br/>Nội dung: ${escapeHtml(record.reviewComment)}` : ''}<br/>Nếu cần phản hồi thêm, vui lòng trao đổi trực tiếp với người lập.</div>`
    : '';
  const color = isRevise ? '#b45309' : '#1e3a8a';
  return `<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"></head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;line-height:1.55">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px">
      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#64748b">Kế hoạch ngân quỹ · ${escapeHtml(record.planTypeLabel)}</div>
      <h2 style="margin:6px 0 4px;font-size:20px">${isRevise ? 'Yêu cầu điều chỉnh kế hoạch' : 'Duyệt kế hoạch'}</h2>
      <table style="font-size:14px;border-collapse:collapse;margin:10px 0 4px">
        <tr><td style="color:#64748b;padding:2px 12px 2px 0">Kế hoạch</td><td>${escapeHtml(record.title)}</td></tr>
        <tr><td style="color:#64748b;padding:2px 12px 2px 0">Tháng</td><td>${escapeHtml(record.month)}</td></tr>
        <tr><td style="color:#64748b;padding:2px 12px 2px 0">Version</td><td>${escapeHtml(record.version)}</td></tr>
        <tr><td style="color:#64748b;padding:2px 12px 2px 0">Người trình</td><td>${escapeHtml(record.makerEmail)}</td></tr>
      </table>
      <p style="margin:6px 0 14px"><a href="${record.indexUrl}" style="color:#1d4ed8">Mở kế hoạch trên dashboard</a></p>
      ${done || `
      <label for="cmt" style="display:block;font-weight:bold;font-size:14px;margin-bottom:6px">${isRevise ? 'Nội dung cần điều chỉnh (bắt buộc)' : 'Ghi chú khi duyệt (không bắt buộc)'}</label>
      <textarea id="cmt" rows="7" maxlength="4000" style="width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:10px;border:1px solid #cbd5e1;border-radius:8px" placeholder="${isRevise ? 'Ví dụ: bổ sung khoản thu DOPA; phần tiền còn lại chuyển sang trái phiếu VNDirect 3 tháng…' : 'Ghi chú cho người lập (nếu có)'}"></textarea>
      <div id="err" style="color:#b91c1c;font-size:13px;min-height:18px;margin-top:6px"></div>
      <button id="btn" onclick="send()" style="margin-top:4px;padding:11px 16px;background:${color};color:#fff;border:0;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer">${isRevise ? 'Gửi yêu cầu điều chỉnh' : 'Xác nhận duyệt'}</button>
      <div id="ok" style="display:none;margin-top:14px;padding:12px 14px;background:#ecfdf5;border-radius:8px;color:#065f46"></div>`}
    </div>
  </div>
  <script>
    function send() {
      var c = document.getElementById('cmt').value.trim();
      var err = document.getElementById('err'), btn = document.getElementById('btn');
      if (${isRevise ? 'true' : 'false'} && !c) { err.textContent = 'Vui lòng ghi nội dung cần điều chỉnh.'; return; }
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Đang gửi…';
      google.script.run
        .withSuccessHandler(function (r) {
          btn.style.display = 'none'; document.getElementById('cmt').disabled = true;
          var ok = document.getElementById('ok'); ok.style.display = 'block'; ok.textContent = r.message;
        })
        .withFailureHandler(function (e) {
          btn.disabled = false; btn.textContent = '${isRevise ? 'Gửi yêu cầu điều chỉnh' : 'Xác nhận duyệt'}';
          err.textContent = 'Không gửi được: ' + (e && e.message ? e.message : e);
        })
        .submitReviewFeedback('${token}', '${action}', c);
    }
  </script>
  </body></html>`;
}

/* Gọi từ trang phản hồi (google.script.run) */
function submitReviewFeedback(token, action, comment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const record = loadApprovalRecord(token);
    assertActionToken(record, token, action);
    if (record.reviewedStatus) throw new Error('Kế hoạch này đã được xử lý trước đó.');
    const text = String(comment || '').trim().slice(0, 4000);
    if (action === 'revise' && !text) throw new Error('Vui lòng ghi nội dung cần điều chỉnh.');
    const result = applyReviewAction(record, action, { source: 'web_form', comment: text });
    record.reviewedStatus = result.status;
    record.reviewedAt = result.reviewedAt;
    record.reviewComment = text || null;
    storeApprovalRecord(record);
    try { notifyMakerOfReview(record, result, text); } catch (e) { console.error('notifyMakerOfReview', e); }
    return {
      ok: true,
      status: result.status,
      message: result.status === 'approved'
        ? 'Đã duyệt kế hoạch. Người lập sẽ nhận mail thông báo.'
        : 'Đã gửi yêu cầu điều chỉnh. Người lập sẽ nhận mail kèm nội dung phản hồi.'
    };
  } finally {
    lock.releaseLock();
  }
}

function notifyMakerOfReview(record, result, comment) {
  const approved = result.status === 'approved';
  const subject = `[Treasury] CFO ${approved ? 'đã duyệt' : 'yêu cầu điều chỉnh'} kế hoạch ${record.month} - ${record.planTypeLabel} (${record.version})`;
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h3>${approved ? 'CFO đã duyệt kế hoạch' : 'CFO yêu cầu điều chỉnh kế hoạch'}</h3>
      <p><strong>Kế hoạch:</strong> ${escapeHtml(record.title)} · ${escapeHtml(record.month)} · ${escapeHtml(record.planTypeLabel)} · ${escapeHtml(record.version)}</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(formatVnTime(result.reviewedAt))}</p>
      ${comment ? `<p><strong>Nội dung phản hồi:</strong></p><div style="white-space:pre-wrap;padding:10px 12px;background:#f8fafc;border-left:3px solid ${approved ? '#1e3a8a' : '#f59e0b'}">${escapeHtml(comment)}</div>` : ''}
      <p><a href="${record.indexUrl}">Mở kế hoạch trên dashboard</a></p>
    </div>`;
  GmailApp.sendEmail(CONFIG.makerEmail, subject, `${subject}\n\n${comment || ''}\n\n${record.indexUrl}`, { htmlBody, name: 'Treasury Approval' });
}

function formatVnTime(iso) {
  if (!iso) return '';
  return Utilities.formatDate(new Date(iso), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
}

