# Define the template
template = """
Query: {query}
Topic 1: {topic1}
Topic 2: {topic2}
Answer: {answer}
"""

# Define the example data
example_2 = {
    "query": "What are the impacts of climate change?",
    "topic1": "How does climate change affect wildlife?",
    "topic2": "What are the economic consequences of climate change?",
    "answer": "If you're interested in the impacts of climate change, you might want to look into its effects on wildlife.\n" \
            "You could also delve into the economic repercussions of climate change.\n"
}

# Format the template with the example data and print it
formatted_template = template.format(**example_2)
print(formatted_template)
