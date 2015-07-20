import json
import os
import requests

from boto_client import BotoClient

FILE_DIR = "audio_files"


class EchoNestRestClient(object):

    BASE_URL = 'http://developer.echonest.com/api/v4/'
    UPLOAD_ENDPOINT = 'track/upload'
    PROFILE_ENDPOINT = 'track/profile?format=json&bucket=audio_summary'

    def __init__(self):
        self.api_key = os.environ['ECHO_API_KEY']
        print self.api_key
        self.consumer_key = os.environ['ECHO_CONSUMER_KEY']
        self.secret_key = os.environ['ECHO_SECRET']

    def _make_post_request(self, endpoint, mp3_url):
        parameters = {}
        parameters.update({
            "filetype": "mp3",
            "url": mp3_url,
        })
        url = "%s%s" % (self.BASE_URL, endpoint)
        url += "?api_key=%s&url=%s" % (self.api_key, mp3_url)
        headers = {
            "Content-Type": "multipart/form-data"
        }
        response = requests.post(url, data=parameters, headers=headers)
        response.raise_for_status()
        return json.loads(response.content)

    def _make_get_request(self, endpoint, track_id):
        url = "%s%s" % (self.BASE_URL, endpoint)
        url += "&id=%s&api_key=%s" % (track_id, self.api_key)
        print url
        response = requests.get(url)
        print response.content
        response.raise_for_status()
        return json.loads(response.content)

    def upload_file(self, file_obj):
        AWS_BUCKET_NAME = "lobbdawg"
        import uuid
        filename = FILE_DIR + "/" + str(uuid.uuid4()) + ".mp3"
        print "uploading to amazon"
        filename_url = BotoClient(AWS_BUCKET_NAME).upload(filename, file_obj)
        print "\n"
        print filename_url
        print "\n"
        print "uploading to echonest"
        response = self._make_post_request(self.UPLOAD_ENDPOINT, filename_url)
        track_id = response["response"]["track"]["id"]
        print "getting analysis data"
        response = client._make_get_request(EchoNestRestClient.PROFILE_ENDPOINT, track_id)
        analysis_url = response["response"]["track"]["audio_summary"]["analysis_url"]
        print "fetching from amazon with url %s" % analysis_url
        total_analysis = json.loads(requests.get(analysis_url).content)
        return total_analysis


client = EchoNestRestClient()
filename = "eat_sleep"
with open(filename + ".mp3", "rb") as f:
    analysis_dict = client.upload_file(f)


with open(filename + ".json", "w+") as f:
    f.write(json.dumps(analysis_dict, indent=4))


'''
somedict = client._make_post_request(EchoNestRestClient.UPLOAD_ENDPOINT, {})
track_id = somedict["response"]["track"]["id"]
response = client._make_get_request(EchoNestRestClient.PROFILE_ENDPOINT, track_id)
analysis_url = response["response"]["track"]["audio_summary"]["analysis_url"]
total_analysis = json.loads(requests.get(analysis_url).content)

with open("output3.json", "w+") as f:
    f.write(json.dumps(total_analysis, indent=4))
# then make this GET request:
# http://developer.echonest.com/api/v4/track/profile?api_key=KWU8B3PJNU2RCKORO&format=json&id=TRPTDRO14E88174156&bucket=audio_summary

# then make a GET request to the analysis URL
'''
