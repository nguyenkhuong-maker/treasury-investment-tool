(function () {
  const WORKFLOW_KEY_PREFIX = 'treasury-approval-workflow::';
  const TOKEN_KEY_PREFIX = 'treasury-approval-token::';

  function nowIso() {
    return new Date().toISOString();
  }

  function nowLabel() {
    return new Date().toLocaleString('vi-VN');
  }

  function randomToken() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'tok-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function workflowKey(planId) {
    return WORKFLOW_KEY_PREFIX + planId;
  }

  function tokenKey(token) {
    return TOKEN_KEY_PREFIX + token;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildBaseState(plan, allowedApproverEmail) {
    return {
      planId: plan.id,
      month: plan.month,
      monthLabel: plan.monthLabel,
      periodLabel: plan.periodLabel,
      planType: plan.type,
      planTitle: plan.title,
      version: plan.version,
      contentHash: plan.contentHash,
      sourceHtml: plan.sourceHtml,
      allowedApproverEmail: allowedApproverEmail,
      status: 'draft',
      currentRound: 0,
      latestToken: null,
      latestSentAtIso: null,
      latestSentAtLabel: null,
      approvedBy: null,
      approvedAtIso: null,
      approvedAtLabel: null,
      rounds: [],
      timeline: []
    };
  }

  function syncPlanMeta(existing, plan, allowedApproverEmail) {
    const state = existing ? clone(existing) : buildBaseState(plan, allowedApproverEmail);
    state.planId = plan.id;
    state.month = plan.month;
    state.monthLabel = plan.monthLabel;
    state.periodLabel = plan.periodLabel;
    state.planType = plan.type;
    state.planTitle = plan.title;
    state.version = plan.version;
    state.contentHash = plan.contentHash;
    state.sourceHtml = plan.sourceHtml;
    state.allowedApproverEmail = allowedApproverEmail || state.allowedApproverEmail;
    state.rounds = Array.isArray(state.rounds) ? state.rounds : [];
    state.timeline = Array.isArray(state.timeline) ? state.timeline : [];
    return state;
  }

  function appendTimeline(state, type, actor, message, round) {
    state.timeline.push({
      type,
      actor,
      message,
      round: round || state.currentRound || null,
      atIso: nowIso(),
      atLabel: nowLabel()
    });
  }

  function persistState(state) {
    writeJson(workflowKey(state.planId), state);
    return state;
  }

  function getWorkflowState(plan, allowedApproverEmail) {
    const existing = readJson(workflowKey(plan.id));
    return syncPlanMeta(existing, plan, allowedApproverEmail);
  }

  function getWorkflowStateByPlanId(planId) {
    return readJson(workflowKey(planId));
  }

  function getTokenBinding(token) {
    return readJson(tokenKey(token));
  }

  function getWorkflowStateByToken(token) {
    const binding = getTokenBinding(token);
    if (!binding || !binding.planId) return null;
    return getWorkflowStateByPlanId(binding.planId);
  }

  function createOrRefreshRequest(plan, allowedApproverEmail) {
    const state = getWorkflowState(plan, allowedApproverEmail);
    const nextRound = (state.currentRound || 0) + 1;
    const token = randomToken();
    const sentAtIso = nowIso();
    const sentAtLabel = nowLabel();
    const round = {
      round: nextRound,
      token,
      sentAtIso,
      sentAtLabel,
      status: 'pending',
      cfoNote: '',
      cfoAction: null,
      cfoActedAtIso: null,
      cfoActedAtLabel: null,
      makerResponse: '',
      makerCompletedAtIso: null,
      makerCompletedAtLabel: null,
      approvedBy: null,
      approvedAtIso: null,
      approvedAtLabel: null
    };

    state.currentRound = nextRound;
    state.latestToken = token;
    state.latestSentAtIso = sentAtIso;
    state.latestSentAtLabel = sentAtLabel;
    state.status = 'pending_cfo_review';
    state.approvedBy = null;
    state.approvedAtIso = null;
    state.approvedAtLabel = null;
    state.rounds.push(round);

    if (!state.timeline.length) {
      appendTimeline(state, 'draft_ready', 'maker', 'Đã chuẩn bị bản draft kế hoạch.', nextRound);
    }
    appendTimeline(state, 'sent_to_cfo', 'maker', 'Đã gửi kế hoạch cho CFO review.', nextRound);

    persistState(state);
    writeJson(tokenKey(token), { planId: state.planId, round: nextRound });
    return state;
  }

  function readRoundForToken(token) {
    const binding = getTokenBinding(token);
    if (!binding || !binding.planId) {
      return { ok: false, code: 'not_found', message: 'Không tìm thấy approval request.' };
    }
    const state = getWorkflowStateByPlanId(binding.planId);
    if (!state) {
      return { ok: false, code: 'not_found', message: 'Không tìm thấy workflow của kế hoạch.' };
    }
    const round = (state.rounds || []).find((item) => item.round === binding.round);
    if (!round) {
      return { ok: false, code: 'not_found', message: 'Không tìm thấy review round tương ứng.' };
    }
    if (state.latestToken !== token || state.currentRound !== binding.round) {
      return { ok: false, code: 'stale_link', message: 'Link này đã cũ vì kế hoạch đã được gửi lại ở round mới hơn.' };
    }
    return { ok: true, state, round };
  }

  function validateApproverEmail(state, approverEmail) {
    return String(approverEmail || '').trim().toLowerCase() === String(state.allowedApproverEmail || '').trim().toLowerCase();
  }

  function requestRevision(token, approverEmail, note) {
    const loaded = readRoundForToken(token);
    if (!loaded.ok) return loaded;
    const { state, round } = loaded;

    if (!validateApproverEmail(state, approverEmail)) {
      return { ok: false, code: 'wrong_email', message: 'Email không khớp với approver đã chỉ định.' };
    }
    if (round.status === 'approved') {
      return { ok: false, code: 'already_approved', message: 'Round này đã được duyệt.' };
    }

    round.status = 'revision_requested';
    round.cfoNote = String(note || '').trim();
    round.cfoAction = 'revision_requested';
    round.cfoActedAtIso = nowIso();
    round.cfoActedAtLabel = nowLabel();
    state.status = 'revision_requested';
    appendTimeline(
      state,
      'revision_requested',
      'cfo',
      round.cfoNote ? `CFO yêu cầu điều chỉnh: ${round.cfoNote}` : 'CFO yêu cầu điều chỉnh.',
      round.round
    );
    persistState(state);
    return { ok: true, code: 'revision_requested', state, round };
  }

  function makerCompleteRevision(planId, response) {
    const state = getWorkflowStateByPlanId(planId);
    if (!state) {
      return { ok: false, code: 'not_found', message: 'Không tìm thấy workflow của kế hoạch.' };
    }
    const round = (state.rounds || []).find((item) => item.round === state.currentRound);
    if (!round) {
      return { ok: false, code: 'not_found', message: 'Không tìm thấy review round hiện tại.' };
    }
    if (state.status !== 'revision_requested') {
      return { ok: false, code: 'invalid_state', message: 'Hiện chưa có yêu cầu điều chỉnh mở để hoàn thành.' };
    }

    round.makerResponse = String(response || '').trim();
    round.makerCompletedAtIso = nowIso();
    round.makerCompletedAtLabel = nowLabel();
    state.status = 'revision_completed';
    appendTimeline(
      state,
      'revision_completed',
      'maker',
      round.makerResponse ? `Người lập đã hoàn thành điều chỉnh: ${round.makerResponse}` : 'Người lập đã hoàn thành điều chỉnh.',
      round.round
    );
    persistState(state);
    return { ok: true, code: 'revision_completed', state, round };
  }

  function approveByToken(token, approverEmail, note) {
    const loaded = readRoundForToken(token);
    if (!loaded.ok) return loaded;
    const { state, round } = loaded;

    if (!validateApproverEmail(state, approverEmail)) {
      return { ok: false, code: 'wrong_email', message: 'Email không khớp với approver đã chỉ định.' };
    }
    if (state.status === 'approved') {
      return { ok: true, code: 'already_approved', state, round };
    }

    round.status = 'approved';
    round.cfoNote = String(note || '').trim();
    round.cfoAction = 'approved';
    round.cfoActedAtIso = nowIso();
    round.cfoActedAtLabel = nowLabel();
    round.approvedBy = approverEmail;
    round.approvedAtIso = round.cfoActedAtIso;
    round.approvedAtLabel = round.cfoActedAtLabel;
    state.status = 'approved';
    state.approvedBy = approverEmail;
    state.approvedAtIso = round.approvedAtIso;
    state.approvedAtLabel = round.approvedAtLabel;
    appendTimeline(
      state,
      'approved',
      'cfo',
      round.cfoNote ? `CFO đã duyệt kế hoạch. Ghi chú: ${round.cfoNote}` : 'CFO đã duyệt kế hoạch.',
      round.round
    );
    persistState(state);
    return { ok: true, code: 'approved', state, round };
  }

  function clearWorkflow(planId) {
    const state = getWorkflowStateByPlanId(planId);
    if (state && Array.isArray(state.rounds)) {
      state.rounds.forEach((round) => {
        if (round && round.token) localStorage.removeItem(tokenKey(round.token));
      });
    }
    localStorage.removeItem(workflowKey(planId));
    return { ok: true };
  }

  window.TreasuryApprovalMock = {
    getWorkflowState,
    getWorkflowStateByPlanId,
    getWorkflowStateByToken,
    createOrRefreshRequest,
    requestRevision,
    makerCompleteRevision,
    approveByToken,
    clearWorkflow
  };
})();
