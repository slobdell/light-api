import datetime

from workout_generator.coupon.models import Coupon

Coupon.create("GRANDFATHER550",
              datetime.datetime(year=2016, month=3, day=1, hour=0, minute=0),
              "Hey, alright!  Your membership is free, just finish the signup!",
              None)
'''
Coupon.create("GRANDFATHER500",
              datetime.datetime(year=2015, month=3, day=1, hour=0, minute=0),
              "Hey, alright!  Your membership is free, just finish the signup!",
              None)
Coupon.create("HACKERNEWS2015",
              datetime.datetime(year=2015, month=2, day=7, hour=0, minute=0),
              "Hey, I read Hacker News too!  Your membership is free, just finish the signup!",
              None)
Coupon.create("FACEBOOK_DJLTEVMKGDDVJKLF",
              datetime.datetime(year=2015, month=2, day=14, hour=0, minute=0),
              "Hey, alright!  Your membership is free, just finish the signup!",
              None)
'''
