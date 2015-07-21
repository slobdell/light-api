import os

# from cStringIO import StringIO
from boto.s3.connection import S3Connection

AWS_S3_PARTIAL_URL = "https://%s.s3.amazonaws.com/%s"
AWS_ACCESS_KEY_ID = os.environ['AWS_ACCESS_KEY_ID']
AWS_SECRET_ACCESS_KEY = os.environ['AWS_SECRET_ACCESS_KEY']


class BotoClient(object):

    _cls_cache = {}

    def __init__(self, aws_bucket_name):
        self.aws_bucket_name = aws_bucket_name

    @classmethod
    def _get_bucket(cls, amazon_bucket_name):
        try:
            return cls._cls_cache[amazon_bucket_name]
        except KeyError:
            connection = S3Connection(AWS_ACCESS_KEY_ID,
                                      AWS_SECRET_ACCESS_KEY)
            cls._cls_cache[amazon_bucket_name] = connection.lookup(amazon_bucket_name)
            return cls._cls_cache[amazon_bucket_name]

    '''
    def download(self, amazon_key):
        image_buffer = StringIO()
        bucket = self._get_bucket(self.aws_bucket_name)

        key = bucket.get_key(amazon_key)
        key.get_contents_to_file(image_buffer)

        image_buffer.seek(0)
        return image_buffer.read()
    '''

    def _full_path(self, key):
        return AWS_S3_PARTIAL_URL % (self.aws_bucket_name, key.name)

    def upload(self, output_path, raw_file_data):
        bucket = self._get_bucket(self.aws_bucket_name)
        key = bucket.new_key(output_path)
        key.set_contents_from_file(raw_file_data)
        key.make_public()
        return self._full_path(key)
