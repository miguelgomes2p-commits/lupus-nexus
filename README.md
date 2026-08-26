# SCL

Você é um Product Designer Sênior, UX/UI Specialist, Software Architect, Front-End Engineer, Back-End Engineer e especialista em CRM comercial.

Sua missão é CRIAR DO ZERO um CRM completo para a LUPUS ASSESSORIA, com visual premium, moderno, animado, corporativo e altamente funcional, utilizando Lovable + Lovable Cloud como base de persistência e estrutura de dados.

O objetivo NÃO é criar um protótipo visual.

O objetivo é construir um CRM real, utilizável, operacional, escalável e com persistência funcional, pronto para uso comercial.

==================================================

1. CONTEXTO DA MARCA

==================================================

Marca: LUPUS

Segmento: Assessoria / Marketing / Comercial / Gestão de Leads / Operação de clientes

Perfil visual desejado:

- premium

- tecnológico

- corporativo moderno

- impactante

- elegante

- agressivo no bom sentido

- visual executivo com aparência de software SaaS de alto nível

A identidade visual deve transmitir:

- autoridade

- inteligência

- performance

- controle

- crescimento

- organização

- estratégia

==================================================

2. IDENTIDADE VISUAL OBRIGATÓRIA

==================================================

Utilizar a identidade Lupus com base principal em:

- Vermelho principal: #E10600

- Preto: #0A0A0A

- Branco: #FFFFFF

- Cinzas de apoio: #111111, #1A1A1A, #2A2A2A, #F5F5F5, #D9D9D9

Fontes preferenciais:

- Inter

- Poppins

- Montserrat

Estilo visual:

- SaaS premium

- dashboard executivo

- glassmorphism leve em pontos estratégicos

- sombras suaves

- bordas arredondadas modernas

- ícones minimalistas e elegantes

- animações refinadas

- contraste alto

- excelente hierarquia visual

- UX limpa, mas não sem graça

- aparência de produto tecnológico de alto valor

Criar uma interface memorável, com sensação de software robusto e confiável.

==================================================

3. EXPERIÊNCIA VISUAL E ANIMAÇÕES

==================================================

A interface deve ser altamente visual e atrativa, porém sem prejudicar performance ou usabilidade.

Aplicar:

- transições suaves entre páginas e estados

- hover states elegantes

- animação de cards ao carregar

- microinterações em botões

- feedback visual em ações de salvar, editar, mover e excluir

- skeleton loading

- estados vazios bem desenhados

- toasts elegantes

- motion sutil em KPIs e gráficos

- transições suaves em sidebar, modais e drawers

Não exagerar.

A animação deve reforçar percepção de qualidade.

==================================================

4. OBJETIVO DO SISTEMA

==================================================

Criar um CRM completo da Lupus para:

- captar e organizar leads

- acompanhar pipeline comercial

- controlar follow-up

- registrar interações

- gerir tarefas

- acompanhar oportunidades

- visualizar indicadores em dashboard

- organizar clientes e contatos

- acompanhar status comerciais

- gerar controle de operação comercial de ponta a ponta

O sistema deve funcionar como um CRM real e legítimo.

==================================================

5. ESTRUTURA GERAL DO SISTEMA

==================================================

Criar a aplicação completa com as seguintes áreas:

1. Login / Autenticação

2. Dashboard Geral

3. Leads

4. Pipeline Comercial

5. Oportunidades

6. Clientes

7. Contatos

8. Tarefas / Follow-up

9. Atividades / Histórico

10. Agenda / Próximas ações

11. Relatórios

12. Configurações

13. Usuários / Responsáveis

14. Tags / Origens / Etapas

15. Perfil / Preferências

==================================================

6. ESTRUTURA DE NAVEGAÇÃO

==================================================

Criar layout principal com:

- sidebar fixa elegante e premium

- topo com busca global

- perfil do usuário

- notificações

- acesso rápido para criar lead, tarefa ou oportunidade

- área central responsiva

- breadcrumbs

- alternância fluida entre módulos

Sidebar com ícones sofisticados e labels claros.

Navegação deve ser intuitiva e rápida.

==================================================

7. BANCO DE DADOS / LOVABLE CLOUD

==================================================

Estruturar a persistência no Lovable Cloud com modelagem real de dados.

Criar as seguintes entidades/tabelas com relacionamento funcional:

USERS

- id

- name

- email

- password/auth reference

- role

- avatar_url

- is_active

- created_at

- updated_at

LEADS

- id

- name

- company_name

- email

- phone

- whatsapp

- source_id

- status

- owner_id

- notes

- temperature

- priority

- estimated_value

- cnpj

- instagram

- website

- city

- state

- created_at

- updated_at

- last_interaction_at

- next_action_at

CLIENTS

- id

- lead_id (nullable if created directly)

- company_name

- trade_name

- contact_name

- email

- phone

- whatsapp

- cnpj

- segment

- status

- owner_id

- contract_value

- started_at

- notes

- created_at

- updated_at

CONTACTS

- id

- lead_id (nullable)

- client_id (nullable)

- name

- email

- phone

- role

- is_primary

- created_at

- updated_at

PIPELINE_STAGES

- id

- name

- order_index

- color

- is_active

- created_at

- updated_at

OPPORTUNITIES

- id

- lead_id

- client_id (nullable)

- title

- description

- value

- stage_id

- status

- probability

- owner_id

- expected_close_date

- lost_reason

- won_at

- lost_at

- created_at

- updated_at

- last_moved_at

TASKS

- id

- title

- description

- related_lead_id

- related_opportunity_id

- related_client_id

- assigned_to

- status

- priority

- due_date

- completed_at

- created_at

- updated_at

ACTIVITIES

- id

- type

- description

- lead_id

- opportunity_id

- client_id

- user_id

- metadata_json

- created_at

NOTES

- id

- lead_id

- opportunity_id

- client_id

- user_id

- content

- created_at

- updated_at

TAGS

- id

- name

- color

- created_at

- updated_at

LEAD_TAGS

- id

- lead_id

- tag_id

SOURCES

- id

- name

- description

- created_at

- updated_at

NOTIFICATIONS

- id

- user_id

- title

- message

- type

- is_read

- created_at

SETTINGS

- id

- key

- value

- updated_at

ACTIVITY_LOG

- id

- entity_type

- entity_id

- action_type

- old_value_json

- new_value_json

- user_id

- created_at

Garantir relacionamento coerente entre as tabelas.

==================================================

8. AUTENTICAÇÃO E CONTROLE DE ACESSO

==================================================

Implementar:

- tela de login premium

- tela de recuperação de acesso

- proteção de rotas

- sessão persistente

- logout funcional

- perfis de usuário:

  - admin

  - gestor

  - comercial

Permissões:

- admin pode ver e editar tudo

- gestor pode ver equipe e operação

- comercial vê prioritariamente seus próprios leads, tarefas e oportunidades

==================================================

9. DASHBOARD GERAL

==================================================

Criar dashboard executivo com dados reais do banco.

KPIs principais:

- total de leads

- leads novos no período

- oportunidades abertas

- valor total em pipeline

- oportunidades ganhas

- oportunidades perdidas

- taxa de conversão

- tarefas vencidas

- tarefas para hoje

- leads sem follow-up

- performance por responsável

- leads por origem

- oportunidades por etapa

Componentes visuais:

- cards de KPI premium

- gráfico de leads por período

- gráfico de pipeline por etapa

- gráfico de conversão

- ranking de responsáveis

- lista de tarefas urgentes

- lista de leads recentes

- lista de oportunidades quentes

Dashboard deve ser bonito, extremamente claro e conectado aos dados reais.

==================================================

10. MÓDULO DE LEADS

==================================================

Criar módulo completo de gestão de leads com:

- tabela elegante

- modo cards

- busca

- filtros

- ordenação

- paginação ou carregamento eficiente

- criação de lead

- edição de lead

- exclusão de lead

- ficha detalhada do lead

- atribuição de responsável

- alteração de status

- alteração de prioridade

- tags

- origem

- valor estimado

- próximos passos

- última interação

- próxima ação

A ficha do lead deve conter:

- dados completos

- histórico

- tarefas vinculadas

- anotações

- oportunidades relacionadas

- timeline visual

- botões de ação rápida

Validações:

- email válido

- telefone formatado

- campos obrigatórios

- prevenção de duplicidade por email, telefone ou CNPJ quando aplicável

==================================================

11. PIPELINE COMERCIAL

==================================================

Criar pipeline estilo Kanban premium e funcional.

Requisitos:

- colunas por etapa

- cards arrastáveis com drag and drop real

- mover card entre etapas atualizando banco

- persistir mudança após refresh

- mostrar valor por card

- responsável

- prioridade

- data da última interação

- lead associado

- probabilidade

- etiqueta visual de temperatura

Ao mover card:

- salvar nova etapa

- atualizar last_moved_at

- gerar log no ACTIVITY_LOG

- atualizar dashboard

- atualizar histórico da oportunidade

Cada coluna deve mostrar:

- nome da etapa

- quantidade de oportunidades

- soma de valor total

Abrir detalhes em modal ou drawer lateral com:

- informações completas

- edição

- histórico

- tarefas

- notas

- ações rápidas

==================================================

12. OPORTUNIDADES

==================================================

Criar módulo completo de oportunidades com:

- listagem

- criação

- edição

- exclusão

- filtros

- busca

- vinculação a lead

- vinculação a cliente quando necessário

- valor

- probabilidade

- data esperada de fechamento

- status

- motivo de perda

- marcação como ganho/perdido

Regras:

- não permitir oportunidade inválida

- toda oportunidade deve ter contexto comercial claro

- mudança de status deve refletir em logs e dashboard

==================================================

13. CLIENTES

==================================================

Criar módulo de clientes com:

- cadastro

- edição

- busca

- filtros

- ficha detalhada

- informações da empresa

- contato principal

- valor de contrato

- status

- observações

- histórico relacionado

- oportunidades anteriores

- tarefas e atividades vinculadas

Permitir conversão de lead em cliente.

Ao converter, manter histórico.

==================================================

14. CONTATOS

==================================================

Criar módulo de contatos vinculados a leads ou clientes.

Permitir:

- múltiplos contatos por empresa

- indicar contato principal

- cargo/função

- telefone

- email

- observações

==================================================

15. TAREFAS E FOLLOW-UP

==================================================

Criar sistema funcional de tarefas com:

- criar tarefa

- editar tarefa

- concluir tarefa

- excluir tarefa

- vincular a lead/oportunidade/cliente

- prioridade

- status

- vencimento

- responsável

- filtros por hoje, atrasadas, futuras, concluídas

Criar alertas visuais para:

- follow-up atrasado

- tarefa vencida

- lead sem contato

- oportunidade parada

Criar botão rápido:

- “agendar próxima ação”

- “registrar contato”

- “criar tarefa”

==================================================

16. ATIVIDADES E HISTÓRICO

==================================================

Criar timeline completa de atividades.

Registrar automaticamente:

- lead criado

- lead editado

- lead convertido

- oportunidade criada

- oportunidade movida

- tarefa criada

- tarefa concluída

- anotação criada

- cliente criado

- alteração de responsável

- alteração de status

- alteração de etapa

Timeline deve ser bonita, organizada e fácil de ler.

==================================================

17. AGENDA / PRÓXIMAS AÇÕES

==================================================

Criar visão de agenda com:

- tarefas do dia

- próximos follow-ups

- vencidos

- agenda semanal

- agenda por responsável

Permitir:

- abrir item

- concluir

- editar

- reagendar

==================================================

18. RELATÓRIOS

==================================================

Criar módulo de relatórios com dados reais, incluindo:

- leads por origem

- leads por responsável

- oportunidades por etapa

- taxa de conversão

- ganho vs perda

- volume por período

- atividades por responsável

- tarefas concluídas vs vencidas

- pipeline por valor

- motivos de perda

Adicionar filtros por:

- período

- responsável

- origem

- etapa

- status

==================================================

19. CONFIGURAÇÕES

==================================================

Criar painel de configurações com:

- gestão de usuários

- gestão de etapas do pipeline

- gestão de tags

- gestão de origens

- preferências gerais

- configurações visuais básicas

- permissões por perfil

Etapas do pipeline devem ser configuráveis:

- criar

- editar

- reordenar

- ativar/desativar

==================================================

20. BUSCA GLOBAL

==================================================

Criar busca global funcional no topo do sistema.

Deve buscar por:

- leads

- clientes

- contatos

- oportunidades

- tarefas

Resultados rápidos e úteis, com navegação direta.

==================================================

21. UX / UI REFINADA

==================================================

Toda a aplicação deve ter:

- visual sofisticado

- responsividade real

- excelente hierarquia

- modais refinados

- drawers laterais elegantes

- tabelas bonitas

- formulários premium

- estados vazios bem desenhados

- mensagens claras

- validações amigáveis

- confirmação antes de excluir

- feedback de loading

- feedback de sucesso e erro

- prevenção contra bugs visuais ou inconsistência de estado

==================================================

22. COMPONENTIZAÇÃO E ARQUITETURA

==================================================

Construir com arquitetura limpa e escalável.

Separar:

- componentes UI

- páginas

- serviços de dados

- hooks/estado

- validações

- helpers/formatadores

Criar componentes reutilizáveis como:

- KPI cards

- tables

- filters bar

- empty state

- form fields

- modals

- drawers

- pipeline cards

- timeline items

- toasts

- badges

- tabs

- charts containers

==================================================

23. REGRAS DE NEGÓCIO ESSENCIAIS

==================================================

Implementar regras reais:

- dados devem persistir após refresh

- não usar apenas mock visual

- não permitir inconsistência entre tela e banco

- não permitir drag and drop apenas visual

- toda edição deve salvar de verdade

- exclusão deve atualizar interface e banco

- gerar logs de ações importantes

- timestamps automáticos

- impedir duplicidade relevante

- filtros precisam funcionar de verdade

- dashboards precisam refletir dados reais

==================================================

24. PÁGINA DE LOGIN

==================================================

Criar uma página de login premium da Lupus.

Visual:

- fundo sofisticado

- composição com vermelho, preto e branco

- branding forte

- sensação de software high-end

- animação sutil

- card central elegante

- campo de email e senha refinados

- CTA forte

- recuperação de senha

==================================================

25. RESPONSIVIDADE

==================================================

O sistema deve funcionar muito bem em:

- desktop

- notebook

- tablet

Em mobile, manter usabilidade aceitável para consultas rápidas e ações simples.

==================================================

26. DADOS INICIAIS / SEED

==================================================

Criar dados iniciais realistas apenas para demonstração inicial do sistema, mas toda a estrutura deve aceitar operação real.

Popular com:

- algumas etapas do pipeline

- algumas origens

- algumas tags

- alguns usuários de exemplo

- alguns leads e oportunidades de exemplo

Esses dados devem estar claramente estruturados como seed inicial e não como dependência permanente do sistema.

==================================================

27. ENTREGA ESPERADA

==================================================

Entregar um CRM completo e funcional da LUPUS, recriado do zero, com:

- branding premium

- interface animada e impactante

- banco de dados no Lovable Cloud estruturado

- autenticação

- CRUD completo

- pipeline real

- dashboards reais

- tarefas reais

- histórico real

- relatórios reais

- persistência real

- fluxo comercial utilizável

==================================================

28. PROIBIÇÕES

==================================================

Não entregar:

- protótipo fake

- tela somente visual

- CRUD incompleto

- cards sem persistência

- filtros falsos

- gráficos estáticos permanentes

- fluxo quebrado

- inconsistência entre módulos

- design genérico sem identidade Lupus

==================================================

29. CHECKLIST FINAL OBRIGATÓRIO

==================================================

Antes de considerar concluído, validar:

- login funcional

- logout funcional

- sessão persistente

- criar lead

- editar lead

- excluir lead

- pesquisar lead

- filtrar lead

- abrir ficha do lead

- criar oportunidade

- editar oportunidade

- mover oportunidade no pipeline

- salvar etapa no banco

- carregar pipeline corretamente após refresh

- criar cliente

- converter lead em cliente

- criar contato

- criar tarefa

- concluir tarefa

- listar tarefas vencidas

- criar anotação

- registrar atividades automaticamente

- dashboard refletindo dados reais

- relatórios funcionando

- busca global funcionando

- configurações de etapas funcionando

- configurações de tags e origens funcionando

- layout premium Lupus mantido

- experiência fluida e elegante

==================================================

30. INSTRUÇÃO FINAL

==================================================

Crie este projeto do zero com máxima profundidade, sem simplificações rasas.

Priorize confiabilidade operacional, persistência real e experiência premium.

Mantenha a identidade Lupus em toda a aplicação.

A entrega deve parecer um CRM SaaS de alto padrão, pronto para operação comercial real.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lupus-nexus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1669744a-5c0e-441b-8336-4b321e0db338).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
