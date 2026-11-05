# Ganhos — protótipo modular V3

**Área:** `gains`. Atualização isolada do módulo Ganhos.

## Responsabilidades

- **Recebimentos de reservas:** exibição/consulta de origem Booking ou direta, conta, valor bruto, comissão, líquido, status e previsão de repasse. Não existe cadastro de reservas em Ganhos.
- **Edição vinculada:** o botão «Editar reserva» abre um **modal demonstrativo** sobre Ganhos; neste laboratório, ele atualiza o lançamento de origem no mock compartilhado, e o módulo é recalculado automaticamente. **Não é o modal verdadeiro do PMS** e não integra um backend.
- **Vendas:** cadastro rápido (descrição, categoria, valor, data), com subcategoria, itens, vínculo a hóspede/reserva e observações opcionais.
- **Recebimentos:** podem ser vários por venda, com valor, data, conta e forma independentes. Total vendido e recebimento efetivo não se somam como se fossem duas receitas.
- **Edição completa:** correções financeiras exigem confirmação; pagamentos e devoluções são preservados no registro e recebem evento de histórico da alteração.
- **Devoluções:** parciais ou totais, limitadas ao recebido e com motivo, data, conta e forma.
- **Exclusão/cancelamento:** sem movimentações, a venda pode ser excluída; com movimentações, deve ser cancelada preservando histórico.
- **Categorias:** não exibir «Ambiente». Categoria obrigatória e subcategoria opcional; cadastro local de classificações no navegador para simulação.
- **Filtros, totais, tabela, ordenação e CSV:** mantidos na estrutura visual do laboratório Financeiro.

## Contratos e limites

- Código funcional e estilos somente em `modulos/ganhos/index.html`.
- Dados compartilhados pelo `mock/mock.js` (somente semeadura de checkout Booking e reservas diretas de demonstração foi ampliada).
- `index.html`, `scripts/app.js`, os demais módulos e seus contratos não precisam ser alterados.
- Regra Booking: primeiro dia **útil semanal** do mês seguinte ao checkout; feriados bancários precisam de validação manual. A previsão é *não confirmada* até conciliação.
- Sem API, sem Supabase, sem PMS real. Alterações locais do mock podem ser restauradas com `EnjoyLab.reset()` na tela principal.
