import json
import os
import requests
import time


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

    def upload_file(self, filename_url):
        response = self._make_post_request(self.UPLOAD_ENDPOINT, filename_url)
        track_id = response["response"]["track"]["id"]
        response = self._make_get_request(EchoNestRestClient.PROFILE_ENDPOINT, track_id)
        analysis_url = response["response"]["track"]["audio_summary"]["analysis_url"]
        time.sleep(3)
        total_analysis = json.loads(requests.get(analysis_url).content)
        return total_analysis
