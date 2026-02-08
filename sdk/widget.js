(function(window) {
  function createWidget(config) {
    const { apiKey, baseUrl = 'http://localhost:8000', title = 'Support Chat' } = config;

    // Styles
    const styles = `
      #rag-widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 9999;
      }
      #rag-widget-header {
        background: #007bff;
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
      }
      #rag-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        background: #f8f9fa;
      }
      #rag-widget-input-area {
        padding: 15px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
      }
      #rag-widget-input {
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        outline: none;
      }
      #rag-widget-send {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
      }
      #rag-widget-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 30px;
        background: #007bff;
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rag-message {
        margin-bottom: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
        font-size: 14px;
        line-height: 1.4;
      }
      .rag-message.user {
        background: #007bff;
        color: white;
        margin-left: auto;
      }
      .rag-message.assistant {
        background: #e9ecef;
        color: #333;
        margin-right: auto;
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // HTML Structure
    const container = document.createElement('div');
    container.id = 'rag-widget-container';
    container.innerHTML = `
      <div id="rag-widget-header">
        <span>${title}</span>
        <span style="cursor:pointer" id="rag-widget-close">×</span>
      </div>
      <div id="rag-widget-messages"></div>
      <div id="rag-widget-input-area">
        <input type="text" id="rag-widget-input" placeholder="Type a message..." />
        <button id="rag-widget-send">Send</button>
      </div>
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'rag-widget-toggle';
    toggleBtn.innerHTML = '💬';
    toggleBtn.onclick = () => {
      container.style.display = container.style.display === 'none' ? 'flex' : 'none';
      toggleBtn.style.display = container.style.display === 'none' ? 'flex' : 'none';
    };

    document.body.appendChild(container);
    document.body.appendChild(toggleBtn);

    const closeBtn = container.querySelector('#rag-widget-close');
    closeBtn.onclick = () => {
      container.style.display = 'none';
      toggleBtn.style.display = 'flex';
    };

    const messagesDiv = container.querySelector('#rag-widget-messages');
    const input = container.querySelector('#rag-widget-input');
    const sendBtn = container.querySelector('#rag-widget-send');

    let history = [];

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      // Add user message
      appendMessage('user', text);
      input.value = '';
      
      // Loading state
      const loadingId = appendMessage('assistant', 'Thinking...');

      try {
        const response = await fetch(`${baseUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            messages: [...history, { role: 'user', content: text }]
          })
        });

        const data = await response.json();
        
        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        // Add assistant message
        appendMessage('assistant', data.response);
        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: data.response });

      } catch (err) {
        console.error(err);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.innerText = "Error: Could not connect to support.";
      }
    }

    function appendMessage(role, text) {
      const div = document.createElement('div');
      div.className = `rag-message ${role}`;
      div.innerText = text;
      div.id = `msg-${Date.now()}`;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return div.id;
    }

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
  }

  window.RAGWidget = { init: createWidget };
})(window);
