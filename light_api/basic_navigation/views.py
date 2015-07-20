import datetime
# import json
import os

from django.conf import settings
# from django.http import HttpResponse
# from django.http import HttpResponseRedirect
# from django.http import HttpResponsePermanentRedirect
from django.shortcuts import render_to_response


def home(request):
    render_data = {
        "dev": True if os.environ.get("I_AM_IN_DEV_ENV") else False,
        "mixpanel_token": settings.MIXPANEL_TOKEN,
        "facebook_app_id": settings.FACEBOOK_APP_ID,
        "parse_app_id": settings.PARSE_APP_ID,
        "year": datetime.datetime.utcnow().date().year,
        "parse_key": settings.PARSE_KEY
    }
    return render_to_response("template.html", render_data)
