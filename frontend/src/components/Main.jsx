import React from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export function MainChat({ 
  currentTopic,
  currentChat,
  topics,
  addChatUnderTopic,
  chatEndRef,
  brainstormActive,
}) {
  
  const shouldRenderChat = brainstormActive || (currentTopic && currentChat);
  let chatToRender = [];

  if (shouldRenderChat) {
    chatToRender = brainstormActive ? topics["Brainstorm"]["Brainstorm"] : topics[currentTopic][currentChat];
  }

  const instructionOverview = (
    <div className="instruction-text">
      <h2>Welcome to Chatmos</h2>
      <p>Here are some tips to get you started:</p>
      <ul>
        <li>Select a topic from the sidebar to start a chat.</li>
        <li>Enter a message into the input box at the bottom to send a message.</li>
        <li>You can add a new topic by clicking on the '+' button in the sidebar.</li>
      </ul>
    </div>
  );

  const chatHeaderText = brainstormActive ? "AI Helper" : currentChat;

  return (
    <div className="chat-messages">
      {shouldRenderChat ? (
        <>
          <div className="chat-header-container">
            {/* TODO: load the user's profile */}
            <img className="profile-picture" src={"https://cdn-icons-png.flaticon.com/128/3135/3135715.png"} alt="Profile" />
            <h1 className="chat-header-text">{chatHeaderText}</h1>
          </div> 
          {
            chatToRender.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.user ? 'user' : 'bot'}`}
            >
              {message.text}
              {message.matchInfo && 
              <div className="topic-match">
                <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => addChatUnderTopic(message.matchInfo, message.messageId)} // added messageId
                >
                {message.matchInfo.text}
                </Button>
              </div>
              }
            </div>
            ))
          }
        </>
      ) : (
        instructionOverview
      )}
      <div className="chat-message" ref={chatEndRef} />
    </div>
  );
}

export function MainInput({ 
  currentChat,
  brainstormActive,
  handleNewMessage,
}) {
  return (
    <>
      {!brainstormActive && currentChat && (
        <div className="send-message">
          <input id="messageInput" type="text" placeholder="Send a message." onKeyDown={async (event) => handleNewMessage(event)} />
        </div>
      )}
    </>
  );
}
