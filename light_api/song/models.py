import json

# from django.core.exceptions import ObjectDoesNotExist
from django.db import models


class _Song(models.Model):
    user_id = models.IntegerField(db_index=True)
    analysis_json = models.TextField()
    artist_name = models.CharField(max_length=255)
    track_name = models.CharField(max_length=255)
    artwork_url = models.CharField(max_length=255)
    track_url = models.CharField(max_length=255)


class Song(object):

    def __init__(self, _song):
        self._song = _song

    @classmethod
    def create(cls, user, analysis_json, artwork_url, track_url):
        artist = analysis_json["meta"]["artist"] or "Unknown Artist"
        filename = analysis_json["meta"]["title"] or "Untitled Song"
        json_str = json.dumps(analysis_json)
        _song = _Song.objects.create(
            user_id=user.id,
            analysis_json=json_str,
            artist_name=artist,
            artwork_url=artwork_url,
            track_url=track_url,
            track_name=filename
        )
        return Song(_song)

    def to_json(self):
        return {
            "id": self._song.id,
            "artwork_url": self._song.artwork_url,
            "track_url": self._song.track_url,
            "user_id": self._song.user_id,
            "artist_name": self._song.artist_name,
            "track_name": self._song.track_name,
            "analysis_json": json.loads(self._song.analysis_json),
        }

    @classmethod
    def get_for_user(cls, user):
        _songs = list(_Song.objects.filter(
            user_id=user.id
        ).all())
        return [Song(_song) for _song in _songs]
