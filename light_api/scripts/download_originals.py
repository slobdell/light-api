import os
import json
import requests

errors = []
with open("output.json", "rb") as f:
    content = f.read()
    json_data = json.loads(content)
    for video_id in json_data:
        video_url = "https://s3-us-west-1.amazonaws.com/workout-generator-exercises/originals/" + video_id + ".mp4"
        os.system('wget ' + video_url)
