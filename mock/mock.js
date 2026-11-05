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
    const gains = Array.from({length: 77}, (_, i) => {
      const date = `2026-09-${String(4 + (i % 25)).padStart(2,'0')}`;
      const check = new Date(date+'T12:00:00'); check.setDate(check.getDate()+1);
      const checkout = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
      return { id: uid('booking', i), date, checkout, description: `Booking — ${bookings[i % bookings.length]}`, amount: [304.47,481.95,160.65,340,270,520][i%6], accountId: 'hero', method: 'Plataforma', confirmed: false };
    });
    const direct = [
      {id:'direct-0',date:'2026-10-21',checkout:'2026-10-24',description:'Direta — Camila Andrade',amount:210,accountId:'picpay',method:'Pix',confirmed:true,receiptDate:'2026-10-21'},
      {id:'direct-1',date:'2026-10-26',checkout:'2026-10-28',description:'Direta — Pedro Lima',amount:160,accountId:'caixa',method:'Dinheiro',confirmed:true,receiptDate:'2026-10-26'},
      {id:'direct-2',date:'2026-11-03',checkout:'2026-11-06',description:'Direta — Bruna Silva',amount:320,accountId:'inter',method:'Transferência',confirmed:false}
    ];
    return [
      { id:'env-pay', name:'Pagamentos', categories:[{ id:'cat-general', name:'Geral', flow:'out', classification:'expense', entries:expenses }] },
      { id:'env-stay', name:'Hospedagem', categories: [...gains.map((entry, i) => ({ id:uid('cat-booking',i), name:entry.description, flow:'in', classification:'revenue', reservationId:uid('reservation',i), entries:[entry] })), ...direct.map((entry,i)=>({id:uid('cat-direct',i),name:entry.description,flow:'in',classification:'revenue',reservationId:uid('direct-reservation',i),entries:[entry]}))] },
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
  // A ponte postMessage funciona inclusive quando file:// atribui origens
  // diferentes aos HTMLs. O index é o dono do mock enquanto estiver aberto.
  const inFrame = Boolean(window.parent && window.parent !== window);
  let resolveReady;
  window.EnjoyMockReady = new Promise(resolve => { resolveReady = resolve; });
  window.addEventListener?.('message', event => {
    const msg = event.data;
    if (!msg || msg.source !== 'enjoy-financeiro-lab') return;
    if (inFrame && event.source !== window.parent) return;
    if (!inFrame && event.source !== document.getElementById('module-frame')?.contentWindow) return;
    if (!inFrame && msg.type === 'request') {
      event.source?.postMessage({source:'enjoy-financeiro-lab',type:'snapshot',data:structuredClone(data)},'*');
    }
    if (!inFrame && msg.type === 'write') window.EnjoyStore.writeAsync(KEY,msg.data);
    if (inFrame && msg.type === 'snapshot') {
      data = structuredClone(msg.data);
      notify(KEY);
      resolveReady();
    }
  });
  if (inFrame) {
    window.parent.postMessage({source:'enjoy-financeiro-lab',type:'request'},'*');
    setTimeout(resolveReady,800); // fallback ao abrir como HTML isolado
  } else resolveReady();
  const originalWrite = window.EnjoyStore.writeAsync;
  window.EnjoyStore.writeAsync = async (key,value) => {
    await originalWrite(key,value);
    if (inFrame && key===KEY) window.parent.postMessage({source:'enjoy-financeiro-lab',type:'write',data:structuredClone(value)},'*');
  };
  window.EnjoyDataKeys = { financeSettings: 'enjoy-finance-settings' };
  window.EnjoyReceipts = { accounts: () => accountList, accountName: id => accountList.find(a => a.id === id)?.name || 'Sem conta informada', reservationIdForMovement: category => category.reservationId || '' };
  const reservations = [...Array.from({length:77},(_,i)=>({id:uid('reservation',i),name:bookings[i%bookings.length],channel:'Booking',checkin:`2026-09-${String(4+i%25).padStart(2,'0')}`})),{id:'direct-reservation-0',name:'Camila Andrade',channel:'Direta',checkin:'2026-10-21'},{id:'direct-reservation-1',name:'Pedro Lima',channel:'Direta',checkin:'2026-10-26'},{id:'direct-reservation-2',name:'Bruna Silva',channel:'Direta',checkin:'2026-11-03'}];
  window.EnjoyOperationsData = { KEYS:{reservations:'mock-reservations'}, records: key => key === 'mock-reservations' ? reservations : [] };
  window.EnjoyPermissions = { can: () => true };
  window.EnjoyAccess = { canModule: () => true };
  // A ação original "Abrir reserva" é preservada por um modal mock,
  // sem carregar ou modificar o módulo Hospedagem real.
  window.EnjoyNavigation = { open: () => {} };
  window.EnjoyModules = { reservations: { focusReservation(id) {
    const reservation = reservations.find(item => item.id === id);
    if (!reservation) return false;
    const dialog = document.createElement('dialog');
    dialog.className = 'fv2-dialog';
    const form = document.createElement('div');
    form.className = 'fv2-dialog-form';
    const header = document.createElement('header');
    const title = document.createElement('h2'); title.textContent = 'Reserva vinculada · Mock';
    const intro = document.createElement('p'); intro.textContent = 'Prévia local da reserva de origem. Nenhum dado real é alterado.';
    header.append(title,intro);
    const details = document.createElement('div'); details.className = 'fv2-fields';
    for (const [label,value] of [['Hóspede',reservation.name],['Origem',reservation.channel],['Check-in',reservation.checkin.split('-').reverse().join('/')],['Identificador',reservation.id]]) {
      const item=document.createElement('label');item.textContent=label;
      const input=document.createElement('input');input.value=value;input.readOnly=true;item.append(input);details.append(item);
    }
    const footer=document.createElement('footer');
    const close=document.createElement('button');close.type='button';close.className='fv2-button secondary';close.textContent='Fechar';close.addEventListener('click',()=>dialog.close());footer.append(close);
    form.append(header,details,footer);dialog.append(form);document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();return true;
  } } };
  window.EnjoyUI = { success: message => toast(message), warning: message => toast(message) };
  function toast(message) { const el=document.getElementById('toast'); if (!el) return; el.textContent=message; el.classList.add('visible'); setTimeout(()=>el.classList.remove('visible'),3500); }
  window.EnjoyLab = { reset() { localStorage.removeItem(STORE_KEY); location.reload(); }, exportJSON() { return JSON.stringify(data,null,2); } };
})();
