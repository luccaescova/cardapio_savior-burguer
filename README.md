# 🍔 Savior Burguer - Sistema de Pedidos e Painel TV

Sistema web de gerenciamento de pedidos para hamburgueria em tempo real. O projeto conecta a tela de pedidos do cliente, a transmissão dos pedidos via WhatsApp para a cozinha, a gestão do atendente e o painel da TV para chamadas sonoras e visuais do cliente por nome.

---

## 🚀 Funcionalidades

* **Cardápio Interativo:** Escolha de lanches, bebidas, personalizações (remoção de ingredientes) e adicionais pagos.
* **Envio para WhatsApp:** Notificação detalhada da comanda diretamente para o WhatsApp do estabelecimento via `whatsapp-web.js`.
* **Painel da TV (`tv.html`):**
  * Atualização em tempo real das colunas **PREPARANDO** e **PRONTO PARA RETIRAR**.
  * Alerta em modal tela cheia quando o pedido fica pronto.
  * Síntese de voz (*Web Speech API*) anunciando o nome do cliente.
  * **Remoção automática:** O nome do cliente sai da lista de prontos após **30 segundos** (configurável).
* **Painel do Atendente (`admin.html`):**
  * Visualização dos pedidos ativos em tempo real via Socket.io.
  * Botão de acionamento para alterar status do pedido para "Pronto" e disparar a chamada no painel TV.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Web Speech API.
* **Backend:** Node.js, Express.
* **Comunicação em Tempo Real:** Socket.io.
* **Integração WhatsApp:** `whatsapp-web.js`, `qrcode-terminal`.
* **Utilitários:** `cors`.

---

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (Versão 16 ou superior)
* [Git](https://git-scm.com/)

---

## 🔧 Instalação e Configuração

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/savior-burguer.html.git](https://github.com/seu-usuario/savior-burguer.html.git)
   cd savior-burguer/BACKEND