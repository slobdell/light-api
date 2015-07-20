import base64
import uuid

from django.core.exceptions import ObjectDoesNotExist
from django.db import models


class _AccessToken(models.Model):
    token = models.CharField(max_length=255, db_index=True)
    user_id = models.IntegerField()
    permission_level = models.IntegerField()


class PermissionLevel(object):
    REVOKED = 0
    NORMAL = 1
    GOD = 5


class InvalidAccessToken(object):
    def __init__(self, *args, **kwargs):
        pass

    def has_access_to_user(self, user):
        return False


class AccessToken(object):

    def __init__(self, _access_token):
        self._access_token = _access_token

    def has_access_to_user(self, user):
        if self._access_token.permission_level == PermissionLevel.GOD:
            return True
        return self._access_token.user_id == user.id

    @property
    def token_data(self):
        return self._access_token.token

    @classmethod
    def create_for_user(cls, user):
        _access_token = _AccessToken.objects.create(
            token=base64.b64encode(str(uuid.uuid4())),
            user_id=user.id,
            permission_level=PermissionLevel.NORMAL
        )
        return AccessToken(_access_token)

    @classmethod
    def get_from_token_data(cls, token_data):
        try:
            _access_token = _AccessToken.objects.get(token=token_data)
        except ObjectDoesNotExist:
            return InvalidAccessToken()
        return AccessToken(_access_token)
