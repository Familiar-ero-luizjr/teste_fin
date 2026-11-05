# Enjoy Gestão V2 — Laboratório Financeiro Modular

Abra **`index.html`** no Chrome ou Edge. O menu inicia na Visão geral e carrega cada módulo na área de conteúdo.

## Estrutura

```text
index.html                         Menu e header, sem regra financeira
modulos/
  visao-geral/index.html          HTML, estilos e funcionalidades incorporados
  visao-geral/CONTRATO.md
  ganhos/index.html               HTML, estilos e funcionalidades incorporados
  ganhos/CONTRATO.md
  despesas/index.html             HTML, estilos e funcionalidades incorporados
  despesas/CONTRATO.md
  investimentos/index.html        HTML, estilos e funcionalidades incorporados
  investimentos/CONTRATO.md
mock/mock.js                      Único arquivo de dados compartilhado pelos quatro módulos
styles/                            Apenas estilos do menu principal
scripts/app.js                    Apenas navegação do menu principal
AUDITORIA_FUNCIONAL.md            Auditoria da paridade funcional
```

Cada módulo pode ser aberto diretamente e **editado isoladamente**. Os HTMLs trazem todo o CSS e JavaScript financeiro original incorporados, e não importam arquivos de outros módulos. Só `../../mock/mock.js` é externo.

Quando os HTMLs são abertos **pelo index**, a pasta mock compartilha os registros entre os módulos por mensagens locais entre janelas. Ao abrir um HTML sozinho, ele funciona com mock próprio, que pode ter histórico separado no navegador.

## Operação e segurança

- Cadastros, alterações e recorrências só mudam dados fictícios locais.
- O menu não navega para módulos externos ao Financeiro.
- Não há API, autenticação, Supabase ou recursos CDN.
- Para restaurar o mock inicial pelo menu, abra o console (F12) e execute `EnjoyLab.reset()`.
- Para alterar exclusivamente um módulo, edite seu `index.html` e seu `CONTRATO.md`; não é preciso rodar o gerador.

O ZIP de uso foi empacotado sem geradores nem fontes auxiliares: cada tela fica totalmente editável em sua própria pasta, sem risco de uma regeneração substituir suas alterações.
