import os

"""light_api URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
# from django.conf.urls import include
from django.conf.urls import url

from .basic_navigation import views
from .basic_navigation import api

urlpatterns = [
    url(r'^$', views.home, name='home'),
    url(r'^api/signup/', api.signup, name="signup"),
    url(r'^api/user/', api.user, name="user"),
    url(r'^api/songs/', api.songs, name="songs"),
    url(r'^api/upload_video', api.upload_video, name="upload-video"),
]

if os.environ.get("I_AM_IN_DEV_ENV"):
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
