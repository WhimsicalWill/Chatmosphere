import React from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export function MainChat({ 
  currentTopic,
  currentChat,
  topics,
  addTopic,
  chatEndRef,
  brainstormActive,
}) {
  
  const shouldRenderChat = brainstormActive || (currentTopic && currentChat);
  let chatToRender = [];

  if (shouldRenderChat) {
    chatToRender = brainstormActive ? topics["Brainstorm"]["Brainstorm"] : topics[currentTopic][currentChat];
  }

  return (
    <div className="chat-messages">
      {shouldRenderChat &&
        chatToRender.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.user ? 'user' : 'bot'}`}
          >
            {message.text}
            {message.match && 
              <div className="topic-match">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => addTopic(message.match)}
                >
                  {message.match}
                </Button>
              </div>
            }
          </div>
        ))
      }
      <div className="chat-message" ref={chatEndRef} />
    </div>
  );
}

export function MainInput({ 
  handleNewMessage,
  brainstormActive,
}) {
  return (
    <>
      {!brainstormActive && (
        <div className="send-message">
          <input id="messageInput" type="text" placeholder="Send a message." onKeyDown={async (event) => handleNewMessage(event)} />
        </div>
      )}
    </>
  );
}