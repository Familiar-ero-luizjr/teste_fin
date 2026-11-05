/* Adaptador exclusivamente local: mantém o contrato de dados que o Financeiro V2 utiliza. */
(() => {
  'use strict';
  const KEY = 'enjoy_resumo_movimentacoes_v1';
  const STORE_KEY = 'enjoy_financeiro_lab_mock_v1';
  const accountList = [
    { id: 'picpay', name: 'Picpay', active: true },
    { id: 'hero', name: 'Conta Hero', active: true },
    { id: 'caixa', name: 'Caixa', active: true },
    { id: 'inter', name: 'Banco Inter', active: true }
  ];
  const names = ['Carlos Magno - verificar', 'Contrução: Atlantico Material de Construções', 'Interruptor 3 pontos Amazon', 'Material de limpeza', 'Conta de energia', 'Produtos de higiene', 'Manutenção do ar-condicionado', 'Papelaria e escritório', 'Compra de lâmpadas', 'Lavanderia', 'Serviço hidráulico', 'Internet do hostel', 'Reposição de enxoval', 'Suprimentos da cozinha', 'Materiais de pintura', 'Tarifa de serviços', 'Material elétrico', 'Peças de reposição'];
  const amounts = [25, 120, 108.45, 74.90, 389.99, 62.30, 255, 35.20, 89.60, 145, 210, 129.90, 780, 189.55, 345.90, 19.99, 199.75, 802.80];
  const bookings = ['Alloyr Machado Barbosa', 'Anna Thalita Dos Santos', 'Deyse Conceição', 'Fábio da Silva', 'Maria Eduarda', 'João Pereira', 'Luana Santos', 'Alexsandro Souza', 'Carlos Augusto', 'Ana Paula'];
  const uid = (prefix, i) => `${prefix}-${i}`;
  function seed() {
    const expenses = names.map((description, i) => ({ id: uid('expense', i), date: `2026-10-${String(14 + Math.floor(i / 3)).padStart(2, '0')}`, description, amount: amounts[i], accountId: 'picpay', method: i < 3 ? (i === 0 ? 'Pix' : 'pix') : 'Pix' }));
    const gains = Array.from({length: 77}, (_, i) => ({ id: uid('booking', i), date: `2026-09-${String(4 + (i % 25)).padStart(2,'0')}`, description: `Booking — ${bookings[i % bookings.length]}`, amount: [304.47,481.95,160.65,340,270,520][i%6], accountId: 'hero', method: i%3===0 ? 'Plataforma' : 'Não informada' }));
    return [
      { id:'env-pay', name:'Pagamentos', categories:[{ id:'cat-general', name:'Geral', flow:'out', classification:'expense', entries:expenses }] },
      { id:'env-stay', name:'Hospedagem', categories: gains.map((entry, i) => ({ id:uid('cat-booking',i), name:entry.description, flow:'in', classification:'revenue', reservationId:uid('reservation',i), entries:[entry] })) },
      { id:'env-sales', name:'Vendas', categories:[{id:'cat-sales',name:'Vendas avulsas',flow:'in',classification:'revenue',mode:'sale',entries:[]}] },
      { id:'env-invest', name:'Investimentos', categories:[{id:'cat-invest',name:'Equipamentos',flow:'out',classification:'investment',entries:[]}] }
    ];
  }
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY)); if (!Array.isArray(data)) data = seed(); }
  catch { data = seed(); }
  const subscriptions = new Map();
  const notify = key => (subscriptions.get(key) || []).forEach(fn => fn());
  window.EnjoyStore = {
    read(key, fallback) { return key === KEY ? structuredClone(data) : fallback; },
    async writeAsync(key, value) { if (key !== KEY) throw new Error('Este laboratório só permite alterar dados mock.'); data = structuredClone(value); try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* modo de navegação sem persistência */ } notify(key); },
    subscribe(key, fn) { const list = subscriptions.get(key) || []; list.push(fn); subscriptions.set(key,list); return () => subscriptions.set(key, list.filter(x => x !== fn)); }
  };
  window.EnjoyDataKeys = { financeSettings: 'enjoy-finance-settings' };
  window.EnjoyReceipts = { accounts: () => accountList, accountName: id => accountList.find(a => a.id === id)?.name || 'Sem conta informada', reservationIdForMovement: category => category.reservationId || '' };
  const reservations = Array.from({length:77},(_,i)=>({id:uid('reservation',i),name:bookings[i%bookings.length],channel:'Booking',checkin:`2026-09-${String(4+i%25).padStart(2,'0')}`}));
  window.EnjoyOperationsData = { KEYS:{reservations:'mock-reservations'}, records: key => key === 'mock-reservations' ? reservations : [] };
  window.EnjoyPermissions = { can: () => true };
  window.EnjoyAccess = { canModule: module => module !== 'reservations' };
  window.EnjoyNavigation = { open: () => {} };
  window.EnjoyUI = { success: message => toast(message), warning: message => toast(message) };
  function toast(message) { const el=document.getElementById('toast'); el.textContent=message; el.classList.add('visible'); setTimeout(()=>el.classList.remove('visible'),3500); }
  window.EnjoyLab = { reset() { localStorage.removeItem(STORE_KEY); location.reload(); }, exportJSON() { return JSON.stringify(data,null,2); } };
})();
