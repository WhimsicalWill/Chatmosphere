import React, { useState } from 'react';
import './App.css';

function App() {
  const [conversations, setConversations] = useState(["Conversation 1", "Conversation 2"]);
  const [messages, setMessages] = useState([
    { text: "Hello!", user: true },
    { text: "Hi there!", user: false }
  ]);

  const addConversation = (name) => {
    setConversations([...conversations, name]);
  };

  const addChatMessage = (text, user) => {
    setMessages([...messages, { text, user }]);
  };

  return (
    <div className="container">
      <div className="sidebar">
        <button onClick={() => {
          const name = prompt("Enter the name of the new conversation:");
          if (name) {
            addConversation(name);
          }
        }}>New Conversation</button>
        <ul>
          {conversations.map((conversation, index) => (
            <li key={index}>{conversation}</li>
          ))}
        </ul>
      </div>
      <div className="main">
        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.user ? 'user' : 'bot'}`}>
            {message.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
