from django.core.exceptions import ObjectDoesNotExist
from django.db import models


class _User(models.Model):
    username = models.CharField(max_length=255, null=False, db_index=True)
    channel_name = models.CharField(max_length=255, null=True, db_index=True)
    email = models.CharField(max_length=255, null=True)


class User(object):

    def __init__(self, _user):
        self._user = _user

    @property
    def id(self):
        return self._user.id

    @property
    def username(self):
        return self._user.username

    def to_json(self):
        return {
            'username': self._user.username,
            'email': self._user.email,
            'channel_name': self._user.channel_name,
        }

    @classmethod
    def get_by_username(cls, username):
        try:
            _user = _User.objects.get(username=username)
        except ObjectDoesNotExist:
            return None
        return User(_user)

    @classmethod
    def get_by_id(cls, user_id):
        try:
            _user = _User.objects.get(id=user_id)
        except ObjectDoesNotExist:
            return None
        return User(_user)

    @classmethod
    def get_or_create_by_username(cls, username):
        try:
            _user = _User.objects.get(username=username)
        except ObjectDoesNotExist:
            return True, cls.create_from_username(username)
        return False, User(_user)

    @classmethod
    def create_from_username(cls, username):
        _user = _User.objects.create(
            username=username,
        )
        return User(_user)
