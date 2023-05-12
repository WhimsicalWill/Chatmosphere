// Add a new conversation to the sidebar
function addConversation(name) {
    var listItem = document.createElement("li");
    listItem.textContent = name;
    document.getElementById("conversations-list").appendChild(listItem);
}

// Add a new message to the chat
function addChatMessage(text, user) {
    var message = document.createElement("div");
    message.textContent = text;
    message.classList.add("chat-message", user ? "user" : "bot");
    document.getElementById("chat").appendChild(message);
}

// Add event listener to the "New Conversation" button
document.getElementById("new-conversation-button").addEventListener("click", function() {
    var name = prompt("Enter the name of the new conversation:");
    if (name) {
        addConversation(name);
    }
});

// Add some example data
addConversation("Conversation 1");
addConversation("Conversation 2");
addChatMessage("Hello!", true);
addChatMessage("Hi there!", false);
