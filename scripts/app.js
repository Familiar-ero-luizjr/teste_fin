(() => {
  const pages = {
    overview: ['Visão geral', 'Resumo de ganhos, despesas e investimentos com filtros cumulativos.'],
    gains: ['Ganhos', 'Consulte as entradas registradas e recebimentos de reservas.'],
    expenses: ['Despesas', 'Controle custos e despesas na tabela geral.'],
    investments: ['Investimentos', 'Acompanhe investimentos sem misturar com o saldo operacional.']
  };
  const root = document.getElementById('finance-root');
  const sidebar = document.getElementById('sidebar');
  function open(page) {
    if (!pages[page]) page = 'overview';
    document.getElementById('page-title').textContent = pages[page][0];
    document.getElementById('page-description').textContent = pages[page][1];
    document.title = `${pages[page][0]} · Enjoy Gestão Financeiro`;
    document.querySelectorAll('[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
      item.setAttribute('aria-current', item.dataset.page === page ? 'page' : 'false');
    });
    root.replaceChildren();
    window.EnjoyFinance.mount(root, page);
    sidebar.classList.remove('mobile-open');
    history.replaceState(null, '', `#${page}`);
  }
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => open(button.dataset.page)));
  document.getElementById('collapse').addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    document.getElementById('collapse').textContent = collapsed ? '›' : '‹';
    document.getElementById('collapse').setAttribute('aria-expanded', String(!collapsed));
  });
  document.getElementById('mobile-menu').addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  window.addEventListener('hashchange', () => open(location.hash.slice(1)));
  open(location.hash.slice(1) || 'overview');
})();
