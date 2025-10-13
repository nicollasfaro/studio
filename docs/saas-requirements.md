
# Requisitos para Transformar em um SaaS Multi-Inquilino (Multi-Tenant)

Atualmente, este sistema é uma aplicação de **inquilino único (single-tenant)**, projetada para servir um único negócio. Para evoluir para um modelo **SaaS (Software as a Service)**, onde múltiplos negócios (inquilinos) possam usar o software de forma independente e isolada, são necessárias mudanças arquitetônicas significativas.

O conceito central dessa transformação é a **multi-tenancy**.

---

### 1. Arquitetura de Dados Multi-Tenant

Esta é a mudança mais fundamental. Cada dado no sistema deve pertencer a um negócio específico.

#### Firestore:
A estrutura de dados atual, com coleções de nível superior como `/services` e `/appointments`, precisa ser aninhada sob um ID de negócio.

**Estrutura Atual:**
```
/services/{serviceId}
/appointments/{appointmentId}
/users/{userId}
```

**Estrutura Multi-Tenant Proposta:**
```
/businesses/{businessId}  // Nova coleção para armazenar informações de cada negócio
  /services/{serviceId}
  /appointments/{appointmentId}
  /promotions/{promotionId}
  /clients/{clientId}       // Clientes específicos de um negócio
  /galleryImages/{imageId}
  /settings/theme           // Configurações (tema, horários) específicas do negócio

/users/{userId}             // Coleção de usuários permanece global, mas cada usuário terá um papel.
```

- **Usuários e Papéis:** Um usuário no sistema poderia ter diferentes papéis. Ele poderia ser um "proprietário" de um `businessId`, um "funcionário" de outro, e um "cliente" de vários outros. O documento do usuário em `/users/{userId}` precisaria armazenar esses papéis, por exemplo:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@doe.com",
    "roles": {
      "businessId_123": "owner",
      "businessId_456": "client"
    }
  }
  ```

#### Storage:
As pastas no Firebase Storage também precisariam refletir essa estrutura para garantir o isolamento dos arquivos.

**Estrutura Multi-Tenant Proposta:**
```
/businesses/{businessId}/gallery/
/businesses/{businessId}/appointment-references/
```

---

### 2. Regras de Segurança (Firestore & Storage)

As regras de segurança são a espinha dorsal do isolamento de dados. Elas precisariam ser completamente reescritas.

**Exemplo de Regra de Segurança para Firestore:**

```javascript
// Permite que um usuário leia os serviços de um negócio se ele for
// um funcionário ou proprietário daquele negócio.
match /businesses/{businessId}/services/{serviceId} {
  allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles[businessId] in ['owner', 'admin'];
  allow read: if isSignedIn(); // Permite que clientes vejam os serviços
}
```

---

### 3. Registro de Negócios (Tenant Onboarding)

- **Fluxo de Inscrição:** Uma nova interface onde um proprietário de salão pode se registrar.
- **Criação do Inquilino:** Após o registro e possivelmente um pagamento, um novo documento seria criado em `/businesses/{businessId}`. O usuário que se registrou se tornaria o `owner`.
- **Configuração Inicial:** Um assistente de configuração (wizard) para o novo proprietário configurar as informações básicas do seu salão (nome, endereço, primeiro serviço, etc.).

---

### 4. Roteamento e Identificação do Inquilino

A aplicação precisa saber qual negócio exibir para cada usuário.

- **Subdomínios (Preferencial):** `salao-da-ana.meusite.com`. O subdomínio (`salao-da-ana`) é usado para identificar o `businessId`. Esta é a abordagem mais robusta e profissional.
- **Caminho na URL:** `meusite.com/b/salao-da-ana`. Mais simples de implementar, mas menos elegante.

A lógica no frontend (por exemplo, no `layout.tsx` ou em um middleware do Next.js) detectaria o inquilino a partir da URL e passaria o `businessId` para os hooks de busca de dados.

---

### 5. Sistema de Assinaturas e Pagamentos

Para ser um verdadeiro SaaS, o serviço precisa ser pago.

- **Integração com Gateway de Pagamento:** Usar serviços como **Stripe** ou **Paddle** para gerenciar planos (básico, premium), assinaturas e pagamentos.
- **Lógica de Assinatura:**
  - O status da assinatura de um negócio seria armazenado em `/businesses/{businessId}`.
  - As regras de segurança poderiam restringir o acesso a funcionalidades com base no status da assinatura.
  - Um webhook do Stripe atualizaria o status da assinatura no Firestore quando um pagamento fosse feito ou falhasse.

---

Em resumo, a transição de uma aplicação single-tenant para um SaaS multi-tenant é uma tarefa complexa que impacta quase todas as partes do sistema, desde a base de dados até a interface do usuário. O planejamento cuidadoso da arquitetura de dados e das regras de segurança é o passo mais crítico.
