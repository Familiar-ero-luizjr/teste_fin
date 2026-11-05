(function financeShared() {
  "use strict";
  const key = "enjoy_resumo_movimentacoes_v1";
  const areas = {
    overview: { title: "Visão geral", hint: "Todos os lançamentos financeiros por data." },
    gains: { title: "Ganhos", hint: "Recebimentos de reservas e vendas avulsas, separados pela origem." },
    sales: { title: "Vendas", hint: "Registre vendas avulsas sem misturá-las aos recebimentos das reservas." },
    expenses: { title: "Despesas", hint: "Custos e despesas operacionais." },
    investments: { title: "Investimentos", hint: "Desembolsos classificados como investimento." }
  };
  const settings = new Map();
  const roots = new Map();
  let listening = false;
  const curr = () => new Date().toLocaleDateString("en-CA");
  const money = amount => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount) || 0);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const uid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const accountLabel = id => window.EnjoyReceipts?.accountName?.(id) || (id ? `Conta ${id}` : "Sem conta informada");
  const canWrite = () => !!window.EnjoyPermissions?.can?.("modules.write") && !!window.EnjoyAccess?.canModule?.("finance-expenses");
  const canWriteFor = area => !!window.EnjoyPermissions?.can?.("modules.write") && !!window.EnjoyAccess?.canModule?.(area === "sales" || area === "gains" ? "finance-gains" : "finance-expenses");
  const source = () => window.EnjoyStore?.read?.(key, []) || [];
  const accounts = () => window.EnjoyReceipts?.accounts?.() || [];
  const expenseEnvironments = () => source().map(environment => ({
    id: String(environment.id || ""),
    name: String(environment.name || environment.nome || "Sem ambiente"),
    categories: (environment.categories || environment.categorias || [])
      .filter(category => category.flow !== "in" && category.classification !== "investment" && !String(category.integrationId || "").startsWith("operation:"))
      .map(category => ({ id: String(category.id || ""), name: String(category.name || category.nome || "Sem categoria"), classification: category.classification || "expense" }))
  }));
  function records() {
    const result = [];
    const reservations = window.EnjoyOperationsData?.records?.(window.EnjoyOperationsData?.KEYS?.reservations) || [];
    for (const environment of source()) {
      for (const category of environment.categories || environment.categorias || []) {
        const generated = String(category.integrationId || "").startsWith("operation:");
        const postings = generated
          ? Object.entries(category.days || {}).map(([date, amount], index) => ({ date, amount, description: category.name, index }))
          : Array.isArray(category.entries) && category.entries.length
          ? category.entries.map((entry, index) => ({ ...entry, index }))
          : Object.entries(category.days || {}).map(([date, amount], index) => ({ date, amount, description: category.name, index }));
        const linked = window.EnjoyReceipts?.reservationIdForMovement?.(category, reservations) || category.reservationId || "";
        const reservation = reservations.find(item => String(item.id) === String(linked));
        const classification = category.classification || (category.flow === "in" ? "revenue" : "expense");
        const flow = category.flow === "in" ? "in" : "out";
        for (const entry of postings) {
          const amount = Number(entry.amount);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || "")) || !Number.isFinite(amount) || amount <= 0) continue;
          result.push({
            id: entry.id || "",
            index: entry.index,
            environmentId: String(environment.id || ""),
            categoryId: String(category.id || ""),
            environment: String(environment.name || environment.nome || "Sem ambiente"),
            category: String(category.name || category.nome || "Sem categoria"),
            date: entry.date,
            description: String(entry.description || category.name || "Lançamento"),
            accountId: String(entry.accountId || category.accountId || ""),
            method: String(entry.method || category.method || ""),
            classification, flow, amount,
            generated, isSale: category.mode === "sale", groupId: String(entry.groupId || ""),
            recurrenceId: String(entry.recurrenceId || ""),
            recurrenceFrequency: String(entry.recurrenceFrequency || ""),
            recurrenceEndDate: String(entry.recurrenceEndDate || ""),
            reservationId: String(linked || ""),
            reservationChannel: reservation?.channel === "Booking" ? "Booking" : "Direta"
          });
        }
      }
    }
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
  }
  function inArea(row, area) {
    if (area === "gains") return row.flow === "in" && !row.isSale;
    if (area === "sales") return row.flow === "in" && row.isSale;
    if (area === "expenses") return row.flow === "out" && row.classification !== "investment";
    if (area === "investments") return row.flow === "out" && row.classification === "investment";
    return true;
  }
  function selection(area) {
    if (!settings.has(area)) settings.set(area, { account: "", environment: "", query: "", period: "all", from: "", to: "", descending: false, recurrenceFrequency: "all" });
    return settings.get(area);
  }
  function matches(row, filter) {
    if (filter.account && (filter.account === "__none__" ? !!row.accountId : row.accountId !== filter.account)) return false;
    if (filter.environment && row.environmentId !== filter.environment) return false;
    const month = new Date().toLocaleDateString("en-CA").slice(0, 7);
    if (filter.period === "month" && row.date.slice(0, 7) !== month) return false;
    if (filter.period === "range" && ((filter.from && row.date < filter.from) || (filter.to && row.date > filter.to))) return false;
    const haystack = normalize([row.description, row.environment, row.category, row.method, row.classification, accountLabel(row.accountId)].join(" "));
    return !filter.query || haystack.includes(normalize(filter.query));
  }
  function filtered(area) {
    const state = selection(area);
    const result = records().filter(row => {
      const recurrenceMatch = area !== "expenses" || state.recurrenceFrequency === "all" || (state.recurrenceFrequency === "daily" ? !row.recurrenceFrequency || row.recurrenceFrequency === "daily" : row.recurrenceFrequency === state.recurrenceFrequency);
      return inArea(row, area) && matches(row, state) && recurrenceMatch;
    });
    return state.descending ? result.reverse() : result;
  }
  function totals(rows) {
    const incoming = rows.filter(row => row.flow === "in").reduce((sum, row) => sum + row.amount, 0);
    const expenses = rows.filter(row => row.flow === "out" && row.classification !== "investment").reduce((sum, row) => sum + row.amount, 0);
    const investments = rows.filter(row => row.flow === "out" && row.classification === "investment").reduce((sum, row) => sum + row.amount, 0);
    return { incoming, expenses, investments, balance: incoming - expenses };
  }
  function options(items, current, label, getValue, getTitle) {
    return `<option value="">${esc(label)}</option>${items.map(item => `<option value="${esc(getValue(item))}" ${String(getValue(item)) === current ? "selected" : ""}>${esc(getTitle(item))}</option>`).join("")}`;
  }
  function filtersMarkup(area) {
    const state = selection(area);
    const rows = records().filter(row => inArea(row, area));
    const usedAccounts = new Set(rows.map(row => row.accountId));
    const accountList = [...accounts(), ...[...usedAccounts].filter(id => id && !accounts().some(item => item.id === id)).map(id => ({ id, name: accountLabel(id) }))].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const environmentRows = rows.filter(row => !state.account || (state.account === "__none__" ? !row.accountId : row.accountId === state.account));
    const environments = [...new Map(environmentRows.map(row => [row.environmentId, { id: row.environmentId, name: row.environment }])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (state.environment && !environments.some(item => item.id === state.environment)) state.environment = "";
    return `<div class="fv2-filters" role="search" aria-label="Filtros financeiros">
      <label>Conta<select data-fv2-filter="account">${options(accountList, state.account, "Todas as contas", item => item.id, item => item.name)}<option value="__none__" ${state.account === "__none__" ? "selected" : ""}>Sem conta informada</option></select></label>
      <label>Ambiente<select data-fv2-filter="environment">${options(environments, state.environment, "Todos os ambientes", item => item.id, item => item.name)}</select></label>
      <label class="fv2-search">Buscar<input type="search" data-fv2-filter="query" value="${esc(state.query)}" placeholder="Descrição ou categoria"></label>
      <label>Período<select data-fv2-filter="period">
        <option value="all" ${state.period === "all" ? "selected" : ""}>Todas as datas</option>
        <option value="month" ${state.period === "month" ? "selected" : ""}>Mês atual</option>
        <option value="range" ${state.period === "range" ? "selected" : ""}>Personalizado</option>
      </select></label>
      ${area === "expenses" ? `<label>Frequência<select data-fv2-filter="recurrenceFrequency"><option value="all" ${state.recurrenceFrequency === "all" ? "selected" : ""}>Todos os lançamentos</option><option value="monthly" ${state.recurrenceFrequency === "monthly" ? "selected" : ""}>Mensais</option><option value="weekly" ${state.recurrenceFrequency === "weekly" ? "selected" : ""}>Semanais</option><option value="daily" ${state.recurrenceFrequency === "daily" ? "selected" : ""}>Diários</option></select></label>` : ""}
      ${state.period === "range" ? `<label>De<input type="date" data-fv2-filter="from" value="${esc(state.from)}"></label><label>Até<input type="date" data-fv2-filter="to" value="${esc(state.to)}"></label>` : ""}
      <button type="button" class="fv2-button secondary" data-fv2-action="reset">Limpar filtros</button>
    </div>`;
  }
  function tableMarkup(area) {
    const rows = filtered(area), sum = totals(rows), state = selection(area);
    const body = rows.map(row => {
      const title = row.generated ? "Gerado automaticamente; edite a reserva de origem" : row.groupId ? "Lançamento agrupado; edite no módulo original" : "";
      const action = row.reservationId
        ? window.EnjoyAccess?.canModule?.("reservations")
          ? `<button class="fv2-text-button" type="button" data-fv2-action="reservation" data-reservation-id="${esc(row.reservationId)}">Abrir reserva</button>`
          : '<span class="fv2-muted">Origem: reserva</span>'
        : row.generated || row.groupId || (row.flow === "in" && !row.isSale) || !canWriteFor(area)
        ? `<span class="fv2-muted" title="${esc(title)}">—</span>`
        : `<button class="fv2-text-button" type="button" data-fv2-action="edit" data-environment-id="${esc(row.environmentId)}" data-category-id="${esc(row.categoryId)}" data-entry-index="${row.index}">Editar</button>`;
      const typeLabel = row.flow === "in" ? "Entrada" : "Saída";
      const classificationLabel = ({ revenue: "Ganho", cost: "Custo operacional", expense: "Despesa", investment: "Investimento", transfer: "Transferência" })[row.classification] || row.classification;
      return `<tr><td><time datetime="${esc(row.date)}">${row.date.split("-").reverse().join("/")}</time></td>
        <td class="fv2-description"><strong>${esc(row.description)}</strong>${row.generated ? '<small>Gerado automaticamente</small>' : ""}</td>
        <td>${esc(classificationLabel)}</td>
        <td><span class="fv2-chip">${esc(row.environment)}</span><small>${esc(row.category)}</small></td>
        <td><span class="fv2-chip">${esc(accountLabel(row.accountId))}</span><small>${esc(row.method || "Não informada")}</small></td>
        <td><span class="fv2-flow ${row.flow}">${typeLabel}</span></td>
        <td class="fv2-money in">${row.flow === "in" ? money(row.amount) : "—"}</td>
        <td class="fv2-money out">${row.flow === "out" ? money(row.amount) : "—"}</td><td>${action}</td></tr>`;
    }).join("") || '<tr><td colspan="9" class="fv2-empty">Nenhum lançamento corresponde aos filtros selecionados.</td></tr>';
    const overview = area === "overview" ? `<div class="fv2-cards">
      <article><small>Saldo operacional</small><strong>${money(sum.balance)}</strong><span>Ganhos menos despesas</span></article>
      <article><small>Ganhos</small><strong class="fv2-in">${money(sum.incoming)}</strong></article>
      <article><small>Despesas</small><strong class="fv2-out">${money(sum.expenses)}</strong></article>
      <article><small>Investimentos</small><strong>${money(sum.investments)}</strong></article>
    </div>` : "";
    return `${overview}<div class="fv2-table-heading"><div><h3>Tabela geral</h3><p>${rows.length} ${rows.length === 1 ? "lançamento" : "lançamentos"} · ${state.descending ? "data decrescente" : "data crescente"}</p></div><button type="button" class="fv2-button secondary" data-fv2-action="export">Exportar CSV</button></div>
      <div class="fv2-scroll" role="region" aria-label="Lançamentos financeiros; rolagem horizontal" tabindex="0">
        <table class="fv2-table"><thead><tr><th><button type="button" class="fv2-sort" data-fv2-action="sort">Data ${state.descending ? "↓" : "↑"}</button></th><th>Descrição</th><th>Classificação</th><th>Ambiente / categoria</th><th>Conta / forma</th><th>Tipo</th><th>Entrada</th><th>Saída</th><th>Ações</th></tr></thead>
        <tbody>${body}</tbody><tfoot><tr><th colspan="6">Total filtrado</th><td class="fv2-money in">${money(sum.incoming)}</td><td class="fv2-money out">${money(sum.expenses + sum.investments)}</td><td></td></tr></tfoot></table>
      </div>`;
  }
  function renderContent(area) {
    const root = roots.get(area) || (area === "sales" ? roots.get("gains") : null);
    if (!root) return;
    const target = root.querySelector("[data-fv2-results]");
    if (target) target.innerHTML = tableMarkup(area);
  }
  function render(area) {
    if (area === "sales") {
      selection("gains").gainTab = "sales";
      render("gains");
      return;
    }
    const root = roots.get(area);
    if (!root) return;
    const activeArea = area === "gains" && selection("gains").gainTab === "sales" ? "sales" : area;
    root.dataset.fv2ViewArea = activeArea;
    const info = areas[activeArea];
    const gainTabs = area === "gains" ? `<nav class="fv2-tabs" aria-label="Origem dos ganhos"><button type="button" class="fv2-tab ${activeArea === "gains" ? "is-active" : ""}" data-fv2-action="gain-tab" data-fv2-tab="gains" aria-selected="${activeArea === "gains"}">Recebimentos de reservas</button><button type="button" class="fv2-tab ${activeArea === "sales" ? "is-active" : ""}" data-fv2-action="gain-tab" data-fv2-tab="sales" aria-selected="${activeArea === "sales"}">Vendas</button></nav>` : "";
    const actionLabel = activeArea === "expenses" ? "Adicionar despesa" : activeArea === "investments" ? "Registrar investimento" : "Registrar venda";
    root.innerHTML = `<section class="fv2-module">
      <header class="fv2-heading"><div><span>FINANCEIRO</span><h2>${info.title}</h2><p>${info.hint}</p></div>
      <div class="fv2-heading-actions">${["expenses", "investments", "sales"].includes(activeArea) && canWriteFor(activeArea) ? `<button class="fv2-button primary" data-fv2-action="new">+ ${actionLabel}</button>` : ""}</div></header>
      ${gainTabs}${filtersMarkup(activeArea)}<div data-fv2-results>${tableMarkup(activeArea)}</div>
    </section>`;
  }
  function renderAll() { for (const area of roots.keys()) render(area); }
  function editDestinations(area) {
    return source().flatMap(env => (env.categories || []).filter(cat => {
      if (String(cat.integrationId || "").startsWith("operation:")) return false;
      if (area === "sales") return cat.flow === "in" && cat.classification === "revenue" && cat.mode === "sale";
      return cat.flow !== "in" && (area === "investments" ? cat.classification === "investment" : cat.classification !== "investment");
    }).map(cat => ({ id: `${env.id}::${cat.id}`, label: `${env.name} · ${cat.name}` })));
  }

  async function saveExpenseOccurrences({ environmentId, categoryId, newCategory, classification, entries }) {
    if (!canWrite()) throw new Error("Sem permissão para alterar lançamentos.");
    const data = structuredClone(source());
    const environment = data.find(item => String(item.id) === String(environmentId));
    if (!environment) throw new Error("O ambiente desta recorrência não está disponível.");
    environment.categories ||= environment.categorias || [];
    let category = environment.categories.find(item => String(item.id) === String(categoryId));
    if (!category && newCategory) {
      const name = String(newCategory).trim();
      if (!name) throw new Error("Informe uma categoria para esta despesa.");
      category = environment.categories.find(item => normalize(item.name) === normalize(name));
      if (!category) {
        category = { id: uid(), name, flow: "out", classification: classification === "cost" ? "cost" : "expense", businessArea: environment.name, entries: [], days: {} };
        environment.categories.push(category);
      }
    }
    if (!category || category.flow === "in" || category.classification === "investment" || String(category.integrationId || "").startsWith("operation:")) throw new Error("Categoria incompatível ou indisponível.");
    if (!Array.isArray(category.entries) || !category.entries.length) category.entries = Object.entries(category.days || {}).map(([date, amount]) => ({ id: uid(), date, description: category.name, amount: Number(amount), accountId: category.accountId || "", method: category.method || "" }));
    const next = entries.map(entry => ({ id: uid(), date: entry.date, description: String(entry.description).trim(), amount: Number(entry.amount), accountId: String(entry.accountId || ""), method: String(entry.method || ""), recurrenceId: String(entry.recurrenceId || ""), recurrenceFrequency: String(entry.recurrenceFrequency || ""), recurrenceEndDate: String(entry.recurrenceEndDate || ""), recurrenceDate: String(entry.recurrenceDate || "") }));
    category.entries.push(...next);
    category.days = category.entries.reduce((result, item) => { result[item.date] = (result[item.date] || 0) + Number(item.amount || 0); return result; }, {});
    await window.EnjoyStore.writeAsync(key, data);
    renderAll();
    return next;
  }

  async function saveExpenseOccurrence(input) { return saveExpenseOccurrences({ ...input, entries: [input.entry] }); }

  const expenseApi = Object.freeze({
    money, esc, uid, accounts, records, canWrite, expenseEnvironments, saveExpenseOccurrence, saveExpenseOccurrences,
    editExpenseEntry: row => buildDialog("expenses", row), renderAll
  });
  function recurrenceDates(start, frequency, end) {
    const result = [], first = new Date(`${start}T12:00:00`), preferredDay = first.getDate();
    for (let date = first, index = 0; index < 800 && isoDate(date) <= end; index += 1) {
      result.push(isoDate(date));
      date = frequency === "weekly" ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7) : new Date(first.getFullYear(), first.getMonth() + index + 1, Math.min(preferredDay, new Date(first.getFullYear(), first.getMonth() + index + 2, 0).getDate()));
    }
    return result;
  }
  function isoDate(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString("en-CA"); }
  function buildDialog(area, edit) {
    const isEdit = !!edit;
    const d = document.createElement("dialog");
    d.className = "fv2-dialog";
    d.setAttribute("aria-label", isEdit ? (area === "sales" ? "Editar venda" : "Editar lançamento") : (area === "sales" ? "Nova venda" : "Novo lançamento"));
    const choices = editDestinations(area);
    const chosen = edit ? `${edit.environmentId}::${edit.categoryId}` : (choices[0]?.id || "__new__");
    const currentAccount = edit?.accountId || "";
    const usableAccounts = [...accounts().filter(item => item.active || item.id === currentAccount)];
    const existingSeries = isEdit && Boolean(edit?.recurrenceFrequency);
    const currentFrequency = edit?.recurrenceFrequency || "daily";
    const frequencyLabel = { daily: "Diária", weekly: "Semanal", monthly: "Mensal" };
    const recurrenceFields = area !== "expenses" ? "" : existingSeries
      ? `<label>Frequência da série<input value="${frequencyLabel[currentFrequency] || "Recorrente"}" readonly><small>Esta ocorrência pode ser alterada individualmente. A frequência da série permanece preservada.</small></label>`
      : `<label>Frequência<select name="frequency"><option value="daily" ${currentFrequency === "daily" ? "selected" : ""}>Diária</option><option value="weekly" ${currentFrequency === "weekly" ? "selected" : ""}>Semanal</option><option value="monthly" ${currentFrequency === "monthly" ? "selected" : ""}>Mensal</option></select><small>Diária cria somente este lançamento.</small></label><label data-fv2-recurrence-end hidden>Vigência<select name="endMode"><option value="indefinite">Tempo indeterminado</option><option value="until">Até uma data</option></select></label><label data-fv2-recurrence-until hidden>Data final<input type="date" name="endDate"></label>`;
    d.innerHTML = `<form class="fv2-dialog-form" novalidate>
      <header><h2>${isEdit ? area === "sales" ? "Editar venda" : "Editar lançamento" : area === "investments" ? "Registrar investimento" : area === "sales" ? "Registrar venda" : "Adicionar despesa"}</h2><p>${isEdit ? existingSeries ? "Atualize somente esta ocorrência da série." : "Atualize este lançamento." : area === "sales" ? "A venda será registrada como ganho avulso, separada dos recebimentos de reservas." : "O registro será salvo na base financeira compartilhada do Enjoy."}</p></header>
      <div class="fv2-fields">
        ${isEdit || area === "sales" ? "" : `<label>Ambiente / categoria<select name="destination"><option value="__new__" ${chosen === "__new__" ? "selected" : ""}>+ Criar nova categoria</option>${choices.map(item => `<option value="${esc(item.id)}" ${item.id === chosen ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</select></label>
        <label>Ambiente para nova categoria<input name="newEnvironment" placeholder="Ex.: Operação"></label>
        <label>Nome da nova categoria<input name="newCategory" placeholder="Ex.: Manutenção"></label>
        ${area === "expenses" ? `<label>Classificação para nova categoria<select name="newClassification"><option value="expense">Despesa</option><option value="cost">Custo operacional</option></select></label>` : ""}`}
        <label>Data<input type="date" name="date" value="${esc(edit?.date || curr())}" required></label>
        ${recurrenceFields}
        <label>Descrição<input name="description" value="${esc(edit?.description || "")}" required maxlength="240"></label>
        <label>Valor (R$)<input type="number" min="0.01" step="0.01" name="amount" value="${esc(edit?.amount || "")}" required></label>
        <label>Conta<select name="accountId"><option value="">Sem conta informada</option>${usableAccounts.map(item => `<option value="${esc(item.id)}" ${currentAccount === item.id ? "selected" : ""}>${esc(item.name)}${item.active ? "" : " (inativa)"}</option>`).join("")}</select></label>
        <label>Forma de pagamento<input name="method" value="${esc(edit?.method || "")}" placeholder="Pix, cartão, dinheiro..."></label>
      </div>
      <p class="fv2-form-error" role="alert" hidden></p>
      <footer><button type="button" class="fv2-button secondary" data-fv2-close>Cancelar</button><button type="submit" class="fv2-button primary">Salvar lançamento</button></footer>
    </form>`;
    d.querySelector("[data-fv2-close]").addEventListener("click", () => d.close());
    d.addEventListener("click", event => { if (event.target === d) d.close(); });
    d.addEventListener("close", () => d.remove(), { once: true });
    const frequency = d.querySelector('[name="frequency"]'), recurrenceEnd = d.querySelector('[data-fv2-recurrence-end]'), recurrenceUntil = d.querySelector('[data-fv2-recurrence-until]');
    const updateRecurrenceControls = () => { if (!frequency) return; const recurring = ["weekly", "monthly"].includes(frequency.value); recurrenceEnd.hidden = !recurring; recurrenceUntil.hidden = !recurring || d.querySelector('[name="endMode"]')?.value !== "until"; };
    if (frequency) frequency.addEventListener("change", updateRecurrenceControls);
    d.querySelector('[name="endMode"]')?.addEventListener("change", updateRecurrenceControls);
    d.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget, fields = Object.fromEntries(new FormData(form));
      const error = d.querySelector(".fv2-form-error");
      const warn = message => { error.hidden = false; error.textContent = message; };
      const amount = Number(fields.amount);
      if (!canWriteFor(area)) return warn("Sem permissão para alterar lançamentos.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date || "") || !Number.isFinite(Date.parse(`${fields.date}T12:00:00Z`)) || new Date(`${fields.date}T12:00:00Z`).toISOString().slice(0, 10) !== fields.date) return warn("Informe uma data válida.");
      if (!Number.isFinite(amount) || amount <= 0) return warn("Informe um valor maior que zero.");
      if (!String(fields.description || "").trim()) return warn("Informe a descrição.");
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const data = structuredClone(source());
        let env, cat;
        if (isEdit) {
          env = data.find(item => String(item.id) === edit.environmentId);
          cat = env?.categories?.find(item => String(item.id) === edit.categoryId);
          if (!cat || String(cat.integrationId || "").startsWith("operation:")) throw new Error("Categoria indisponível para edição.");
        } else if (area === "sales") {
          env = data.find(item => normalize(item.name) === "vendas");
          if (!env) { env = { id: uid(), name: "Vendas", categories: [] }; data.push(env); }
          env.categories ||= env.categorias || [];
          cat = env.categories.find(item => item.mode === "sale" && item.flow === "in" && item.classification === "revenue");
          if (!cat) {
            cat = { id: uid(), name: "Vendas avulsas", flow: "in", classification: "revenue", mode: "sale", businessArea: "Vendas", entries: [], days: {} };
            env.categories.push(cat);
          }
        } else if (fields.destination === "__new__") {
          const environmentName = String(fields.newEnvironment || "").trim();
          const categoryName = String(fields.newCategory || "").trim();
          if (!environmentName || !categoryName) throw new Error("Informe o ambiente e a categoria.");
          env = data.find(item => normalize(item.name) === normalize(environmentName));
          if (!env) { env = { id: uid(), name: environmentName, categories: [] }; data.push(env); }
          const duplicate = (env.categories || []).find(item => normalize(item.name) === normalize(categoryName));
          if (duplicate) throw new Error("Esta categoria já existe neste ambiente. Selecione-a na lista.");
          cat = { id: uid(), name: categoryName, flow: area === "sales" ? "in" : "out", classification: area === "sales" ? "revenue" : area === "investments" ? "investment" : fields.newClassification === "cost" ? "cost" : "expense", mode: area === "sales" ? "sale" : undefined, businessArea: environmentName, entries: [], days: {} };
          env.categories ||= [];
          env.categories.push(cat);
        } else {
          const [envId, catId] = String(fields.destination || "").split("::");
          env = data.find(item => String(item.id) === envId);
          cat = env?.categories?.find(item => String(item.id) === catId);
          const incompatible = area === "sales"
            ? cat?.flow !== "in" || cat?.classification !== "revenue" || cat?.mode !== "sale"
            : cat?.flow === "in" || (area === "investments") !== (cat?.classification === "investment");
          if (!cat || incompatible || String(cat.integrationId || "").startsWith("operation:")) throw new Error("Categoria incompatível ou indisponível.");
        }
        if (!Array.isArray(cat.entries) || !cat.entries.length) {
          cat.entries = Object.entries(cat.days || {}).map(([date, value]) => ({ id: uid(), date, description: cat.name, amount: Number(value), accountId: cat.accountId || "", method: cat.method || "" }));
        }
        const frequency = area === "expenses" ? (existingSeries ? currentFrequency : fields.frequency || "daily") : "daily";
        const recurring = ["weekly", "monthly"].includes(frequency);
        const endDate = recurring ? (fields.endMode === "until" ? fields.endDate : isoDate(new Date(new Date(`${fields.date}T12:00:00`).getFullYear(), new Date(`${fields.date}T12:00:00`).getMonth() + 12, new Date(`${fields.date}T12:00:00`).getDate()))) : fields.date;
        if (recurring && !existingSeries && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate || "") || endDate < fields.date)) throw new Error("Informe uma data final válida para a recorrência.");
        const dates = recurring && !existingSeries ? recurrenceDates(fields.date, frequency, endDate) : [fields.date];
        const seriesId = recurring ? (existingSeries ? String(edit.recurrenceId || uid()) : uid()) : "";
        const recurrence = recurring ? { recurrenceId: seriesId, recurrenceFrequency: frequency, recurrenceEndDate: fields.endMode === "until" ? endDate : "", recurrenceDate: fields.date } : { recurrenceId: "", recurrenceFrequency: "", recurrenceEndDate: "", recurrenceDate: "" };
        const entry = { date: fields.date, description: String(fields.description).trim(), amount, accountId: String(fields.accountId || ""), method: String(fields.method || "") };
        if (isEdit) {
          const original = cat.entries[edit.index];
          if (!original || original.groupId) throw new Error("O lançamento mudou. Atualize a tela antes de editar.");
          cat.entries[edit.index] = { ...original, ...entry, ...(existingSeries ? {} : recurrence), id: original.id || uid() };
          if (recurring && !existingSeries) cat.entries.push(...dates.filter(date => date > fields.date).map(date => ({ id: uid(), ...entry, ...recurrence, date, recurrenceDate: date })));
        } else cat.entries.push(...dates.map(date => ({ id: uid(), ...entry, date, recurrenceId: seriesId, recurrenceFrequency: recurring ? frequency : "", recurrenceEndDate: recurring && fields.endMode === "until" ? endDate : "", recurrenceDate: recurring ? date : "" })));
        const updated = {};
        for (const item of cat.entries) updated[item.date] = (updated[item.date] || 0) + Number(item.amount || 0);
        cat.days = updated;
        await window.EnjoyStore.writeAsync(key, data);
        d.close();
        renderAll();
        window.EnjoyUI?.success?.("Lançamento salvo.");
      } catch (err) { warn(err?.message || "Não foi possível salvar o lançamento."); }
      finally { if (d.isConnected) button.disabled = false; }
    });
    document.body.append(d);
    d.showModal();
  }
  function exportCSV(area) {
    const cols = ["data", "descricao", "classificacao", "ambiente", "categoria", "conta", "forma", "tipo", "valor"];
    const line = value => { const text = String(value ?? ""); const safe = ["=", "+", "-", "@", "\t", "\r"].includes(text.charAt(0)) ? "'" + text : text; return '"' + safe.replaceAll('"', '""') + '"'; };
    const rows = filtered(area).map(row => [row.date, row.description, row.classification, row.environment, row.category, accountLabel(row.accountId), row.method, row.flow === "in" ? "Entrada" : "Saída", row.amount.toFixed(2)].map(line).join(";"));
    const csv = "\ufeff" + [cols.join(";"), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `enjoy-financeiro-v2-${area}.csv`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function onClick(area, event) {
    const el = event.target.closest("[data-fv2-action]");
    if (!el) return;
    const action = el.dataset.fv2Action;
    const state = selection(area);
    if (action === "gain-tab") { selection("gains").gainTab = el.dataset.fv2Tab === "sales" ? "sales" : "gains"; render("gains"); return; }
    if (action === "reset") { settings.delete(area); render(area); return; }
    if (action === "sort") { state.descending = !state.descending; renderContent(area); return; }
    if (action === "export") { exportCSV(area); return; }
    if (action === "new" && canWriteFor(area) && ["expenses", "investments", "sales"].includes(area)) { buildDialog(area, null); return; }
    if (action === "edit" && canWriteFor(area)) {
      const row = records().find(item => item.environmentId === el.dataset.environmentId && item.categoryId === el.dataset.categoryId && item.index === Number(el.dataset.entryIndex));
      if (row && !row.generated && !row.groupId && (row.flow === "out" || row.isSale)) buildDialog(area, row);
      return;
    }
    if (action === "reservation") {
      const id = el.dataset.reservationId;
      const dataKey = window.EnjoyOperationsData?.KEYS?.reservations;
      const reservation = window.EnjoyOperationsData?.records?.(dataKey)?.find(item => String(item.id) === String(id));
      if (!reservation) { window.EnjoyUI?.warning?.("A reserva vinculada não está disponível."); return; }
      window.EnjoyNavigation.open("reservations");
      const opened = window.EnjoyModules.reservations?.focusReservation?.(id, reservation.checkin || "");
      if (opened === false) window.EnjoyUI?.warning?.("Reserva não encontrada.");
    }
  }
  function onFilter(area, event) {
    const input = event.target.closest("[data-fv2-filter]");
    if (!input) return;
    const state = selection(area);
    state[input.dataset.fv2Filter] = input.value;
    if (event.type === "input" && input.dataset.fv2Filter === "query") renderContent(area);
    else render(area);
  }
  function mount(root, area) {
    if (!root || !areas[area]) return;
    // Uma única área visível por vez no laboratório; evita remontagens concorrentes.
    roots.clear();
    roots.set(area, root);
    if (!root.dataset.fv2Bound) {
      root.dataset.fv2Bound = "1";
      root.addEventListener("click", event => onClick(root.dataset.fv2ViewArea || root.dataset.fv2Area, event));
      root.addEventListener("change", event => onFilter(root.dataset.fv2ViewArea || root.dataset.fv2Area, event));
      root.addEventListener("input", event => { if (event.target.matches('[data-fv2-filter="query"]')) onFilter(root.dataset.fv2ViewArea || root.dataset.fv2Area, event); });
    }
    root.dataset.fv2Area = area;
    if (!listening) {
      listening = true;
      window.EnjoyStore.subscribe(key, renderAll);
      window.EnjoyStore.subscribe(window.EnjoyDataKeys.financeSettings, renderAll);
      if (window.EnjoyOperationsData?.KEYS?.reservations) window.EnjoyStore.subscribe(window.EnjoyOperationsData.KEYS.reservations, renderAll);
      window.addEventListener("enjoy:lodging-change", renderAll);
    }
    render(area);
  }
  window.EnjoyFinance = Object.freeze({ mount, records, filtered, totals, inArea, matches, expenseEnvironments, saveExpenseOccurrence, saveExpenseOccurrences, editExpenseEntry: row => buildDialog("expenses", row) });
})();
