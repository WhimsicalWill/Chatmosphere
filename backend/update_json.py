import json
import random

# Load the JSON data
with open("data/mock_convs.json") as file:
    data = json.load(file)

# Iterate over each conversation and add "user_id" attribute
for conversation in data["conversations"]:
    conversation["user_id"] = random.choice([0, 1])

# Save the updated JSON data
with open("data/mock_convs_new.json", "w") as file:
    json.dump(data, file, indent=4)
