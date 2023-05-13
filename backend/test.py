from matching import ConversationMatcher
import json

def main():
    matcher = ConversationMatcher(k=5)  # Change k to whatever value you want
    with open('data/mock_convs.json') as f:
        data = json.load(f)

    matcher.add_conversations([conv['topic'] for conv in data['conversations']])
    query = "How will robots become part of society?"
    similar_convs = matcher.get_similar_conversations("query")
    for conv, score in similar_convs:
        print(f"[Score: {score}] {conv}")

if __name__ == '__main__':
    main()