import React, { useEffect, useState } from 'react';
import ConversationListItem from './ConversationListItem';

const ConversationList = () => {
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        fetch('/api/conversations')
            .then(response => response.json())
            .then(data => setConversations(data));
    }, []);

    return (
        <ul>
            {conversations.map(conversation => (
                <ConversationListItem key={conversation.id} name={conversation.name} />
            ))}
        </ul>
    );
};

export default ConversationList;
