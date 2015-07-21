import json

from django.http import Http404
from django.http import HttpResponse

from light_api.user.models import User
from light_api.access_token.models import AccessToken


def render_to_json(response_obj, context={}, content_type="application/json", status=200):
    json_str = json.dumps(response_obj, indent=4)
    return HttpResponse(json_str, content_type=content_type, status=status)


def requires_post(fn):
    def inner(request, *args, **kwargs):
        if request.method != "POST":
            return Http404

        post_data = request.POST or json.loads(request.body)
        if 'username' not in post_data:
            return render_to_json({
                "message": "POST requests require a Parse 'username'",
            }, status=400)

        username = post_data['username']
        newly_created, user = User.get_or_create_by_username(username)
        if newly_created:
            access_token = AccessToken.create_for_user(user)
        else:
            if 'access_token' not in post_data:
                return render_to_json({
                    "message": "POST request requires an access token",
                }, status=400)

            access_token = AccessToken.get_from_token_data(post_data['access_token'])
            if not access_token.has_access_to_user(user):
                return render_to_json({
                    "message": "Invalid Access Token"
                }, status=403)
        kwargs["user"] = user
        kwargs["access_token"] = access_token.token_data
        return fn(request, *args, **kwargs)
    return inner


def requires_auth(fn):
    def inner(request, *args, **kwargs):
        if 'username' not in request.GET:
            return render_to_json({
                "message": "GET requires a 'username'"
            }, status=400)
        username = request.GET['username']
        user = User.get_by_username(username)

        if 'access_token' not in request.GET:
            return render_to_json({
                "message": "GET requires an 'access_token'"
            }, status=400)
        access_token = AccessToken.get_from_token_data(request.GET['access_token'])
        if not access_token.has_access_to_user(user):
            return render_to_json({
                "message": "Invalid Access Token"
            }, status=403)
        kwargs['user'] = user

        return fn(request, *args, **kwargs)
    return inner


@requires_post
def signup(request, user=None, access_token=None):
    # post_data = request.POST or json.loads(request.body)
    return render_to_json({"access_token": access_token}, status=200)


def user(request):
    if request.method == "POST":
        return _update_user(request)
    else:
        return _get_user(request)


@requires_post
def _update_user(request, user=None, access_token=None):
    post_data = request.POST or json.loads(request.body)
    try:
        user.update_channel_name(post_data['channel_name'])
    except ValueError:
        return render_to_json({"error": "That channel is taken"}, status=420)
    return render_to_json({"access_token": access_token}, status=200)


@requires_auth
def _get_user(request, user=None):
    if not user:
        return render_to_json({}, status=400)
    user_json = user.to_json()
    return render_to_json(user_json)


def upload_video(request):
    # need to add some kind of auth here...
    from light_api.utils.boto_client import BotoClient
    from light_api.utils.echo_nest_rest_client import EchoNestRestClient

    if request.method != "POST":
        raise Http404
    uploaded_file = request.FILES['file']

    file_type = uploaded_file.content_type
    file_type = file_type
    # validate file_type here
    # upload to boto!
    AWS_BUCKET_NAME = "lobbdawg"
    FILE_DIR = "audio_files"
    import uuid
    filename = FILE_DIR + "/" + str(uuid.uuid4()) + ".mp3"
    filename_url = BotoClient(AWS_BUCKET_NAME).upload(filename, uploaded_file)
    analysis_json = EchoNestRestClient().upload_file(filename_url)
    analysis_json = analysis_json
    return render_to_json({
        "worked": filename_url,
        "analysis_json": analysis_json,
    })
